"""
PrimeLearn Manim Renderer Lambda (Container Image).
Receives Manim Python code, renders it to MP4, uploads to S3.
"""
import json
import os
import re
import subprocess
import sys
import shutil
import traceback
import glob as glob_module
from datetime import datetime

import boto3

s3 = boto3.client('s3', region_name='ap-south-1')
bedrock = boto3.client('bedrock-runtime', region_name='ap-south-1')

S3_BUCKET = os.environ.get('S3_CONTENT_BUCKET', 'primelearn-content-cache-mumbai')
MANIM_QUALITY = os.environ.get('MANIM_QUALITY', '-ql')  # -ql = 480p15 (fast)


def update_job_status(job_id, status, extra=None):
    """Write job status to S3."""
    data = {
        'job_id': job_id,
        'status': status,
        'updated_at': datetime.utcnow().isoformat(),
    }
    if extra:
        data.update(extra)
    s3.put_object(
        Bucket=S3_BUCKET,
        Key=f'manim-jobs/{job_id}/status.json',
        Body=json.dumps(data),
        ContentType='application/json'
    )


# Patterns that must NOT appear in generated Manim code
DANGEROUS_PATTERNS = [
    'import os', 'import sys', 'import subprocess',
    'import shutil', 'import socket', 'import http',
    'import urllib', 'import requests',
    'os.system', 'os.popen', 'subprocess.',
    'eval(', 'exec(', '__import__',
    'open(', 'file(',
    'shutil.', 'socket.',
    'MathTex', 'Tex(',   # No LaTeX — not installed
]


def validate_manim_code(code):
    """Basic safety validation. Returns (is_safe, reason)."""
    for pattern in DANGEROUS_PATTERNS:
        if pattern in code:
            return False, f"Disallowed pattern: {pattern}"
    if 'class ' not in code or 'Scene' not in code:
        return False, "No Scene class found"
    if 'def construct' not in code:
        return False, "No construct method found"
    return True, "OK"


def self_heal_code(original_code, error_msg):
    """Ask Bedrock LLM to fix broken Manim code based on the error."""
    try:
        # Trim error to most relevant part
        error_short = error_msg[-600:]
        prompt = f"""The following Manim CE Python code failed to render with this error:

ERROR:
{error_short}

BROKEN CODE:
{original_code}

Fix the code so it renders without errors. Rules:
- Use ONLY Text() for text, NEVER MathTex/Tex
- Use ONLY Scene as base class
- Do NOT use Code(), Paragraph(), ThreeDScene, MovingCameraScene
- Do NOT use .animate with Transform/ReplacementTransform
- Keep it simple — if something complex failed, simplify it
- Return ONLY the fixed Python code, nothing else."""

        response = bedrock.converse(
            modelId='anthropic.claude-3-haiku-20240307-v1:0',
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 4000}
        )
        code = response['output']['message']['content'][0]['text'].strip()
        # Clean markdown fences
        if code.startswith('```python'):
            code = code[len('```python'):].strip()
        if code.startswith('```'):
            code = code[3:].strip()
        if code.endswith('```'):
            code = code[:-3].strip()
        if 'from manim import' in code and 'class ' in code:
            return code
        return None
    except Exception as e:
        print(f"Self-heal LLM call failed: {e}")
        return None


def lambda_handler(event, context):
    """
    Receives: { job_id, manim_code, concept_id, cache_key }
    Renders Manim code and uploads the resulting MP4 to S3.
    """
    job_id = event.get('job_id')
    manim_code = event.get('manim_code')
    concept_id = event.get('concept_id', 'unknown')
    cache_key = event.get('cache_key')

    if not job_id or not manim_code:
        return {'statusCode': 400, 'body': 'Missing job_id or manim_code'}

    try:
        update_job_status(job_id, 'Rendering')

        # ── Validate code safety ──
        is_safe, reason = validate_manim_code(manim_code)
        if not is_safe:
            update_job_status(job_id, 'Failed', {'error': f'Code validation failed: {reason}'})
            return {'statusCode': 400, 'body': reason}

        # ── Find the Scene class name ──
        scene_match = re.search(r'class\s+(\w+)\s*\(\s*\w*Scene\w*\s*\)', manim_code)
        if not scene_match:
            update_job_status(job_id, 'Failed', {'error': 'Could not find Scene class in code'})
            return {'statusCode': 400, 'body': 'No Scene class found'}
        scene_name = scene_match.group(1)

        # ── Write code to /tmp ──
        scene_file = '/tmp/scene.py'
        with open(scene_file, 'w') as f:
            f.write(manim_code)

        # ── Render with Manim ──
        media_dir = '/tmp/manim_media'
        cmd = [
            sys.executable, '-m', 'manim', 'render',
            MANIM_QUALITY,
            '--media_dir', media_dir,
            scene_file,
            scene_name,
        ]

        print(f"[{job_id}] Rendering {scene_name}...")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=240,   # 4 minute timeout
            cwd='/tmp'
        )

        if result.returncode != 0:
            error_msg = (result.stderr or 'Unknown render error')[-1500:]
            print(f"[{job_id}] Render FAILED, attempting self-heal...")

            # ── Self-heal: ask LLM to fix the code ──
            fixed_code = self_heal_code(manim_code, error_msg)
            if fixed_code:
                print(f"[{job_id}] Got fixed code, retrying render...")
                is_safe2, reason2 = validate_manim_code(fixed_code)
                if is_safe2:
                    scene_match2 = re.search(r'class\s+(\w+)\s*\(\s*\w*Scene\w*\s*\)', fixed_code)
                    if scene_match2:
                        scene_name = scene_match2.group(1)
                        # Clean up previous attempt
                        if os.path.isdir(media_dir):
                            shutil.rmtree(media_dir)
                        with open(scene_file, 'w') as f:
                            f.write(fixed_code)
                        result = subprocess.run(cmd[:- 1] + [scene_name], capture_output=True, text=True, timeout=240, cwd='/tmp')
                        if result.returncode == 0:
                            print(f"[{job_id}] Self-heal SUCCESS!")
                            manim_code = fixed_code  # use fixed code going forward
                        else:
                            error_msg2 = (result.stderr or 'Unknown')[-500:]
                            print(f"[{job_id}] Self-heal also failed: {error_msg2}")
                            update_job_status(job_id, 'Failed', {'error': f'Manim render failed: {error_msg[:800]}'})
                            return {'statusCode': 500, 'body': error_msg}
                    else:
                        update_job_status(job_id, 'Failed', {'error': f'Manim render failed: {error_msg[:800]}'})
                        return {'statusCode': 500, 'body': error_msg}
                else:
                    update_job_status(job_id, 'Failed', {'error': f'Manim render failed: {error_msg[:800]}'})
                    return {'statusCode': 500, 'body': error_msg}
            else:
                update_job_status(job_id, 'Failed', {'error': f'Manim render failed: {error_msg[:800]}'})
                return {'statusCode': 500, 'body': error_msg}

        print(f"[{job_id}] Render completed, finding output MP4...")

        # ── Find the output video ──
        video_file = None
        for pattern in [f'{media_dir}/videos/**/*.mp4', f'{media_dir}/**/*.mp4']:
            matches = glob_module.glob(pattern, recursive=True)
            if matches:
                video_file = matches[0]
                break

        if not video_file or not os.path.exists(video_file):
            update_job_status(job_id, 'Failed', {'error': 'Render completed but no MP4 file found'})
            return {'statusCode': 500, 'body': 'No output video found'}

        file_size = os.path.getsize(video_file)
        print(f"[{job_id}] Found video: {video_file} ({file_size} bytes)")

        # ── Upload to S3 ──
        video_key = f'manim-videos/generated/{concept_id}/{job_id}.mp4'
        with open(video_file, 'rb') as vf:
            s3.put_object(
                Bucket=S3_BUCKET,
                Key=video_key,
                Body=vf.read(),
                ContentType='video/mp4'
            )
        print(f"[{job_id}] Uploaded to s3://{S3_BUCKET}/{video_key}")

        # ── Copy to cache key for future lookups ──
        if cache_key:
            try:
                s3.copy_object(
                    Bucket=S3_BUCKET,
                    CopySource={'Bucket': S3_BUCKET, 'Key': video_key},
                    Key=cache_key
                )
            except Exception:
                pass  # Non-fatal

        # ── Mark job as completed ──
        update_job_status(job_id, 'Completed', {'video_key': video_key})
        print(f"[{job_id}] Job completed successfully!")

        return {'statusCode': 200, 'body': json.dumps({'video_key': video_key})}

    except subprocess.TimeoutExpired:
        update_job_status(job_id, 'Failed', {'error': 'Render timed out (>4 minutes)'})
        return {'statusCode': 500, 'body': 'Render timeout'}
    except Exception as e:
        error_detail = traceback.format_exc()[-500:]
        update_job_status(job_id, 'Failed', {'error': str(e)})
        print(f"[{job_id}] Exception: {error_detail}")
        return {'statusCode': 500, 'body': str(e)}
    finally:
        # Cleanup /tmp to avoid filling space on warm invocations
        for path in ['/tmp/scene.py', '/tmp/manim_media']:
            try:
                if os.path.isdir(path):
                    shutil.rmtree(path)
                elif os.path.isfile(path):
                    os.remove(path)
            except Exception:
                pass

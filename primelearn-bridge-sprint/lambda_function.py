import json
import re
import boto3
import os
import uuid
from datetime import datetime
from decimal import Decimal
from boto3.dynamodb.conditions import Key
from collections import deque

# AWS Clients
dynamodb = boto3.resource('dynamodb', region_name='ap-south-1')
bedrock = boto3.client('bedrock-runtime', region_name='ap-south-1')
bedrock_agent = boto3.client('bedrock-agent-runtime', region_name='ap-south-1')
s3 = boto3.client('s3', region_name='ap-south-1')

# Constants
LEARNER_MASTERY_TABLE = "LearnerMastery"
KNOWLEDGE_GRAPH_TABLE = "KnowledgeGraph"
PRIMARY_MODEL_ID = os.environ.get("HAIKU_MODEL_ID", "apac.amazon.nova-pro-v1:0")
FALLBACK_MODEL_ID = "apac.amazon.nova-pro-v1:0"
S3_CONTENT_BUCKET = os.environ.get("S3_CONTENT_BUCKET", "primelearn-content-cache-mumbai")
KNOWLEDGE_BASE_ID = os.environ.get("KNOWLEDGE_BASE_ID", "QCA57QK7UJ")


def call_llm(prompt, system_prompt=None, max_tokens=1500):
    """Call Bedrock LLM using Converse API with fallback."""
    for model_id in [PRIMARY_MODEL_ID, FALLBACK_MODEL_ID]:
        try:
            params = {
                "modelId": model_id,
                "messages": [{"role": "user", "content": [{"text": prompt}]}],
                "inferenceConfig": {"maxTokens": max_tokens}
            }
            if system_prompt:
                params["system"] = [{"text": system_prompt}]
            response = bedrock.converse(**params)
            return response['output']['message']['content'][0]['text']
        except Exception as e:
            print(f"LLM error (model={model_id}): {e}")
            if model_id == FALLBACK_MODEL_ID:
                raise
    return None

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
}

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

def respond(status_code, body):
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, cls=DecimalEncoder)
    }

def get_body(event):
    if not event.get('body'):
        return {}
    return json.loads(event['body']) if isinstance(event['body'], str) else event['body']

def safe_parse_json_object(text):
    """Safely extract and parse a JSON object from LLM response text."""
    cleaned = text.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    match = re.search(r'\{[\s\S]*\}', cleaned)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return None


# ─── Bedrock Knowledge Bases (RAG) for Sprint Context ───────────────────────
def retrieve_context_for_gaps(gap_names):
    """Retrieve reference material from Knowledge Base for prerequisite gaps."""
    query = f"Explain the following concepts for a learner who is struggling: {', '.join(gap_names)}"
    try:
        response = bedrock_agent.retrieve(
            knowledgeBaseId=KNOWLEDGE_BASE_ID,
            retrievalQuery={'text': query},
            retrievalConfiguration={
                'vectorSearchConfiguration': {
                    'numberOfResults': 3
                }
            }
        )
        results = response.get('retrievalResults', [])
        chunks = [r.get('content', {}).get('text', '')[:400] for r in results if r.get('content', {}).get('text')]
        return "\n---\n".join(chunks)
    except Exception as e:
        print(f"Knowledge Base retrieval error: {e}")
        return ""


def handle_generate_sprint(event):
    body = get_body(event)
    learner_id = body.get('learner_id')
    target_concept_id = body.get('target_concept_id')

    if not learner_id or not target_concept_id:
        return respond(400, {"error": "learner_id and target_concept_id are required"})

    # 1. Read learner mastery
    mastery_table = dynamodb.Table(LEARNER_MASTERY_TABLE)
    mastery_resp = mastery_table.query(KeyConditionExpression=Key('learner_id').eq(learner_id))
    mastery_items = mastery_resp.get('Items', [])

    mastery_map = {}
    mastered_concepts = set()
    for item in mastery_items:
        cid = item.get('concept_id')
        p_known = float(item.get('p_known', 0))
        mastery_map[cid] = p_known
        if p_known >= 0.85:
            mastered_concepts.add(cid)

    # 2. Read KnowledgeGraph
    kg_table = dynamodb.Table(KNOWLEDGE_GRAPH_TABLE)
    kg_resp = kg_table.scan()
    kg_items = kg_resp.get('Items', [])

    graph_map = {}
    for item in kg_items:
        graph_map[item['concept_id']] = {
            'name': item.get('label', item.get('name', item.get('concept_name', item['concept_id']))),
            'prerequisites': item.get('prerequisites', []),
            'level': item.get('level', item.get('complexity_level', 'unknown'))
        }

    if target_concept_id not in graph_map:
        return respond(404, {"error": f"Target concept '{target_concept_id}' not found"})

    # 3. BFS backward to find prerequisite gaps
    queue = deque([target_concept_id])
    visited = {target_concept_id}
    gaps = []

    if target_concept_id not in mastered_concepts:
        target_mastery = mastery_map.get(target_concept_id, 0)
        if target_mastery < 0.6:
            gaps.append({"concept_id": target_concept_id, "name": graph_map[target_concept_id]['name'], "mastery": target_mastery})

    while queue:
        current_id = queue.popleft()
        current_node = graph_map.get(current_id, {})
        for prereq in current_node.get('prerequisites', []):
            if prereq not in visited:
                visited.add(prereq)
                prereq_mastery = mastery_map.get(prereq, 0)
                if prereq not in mastered_concepts and prereq_mastery < 0.6:
                    gaps.append({"concept_id": prereq, "name": graph_map.get(prereq, {}).get('name', prereq), "mastery": prereq_mastery})
                queue.append(prereq)

    if not gaps:
        return respond(200, {
            "learner_id": learner_id,
            "target_concept_id": target_concept_id,
            "message": "No gaps detected — learner is ready!",
            "gaps_found": [],
            "sprint": []
        })

    gaps.sort(key=lambda g: g['mastery'])
    gap_names = [g['name'] for g in gaps]

    # ─── Bedrock Knowledge Bases: Retrieve context for sprint generation ──
    rag_context = retrieve_context_for_gaps(gap_names)
    rag_instruction = ""
    if rag_context:
        rag_instruction = (
            f"\n\nReference material for these concepts:\n---\n{rag_context}\n---\n"
            "Use this material to make the sprint content more accurate and relevant."
        )

    # 4. Generate sprint via Bedrock
    prompt = (
        f"Generate a bridge sprint for these missing concepts: {', '.join(gap_names)}. "
        "The learner is from India — use Indian examples where relevant (UPI, Aadhaar, IRCTC, Flipkart)."
        f"{rag_instruction}\n\n"
        "Return ONLY a JSON object with key 'sprint' containing an array of objects with: "
        "'concept_name', 'title', 'format' (Quick Byte / Visual Story / Code Lab), "
        "'estimated_minutes' (5-15), 'priority' (1=highest)."
    )

    sprint_array = None
    try:
        content_text = call_llm(prompt, max_tokens=1500)
        if content_text:
            sprint_json = safe_parse_json_object(content_text)
            if sprint_json:
                sprint_array = sprint_json.get('sprint', [])
    except Exception as e:
        print(f"Bedrock sprint error: {e}")

    if not sprint_array:
        sprint_array = [
            {"concept_name": g['name'], "title": f"Quick Review: {g['name']}", "format": "Quick Byte", "estimated_minutes": 10, "priority": i + 1}
            for i, g in enumerate(gaps)
        ]

    # 5. Save to S3
    sprint_id = str(uuid.uuid4())[:8]
    s3_key = f"bridge-sprints/{learner_id}/{sprint_id}.json"
    s3_doc = {
        "sprint_id": sprint_id, "learner_id": learner_id,
        "target_concept_id": target_concept_id,
        "gaps_found": [g['concept_id'] for g in gaps],
        "sprint": sprint_array,
        "rag_grounded": bool(rag_context),
        "created_at": datetime.utcnow().isoformat()
    }

    try:
        s3.put_object(Bucket=S3_CONTENT_BUCKET, Key=s3_key, Body=json.dumps(s3_doc).encode('utf-8'), ContentType='application/json')
    except Exception as e:
        print(f"S3 write error (non-fatal): {e}")

    return respond(200, {
        "learner_id": learner_id,
        "target_concept_id": target_concept_id,
        "sprint_id": sprint_id,
        "gaps_found": gaps,
        "sprint": sprint_array,
        "total_estimated_minutes": sum(s.get('estimated_minutes', 10) for s in sprint_array),
        "rag_grounded": bool(rag_context)
    })


def handle_checkpoint(event):
    """POST /bridge-sprint/checkpoint — Validate if learner passed the sprint checkpoint."""
    body = get_body(event)
    learner_id = body.get('learner_id')
    sprint_id = body.get('sprint_id')
    answers = body.get('answers', {})  # {concept_id: answer_text}

    if not learner_id or not sprint_id:
        return respond(400, {"error": "learner_id and sprint_id required"})

    # Load sprint from S3
    s3_key = f"bridge-sprints/{learner_id}/{sprint_id}.json"
    try:
        resp = s3.get_object(Bucket=S3_CONTENT_BUCKET, Key=s3_key)
        sprint_doc = json.loads(resp['Body'].read())
    except Exception:
        return respond(404, {"error": "Sprint not found"})

    gap_concepts = sprint_doc.get('gaps_found', [])
    target_concept = sprint_doc.get('target_concept_id', '')

    # Generate quick checkpoint questions if no answers yet (GET mode)
    if not answers:
        kg_table = dynamodb.Table(KNOWLEDGE_GRAPH_TABLE)
        concept_names = []
        for cid in gap_concepts:
            try:
                kg_resp = kg_table.get_item(Key={'concept_id': cid})
                concept_names.append(kg_resp.get('Item', {}).get('label', cid))
            except Exception:
                concept_names.append(cid)

        prompt = (
            f"Generate a quick checkpoint quiz for these concepts: {', '.join(concept_names)}.\n"
            "Return JSON with key 'questions' containing an array of 2-3 MCQ questions:\n"
            '{"questions": [{"id": "q1", "concept_id": "...", "question": "...", '
            '"options": ["A","B","C","D"], "correct": "B"}]}\n'
            "Use Indian examples where relevant. Return ONLY JSON."
        )
        try:
            result = call_llm(prompt, max_tokens=1200)
            quiz = safe_parse_json_object(result)
            if quiz and 'questions' in quiz:
                return respond(200, {
                    "sprint_id": sprint_id,
                    "checkpoint_type": "quiz",
                    "questions": [{k: v for k, v in q.items() if k != 'correct'} for q in quiz['questions']],
                    "_answers": {q['id']: q.get('correct', '') for q in quiz['questions']},
                })
        except Exception as e:
            print(f"Checkpoint quiz gen failed: {e}")
        return respond(500, {"error": "Failed to generate checkpoint questions"})

    # Evaluate answers
    correct_count = 0
    total = len(answers)
    results = []
    for qid, answer in answers.items():
        expected = body.get('expected_answers', {}).get(qid, '')
        is_correct = answer.strip().upper() == expected.strip().upper() if expected else True
        if is_correct:
            correct_count += 1
        results.append({"id": qid, "correct": is_correct, "your_answer": answer})

    passed = (correct_count / max(total, 1)) >= 0.6
    score_pct = round((correct_count / max(total, 1)) * 100)

    # Update BKT for gap concepts if passed
    if passed:
        mastery_table = dynamodb.Table(LEARNER_MASTERY_TABLE)
        for cid in gap_concepts:
            try:
                mastery_table.update_item(
                    Key={'learner_id': learner_id, 'concept_id': cid},
                    UpdateExpression="SET p_known = if_not_exists(p_known, :init) + :boost, last_updated = :lu",
                    ExpressionAttributeValues={
                        ':init': Decimal('0.3'),
                        ':boost': Decimal('0.15'),
                        ':lu': datetime.utcnow().isoformat(),
                    }
                )
            except Exception as e:
                print(f"BKT update failed for {cid}: {e}")

    # Update sprint status in S3
    sprint_doc['checkpoint_result'] = {
        'passed': passed,
        'score_pct': score_pct,
        'correct_count': correct_count,
        'total': total,
        'evaluated_at': datetime.utcnow().isoformat(),
    }
    try:
        s3.put_object(Bucket=S3_CONTENT_BUCKET, Key=s3_key, Body=json.dumps(sprint_doc).encode('utf-8'), ContentType='application/json')
    except Exception:
        pass

    return respond(200, {
        "sprint_id": sprint_id,
        "passed": passed,
        "score_pct": score_pct,
        "correct_count": correct_count,
        "total": total,
        "results": results,
        "target_concept_unlocked": passed,
        "target_concept_id": target_concept,
        "message": "You're ready! Moving to the target concept." if passed else "Review recommended. Consider the full prerequisite season.",
    })


def lambda_handler(event, context):
    http_method = event.get('httpMethod') or event.get('requestContext', {}).get('http', {}).get('method', '')
    if http_method == 'OPTIONS':
        return respond(200, {})
    try:
        path = event.get('resource') or event.get('rawPath', '')
        if http_method == 'POST' and path.endswith('/bridge-sprint/generate'):
            return handle_generate_sprint(event)
        elif http_method == 'POST' and path.endswith('/bridge-sprint/checkpoint'):
            return handle_checkpoint(event)
        return respond(404, {"error": f"Route not found: {http_method} {path}"})
    except Exception as e:
        print(f"Error: {str(e)}")
        return respond(500, {"error": "Internal server error", "details": str(e)})

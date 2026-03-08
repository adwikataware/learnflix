import json
import re
import uuid
import hashlib
import boto3
import os
import io
import base64
from datetime import datetime
from decimal import Decimal
from boto3.dynamodb.conditions import Key
import botocore.exceptions
from botocore.config import Config

# AWS Clients
dynamodb = boto3.resource('dynamodb', region_name='ap-south-1')
bedrock = boto3.client('bedrock-runtime', region_name='ap-south-1', config=Config(read_timeout=300))
bedrock_agent = boto3.client('bedrock-agent-runtime', region_name='ap-south-1')
s3 = boto3.client('s3', region_name='ap-south-1')
polly = boto3.client('polly', region_name='ap-south-1')
comprehend = boto3.client('comprehend', region_name='ap-south-1')
bedrock_us_east = boto3.client('bedrock-runtime', region_name='us-east-1', config=Config(read_timeout=300))
s3_us_east = boto3.client('s3', region_name='us-east-1')
lambda_client = boto3.client('lambda', region_name='ap-south-1')

# Constants / Env Vars
LEARNER_STATE_TABLE = "LearnerState"
SESSION_LOGS_TABLE = "SessionLogs"
KNOWLEDGE_GRAPH_TABLE = "KnowledgeGraph"
LEARNER_MASTERY_TABLE = "LearnerMastery"
LEITNER_BOX_TABLE = "LeitnerBox"
PRIMARY_MODEL_ID = os.environ.get("HAIKU_MODEL_ID", "apac.amazon.nova-pro-v1:0")
SONNET_MODEL_ID = os.environ.get("SONNET_MODEL_ID", "apac.amazon.nova-pro-v1:0")
FALLBACK_MODEL_ID = "apac.amazon.nova-pro-v1:0"
S3_CONTENT_BUCKET = os.environ.get("S3_CONTENT_BUCKET", "primelearn-content-cache-mumbai")
KNOWLEDGE_BASE_ID = os.environ.get("KNOWLEDGE_BASE_ID", "QCA57QK7UJ")
MANIM_RENDERER_FUNCTION = os.environ.get('MANIM_RENDERER_FUNCTION', 'primelearn-manim-renderer')


# ─── Pre-rendered Manim Animation Videos (3Blue1Brown-style) ──────────────
# Maps concept keywords to pre-rendered Manim video S3 keys
MANIM_VIDEO_MAP = {
    # ── CS / DSA ──
    'binary-search': [('Binary Search Algorithm', 'manim-videos/algorithms-intro/BinarySearchAnimation.mp4')],
    'bfs': [('BFS Graph Traversal', 'manim-videos/graphs/BFSAnimation.mp4')],
    'breadth-first': [('BFS Graph Traversal', 'manim-videos/graphs/BFSAnimation.mp4')],
    'graph-traversal': [('BFS Graph Traversal', 'manim-videos/graphs/BFSAnimation.mp4')],
    'bubble-sort': [('Bubble Sort', 'manim-videos/sorting/BubbleSortAnimation.mp4')],
    'merge-sort': [('Merge Sort', 'manim-videos/sorting/MergeSortAnimation.mp4')],
    'sorting': [
        ('Bubble Sort', 'manim-videos/sorting/BubbleSortAnimation.mp4'),
        ('Merge Sort', 'manim-videos/sorting/MergeSortAnimation.mp4'),
    ],
    'linked-list': [('Linked List Operations', 'manim-videos/data-structures/LinkedListAnimation.mp4')],
    'stack': [('Stack Push & Pop', 'manim-videos/data-structures/StackAnimation.mp4')],
    'data-structure': [
        ('Linked List Operations', 'manim-videos/data-structures/LinkedListAnimation.mp4'),
        ('Stack Push & Pop', 'manim-videos/data-structures/StackAnimation.mp4'),
    ],
    'neural-network': [('Neural Network Forward Pass', 'manim-videos/neural-networks/NeuralNetworkAnimation.mp4')],
    'deep-learning': [('Neural Network Forward Pass', 'manim-videos/neural-networks/NeuralNetworkAnimation.mp4')],
    'machine-learning': [('Neural Network Forward Pass', 'manim-videos/neural-networks/NeuralNetworkAnimation.mp4')],
    # ── Mathematics ──
    'pythagorean': [('Pythagorean Theorem', 'manim-videos/math/PythagoreanTheoremAnimation.mp4')],
    'pythagoras': [('Pythagorean Theorem', 'manim-videos/math/PythagoreanTheoremAnimation.mp4')],
    'triangle': [('Pythagorean Theorem', 'manim-videos/math/PythagoreanTheoremAnimation.mp4')],
    'quadratic': [('Quadratic Functions', 'manim-videos/math/QuadraticGraphAnimation.mp4')],
    'parabola': [('Quadratic Functions', 'manim-videos/math/QuadraticGraphAnimation.mp4')],
    'polynomial': [('Quadratic Functions', 'manim-videos/math/QuadraticGraphAnimation.mp4')],
    'matrix': [('Matrix Multiplication', 'manim-videos/math/MatrixMultiplicationAnimation.mp4')],
    'linear-algebra': [('Matrix Multiplication', 'manim-videos/math/MatrixMultiplicationAnimation.mp4')],
    # ── Physics ──
    'projectile': [('Projectile Motion', 'manim-videos/physics/ProjectileMotionAnimation.mp4')],
    'kinematics': [('Projectile Motion', 'manim-videos/physics/ProjectileMotionAnimation.mp4')],
    'motion': [('Projectile Motion', 'manim-videos/physics/ProjectileMotionAnimation.mp4')],
    'wave': [('Wave Interference', 'manim-videos/physics/WaveInterferenceAnimation.mp4')],
    'interference': [('Wave Interference', 'manim-videos/physics/WaveInterferenceAnimation.mp4')],
    'superposition': [('Wave Interference', 'manim-videos/physics/WaveInterferenceAnimation.mp4')],
    # ── Statistics ──
    'normal-distribution': [('Normal Distribution', 'manim-videos/statistics/NormalDistributionAnimation.mp4')],
    'bell-curve': [('Normal Distribution', 'manim-videos/statistics/NormalDistributionAnimation.mp4')],
    'standard-deviation': [('Normal Distribution', 'manim-videos/statistics/NormalDistributionAnimation.mp4')],
    'statistics': [('Normal Distribution', 'manim-videos/statistics/NormalDistributionAnimation.mp4')],
    'probability': [('Normal Distribution', 'manim-videos/statistics/NormalDistributionAnimation.mp4')],
    # ── Economics ──
    'supply-demand': [('Supply & Demand', 'manim-videos/economics/SupplyDemandAnimation.mp4')],
    'supply': [('Supply & Demand', 'manim-videos/economics/SupplyDemandAnimation.mp4')],
    'demand': [('Supply & Demand', 'manim-videos/economics/SupplyDemandAnimation.mp4')],
    'equilibrium': [('Supply & Demand', 'manim-videos/economics/SupplyDemandAnimation.mp4')],
    'economics': [('Supply & Demand', 'manim-videos/economics/SupplyDemandAnimation.mp4')],
    'market': [('Supply & Demand', 'manim-videos/economics/SupplyDemandAnimation.mp4')],
}


def get_manim_videos(concept_id, concept_name=''):
    """
    Look up pre-rendered Manim animation videos for a concept.
    Returns list of {title, video_url} dicts with presigned S3 URLs.
    """
    search_text = f"{concept_id} {concept_name}".lower()
    matched_keys = []
    seen = set()

    for keyword, videos in MANIM_VIDEO_MAP.items():
        if keyword in search_text:
            for title, s3_key in videos:
                if s3_key not in seen:
                    seen.add(s3_key)
                    matched_keys.append((title, s3_key))

    if not matched_keys:
        return []

    results = []
    for title, s3_key in matched_keys:
        try:
            video_url = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': S3_CONTENT_BUCKET, 'Key': s3_key},
                ExpiresIn=3600
            )
            results.append({'title': title, 'video_url': video_url})
        except Exception as e:
            print(f"Manim video presign error ({s3_key}): {e}")

    return results


# ─── Dynamic Manim Video Generation ──────────────────────────────────────

def get_manim_cache_key(concept_id, prompt):
    """Generate a deterministic cache key for a manim video request."""
    normalized = f"{concept_id}:{prompt.lower().strip()}"
    hash_val = hashlib.md5(normalized.encode()).hexdigest()[:12]
    return f"manim-videos/generated/{concept_id}/cache-{hash_val}.mp4"


def generate_manim_code(concept_name, user_prompt, concept_data=None):
    """
    Use LLM to generate Manim CE Python code for a concept.
    Returns (code_string, error_string).
    CRITICAL: Enforces Text() only — no MathTex/Tex (no LaTeX installed).
    """
    concept_context = ""
    if concept_data:
        concept_context = (
            f"The concept is: {concept_data.get('label', concept_name)} "
            f"(type: {concept_data.get('type', 'general')}, "
            f"level: {concept_data.get('level', 'beginner')}).\n"
        )

    # Multiple working examples so LLM has proven patterns for different topics
    example_sorting = '''from manim import *

class BubbleSortDemo(Scene):
    def construct(self):
        bg = Rectangle(width=14.2, height=8, fill_color="#1a1a2e", fill_opacity=1, stroke_width=0)
        self.add(bg)
        title = Text("Bubble Sort", font_size=44, color="#e94560", weight=BOLD).to_edge(UP, buff=0.5)
        underline = Line(LEFT * 2.5, RIGHT * 2.5, color="#e94560", stroke_width=2).next_to(title, DOWN, buff=0.1)
        self.play(Write(title), Create(underline), run_time=0.8)
        subtitle = Text("Repeatedly swap adjacent elements if out of order", font_size=20, color="#a8a8b3")
        subtitle.next_to(underline, DOWN, buff=0.25)
        self.play(FadeIn(subtitle, shift=UP * 0.2), run_time=0.4)
        arr = [64, 34, 25, 12, 22]
        boxes = VGroup()
        nums = VGroup()
        for i, val in enumerate(arr):
            box = RoundedRectangle(corner_radius=0.15, width=1.2, height=1.2, fill_color="#0f3460", fill_opacity=0.9, stroke_color="#533483", stroke_width=2)
            num = Text(str(val), font_size=32, color=WHITE, weight=BOLD)
            num.move_to(box)
            boxes.add(box)
            nums.add(num)
        boxes.arrange(RIGHT, buff=0.2).move_to(ORIGIN + DOWN * 0.2)
        for i, num in enumerate(nums):
            num.move_to(boxes[i])
        self.play(LaggedStart(*[FadeIn(b, shift=UP*0.3) for b in boxes], lag_ratio=0.1), run_time=0.7)
        self.play(LaggedStart(*[FadeIn(n, scale=0.5) for n in nums], lag_ratio=0.08), run_time=0.5)
        step_label = Text("Pass 1", font_size=22, color="#e94560", weight=BOLD).to_edge(LEFT, buff=0.6).shift(DOWN*0.2)
        self.play(FadeIn(step_label), run_time=0.3)
        highlight = SurroundingRectangle(VGroup(boxes[0], boxes[1]), color="#e94560", buff=0.1, corner_radius=0.1)
        self.play(Create(highlight), run_time=0.3)
        compare = Text("64 > 34? Swap!", font_size=20, color="#eab308")
        compare.next_to(VGroup(boxes[0], boxes[1]), UP, buff=0.8)
        self.play(FadeIn(compare), run_time=0.4)
        pos_0, pos_1 = nums[0].get_center(), nums[1].get_center()
        self.play(nums[0].animate.move_to(pos_1), nums[1].animate.move_to(pos_0),
            boxes[0].animate.set_fill(color="#22c55e", opacity=0.7),
            boxes[1].animate.set_fill(color="#22c55e", opacity=0.7), run_time=0.5)
        arr[0], arr[1] = arr[1], arr[0]
        nums[0], nums[1] = nums[1], nums[0]
        self.play(boxes[0].animate.set_fill(color="#0f3460", opacity=0.9),
            boxes[1].animate.set_fill(color="#0f3460", opacity=0.9),
            FadeOut(highlight), FadeOut(compare), run_time=0.3)
        self.play(FadeOut(step_label), run_time=0.2)
        summary_bg = RoundedRectangle(corner_radius=0.2, width=10, height=0.8, fill_color="#533483", fill_opacity=0.3, stroke_width=0)
        summary_bg.to_edge(DOWN, buff=0.4)
        complexity = Text("Time: O(n\\u00b2)  |  Space: O(1)  |  Stable: Yes", font_size=20, color="#a78bfa")
        complexity.move_to(summary_bg)
        self.play(FadeIn(summary_bg), FadeIn(complexity), run_time=0.5)
        check = Text("\\u2713 Sorting Complete", font_size=32, color="#22c55e", weight=BOLD)
        check.move_to(ORIGIN + UP*0.8)
        self.play(FadeOut(subtitle), FadeIn(check, scale=1.3), run_time=0.6)
        self.wait(1)'''

    example_neural_net = '''from manim import *

class NeuralNetworkDemo(Scene):
    def construct(self):
        bg = Rectangle(width=14.2, height=8, fill_color="#1a1a2e", fill_opacity=1, stroke_width=0)
        self.add(bg)
        title = Text("Neural Network", font_size=44, color="#e94560", weight=BOLD).to_edge(UP, buff=0.5)
        underline = Line(LEFT*2.5, RIGHT*2.5, color="#e94560", stroke_width=2).next_to(title, DOWN, buff=0.1)
        self.play(Write(title), Create(underline), run_time=0.8)
        subtitle = Text("Data flows through layers of connected neurons", font_size=20, color="#a8a8b3")
        subtitle.next_to(underline, DOWN, buff=0.25)
        self.play(FadeIn(subtitle), run_time=0.4)
        layer_sizes = [3, 4, 4, 2]
        layer_labels = ["Input", "Hidden 1", "Hidden 2", "Output"]
        layer_colors = ["#22c55e", "#a78bfa", "#a78bfa", "#e94560"]
        all_nodes = []
        all_groups = []
        x_positions = [-4, -1.3, 1.3, 4]
        for l, (size, x_pos) in enumerate(zip(layer_sizes, x_positions)):
            nodes = VGroup()
            for i in range(size):
                c = Circle(radius=0.28, fill_color=layer_colors[l], fill_opacity=0.8, stroke_color=WHITE, stroke_width=1.5)
                nodes.add(c)
            nodes.arrange(DOWN, buff=0.35).move_to(RIGHT*x_pos + DOWN*0.3)
            all_nodes.append(nodes)
            all_groups.append(nodes)
        for nodes in all_groups:
            self.play(LaggedStart(*[FadeIn(n, scale=0.5) for n in nodes], lag_ratio=0.08), run_time=0.4)
        for l_label, x_pos in zip(layer_labels, x_positions):
            label = Text(l_label, font_size=16, color="#a8a8b3")
            label.move_to(RIGHT*x_pos + DOWN*2.8)
            self.play(FadeIn(label), run_time=0.15)
        edges = VGroup()
        for l in range(len(all_nodes)-1):
            for n1 in all_nodes[l]:
                for n2 in all_nodes[l+1]:
                    edge = Line(n1.get_right(), n2.get_left(), stroke_color="#533483", stroke_width=1, stroke_opacity=0.4)
                    edges.add(edge)
        self.play(LaggedStart(*[Create(e) for e in edges], lag_ratio=0.005), run_time=1)
        self.wait(0.3)
        for l in range(len(all_nodes)-1):
            highlights = VGroup()
            for n1 in all_nodes[l]:
                for n2 in all_nodes[l+1]:
                    h = Line(n1.get_right(), n2.get_left(), stroke_color="#eab308", stroke_width=2.5, stroke_opacity=0.9)
                    highlights.add(h)
            self.play(LaggedStart(*[Create(h) for h in highlights], lag_ratio=0.005), run_time=0.5)
            self.play(LaggedStart(*[FadeOut(h) for h in highlights], lag_ratio=0.005), run_time=0.3)
        summary_bg = RoundedRectangle(corner_radius=0.2, width=10, height=0.8, fill_color="#533483", fill_opacity=0.3, stroke_width=0)
        summary_bg.to_edge(DOWN, buff=0.3)
        summary = Text("Forward Pass: Input \\u2192 Hidden Layers \\u2192 Output", font_size=20, color="#a78bfa")
        summary.move_to(summary_bg)
        self.play(FadeIn(summary_bg), FadeIn(summary), run_time=0.5)
        self.wait(1)'''

    example_search = '''from manim import *

class BinarySearchDemo(Scene):
    def construct(self):
        bg = Rectangle(width=14.2, height=8, fill_color="#1a1a2e", fill_opacity=1, stroke_width=0)
        self.add(bg)
        title = Text("Binary Search", font_size=44, color="#e94560", weight=BOLD).to_edge(UP, buff=0.5)
        underline = Line(LEFT*2.5, RIGHT*2.5, color="#e94560", stroke_width=2).next_to(title, DOWN, buff=0.1)
        self.play(Write(title), Create(underline), run_time=0.8)
        subtitle = Text("Find target by halving the search space each step", font_size=20, color="#a8a8b3")
        subtitle.next_to(underline, DOWN, buff=0.25)
        self.play(FadeIn(subtitle), run_time=0.4)
        arr = [2, 5, 8, 12, 16, 23, 38, 56]
        target = 23
        target_text = Text(f"Target: {target}", font_size=24, color="#eab308", weight=BOLD)
        target_text.next_to(subtitle, DOWN, buff=0.3)
        self.play(FadeIn(target_text), run_time=0.3)
        boxes = VGroup()
        nums = VGroup()
        for val in arr:
            box = RoundedRectangle(corner_radius=0.1, width=1.0, height=1.0, fill_color="#0f3460", fill_opacity=0.9, stroke_color="#533483", stroke_width=2)
            num = Text(str(val), font_size=24, color=WHITE, weight=BOLD)
            num.move_to(box)
            boxes.add(box)
            nums.add(num)
        boxes.arrange(RIGHT, buff=0.15).move_to(DOWN*0.5)
        for i, num in enumerate(nums):
            num.move_to(boxes[i])
        self.play(LaggedStart(*[FadeIn(b, shift=UP*0.3) for b in boxes], lag_ratio=0.06), run_time=0.6)
        self.play(LaggedStart(*[FadeIn(n) for n in nums], lag_ratio=0.04), run_time=0.4)
        low, high = 0, len(arr)-1
        low_arrow = Arrow(UP*0.5, DOWN*0.1, color="#22c55e", stroke_width=3, buff=0.05).next_to(boxes[low], DOWN, buff=0.15)
        low_label = Text("L", font_size=18, color="#22c55e", weight=BOLD).next_to(low_arrow, DOWN, buff=0.05)
        high_arrow = Arrow(UP*0.5, DOWN*0.1, color="#e94560", stroke_width=3, buff=0.05).next_to(boxes[high], DOWN, buff=0.15)
        high_label = Text("H", font_size=18, color="#e94560", weight=BOLD).next_to(high_arrow, DOWN, buff=0.05)
        self.play(FadeIn(low_arrow), FadeIn(low_label), FadeIn(high_arrow), FadeIn(high_label), run_time=0.4)
        for step in range(3):
            mid = (low + high) // 2
            mid_arrow = Arrow(UP*0.5, DOWN*0.1, color="#eab308", stroke_width=3, buff=0.05).next_to(boxes[mid], DOWN, buff=0.15)
            mid_label = Text("M", font_size=18, color="#eab308", weight=BOLD).next_to(mid_arrow, DOWN, buff=0.05)
            self.play(FadeIn(mid_arrow), FadeIn(mid_label), run_time=0.3)
            step_text = Text(f"Step {step+1}: mid={arr[mid]}", font_size=20, color=WHITE)
            step_text.to_edge(RIGHT, buff=0.5).shift(DOWN*(step*0.6))
            self.play(FadeIn(step_text), boxes[mid].animate.set_fill(color="#eab308", opacity=0.6), run_time=0.3)
            if arr[mid] == target:
                self.play(boxes[mid].animate.set_fill(color="#22c55e", opacity=0.8), run_time=0.4)
                break
            elif arr[mid] < target:
                for i in range(low, mid+1):
                    boxes[i].set_fill(color="#333344", opacity=0.3)
                    nums[i].set_opacity(0.3)
                low = mid + 1
                self.play(low_arrow.animate.next_to(boxes[low], DOWN, buff=0.15),
                    low_label.animate.next_to(boxes[low], DOWN, buff=0.55), run_time=0.3)
            else:
                for i in range(mid, high+1):
                    boxes[i].set_fill(color="#333344", opacity=0.3)
                    nums[i].set_opacity(0.3)
                high = mid - 1
                self.play(high_arrow.animate.next_to(boxes[high], DOWN, buff=0.15),
                    high_label.animate.next_to(boxes[high], DOWN, buff=0.55), run_time=0.3)
            self.play(FadeOut(mid_arrow), FadeOut(mid_label), boxes[mid].animate.set_fill(color="#0f3460", opacity=0.9), run_time=0.2)
        summary_bg = RoundedRectangle(corner_radius=0.2, width=10, height=0.8, fill_color="#533483", fill_opacity=0.3, stroke_width=0)
        summary_bg.to_edge(DOWN, buff=0.3)
        summary = Text("Time: O(log n)  |  Space: O(1)  |  Requires sorted array", font_size=20, color="#a78bfa")
        summary.move_to(summary_bg)
        self.play(FadeIn(summary_bg), FadeIn(summary), run_time=0.5)
        self.wait(1)'''

    example_axes = '''from manim import *
import numpy as np

class LinearRegressionDemo(Scene):
    def construct(self):
        bg = Rectangle(width=14.2, height=8, fill_color="#1a1a2e", fill_opacity=1, stroke_width=0)
        self.add(bg)
        title = Text("Linear Regression", font_size=44, color="#e94560", weight=BOLD).to_edge(UP, buff=0.5)
        underline = Line(LEFT*2.5, RIGHT*2.5, color="#e94560", stroke_width=2).next_to(title, DOWN, buff=0.1)
        self.play(Write(title), Create(underline), run_time=0.8)
        subtitle = Text("Finding the best-fit line through data points", font_size=20, color="#a8a8b3")
        subtitle.next_to(underline, DOWN, buff=0.25)
        self.play(FadeIn(subtitle), run_time=0.4)
        axes = Axes(x_range=[0, 10, 2], y_range=[0, 10, 2], x_length=6, y_length=4,
            axis_config={"color": "#a8a8b3", "stroke_width": 2, "include_numbers": False})
        axes.move_to(DOWN*0.5)
        x_label = Text("X", font_size=18, color="#a8a8b3").next_to(axes.x_axis, RIGHT, buff=0.2)
        y_label = Text("Y", font_size=18, color="#a8a8b3").next_to(axes.y_axis, UP, buff=0.2)
        self.play(Create(axes), FadeIn(x_label), FadeIn(y_label), run_time=0.6)
        data_points = [(1,2), (2,2.8), (3,3.5), (4,5), (5,4.8), (6,6.2), (7,7), (8,7.5), (9,8.8)]
        dots = VGroup()
        for x, y in data_points:
            dot = Dot(axes.c2p(x, y), radius=0.08, color="#eab308")
            dots.add(dot)
        self.play(LaggedStart(*[FadeIn(d, scale=2) for d in dots], lag_ratio=0.08), run_time=0.8)
        self.wait(0.3)
        line = axes.plot(lambda x: 0.85*x + 1.0, x_range=[0.5, 9.5], color="#22c55e", stroke_width=3)
        line_label = Text("y = 0.85x + 1.0", font_size=20, color="#22c55e")
        line_label.next_to(axes, RIGHT, buff=0.3).shift(UP*0.5)
        self.play(Create(line), FadeIn(line_label), run_time=0.8)
        self.wait(0.3)
        residuals = VGroup()
        for x, y in data_points:
            pred_y = 0.85*x + 1.0
            res_line = DashedLine(axes.c2p(x, y), axes.c2p(x, pred_y), color="#e94560", stroke_width=1.5, stroke_opacity=0.6)
            residuals.add(res_line)
        res_label = Text("Residuals (errors)", font_size=18, color="#e94560")
        res_label.next_to(axes, RIGHT, buff=0.3).shift(DOWN*0.5)
        self.play(LaggedStart(*[Create(r) for r in residuals], lag_ratio=0.05), FadeIn(res_label), run_time=0.8)
        summary_bg = RoundedRectangle(corner_radius=0.2, width=10, height=0.8, fill_color="#533483", fill_opacity=0.3, stroke_width=0)
        summary_bg.to_edge(DOWN, buff=0.3)
        summary = Text("Goal: Minimize sum of squared residuals", font_size=20, color="#a78bfa")
        summary.move_to(summary_bg)
        self.play(FadeIn(summary_bg), FadeIn(summary), run_time=0.5)
        self.wait(1)'''

    example_code = example_sorting

    system_prompt = (
        "You are an expert Manim Community Edition animation programmer who creates PREMIUM, "
        "visually stunning educational animations. Your style is dark-themed, modern, and polished — "
        "inspired by 3Blue1Brown but with a sleek dark UI aesthetic. Your code must be production-ready and error-free."
    )

    prompt = f"""Generate Manim Community Edition (CE) Python code to create a PREMIUM educational animation about:
Topic: "{concept_name}"
Request: "{user_prompt}"
{concept_context}

ABSOLUTE REQUIREMENTS (VIOLATION = BROKEN CODE):
1. Use ONLY `Text()` for ALL text. NEVER use MathTex, Tex, MathTexIR, or any LaTeX class. LaTeX is NOT installed.
2. For math: use Unicode in Text(): Text("a² + b² = c²"), Text("O(n²)"), Text("f(x) = x² + 2x + 1")
3. Import ONLY: `from manim import *` and optionally `import numpy as np` or `import random`
4. Do NOT import os, sys, subprocess, or any system library.
5. Scene class MUST inherit from Scene (not ThreeDScene, MovingCameraScene, etc.)
6. Keep total animation 15-25 seconds. Use run_time=0.3-0.8 for most animations.
7. Define exactly ONE class inheriting from Scene.
8. For Axes: ALWAYS use include_numbers=False. Add manual Text labels with .next_to().
9. NEVER use axes.get_axis_labels() — use manual Text labels instead.
10. NEVER use Code() class — it WILL fail in Lambda. Show code snippets using Text() instead.
11. NEVER use Paragraph() class — it does not exist in Manim CE. Use Text() only.

CRITICAL LAYOUT RULES (PREVENTS BROKEN VIDEOS):
- The visible canvas is 14.2 wide x 8 tall. NEVER place elements outside this.
- Title goes at TOP (y ~3.5). Main content in MIDDLE (y -0.5 to 1.5). Summary at BOTTOM (y ~-3).
- Maximum 6-8 elements horizontally. If more, use smaller sizes or multiple rows.
- ALWAYS use .next_to() or explicit positioning to avoid overlaps. Never stack things at ORIGIN without offsets.
- For complex topics, keep it SIMPLE: show 3-4 key steps, not everything. Quality over quantity.
- FadeOut previous step's annotations before showing the next step's annotations.
- If showing a neural network: max 3 layers, max 4 nodes per layer, use small circles (radius=0.2-0.3).
- If showing an algorithm on array: max 8 elements, cards width=0.8-1.0 each.

PREMIUM VISUAL STYLE (MUST FOLLOW):
1. DARK THEME: Start with a dark background rectangle:
   bg = Rectangle(width=14.2, height=8, fill_color="#1a1a2e", fill_opacity=1, stroke_width=0)
   self.add(bg)
2. ACCENT COLORS: Use hex colors for a modern palette:
   - Primary accent: "#e94560" (red-pink)
   - Success/positive: "#22c55e" (green)
   - Warning/highlight: "#eab308" (amber)
   - Info/secondary: "#a78bfa" (purple)
   - Muted text: "#a8a8b3" (grey)
   - Card fills: "#0f3460", "#16213e" (dark blues)
   - Card borders: "#533483" (purple)
3. TITLE: Use weight=BOLD, color="#e94560", with an underline:
   title = Text("Title", font_size=44, color="#e94560", weight=BOLD).to_edge(UP, buff=0.5)
   underline = Line(LEFT * 2.5, RIGHT * 2.5, color="#e94560", stroke_width=2)
   underline.next_to(title, DOWN, buff=0.1)
4. CARDS: Use RoundedRectangle for data elements (not plain Square):
   RoundedRectangle(corner_radius=0.15, width=1.2, height=1.2, fill_color="#0f3460", fill_opacity=0.9, stroke_color="#533483", stroke_width=2)
5. ANIMATIONS: Use LaggedStart for groups, shift/scale for entrances:
   LaggedStart(*[FadeIn(b, shift=UP * 0.3) for b in group], lag_ratio=0.1)
6. ANNOTATIONS: Add comparison/explanation text with arrows during key steps
7. SUMMARY BAR: End with a rounded info bar at bottom showing key facts (complexity, properties, etc.)
8. Add a subtitle under the title explaining the concept in one line (color="#a8a8b3", font_size=20)
9. Use SurroundingRectangle to highlight active elements during steps
10. Flash green (#22c55e) on successful operations, amber (#eab308) on comparisons

TOPIC-SPECIFIC ELEMENTS TO INCLUDE:
- For SORTING: Show array as cards, animate comparisons with highlights, show swaps, display pass numbers
- For DATA STRUCTURES: Show nodes as circles with connections, animate insert/delete/traverse
- For GRAPHS/TREES: Draw nodes and edges, animate BFS/DFS with color waves
- For ALGORITHMS: Show step-by-step execution with state changes
- For MATH: Use coordinate systems with plots, annotate formulas with Text()
- For ML/AI: Show layers as rectangles, data flow with arrows, loss curves on axes
- For NETWORKING: Show devices as rounded rectangles, packets as small shapes moving along arrows
- For DATABASES: Show tables as grids, highlight rows/columns for queries

EXAMPLE 1 — SORTING (array operations, comparisons, swaps):
```python
{example_sorting}
```

EXAMPLE 2 — NEURAL NETWORK (nodes, layers, connections, data flow):
```python
{example_neural_net}
```

EXAMPLE 3 — BINARY SEARCH (array with pointers, step-by-step elimination):
```python
{example_search}
```

EXAMPLE 4 — GRAPHS/CHARTS (axes, data points, lines, plots):
```python
{example_axes}
```

Use the example closest to the requested topic as your TEMPLATE. Adapt it for the specific concept.
IMPORTANT: Do NOT invent new Manim patterns. Stick to the patterns shown in the examples above.
IMPORTANT: Do NOT use .animate with Transform or ReplacementTransform — use simple .animate.move_to(), .animate.set_fill(), .animate.set_opacity() only.

Return ONLY the Python code. No explanations, no markdown fences, no text before or after.
The code must start with `from manim import *` and define a class inheriting from Scene."""

    try:
        code_text, _model = call_llm(prompt, system_prompt=system_prompt, max_tokens=4500)
        if not code_text:
            return None, "LLM returned empty response"

        # Clean up: remove markdown fences if LLM included them
        code_text = code_text.strip()
        if code_text.startswith('```python'):
            code_text = code_text[len('```python'):].strip()
        if code_text.startswith('```'):
            code_text = code_text[3:].strip()
        if code_text.endswith('```'):
            code_text = code_text[:-3].strip()

        # Auto-fix common broken patterns
        import re as _re
        # Remove Code() usage — replace with Text()
        code_text = _re.sub(r'Code\s*\(', 'Text(', code_text)
        # Remove Paragraph() usage — replace with Text()
        code_text = _re.sub(r'Paragraph\s*\(', 'Text(', code_text)
        # Remove ThreeDScene, MovingCameraScene — replace with Scene
        code_text = _re.sub(r'\(ThreeDScene\)', '(Scene)', code_text)
        code_text = _re.sub(r'\(MovingCameraScene\)', '(Scene)', code_text)
        # Remove any import os/sys/subprocess lines
        code_text = _re.sub(r'^import\s+(os|sys|subprocess).*$', '', code_text, flags=_re.MULTILINE)
        code_text = _re.sub(r'^from\s+(os|sys|subprocess)\s+import.*$', '', code_text, flags=_re.MULTILINE)

        # Validate: no LaTeX classes
        if 'MathTex' in code_text or 'Tex(' in code_text:
            # Retry once with stronger constraint
            retry_prompt = (
                f"The previous code used MathTex or Tex which is NOT allowed. "
                f"Rewrite replacing ALL MathTex/Tex with Text() using Unicode for math symbols. "
                f"Return ONLY the corrected Python code.\n\n{code_text}"
            )
            code_text, _model = call_llm(retry_prompt, system_prompt=system_prompt, max_tokens=4500)
            if not code_text:
                return None, "Retry also failed"
            code_text = code_text.strip()
            if code_text.startswith('```python'):
                code_text = code_text[len('```python'):].strip()
            if code_text.startswith('```'):
                code_text = code_text[3:].strip()
            if code_text.endswith('```'):
                code_text = code_text[:-3].strip()

        if 'class ' not in code_text or 'Scene' not in code_text:
            return None, "Generated code does not contain a valid Scene class"

        return code_text, None

    except Exception as e:
        return None, f"LLM error: {str(e)}"


def call_llm(prompt, system_prompt=None, max_tokens=2500, model_id=None):
    """Call Bedrock LLM using Converse API. Tries primary model, falls back to Nova Pro."""
    models_to_try = [model_id or PRIMARY_MODEL_ID]
    if FALLBACK_MODEL_ID not in models_to_try:
        models_to_try.append(FALLBACK_MODEL_ID)
    for mid in models_to_try:
        try:
            params = {
                "modelId": mid,
                "messages": [{"role": "user", "content": [{"text": prompt}]}],
                "inferenceConfig": {"maxTokens": max_tokens}
            }
            if system_prompt:
                params["system"] = [{"text": system_prompt}]
            response = bedrock.converse(**params)
            return response['output']['message']['content'][0]['text'], mid
        except Exception as e:
            print(f"LLM error (model={mid}): {e}")
            if mid == models_to_try[-1]:
                raise
    return None, None

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


# ─── Amazon Bedrock Knowledge Bases (RAG) ───────────────────────────────────
def retrieve_from_knowledge_base(concept_name, max_results=3):
    """
    Retrieve relevant context from Bedrock Knowledge Base (RAG).
    Used to ground episode content in curated syllabus/reference material.
    """
    try:
        response = bedrock_agent.retrieve(
            knowledgeBaseId=KNOWLEDGE_BASE_ID,
            retrievalQuery={'text': concept_name},
            retrievalConfiguration={
                'vectorSearchConfiguration': {
                    'numberOfResults': max_results
                }
            }
        )
        results = response.get('retrievalResults', [])
        context_chunks = []
        for r in results:
            text = r.get('content', {}).get('text', '')
            if text:
                context_chunks.append(text[:500])  # Limit each chunk
        return "\n---\n".join(context_chunks)
    except Exception as e:
        print(f"Knowledge Base retrieval error: {e}")
        return ""


# ─── Amazon Polly (Text-to-Speech) ──────────────────────────────────────────
def generate_narration(text_content, episode_id, language='en'):
    """
    Generate voice narration for Visual Story episodes using Amazon Polly.
    Returns S3 URL of the audio file.
    """
    # Strip HTML tags for narration
    clean_text = re.sub(r'<[^>]+>', ' ', text_content)
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()

    # Limit to Polly's max (3000 chars for standard, use SSML for longer)
    if len(clean_text) > 2800:
        clean_text = clean_text[:2800] + "..."

    # Select voice based on language
    voice_id = 'Aditi' if language == 'hi' else 'Kajal'  # Kajal = Indian English, Aditi = Hindi
    engine = 'neural'

    try:
        polly_response = polly.synthesize_speech(
            Text=clean_text,
            OutputFormat='mp3',
            VoiceId=voice_id,
            Engine=engine
        )

        # Save to S3
        audio_key = f"narrations/{episode_id}.mp3"
        audio_stream = polly_response['AudioStream'].read()

        s3.put_object(
            Bucket=S3_CONTENT_BUCKET,
            Key=audio_key,
            Body=audio_stream,
            ContentType='audio/mpeg'
        )

        # Generate presigned URL (valid 1 hour)
        audio_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_CONTENT_BUCKET, 'Key': audio_key},
            ExpiresIn=3600
        )
        return audio_url
    except Exception as e:
        print(f"Polly narration error: {e}")
        return None


# ─── Amazon Nova Canvas (AI Image Generation) ────────────────────────────
NOVA_CANVAS_MODEL_ID = "amazon.nova-canvas-v1:0"


def generate_concept_image(concept_name, section_title, section_context, style="educational"):
    """
    Generate an AI illustration for a concept section using Amazon Nova Canvas.
    Returns presigned S3 URL of the generated image, or None on failure.
    """
    style_prompts = {
        "educational": "Clean, modern educational infographic style with flat design, vibrant gradients, dark navy background, glowing accents, professional typography",
        "technical": "Technical blueprint style with circuit-board patterns, neon blue and gold highlights, dark background, isometric 3D elements",
        "conceptual": "Abstract conceptual art, flowing shapes representing data and knowledge, deep purple and gold color palette, ethereal lighting",
        "architectural": "3D architectural diagram, clean geometric shapes, glass and metal materials, ambient occlusion, soft studio lighting",
    }

    style_desc = style_prompts.get(style, style_prompts["educational"])

    prompt = (
        f"Educational illustration for '{section_title}' about {concept_name}. "
        f"{section_context}. "
        f"{style_desc}. "
        "No text or words in the image. High quality, 4K detail."
    )[:512]

    try:
        body = json.dumps({
            "taskType": "TEXT_IMAGE",
            "textToImageParams": {"text": prompt},
            "imageGenerationConfig": {
                "numberOfImages": 1,
                "height": 720,
                "width": 1280,
                "cfgScale": 8.0,
                "seed": hash(concept_name + section_title) % 2147483647
            }
        })

        response = bedrock_us_east.invoke_model(
            body=body,
            modelId=NOVA_CANVAS_MODEL_ID,
            accept="application/json",
            contentType="application/json"
        )

        response_body = json.loads(response["body"].read())
        if response_body.get("error"):
            print(f"Nova Canvas error: {response_body['error']}")
            return None

        base64_image = response_body.get("images", [None])[0]
        if not base64_image:
            return None

        image_bytes = base64.b64decode(base64_image)

        # Upload to S3
        image_key = f"images/{concept_name.replace(' ', '-').lower()}/{uuid.uuid4()}.png"
        s3.put_object(
            Bucket=S3_CONTENT_BUCKET,
            Key=image_key,
            Body=image_bytes,
            ContentType='image/png'
        )

        image_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_CONTENT_BUCKET, 'Key': image_key},
            ExpiresIn=3600
        )
        return image_url

    except Exception as e:
        print(f"Nova Canvas image generation error: {e}")
        return None


# ─── Amazon Comprehend (NLP Analysis) ─────────────────────────────────────

def analyze_learner_input(text, language='en'):
    """
    Use Amazon Comprehend to analyze learner input for sentiment, key phrases,
    and entities. Used to adapt content difficulty and detect confusion/frustration.
    """
    result = {"sentiment": "NEUTRAL", "key_phrases": [], "entities": [], "confusion_score": 0}

    try:
        lang_code = 'en' if language == 'en' else 'hi'

        # Sentiment analysis
        sentiment_resp = comprehend.detect_sentiment(Text=text[:5000], LanguageCode=lang_code)
        result["sentiment"] = sentiment_resp.get("Sentiment", "NEUTRAL")
        scores = sentiment_resp.get("SentimentScore", {})
        # Confusion heuristic: high mixed + negative signals confusion
        result["confusion_score"] = round(
            scores.get("Mixed", 0) * 0.5 + scores.get("Negative", 0) * 0.3, 3
        )

        # Key phrases
        phrases_resp = comprehend.detect_key_phrases(Text=text[:5000], LanguageCode=lang_code)
        result["key_phrases"] = [
            p["Text"] for p in phrases_resp.get("KeyPhrases", [])[:10]
        ]

        # Entity detection
        entities_resp = comprehend.detect_entities(Text=text[:5000], LanguageCode=lang_code)
        result["entities"] = [
            {"text": e["Text"], "type": e["Type"]}
            for e in entities_resp.get("Entities", [])[:10]
        ]
    except Exception as e:
        print(f"Comprehend analysis error: {e}")

    return result


# ─── Bedrock Guardrails (Content Safety) ──────────────────────────────────
GUARDRAIL_ID = os.environ.get("GUARDRAIL_ID", "")
GUARDRAIL_VERSION = os.environ.get("GUARDRAIL_VERSION", "DRAFT")


def apply_guardrail(text):
    """
    Apply Bedrock Guardrails to filter harmful/inappropriate content.
    Returns (is_safe, filtered_text).
    """
    if not GUARDRAIL_ID:
        return True, text

    try:
        response = bedrock.apply_guardrail(
            guardrailIdentifier=GUARDRAIL_ID,
            guardrailVersion=GUARDRAIL_VERSION,
            source="OUTPUT",
            content=[{"text": {"text": text[:10000]}}]
        )
        action = response.get("action", "NONE")
        if action == "GUARDRAIL_INTERVENED":
            outputs = response.get("outputs", [])
            filtered = outputs[0]["text"] if outputs else "Content filtered for safety."
            return False, filtered
        return True, text
    except Exception as e:
        print(f"Guardrail error: {e}")
        return True, text


def determine_format(concept, learner=None, is_revision=False, time_available=30):
    """Select episode format based on concept type and learner profile."""
    if is_revision or time_available < 10:
        return 'Quick Byte'

    c_type = concept.get('type', concept.get('concept_type', '')).lower()
    requires_hands_on = concept.get('requires_hands_on', False)
    depth = concept.get('depth', concept.get('complexity_level', '')).lower()
    can_code = True
    if learner:
        can_code = learner.get('can_code', True)

    if requires_hands_on and can_code:
        return 'Code Lab'

    if c_type in ['architectural', 'visual', 'networking', 'cloud', 'conceptual']:
        return 'Visual Story'

    if not can_code and c_type != 'theoretical':
        return 'Visual Story'

    if c_type == 'applied':
        return 'Case Study'

    if c_type == 'theoretical' and depth in ['intermediate', 'advanced']:
        return 'Concept X-Ray'

    return 'Visual Story'


def handle_get_episode(event):
    path_parameters = event.get('pathParameters') or {}
    episode_id = path_parameters.get('episode_id')
    query_params = event.get('queryStringParameters') or {}
    learner_id = query_params.get('learner_id')
    concept_id = query_params.get('concept_id', episode_id)

    if not episode_id:
        return respond(400, {"error": "episode_id is required"})

    # Read learner profile FIRST (needed for personalized cache key)
    learner = {}
    if learner_id:
        state_table = dynamodb.Table(LEARNER_STATE_TABLE)
        learner_resp = state_table.get_item(Key={'learner_id': learner_id})
        learner = learner_resp.get('Item', {})

    ability_score = float(learner.get('ability_score', 0.5))
    language = learner.get('language', 'en')

    # Ability bracket for cache: beginner(0-0.3), intermediate(0.3-0.7), advanced(0.7-1.0)
    ability_bracket = 'beginner' if ability_score < 0.3 else ('intermediate' if ability_score < 0.7 else 'advanced')

    # Cache key includes concept + ability level + language (personalized)
    cache_key = f"episodes/{episode_id}/{ability_bracket}_{language}.json"
    try:
        s3_response = s3.get_object(Bucket=S3_CONTENT_BUCKET, Key=cache_key)
        cached_episode = json.loads(s3_response['Body'].read().decode('utf-8'))
        return respond(200, cached_episode)
    except botocore.exceptions.ClientError as e:
        if e.response['Error']['Code'] != 'NoSuchKey':
            print(f"S3 error: {e}")

    # Read concept metadata
    kg_table = dynamodb.Table(KNOWLEDGE_GRAPH_TABLE)
    concept_resp = kg_table.get_item(Key={'concept_id': concept_id})
    concept = concept_resp.get('Item', {})
    concept_name = concept.get('label', concept.get('name', concept.get('concept_name', concept_id)))

    is_revision = query_params.get('is_revision', 'false').lower() == 'true'
    time_available = int(query_params.get('time_available', 30))

    # Select format
    format_type = determine_format(concept, learner, is_revision=is_revision, time_available=time_available)

    # ─── Bedrock Knowledge Bases RAG: Retrieve grounding context ─────────
    rag_context = retrieve_from_knowledge_base(concept_name)
    rag_instruction = ""
    if rag_context:
        rag_instruction = (
            f"\n\nUse the following reference material to ground your content:\n"
            f"---\n{rag_context}\n---\n"
            "Incorporate key points from this material into your episode content."
        )

    # Build prompt
    lang_instruction = ""
    if language == 'hi':
        lang_instruction = " Respond in Hinglish (Hindi-English code-mixed). Keep technical terms in English."

    context_str = ""
    if format_type == 'Case Study':
        context_str = " Include a real-world Indian company context (e.g., Zomato, UPI, Flipkart, IRCTC, Paytm, Aadhaar)."

    # ─── Sonnet/Pro for Code Lab (complex reasoning), Haiku/Nova for others ──
    if format_type == 'Code Lab':
        model_id = SONNET_MODEL_ID
        code_instruction = (
            " Include these additional top-level keys in the JSON:\n"
            "- 'problem_statement': A HackerRank-style coding problem as rich HTML. Structure it EXACTLY like this:\n"
            "  <h3>Problem Title</h3>\n"
            "  <p>Clear problem description explaining what the learner needs to build/solve. "
            "Make it a SPECIFIC coding task, NOT a tutorial or explanation of the topic.</p>\n"
            "  <h4>Input Format</h4><p>Describe the input format precisely.</p>\n"
            "  <h4>Output Format</h4><p>Describe the expected output format precisely.</p>\n"
            "  <h4>Constraints</h4><ul><li>List constraints like 1 ≤ N ≤ 1000</li></ul>\n"
            "  <h4>Sample Input</h4><pre>sample input here (plain text, NO code tags)</pre>\n"
            "  <h4>Sample Output</h4><pre>expected output here (plain text, NO code tags)</pre>\n"
            "  <h4>Explanation</h4><p>Explain how the sample output is derived from the sample input.</p>\n"
            "  IMPORTANT: This must be an ORIGINAL coding challenge, NOT a copy of the notes/content. "
            "Think like HackerRank or LeetCode — give a real problem to solve.\n"
            "- 'starter_code': PLAIN TEXT Python code (NO HTML tags, NO <code> wrapping). "
            "Include function signature, imports, and input parsing boilerplate. "
            "The learner should only need to fill in the logic.\n"
            "- 'solution_code': PLAIN TEXT complete correct Python solution (NO HTML tags)\n"
            "- 'test_cases': Array of 2-3 objects with 'input' (string) and 'expected_output' (string) for validation\n"
            "- 'difficulty': one of 'Easy', 'Medium', 'Hard' based on the problem complexity"
        )
    else:
        model_id = PRIMARY_MODEL_ID
        code_instruction = ""

    # ─── Ability-adaptive complexity ─────────────────────────────────────
    complexity_instruction = ""
    if ability_score >= 0.7:
        complexity_instruction = (
            " Target ADVANCED level. Use industry jargon, discuss edge cases, trade-offs, "
            "internal implementations, and performance considerations. "
            "Reference real-world systems (AWS internals, Linux kernel, distributed systems). "
            "Assume strong fundamentals."
        )
    elif ability_score >= 0.3:
        complexity_instruction = (
            " Target INTERMEDIATE level. Explain the 'why' behind concepts, not just the 'what'. "
            "Include comparisons with alternatives, practical use cases, and common pitfalls. "
            "Build on assumed basic knowledge."
        )
    else:
        complexity_instruction = (
            " Target BEGINNER level. Use clear analogies from everyday life. "
            "Build intuition before formalism. Focus on mental models over syntax."
        )

    # ─── Format-specific prompt instructions ──────────────────────────────
    format_instructions = ""
    if format_type == 'Visual Story':
        format_instructions = (
            "\n\nFor this Visual Story format, structure the content as rich VISUAL SECTIONS. "
            "Return an additional key 'sections' (array of objects), each with:\n"
            "- 'title': section heading\n"
            "- 'content': Rich HTML explanation with <h3>, <p>, <ul>, <code>, <blockquote> tags. "
            "Include real-world examples, analogies, and key insights.\n"
            "- 'image_prompt': A vivid 1-2 sentence description of an educational illustration for THIS section. "
            "Describe what the image should show visually (diagrams, architecture, data flow, etc). "
            "AI will generate a unique illustration from this prompt.\n"
            "Generate 4-6 sections. Make content deep and insightful, not surface-level."
        )
    elif format_type == 'Concept X-Ray':
        format_instructions = (
            "\n\nFor this X-Ray format, provide layered drill-down from surface to internals. "
            "Return an additional key 'layers' (array of objects), each with:\n"
            "- 'title': layer name (e.g., 'What It Does', 'How It Works', 'Under the Hood', 'Edge Cases & Gotchas')\n"
            "- 'content': Rich HTML explanation with code examples where relevant\n"
            "- 'image_prompt': description of an illustration showing this layer's concept\n"
            "Provide 3-5 layers, each progressively deeper. Last layer should be expert-level."
        )
    elif format_type == 'Case Study':
        format_instructions = (
            "\n\nFor this Case Study format, include:\n"
            "- 'scenario_context': detailed description of the real-world scenario (company, problem, constraints)\n"
            "- 'what_if_scenarios': array of 3-4 objects with 'question' and 'answer' for What-If analysis. "
            "Make these challenging: 'What if traffic spikes 100x?', 'What if the primary DB fails?'\n"
            "- 'image_prompt': description of an architectural diagram for this system\n"
            "- 'key_decisions': array of critical design decisions made in this system"
        )
    elif format_type == 'Quick Byte':
        format_instructions = (
            "\n\nFor Quick Byte, keep it very concise (3-5 min read). Include:\n"
            "- 'summary': one-line key takeaway\n"
            "- 'image_prompt': description of a single key visual\n"
            "- Exactly 2 activities (mcq type, make them tricky)"
        )

    prompt = (
        f"Generate a learning episode about '{concept_name}'. "
        f"The format is '{format_type}'. "
        f"The learner has an ability score of {ability_score:.2f} (0.0=beginner, 1.0=expert). "
        f"{complexity_instruction}{lang_instruction}{context_str}{code_instruction}"
        f"{rag_instruction}{format_instructions}\n\n"
        "IMPORTANT: Write like a senior engineer teaching a mentee, not like a textbook. "
        "Use practical examples, war stories, and real system references. "
        "Avoid generic filler like 'In today's world' or 'This is important because'. "
        "Get straight to the substance.\n\n"
        "Return ONLY a JSON object with these keys:\n"
        "- 'title': episode title (creative, specific - NOT generic like 'Introduction to X')\n"
        "- 'content': the main learning content as DETAILED rich HTML notes. This must be comprehensive study notes covering ALL key points. "
        "Structure it with <h3> headings for each subtopic, <ul>/<li> bullet points for key takeaways, "
        "<code> blocks for any code/syntax, <blockquote> for important definitions or rules, "
        "and <p> for explanations. Include at least 5-8 subtopics with proper depth. "
        "Think of it as a complete reference guide a student would use to study. "
        "Each subtopic should have: definition, explanation in simple words, a practical example, and a key takeaway.\n"
        "- 'activities': array of 2-3 objects with 'type' (mcq/coding/fill_blank), 'question', 'options' (array of 4 strings for mcq), 'correct' (index or string). Make questions actually challenging.\n"
        "Do not include any explanation outside the JSON."
    )

    episode_data = None
    used_model = None
    try:
        content_text, used_model = call_llm(prompt, max_tokens=4000, model_id=model_id)
        if content_text:
            episode_data = safe_parse_json_object(content_text)
    except Exception as e:
        print(f"Bedrock error (model={model_id}): {e}")

    if not episode_data:
        episode_data = {
            "title": f"Episode: {concept_name}",
            "content": f"<h2>{concept_name}</h2><p>This episode covers the fundamentals of {concept_name}. Content generation is temporarily unavailable.</p>",
            "activities": []
        }

    episode_data['episode_id'] = episode_id
    episode_data['concept_id'] = concept_id
    episode_data['format'] = format_type
    episode_data['model_used'] = (used_model or 'fallback').split('.')[-1].split('-')[0] if used_model else 'fallback'
    episode_data['rag_grounded'] = bool(rag_context)

    # ─── Bedrock Guardrails: Filter generated content ─────────────────────
    is_safe, filtered_content = apply_guardrail(episode_data.get('content', ''))
    if not is_safe:
        episode_data['content'] = filtered_content
        episode_data['guardrail_filtered'] = True
    episode_data['guardrail_applied'] = bool(GUARDRAIL_ID)

    # ─── Amazon Nova Canvas: Generate AI illustrations for sections ───────
    # Replace Mermaid diagrams with actual AI-generated educational images
    sections_key = None
    if format_type == 'Visual Story' and episode_data.get('sections'):
        sections_key = 'sections'
    elif format_type == 'Concept X-Ray' and episode_data.get('layers'):
        sections_key = 'layers'

    if sections_key:
        # Determine visual style based on concept type
        c_type = concept.get('type', '').lower()
        if c_type in ['architectural', 'cloud', 'networking']:
            img_style = 'architectural'
        elif c_type in ['applied', 'theoretical']:
            img_style = 'technical'
        else:
            img_style = 'educational'

        for section in episode_data[sections_key][:2]:  # Limit to 2 images to stay within API Gateway 29s timeout
            image_prompt = section.get('image_prompt', section.get('title', ''))
            if image_prompt:
                image_url = generate_concept_image(
                    concept_name,
                    section.get('title', 'Concept'),
                    image_prompt,
                    style=img_style
                )
                if image_url:
                    section['image_url'] = image_url
                    section.pop('diagram', None)  # Remove old Mermaid diagram

    # Also generate a single image for Case Study and Quick Byte
    if format_type in ('Case Study', 'Quick Byte'):
        img_prompt = episode_data.get('image_prompt', f"Visual diagram of {concept_name}")
        hero_image = generate_concept_image(concept_name, concept_name, img_prompt, style='technical')
        if hero_image:
            episode_data['hero_image_url'] = hero_image

    # ─── Amazon Polly: Generate narration for Visual Story episodes ──────
    if format_type == 'Visual Story' and episode_data.get('content'):
        audio_url = generate_narration(episode_data['content'], episode_id, language)
        if audio_url:
            episode_data['narration_url'] = audio_url

    # ─── Manim Animations: Attach pre-rendered algorithm/DS videos ──────
    manim_videos = get_manim_videos(concept_id, concept_name)
    if manim_videos:
        episode_data['manim_videos'] = manim_videos

    # Cache to S3
    try:
        s3.put_object(
            Bucket=S3_CONTENT_BUCKET,
            Key=cache_key,
            Body=json.dumps(episode_data).encode('utf-8'),
            ContentType='application/json'
        )
    except Exception as e:
        print(f"S3 cache write error: {e}")

    return respond(200, episode_data)


def handle_post_progress(event):
    path_parameters = event.get('pathParameters') or {}
    episode_id = path_parameters.get('episode_id')
    body = get_body(event)

    learner_id = body.get('learner_id')
    concept_id = body.get('concept_id', episode_id)
    completion_rate = float(body.get('completion_rate', 0.0))
    time_spent_seconds = int(body.get('time_spent_seconds', 0))

    if not all([episode_id, learner_id]):
        return respond(400, {"error": "episode_id and learner_id are required"})

    table = dynamodb.Table(SESSION_LOGS_TABLE)
    timestamp = datetime.utcnow().isoformat()
    action = "EPISODE_COMPLETE" if completion_rate >= 1.0 else "PROGRESS_UPDATE"

    table.put_item(Item={
        'learner_id': learner_id,
        'timestamp': timestamp,
        'episode_id': episode_id,
        'concept_id': concept_id,
        'action': action,
        'completion_rate': Decimal(str(completion_rate)),
        'time_spent_seconds': time_spent_seconds
    })

    if completion_rate >= 1.0:
        state_table = dynamodb.Table(LEARNER_STATE_TABLE)
        try:
            state_table.update_item(
                Key={'learner_id': learner_id},
                UpdateExpression="SET last_active = :la, streak = if_not_exists(streak, :zero) + :inc",
                ExpressionAttributeValues={
                    ":la": timestamp,
                    ":zero": 0,
                    ":inc": 1
                }
            )
        except Exception as e:
            print(f"Streak update error: {e}")

    return respond(200, {
        "message": "Progress recorded",
        "episode_id": episode_id,
        "completion_rate": completion_rate,
        "action": action
    })


def handle_get_dashboard(event):
    path_parameters = event.get('pathParameters') or {}
    learner_id = path_parameters.get('learner_id')

    if not learner_id:
        return respond(400, {"error": "learner_id is required"})

    # 1. Read LearnerState
    state_table = dynamodb.Table(LEARNER_STATE_TABLE)
    profile = state_table.get_item(Key={'learner_id': learner_id}).get('Item', {})

    # 2. Read LearnerMastery
    mastery_table = dynamodb.Table(LEARNER_MASTERY_TABLE)
    mastery_resp = mastery_table.query(KeyConditionExpression=Key('learner_id').eq(learner_id))
    mastery_items = mastery_resp.get('Items', [])

    total_mastered = sum(1 for m in mastery_items if float(m.get('p_known', 0)) >= 0.85)

    # Build skill radar data
    skill_groups = {}
    for m in mastery_items:
        concept_id = m.get('concept_id', '')
        p_known = float(m.get('p_known', 0))
        category = concept_id.split('-')[0].upper() if '-' in concept_id else concept_id[:3].upper()
        if category not in skill_groups:
            skill_groups[category] = []
        skill_groups[category].append(p_known)

    radar_data = []
    for subject, scores in skill_groups.items():
        avg = sum(scores) / len(scores) if scores else 0
        radar_data.append({"subject": subject[:6], "A": round(avg * 150, 1), "fullMark": 150})

    if not radar_data:
        radar_data = [
            {"subject": "DSA", "A": 30, "fullMark": 150},
            {"subject": "WEB", "A": 20, "fullMark": 150},
            {"subject": "DB", "A": 15, "fullMark": 150},
            {"subject": "CLOUD", "A": 10, "fullMark": 150},
            {"subject": "SYS", "A": 5, "fullMark": 150},
        ]

    # 3. Read LeitnerBox
    leitner_table = dynamodb.Table(LEITNER_BOX_TABLE)
    leitner_resp = leitner_table.query(KeyConditionExpression=Key('learner_id').eq(learner_id))
    leitner_items = leitner_resp.get('Items', [])

    now = datetime.utcnow().isoformat()
    due_now = sum(1 for item in leitner_items if item.get('next_review_date', now) <= now)

    box_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for item in leitner_items:
        box = int(item.get('box', item.get('box_number', 1)))
        box_counts[box] = box_counts.get(box, 0) + 1

    # 4. Read recent SessionLogs
    logs_table = dynamodb.Table(SESSION_LOGS_TABLE)
    logs_resp = logs_table.query(
        KeyConditionExpression=Key('learner_id').eq(learner_id),
        ScanIndexForward=False,
        Limit=10
    )
    recent_activity = logs_resp.get('Items', [])

    # 5. BKT data
    bkt_data = []
    for m in mastery_items[:10]:
        bkt_data.append({
            "concept_id": m.get('concept_id'),
            "p_known": float(m.get('p_known', 0)),
            "status": m.get('status', 'in_progress')
        })

    total_seconds = sum(int(log.get('time_spent_seconds', 0)) for log in recent_activity)

    # 6. Fading knowledge alerts (concepts in Leitner box 1-2 that are overdue)
    fading_concepts = []
    for item in leitner_items:
        review_date = item.get('next_review_date', '')
        if review_date and review_date <= now:
            box = int(item.get('box', 1))
            if box <= 2:
                fading_concepts.append({
                    'concept_id': item.get('concept_id'),
                    'box': box,
                    'days_overdue': max(0, (datetime.utcnow() - datetime.fromisoformat(review_date.replace('Z', ''))).days) if review_date else 0,
                })

    # 7. Placement readiness score (weighted average of mastery across domains)
    domain_weights = {
        'dsa': 0.25, 'sorting': 0.25, 'searching': 0.25, 'graphs': 0.25, 'trees': 0.25,
        'recursion': 0.25, 'data': 0.15, 'algorithms': 0.25,
        'web': 0.15, 'html': 0.15, 'css': 0.15, 'javascript': 0.15, 'react': 0.15,
        'node': 0.15, 'express': 0.15, 'rest': 0.15,
        'python': 0.1, 'oop': 0.1, 'functions': 0.1, 'variables': 0.1, 'control': 0.1,
        'ml': 0.2, 'ai': 0.2, 'deep': 0.2, 'neural': 0.2, 'linear': 0.2, 'classification': 0.2,
        'mongodb': 0.15, 'deployment': 0.1, 'authentication': 0.1, 'state': 0.1,
    }
    weighted_sum = 0
    weight_total = 0
    for m in mastery_items:
        cid = m.get('concept_id', '')
        pk = float(m.get('p_known', 0))
        w = 0.1
        for kw, wt in domain_weights.items():
            if kw in cid.lower():
                w = max(w, wt)
                break
        weighted_sum += pk * w
        weight_total += w
    placement_readiness = round((weighted_sum / max(weight_total, 0.01)) * 100, 1)

    # 8. Concept mastery heatmap (green/yellow/red)
    mastery_heatmap = []
    for m in mastery_items:
        pk = float(m.get('p_known', 0))
        color = 'green' if pk >= 0.7 else 'yellow' if pk >= 0.4 else 'red'
        mastery_heatmap.append({
            'concept_id': m.get('concept_id'),
            'p_known': pk,
            'color': color,
            'status': m.get('status', 'learning'),
        })

    # 9. Portfolio (season finale results)
    portfolio = []
    try:
        portfolio_resp = s3.list_objects_v2(Bucket=S3_CONTENT_BUCKET, Prefix=f'portfolio/{learner_id}/', MaxKeys=20)
        for obj in portfolio_resp.get('Contents', []):
            try:
                p_data = json.loads(s3.get_object(Bucket=S3_CONTENT_BUCKET, Key=obj['Key'])['Body'].read())
                portfolio.append(p_data)
            except Exception:
                pass
    except Exception:
        pass

    return respond(200, {
        "learner_id": learner_id,
        "profile": profile,
        "mastery": {
            "items": mastery_items,
            "total_mastered": total_mastered,
            "total_concepts": len(mastery_items),
            "heatmap": mastery_heatmap,
        },
        "radar_data": radar_data,
        "bkt_data": bkt_data,
        "leitner": {
            "items": leitner_items,
            "due_now": due_now,
            "box_counts": box_counts
        },
        "fading_knowledge": fading_concepts,
        "recent_activity": recent_activity,
        "placement_readiness": placement_readiness,
        "portfolio": portfolio,
        "stats": {
            "streak": int(profile.get('streak', 0)),
            "total_hours": round(total_seconds / 3600, 1) if total_seconds > 0 else float(profile.get('total_hours', 0)),
            "xp": int(profile.get('xp', total_mastered * 100)),
        }
    })


def handle_get_constellation(event):
    """Return the PERSONALIZED knowledge graph for this learner as nodes + links."""
    query_params = event.get('queryStringParameters') or {}
    learner_id = query_params.get('learner_id')

    if not learner_id:
        return respond(400, {"error": "learner_id is required"})

    # 1. Get THIS learner's mastery entries (personalized concept list)
    mastery_table = dynamodb.Table(LEARNER_MASTERY_TABLE)
    mastery_resp = mastery_table.query(KeyConditionExpression=Key('learner_id').eq(learner_id))
    mastery_items = mastery_resp.get('Items', [])
    mastery_map = {m['concept_id']: m for m in mastery_items}

    if not mastery_items:
        return respond(200, {"learner_id": learner_id, "nodes": [], "links": [], "message": "No concepts yet. Complete onboarding first."})

    # 2. Fetch concept details from KnowledgeGraph only for this learner's concepts
    kg_table = dynamodb.Table(KNOWLEDGE_GRAPH_TABLE)
    concept_ids = list(mastery_map.keys())

    nodes = []
    links = []
    concept_details = {}

    for cid in concept_ids:
        try:
            kg_resp = kg_table.get_item(Key={'concept_id': cid})
            concept = kg_resp.get('Item', {})
            if concept:
                concept_details[cid] = concept
        except Exception:
            pass

    # 3. Build nodes with mastery state + stored x/y positions
    for i, cid in enumerate(concept_ids):
        concept = concept_details.get(cid, {})
        mastery_entry = mastery_map[cid]
        p_known = float(mastery_entry.get('p_known', 0))
        status = mastery_entry.get('status', 'locked')

        if p_known >= 0.85:
            state = 'mastered'
        elif status == 'unlocked' or p_known > 0:
            state = 'active'
        else:
            state = 'locked'

        # Use stored x/y from KnowledgeGraph, fallback to calculated grid
        row = i // 4
        col = i % 4
        x = int(concept.get('x', 15 + col * 22))
        y = int(concept.get('y', 15 + row * 25))

        nodes.append({
            "id": cid,
            "concept_id": cid,
            "label": concept.get('label', concept.get('name', cid.replace('-', ' ').title())),
            "x": x,
            "y": y,
            "state": state,
            "mastery": round(p_known, 4),
            "type": concept.get('type', 'general'),
            "level": concept.get('level', 'beginner')
        })

        prereqs = concept.get('prerequisites', [])
        if isinstance(prereqs, list):
            for prereq in prereqs:
                if prereq in mastery_map:
                    links.append({"source": prereq, "target": cid})

    return respond(200, {
        "learner_id": learner_id,
        "nodes": nodes,
        "links": links
    })


# ─── Amazon Nova Reel (Video Generation) ─────────────────────────────────
VIDEO_OUTPUT_BUCKET = "primelearn-content-cache"


def generate_video_storyboard(concept_name, user_prompt, concept_data=None):
    """
    Use LLM to generate a full educational video storyboard.
    Returns either a rich automated prompt (4000 chars) or manual scene descriptions.
    """
    concept_context = ""
    if concept_data:
        concept_context = (
            f"Concept: {concept_data.get('label', concept_name)}. "
            f"Type: {concept_data.get('type', 'general')}. "
            f"Level: {concept_data.get('level', 'beginner')}."
        )

    prompt = (
        f"You are a cinematic educational video script writer. "
        f"A student wants to learn about '{concept_name}'. {concept_context}\n"
        f"Their request: \"{user_prompt}\"\n\n"
        "Write a detailed, vivid video script for an AI video generator (Amazon Nova Reel). "
        "The video should be an educational explainer that covers the topic comprehensively.\n\n"
        "Structure it as a flowing narrative that describes visual scenes:\n"
        "- Opening: Hook scene that introduces the topic visually\n"
        "- Middle (2-3 scenes): Core concepts explained through animations, diagrams, visual metaphors\n"
        "- Closing: Summary scene that ties everything together\n\n"
        "Describe what the VIEWER SEES: camera movements, colors, animations, 3D objects, "
        "text overlays, transitions between scenes. Make it feel like a Kurzgesagt or 3Blue1Brown video.\n\n"
        "Write it as ONE continuous flowing description (not numbered scenes). "
        "Be extremely vivid and visual. Max 3500 characters.\n"
        "Return ONLY the script text, nothing else."
    )

    try:
        result, _ = call_llm(prompt, max_tokens=1200)
        if result:
            return result.strip().strip('"')[:3900]
    except Exception as e:
        print(f"Storyboard generation error: {e}")

    # Fallback
    return (
        f"An educational animated documentary about {concept_name}. "
        f"Opening: Camera zooms into a dark space where glowing particles form the title '{concept_name}'. "
        f"The particles rearrange into a 3D diagram. "
        f"Middle: Smooth animations show the core concepts with colorful visualizations, "
        f"flowing data streams, and expanding diagrams. Text overlays explain key points. "
        f"Each concept builds on the previous one with seamless transitions. "
        f"Closing: All elements come together in a final comprehensive view, "
        f"camera pulls back to show the complete picture. {user_prompt}"
    )[:3900]


def generate_narration_script(concept_name, user_prompt, concept_data=None):
    """Generate a voiceover narration script to accompany the video."""
    concept_context = ""
    if concept_data:
        concept_context = f"The concept is: {concept_data.get('label', concept_name)} ({concept_data.get('type', 'general')}, {concept_data.get('level', 'beginner')} level)."

    prompt = (
        f"Write a clear, engaging narration script for an educational video about '{concept_name}'. "
        f"{concept_context}\n"
        f"Student's request: \"{user_prompt}\"\n\n"
        "The narration should:\n"
        "- Be conversational and easy to follow\n"
        "- Explain the concept from basics to deeper understanding\n"
        "- Take about 30-45 seconds to read aloud\n"
        "- Use simple analogies where helpful\n\n"
        "Return ONLY the narration text. No stage directions or formatting. Max 2500 characters."
    )

    try:
        result, _ = call_llm(prompt, max_tokens=800)
        if result:
            return result.strip()[:2800]
    except Exception as e:
        print(f"Narration script generation error: {e}")
    return None


def handle_generate_video(event):
    """
    POST /video/generate
    Routes to Manim or Nova Reel based on body.type.
    Body: { "learner_id", "concept_id", "prompt", "duration?", "type?": "manim"|"nova_reel" }
    """
    body = get_body(event)
    video_type = body.get('type', 'nova_reel')

    if video_type == 'manim':
        return handle_generate_manim_video(body)
    else:
        return handle_generate_nova_reel_video(event, body)


def handle_generate_manim_video(body):
    """Generate a Manim animation video asynchronously."""
    learner_id = body.get('learner_id')
    concept_id = body.get('concept_id')
    user_prompt = body.get('prompt')

    if not all([learner_id, concept_id, user_prompt]):
        return respond(400, {"error": "learner_id, concept_id, and prompt are required"})

    # ── Check cache ──
    cache_key = get_manim_cache_key(concept_id, user_prompt)
    try:
        s3.head_object(Bucket=S3_CONTENT_BUCKET, Key=cache_key)
        # Cache hit — return presigned URL immediately
        video_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_CONTENT_BUCKET, 'Key': cache_key},
            ExpiresIn=3600
        )
        return respond(200, {
            "status": "Completed",
            "video_url": video_url,
            "cached": True,
            "concept_id": concept_id,
        })
    except Exception:
        pass  # Cache miss

    # ── Fetch concept metadata ──
    concept_data = {}
    try:
        kg_table = dynamodb.Table(KNOWLEDGE_GRAPH_TABLE)
        concept_resp = kg_table.get_item(Key={'concept_id': concept_id})
        concept_data = concept_resp.get('Item', {})
    except Exception:
        pass
    concept_name = concept_data.get('label', concept_id.replace('-', ' ').title())

    # ── Generate Manim code via LLM (5-15s) ──
    manim_code, error = generate_manim_code(concept_name, user_prompt, concept_data)
    if error or not manim_code:
        return respond(500, {
            "error": f"Failed to generate animation code: {error or 'Unknown error'}",
            "concept_id": concept_id,
        })

    # ── Create job and write initial status ──
    job_id = str(uuid.uuid4())
    try:
        s3.put_object(
            Bucket=S3_CONTENT_BUCKET,
            Key=f'manim-jobs/{job_id}/status.json',
            Body=json.dumps({
                'job_id': job_id,
                'status': 'InProgress',
                'concept_id': concept_id,
                'concept_name': concept_name,
                'created_at': datetime.utcnow().isoformat(),
                'cache_key': cache_key,
            }),
            ContentType='application/json'
        )
    except Exception as e:
        return respond(500, {"error": f"Failed to create job: {str(e)}"})

    # ── Invoke renderer Lambda asynchronously ──
    try:
        lambda_client.invoke(
            FunctionName=MANIM_RENDERER_FUNCTION,
            InvocationType='Event',  # Async fire-and-forget
            Payload=json.dumps({
                'job_id': job_id,
                'manim_code': manim_code,
                'concept_id': concept_id,
                'cache_key': cache_key,
            })
        )
    except Exception as e:
        s3.put_object(
            Bucket=S3_CONTENT_BUCKET,
            Key=f'manim-jobs/{job_id}/status.json',
            Body=json.dumps({'job_id': job_id, 'status': 'Failed', 'error': f'Invoke error: {str(e)}'}),
            ContentType='application/json'
        )
        return respond(500, {"error": f"Failed to start rendering: {str(e)}"})

    return respond(200, {
        "job_id": job_id,
        "status": "InProgress",
        "concept_id": concept_id,
        "concept_name": concept_name,
        "manim_code_preview": manim_code[:300] + "..." if len(manim_code) > 300 else manim_code,
        "type": "manim",
    })


def handle_generate_nova_reel_video(event, body):
    """
    Generate a full educational video using Nova Reel v1:1 (up to 2 min).
    Uses MULTI_SHOT_AUTOMATED for AI-directed scene composition.
    """
    learner_id = body.get('learner_id')
    concept_id = body.get('concept_id')
    user_prompt = body.get('prompt')
    requested_duration = int(body.get('duration', 24))

    if not all([learner_id, concept_id, user_prompt]):
        return respond(400, {"error": "learner_id, concept_id, and prompt are required"})

    # Clamp duration to valid range (must be multiple of 6, min 12 for multi-shot, max 120)
    duration = max(12, min(120, requested_duration))
    duration = (duration // 6) * 6  # Round down to multiple of 6

    # Fetch concept metadata
    concept_data = {}
    try:
        kg_table = dynamodb.Table(KNOWLEDGE_GRAPH_TABLE)
        concept_resp = kg_table.get_item(Key={'concept_id': concept_id})
        concept_data = concept_resp.get('Item', {})
    except Exception:
        pass
    concept_name = concept_data.get('label', concept_id.replace('-', ' ').title())

    # Generate AI storyboard (rich 4000-char prompt for automated multi-shot)
    video_script = generate_video_storyboard(concept_name, user_prompt, concept_data)

    # Generate narration script + Polly audio
    narration_text = generate_narration_script(concept_name, user_prompt, concept_data)
    narration_url = None
    if narration_text:
        narration_key = f"video-narrations/{concept_id}/{uuid.uuid4()}.mp3"
        try:
            # Get learner language
            learner_lang = 'en'
            if learner_id:
                state_table = dynamodb.Table(LEARNER_STATE_TABLE)
                lr = state_table.get_item(Key={'learner_id': learner_id}).get('Item', {})
                learner_lang = lr.get('language', 'en')

            voice_id = 'Aditi' if learner_lang == 'hi' else 'Kajal'
            polly_resp = polly.synthesize_speech(
                Text=narration_text[:2800],
                OutputFormat='mp3',
                VoiceId=voice_id,
                Engine='neural'
            )
            s3.put_object(
                Bucket=S3_CONTENT_BUCKET,
                Key=narration_key,
                Body=polly_resp['AudioStream'].read(),
                ContentType='audio/mpeg'
            )
            narration_url = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': S3_CONTENT_BUCKET, 'Key': narration_key},
                ExpiresIn=3600
            )
        except Exception as e:
            print(f"Narration generation error: {e}")

    job_id = str(uuid.uuid4())
    s3_output_uri = f"s3://{VIDEO_OUTPUT_BUCKET}/videos/{concept_id}/{job_id}/"

    try:
        response = bedrock_us_east.start_async_invoke(
            modelId="amazon.nova-reel-v1:1",
            modelInput={
                "taskType": "MULTI_SHOT_AUTOMATED",
                "multiShotAutomatedParams": {
                    "text": video_script
                },
                "videoGenerationConfig": {
                    "durationSeconds": duration,
                    "fps": 24,
                    "dimension": "1280x720"
                }
            },
            outputDataConfig={
                "s3OutputDataConfig": {
                    "s3Uri": s3_output_uri
                }
            }
        )

        invocation_arn = response.get('invocationArn', '')

        # Store narration URL in S3 metadata for retrieval on status check
        if narration_url:
            try:
                s3_us_east.put_object(
                    Bucket=VIDEO_OUTPUT_BUCKET,
                    Key=f"videos/{concept_id}/{job_id}/narration_url.txt",
                    Body=narration_url,
                    ContentType='text/plain'
                )
            except Exception:
                pass

        return respond(200, {
            "invocation_arn": invocation_arn,
            "status": "InProgress",
            "s3_output_uri": s3_output_uri,
            "concept_id": concept_id,
            "learner_id": learner_id,
            "video_script": video_script[:500] + "...",
            "narration_url": narration_url,
            "narration_text": narration_text,
            "duration_seconds": duration
        })
    except Exception as e:
        print(f"Nova Reel v1:1 start_async_invoke error: {e}")
        # Fallback to v1:0 single-shot 6s if v1:1 fails
        try:
            fallback_prompt = video_script[:512]
            response = bedrock_us_east.start_async_invoke(
                modelId="amazon.nova-reel-v1:0",
                modelInput={
                    "taskType": "TEXT_VIDEO",
                    "textToVideoParams": {"text": fallback_prompt},
                    "videoGenerationConfig": {
                        "durationSeconds": 6,
                        "fps": 24,
                        "dimension": "1280x720"
                    }
                },
                outputDataConfig={
                    "s3OutputDataConfig": {"s3Uri": s3_output_uri}
                }
            )
            return respond(200, {
                "invocation_arn": response.get('invocationArn', ''),
                "status": "InProgress",
                "s3_output_uri": s3_output_uri,
                "concept_id": concept_id,
                "learner_id": learner_id,
                "video_script": fallback_prompt,
                "narration_url": narration_url,
                "narration_text": narration_text,
                "duration_seconds": 6,
                "fallback": True
            })
        except Exception as e2:
            print(f"Nova Reel v1:0 fallback error: {e2}")
            return respond(500, {"error": "Failed to start video generation", "details": str(e)})


def handle_video_status(event):
    """
    GET /video/status?job_id=...        (Manim)
    GET /video/status?invocation_arn=... (Nova Reel)
    """
    query_params = event.get('queryStringParameters') or {}
    job_id = query_params.get('job_id')
    invocation_arn = query_params.get('invocation_arn')

    if job_id:
        return handle_manim_video_status(job_id)
    elif invocation_arn:
        return handle_nova_reel_video_status(invocation_arn)
    else:
        return respond(400, {"error": "Either job_id or invocation_arn query parameter is required"})


def handle_manim_video_status(job_id):
    """Check status of a Manim rendering job via S3."""
    try:
        response = s3.get_object(
            Bucket=S3_CONTENT_BUCKET,
            Key=f'manim-jobs/{job_id}/status.json'
        )
        status_data = json.loads(response['Body'].read().decode('utf-8'))
        result = {
            'status': status_data.get('status', 'Unknown'),
            'job_id': job_id,
            'type': 'manim',
        }

        if status_data.get('status') == 'Completed':
            video_key = status_data.get('video_key')
            if video_key:
                video_url = s3.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': S3_CONTENT_BUCKET, 'Key': video_key},
                    ExpiresIn=3600
                )
                result['video_url'] = video_url
        elif status_data.get('status') == 'Failed':
            result['failure_message'] = status_data.get('error', 'Unknown error')

        return respond(200, result)
    except s3.exceptions.NoSuchKey:
        return respond(404, {"error": f"Job {job_id} not found"})
    except Exception as e:
        return respond(500, {"error": f"Failed to check job status: {str(e)}"})


def handle_nova_reel_video_status(invocation_arn):
    """Check status of a Nova Reel video generation job."""
    try:
        response = bedrock_us_east.get_async_invoke(
            invocationArn=invocation_arn
        )

        status = response.get('status', 'Unknown')
        result = {"status": status}

        if status == "Completed":
            s3_uri = response.get('outputDataConfig', {}).get('s3OutputDataConfig', {}).get('s3Uri', '')
            if s3_uri:
                s3_parts = s3_uri.replace("s3://", "").split("/", 1)
                bucket = s3_parts[0]
                prefix = s3_parts[1] if len(s3_parts) > 1 else ""
                video_key = prefix.rstrip("/") + "/output.mp4"

                video_url = s3_us_east.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': bucket, 'Key': video_key},
                    ExpiresIn=3600
                )
                result["video_url"] = video_url
                result["s3_uri"] = s3_uri

        elif status == "Failed":
            failure_message = response.get('failureMessage', 'Unknown error')
            result["failure_message"] = failure_message

        return respond(200, result)
    except Exception as e:
        print(f"Nova Reel get_async_invoke error: {e}")
        return respond(500, {"error": "Failed to get video status", "details": str(e)})


# ═══════════════════════════════════════════════════════════
#  F5: SEASON FINALE — Adaptive Assessment Generator
# ═══════════════════════════════════════════════════════════

def handle_generate_season_finale(event):
    """POST /season-finale/generate — Generate a personalized season finale assessment."""
    body = get_body(event)
    learner_id = body.get('learner_id')
    season_concepts = body.get('concept_ids', [])  # list of concept_ids in the season

    if not learner_id or not season_concepts:
        return respond(400, {"error": "learner_id and concept_ids are required"})

    # Fetch learner mastery for all season concepts
    mastery_table = dynamodb.Table(LEARNER_MASTERY_TABLE)
    kg_table = dynamodb.Table(KNOWLEDGE_GRAPH_TABLE)
    concept_mastery = []
    for cid in season_concepts:
        try:
            m_resp = mastery_table.get_item(Key={'learner_id': learner_id, 'concept_id': cid})
            m = m_resp.get('Item', {})
            kg_resp = kg_table.get_item(Key={'concept_id': cid})
            kg = kg_resp.get('Item', {})
            concept_mastery.append({
                'concept_id': cid,
                'label': kg.get('label', cid.replace('-', ' ').title()),
                'type': kg.get('type', 'general'),
                'level': kg.get('level', 'beginner'),
                'p_known': float(m.get('p_known', 0.5)),
                'interactions': int(m.get('interactions_count', 0)),
            })
        except Exception:
            concept_mastery.append({
                'concept_id': cid, 'label': cid.replace('-', ' ').title(),
                'type': 'general', 'level': 'beginner', 'p_known': 0.5, 'interactions': 0,
            })

    # Sort by mastery — weakest concepts get more weight in assessment
    concept_mastery.sort(key=lambda x: x['p_known'])
    weak_concepts = [c for c in concept_mastery if c['p_known'] < 0.7][:3]
    strong_concepts = [c for c in concept_mastery if c['p_known'] >= 0.7][:2]

    # Determine assessment type based on dominant concept types
    types_count = {}
    for c in concept_mastery:
        t = c['type']
        types_count[t] = types_count.get(t, 0) + 1
    dominant_type = max(types_count, key=types_count.get) if types_count else 'general'

    assessment_type_map = {
        'implementation': 'BUILD_PROJECT',
        'hands-on': 'BUILD_PROJECT',
        'coding': 'BUILD_PROJECT',
        'architectural': 'DESIGN_CHALLENGE',
        'visual': 'DESIGN_CHALLENGE',
        'theoretical': 'EXPLAIN_CHALLENGE',
        'conceptual': 'EXPLAIN_CHALLENGE',
    }
    assessment_type = assessment_type_map.get(dominant_type, 'MIXED_CHALLENGE')

    # Fetch learner profile
    learner_table = dynamodb.Table(LEARNER_STATE_TABLE)
    try:
        learner_resp = learner_table.get_item(Key={'learner_id': learner_id})
        learner = learner_resp.get('Item', {})
    except Exception:
        learner = {}
    learner_name = learner.get('name', 'Learner')
    language = learner.get('language', 'en')

    # Build concept summary for LLM
    concept_summary = ""
    for c in concept_mastery:
        strength = "weak" if c['p_known'] < 0.5 else "moderate" if c['p_known'] < 0.7 else "strong"
        concept_summary += f"- {c['label']} ({c['type']}, {c['level']}): mastery={c['p_known']:.0%} ({strength})\n"

    weak_labels = [c['label'] for c in weak_concepts]
    strong_labels = [c['label'] for c in strong_concepts]

    prompt = f"""Generate a Season Finale assessment for a learner who completed these concepts:

{concept_summary}

Assessment type: {assessment_type}
Weakest areas (focus here): {', '.join(weak_labels) if weak_labels else 'None — all strong'}
Strongest areas: {', '.join(strong_labels) if strong_labels else 'None yet'}

Generate a JSON object with:
{{
  "title": "Assessment title",
  "description": "1-2 sentence description of what the learner will do",
  "type": "{assessment_type}",
  "time_limit_minutes": 20-45 depending on complexity,
  "questions": [
    {{
      "id": "q1",
      "type": "mcq" | "short_answer" | "code_challenge" | "explain" | "design",
      "concept_id": "which concept this tests",
      "difficulty": 0.3-0.9,
      "question": "The question text",
      "options": ["A", "B", "C", "D"] (only for mcq),
      "correct_answer": "The correct answer or expected key points",
      "points": 10-25,
      "rubric": "What makes a good answer (for AI evaluation)"
    }}
  ],
  "total_points": sum of all points
}}

Requirements:
- Generate 5-7 questions total
- At least 2 questions on WEAK concepts (harder, to verify real understanding)
- At least 1 question on STRONG concepts (easier, to confirm retention)
- Mix question types based on assessment_type
- For BUILD_PROJECT: include at least 1 code_challenge
- For DESIGN_CHALLENGE: include at least 1 design question
- For EXPLAIN_CHALLENGE: include at least 1 explain question
- Use Indian examples where relevant (UPI, Zomato, Flipkart, IRCTC)
{"- Respond in Hinglish (Hindi-English mix) for question text" if language == "hi" else ""}

Return ONLY valid JSON. No markdown, no explanation."""

    try:
        result_text, _model = call_llm(prompt, max_tokens=3000)
        assessment_data = safe_parse_json_object(result_text)
        if not assessment_data or 'questions' not in assessment_data:
            return respond(500, {"error": "Failed to generate valid assessment"})
    except Exception as e:
        return respond(500, {"error": f"Assessment generation failed: {str(e)}"})

    # Store in Assessments table
    assessment_id = str(uuid.uuid4())
    assessments_table = dynamodb.Table('Assessments')
    assessments_table.put_item(Item={
        'learner_id': learner_id,
        'assessment_id': assessment_id,
        'type': 'season_finale',
        'assessment_type': assessment_type,
        'title': assessment_data.get('title', 'Season Finale'),
        'description': assessment_data.get('description', ''),
        'questions': json.dumps(assessment_data['questions']),
        'total_points': Decimal(str(assessment_data.get('total_points', 100))),
        'time_limit_minutes': Decimal(str(assessment_data.get('time_limit_minutes', 30))),
        'season_concepts': season_concepts,
        'concept_mastery_snapshot': json.dumps(concept_mastery, default=str),
        'status': 'GENERATED',
        'created_at': datetime.utcnow().isoformat(),
    })

    return respond(200, {
        "assessment_id": assessment_id,
        "title": assessment_data.get('title'),
        "description": assessment_data.get('description'),
        "type": assessment_type,
        "time_limit_minutes": assessment_data.get('time_limit_minutes', 30),
        "total_points": assessment_data.get('total_points', 100),
        "questions": [{k: v for k, v in q.items() if k != 'correct_answer' and k != 'rubric'}
                      for q in assessment_data['questions']],
        "question_count": len(assessment_data['questions']),
    })


def handle_submit_season_finale(event):
    """POST /season-finale/submit — Submit answers and get AI evaluation."""
    body = get_body(event)
    learner_id = body.get('learner_id')
    assessment_id = body.get('assessment_id')
    answers = body.get('answers', {})  # {q_id: answer_text}

    if not learner_id or not assessment_id or not answers:
        return respond(400, {"error": "learner_id, assessment_id, and answers are required"})

    # Fetch the assessment
    assessments_table = dynamodb.Table('Assessments')
    try:
        resp = assessments_table.get_item(Key={'learner_id': learner_id, 'assessment_id': assessment_id})
        assessment = resp.get('Item')
        if not assessment:
            return respond(404, {"error": "Assessment not found"})
    except Exception as e:
        return respond(500, {"error": f"Failed to fetch assessment: {str(e)}"})

    questions = json.loads(assessment['questions'])

    # Build evaluation prompt
    qa_pairs = ""
    for q in questions:
        student_answer = answers.get(q['id'], answers.get(q.get('concept_id', ''), '(no answer)'))
        qa_pairs += f"""
Question ({q['type']}, {q['points']} pts, concept: {q.get('concept_id', 'general')}):
{q['question']}
Expected: {q['correct_answer']}
Rubric: {q.get('rubric', 'Accuracy and completeness')}
Student Answer: {student_answer}
---
"""

    eval_prompt = f"""Evaluate this Season Finale assessment submission.

{qa_pairs}

Return a JSON object:
{{
  "total_score": earned points out of {assessment.get('total_points', 100)},
  "percentage": score as percentage,
  "grade": "A" / "B" / "C" / "D" / "F",
  "passed": true if percentage >= 60,
  "question_results": [
    {{
      "id": "q1",
      "concept_id": "concept tested",
      "points_earned": number,
      "points_possible": number,
      "correct": true/false,
      "feedback": "1-2 sentence specific feedback"
    }}
  ],
  "strengths": ["1-2 things the learner did well"],
  "weaknesses": ["1-2 areas to improve"],
  "overall_feedback": "2-3 sentence personalized feedback",
  "recommended_review": ["concept_ids that need more work"]
}}

Be fair but thorough. Give partial credit for partially correct answers.
Return ONLY valid JSON."""

    try:
        eval_text, _model = call_llm(eval_prompt, max_tokens=2500)
        eval_data = safe_parse_json_object(eval_text)
        if not eval_data:
            return respond(500, {"error": "Failed to evaluate submission"})
    except Exception as e:
        return respond(500, {"error": f"Evaluation failed: {str(e)}"})

    # Update BKT for each concept based on results
    bkt_updates = []
    if 'question_results' in eval_data:
        concept_results = {}
        for qr in eval_data['question_results']:
            cid = qr.get('concept_id')
            if cid:
                if cid not in concept_results:
                    concept_results[cid] = []
                concept_results[cid].append(qr.get('correct', False))

        mastery_table = dynamodb.Table(LEARNER_MASTERY_TABLE)
        for cid, results in concept_results.items():
            try:
                m_resp = mastery_table.get_item(Key={'learner_id': learner_id, 'concept_id': cid})
                m = m_resp.get('Item', {})
                p_known = float(m.get('p_known', 0.5))
                p_slip = 0.1
                p_guess = 0.2
                p_transit = 0.3

                for correct in results:
                    if correct:
                        p_correct_given_known = 1 - p_slip
                        p_correct = p_correct_given_known * p_known + p_guess * (1 - p_known)
                        p_known_given = (p_correct_given_known * p_known) / max(p_correct, 0.001)
                    else:
                        p_incorrect_given_known = p_slip
                        p_incorrect = p_incorrect_given_known * p_known + (1 - p_guess) * (1 - p_known)
                        p_known_given = (p_incorrect_given_known * p_known) / max(p_incorrect, 0.001)
                    p_known = p_known_given + p_transit * (1 - p_known_given)

                new_status = 'mastered' if p_known >= 0.85 else 'learning'
                mastery_table.update_item(
                    Key={'learner_id': learner_id, 'concept_id': cid},
                    UpdateExpression="SET p_known = :pk, #s = :st, last_updated = :lu",
                    ExpressionAttributeNames={"#s": "status"},
                    ExpressionAttributeValues={
                        ':pk': Decimal(str(round(p_known, 4))),
                        ':st': new_status,
                        ':lu': datetime.utcnow().isoformat(),
                    }
                )
                bkt_updates.append({'concept_id': cid, 'p_known': round(p_known, 4), 'status': new_status})
            except Exception as e:
                print(f"BKT update failed for {cid}: {e}")

    # Assign Leitner review for weak concepts
    leitner_table = dynamodb.Table(LEITNER_BOX_TABLE)
    review_concepts = eval_data.get('recommended_review', [])
    for cid in review_concepts:
        try:
            leitner_table.put_item(Item={
                'learner_id': learner_id,
                'concept_id': cid,
                'box': Decimal('1'),
                'last_reviewed': datetime.utcnow().isoformat(),
                'next_review_date': datetime.utcnow().isoformat(),
                'was_correct': False,
            })
        except Exception:
            pass

    # Save results to Assessments table
    assessments_table.update_item(
        Key={'learner_id': learner_id, 'assessment_id': assessment_id},
        UpdateExpression="SET #s = :st, answers = :ans, evaluation = :ev, score = :sc, percentage = :pct, grade = :gr, passed = :pa, submitted_at = :sa, bkt_updates = :bkt",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ':st': 'EVALUATED',
            ':ans': json.dumps(answers),
            ':ev': json.dumps(eval_data, default=str),
            ':sc': Decimal(str(eval_data.get('total_score', 0))),
            ':pct': Decimal(str(eval_data.get('percentage', 0))),
            ':gr': eval_data.get('grade', 'F'),
            ':pa': eval_data.get('passed', False),
            ':sa': datetime.utcnow().isoformat(),
            ':bkt': json.dumps(bkt_updates, default=str),
        }
    )

    # Save as portfolio piece in S3
    portfolio_key = f"portfolio/{learner_id}/{assessment_id}.json"
    try:
        s3.put_object(
            Bucket=S3_CONTENT_BUCKET,
            Key=portfolio_key,
            Body=json.dumps({
                'assessment_id': assessment_id,
                'title': assessment.get('title', 'Season Finale'),
                'type': assessment.get('assessment_type', 'MIXED'),
                'score': eval_data.get('total_score', 0),
                'percentage': eval_data.get('percentage', 0),
                'grade': eval_data.get('grade', 'F'),
                'strengths': eval_data.get('strengths', []),
                'feedback': eval_data.get('overall_feedback', ''),
                'completed_at': datetime.utcnow().isoformat(),
            }, default=str),
            ContentType='application/json'
        )
    except Exception:
        pass

    return respond(200, {
        "assessment_id": assessment_id,
        "total_score": eval_data.get('total_score', 0),
        "total_points": float(assessment.get('total_points', 100)),
        "percentage": eval_data.get('percentage', 0),
        "grade": eval_data.get('grade', 'F'),
        "passed": eval_data.get('passed', False),
        "question_results": eval_data.get('question_results', []),
        "strengths": eval_data.get('strengths', []),
        "weaknesses": eval_data.get('weaknesses', []),
        "overall_feedback": eval_data.get('overall_feedback', ''),
        "recommended_review": review_concepts,
        "bkt_updates": bkt_updates,
        "portfolio_saved": True,
    })


def handle_get_season_finale(event):
    """GET /season-finale/{assessment_id}?learner_id=X — Fetch assessment details/results."""
    path = event.get('resource') or event.get('rawPath', '')
    assessment_id = event.get('pathParameters', {}).get('assessment_id', '')
    params = event.get('queryStringParameters') or {}
    learner_id = params.get('learner_id', '')

    if not learner_id or not assessment_id:
        return respond(400, {"error": "learner_id and assessment_id required"})

    assessments_table = dynamodb.Table('Assessments')
    try:
        resp = assessments_table.get_item(Key={'learner_id': learner_id, 'assessment_id': assessment_id})
        assessment = resp.get('Item')
        if not assessment:
            return respond(404, {"error": "Assessment not found"})
    except Exception as e:
        return respond(500, {"error": str(e)})

    result = {
        'assessment_id': assessment['assessment_id'],
        'title': assessment.get('title', ''),
        'description': assessment.get('description', ''),
        'type': assessment.get('assessment_type', ''),
        'status': assessment.get('status', ''),
        'created_at': assessment.get('created_at', ''),
        'time_limit_minutes': float(assessment.get('time_limit_minutes', 30)),
        'total_points': float(assessment.get('total_points', 100)),
    }

    if assessment.get('status') == 'EVALUATED':
        eval_data = json.loads(assessment.get('evaluation', '{}'))
        result.update({
            'score': float(assessment.get('score', 0)),
            'percentage': float(assessment.get('percentage', 0)),
            'grade': assessment.get('grade', ''),
            'passed': assessment.get('passed', False),
            'question_results': eval_data.get('question_results', []),
            'strengths': eval_data.get('strengths', []),
            'weaknesses': eval_data.get('weaknesses', []),
            'overall_feedback': eval_data.get('overall_feedback', ''),
            'submitted_at': assessment.get('submitted_at', ''),
        })
    else:
        questions = json.loads(assessment.get('questions', '[]'))
        result['questions'] = [{k: v for k, v in q.items() if k not in ('correct_answer', 'rubric')}
                               for q in questions]
        result['question_count'] = len(questions)

    return respond(200, result)


# ─── D3.js Visualization Generation ──────────────────────────────────────
def handle_generate_visualizations(event):
    """POST /visualizations/generate — AI generates D3.js visualization configs for any topic."""
    body = get_body(event)
    concept_name = body.get('concept_name', '')
    concept_id = body.get('concept_id', '')
    content_summary = body.get('content_summary', '')

    if not concept_name:
        return respond(400, {"error": "concept_name is required"})

    # Check S3 cache first
    cache_key = f"d3-viz-cache/{hashlib.md5((concept_id + concept_name).encode()).hexdigest()}.json"
    try:
        cached = s3.get_object(Bucket=S3_CONTENT_BUCKET, Key=cache_key)
        cached_data = json.loads(cached['Body'].read())
        return respond(200, cached_data)
    except Exception:
        pass

    system_prompt = """You are an expert data visualization designer. Generate D3.js visualization configs as structured JSON.
You MUST return ONLY a valid JSON object with key "visualizations" containing an array of 3-5 visualization objects.
Each visualization object must have: type, title, subtitle, description, data.

Supported types and their data schemas:

1. "force_graph" — for relationships, dependencies, concept maps
   data: { nodes: [{id, label, size?, color?, description?}], links: [{source, target, label?, weight?}] }

2. "tree" — for hierarchies, class inheritance, decision trees
   data: { root: { name, children: [{ name, children?: [], value? }] } }

3. "bar_chart" — for comparisons, complexity, performance metrics
   data: { title?, items: [{label, value, color?}], legend?: [] }
   OR grouped: { items: [{label, values: [num, num]}], legend: ["A","B"] }

4. "flow_diagram" — for algorithms, processes, data pipelines
   data: { direction: "vertical"|"horizontal", steps: [{label, description?, type?: "decision"}] }

5. "bubble_chart" — for relative sizes, importance, categories
   data: { title?, items: [{label, value, color?}] }

6. "timeline" — for history, sequence of events, evolution
   data: { events: [{label, date?, year?, color?}] }

7. "radial" — for distributions, categories, proportions
   data: { title?, items: [{label, value, color?}] }

8. "animated_steps" — for step-by-step algorithm execution
   data: { steps: [{ label, description, array?: [nums], highlights?: [indices], comparing?: [indices], swapping?: [indices], sorted?: [indices], pointers?: {name: index} }] }

9. "scatter_plot" — for correlations, distributions
   data: { title?, x_label?, y_label?, points: [{x, y, label?, size?, color?}] }

10. "heatmap" — for matrices, correlations, frequency tables
    data: { title?, rows: ["A","B"], columns: ["X","Y"], values: [[1,2],[3,4]] }

RULES:
- Generate 3-5 diverse visualizations that DIRECTLY explain the given concept
- Every visualization must be specifically about the topic, NOT generic CS diagrams
- Use real data and examples from the actual topic (e.g., for "HTML Basics" show HTML tags, not generic "API/DB/CSS" nodes)
- Node labels and chart items must use terms from the specific topic being taught
- For CS/DSA topics, include an "animated_steps" showing the algorithm executing with real data
- For CS topics, include a "bar_chart" comparing relevant metrics (time complexity, performance, etc.)
- For any topic with relationships between its own concepts, include a "force_graph"
- For any topic with hierarchy within itself, include a "tree"
- For any process/workflow within the topic, include a "flow_diagram"
- Keep node labels short (< 20 chars), descriptions clear
- Use 5-12 nodes for force graphs, 4-8 items for bar charts
- DO NOT generate generic placeholder visualizations — every chart must teach something specific about the topic
- Return ONLY valid JSON, no markdown fences, no explanation"""

    prompt = f"""Generate interactive D3.js visualizations specifically about: "{concept_name}"
{f'Episode content summary: {content_summary[:500]}' if content_summary else ''}
{f'Concept ID: {concept_id}' if concept_id else ''}

CRITICAL: Every visualization must be directly about "{concept_name}" using terms, concepts, and examples from this specific topic.
Do NOT use generic placeholder nodes like "API", "DB", "CSS" unless the topic is actually about those things.
Return 3-5 diverse visualizations that help a student understand the key aspects of "{concept_name}"."""

    try:
        result_text, _model = call_llm(prompt, system_prompt=system_prompt, max_tokens=4000)
        if result_text:
            parsed = safe_parse_json_object(result_text)
            if parsed and 'visualizations' in parsed:
                viz_list = parsed['visualizations']
                # Validate each visualization has required fields
                valid_viz = []
                for v in viz_list:
                    if v.get('type') and v.get('data'):
                        valid_viz.append({
                            'type': v['type'],
                            'title': v.get('title', ''),
                            'subtitle': v.get('subtitle', ''),
                            'description': v.get('description', ''),
                            'data': v['data'],
                        })
                if valid_viz:
                    response_data = {
                        "concept_name": concept_name,
                        "concept_id": concept_id,
                        "visualizations": valid_viz,
                        "count": len(valid_viz),
                        "generated_at": datetime.utcnow().isoformat(),
                    }
                    # Cache to S3
                    try:
                        s3.put_object(Bucket=S3_CONTENT_BUCKET, Key=cache_key,
                                      Body=json.dumps(response_data).encode('utf-8'),
                                      ContentType='application/json')
                    except Exception:
                        pass
                    return respond(200, response_data)
    except Exception as e:
        print(f"Visualization generation error: {e}")

    # Fallback: generate basic visualizations
    fallback_viz = [
        {
            "type": "flow_diagram",
            "title": f"Key Concepts in {concept_name}",
            "subtitle": "Learning flow",
            "description": f"A step-by-step breakdown of {concept_name}",
            "data": {
                "direction": "horizontal",
                "steps": [
                    {"label": "Prerequisites", "description": "Build foundation"},
                    {"label": concept_name, "description": "Core concept"},
                    {"label": "Practice", "description": "Apply knowledge"},
                    {"label": "Mastery", "description": "Deep understanding"},
                ]
            }
        },
        {
            "type": "radial",
            "title": f"{concept_name} — Key Components",
            "subtitle": "Relative importance",
            "description": f"The building blocks of {concept_name}",
            "data": {
                "title": concept_name,
                "items": [
                    {"label": "Theory", "value": 25},
                    {"label": "Practice", "value": 30},
                    {"label": "Application", "value": 25},
                    {"label": "Review", "value": 20},
                ]
            }
        }
    ]
    return respond(200, {
        "concept_name": concept_name,
        "concept_id": concept_id,
        "visualizations": fallback_viz,
        "count": len(fallback_viz),
        "fallback": True,
        "generated_at": datetime.utcnow().isoformat(),
    })


def handle_get_upload_url(event):
    """Return a presigned S3 URL for the frontend to upload a file directly."""
    qs = event.get('queryStringParameters') or {}
    file_name = qs.get('file_name', 'upload.pdf')
    import uuid as _uuid
    key = f"uploads/{_uuid.uuid4().hex}/{file_name}"
    url = s3.generate_presigned_url(
        'put_object',
        Params={'Bucket': S3_CONTENT_BUCKET, 'Key': key, 'ContentType': 'application/octet-stream'},
        ExpiresIn=300
    )
    return respond(200, {"upload_url": url, "s3_key": key})


def extract_text_from_s3_file(bucket, key):
    """Download a file from S3 and extract text. Supports PDF and PPTX."""
    import zlib, zipfile as _zipfile, xml.etree.ElementTree as ET
    obj = s3.get_object(Bucket=bucket, Key=key)
    raw = obj['Body'].read()
    key_lower = key.lower()

    # ── PPTX/DOCX (ZIP-based XML) ──
    if key_lower.endswith('.pptx') or key_lower.endswith('.docx') or key_lower.endswith('.ppt'):
        try:
            zf = _zipfile.ZipFile(io.BytesIO(raw))
            texts = []
            # PPTX slides
            slide_files = sorted([n for n in zf.namelist() if n.startswith('ppt/slides/slide') and n.endswith('.xml')])
            for sf in slide_files:
                xml_content = zf.read(sf).decode('utf-8', errors='ignore')
                # Extract all <a:t> text nodes
                for match in re.findall(r'<a:t>([^<]+)</a:t>', xml_content):
                    if match.strip():
                        texts.append(match.strip())
            # DOCX paragraphs
            if not texts:
                doc_files = [n for n in zf.namelist() if 'word/document' in n]
                for df in doc_files:
                    xml_content = zf.read(df).decode('utf-8', errors='ignore')
                    for match in re.findall(r'<w:t[^>]*>([^<]+)</w:t>', xml_content):
                        if match.strip():
                            texts.append(match.strip())
            zf.close()
            if texts:
                return ' '.join(texts)[:10000]
        except Exception as e:
            print(f"ZIP extraction failed: {e}")

    # ── PDF ──
    content = raw.decode('latin-1')
    texts = []

    # Method 1: BT...ET blocks with Tj/TJ
    bt_blocks = re.findall(r'BT(.*?)ET', content, re.DOTALL)
    for block in bt_blocks:
        tj_matches = re.findall(r'\(([^)]*)\)\s*Tj', block)
        texts.extend(tj_matches)
        tj_arrays = re.findall(r'\[(.*?)\]\s*TJ', block, re.DOTALL)
        for arr in tj_arrays:
            texts.extend(re.findall(r'\(([^)]*)\)', arr))

    # Method 2: Decompress FlateDecode streams
    stream_starts = [m.start() for m in re.finditer(r'stream\r?\n', content)]
    for start in stream_starts[:150]:
        actual_start = content.index('\n', start) + 1
        end = content.find('endstream', actual_start)
        if end == -1:
            continue
        try:
            decompressed = zlib.decompress(raw[actual_start:end]).decode('latin-1')
            for block in re.findall(r'BT(.*?)ET', decompressed, re.DOTALL):
                texts.extend(re.findall(r'\(([^)]*)\)\s*Tj', block))
                for arr in re.findall(r'\[(.*?)\]\s*TJ', block, re.DOTALL):
                    texts.extend(re.findall(r'\(([^)]*)\)', arr))
        except:
            pass

    # Clean
    cleaned = []
    for t in texts:
        t = t.replace('\\n', '\n').replace('\\r', ' ').replace('\\t', ' ')
        t = t.replace('\\(', '(').replace('\\)', ')').replace('\\\\', '\\').strip()
        if len(t) > 0 and re.search(r'[a-zA-Z]', t):
            cleaned.append(t)

    result = ' '.join(cleaned)
    if len(result) < 50:
        fallback = re.findall(r'\(([^)]{3,300})\)', content)
        result = ' '.join(t for t in fallback if re.search(r'[a-zA-Z]{2,}', t))

    return result[:10000]


def handle_generate_notes_from_upload(event):
    """Generate notes from an uploaded file on S3 or from raw text."""
    body = get_body(event)
    s3_key = body.get('s3_key', '').strip()
    text_content = body.get('text_content', '').strip()
    file_name = body.get('file_name', 'document')
    topic = body.get('topic', '')

    # If s3_key provided, extract text from the file on S3
    if s3_key and not text_content:
        try:
            text_content = extract_text_from_s3_file(S3_CONTENT_BUCKET, s3_key)
            print(f"Extracted {len(text_content)} chars from S3: {s3_key}")
        except Exception as e:
            print(f"S3 text extraction error: {e}")
            return respond(500, {"error": f"Failed to read uploaded file: {str(e)}"})

    if not text_content or len(text_content.strip()) < 10:
        return respond(400, {"error": "Could not extract text from the uploaded file. The file may be image-based (scanned). Please try a text-based PDF."})

    # Truncate to stay within LLM context and fit under API GW 29s timeout
    if len(text_content) > 8000:
        text_content = text_content[:8000] + "\n\n[... content truncated ...]"

    prompt = f"""You are a study notes generator. Below is text extracted from a student's uploaded document "{file_name}".

READ THE FOLLOWING TEXT CAREFULLY. Then produce well-organized study notes covering EVERY topic, definition, concept, formula, and example found in this text. Use ONLY information from this text. Do not add outside knowledge.

Format: HTML fragment using ONLY <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <code> tags. No markdown. No <!DOCTYPE>, <html>, <head>, <body> wrappers — just the content tags directly.

EXTRACTED TEXT FROM THE UPLOADED DOCUMENT:
\"\"\"
{text_content}
\"\"\"

Now generate detailed study notes from the above extracted text. Cover all sections and topics mentioned:"""

    try:
        notes_text, model_used = call_llm(prompt, system_prompt="You convert document text into organized study notes in HTML. Only use the provided text. Never invent content.", max_tokens=2500)
        if not notes_text:
            return respond(500, {"error": "Failed to generate notes"})
        # Strip any full HTML wrappers the LLM might add
        notes_text = re.sub(r'```html\s*', '', notes_text)
        notes_text = re.sub(r'```\s*$', '', notes_text)
        notes_text = re.sub(r'<!DOCTYPE[^>]*>', '', notes_text, flags=re.IGNORECASE)
        notes_text = re.sub(r'</?html[^>]*>', '', notes_text, flags=re.IGNORECASE)
        notes_text = re.sub(r'<head>.*?</head>', '', notes_text, flags=re.DOTALL|re.IGNORECASE)
        notes_text = re.sub(r'</?body[^>]*>', '', notes_text, flags=re.IGNORECASE)
        notes_text = notes_text.strip()

        return respond(200, {
            "success": True,
            "notes": notes_text,
            "source": file_name,
            "model": model_used,
            "extracted_chars": len(text_content)
        })
    except Exception as e:
        print(f"Notes generation error: {e}")
        return respond(500, {"error": f"Failed to generate notes: {str(e)}"})


def lambda_handler(event, context):
    http_method = event.get('httpMethod') or event.get('requestContext', {}).get('http', {}).get('method', '')
    if http_method == 'OPTIONS':
        return respond(200, {})

    try:
        path = event.get('resource') or event.get('rawPath', '')

        if http_method == 'GET' and '/episodes/' in path and not path.endswith('/progress'):
            return handle_get_episode(event)
        elif http_method == 'POST' and '/episodes/' in path and path.endswith('/progress'):
            return handle_post_progress(event)
        elif http_method == 'GET' and '/dashboard/' in path:
            return handle_get_dashboard(event)
        elif http_method == 'GET' and '/constellation' in path:
            return handle_get_constellation(event)
        elif http_method == 'POST' and '/video/generate' in path:
            return handle_generate_video(event)
        elif http_method == 'GET' and '/video/status' in path:
            return handle_video_status(event)
        elif http_method == 'POST' and '/season-finale/generate' in path:
            return handle_generate_season_finale(event)
        elif http_method == 'POST' and '/season-finale/submit' in path:
            return handle_submit_season_finale(event)
        elif http_method == 'GET' and '/season-finale/' in path:
            return handle_get_season_finale(event)
        elif http_method == 'POST' and '/visualizations/generate' in path:
            return handle_generate_visualizations(event)
        elif http_method == 'POST' and '/notes/generate' in path:
            return handle_generate_notes_from_upload(event)
        elif http_method == 'GET' and '/notes/upload-url' in path:
            return handle_get_upload_url(event)

        return respond(404, {"error": f"Route not found: {http_method} {path}"})
    except Exception as e:
        print(f"Error: {str(e)}")
        return respond(500, {"error": "Internal server error", "details": str(e)})

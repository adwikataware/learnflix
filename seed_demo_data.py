"""
PrimeLearn DynamoDB Demo Data Seeder
Populates all 6 DynamoDB tables with realistic demo data for the hackathon demo.
Indian-context curriculum: Python + DSA mapped to Indian tech placements.

Usage:
    pip install boto3
    python seed_demo_data.py

Ensure your AWS credentials are configured (aws configure) with access to ap-south-1.
"""

import boto3
import json
from decimal import Decimal
from datetime import datetime, timedelta
import uuid

REGION = 'ap-south-1'
dynamodb = boto3.resource('dynamodb', region_name=REGION)

# ---- Demo Learner ----
DEMO_LEARNER_ID = 'demo_learner_001'
DEMO_LEARNER_NAME = 'Soham'

# ---- Indian-Context Concept Definitions ----
# Mapped to SPPU/VTU style CS curriculum + placement prep for TCS/Infosys/Google
CONCEPTS = [
    # Season 1: Python Foundations (mapped to SPPU SE IT Sem 3)
    {
        'concept_id': 'python-basics',
        'label': 'Python Basics',
        'season': 1, 'order': 1,
        'prerequisites': [],
        'type': 'conceptual',
        'description': 'Introduction to Python — syntax, REPL, indentation. Used across Indian IT (TCS, Infosys, Wipro) as primary scripting language.',
    },
    {
        'concept_id': 'variables-types',
        'label': 'Variables & Data Types',
        'season': 1, 'order': 2,
        'prerequisites': ['python-basics'],
        'type': 'conceptual',
        'description': 'Integers, floats, strings, booleans, type casting. Foundation for GATE CS and placement MCQs.',
    },
    {
        'concept_id': 'control-flow',
        'label': 'Control Flow & Loops',
        'season': 1, 'order': 3,
        'prerequisites': ['variables-types'],
        'type': 'conceptual',
        'description': 'if/elif/else, for/while loops, break/continue. Pattern printing — a staple in Indian campus placements.',
    },
    {
        'concept_id': 'functions',
        'label': 'Functions & Modules',
        'season': 1, 'order': 4,
        'prerequisites': ['control-flow'],
        'type': 'applied',
        'requires_hands_on': True,
        'description': 'Defining functions, args, kwargs, lambda, modules. Used in UPI payment validation logic at PhonePe/Paytm.',
    },
    {
        'concept_id': 'data-structures',
        'label': 'Lists, Dicts & Sets',
        'season': 1, 'order': 5,
        'prerequisites': ['functions'],
        'type': 'applied',
        'requires_hands_on': True,
        'description': 'Python built-in data structures. Example: Zomato restaurant menu stored as dict, Swiggy order queue as list.',
    },
    {
        'concept_id': 'oop-basics',
        'label': 'OOP in Python',
        'season': 1, 'order': 6,
        'prerequisites': ['functions', 'data-structures'],
        'type': 'theoretical',
        'description': 'Classes, inheritance, polymorphism, encapsulation. Models real systems like IRCTC booking (Train, Passenger, Ticket classes).',
    },

    # Season 2: DSA for Placements (mapped to placement prep)
    {
        'concept_id': 'algorithms-intro',
        'label': 'Algorithm Analysis',
        'season': 2, 'order': 1,
        'prerequisites': ['data-structures'],
        'type': 'theoretical',
        'description': 'Big-O notation, time/space complexity. Critical for FAANG and Indian product company interviews (Flipkart, Meesho).',
    },
    {
        'concept_id': 'sorting',
        'label': 'Sorting Algorithms',
        'season': 2, 'order': 2,
        'prerequisites': ['algorithms-intro'],
        'type': 'applied',
        'requires_hands_on': True,
        'description': 'Bubble, Selection, Merge, Quick sort. Example: Sorting Flipkart search results by price/rating.',
    },
    {
        'concept_id': 'searching',
        'label': 'Searching Algorithms',
        'season': 2, 'order': 3,
        'prerequisites': ['algorithms-intro'],
        'type': 'applied',
        'requires_hands_on': True,
        'description': 'Linear search, binary search, hashing. Example: Aadhaar number lookup in UIDAI database.',
    },
    {
        'concept_id': 'recursion',
        'label': 'Recursion & Backtracking',
        'season': 2, 'order': 4,
        'prerequisites': ['functions', 'algorithms-intro'],
        'type': 'theoretical',
        'requires_hands_on': True,
        'description': 'Recursive thinking, call stack, backtracking. Example: Solving Sudoku, N-Queens — common in Google India interviews.',
    },
    {
        'concept_id': 'trees',
        'label': 'Trees & BST',
        'season': 2, 'order': 5,
        'prerequisites': ['recursion', 'oop-basics'],
        'type': 'applied',
        'requires_hands_on': True,
        'description': 'Binary trees, BST, traversals, height, balance. Example: File system hierarchy in Linux (used in Indian server infra).',
    },
    {
        'concept_id': 'graphs',
        'label': 'Graph Algorithms',
        'season': 2, 'order': 6,
        'prerequisites': ['trees'],
        'type': 'applied',
        'requires_hands_on': True,
        'description': 'BFS, DFS, shortest path, topological sort. Example: Indian Railways route optimization (IRCTC), Google Maps India navigation.',
    },
]

# ---- Mastery levels for demo ----
MASTERY_MAP = {
    'python-basics':    {'p_known': 0.95, 'status': 'mastered',    'interactions': 8},
    'variables-types':  {'p_known': 0.92, 'status': 'mastered',    'interactions': 6},
    'control-flow':     {'p_known': 0.88, 'status': 'mastered',    'interactions': 7},
    'functions':        {'p_known': 0.86, 'status': 'mastered',    'interactions': 5},
    'data-structures':  {'p_known': 0.72, 'status': 'in_progress', 'interactions': 4},
    'oop-basics':       {'p_known': 0.45, 'status': 'in_progress', 'interactions': 2},
    'algorithms-intro': {'p_known': 0.30, 'status': 'in_progress', 'interactions': 1},
    'sorting':          {'p_known': 0.10, 'status': 'locked',      'interactions': 0},
    'searching':        {'p_known': 0.10, 'status': 'locked',      'interactions': 0},
    'recursion':        {'p_known': 0.10, 'status': 'locked',      'interactions': 0},
    'trees':            {'p_known': 0.10, 'status': 'locked',      'interactions': 0},
    'graphs':           {'p_known': 0.10, 'status': 'locked',      'interactions': 0},
}


def seed_knowledge_graph():
    """Seed KnowledgeGraph table with Indian-context concept nodes."""
    table = dynamodb.Table('KnowledgeGraph')
    print("Seeding KnowledgeGraph...")

    for c in CONCEPTS:
        item = {
            'concept_id': c['concept_id'],
            'label': c['label'],
            'season': c['season'],
            'order': c['order'],
            'prerequisites': c['prerequisites'],
            'description': c['description'],
            'type': c.get('type', 'conceptual'),
        }
        if c.get('requires_hands_on'):
            item['requires_hands_on'] = True
        table.put_item(Item=item)
        print(f"  + {c['concept_id']} ({c['type']})")

    print(f"  Done: {len(CONCEPTS)} concepts seeded.\n")


def seed_learner_state():
    """Seed LearnerState table with demo learner profile."""
    table = dynamodb.Table('LearnerState')
    print("Seeding LearnerState...")

    table.put_item(Item={
        'learner_id': DEMO_LEARNER_ID,
        'name': DEMO_LEARNER_NAME,
        'language': 'en',
        'goal': 'Master Python and DSA for campus placements',
        'placement_track': 'product',  # service / product / startup
        'university': 'SPPU',
        'ability_score': Decimal('0.62'),
        'current_season': 1,
        'streak': 7,
        'total_hours': Decimal('12.5'),
        'can_code': True,
        'learning_style': {
            'visual': Decimal('0.3'),
            'hands_on': Decimal('0.5'),
            'theory': Decimal('0.1'),
            'example': Decimal('0.1'),
        },
        'created_at': (datetime.utcnow() - timedelta(days=14)).isoformat(),
    })
    print(f"  + {DEMO_LEARNER_ID} ({DEMO_LEARNER_NAME}) — SPPU, Product track")
    print("  Done.\n")


def seed_learner_mastery():
    """Seed LearnerMastery table with BKT mastery levels."""
    table = dynamodb.Table('LearnerMastery')
    print("Seeding LearnerMastery...")

    for concept_id, mastery in MASTERY_MAP.items():
        table.put_item(Item={
            'learner_id': DEMO_LEARNER_ID,
            'concept_id': concept_id,
            'p_known': Decimal(str(mastery['p_known'])),
            'status': mastery['status'],
            'interactions_count': mastery['interactions'],
            'last_correct': True,
        })
        print(f"  + {concept_id}: p_known={mastery['p_known']} ({mastery['status']})")

    print(f"  Done: {len(MASTERY_MAP)} mastery records seeded.\n")


def seed_leitner_box():
    """Seed LeitnerBox table with spaced repetition data."""
    table = dynamodb.Table('LeitnerBox')
    print("Seeding LeitnerBox...")

    now = datetime.utcnow()
    leitner_data = [
        {'concept_id': 'data-structures',  'box': 1, 'next_review': now.isoformat()},
        {'concept_id': 'oop-basics',       'box': 1, 'next_review': now.isoformat()},
        {'concept_id': 'algorithms-intro', 'box': 1, 'next_review': now.isoformat()},
        {'concept_id': 'control-flow',     'box': 2, 'next_review': (now + timedelta(days=3)).isoformat()},
        {'concept_id': 'functions',        'box': 2, 'next_review': (now + timedelta(days=3)).isoformat()},
        {'concept_id': 'python-basics',    'box': 3, 'next_review': (now + timedelta(days=7)).isoformat()},
        {'concept_id': 'variables-types',  'box': 3, 'next_review': (now + timedelta(days=7)).isoformat()},
    ]

    for item in leitner_data:
        table.put_item(Item={
            'learner_id': DEMO_LEARNER_ID,
            'concept_id': item['concept_id'],
            'box': item['box'],
            'next_review_date': item['next_review'],
            'last_reviewed': (now - timedelta(days=item['box'])).isoformat(),
        })
        print(f"  + {item['concept_id']}: box={item['box']}")

    print(f"  Done: {len(leitner_data)} Leitner items seeded.\n")


def seed_session_logs():
    """Seed SessionLogs with realistic recent activity."""
    table = dynamodb.Table('SessionLogs')
    print("Seeding SessionLogs...")

    now = datetime.utcnow()
    logs = [
        {'action': 'EPISODE_COMPLETE', 'concept_id': 'python-basics',    'days_ago': 12, 'completion_rate': 1.0, 'time_spent_seconds': 1800},
        {'action': 'EPISODE_COMPLETE', 'concept_id': 'variables-types',  'days_ago': 10, 'completion_rate': 1.0, 'time_spent_seconds': 1500},
        {'action': 'EPISODE_COMPLETE', 'concept_id': 'control-flow',     'days_ago': 8,  'completion_rate': 1.0, 'time_spent_seconds': 2100},
        {'action': 'MENTOR_HINT',      'concept_id': 'control-flow',     'days_ago': 8,  'hint_level': 1},
        {'action': 'EPISODE_COMPLETE', 'concept_id': 'functions',        'days_ago': 5,  'completion_rate': 0.95, 'time_spent_seconds': 2400},
        {'action': 'STRUGGLE_SIGNAL',  'concept_id': 'data-structures',  'days_ago': 3,  'struggle_score': 55.0, 'zone': 'productive_struggle'},
        {'action': 'EPISODE_PROGRESS', 'concept_id': 'data-structures',  'days_ago': 2,  'completion_rate': 0.6, 'time_spent_seconds': 1200},
        {'action': 'MENTOR_HINT',      'concept_id': 'data-structures',  'days_ago': 2,  'hint_level': 2},
        {'action': 'EPISODE_PROGRESS', 'concept_id': 'oop-basics',       'days_ago': 1,  'completion_rate': 0.3, 'time_spent_seconds': 900},
        {'action': 'STRUGGLE_SIGNAL',  'concept_id': 'oop-basics',       'days_ago': 1,  'struggle_score': 68.0, 'zone': 'struggling'},
        {'action': 'EPISODE_PROGRESS', 'concept_id': 'algorithms-intro', 'days_ago': 0,  'completion_rate': 0.15, 'time_spent_seconds': 600},
    ]

    for log in logs:
        ts = (now - timedelta(days=log['days_ago'], hours=2)).isoformat()
        item = {
            'learner_id': DEMO_LEARNER_ID,
            'timestamp': ts,
            'action': log['action'],
            'concept_id': log['concept_id'],
        }
        if 'completion_rate' in log:
            item['completion_rate'] = Decimal(str(log['completion_rate']))
        if 'time_spent_seconds' in log:
            item['time_spent_seconds'] = log['time_spent_seconds']
        if 'hint_level' in log:
            item['hint_level'] = log['hint_level']
        if 'struggle_score' in log:
            item['struggle_score'] = Decimal(str(log['struggle_score']))
            item['zone'] = log['zone']

        table.put_item(Item=item)
        print(f"  + [{log['action']}] {log['concept_id']} ({log['days_ago']}d ago)")

    print(f"  Done: {len(logs)} session logs seeded.\n")


def seed_assessments():
    """Seed Assessments table with the initial assessment result."""
    table = dynamodb.Table('Assessments')
    print("Seeding Assessments...")

    table.put_item(Item={
        'learner_id': DEMO_LEARNER_ID,
        'assessment_id': f"assess_{DEMO_LEARNER_ID}",
        'ability_score': Decimal('0.62'),
        'total_questions': 5,
        'correct_answers': 3,
        'timestamp': (datetime.utcnow() - timedelta(days=14)).isoformat(),
        'answers': [
            {'question_id': 'q0', 'difficulty': Decimal('0.3'), 'is_correct': True},
            {'question_id': 'q1', 'difficulty': Decimal('0.5'), 'is_correct': True},
            {'question_id': 'q2', 'difficulty': Decimal('0.6'), 'is_correct': False},
            {'question_id': 'q3', 'difficulty': Decimal('0.7'), 'is_correct': True},
            {'question_id': 'q4', 'difficulty': Decimal('0.8'), 'is_correct': False},
        ]
    })
    print(f"  + Assessment for {DEMO_LEARNER_ID}")
    print("  Done.\n")


def main():
    print("=" * 60)
    print("  PrimeLearn Demo Data Seeder")
    print("  Region:", REGION)
    print("  Demo Learner:", DEMO_LEARNER_ID)
    print("  Curriculum: Python + DSA (Indian placement context)")
    print("=" * 60)
    print()

    seed_knowledge_graph()
    seed_learner_state()
    seed_learner_mastery()
    seed_leitner_box()
    seed_session_logs()
    seed_assessments()

    print("=" * 60)
    print("  ALL DONE! Demo data seeded successfully.")
    print()
    print("  AWS Services used in this project:")
    print("    1. AWS Lambda (8 functions)")
    print("    2. Amazon DynamoDB (6 tables)")
    print("    3. Amazon Bedrock Runtime (Haiku + Sonnet)")
    print("    4. Amazon Bedrock Guardrails")
    print("    5. Amazon Bedrock Knowledge Bases (RAG)")
    print("    6. Amazon S3 (content cache + narrations)")
    print("    7. Amazon Polly (voice narration)")
    print("    8. Amazon Comprehend (language detection)")
    print("    9. Amazon API Gateway")
    print("   10. Amazon CloudWatch (logging)")
    print()
    print("  To use in frontend, set localStorage:")
    print(f'    localStorage.setItem("learner_id", "{DEMO_LEARNER_ID}")')
    print(f'    localStorage.setItem("learner_name", "{DEMO_LEARNER_NAME}")')
    print("=" * 60)


if __name__ == '__main__':
    main()

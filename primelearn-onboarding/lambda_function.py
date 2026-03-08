import json
import uuid
import re
import os
import boto3
from datetime import datetime
from decimal import Decimal
from boto3.dynamodb.conditions import Key

# AWS Clients
dynamodb = boto3.resource('dynamodb', region_name='ap-south-1')
bedrock = boto3.client('bedrock-runtime', region_name='ap-south-1')

# Constants
LEARNER_STATE_TABLE = "LearnerState"
ASSESSMENTS_TABLE = "Assessments"
KNOWLEDGE_GRAPH_TABLE = "KnowledgeGraph"
LEARNER_MASTERY_TABLE = "LearnerMastery"
PRIMARY_MODEL_ID = os.environ.get("HAIKU_MODEL_ID", "apac.amazon.nova-pro-v1:0")
FALLBACK_MODEL_ID = "apac.amazon.nova-pro-v1:0"


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

def safe_parse_json_array(text):
    """Safely extract and parse a JSON array from LLM response text."""
    cleaned = text.replace("```json", "").replace("```", "").strip()
    # Try direct parse first
    try:
        result = json.loads(cleaned)
        if isinstance(result, list):
            return result
        if isinstance(result, dict) and 'questions' in result:
            return result['questions']
    except json.JSONDecodeError:
        pass
    # Try regex extraction for array
    match = re.search(r'\[[\s\S]*\]', cleaned)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return None

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


def handle_register(event):
    body = get_body(event)
    name = body.get('name', 'Learner')
    email = body.get('email', '')
    language = body.get('language', 'en')

    learner_id = str(uuid.uuid4())
    table = dynamodb.Table(LEARNER_STATE_TABLE)
    table.put_item(Item={
        'learner_id': learner_id,
        'name': name,
        'email': email,
        'language': language,
        'ability_score': Decimal('0.0'),
        'streak': 0,
        'onboarding_complete': False,
        'created_at': datetime.utcnow().isoformat(),
        'last_active': datetime.utcnow().isoformat(),
        'goals': []
    })

    return respond(201, {"message": "User registered successfully", "learner_id": learner_id})


def handle_goal(event):
    body = get_body(event)
    learner_id = body.get('learner_id')
    goal = body.get('goal')

    if not learner_id or not goal:
        return respond(400, {"error": "learner_id and goal are required"})

    table = dynamodb.Table(LEARNER_STATE_TABLE)
    table.update_item(
        Key={'learner_id': learner_id},
        UpdateExpression="SET goals = list_append(if_not_exists(goals, :empty_list), :new_goal)",
        ExpressionAttributeValues={
            ':new_goal': [goal],
            ':empty_list': []
        }
    )

    return respond(200, {"message": "Goal updated successfully", "learner_id": learner_id})


def handle_get_assessment(event):
    learner_id = (event.get('queryStringParameters') or {}).get('learner_id')
    if not learner_id:
        return respond(400, {"error": "learner_id is required"})

    table = dynamodb.Table(LEARNER_STATE_TABLE)
    response = table.get_item(Key={'learner_id': learner_id})
    user_data = response.get('Item')
    if not user_data:
        return respond(404, {"error": "Learner not found"})

    goals = user_data.get('goals', [])
    goal_text = ', '.join(goals) if goals else 'General coding and computer science'

    prompt = (
        f"Generate exactly 6 multiple-choice assessment questions for a learner aiming to learn: {goal_text}. "
        "Vary the difficulty levels across these exactly: 0.2, 0.4, 0.5, 0.6, 0.8, 0.9. "
        "Return ONLY a JSON array (no wrapping object) of objects with these exact keys: "
        "'question' (string), 'options' (array of exactly 4 strings), "
        "'correct_option_index' (integer 0-3), 'difficulty' (float). "
        "Do not include any explanation, only the JSON array."
    )

    questions = None
    try:
        content = call_llm(prompt, max_tokens=1500)
        if content:
            questions = safe_parse_json_array(content)
    except Exception as e:
        print(f"Bedrock error: {e}")

    # Fallback questions if Bedrock fails
    if not questions:
        questions = [
            {"question": "What is Python primarily used for?", "options": ["Web browsing", "General-purpose programming", "Video editing", "Hardware design"], "correct_option_index": 1, "difficulty": 0.2},
            {"question": "What data structure uses FIFO ordering?", "options": ["Stack", "Queue", "Tree", "Graph"], "correct_option_index": 1, "difficulty": 0.4},
            {"question": "What does HTTP stand for?", "options": ["HyperText Transfer Protocol", "High Tech Transfer Protocol", "HyperText Transmission Process", "High Transfer Text Protocol"], "correct_option_index": 0, "difficulty": 0.5},
            {"question": "What is the time complexity of binary search?", "options": ["O(n)", "O(log n)", "O(n log n)", "O(1)"], "correct_option_index": 1, "difficulty": 0.6},
            {"question": "Which design pattern ensures only one instance of a class?", "options": ["Factory", "Observer", "Singleton", "Strategy"], "correct_option_index": 2, "difficulty": 0.8},
            {"question": "What is the CAP theorem about?", "options": ["CPU Architecture Performance", "Consistency, Availability, Partition tolerance trade-offs in distributed systems", "Cache Access Protocols", "Concurrent Access Patterns"], "correct_option_index": 1, "difficulty": 0.9},
        ]

    # Convert floats to Decimal for DynamoDB
    for q in questions:
        if 'difficulty' in q:
            q['difficulty'] = Decimal(str(q['difficulty']))

    assessment_id = str(uuid.uuid4())
    assessments_table = dynamodb.Table(ASSESSMENTS_TABLE)
    assessments_table.put_item(Item={
        'learner_id': learner_id,
        'assessment_id': assessment_id,
        'questions': questions,
        'created_at': datetime.utcnow().isoformat(),
        'status': 'PENDING'
    })

    # Frontend expects 'assessment' key with 'correct_option_index' field
    return respond(200, {
        "season_id": assessment_id,
        "assessment": questions
    })


def handle_assessment_answer(event):
    body = get_body(event)
    learner_id = body.get('learner_id')
    assessment_id = body.get('season_id') or body.get('assessment_id')
    answers = body.get('answers')  # list of {question_id, difficulty, is_correct}

    if not all([learner_id, answers]):
        return respond(400, {"error": "learner_id and answers are required"})

    # If assessment_id not provided, look up the latest pending assessment
    if not assessment_id:
        assessments_table = dynamodb.Table(ASSESSMENTS_TABLE)
        resp = assessments_table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('learner_id').eq(learner_id),
            ScanIndexForward=False,
            Limit=1
        )
        items = resp.get('Items', [])
        if items:
            assessment_id = items[0]['assessment_id']
        else:
            return respond(404, {"error": "No assessment found for this learner"})

    table = dynamodb.Table(ASSESSMENTS_TABLE)
    response = table.get_item(Key={'learner_id': learner_id, 'assessment_id': assessment_id})
    assessment = response.get('Item')

    if not assessment:
        return respond(404, {"error": "Assessment not found"})

    # Calculate ability score using IRT-inspired difficulty weighting
    # Frontend sends: [{question_id, difficulty, is_correct}, ...]
    total_weight = 0.0
    correct_weight = 0.0
    score = 0

    for ans in answers:
        diff = float(ans.get('difficulty', 0.5))
        total_weight += diff
        if ans.get('is_correct'):
            score += 1
            correct_weight += diff

    ability_score = correct_weight / total_weight if total_weight > 0 else 0.0

    # Update assessment status
    table.update_item(
        Key={'learner_id': learner_id, 'assessment_id': assessment_id},
        UpdateExpression="SET #s = :status, score = :score, ability_score = :ability",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ":status": "COMPLETED",
            ":score": score,
            ":ability": Decimal(str(round(ability_score, 4)))
        }
    )

    # Update LearnerState
    learner_table = dynamodb.Table(LEARNER_STATE_TABLE)
    learner_table.update_item(
        Key={'learner_id': learner_id},
        UpdateExpression="SET ability_score = :ability, onboarding_complete = :oc, last_active = :la",
        ExpressionAttributeValues={
            ":ability": Decimal(str(round(ability_score, 4))),
            ":oc": True,
            ":la": datetime.utcnow().isoformat()
        }
    )

    # ─── AI-Personalized Knowledge Graph based on learner's goal ────────
    learner_table_read = dynamodb.Table(LEARNER_STATE_TABLE)
    learner_data = learner_table_read.get_item(Key={'learner_id': learner_id}).get('Item', {})
    goals = learner_data.get('goals', [])
    goal_text = ', '.join(goals) if goals else 'General computer science'

    # Use AI to generate a personalized concept map
    kg_prompt = (
        f"Generate a personalized learning roadmap for a student who wants to learn: {goal_text}.\n"
        f"The student's assessed ability score is {ability_score:.2f} (0=beginner, 1=expert).\n\n"
        "Return ONLY a JSON object with key 'concepts' containing an array of 10-14 concept objects.\n"
        "Each concept must have:\n"
        "- 'concept_id': lowercase-hyphenated unique ID (e.g., 'neural-networks')\n"
        "- 'label': human-readable name (e.g., 'Neural Networks')\n"
        "- 'level': 'beginner' or 'intermediate' or 'advanced'\n"
        "- 'type': 'conceptual' or 'applied' or 'theoretical' or 'visual'\n"
        "- 'requires_hands_on': true or false\n"
        "- 'prerequisites': array of concept_ids this depends on (can be empty for foundational concepts)\n"
        "- 'x': number 10-90 (horizontal position for visualization)\n"
        "- 'y': number 10-90 (vertical position for visualization)\n\n"
        "Structure it as a proper DAG: ~4 beginner concepts with no prerequisites at top, "
        "~5 intermediate concepts depending on beginners, ~4 advanced concepts depending on intermediate. "
        "Make concepts SPECIFIC to the goal, not generic CS topics. "
        "Use Indian-relevant examples where applicable (UPI, Aadhaar, IRCTC, Flipkart, Zomato)."
    )

    generated_concepts = None
    try:
        kg_response = call_llm(kg_prompt, max_tokens=2000)
        if kg_response:
            parsed = safe_parse_json_object(kg_response)
            if parsed and 'concepts' in parsed:
                generated_concepts = parsed['concepts']
    except Exception as e:
        print(f"Knowledge graph generation error: {e}")

    # Fallback: generic concepts if AI fails
    if not generated_concepts:
        generated_concepts = [
            {"concept_id": "foundations", "label": f"Foundations of {goal_text}", "level": "beginner", "type": "conceptual", "requires_hands_on": False, "prerequisites": [], "x": 25, "y": 15},
            {"concept_id": "core-principles", "label": "Core Principles", "level": "beginner", "type": "conceptual", "requires_hands_on": False, "prerequisites": [], "x": 55, "y": 15},
            {"concept_id": "basic-tools", "label": "Tools & Setup", "level": "beginner", "type": "applied", "requires_hands_on": True, "prerequisites": [], "x": 80, "y": 15},
            {"concept_id": "hands-on-basics", "label": "Hands-On Basics", "level": "beginner", "type": "applied", "requires_hands_on": True, "prerequisites": ["foundations"], "x": 15, "y": 35},
            {"concept_id": "intermediate-theory", "label": "Intermediate Theory", "level": "intermediate", "type": "theoretical", "requires_hands_on": False, "prerequisites": ["core-principles"], "x": 40, "y": 40},
            {"concept_id": "applied-practice", "label": "Applied Practice", "level": "intermediate", "type": "applied", "requires_hands_on": True, "prerequisites": ["basic-tools", "hands-on-basics"], "x": 65, "y": 40},
            {"concept_id": "real-world-cases", "label": "Real-World Cases", "level": "intermediate", "type": "applied", "requires_hands_on": False, "prerequisites": ["intermediate-theory"], "x": 25, "y": 60},
            {"concept_id": "advanced-concepts", "label": "Advanced Concepts", "level": "advanced", "type": "theoretical", "requires_hands_on": False, "prerequisites": ["intermediate-theory", "applied-practice"], "x": 50, "y": 65},
            {"concept_id": "capstone-project", "label": "Capstone Project", "level": "advanced", "type": "applied", "requires_hands_on": True, "prerequisites": ["advanced-concepts", "real-world-cases"], "x": 75, "y": 80},
            {"concept_id": "mastery-assessment", "label": "Mastery Assessment", "level": "advanced", "type": "theoretical", "requires_hands_on": False, "prerequisites": ["capstone-project"], "x": 50, "y": 90},
        ]

    # Store concepts in KnowledgeGraph table
    kg_table = dynamodb.Table(KNOWLEDGE_GRAPH_TABLE)
    mastery_table = dynamodb.Table(LEARNER_MASTERY_TABLE)
    unlocked_concepts = []
    now = datetime.utcnow().isoformat()

    for concept in generated_concepts:
        cid = concept['concept_id']
        level = concept.get('level', 'beginner')

        # Write to KnowledgeGraph (upsert - won't overwrite if exists)
        try:
            kg_table.put_item(
                Item={
                    'concept_id': cid,
                    'label': concept.get('label', cid),
                    'level': level,
                    'type': concept.get('type', 'conceptual'),
                    'requires_hands_on': concept.get('requires_hands_on', False),
                    'prerequisites': concept.get('prerequisites', []),
                    'depth': level,
                    'x': int(concept.get('x', 50)),
                    'y': int(concept.get('y', 50)),
                    'goal_origin': goal_text,
                    'created_at': now
                },
                ConditionExpression='attribute_not_exists(concept_id)'
            )
        except Exception:
            pass  # Already exists, skip

        # Determine initial mastery based on ability score + concept level
        should_unlock = False
        initial_p = Decimal('0.1')

        if ability_score >= 0.7:
            should_unlock = True
            initial_p = Decimal('0.6') if level == 'beginner' else (Decimal('0.3') if level == 'intermediate' else Decimal('0.15'))
        elif ability_score >= 0.4:
            if level in ['beginner', 'intermediate']:
                should_unlock = True
                initial_p = Decimal('0.5') if level == 'beginner' else Decimal('0.2')
        else:
            if level == 'beginner':
                should_unlock = True
                initial_p = Decimal('0.3')

        if should_unlock:
            unlocked_concepts.append(cid)

        # Always create mastery entry (locked or unlocked)
        mastery_table.put_item(Item={
            'learner_id': learner_id,
            'concept_id': cid,
            'p_known': initial_p if should_unlock else Decimal('0'),
            'status': 'unlocked' if should_unlock else 'locked',
            'updated_at': now
        })

    return respond(200, {
        "message": "Assessment graded",
        "score": score,
        "total": len(answers),
        "ability_score": round(ability_score, 4),
        "unlocked_concepts": unlocked_concepts,
        "concepts_generated": len(generated_concepts)
    })


# ═══════════════════════════════════════════════════════════
#  F7: SYLLABUS MAPPER — Map university syllabus to PrimeLearn
# ═══════════════════════════════════════════════════════════

SUPPORTED_UNIVERSITIES = {
    'sppu': 'Savitribai Phule Pune University',
    'vtu': 'Visvesvaraya Technological University',
    'anna': 'Anna University',
    'jntu': 'JNTU Hyderabad',
    'mumbai': 'University of Mumbai',
    'makaut': 'MAKAUT West Bengal',
    'aktu': 'Dr. APJ Abdul Kalam Technical University',
    'rgpv': 'RGPV Bhopal',
    'generic': 'Generic Indian Engineering Syllabus',
}

def handle_syllabus_mapper(event):
    """POST /onboarding/syllabus-map — Map university syllabus to PrimeLearn concepts."""
    body = get_body(event)
    learner_id = body.get('learner_id')
    university = body.get('university', 'generic').lower()
    semester = body.get('semester', '')
    branch = body.get('branch', 'CSE')

    if not learner_id:
        return respond(400, {"error": "learner_id required"})

    uni_name = SUPPORTED_UNIVERSITIES.get(university, SUPPORTED_UNIVERSITIES['generic'])

    # Fetch existing PrimeLearn concepts
    kg_table = dynamodb.Table(KNOWLEDGE_GRAPH_TABLE)
    kg_resp = kg_table.scan()
    existing_concepts = kg_resp.get('Items', [])
    concept_list = [f"- {c['concept_id']}: {c.get('label', '')} ({c.get('level', '')})" for c in existing_concepts]

    prompt = f"""You are mapping a university syllabus to an adaptive learning platform.

University: {uni_name}
Branch: {branch}
Semester: {semester if semester else 'All semesters'}

Existing PrimeLearn concepts:
{chr(10).join(concept_list[:60])}

Tasks:
1. List the key topics from this university's {branch} syllabus (semester {semester if semester else 'all'})
2. Map each syllabus topic to the closest existing PrimeLearn concept_id
3. Identify gaps — syllabus topics that have NO matching PrimeLearn concept
4. Suggest a learning path (ordered list of concept_ids)

Return JSON:
{{
  "university": "{uni_name}",
  "branch": "{branch}",
  "semester": "{semester}",
  "syllabus_topics": [
    {{"topic": "Data Structures", "mapped_concept_id": "data-structures", "match_quality": "exact|partial|none"}}
  ],
  "gaps": ["topics with no PrimeLearn match"],
  "learning_path": ["concept_id1", "concept_id2", ...],
  "coverage_percentage": 0-100,
  "recommendations": ["suggestions to fill gaps"]
}}

Return ONLY valid JSON."""

    try:
        result_text = call_llm(prompt, max_tokens=2500)
        mapping = safe_parse_json_object(result_text)
        if not mapping:
            return respond(500, {"error": "Failed to generate syllabus mapping"})
    except Exception as e:
        return respond(500, {"error": f"Syllabus mapping failed: {str(e)}"})

    # Save mapping to learner profile
    state_table = dynamodb.Table(LEARNER_STATE_TABLE)
    try:
        state_table.update_item(
            Key={'learner_id': learner_id},
            UpdateExpression="SET university = :uni, branch = :br, semester = :sem, syllabus_mapping = :sm",
            ExpressionAttributeValues={
                ':uni': uni_name,
                ':br': branch,
                ':sem': semester,
                ':sm': json.dumps(mapping, default=str),
            }
        )
    except Exception:
        pass

    return respond(200, {
        "learner_id": learner_id,
        "university": mapping.get('university', uni_name),
        "branch": branch,
        "semester": semester,
        "syllabus_topics": mapping.get('syllabus_topics', []),
        "gaps": mapping.get('gaps', []),
        "learning_path": mapping.get('learning_path', []),
        "coverage_percentage": mapping.get('coverage_percentage', 0),
        "recommendations": mapping.get('recommendations', []),
        "supported_universities": list(SUPPORTED_UNIVERSITIES.values()),
    })


# ═══════════════════════════════════════════════════════════
#  F7: PLACEMENT PATH — Career-aligned learning path
# ═══════════════════════════════════════════════════════════

def handle_placement_path(event):
    """POST /onboarding/placement-path — Generate career-aligned learning path."""
    body = get_body(event)
    learner_id = body.get('learner_id')
    career_goal = body.get('career_goal', 'product_company')

    if not learner_id:
        return respond(400, {"error": "learner_id required"})

    career_profiles = {
        'service_company': {'label': 'Service Company (TCS, Infosys, Wipro)', 'focus': 'Aptitude, DSA basics, SQL, Java/Python fundamentals, verbal'},
        'product_company': {'label': 'Product Company (Google, Amazon, Microsoft)', 'focus': 'Advanced DSA, System Design, OS, DBMS, competitive programming'},
        'startup': {'label': 'Startup', 'focus': 'Full-stack dev, Move fast, React/Node, cloud basics, API design'},
        'data_science': {'label': 'Data Science / ML', 'focus': 'Python, Statistics, ML algorithms, Deep Learning, SQL, data preprocessing'},
        'devops': {'label': 'DevOps / Cloud', 'focus': 'Linux, Docker, CI/CD, AWS, networking, scripting'},
    }
    profile = career_profiles.get(career_goal, career_profiles['product_company'])

    # Fetch mastery
    mastery_table = dynamodb.Table(LEARNER_MASTERY_TABLE)
    mastery_resp = mastery_table.query(KeyConditionExpression=Key('learner_id').eq(learner_id))
    mastery_items = mastery_resp.get('Items', [])
    mastery_summary = ", ".join([f"{m['concept_id']}:{float(m.get('p_known',0)):.0%}" for m in mastery_items[:20]])

    prompt = f"""Generate a placement-aligned learning path for an Indian engineering student.

Career goal: {profile['label']}
Focus areas: {profile['focus']}
Current mastery: {mastery_summary if mastery_summary else 'New learner, no mastery data'}

Return JSON:
{{
  "career_goal": "{career_goal}",
  "readiness_score": 0-100,
  "phases": [
    {{
      "phase": 1,
      "title": "Foundation",
      "weeks": 2-4,
      "concepts": ["concept_id1", "concept_id2"],
      "description": "What to focus on"
    }}
  ],
  "immediate_actions": ["Top 3 things to do this week"],
  "strengths": ["What's already strong"],
  "critical_gaps": ["What must be filled before placement"]
}}

Return ONLY valid JSON."""

    try:
        result_text = call_llm(prompt, max_tokens=2000)
        path_data = safe_parse_json_object(result_text)
        if not path_data:
            return respond(500, {"error": "Failed to generate placement path"})
    except Exception as e:
        return respond(500, {"error": f"Placement path generation failed: {str(e)}"})

    return respond(200, {
        "learner_id": learner_id,
        "career_goal": career_goal,
        "career_profile": profile,
        "readiness_score": path_data.get('readiness_score', 0),
        "phases": path_data.get('phases', []),
        "immediate_actions": path_data.get('immediate_actions', []),
        "strengths": path_data.get('strengths', []),
        "critical_gaps": path_data.get('critical_gaps', []),
    })


def lambda_handler(event, context):
    # Handle CORS preflight
    http_method = event.get('httpMethod') or event.get('requestContext', {}).get('http', {}).get('method', '')
    if http_method == 'OPTIONS':
        return respond(200, {})

    try:
        path = event.get('resource') or event.get('rawPath', '')

        if http_method == 'POST' and path.endswith('/auth/register'):
            return handle_register(event)
        elif http_method == 'POST' and path.endswith('/onboarding/goal'):
            return handle_goal(event)
        elif http_method == 'GET' and '/onboarding/assessment' in path and not path.endswith('/answer'):
            return handle_get_assessment(event)
        elif http_method == 'POST' and path.endswith('/onboarding/assessment/answer'):
            return handle_assessment_answer(event)
        elif http_method == 'POST' and path.endswith('/onboarding/syllabus-map'):
            return handle_syllabus_mapper(event)
        elif http_method == 'POST' and path.endswith('/onboarding/placement-path'):
            return handle_placement_path(event)

        return respond(404, {"error": f"Route not found: {http_method} {path}"})
    except Exception as e:
        print(f"Error: {str(e)}")
        return respond(500, {"error": "Internal server error", "details": str(e)})

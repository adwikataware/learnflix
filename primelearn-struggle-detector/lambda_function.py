import json
import boto3
from datetime import datetime
from decimal import Decimal

dynamodb = boto3.resource('dynamodb', region_name='ap-south-1')
lambda_client = boto3.client('lambda', region_name='ap-south-1')
SESSION_LOGS_TABLE = "SessionLogs"
MENTOR_FUNCTION = "primelearn-mentor"

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


def handle_struggle_signal(event):
    body = get_body(event)
    learner_id = body.get('learner_id')
    concept_id = body.get('concept_id')

    if not learner_id or not concept_id:
        return respond(400, {"error": "learner_id and concept_id are required"})

    error_rate = float(body.get('error_rate', 0.0))
    idle_time_seconds = int(body.get('idle_time_seconds', 0))
    undo_count = int(body.get('undo_count', 0))
    gate_failures = int(body.get('gate_failures', 0))

    # ZPD Struggle Score (per PRD F3)
    error_score = min(error_rate * 40.0, 40.0)
    idle_score = min((idle_time_seconds / 300.0) * 25.0, 25.0)
    undo_score = min((undo_count / 10.0) * 20.0, 20.0)
    gate_score = min(gate_failures * 5.0, 15.0)

    struggle_score = round(error_score + idle_score + undo_score + gate_score, 2)

    # ZPD zone classification
    if struggle_score < 20:
        zone = "too_easy"
        recommendation = "Content is too easy. Consider skipping ahead."
    elif struggle_score <= 40:
        zone = "comfortable"
        recommendation = "Learner is comfortable. Maintain pace."
    elif struggle_score <= 60:
        zone = "productive_struggle"
        recommendation = "Optimal learning zone."
    elif struggle_score <= 75:
        zone = "struggling"
        recommendation = "Trigger L1-L2 Socratic hints."
    elif struggle_score <= 90:
        zone = "frustrated"
        recommendation = "Trigger L3 hints and simplify."
    else:
        zone = "giving_up"
        recommendation = "Trigger L4 direct help or Bridge Sprint."

    logs_table = dynamodb.Table(SESSION_LOGS_TABLE)
    logs_table.put_item(Item={
        'learner_id': learner_id,
        'timestamp': datetime.utcnow().isoformat(),
        'action': 'STRUGGLE_SIGNAL',
        'concept_id': concept_id,
        'struggle_score': Decimal(str(struggle_score)),
        'zone': zone,
        'error_rate': Decimal(str(error_rate)),
        'idle_time_seconds': idle_time_seconds,
        'undo_count': undo_count,
        'gate_failures': gate_failures
    })

    hint_level_map = {
        "too_easy": 0, "comfortable": 0, "productive_struggle": 0,
        "struggling": 1, "frustrated": 3, "giving_up": 4
    }

    trigger_mentor = zone in ("struggling", "frustrated", "giving_up")
    suggested_hint_level = hint_level_map.get(zone, 0)

    # Auto-invoke mentor if learner is struggling
    auto_hint = None
    if trigger_mentor:
        try:
            mentor_payload = {
                'httpMethod': 'POST',
                'resource': '/mentor/hint',
                'body': json.dumps({
                    'learner_id': learner_id,
                    'concept_id': concept_id,
                    'hint_level': suggested_hint_level,
                    'question': body.get('current_question', ''),
                    'learner_code': body.get('learner_code', ''),
                    'auto_triggered': True,
                    'struggle_score': struggle_score,
                    'zone': zone,
                })
            }
            mentor_resp = lambda_client.invoke(
                FunctionName=MENTOR_FUNCTION,
                InvocationType='RequestResponse',
                Payload=json.dumps(mentor_payload)
            )
            mentor_result = json.loads(mentor_resp['Payload'].read())
            if mentor_result.get('statusCode') == 200:
                mentor_body = json.loads(mentor_result.get('body', '{}'))
                auto_hint = {
                    'hint_level': suggested_hint_level,
                    'message': mentor_body.get('hint', mentor_body.get('message', '')),
                    'teaching_style': mentor_body.get('teaching_style', ''),
                }
        except Exception as e:
            print(f"Auto-mentor invocation failed: {e}")

    # Check if Bridge Sprint should be suggested (giving_up zone)
    suggest_bridge_sprint = zone == "giving_up"

    return respond(200, {
        "learner_id": learner_id,
        "concept_id": concept_id,
        "struggle_score": struggle_score,
        "zone": zone,
        "recommendation": recommendation,
        "trigger_mentor": trigger_mentor,
        "suggested_hint_level": suggested_hint_level,
        "auto_hint": auto_hint,
        "suggest_bridge_sprint": suggest_bridge_sprint,
    })


def lambda_handler(event, context):
    http_method = event.get('httpMethod') or event.get('requestContext', {}).get('http', {}).get('method', '')
    if http_method == 'OPTIONS':
        return respond(200, {})
    try:
        path = event.get('resource') or event.get('rawPath', '')
        if http_method == 'POST' and path.endswith('/struggle/signal'):
            return handle_struggle_signal(event)
        return respond(404, {"error": f"Route not found: {http_method} {path}"})
    except Exception as e:
        print(f"Error: {str(e)}")
        return respond(500, {"error": "Internal server error", "details": str(e)})

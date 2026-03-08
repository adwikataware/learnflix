import json
import boto3
from datetime import datetime, timedelta
from decimal import Decimal
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb', region_name='ap-south-1')
LEITNER_BOX_TABLE = "LeitnerBox"

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
}

# Leitner intervals (per PRD F6)
LEITNER_INTERVALS = {
    1: 1,    # Box 1: review in 1 day
    2: 3,    # Box 2: review in 3 days
    3: 7,    # Box 3: review in 7 days
    4: 14,   # Box 4: review in 14 days
    5: 30,   # Box 5: review in 30 days
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


def handle_get_due(event):
    learner_id = (event.get('queryStringParameters') or {}).get('learner_id')

    if not learner_id:
        return respond(400, {"error": "learner_id is required"})

    table = dynamodb.Table(LEITNER_BOX_TABLE)
    now_str = datetime.utcnow().isoformat()

    try:
        response = table.query(KeyConditionExpression=Key('learner_id').eq(learner_id))
        items = response.get('Items', [])

        due_concepts = []
        upcoming_concepts = []

        for item in items:
            review_date = item.get('next_review_date', '')
            if review_date and review_date <= now_str:
                due_concepts.append(item)
            else:
                upcoming_concepts.append(item)

        # Sort due by review date (most overdue first)
        due_concepts.sort(key=lambda x: x.get('next_review_date', ''))

        # Count by box for dashboard
        box_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for item in items:
            box = int(item.get('box_number', 1))
            box_counts[box] = box_counts.get(box, 0) + 1

        return respond(200, {
            "learner_id": learner_id,
            "due": due_concepts,
            "due_count": len(due_concepts),
            "total_concepts": len(items),
            "box_counts": box_counts,
            "upcoming_count": len(upcoming_concepts)
        })

    except Exception as e:
        return respond(500, {"error": "Failed to query due concepts", "details": str(e)})


def handle_post_due(event):
    body = get_body(event)
    learner_id = body.get('learner_id')
    concept_id = body.get('concept_id')
    correct = body.get('correct')

    if learner_id is None or concept_id is None or correct is None:
        return respond(400, {"error": "learner_id, concept_id, and correct are required"})

    # Ensure correct is boolean
    correct = bool(correct)

    table = dynamodb.Table(LEITNER_BOX_TABLE)
    response = table.get_item(Key={'learner_id': learner_id, 'concept_id': concept_id})
    item = response.get('Item', {})

    current_box = int(item.get('box_number', 1))

    # Leitner rules: correct → promote, incorrect → demote to box 1
    if correct:
        new_box = min(5, current_box + 1)
    else:
        new_box = 1

    now_dt = datetime.utcnow()
    days_to_add = LEITNER_INTERVALS.get(new_box, 1)
    next_review_dt = now_dt + timedelta(days=days_to_add)

    table.put_item(Item={
        'learner_id': learner_id,
        'concept_id': concept_id,
        'box_number': new_box,
        'next_review_date': next_review_dt.isoformat(),
        'last_reviewed': now_dt.isoformat(),
        'was_correct': correct
    })

    return respond(200, {
        "learner_id": learner_id,
        "concept_id": concept_id,
        "previous_box": current_box,
        "new_box": new_box,
        "next_review_date": next_review_dt.isoformat(),
        "last_reviewed": now_dt.isoformat()
    })


def lambda_handler(event, context):
    http_method = event.get('httpMethod') or event.get('requestContext', {}).get('http', {}).get('method', '')
    if http_method == 'OPTIONS':
        return respond(200, {})
    try:
        path = event.get('resource') or event.get('rawPath', '')
        if http_method == 'GET' and path.endswith('/leitner/due'):
            return handle_get_due(event)
        elif http_method == 'POST' and path.endswith('/leitner/review'):
            return handle_post_due(event)
        return respond(404, {"error": f"Route not found: {http_method} {path}"})
    except Exception as e:
        print(f"Error: {str(e)}")
        return respond(500, {"error": "Internal server error", "details": str(e)})

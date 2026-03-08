import json
import boto3
from decimal import Decimal

dynamodb = boto3.resource('dynamodb', region_name='ap-south-1')
LEARNER_MASTERY_TABLE = "LearnerMastery"

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
}

# Default BKT parameters (per PRD Section 6)
# Production: these should be per-concept from a metadata table
DEFAULT_BKT_PARAMS = {
    'p_init': 0.1,    # Prior: probability learner already knows it
    'p_transit': 0.3,  # Probability of learning from one interaction
    'p_slip': 0.1,     # Probability of error despite mastery
    'p_guess': 0.2,    # Probability of correct answer without mastery
}

MASTERY_THRESHOLD = 0.85

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


def handle_bkt_update(event):
    """
    Bayesian Knowledge Tracing update (Corbett & Anderson, 1995).
    Updates P(learned) based on whether the learner answered correctly.
    """
    body = get_body(event)
    learner_id = body.get('learner_id')
    concept_id = body.get('concept_id')
    is_correct = body.get('is_correct')

    if learner_id is None or concept_id is None or is_correct is None:
        return respond(400, {"error": "learner_id, concept_id, and is_correct are required"})

    table = dynamodb.Table(LEARNER_MASTERY_TABLE)
    response = table.get_item(Key={'learner_id': learner_id, 'concept_id': concept_id})
    item = response.get('Item', {})

    # Get current mastery or initialize
    p_known = float(item.get('p_known', DEFAULT_BKT_PARAMS['p_init']))
    interactions = int(item.get('interactions_count', 0))

    # BKT parameters — could be per-concept in production
    p_slip = DEFAULT_BKT_PARAMS['p_slip']
    p_guess = DEFAULT_BKT_PARAMS['p_guess']
    p_transit = DEFAULT_BKT_PARAMS['p_transit']

    # Bayesian update
    if is_correct:
        # P(L | correct) = P(correct|L)*P(L) / P(correct)
        numerator = (1 - p_slip) * p_known
        denominator = numerator + p_guess * (1 - p_known)
    else:
        # P(L | incorrect) = P(incorrect|L)*P(L) / P(incorrect)
        numerator = p_slip * p_known
        denominator = numerator + (1 - p_guess) * (1 - p_known)

    # Avoid division by zero
    p_known_given_obs = numerator / denominator if denominator > 0 else p_known

    # Apply learning transition
    p_known_next = p_known_given_obs + p_transit * (1 - p_known_given_obs)

    # Clamp to [0, 1]
    p_known_next = max(0.0, min(1.0, p_known_next))

    mastery_achieved = p_known_next >= MASTERY_THRESHOLD
    status = 'mastered' if mastery_achieved else 'in_progress'

    # Save back
    table.put_item(Item={
        'learner_id': learner_id,
        'concept_id': concept_id,
        'p_known': Decimal(str(round(p_known_next, 4))),
        'interactions_count': interactions + 1,
        'status': status,
        'last_correct': is_correct,
    })

    return respond(200, {
        "message": "Mastery updated",
        "learner_id": learner_id,
        "concept_id": concept_id,
        "p_known_previous": round(p_known, 4),
        "p_known": round(p_known_next, 4),
        "interactions_count": interactions + 1,
        "mastery_achieved": mastery_achieved,
        "status": status
    })


def lambda_handler(event, context):
    http_method = event.get('httpMethod') or event.get('requestContext', {}).get('http', {}).get('method', '')
    if http_method == 'OPTIONS':
        return respond(200, {})
    try:
        path = event.get('resource') or event.get('rawPath', '')
        if http_method == 'POST' and path.endswith('/bkt/update'):
            return handle_bkt_update(event)
        return respond(404, {"error": f"Route not found: {http_method} {path}"})
    except Exception as e:
        print(f"Error: {str(e)}")
        return respond(500, {"error": "Internal server error", "details": str(e)})

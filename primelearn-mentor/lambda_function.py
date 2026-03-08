import json
import boto3
import os
from datetime import datetime
from decimal import Decimal

dynamodb = boto3.resource('dynamodb', region_name='ap-south-1')
bedrock = boto3.client('bedrock-runtime', region_name='ap-south-1')
comprehend = boto3.client('comprehend', region_name='ap-south-1')

SESSION_LOGS_TABLE = "SessionLogs"
LEARNER_STATE_TABLE = "LearnerState"
PRIMARY_MODEL_ID = os.environ.get("HAIKU_MODEL_ID", "apac.amazon.nova-pro-v1:0")
FALLBACK_MODEL_ID = "apac.amazon.nova-pro-v1:0"
GUARDRAIL_ID = os.environ.get("GUARDRAIL_ID", "eaul167bm603")
GUARDRAIL_VERSION = os.environ.get("GUARDRAIL_VERSION", "DRAFT")


def call_llm(prompt, system_prompt=None, max_tokens=800):
    """Call Bedrock LLM using Converse API. Tries primary model, falls back to Nova Pro."""
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


# ─── Amazon Comprehend: Language Detection ───────────────────────────────────
def detect_language(text):
    """
    Use Amazon Comprehend to detect the dominant language of the user's input.
    Returns language code (e.g., 'hi' for Hindi, 'en' for English).
    This enables automatic Hinglish response when Hindi input is detected.
    """
    try:
        response = comprehend.detect_dominant_language(Text=text[:300])
        languages = response.get('Languages', [])
        if languages:
            # Sort by confidence score
            languages.sort(key=lambda x: x['Score'], reverse=True)
            top_lang = languages[0]['LanguageCode']
            confidence = languages[0]['Score']
            return top_lang, confidence
    except Exception as e:
        print(f"Comprehend language detection error: {e}")
    return 'en', 0.0


def build_system_prompt(hint_level, learner=None, detected_language='en'):
    """Build adaptive Socratic system prompt based on hint level, learner profile, and detected language."""
    if hint_level == 1:
        base = "You are a Socratic tutor. Ask a broad guiding question to nudge the learner. Do NOT give the answer."
    elif hint_level == 2:
        base = "You are a Socratic tutor. Give a specific hint pointing toward the concept. Use an analogy if helpful. Do NOT give the answer."
    elif hint_level == 3:
        base = "You are a Socratic tutor. Give a near-direct hint. Explain the concept partially but avoid the complete answer."
    else:
        base = "You are a helpful tutor. The learner has struggled enough. Give a clear, direct, complete explanation."

    if learner:
        style = learner.get('learning_style', {})
        if isinstance(style, dict):
            if float(style.get('visual', 0)) > 0.4:
                base += " Include visual analogies and ASCII diagrams."
            if float(style.get('hands_on', 0)) > 0.4:
                base += " Keep brief and suggest exercises."
            if float(style.get('theory', 0)) > 0.4:
                base += " Reference formal CS principles."
            if float(style.get('example', 0)) > 0.4:
                base += " Lead with real-world Indian examples (UPI, Aadhaar, IRCTC, Zomato)."

    # Hinglish: triggered by learner preference OR auto-detected Hindi input
    use_hinglish = False
    if learner and learner.get('language') == 'hi':
        use_hinglish = True
    if detected_language in ('hi', 'mr', 'ta', 'te', 'bn', 'gu', 'kn'):
        use_hinglish = True

    if use_hinglish:
        base += " Respond in Hinglish (Hindi-English code-mixed). Keep technical terms in English."

    # India-focused context for better relevance
    base += " When giving examples, prefer Indian context (e.g., UPI payment flow, IRCTC booking system, Aadhaar verification, Swiggy/Zomato order routing)."

    return base


def handle_mentor_hint(event):
    body = get_body(event)
    learner_id = body.get('learner_id')
    concept_id = body.get('concept_id', 'general')
    question = body.get('question')
    hint_level = int(body.get('hint_level', 1))

    if not learner_id or not question:
        return respond(400, {"error": "learner_id and question are required"})

    hint_level = max(1, min(4, hint_level))

    # Fetch learner profile
    learner = {}
    try:
        learner = dynamodb.Table(LEARNER_STATE_TABLE).get_item(Key={'learner_id': learner_id}).get('Item', {})
    except Exception:
        pass

    # ─── Amazon Comprehend: Auto-detect language of user's question ──────
    detected_lang, lang_confidence = detect_language(question)

    # ─── Amazon Comprehend: Sentiment Analysis (detect frustration/confusion) ──
    sentiment = "NEUTRAL"
    confusion_score = 0
    try:
        lang_code = 'en' if detected_lang == 'en' else 'hi'
        sentiment_resp = comprehend.detect_sentiment(Text=question[:5000], LanguageCode=lang_code)
        sentiment = sentiment_resp.get("Sentiment", "NEUTRAL")
        scores = sentiment_resp.get("SentimentScore", {})
        confusion_score = round(scores.get("Mixed", 0) * 0.5 + scores.get("Negative", 0) * 0.3, 3)
    except Exception as e:
        print(f"Comprehend sentiment error: {e}")

    # Auto-escalate hint level if learner is frustrated/confused
    effective_hint_level = hint_level
    if sentiment in ("NEGATIVE", "MIXED") and confusion_score > 0.3:
        effective_hint_level = min(4, hint_level + 1)  # Bump up one level

    system_prompt = build_system_prompt(effective_hint_level, learner, detected_language=detected_lang)

    # Add empathy for frustrated learners
    if sentiment == "NEGATIVE" or confusion_score > 0.4:
        system_prompt += " The learner seems frustrated. Start with brief encouragement, then help."
    elif sentiment == "MIXED":
        system_prompt += " The learner seems confused. Be extra clear and use step-by-step explanation."

    try:
        content_text = call_llm(
            prompt=f"Concept: {concept_id}\nQuestion: {question}",
            system_prompt=system_prompt,
            max_tokens=800
        )
        if not content_text:
            content_text = "I encountered an issue. Please try rephrasing your question."
    except Exception as e:
        print(f"Bedrock mentor error: {e}")
        content_text = "I encountered an issue. Please try rephrasing your question."

    # ─── Bedrock Guardrails: Filter mentor response ────────────────────
    if GUARDRAIL_ID:
        try:
            guard_resp = bedrock.apply_guardrail(
                guardrailIdentifier=GUARDRAIL_ID,
                guardrailVersion=GUARDRAIL_VERSION,
                source="OUTPUT",
                content=[{"text": {"text": content_text[:10000]}}]
            )
            if guard_resp.get("action") == "GUARDRAIL_INTERVENED":
                outputs = guard_resp.get("outputs", [])
                content_text = outputs[0]["text"] if outputs else "Let me rephrase that in a safer way."
        except Exception as e:
            print(f"Guardrail error: {e}")

    # Log interaction with Comprehend insights
    dynamodb.Table(SESSION_LOGS_TABLE).put_item(Item={
        'learner_id': learner_id,
        'timestamp': datetime.utcnow().isoformat(),
        'action': 'MENTOR_HINT',
        'concept_id': concept_id,
        'hint_level': hint_level,
        'effective_hint_level': effective_hint_level,
        'question': question[:500],
        'detected_language': detected_lang,
        'language_confidence': Decimal(str(round(lang_confidence, 3))),
        'sentiment': sentiment,
        'confusion_score': Decimal(str(confusion_score))
    })

    return respond(200, {
        "hint": content_text,
        "hint_level": effective_hint_level,
        "is_direct_answer": effective_hint_level == 4,
        "next_level": (effective_hint_level + 1) if effective_hint_level < 4 else None,
        "detected_language": detected_lang,
        "language_confidence": round(lang_confidence, 3),
        "sentiment": sentiment,
        "confusion_detected": confusion_score > 0.3,
        "auto_escalated": effective_hint_level > hint_level
    })


def lambda_handler(event, context):
    http_method = event.get('httpMethod') or event.get('requestContext', {}).get('http', {}).get('method', '')
    if http_method == 'OPTIONS':
        return respond(200, {})
    try:
        path = event.get('resource') or event.get('rawPath', '')
        if http_method == 'POST' and path.endswith('/mentor/hint'):
            return handle_mentor_hint(event)
        return respond(404, {"error": f"Route not found: {http_method} {path}"})
    except Exception as e:
        print(f"Error: {str(e)}")
        return respond(500, {"error": "Internal server error", "details": str(e)})

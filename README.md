# PrimeLearn - AI-Powered Adaptive Learning Platform

**Team Eleven** | AWS AI for Bharat Hackathon

**Team Members:** Adwika Taware, Soham Takale

**Live Demo:** [https://main.d3ef00aq3yh148.amplifyapp.com](https://main.d3ef00aq3yh148.amplifyapp.com)

---

## What is PrimeLearn?

PrimeLearn is a cinematic, AI-powered learning platform that adapts to each learner's pace, detects struggles in real-time, and fills knowledge gaps using personalized content. It combines Bayesian Knowledge Tracing, Leitner spaced repetition, and LLM-generated episodes to create a Netflix-style learning experience.

## Key Features

### Adaptive Learning Engine
- **Bayesian Knowledge Tracing (BKT):** Tracks concept mastery probabilistically, updating after every interaction
- **Leitner Spaced Repetition:** 5-box flashcard system with intelligent scheduling (1/3/7/14/30 day intervals)
- **AI-Generated Learning Constellation:** Personalized knowledge graph generated via Amazon Bedrock, mapping concepts as a visual roadmap

### Episode Engine
- **LLM-Generated Episodes:** Each episode is dynamically created by Amazon Nova Pro on Bedrock with multiple content types:
  - Story-based narratives with Indian context
  - Interactive code challenges with live execution
  - Visual story explanations with D3.js visualizations
  - Socratic dialogue and worked examples
- **6 Episode Types:** story, code_challenge, visual_story, worked_example, socratic_dialogue, analogy

### AI Presentation Engine
- Auto-generated slide presentations with synchronized voice narration for Visual Story episodes
- Amazon Bedrock (Nova Pro) generates structured slides with 7 visual layouts (title, bullets, diagram, code, comparison, summary, keypoint)
- Amazon Polly (Kajal neural voice) synthesizes per-slide audio
- Framer Motion animations with auto-advancing slides synced to narration

### Struggle Detection & Mentor
- **Real-time Struggle Detection:** Tracks time-on-task, rapid answer changes, hint requests, and repeated errors
- **AI Mentor (Socratic):** Guided hints, concept breakdowns, and personalized guidance via Amazon Bedrock
- **Bridge Sprint:** Quick remedial episodes generated on-the-fly to fill prerequisite gaps

### Smile-to-Start Onboarding
- Webcam-based face detection using face-api.js
- Smile meter (0-100%) — learning starts with a positive attitude
- Seamless goal selection → AI constellation generation → Begin journey

### Interactive Dashboard
- GitHub/LeetCode-style concept mastery heatmap
- Real-time XP, streak, level tracking
- Placement readiness score with domain weighting
- Fading knowledge alerts for concepts losing mastery
- Leitner review queue with urgency indicators

### Learner Profile
- Skill breakdown with proficiency levels (Beginner/Intermediate/Advanced)
- Mastered concepts gallery with progress tracking
- Achievement badges (First Episode, 3-Day Streak, First Mastery, etc.)
- Rotating motivational quotes
- Learning timeline with activity history
- Leitner box distribution visualization

## Architecture

### Frontend
- **Next.js 16** with App Router
- **Tailwind CSS** with custom warm earthy theme (cream, brown, terracotta, sage)
- **Framer Motion** for animations
- **D3.js** for interactive visualizations
- **face-api.js** for smile detection

### Backend (AWS Serverless)
- **AWS Lambda** (Python) — 8 microservices:
  - `primelearn-episode-engine` — Main API, episode generation, dashboard, constellation
  - `primelearn-onboarding` — Registration, assessment, knowledge graph seeding
  - `primelearn-leitner-scheduler` — Spaced repetition scheduling
  - `primelearn-bkt-updater` — Bayesian Knowledge Tracing updates
  - `primelearn-struggle-detector` — Real-time struggle signal processing
  - `primelearn-mentor` — AI mentor hints and guidance
  - `primelearn-bridge-sprint` — Remedial content generation
  - `primelearn-code-sandbox` — Secure code execution
- **Amazon API Gateway** — REST API routing
- **Amazon DynamoDB** — Tables: LearnerState, LearnerMastery, KnowledgeGraph, LeitnerBox, SessionLogs, Assessments
- **Amazon Bedrock** — Nova Pro for content generation, Claude for evaluation
- **Amazon Polly** — Kajal neural voice for presentation narration
- **Amazon S3** — Content caching, presentation storage, uploads

### Data Flow
```
User Interaction → API Gateway → Lambda → Bedrock (LLM) → DynamoDB
                                       → Polly (TTS) → S3 (cache)
                                       → BKT Update → Mastery Tracking
```

## Local Development

### Frontend
```bash
cd frontend
npm install
# Set NEXT_PUBLIC_API_URL in .env.local
npm run dev
```

### Backend
Each Lambda in its own directory. Deploy via AWS Console or SAM CLI.

## AWS Services Used
- Amazon Bedrock (Nova Pro, Claude)
- Amazon Polly (Neural TTS)
- Amazon DynamoDB
- AWS Lambda
- Amazon API Gateway
- Amazon S3
- AWS Amplify (Frontend hosting)

---

Built with passion for the **AWS AI for Bharat Hackathon** by Team Eleven.

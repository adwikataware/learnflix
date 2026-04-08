# LearnFlix — Netflix, but for Learning

**AI-Powered Adaptive Learning Platform**

**Team Members:** Adwika Taware, Soham Takale

**Live Demo:** [https://main.d261mwhsff74iq.amplifyapp.com](https://main.d261mwhsff74iq.amplifyapp.com)

---

## What is LearnFlix?

LearnFlix is a cinematic, AI-powered learning platform that reimagines education as a streaming experience. You pick any topic — CS, finance, biology, music, anything — and AI generates your entire curriculum: courses become **Seasons**, subtopics become **Episodes**. The platform adapts to how you think, detects when you're struggling in real-time, and uses a Socratic AI mentor that guides you with questions instead of handing out answers.

One platform. Any subject. Every learner.

## The Problem We Solve

- **1.5 million engineering graduates** every year in India
- **55% unemployable** (NASSCOM) — not due to lack of talent, but broken learning
- Existing platforms: one-size-fits-all videos, no adaptation, no real feedback
- ChatGPT gives answers but no structure, no mastery validation
- Scaler charges ₹3-4 lakhs — out of reach for most students

LearnFlix: adaptive AI, priced at **₹299/month** — 100x cheaper, 10x smarter.

---

## Key Features

### Netflix-Style UI
- Tilted scrolling poster grid on landing page
- Cinematic hero banner with trending news in your specialization
- **Top 10 cards** — giant numbered portrait cards, just like Netflix
- Horizontal course rows with hover-expand previews
- **"Continue Watching"** for in-progress courses
- Full dark theme (#141414 backgrounds, #E50914 red accents)
- Page-turn animations, confetti celebrations, auto-play countdowns

### Multi-Profile System
- Create multiple profiles per account (Netflix-style profile picker)
- Each profile has its own specialization, progress, and learning history
- **Smile-to-start** — face detection on profile creation. Our motto: *every learner should start with a smiling face*

### AI-Generated Curriculum
- You pick a specialization → AI (Amazon Bedrock Nova Pro) generates courses, roadmap, episodes
- Each course has an animated learning path with mastery-based unlocking
- **Bayesian Knowledge Tracing (BKT)** — tracks probability you truly know a concept
- **Leitner spaced repetition** — 5-box system (1/3/7/14/30 day intervals)

### The Episode Experience (4 Tabs)

**1. Video Tab**
- AI-generated presentations with auto-advancing slides
- Amazon Polly voice narration per slide
- Framer Motion animations, 7 visual layouts
- Every presentation freshly generated — no pre-recorded content

**2. Notes Tab — Interactive Notebook**
- **Two-page spread** with 3D page-turn animation
- **Red ribbon bookmarks** per page
- **Highlighter tool** — 5 colors (yellow, green, red, blue, purple)
- **Pen tool** — write your own annotations on any page
- **Upload your PDF** — AI reads it, fills gaps, adds new pages automatically
- Table of contents, page navigation, keyboard shortcuts

**3. Code Labs**
- Live sandbox for Python, SQL, C++, Java
- Real execution with instant feedback
- AI code review evaluates approach, not just correctness
- **Context-aware** — only appears for coding subjects (not Chemistry, Finance, etc.)

**4. Assessment**
- Adaptive questions — harder when you're acing, easier when struggling
- Multiple formats: MCQ, fill-in-the-blank, true/false
- BKT-based mastery updates
- **Adapt IQ** — personalized tests generated from your weak spots

### Real-Time Struggle Detection
- Tracks time-on-task, error rate, hint requests, answer changes
- Calculates **ZPD (Zone of Proximal Development) score**
- Auto-triggers mentor when struggle threshold is crossed
- Never leaves a slow learner behind — adapts pace silently

### Voice-Enabled AI Mentor (F.R.I.E.N.D)
- **Floating buddy** on every page — always accessible
- Talk to it using voice — it responds with voice (Coqui TTS / Polly)
- **4-level Socratic hint system** — Level 1 nudge → Level 4 full answer
- Never gives answers instantly — makes you think
- **Hinglish support** — mix Hindi and English naturally
- Detects frustration via sentiment analysis and auto-escalates hints

### Bridge Sprints — Auto-Healing Prerequisites
- BFS traversal of knowledge graph detects prerequisite gaps
- Auto-generates 10-15 minute remedial mini-lessons
- Catches failure before it happens
- No more "why don't I understand this?" — the system tells you

### Learn Any Topic On-the-Fly
- Click "Learn New Topic" in the mentor
- Type anything — Operating Systems, Cooking, Stock Market, Guitar, Quantum Physics
- Course created instantly with roadmap, episodes, notes, code labs
- Shows up on your home page alongside existing courses

### Gamification & Engagement
- **Netflix-style completion celebration** — confetti, XP counter, mastery circle
- **Auto-play countdown** — 15 seconds to the next episode
- **Toast notifications** — XP earned, streak updates, achievements unlocked
- **Streak tracking** — daily learning streaks with fire icons
- **Share progress** — generate share cards for Twitter, LinkedIn, WhatsApp

### Dashboard & Analytics
- Concept mastery heatmap (GitHub contribution-style)
- Real-time XP, streak, level tracking
- Placement readiness score with domain weighting
- Fading knowledge alerts
- Leitner review queue
- Skill radar chart

---

## Architecture

### Frontend
- **Next.js 16** (App Router) with Turbopack
- **Tailwind CSS v4** with full Netflix dark theme
- **Framer Motion** for animations
- **D3.js** for visualizations
- **face-api.js** (@vladmandic/face-api) for smile detection
- **Web Speech API** for voice input
- Deployed on **AWS Amplify**

### Backend (AWS Serverless)
- **AWS Lambda** (Python 3.12) — 9 microservices:
  - `learnflix-episode-engine` — Main API, episode generation, dashboard, constellation
  - `learnflix-onboarding` — Registration, assessment, knowledge graph seeding
  - `learnflix-leitner-scheduler` — Spaced repetition scheduling
  - `learnflix-bkt-updater` — Bayesian Knowledge Tracing
  - `learnflix-struggle-detector` — Real-time struggle signal processing
  - `learnflix-mentor` — AI mentor with Socratic hints
  - `learnflix-bridge-sprint` — Remedial content generation
  - `learnflix-code-sandbox` — Secure code execution (Python/SQL/C++/Java)
  - `learnflix-manim-renderer` — Animation rendering
- **Amazon API Gateway** — REST API routing
- **Amazon DynamoDB** — LearnerState, LearnerMastery, KnowledgeGraph, LeitnerBox, SessionLogs, Assessments
- **Amazon Bedrock** — Nova Pro (content generation), Claude (evaluation)
- **Bedrock Knowledge Bases** — RAG-grounded responses
- **Bedrock Guardrails** — Socratic mode enforcement
- **Amazon Polly** — Kajal neural voice for narration
- **Amazon Comprehend** — Hinglish language detection, sentiment analysis
- **Amazon S3** — Content cache, presentation storage, PDF uploads

### Data Flow
```
User → Amplify (Next.js) → API Gateway → Lambda
                                      ↓
                          Bedrock (Nova Pro / Claude)
                                      ↓
                          DynamoDB (state + mastery)
                                      ↓
                          Polly (TTS) → S3 (cache)
                                      ↓
                          BKT Update → Mastery Tracking
```

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React, Tailwind CSS v4, Framer Motion |
| Visualizations | D3.js, Mermaid, Recharts |
| Face Detection | face-api.js (TinyFaceDetector, FaceExpressionNet) |
| Voice | Web Speech API, Amazon Polly |
| Backend | AWS Lambda (Python), FastAPI-style handlers |
| Database | Amazon DynamoDB |
| LLM | Amazon Bedrock (Nova Pro, Claude 3) |
| RAG | Bedrock Knowledge Bases |
| Storage | Amazon S3 |
| NLP | Amazon Comprehend |
| Hosting | AWS Amplify |
| Monitoring | CloudWatch Logs |

---

## Business Model

- **Free Tier** — 2 seasons, 20 mentor queries/day
- **Pro** — ₹299/month or ₹2,999/year (unlimited everything)
- **Institutional License** — ₹50K-3L/year per college (500-5,000 students)
- **Corporate L&D** — ₹3,000/employee/year

**Unit Economics:** ~₹14/user/month cost, ₹300 revenue → **95% gross margin**. Break-even at 500 users.

---

## Local Development

### Frontend
```bash
cd frontend
npm install
# Create .env.local with:
# NEXT_PUBLIC_API_URL=<your-api-gateway-url>
npm run dev
```
Opens at `http://localhost:3000`

### Backend
Each Lambda in its own directory. Deploy via AWS Console, SAM CLI, or Amplify.

---

## Differentiators

1. **Netflix UX** — familiar, binge-worthy, zero learning curve
2. **AI-generated curriculum** — not static catalogs
3. **5 adaptive formats** — Visual Story, Code Lab, Concept X-Ray, Case Study, Quick Byte
4. **Socratic voice mentor** — never gives answers instantly
5. **Real-time struggle detection** — ZPD-based intervention
6. **Bridge Sprints** — auto-heal prerequisite gaps
7. **Adapt IQ** — personalized assessments per learner
8. **Works for any subject** — not just CS
9. **Hinglish native** — built for Bharat
10. **100x cheaper than Scaler** — ₹299/month

---

## Team

**LearnFlix** by Adwika Taware & Soham Takale

---

**Live:** [https://main.d261mwhsff74iq.amplifyapp.com](https://main.d261mwhsff74iq.amplifyapp.com)

*Built with love for every learner in Bharat.*

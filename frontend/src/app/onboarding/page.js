'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  registerUser,
  setGoal,
  getAssessment,
  submitAssessment,
  setLearnerId,
  setLearnerName,
  getLearnerId,
  getConstellation,
} from '@/lib/api';

const GOALS = [
  { id: 'dsa', label: 'Data Structures & Algorithms', icon: 'account_tree', desc: 'Arrays, trees, graphs, sorting, DP & more' },
  { id: 'ml', label: 'Machine Learning', icon: 'model_training', desc: 'Supervised, unsupervised, neural networks' },
  { id: 'dl', label: 'Deep Learning', icon: 'neurology', desc: 'CNNs, RNNs, transformers & architectures' },
  { id: 'datascience', label: 'Data Science', icon: 'query_stats', desc: 'Statistics, pandas, visualization & analysis' },
  { id: 'math', label: 'Mathematics', icon: 'calculate', desc: 'Linear algebra, calculus, probability & stats' },
  { id: 'physics', label: 'Physics', icon: 'science', desc: 'Mechanics, electromagnetism, quantum & more' },
  { id: 'cs', label: 'Computer Science', icon: 'computer', desc: 'OS, networks, compilers, databases & theory' },
  { id: 'python', label: 'Python Programming', icon: 'code', desc: 'From basics to advanced Python concepts' },
  { id: 'sql', label: 'SQL & Databases', icon: 'database', desc: 'Queries, joins, optimization & design' },
];

const EDUCATION_OPTIONS = [
  'High School',
  'Undergraduate',
  'Graduate',
  'Working Professional',
  'Self-Learner',
];

const pageTransition = {
  initial: { opacity: 0, x: 60 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, x: -60, transition: { duration: 0.3, ease: 'easeIn' } },
};

// Layout function for constellation nodes
function layoutPreviewNodes(nodes) {
  const cols = Math.ceil(Math.sqrt(nodes.length * 1.5));
  const rows = Math.ceil(nodes.length / cols);
  const spacingX = 580 / Math.max(cols, 1);
  const spacingY = 260 / Math.max(rows, 1);
  return nodes.map((n, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const jx = ((i * 37) % 30) - 15;
    const jy = ((i * 53) % 24) - 12;
    return { ...n, x: 80 + col * spacingX + jx, y: 50 + row * spacingY + jy };
  });
}

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Step 1 state
  const [name, setName] = useState('');
  const [education, setEducation] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [customTopic, setCustomTopic] = useState('');

  // Language always English
  const language = 'en';

  // Step 3 state
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);

  // Step 4 state
  const [finalScore, setFinalScore] = useState(null);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [realNodes, setRealNodes] = useState([]);
  const [realEdges, setRealEdges] = useState([]);

  // Steps: 1=Profile+Goal, 3=Assessment, 4=Results (step 2 skipped)
  const progressPercent = step === 1 ? 33 : step === 3 ? 66 : 100;

  // Step 1 -> Step 2
  const handleGoalSubmit = async () => {
    const hasGoal = selectedGoal || customTopic.trim();
    if (!hasGoal || !name.trim()) return;
    setLoading(true);
    setError(null);

    const goalLabel = customTopic.trim()
      ? customTopic.trim()
      : (GOALS.find((g) => g.id === selectedGoal)?.label || selectedGoal);

    const { data: regData, error: regErr } = await registerUser({ language });
    if (regErr) {
      setError(regErr);
      setLoading(false);
      return;
    }

    const lId = regData.learner_id;
    setLearnerId(lId);
    if (name.trim()) setLearnerName(name.trim());

    const { error: goalErr } = await setGoal({ learner_id: lId, goal: goalLabel });
    if (goalErr) {
      setError(goalErr);
      setLoading(false);
      return;
    }

    // Skip language step — go straight to assessment
    const lId2 = lId;
    const { data: assessData, error: fetchErr } = await getAssessment(lId2);
    if (fetchErr) {
      setError(fetchErr);
      setLoading(false);
      return;
    }

    setQuestions(assessData.assessment);
    setStep(3);
    setLoading(false);
  };

  // Step 3: Answer a question
  const handleAnswerSubmit = async (optionIndex) => {
    if (loading) return;
    setSelectedOption(optionIndex);

    setTimeout(async () => {
      const currentQ = questions[currentQIndex];
      const isCorrect = optionIndex === currentQ.correct_option_index;

      const newAnswers = [
        ...answers,
        {
          question_id: `q${currentQIndex}`,
          difficulty: currentQ.difficulty || 0.5,
          is_correct: isCorrect,
        },
      ];
      setAnswers(newAnswers);

      if (currentQIndex < questions.length - 1) {
        setCurrentQIndex(currentQIndex + 1);
        setSelectedOption(null);
      } else {
        setLoading(true);
        const lId = getLearnerId();
        const { data, error: submitErr } = await submitAssessment({
          learner_id: lId,
          answers: newAnswers,
        });

        if (submitErr) {
          setError(submitErr);
          setLoading(false);
          return;
        }

        setFinalScore(data.ability_score * 1000);
        setAssessmentResult(data);

        // Fetch the REAL AI-generated constellation
        const constRes = await getConstellation(lId);
        if (!constRes.error && constRes.data?.nodes?.length > 0) {
          const raw = constRes.data.nodes.map((n) => ({
            concept_id: n.concept_id || n.id,
            label: n.label || n.concept_id,
            status: n.status === 'mastered' ? 'mastered' : n.status === 'active' ? 'active' : 'locked',
          }));
          const laid = layoutPreviewNodes(raw);
          setRealNodes(laid);

          // Build edges from prerequisites or links
          const edges = [];
          const apiEdges = constRes.data.edges || constRes.data.links || [];
          apiEdges.forEach((e) => {
            const si = laid.findIndex(n => n.concept_id === e.source);
            const ti = laid.findIndex(n => n.concept_id === e.target);
            if (si >= 0 && ti >= 0) edges.push([si, ti]);
          });
          setRealEdges(edges);
        }

        setStep(4);
        setLoading(false);
        setSelectedOption(null);
      }
    }, 400);
  };

  const strengths = assessmentResult?.strengths || [];
  const gaps = assessmentResult?.gaps || [];

  const PREVIEW_COLORS = { mastered: '#00d26a', active: '#00ace0', locked: '#64748b' };

  return (
    <div className="min-h-screen bg-bg-dark text-text-primary flex flex-col">

      {/* Sticky Header - No sidebar, standalone */}
      <header className="sticky top-0 z-50 glass-panel border-b border-border-dark">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-text-white">
            Prime<span className="text-primary">Learn</span>
          </Link>
          <Link
            href="/"
            className="text-text-secondary text-sm hover:text-text-white transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-base">close</span>
            Exit Setup
          </Link>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-surface-dark">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-4">
          <span className="text-text-secondary text-xs font-semibold tracking-wider uppercase whitespace-nowrap">
            Step {step === 1 ? 1 : step === 3 ? 2 : 3} of 3
          </span>
          <div className="flex-1 h-1.5 bg-border-dark rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <span className="text-primary text-xs font-bold">{progressPercent}%</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-start justify-center px-6 py-10">
        <AnimatePresence mode="wait">

          {/* STEP 1: Welcome & Goals */}
          {step === 1 && (
            <motion.div
              key="step1"
              {...pageTransition}
              className="w-full max-w-3xl"
            >
              <div className="text-center mb-10">
                <span className="material-symbols-outlined text-primary text-5xl mb-4 block">
                  rocket_launch
                </span>
                <h1 className="text-4xl md:text-5xl font-bold text-text-white mb-3">
                  Welcome to PrimeLearn
                </h1>
                <p className="text-text-secondary text-lg">
                  Tell us about yourself so we can personalize your learning journey.
                </p>
              </div>

              <div className="bg-surface-dark border border-border-dark rounded-2xl p-8">
                {/* Full Name */}
                <label className="block text-text-secondary text-sm font-semibold mb-2 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-bg-dark border border-border-dark rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors mb-6"
                />

                {/* Education Level */}
                <label className="block text-text-secondary text-sm font-semibold mb-2 uppercase tracking-wider">
                  Education Level
                </label>
                <select
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="w-full bg-bg-dark border border-border-dark rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-primary transition-colors mb-8 appearance-none cursor-pointer"
                >
                  <option value="" disabled>
                    Select your education level
                  </option>
                  {EDUCATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>

                {/* Goal cards — curated topics */}
                <label className="block text-text-secondary text-sm font-semibold mb-3 uppercase tracking-wider">
                  Pick a topic or type your own
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                  {GOALS.map((g) => (
                    <div
                      key={g.id}
                      onClick={() => { setSelectedGoal(g.id); setCustomTopic(''); }}
                      className={`rounded-xl border p-4 cursor-pointer transition-all prime-glow-hover flex items-start gap-3 ${
                        selectedGoal === g.id && !customTopic.trim()
                          ? 'prime-selected'
                          : 'border-border-dark bg-bg-dark hover:border-primary/30'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        selectedGoal === g.id && !customTopic.trim() ? 'bg-primary/20' : 'bg-primary/10'
                      }`}>
                        <span className="material-symbols-outlined text-primary text-xl">
                          {g.icon}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-text-white font-semibold text-sm truncate">{g.label}</h3>
                        <p className="text-text-muted text-xs mt-0.5 line-clamp-2">{g.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Custom topic input */}
                <div className="relative mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-px bg-border-dark" />
                    <span className="text-text-muted text-xs font-semibold uppercase tracking-wider">or type anything</span>
                    <div className="flex-1 h-px bg-border-dark" />
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary" style={{ fontSize: 20 }}>edit_note</span>
                    <input
                      type="text"
                      placeholder="e.g. Organic Chemistry, History of India, Stock Market Basics..."
                      value={customTopic}
                      onChange={(e) => { setCustomTopic(e.target.value); if (e.target.value.trim()) setSelectedGoal(''); }}
                      className={`w-full bg-bg-dark border rounded-xl pl-12 pr-4 py-4 text-text-primary placeholder-text-muted focus:outline-none transition-all text-sm ${
                        customTopic.trim() ? 'border-primary bg-primary/5' : 'border-border-dark focus:border-primary/50'
                      }`}
                    />
                    {customTopic.trim() && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                    )}
                  </div>
                </div>

                {error && (
                  <p className="text-danger text-sm text-center mb-4">{error}</p>
                )}

                <button
                  onClick={handleGoalSubmit}
                  disabled={!name.trim() || (!selectedGoal && !customTopic.trim()) || loading}
                  className="bg-accent text-bg-dark font-bold px-8 py-4 rounded-lg text-lg hover:brightness-110 transition-all gold-glow w-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                  ) : (
                    <>
                      Next Step
                      <span className="material-symbols-outlined text-xl">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Adaptive Assessment */}
          {step === 3 && questions.length > 0 && (
            <motion.div
              key={`step3-q${currentQIndex}`}
              {...pageTransition}
              className="w-full max-w-3xl"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">quiz</span>
                  <span className="text-text-secondary text-xs font-semibold tracking-widest uppercase">
                    Adaptive Assessment
                  </span>
                </div>
                <span className="text-text-secondary text-sm font-semibold">
                  {currentQIndex + 1} / {questions.length}
                </span>
              </div>

              {/* Question progress */}
              <div className="h-1 w-full bg-border-dark rounded-full mb-10 overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  animate={{
                    width: `${((currentQIndex + 1) / questions.length) * 100}%`,
                  }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              <h2 className="text-2xl md:text-3xl text-text-white font-bold leading-relaxed mb-8">
                {questions[currentQIndex].question}
              </h2>

              <div className="flex flex-col gap-3">
                {questions[currentQIndex].options.map((option, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isSelected = selectedOption === idx;

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => handleAnswerSubmit(idx)}
                      className={`group border rounded-xl p-5 cursor-pointer transition-all flex items-center gap-4 prime-glow-hover ${
                        isSelected
                          ? 'prime-selected'
                          : 'border-border-dark bg-surface-dark hover:border-primary/40'
                      } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors flex-shrink-0 ${
                          isSelected
                            ? 'bg-primary text-bg-dark'
                            : 'bg-bg-dark border border-border-dark text-text-secondary group-hover:border-primary group-hover:text-primary'
                        }`}
                      >
                        {letter}
                      </div>
                      <span className="text-text-primary text-base">{option}</span>
                    </motion.div>
                  );
                })}
              </div>

              {error && <p className="text-danger mt-6 text-center text-sm">{error}</p>}
            </motion.div>
          )}

          {/* STEP 4: Results */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="w-full max-w-3xl"
            >
              <div className="text-center mb-8">
                <span className="text-accent text-xs font-bold tracking-[0.2em] uppercase mb-3 block">
                  Assessment Complete
                </span>
                <h1 className="text-4xl md:text-5xl font-bold text-text-white mb-3">
                  Your Learning Profile
                </h1>
                <p className="text-text-secondary max-w-md mx-auto">
                  Based on your adaptive assessment, here is your personalized skill constellation.
                </p>
              </div>

              {/* Constellation Preview — Real AI-generated nodes */}
              <div className="bg-surface-dark border border-border-dark rounded-2xl overflow-hidden mb-8 relative">
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage: 'radial-gradient(rgba(0,172,224,0.15) 1px, transparent 1px)',
                    backgroundSize: '25px 25px',
                  }}
                />
                {realNodes.length > 0 ? (
                  <svg className="w-full" viewBox="0 0 700 350" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <filter id="preview-glow-green" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                      <filter id="preview-glow-blue" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>

                    {/* Edges from real data */}
                    {realEdges.map(([si, ti], idx) => {
                      const src = realNodes[si];
                      const tgt = realNodes[ti];
                      if (!src || !tgt) return null;
                      const hasActive = src.status === 'active' || tgt.status === 'active';
                      return (
                        <motion.line
                          key={`pe-${idx}`}
                          x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                          stroke={hasActive ? 'rgba(0,172,224,0.3)' : 'rgba(0,172,224,0.08)'}
                          strokeWidth={1.5}
                          strokeDasharray={tgt.status === 'locked' ? '4 3' : 'none'}
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 0.8, delay: idx * 0.08 }}
                        />
                      );
                    })}

                    {/* Real nodes */}
                    {realNodes.map((node, idx) => {
                      const color = PREVIEW_COLORS[node.status];
                      const r = node.status === 'active' ? 14 : node.status === 'locked' ? 10 : 12;
                      const glowFilter = node.status === 'active' ? 'url(#preview-glow-blue)' : 'none';
                      return (
                        <g key={idx} className={node.status === 'locked' ? 'opacity-70' : ''}>
                          {node.status === 'active' && (
                            <circle cx={node.x} cy={node.y} r={r + 6} fill="none" stroke={color} strokeWidth="1" opacity="0.3">
                              <animate attributeName="r" values={`${r + 4};${r + 14};${r + 4}`} dur="2.5s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite" />
                            </circle>
                          )}
                          <motion.circle
                            cx={node.x} cy={node.y} r={r}
                            fill={color}
                            filter={glowFilter}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', delay: 0.3 + idx * 0.06, stiffness: 200 }}
                            style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                          />
                          <text
                            x={node.x} y={node.y + r + 18}
                            textAnchor="middle"
                            fill={node.status === 'locked' ? '#8899aa' : '#c8d6e5'}
                            fontSize="11"
                            fontWeight="600"
                            fontFamily="Manrope, sans-serif"
                          >
                            {node.label.length > 20 ? node.label.slice(0, 18) + '...' : node.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                ) : (
                  <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <span className="material-symbols-outlined text-primary/30 animate-pulse" style={{ fontSize: 48 }}>hub</span>
                      <p className="text-slate-500 text-sm">Building your personalized constellation...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Score + Strengths + Gaps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* Score ring */}
                <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 flex flex-col items-center justify-center">
                  <div className="relative w-32 h-32 flex items-center justify-center mb-3">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle cx="64" cy="64" r="56" fill="none" stroke="#2a3642" strokeWidth="8" />
                      <motion.circle
                        cx="64" cy="64" r="56"
                        fill="none" stroke="#00ace0" strokeWidth="8"
                        strokeDasharray={2 * Math.PI * 56}
                        strokeDashoffset={2 * Math.PI * 56}
                        strokeLinecap="round"
                        animate={{
                          strokeDashoffset: 2 * Math.PI * 56 - 2 * Math.PI * 56 * ((finalScore || 0) / 1000),
                        }}
                        transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                      />
                    </svg>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-text-white font-mono">{Math.round(finalScore || 0)}</p>
                      <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Score</p>
                    </div>
                  </div>
                </div>

                {/* Strengths */}
                <div className="bg-surface-dark border border-border-dark rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-success text-xl">check_circle</span>
                    <h3 className="text-text-white font-bold text-sm uppercase tracking-wider">Your Strengths</h3>
                  </div>
                  {strengths.length > 0 ? (
                    <ul className="space-y-3">
                      {strengths.map((s, i) => (
                        <li key={i} className="text-text-secondary text-sm flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-text-muted text-sm">Your AI mentor will identify strengths as you learn.</p>
                  )}
                </div>

                {/* Priority Gaps */}
                <div className="bg-surface-dark border border-border-dark rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-accent text-xl">trending_up</span>
                    <h3 className="text-text-white font-bold text-sm uppercase tracking-wider">Focus Areas</h3>
                  </div>
                  {gaps.length > 0 ? (
                    <ul className="space-y-3">
                      {gaps.map((g, i) => (
                        <li key={i} className="text-text-secondary text-sm flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                          {g}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-text-muted text-sm">Focus areas will appear based on your learning progress.</p>
                  )}
                </div>
              </div>

              {/* Stats row — from real data */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="bg-surface-dark rounded-xl border border-border-dark p-4 text-center">
                  <span className="material-symbols-outlined text-primary text-xl mb-1 block">hub</span>
                  <p className="text-text-white font-bold text-lg">{realNodes.filter(n => n.status === 'active').length}</p>
                  <p className="text-text-muted text-[11px]">Unlocked</p>
                </div>
                <div className="bg-surface-dark rounded-xl border border-border-dark p-4 text-center">
                  <span className="material-symbols-outlined text-primary text-xl mb-1 block">insights</span>
                  <p className="text-text-white font-bold text-lg">{realNodes.length}</p>
                  <p className="text-text-muted text-[11px]">Total Concepts</p>
                </div>
                <div className="bg-surface-dark rounded-xl border border-border-dark p-4 text-center">
                  <span className="material-symbols-outlined text-accent text-xl mb-1 block">lock_open</span>
                  <p className="text-text-white font-bold text-lg">{realNodes.filter(n => n.status === 'locked').length}</p>
                  <p className="text-text-muted text-[11px]">To Unlock</p>
                </div>
              </div>

              <button
                onClick={() => router.push('/home')}
                className="bg-accent text-bg-dark font-bold px-8 py-4 rounded-lg text-lg hover:brightness-110 transition-all gold-glow w-full flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-xl">play_arrow</span>
                START LEARNING
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

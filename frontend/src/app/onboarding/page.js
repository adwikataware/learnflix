'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

// ─── Smile Detector Component ───────────────────────────────────────────────
function SmileDetector({ onSmileComplete, smileThreshold = 70 }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animRef = useRef(null);
  const faceapiRef = useRef(null);
  const [smilePercent, setSmilePercent] = useState(0);
  const [peakSmile, setPeakSmile] = useState(0);
  const [modelLoading, setModelLoading] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [smileUnlocked, setSmileUnlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Dynamic import face-api (client-only)
        const faceapi = await import('@vladmandic/face-api');
        faceapiRef.current = faceapi;

        // Load models
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/models'),
        ]);

        if (cancelled) return;
        setModelLoading(false);

        // Start camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 480, height: 360, facingMode: 'user' },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Detection loop
        const detect = async () => {
          if (cancelled || !videoRef.current || !faceapiRef.current) return;
          const fapi = faceapiRef.current;

          const result = await fapi.detectSingleFace(
            videoRef.current,
            new fapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
          ).withFaceExpressions();

          if (result) {
            setFaceDetected(true);
            const happy = Math.round((result.expressions.happy || 0) * 100);
            setSmilePercent(happy);
            setPeakSmile(prev => Math.max(prev, happy));

            if (happy >= smileThreshold) {
              setSmileUnlocked(true);
            }
          } else {
            setFaceDetected(false);
            setSmilePercent(0);
          }

          animRef.current = requestAnimationFrame(detect);
        };

        // Wait a frame for video to be ready
        setTimeout(() => { if (!cancelled) detect(); }, 500);

      } catch (err) {
        if (!cancelled) {
          console.error('Camera/model error:', err);
          setCameraError(err.name === 'NotAllowedError'
            ? 'Camera access denied. Please allow camera access and refresh.'
            : 'Could not start camera. Please check your device.'
          );
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [smileThreshold]);

  // Notify parent when smile unlocked
  useEffect(() => {
    if (smileUnlocked) onSmileComplete?.();
  }, [smileUnlocked, onSmileComplete]);

  const meterColor = smilePercent >= 70 ? '#8FA395' : smilePercent >= 40 ? '#D4A574' : '#C17C64';

  if (cameraError) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <span className="material-symbols-outlined text-[#C17C64]" style={{ fontSize: 40 }}>videocam_off</span>
        <p className="text-sm text-[#C17C64] text-center max-w-xs">{cameraError}</p>
        <button
          onClick={() => onSmileComplete?.()}
          className="mt-2 px-4 py-2 rounded-lg border border-[#D8CCBE] text-[#6B5E52] text-sm hover:border-[#C17C64]/40 transition-colors"
        >
          Skip for now
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Camera View */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-[#D8CCBE] bg-black" style={{ width: 320, height: 240 }}>
        {modelLoading && (
          <div className="absolute inset-0 bg-[#FAF7F3] flex flex-col items-center justify-center z-10">
            <div className="w-8 h-8 border-2 border-[#C17C64] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-[#9A8E82]">Loading face detection...</p>
          </div>
        )}

        <video
          ref={videoRef}
          className="w-full h-full object-cover mirror"
          style={{ transform: 'scaleX(-1)' }}
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ transform: 'scaleX(-1)' }} />

        {/* Face detection indicator */}
        {!modelLoading && (
          <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${
            faceDetected ? 'bg-[#8FA395]/90 text-white' : 'bg-[#C17C64]/90 text-white'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${faceDetected ? 'bg-white' : 'bg-white/50 animate-pulse'}`} />
            {faceDetected ? 'Face detected' : 'No face detected'}
          </div>
        )}

        {/* Smile unlocked overlay */}
        {smileUnlocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-[#8FA395]/20 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10 }}
              className="bg-white rounded-full p-3 shadow-lg"
            >
              <span className="material-symbols-outlined text-[#8FA395]" style={{ fontSize: 32, fontVariationSettings: "'FILL' 1" }}>
                sentiment_very_satisfied
              </span>
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Smile Meter */}
      <div className="w-80">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-[#6B5E52] font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>mood</span>
            Smile Meter
          </span>
          <span className="text-xs font-bold" style={{ color: meterColor }}>{smilePercent}%</span>
        </div>
        <div className="w-full h-4 bg-[#E2D8CC] rounded-full overflow-hidden relative">
          <motion.div
            className="h-full rounded-full transition-colors duration-300"
            style={{ backgroundColor: meterColor }}
            animate={{ width: `${smilePercent}%` }}
            transition={{ duration: 0.15 }}
          />
          {/* Threshold marker */}
          <div
            className="absolute top-0 h-full w-0.5 bg-[#2A2018]/30"
            style={{ left: `${smileThreshold}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[9px] text-[#9A8E82]">0</span>
          <span className="text-[9px] text-[#9A8E82]">Smile to unlock →</span>
          <span className="text-[9px] text-[#9A8E82]">100</span>
        </div>
      </div>

      {/* Status message */}
      <p className="text-sm text-center">
        {smileUnlocked ? (
          <span className="text-[#8FA395] font-bold flex items-center gap-1 justify-center">
            <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            Beautiful smile! You're ready to learn!
          </span>
        ) : faceDetected ? (
          <span className="text-[#D4A574]">Almost there... give us a big smile!</span>
        ) : (
          <span className="text-[#9A8E82]">Position your face in front of the camera</span>
        )}
      </p>
    </div>
  );
}

// ─── Main Onboarding ────────────────────────────────────────────────────────
export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Step 1 state
  const [name, setName] = useState('');
  const [smileCompleted, setSmileCompleted] = useState(false);

  // Step 2 state
  const [selectedGoal, setSelectedGoal] = useState('');
  const [customTopic, setCustomTopic] = useState('');

  // Step 3 state
  const [realNodes, setRealNodes] = useState([]);
  const [realEdges, setRealEdges] = useState([]);
  const [constellationLoading, setConstellationLoading] = useState(false);

  const language = 'en';

  const PREVIEW_COLORS = { mastered: '#8FA395', active: '#C17C64', locked: '#9A8E82' };

  const progressPercent = step === 1 ? 33 : step === 2 ? 66 : 100;

  const handleSmileComplete = useCallback(() => {
    setSmileCompleted(true);
  }, []);

  // Step 1 → Step 2
  const handleStep1Next = () => {
    if (!name.trim() || !smileCompleted) return;
    setStep(2);
  };

  // Step 2 → Step 3 (Register + Set Goal + Fetch Constellation)
  const handleGoalSubmit = async () => {
    const hasGoal = selectedGoal || customTopic.trim();
    if (!hasGoal) return;
    setLoading(true);
    setError(null);

    const goalLabel = customTopic.trim()
      ? customTopic.trim()
      : (GOALS.find((g) => g.id === selectedGoal)?.label || selectedGoal);

    // Register user
    const { data: regData, error: regErr } = await registerUser({ language });
    if (regErr) {
      setError(regErr);
      setLoading(false);
      return;
    }

    const lId = regData.learner_id;
    setLearnerId(lId);
    setLearnerName(name.trim());

    // Set goal
    const { error: goalErr } = await setGoal({ learner_id: lId, goal: goalLabel });
    if (goalErr) {
      setError(goalErr);
      setLoading(false);
      return;
    }

    // Move to constellation step
    setStep(3);
    setConstellationLoading(true);
    setLoading(false);

    // Silently auto-complete assessment to trigger constellation generation
    // (Backend seeds KnowledgeGraph + LearnerMastery when assessment is submitted)
    try {
      const { data: assessData } = await getAssessment(lId);
      if (assessData?.assessment?.length > 0) {
        // Submit with "beginner" default answers (all wrong → low ability → unlocks beginner concepts)
        const defaultAnswers = assessData.assessment.map((q, i) => ({
          question_id: `q${i}`,
          difficulty: q.difficulty || 0.5,
          is_correct: false,
        }));
        await submitAssessment({ learner_id: lId, answers: defaultAnswers });
      }
    } catch (e) {
      console.log('Auto-assessment seed:', e);
    }

    // Now fetch the constellation (should have nodes after assessment seeded concepts)
    const constRes = await getConstellation(lId);
    if (!constRes.error && constRes.data?.nodes?.length > 0) {
      const raw = constRes.data.nodes.map((n) => ({
        concept_id: n.concept_id || n.id,
        label: n.label || n.concept_id,
        status: n.status === 'mastered' ? 'mastered' : n.status === 'active' ? 'active' : 'locked',
      }));
      const laid = layoutPreviewNodes(raw);
      setRealNodes(laid);

      const edges = [];
      const apiEdges = constRes.data.edges || constRes.data.links || [];
      apiEdges.forEach((e) => {
        const si = laid.findIndex(n => n.concept_id === e.source);
        const ti = laid.findIndex(n => n.concept_id === e.target);
        if (si >= 0 && ti >= 0) edges.push([si, ti]);
      });
      setRealEdges(edges);
    }
    setConstellationLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F3] text-[#2A2018] flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#D8CCBE]">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-[#2A2018] font-[Manrope]">
            Prime<span className="text-[#C17C64]">Learn</span>
          </span>
          <button
            onClick={() => router.push('/')}
            className="text-[#9A8E82] text-sm hover:text-[#2A2018] transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-base">close</span>
            Exit
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-white border-b border-[#E2D8CC]">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-4">
          <span className="text-[#9A8E82] text-xs font-semibold tracking-wider uppercase whitespace-nowrap">
            Step {step} of 3
          </span>
          <div className="flex-1 h-1.5 bg-[#E2D8CC] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#C17C64] rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <span className="text-[#C17C64] text-xs font-bold">{progressPercent}%</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-start justify-center px-6 py-10">
        <AnimatePresence mode="wait">

          {/* ═══ STEP 1: Name + Smile Camera ═══ */}
          {step === 1 && (
            <motion.div key="step1" {...pageTransition} className="w-full max-w-2xl">

              <div className="text-center mb-8">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10, delay: 0.1 }}
                  className="material-symbols-outlined text-[#C17C64] text-5xl mb-4 block"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  sentiment_very_satisfied
                </motion.span>
                <h1 className="text-3xl md:text-4xl font-bold text-[#2A2018] font-[Manrope] mb-2">
                  Start with a Smile!
                </h1>
                <p className="text-[#6B5E52] text-base">
                  Learning begins with a positive attitude. Tell us your name and show us your best smile!
                </p>
              </div>

              <div className="bg-white border border-[#D8CCBE] rounded-2xl p-8 shadow-sm">

                {/* Name Input */}
                <label className="block text-[#6B5E52] text-sm font-semibold mb-2 uppercase tracking-wider">
                  Your Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#FAF7F3] border border-[#D8CCBE] rounded-lg px-4 py-3 text-[#2A2018] placeholder-[#9A8E82] focus:outline-none focus:border-[#C17C64] transition-colors mb-6"
                  autoFocus
                />

                {/* Smile Camera */}
                <label className="block text-[#6B5E52] text-sm font-semibold mb-3 uppercase tracking-wider">
                  Smile to Unlock
                </label>
                <SmileDetector onSmileComplete={handleSmileComplete} smileThreshold={70} />

                {error && (
                  <p className="text-[#C17C64] text-sm text-center mt-4">{error}</p>
                )}

                <button
                  onClick={handleStep1Next}
                  disabled={!name.trim() || !smileCompleted}
                  className="mt-6 bg-[#C17C64] text-white font-bold px-8 py-4 rounded-lg text-lg hover:brightness-110 transition-all w-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                >
                  {smileCompleted ? (
                    <>
                      Let's Go!
                      <span className="material-symbols-outlined text-xl">arrow_forward</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-xl">lock</span>
                      Smile to Unlock
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 2: Pick a Topic ═══ */}
          {step === 2 && (
            <motion.div key="step2" {...pageTransition} className="w-full max-w-3xl">

              <div className="text-center mb-8">
                <span className="material-symbols-outlined text-[#D4A574] text-5xl mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                <h1 className="text-3xl md:text-4xl font-bold text-[#2A2018] font-[Manrope] mb-2">
                  What do you want to learn, {name.split(' ')[0]}?
                </h1>
                <p className="text-[#6B5E52] text-base">
                  Pick a topic or type anything you're curious about.
                </p>
              </div>

              <div className="bg-white border border-[#D8CCBE] rounded-2xl p-8 shadow-sm">

                {/* Goal cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                  {GOALS.map((g) => (
                    <div
                      key={g.id}
                      onClick={() => { setSelectedGoal(g.id); setCustomTopic(''); }}
                      className={`rounded-xl border p-4 cursor-pointer transition-all flex items-start gap-3 hover:shadow-sm ${
                        selectedGoal === g.id && !customTopic.trim()
                          ? 'border-[#C17C64] bg-[#C17C64]/5 shadow-sm'
                          : 'border-[#D8CCBE] bg-[#FAF7F3] hover:border-[#D4A574]/40'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        selectedGoal === g.id && !customTopic.trim() ? 'bg-[#C17C64]/15' : 'bg-[#D4A574]/10'
                      }`}>
                        <span className="material-symbols-outlined text-[#C17C64] text-xl">{g.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[#2A2018] font-semibold text-sm truncate">{g.label}</h3>
                        <p className="text-[#9A8E82] text-xs mt-0.5 line-clamp-2">{g.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Custom topic */}
                <div className="relative mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-px bg-[#D8CCBE]" />
                    <span className="text-[#9A8E82] text-xs font-semibold uppercase tracking-wider">or type anything</span>
                    <div className="flex-1 h-px bg-[#D8CCBE]" />
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#C17C64]" style={{ fontSize: 20 }}>edit_note</span>
                    <input
                      type="text"
                      placeholder="e.g. Organic Chemistry, History of India, Stock Market Basics..."
                      value={customTopic}
                      onChange={(e) => { setCustomTopic(e.target.value); if (e.target.value.trim()) setSelectedGoal(''); }}
                      className={`w-full bg-[#FAF7F3] border rounded-xl pl-12 pr-4 py-4 text-[#2A2018] placeholder-[#9A8E82] focus:outline-none transition-all text-sm ${
                        customTopic.trim() ? 'border-[#C17C64] bg-[#C17C64]/5' : 'border-[#D8CCBE] focus:border-[#C17C64]/50'
                      }`}
                    />
                    {customTopic.trim() && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8FA395] material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    )}
                  </div>
                </div>

                {error && (
                  <p className="text-[#C17C64] text-sm text-center mb-4">{error}</p>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="px-5 py-4 rounded-lg border border-[#D8CCBE] text-[#6B5E52] font-semibold text-base hover:border-[#C17C64]/40 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleGoalSubmit}
                    disabled={(!selectedGoal && !customTopic.trim()) || loading}
                    className="flex-1 bg-[#C17C64] text-white font-bold px-8 py-4 rounded-lg text-lg hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                  >
                    {loading ? (
                      <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                    ) : (
                      <>
                        Generate My Constellation
                        <span className="material-symbols-outlined text-xl">auto_awesome</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 3: Constellation + Begin Journey ═══ */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="w-full max-w-3xl"
            >
              <div className="text-center mb-8">
                <motion.span
                  initial={{ rotate: -180, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', damping: 10, delay: 0.2 }}
                  className="material-symbols-outlined text-[#C17C64] text-5xl mb-4 block"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  hub
                </motion.span>
                <h1 className="text-3xl md:text-4xl font-bold text-[#2A2018] font-[Manrope] mb-2">
                  Your Learning Constellation
                </h1>
                <p className="text-[#6B5E52] max-w-md mx-auto">
                  Here's your personalized learning map. Each node is a concept you'll master on your journey.
                </p>
              </div>

              {/* Constellation Preview */}
              <div className="bg-white border border-[#D8CCBE] rounded-2xl overflow-hidden mb-6 relative">
                <div
                  className="absolute inset-0 pointer-events-none opacity-30"
                  style={{
                    backgroundImage: 'radial-gradient(rgba(193,124,100,0.08) 1px, transparent 1px)',
                    backgroundSize: '25px 25px',
                  }}
                />

                {constellationLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <div className="w-16 h-16 border-2 border-[#C17C64] border-t-transparent rounded-full animate-spin" />
                        <span className="material-symbols-outlined text-[#C17C64] absolute inset-0 flex items-center justify-center" style={{ fontSize: 24 }}>hub</span>
                      </div>
                      <div className="text-center">
                        <p className="text-[#2A2018] font-semibold text-sm">Generating your constellation...</p>
                        <p className="text-[#9A8E82] text-xs mt-1">Our AI is mapping your learning path</p>
                      </div>
                    </div>
                  </div>
                ) : realNodes.length > 0 ? (
                  <svg className="w-full" viewBox="0 0 700 350" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <filter id="glow-active" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>

                    {/* Edges */}
                    {realEdges.map(([si, ti], idx) => {
                      const src = realNodes[si];
                      const tgt = realNodes[ti];
                      if (!src || !tgt) return null;
                      const hasActive = src.status === 'active' || tgt.status === 'active';
                      return (
                        <motion.line
                          key={`e-${idx}`}
                          x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                          stroke={hasActive ? 'rgba(193,124,100,0.35)' : 'rgba(193,124,100,0.1)'}
                          strokeWidth={hasActive ? 2 : 1.5}
                          strokeDasharray={tgt.status === 'locked' ? '4 3' : 'none'}
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 0.8, delay: idx * 0.08 }}
                        />
                      );
                    })}

                    {/* Nodes */}
                    {realNodes.map((node, idx) => {
                      const color = PREVIEW_COLORS[node.status];
                      const r = node.status === 'active' ? 14 : node.status === 'locked' ? 10 : 12;
                      return (
                        <g key={idx} className={node.status === 'locked' ? 'opacity-60' : ''}>
                          {node.status === 'active' && (
                            <circle cx={node.x} cy={node.y} r={r + 6} fill="none" stroke={color} strokeWidth="1" opacity="0.3">
                              <animate attributeName="r" values={`${r + 4};${r + 14};${r + 4}`} dur="2.5s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite" />
                            </circle>
                          )}
                          <motion.circle
                            cx={node.x} cy={node.y} r={r}
                            fill={color}
                            filter={node.status === 'active' ? 'url(#glow-active)' : 'none'}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', delay: 0.3 + idx * 0.06, stiffness: 200 }}
                            style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                          />
                          <text
                            x={node.x} y={node.y + r + 18}
                            textAnchor="middle"
                            fill={node.status === 'locked' ? '#9A8E82' : '#6B5E52'}
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
                      <span className="material-symbols-outlined text-[#D8CCBE]" style={{ fontSize: 48 }}>hub</span>
                      <p className="text-[#9A8E82] text-sm">Your constellation will appear shortly...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mb-6">
                {[
                  { color: PREVIEW_COLORS.active, label: 'Ready to Learn' },
                  { color: PREVIEW_COLORS.mastered, label: 'Mastered' },
                  { color: PREVIEW_COLORS.locked, label: 'Locked' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                    <span className="text-xs text-[#6B5E52]">{l.label}</span>
                  </div>
                ))}
              </div>

              {/* Stats */}
              {realNodes.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-white rounded-xl border border-[#D8CCBE] p-4 text-center">
                    <span className="material-symbols-outlined text-[#C17C64] text-xl mb-1 block" style={{ fontVariationSettings: "'FILL' 1" }}>lock_open</span>
                    <p className="text-[#2A2018] font-bold text-lg">{realNodes.filter(n => n.status === 'active').length}</p>
                    <p className="text-[#9A8E82] text-[11px]">Ready Now</p>
                  </div>
                  <div className="bg-white rounded-xl border border-[#D8CCBE] p-4 text-center">
                    <span className="material-symbols-outlined text-[#D4A574] text-xl mb-1 block" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
                    <p className="text-[#2A2018] font-bold text-lg">{realNodes.length}</p>
                    <p className="text-[#9A8E82] text-[11px]">Total Concepts</p>
                  </div>
                  <div className="bg-white rounded-xl border border-[#D8CCBE] p-4 text-center">
                    <span className="material-symbols-outlined text-[#8FA395] text-xl mb-1 block" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                    <p className="text-[#2A2018] font-bold text-lg">{realNodes.filter(n => n.status === 'mastered').length}</p>
                    <p className="text-[#9A8E82] text-[11px]">Mastered</p>
                  </div>
                </div>
              )}

              {/* Begin Journey Button */}
              <button
                onClick={() => router.push('/home')}
                disabled={constellationLoading}
                className="bg-[#C17C64] text-white font-bold px-8 py-4 rounded-lg text-lg hover:brightness-110 transition-all w-full flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
                BEGIN YOUR JOURNEY
              </button>

              <p className="text-center text-xs text-[#9A8E82] mt-3">
                You can always revisit your constellation from the home page.
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

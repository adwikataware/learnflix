"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    getEpisode, postProgress, executeCode, getLearnerId, updateBKT,
    getHint, signalStruggle, generateManimVideo, getManimVideoStatus, generateVisualizations,
    getUploadUrl, generateNotesFromUpload, generateAudio, getConstellation, generateSprint,
    generatePresentation
} from '@/lib/api';
import dynamic from 'next/dynamic';
const D3VisualizationEngine = dynamic(() => import('@/components/visualizations/D3VisualizationEngine'), { ssr: false });
import { motion, AnimatePresence } from 'framer-motion';
import { getBestProblem } from '@/lib/problemBank';
import useStruggleTracker from '@/lib/useStruggleTracker';
import Notebook from '@/components/Notebook';
import { toastXP, toastMastery, toastAchievement, toastStreak } from '@/components/Toast';
import StruggleAwarenessPanel from '@/components/StruggleAwarenessPanel';
import InlineMentorChat from '@/components/InlineMentorChat';

// ─── Presentation generation hook (runs at episode level for pre-generation) ──

function buildLocalSlides(conceptName, episodeContent) {
    const clean = (episodeContent || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const sentences = clean.split(/[.!?]+/).filter(s => s.trim().length > 10).map(s => s.trim());
    const topic = conceptName || 'This Topic';

    return [
        {
            type: 'title',
            title: topic,
            content: { headline: topic, tagline: 'An interactive visual explanation by LearnFlix' },
            narration: `Welcome! Today we're going to explore ${topic}. Let's break it down step by step so it's easy to understand.`,
            visual_emphasis: 'zoom',
            duration: 6,
        },
        {
            type: 'bullets',
            title: 'What You\'ll Learn',
            content: {
                points: sentences.slice(0, 4).map(s => s.slice(0, 120)) .length > 0
                    ? sentences.slice(0, 4).map(s => s.slice(0, 120))
                    : ['Core concepts and definitions', 'How it works in practice', 'Key examples and use cases', 'Common pitfalls to avoid']
            },
            narration: `Here's what we'll cover in this presentation. We'll go through the key ideas one at a time.`,
            visual_emphasis: 'enter_left',
            duration: 8,
        },
        {
            type: 'keypoint',
            title: 'The Big Idea',
            content: {
                icon: 'lightbulb',
                text: sentences[0] ? sentences[0].slice(0, 100) : `Understanding ${topic} is fundamental`,
                detail: sentences[1] ? sentences[1].slice(0, 150) : 'Let\'s see why this matters and how it connects to everything else.',
            },
            narration: sentences[0]
                ? `The most important thing to understand is: ${sentences[0]}. ${sentences[1] || ''}`
                : `The big idea here is understanding what ${topic} really means and why it's important.`,
            visual_emphasis: 'zoom',
            duration: 8,
        },
        {
            type: 'diagram',
            title: 'How It Works',
            content: {
                nodes: [
                    { label: 'Input', type: 'secondary' },
                    { label: topic.split(' ')[0] || 'Process', type: 'primary' },
                    { label: 'Output', type: 'accent' },
                ],
                connections: [
                    { from: 0, to: 1, label: 'feeds into' },
                    { from: 1, to: 2, label: 'produces' },
                ],
                layout: 'flow',
            },
            narration: `Here's a simplified view of how ${topic} works. Data flows in, gets processed, and produces a result. Each step builds on the previous one.`,
            visual_emphasis: 'fade',
            duration: 8,
        },
        {
            type: 'bullets',
            title: 'Key Details',
            content: {
                points: sentences.slice(4, 8).map(s => s.slice(0, 120)).length > 0
                    ? sentences.slice(4, 8).map(s => s.slice(0, 120))
                    : ['It builds on foundational concepts', 'There are multiple approaches', 'Practice helps solidify understanding', 'Real-world applications are everywhere']
            },
            narration: sentences[4]
                ? `Let's dive deeper. ${sentences.slice(4, 7).join('. ')}.`
                : `Now let's look at some important details about ${topic} that will help deepen your understanding.`,
            visual_emphasis: 'enter_right',
            duration: 8,
        },
        {
            type: 'comparison',
            title: 'Key Distinction',
            content: {
                left: {
                    title: 'Common Mistake',
                    points: ['Surface-level understanding', 'Memorizing without context', 'Skipping fundamentals'],
                },
                right: {
                    title: 'Best Approach',
                    points: ['Deep conceptual grasp', 'Understanding the "why"', 'Building from basics'],
                },
            },
            narration: `A common mistake is to just memorize facts about ${topic}. Instead, focus on truly understanding the underlying concepts and building from the basics.`,
            visual_emphasis: 'enter_bottom',
            duration: 9,
        },
        {
            type: 'keypoint',
            title: 'Remember This',
            content: {
                icon: 'star',
                text: sentences[2] ? sentences[2].slice(0, 100) : `${topic} connects to many other concepts`,
                detail: 'This is a key insight that will help you in assessments and real-world applications.',
            },
            narration: sentences[2]
                ? `Here's something crucial to remember: ${sentences[2]}. Keep this in mind as you practice.`
                : `Remember that ${topic} doesn't exist in isolation. It connects to many other ideas you'll encounter.`,
            visual_emphasis: 'zoom',
            duration: 7,
        },
        {
            type: 'summary',
            title: 'Key Takeaways',
            content: {
                points: [
                    sentences[0] ? sentences[0].slice(0, 80) : `${topic} is a fundamental concept`,
                    sentences[2] ? sentences[2].slice(0, 80) : 'Understanding beats memorization',
                    'Practice with the code and assessment tabs',
                    'Ask the AI Mentor if you get stuck',
                ],
            },
            narration: `Let's wrap up. Remember the key points we covered about ${topic}. Now head over to the practice tabs to test your understanding. Good luck!`,
            visual_emphasis: 'enter_bottom',
            duration: 8,
        },
    ];
}

function usePresentationPregeneration(conceptId, conceptName, learnerId, episodeContent) {
    const [status, setStatus] = useState('idle'); // idle | generating | ready | error
    const [slides, setSlides] = useState([]);
    const [error, setError] = useState('');
    const [elapsed, setElapsed] = useState(0);
    const [estimatedDuration, setEstimatedDuration] = useState(0);

    const timerRef = useRef(null);
    const startedRef = useRef(false);

    const startGeneration = useCallback(async () => {
        if (startedRef.current) return;
        startedRef.current = true;

        setStatus('generating');
        setError('');
        setElapsed(0);

        timerRef.current = setInterval(() => {
            setElapsed(prev => prev + 1);
        }, 1000);

        // Try API first, fall back to local slides if unavailable
        let useLocal = false;
        try {
            const { data, error: apiError } = await generatePresentation({
                concept_id: conceptId,
                concept_name: conceptName,
                episode_content: episodeContent,
            });
            if (timerRef.current) clearInterval(timerRef.current);

            if (!apiError && data?.slides?.length) {
                setSlides(data.slides);
                setEstimatedDuration(data.estimated_duration || 0);
                setStatus('ready');
                return;
            }
            useLocal = true;
        } catch {
            useLocal = true;
        }

        if (useLocal) {
            if (timerRef.current) clearInterval(timerRef.current);
            const localSlides = buildLocalSlides(conceptName, episodeContent);
            setSlides(localSlides);
            setEstimatedDuration(localSlides.reduce((sum, s) => sum + (s.duration || 5), 0));
            setStatus('ready');
        }
    }, [conceptId, conceptName, episodeContent]);

    useEffect(() => {
        if (conceptId && conceptName && learnerId && episodeContent) {
            startGeneration();
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [conceptId, conceptName, learnerId]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        status, slides, error, elapsed, estimatedDuration,
        retry: () => { startedRef.current = false; startGeneration(); },
    };
}

// ─── Presentation Section (receives pre-generated state) ─────────────────────

const PresentationPlayer = dynamic(() => import('@/components/PresentationPlayer'), { ssr: false });

function PresentationSection({ conceptName, presentation }) {
    const { status, slides, error: errorMsg, elapsed, estimatedDuration, retry } = presentation;

    const formatTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, '0')}`;

    // Generation progress steps
    const steps = [
        { label: 'Analyzing episode content', icon: 'analytics', done: elapsed >= 2 },
        { label: 'Creating slide deck with AI', icon: 'slideshow', done: elapsed >= 5 || status === 'ready' },
        { label: 'Generating voice narration', icon: 'record_voice_over', done: status === 'ready' },
        { label: 'Ready to present', icon: 'play_circle', done: status === 'ready' },
    ];

    return (
        <div className="space-y-4">
            {/* ── Loading State ── */}
            {(status === 'generating' || status === 'idle') && (
                <div className="rounded-2xl overflow-hidden border border-[#333333] shadow-lg" style={{ backgroundColor: '#1E1E1E' }}>
                    <div className="aspect-video relative" style={{ backgroundColor: '#141414' }}>
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
                            <motion.div className="absolute inset-0"
                                style={{ background: 'radial-gradient(ellipse at center, #E5091415, transparent 70%)' }}
                                animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.05, 1] }}
                                transition={{ duration: 3, repeat: Infinity }} />

                            {/* Floating keywords */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                {(conceptName || '').split(/[\s_]+/).slice(0, 5).map((word, i) => (
                                    <motion.span
                                        key={i}
                                        className="absolute text-white/5 font-black text-4xl uppercase"
                                        style={{ left: `${15 + i * 18}%`, top: `${20 + (i % 3) * 25}%` }}
                                        animate={{ y: [0, -15, 0], opacity: [0.03, 0.08, 0.03] }}
                                        transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.5 }}
                                    >
                                        {word}
                                    </motion.span>
                                ))}
                            </div>

                            {/* Central timer orb */}
                            <div className="relative z-10">
                                <div className="relative size-24">
                                    <motion.div className="absolute inset-[-8px] rounded-full border-2 border-[#E50914]/20"
                                        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.1, 0.3] }}
                                        transition={{ duration: 2, repeat: Infinity }} />
                                    <motion.div className="absolute inset-[-16px] rounded-full border border-[#E87C03]/10"
                                        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.05, 0.2] }}
                                        transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }} />
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                                        <circle cx="48" cy="48" r="42" fill="none" stroke="#1A1A1A" strokeWidth="3" />
                                        <motion.circle cx="48" cy="48" r="42" fill="none" stroke="url(#pgrad)" strokeWidth="3"
                                            strokeDasharray={264} strokeLinecap="round"
                                            animate={{ strokeDashoffset: [264, 0] }}
                                            transition={{ duration: 60, ease: 'linear' }} />
                                        <defs>
                                            <linearGradient id="pgrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#E50914" />
                                                <stop offset="100%" stopColor="#E87C03" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-lg font-mono text-white font-black">{formatTime(elapsed)}</span>
                                        <span className="text-[8px] text-[#808080] uppercase tracking-widest mt-0.5">elapsed</span>
                                    </div>
                                </div>
                            </div>

                            {/* Step indicators */}
                            <div className="relative z-10 flex flex-col gap-2 max-w-xs">
                                {steps.map((s, i) => {
                                    const isActive = !s.done && (i === 0 || steps[i - 1].done);
                                    return (
                                        <motion.div key={i} className="flex items-center gap-3"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.15 }}>
                                            <div className={`size-6 rounded-full flex items-center justify-center shrink-0 ${
                                                s.done ? 'bg-[#46D369]' : isActive ? 'bg-[#E50914]' : 'bg-[#1A1A1A]'
                                            }`}>
                                                {s.done ? (
                                                    <span className="material-symbols-outlined text-white" style={{ fontSize: 14 }}>check</span>
                                                ) : isActive ? (
                                                    <div className="size-3 border border-white/60 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-[#B3B3B3]" style={{ fontSize: 13 }}>{s.icon}</span>
                                                )}
                                            </div>
                                            <span className={`text-xs font-medium ${s.done ? 'text-[#46D369]' : isActive ? 'text-white' : 'text-[#B3B3B3]'}`}>
                                                {s.label}
                                                {isActive && <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>...</motion.span>}
                                            </span>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Waveform */}
                            <div className="flex gap-0.5 relative z-10">
                                {Array.from({ length: 20 }, (_, i) => (
                                    <motion.div key={i} className="w-[3px] rounded-full"
                                        style={{ backgroundColor: i < 10 ? '#E5091480' : '#E87C0360' }}
                                        animate={{ height: [4, 8 + Math.random() * 16, 4] }}
                                        transition={{ duration: 0.6 + Math.random() * 0.5, repeat: Infinity, delay: i * 0.05 }} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Ready: Presentation Player ── */}
            {status === 'ready' && slides.length > 0 && (
                <>
                    <PresentationPlayer slides={slides} conceptName={conceptName} />
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-[#333333] p-4 flex items-start gap-4 bg-[#1E1E1E]"
                    >
                        <div className="size-10 rounded-lg bg-gradient-to-br from-[#E50914]/15 to-[#E87C03]/10 border border-[#E50914]/20 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 20 }}>slideshow</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-[#E5E5E5]">Episode: {conceptName}</h3>
                            <p className="text-xs text-[#B3B3B3] mt-0.5">AI-generated presentation with {slides.length} animated slides and synchronized voice narration by LearnFlix.</p>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-[10px] text-[#808080] flex items-center gap-1">
                                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>schedule</span>
                                    Generated in {formatTime(elapsed)}
                                </span>
                                <span className="text-[10px] text-[#808080] flex items-center gap-1">
                                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>timer</span>
                                    ~{formatTime(estimatedDuration)} presentation
                                </span>
                                <span className="text-[10px] text-[#808080] flex items-center gap-1">
                                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>layers</span>
                                    {slides.length} slides
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}

            {/* ── Error State ── */}
            {status === 'error' && (
                <div className="rounded-2xl overflow-hidden border border-[#333333] shadow-lg bg-[#1E1E1E]">
                    <div className="aspect-video relative bg-[#141414] flex flex-col items-center justify-center gap-4">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="size-16 rounded-full bg-[#E50914]/15 flex items-center justify-center"
                        >
                            <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 32 }}>error_outline</span>
                        </motion.div>
                        <div className="text-center max-w-sm">
                            <p className="text-white font-semibold text-sm mb-1">Presentation generation failed</p>
                            <p className="text-[#808080] text-xs">{errorMsg}</p>
                        </div>
                        <button onClick={retry}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E50914] to-[#E87C03] text-white text-sm font-bold hover:brightness-110 transition-all shadow-[0_0_20px_rgba(193,124,100,0.3)]">
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
                            Regenerate Presentation
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Mastery Checkpoint Overlay ─────────────────────────────────────────────────

function MasteryCheckpoint({ isOpen, masteryPct, xpEarned, onNextEpisode, onBackToConstellation }) {
    const circumference = 2 * Math.PI * 54;
    const mastered = masteryPct >= 80;
    const [countdown, setCountdown] = useState(15);
    const [confetti] = useState(() =>
        Array.from({ length: 60 }, () => ({
            x: Math.random() * 100,
            delay: Math.random() * 2,
            dur: 2 + Math.random() * 3,
            size: 4 + Math.random() * 8,
            color: ['#E50914', '#E87C03', '#46D369', '#5DADE2', '#AF7AC5', '#F4D03F', '#FFFFFF'][Math.floor(Math.random() * 7)],
            rotate: Math.random() * 360,
            type: Math.random() > 0.5 ? 'rect' : 'circle',
        }))
    );

    // Auto-play countdown
    useEffect(() => {
        if (!isOpen) return;
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) { clearInterval(timer); onNextEpisode(); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isOpen, onNextEpisode]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-xl"
            >
                {/* ═══ Confetti particles ═══ */}
                {mastered && confetti.map((c, i) => (
                    <motion.div key={i}
                        className="absolute pointer-events-none z-[61]"
                        style={{
                            left: `${c.x}%`, top: '-5%',
                            width: c.type === 'rect' ? c.size : c.size,
                            height: c.type === 'rect' ? c.size * 0.6 : c.size,
                            backgroundColor: c.color,
                            borderRadius: c.type === 'circle' ? '50%' : '2px',
                        }}
                        initial={{ y: 0, opacity: 0, rotate: 0 }}
                        animate={{
                            y: [0, window?.innerHeight || 800],
                            opacity: [0, 1, 1, 0],
                            rotate: [c.rotate, c.rotate + 360 + Math.random() * 720],
                            x: [0, (Math.random() - 0.5) * 200],
                        }}
                        transition={{ duration: c.dur, delay: c.delay, ease: 'easeIn', repeat: 2, repeatDelay: 1 }}
                    />
                ))}

                {/* ═══ Glow rings behind ═══ */}
                <motion.div className="absolute w-[400px] h-[400px] rounded-full"
                    style={{ background: `radial-gradient(circle, ${mastered ? 'rgba(70,211,105,0.1)' : 'rgba(229,9,20,0.1)'}, transparent 70%)` }}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity }} />

                <motion.div
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 150, delay: 0.1 }}
                    className="flex flex-col items-center gap-6 text-center max-w-lg mx-4 relative z-[62]"
                >
                    {/* Netflix-style "Episode Complete" text */}
                    <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                        <p className="text-[#E50914] text-xs font-bold uppercase tracking-[0.3em] mb-1">LEARNFLIX</p>
                        <h1 className="text-4xl md:text-5xl font-black text-white">
                            {mastered ? 'Episode Complete!' : 'Keep Pushing!'}
                        </h1>
                    </motion.div>

                    {/* Circular progress — larger, more dramatic */}
                    <motion.div className="relative" initial={{ scale: 0 }} animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.4, stiffness: 200 }}>
                        <svg width="160" height="160" viewBox="0 0 160 160">
                            <circle cx="80" cy="80" r="60" fill="none" stroke="#2E2E2E" strokeWidth="6" />
                            <motion.circle cx="80" cy="80" r="60" fill="none"
                                stroke={mastered ? '#46D369' : '#E87C03'}
                                strokeWidth="6" strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 60}
                                initial={{ strokeDashoffset: 2 * Math.PI * 60 }}
                                animate={{ strokeDashoffset: 2 * Math.PI * 60 * (1 - masteryPct / 100) }}
                                transition={{ duration: 2, ease: 'easeOut', delay: 0.6 }}
                                transform="rotate(-90 80 80)" />
                        </svg>
                        <motion.div className="absolute inset-0 flex flex-col items-center justify-center"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
                            <span className="text-4xl font-black text-white">{Math.round(masteryPct)}%</span>
                            <span className="text-[10px] text-[#808080] uppercase tracking-wider font-bold">Mastery</span>
                        </motion.div>
                    </motion.div>

                    {/* Stats row */}
                    <motion.div className="flex items-center gap-6"
                        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.0 }}>
                        <div className="flex items-center gap-2 bg-[#E50914]/15 border border-[#E50914]/30 rounded-full px-5 py-2.5">
                            <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>star</span>
                            <span className="text-[#E50914] font-bold text-lg">+{xpEarned} XP</span>
                        </div>
                        {mastered && (
                            <div className="flex items-center gap-2 bg-[#46D369]/15 border border-[#46D369]/30 rounded-full px-5 py-2.5">
                                <span className="material-symbols-outlined text-[#46D369]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                                <span className="text-[#46D369] font-bold">Mastered!</span>
                            </div>
                        )}
                    </motion.div>

                    {/* Next episode auto-play countdown (Netflix style) */}
                    <motion.div className="w-full max-w-sm"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
                        <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="relative size-10">
                                    <svg width="40" height="40" viewBox="0 0 40 40">
                                        <circle cx="20" cy="20" r="16" fill="none" stroke="#333" strokeWidth="3" />
                                        <motion.circle cx="20" cy="20" r="16" fill="none" stroke="#E50914" strokeWidth="3"
                                            strokeLinecap="round" strokeDasharray={2 * Math.PI * 16}
                                            animate={{ strokeDashoffset: [0, 2 * Math.PI * 16] }}
                                            transition={{ duration: 15, ease: 'linear' }}
                                            transform="rotate(-90 20 20)" />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">{countdown}</span>
                                </div>
                                <div>
                                    <p className="text-white text-sm font-semibold">Next Episode</p>
                                    <p className="text-[#808080] text-[10px]">Auto-playing in {countdown}s</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={onBackToConstellation}
                                    className="text-[#808080] hover:text-white text-xs font-bold px-3 py-2 rounded hover:bg-white/10 transition-all">
                                    Cancel
                                </button>
                                <button onClick={onNextEpisode}
                                    className="bg-white text-black font-bold text-xs px-4 py-2 rounded hover:bg-white/90 flex items-center gap-1">
                                    <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                                    Play Now
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ─── Mermaid Diagram ────────────────────────────────────────────────────────────

function MermaidDiagram({ chart, id }) {
    const [svg, setSvg] = useState('');

    useEffect(() => {
        if (!chart) return;
        let cancelled = false;
        import('mermaid').then(({ default: mermaid }) => {
            mermaid.initialize({
                startOnLoad: false,
                theme: 'default',
                themeVariables: {
                    primaryColor: '#E50914',
                    primaryTextColor: '#E5E5E5',
                    primaryBorderColor: '#E50914',
                    lineColor: '#333333',
                    secondaryColor: '#2A2A2A',
                    tertiaryColor: '#333333',
                    fontFamily: 'Manrope, sans-serif',
                    fontSize: '14px',
                    background: '#141414',
                    mainBkg: '#2A2A2A',
                    nodeBorder: '#E50914',
                },
            });
            const diagId = `mermaid-${id}-${Date.now()}`;
            mermaid.render(diagId, chart).then(({ svg: rendered }) => {
                if (!cancelled) setSvg(rendered);
            }).catch(() => {
                if (!cancelled) setSvg('');
            });
        });
        return () => { cancelled = true; };
    }, [chart, id]);

    if (!chart) return null;
    if (!svg) return (
        <div className="flex items-center justify-center h-32 text-[#808080] text-sm">
            <span className="material-symbols-outlined animate-spin mr-2" style={{ fontSize: 18 }}>progress_activity</span>
            Rendering diagram...
        </div>
    );

    return (
        <div
            className="my-4 p-4 bg-[#2A2A2A] rounded-xl border border-border-dark overflow-x-auto flex justify-center [&_svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}

// ─── Content Section ────────────────────────────────────────────────────────────

function ContentSection({ episode }) {
    const sections = episode.sections || [];
    const hasStructuredSections = sections.length > 0;

    if (hasStructuredSections) {
        return (
            <div className="space-y-6">
                {sections.map((section, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + idx * 0.08 }}
                        className="rounded-xl border border-border-dark overflow-hidden bg-card-dark"
                    >
                        <div className="px-6 py-4 flex items-center gap-3 border-b border-border-dark bg-[#141414]/50">
                            <div className="size-7 rounded-full bg-[#E50914]/15 flex items-center justify-center text-[#E50914] font-bold text-xs">
                                {idx + 1}
                            </div>
                            <h3 className="text-base font-semibold text-[#E5E5E5]">{section.title || `Section ${idx + 1}`}</h3>
                        </div>
                        <div className="p-6">
                            {section.diagram && <MermaidDiagram chart={section.diagram} id={`sec-${idx}`} />}
                            <div
                                className="prose-prime max-w-none"
                                dangerouslySetInnerHTML={{ __html: typeof section === 'string' ? section : (section.content || '') }}
                            />
                        </div>
                    </motion.div>
                ))}
            </div>
        );
    }

    // Fallback: raw HTML content
    if (episode.content) {
        return (
            <div
                className="prose-prime max-w-none"
                dangerouslySetInnerHTML={{ __html: episode.content.replace(/\n/g, '<br/>') }}
            />
        );
    }

    return <p className="text-[#808080]">Content loading...</p>;
}

// ─── Code Section — SQL-only or multi-language based on topic ────────────────────

const DSA_LANGS = {
    python: { label: 'Python 3', ext: 'main.py', color: '#3572A5' },
    cpp:    { label: 'C++',      ext: 'main.cpp', color: '#f34b7d' },
    java:   { label: 'Java',     ext: 'Main.java', color: '#b07219' },
};

function CodeSection({ episode, problem, problemType, onCodeError, onCodeSuccess, onCodeChange }) {
    const isSql = problemType === 'sql';
    const languages = isSql ? ['sql'] : Object.keys(DSA_LANGS);
    const [lang, setLang] = useState(isSql ? 'sql' : 'python');

    const getStarter = (l) => {
        if (!problem) return isSql ? '-- Write your SQL query here\n' : '# Write your solution here\n';
        if (isSql) return problem.starter_code || '-- Write your SQL query here\n';
        return problem.starters?.[l] || '# Write your solution here\n';
    };

    const [codeByLang, setCodeByLang] = useState(() => {
        const initial = {};
        languages.forEach(l => { initial[l] = getStarter(l); });
        return initial;
    });
    const [output, setOutput] = useState('');
    const [running, setRunning] = useState(false);

    const code = codeByLang[lang] || getStarter(lang);
    const setCode = (val) => {
        setCodeByLang(prev => ({ ...prev, [lang]: val }));
        onCodeChange?.(val);
    };

    const handleRun = async () => {
        setRunning(true);
        setOutput('');
        const execLang = lang === 'cpp' ? 'cpp' : lang;
        const stdin = problem?.sample_input || '';
        const { data, error } = await executeCode({ code, language: execLang, stdin });
        if (error) {
            setOutput(`Error: ${error}`);
            onCodeError?.();
        } else {
            setOutput(data.error ? `Error:\n${data.error}` : data.output || 'Success (no output)');
            if (data.error) {
                onCodeError?.();
            } else {
                onCodeSuccess?.();
                const learnerId = getLearnerId();
                if (learnerId) {
                    updateBKT({ learner_id: learnerId, concept_id: episode.concept_id, is_correct: true });
                }
            }
        }
        setRunning(false);
    };

    const handleReset = () => {
        setCode(getStarter(lang));
        setOutput('');
    };

    const fileName = isSql ? 'query.sql' : (DSA_LANGS[lang]?.ext || 'main.py');

    return (
        <div className="rounded-xl border border-border-dark overflow-hidden bg-card-dark">
            {/* Toolbar */}
            <div className="flex items-center justify-between bg-[#2A2A2A] border-b border-border-dark px-3 py-2 gap-2 flex-wrap">
                {/* Language tabs — only show for DSA */}
                <div className="flex items-center gap-1">
                    {isSql ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#E50914]/15 text-[#E50914] border border-[#E50914]/30">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>database</span>
                            SQL
                        </div>
                    ) : (
                        languages.map(key => (
                            <button
                                key={key}
                                onClick={() => setLang(key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    lang === key
                                        ? 'bg-[#46D369]/15 text-[#46D369] border border-[#46D369]/30'
                                        : 'text-[#808080] hover:text-[#E5E5E5] border border-transparent hover:border-border-dark'
                                }`}
                            >
                                <span className="size-2 rounded-full" style={{ background: DSA_LANGS[key].color }} />
                                {DSA_LANGS[key].label}
                            </button>
                        ))
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[#808080] hover:text-[#E5E5E5] text-xs border border-transparent hover:border-border-dark transition-all"
                        title="Reset to template"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>restart_alt</span>
                        Reset
                    </button>
                    <button
                        onClick={handleRun}
                        disabled={running}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#46D369] text-white text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50"
                    >
                        {running ? (
                            <span className="material-symbols-outlined animate-spin" style={{ fontSize: 14 }}>progress_activity</span>
                        ) : (
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>play_arrow</span>
                        )}
                        {running ? 'Running...' : 'Run Code'}
                    </button>
                </div>
            </div>

            {/* File name bar */}
            <div className="flex items-center gap-2 px-4 py-1.5 bg-[#2A2A2A] border-b border-border-dark">
                <span className="material-symbols-outlined text-[#46D369]" style={{ fontSize: 14 }}>description</span>
                <span className="text-xs font-mono text-[#808080]">{fileName}</span>
            </div>

            {/* Editor with line numbers */}
            <div className="relative">
                <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-[#2A2A2A] text-[#E5E5E5] p-5 pl-14 font-mono text-sm resize-none focus:outline-none min-h-[320px] leading-6"
                    spellCheck="false"
                    style={{ tabSize: 4 }}
                    onKeyDown={(e) => {
                        if (e.key === 'Tab') {
                            e.preventDefault();
                            const start = e.target.selectionStart;
                            const end = e.target.selectionEnd;
                            const spaces = '    ';
                            setCode(code.substring(0, start) + spaces + code.substring(end));
                            setTimeout(() => {
                                e.target.selectionStart = e.target.selectionEnd = start + 4;
                            }, 0);
                        }
                    }}
                />
                <div className="absolute top-0 left-0 w-10 h-full bg-[#2A2A2A] border-r border-border-dark pointer-events-none">
                    <div className="p-5 pr-2 font-mono text-xs text-[#B3B3B3] leading-6 text-right select-none">
                        {code.split('\n').map((_, i) => (
                            <div key={i}>{i + 1}</div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Output console */}
            <div className="border-t border-border-dark bg-[#141414]">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-border-dark">
                    <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 14 }}>terminal</span>
                    <span className="text-xs text-[#E50914] font-mono font-bold">Output</span>
                    {output && (
                        <button onClick={() => setOutput('')} className="ml-auto text-[#808080] hover:text-[#B3B3B3] transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                        </button>
                    )}
                </div>
                <div className={`p-4 font-mono text-sm min-h-[80px] whitespace-pre-wrap max-h-[200px] overflow-y-auto ${
                    output.startsWith('Error') ? 'text-red-400' : 'text-[#B3B3B3]'
                }`}>
                    {output || 'No output yet. Click "Run Code" to execute.'}
                </div>
            </div>
        </div>
    );
}

// ─── PDF/PPT Upload & AI Notes Generator (S3 upload → server-side extraction) ────

function UploadNotesSection({ topic }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [generatedNotes, setGeneratedNotes] = useState(null);
    const [error, setError] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef(null);

    const handleFile = async (selectedFile) => {
        setError(null);
        setGeneratedNotes(null);
        const ext = selectedFile.name.split('.').pop().toLowerCase();
        if (!['pdf', 'ppt', 'pptx'].includes(ext)) {
            setError('Please upload a PDF or PPT/PPTX file.');
            return;
        }
        if (selectedFile.size > 10 * 1024 * 1024) {
            setError('File too large. Max 10MB.');
            return;
        }
        setFile(selectedFile);
    };

    const handleGenerate = async () => {
        if (!file) return;
        setUploading(true);
        setError(null);
        try {
            // Step 1: Get presigned S3 upload URL
            const { data: urlData, error: urlErr } = await getUploadUrl(file.name);
            if (urlErr || !urlData?.upload_url) {
                setError('Failed to get upload URL: ' + (urlErr || 'Unknown error'));
                setUploading(false);
                return;
            }

            // Step 2: Upload file directly to S3
            await fetch(urlData.upload_url, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': 'application/octet-stream' },
            });

            // Step 3: Call backend to extract text & generate notes
            const { data, error: apiErr } = await generateNotesFromUpload({
                s3_key: urlData.s3_key,
                file_name: file.name,
                topic: topic || '',
            });

            if (apiErr) {
                setError(typeof apiErr === 'string' ? apiErr : JSON.stringify(apiErr));
            } else if (data?.notes) {
                setGeneratedNotes({ html: data.notes, source: file.name });
            } else {
                setError('No notes were generated. Please try again.');
            }
        } catch (e) {
            setError('Failed to process file: ' + e.message);
        }
        setUploading(false);
    };

    return (
        <div className="mt-8">
            {/* Upload Card */}
            <div className="bg-card-dark border border-border-dark rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-[#a855f7]" style={{ fontSize: 22 }}>upload_file</span>
                    <h3 className="text-base font-bold text-[#E5E5E5]">Upload Your Notes</h3>
                    <span className="text-xs text-[#808080] ml-2">PDF, PPT, PPTX</span>
                </div>
                <p className="text-sm text-[#B3B3B3] mb-4">Upload your lecture slides or PDFs and our AI will generate comprehensive study notes for you.</p>

                {/* Drop Zone */}
                <div
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                        dragOver ? 'border-[#a855f7] bg-[#a855f7]/10' :
                        file ? 'border-emerald-500/50 bg-emerald-500/5' :
                        'border-border-dark hover:border-[#333333] hover:bg-[#E5E5E5]/[0.05]'
                    }`}
                >
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.ppt,.pptx"
                        className="hidden"
                        onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
                    />
                    {file ? (
                        <div className="flex items-center justify-center gap-3">
                            <span className="material-symbols-outlined text-emerald-400" style={{ fontSize: 28 }}>description</span>
                            <div className="text-left">
                                <p className="text-sm font-semibold text-[#E5E5E5]">{file.name}</p>
                                <p className="text-xs text-[#808080]">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setFile(null); setGeneratedNotes(null); }} className="ml-4 text-[#808080] hover:text-red-400 transition-colors">
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                            </button>
                        </div>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-[#808080] mb-2" style={{ fontSize: 40 }}>cloud_upload</span>
                            <p className="text-sm text-[#B3B3B3]">Drop your file here or <span className="text-[#a855f7] font-semibold">browse</span></p>
                            <p className="text-xs text-[#808080] mt-1">PDF, PPT, PPTX up to 20MB</p>
                        </>
                    )}
                </div>

                {/* Generate Button */}
                {file && !generatedNotes && (
                    <button
                        onClick={handleGenerate}
                        disabled={uploading}
                        className="mt-4 w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-[#a855f7] text-white hover:bg-[#9333ea] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploading ? (
                            <>
                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Generating Notes...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>
                                Generate AI Notes
                            </>
                        )}
                    </button>
                )}

                {error && (
                    <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
                )}
            </div>

            {/* Generated Notes Display */}
            {generatedNotes && (
                <div className="mt-6 bg-card-dark border border-border-dark rounded-xl p-6 lg:p-8">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#a855f7]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                            <h3 className="text-base font-bold text-[#E5E5E5]">AI-Generated Notes</h3>
                        </div>
                        <span className="text-xs text-[#808080] bg-[#a855f7]/10 border border-[#a855f7]/20 px-2 py-1 rounded-full">
                            from {generatedNotes.source}
                        </span>
                    </div>
                    <div
                        className="prose prose-sm max-w-none text-[#E5E5E5] leading-relaxed
                            [&_h2]:text-[#E5E5E5] [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3
                            [&_h3]:text-[#E5E5E5] [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2
                            [&_ul]:space-y-1 [&_li]:text-[#E5E5E5]
                            [&_strong]:text-[#E5E5E5] [&_code]:text-[#46D369] [&_code]:bg-[#46D369]/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded"
                        dangerouslySetInnerHTML={{ __html: generatedNotes.html }}
                    />
                </div>
            )}
        </div>
    );
}

// ─── Code Lab Tab — 5 problems in sequence (2E, 2M, 1H) ─────────────────────────

function CodeLabTab({ episode, conceptId, problems, problemType, onCodeError, onCodeSuccess, onCodeChange }) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [completed, setCompleted] = useState({});
    const total = problems.length;
    const currentProblem = problems[currentIdx];
    const diffColor = { Easy: '#22c55e', Medium: '#E87C03', Hard: '#ef4444' };

    if (!currentProblem) return <div className="text-[#808080] text-center py-10">No problems available for this topic.</div>;

    return (
        <motion.div
            key="code"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
        >
            {/* Progress bar — problem navigator */}
            <div className="bg-card-dark border border-border-dark rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[#808080] font-semibold uppercase tracking-wider">
                        Problem {currentIdx + 1} of {total}
                    </span>
                    <span className="text-xs text-[#808080]">
                        {Object.keys(completed).length}/{total} solved
                    </span>
                </div>
                <div className="flex gap-1.5">
                    {problems.map((p, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentIdx(i)}
                            className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                                i === currentIdx
                                    ? 'text-[#E5E5E5] border-2'
                                    : completed[i]
                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-[#2A2A2A] text-[#808080] border border-border-dark hover:border-[#333333]'
                            }`}
                            style={i === currentIdx ? {
                                borderColor: diffColor[p.difficulty],
                                background: `${diffColor[p.difficulty]}15`,
                                color: diffColor[p.difficulty],
                            } : {}}
                        >
                            {completed[i] && <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check</span>}
                            Q{i + 1}
                            <span className="hidden sm:inline">· {p.difficulty[0]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Problem Statement */}
            <div className="bg-card-dark border border-border-dark rounded-xl p-6 mb-5">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-[#46D369]" style={{ fontSize: 20 }}>description</span>
                    <h3 className="text-base font-bold text-[#E5E5E5]">{currentProblem.title}</h3>
                    <span className={`ml-auto text-xs px-2.5 py-0.5 rounded-full font-semibold border`}
                        style={{
                            background: `${diffColor[currentProblem.difficulty]}15`,
                            color: diffColor[currentProblem.difficulty],
                            borderColor: `${diffColor[currentProblem.difficulty]}40`,
                        }}
                    >
                        {currentProblem.difficulty}
                    </span>
                </div>

                <div
                    className="text-sm text-[#E5E5E5] leading-relaxed mb-4 [&_code]:bg-[#2A2A2A] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[#E50914] [&_code]:font-mono [&_code]:text-xs [&_b]:text-[#E5E5E5] [&_b]:font-semibold [&_pre]:bg-[#2A2A2A] [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:my-2 [&_pre]:border [&_pre]:border-border-dark [&_pre]:font-mono [&_pre]:text-xs [&_pre]:text-[#B3B3B3] [&_ul]:space-y-1 [&_ul]:my-2 [&_ul]:ml-4 [&_ul]:list-disc [&_li]:text-[#B3B3B3]"
                    dangerouslySetInnerHTML={{ __html: currentProblem.description }}
                />

                {currentProblem.input_format && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                            <h4 className="text-xs font-bold text-[#46D369] uppercase tracking-wider mb-2">Input Format</h4>
                            <p className="text-xs text-[#B3B3B3] whitespace-pre-line">{currentProblem.input_format}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-[#46D369] uppercase tracking-wider mb-2">Output Format</h4>
                            <p className="text-xs text-[#B3B3B3] whitespace-pre-line">{currentProblem.output_format}</p>
                        </div>
                    </div>
                )}

                {/* Sample I/O */}
                <div className="mt-5 pt-4 border-t border-border-dark">
                    <h4 className="text-xs font-bold text-[#E87C03] uppercase tracking-wider mb-3">Sample</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#2A2A2A] rounded-lg p-3 border border-border-dark">
                            <span className="text-[10px] text-[#808080] uppercase tracking-wider font-bold">Input</span>
                            <pre className="text-xs text-[#E5E5E5] font-mono mt-1 whitespace-pre-wrap">{currentProblem.sample_input}</pre>
                        </div>
                        <div className="bg-[#2A2A2A] rounded-lg p-3 border border-border-dark">
                            <span className="text-[10px] text-[#808080] uppercase tracking-wider font-bold">Output</span>
                            <pre className="text-xs text-[#46D369] font-mono mt-1 whitespace-pre-wrap">{currentProblem.sample_output}</pre>
                        </div>
                    </div>
                    {currentProblem.explanation && (
                        <p className="mt-2 text-xs text-[#808080] italic">{currentProblem.explanation}</p>
                    )}
                </div>
            </div>

            {/* Code Editor */}
            <CodeSection
                episode={{ ...episode, concept_id: conceptId }}
                problem={currentProblem}
                problemType={problemType}
                onCodeError={onCodeError}
                onCodeSuccess={onCodeSuccess}
                onCodeChange={onCodeChange}
                onSuccess={() => {
                    setCompleted(prev => ({ ...prev, [currentIdx]: true }));
                    // Auto-advance after short delay
                    if (currentIdx < total - 1) {
                        setTimeout(() => setCurrentIdx(currentIdx + 1), 1000);
                    }
                }}
            />

            {/* Navigation */}
            <div className="flex justify-between mt-5">
                <button
                    onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                    disabled={currentIdx === 0}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border-dark text-[#B3B3B3] text-sm disabled:opacity-30 hover:border-[#333333] transition-all"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                    Previous
                </button>
                <button
                    onClick={() => setCurrentIdx(Math.min(total - 1, currentIdx + 1))}
                    disabled={currentIdx === total - 1}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#46D369]/15 text-[#46D369] text-sm font-semibold border border-[#46D369]/30 disabled:opacity-30 hover:bg-[#46D369]/25 transition-all"
                >
                    Next
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                </button>
            </div>
        </motion.div>
    );
}

// ─── Quiz / Activities Section ──────────────────────────────────────────────────

function QuizSection({ activities, conceptId, onCorrect, onIncorrect }) {
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [results, setResults] = useState({});
    const [textAnswers, setTextAnswers] = useState({});

    if (!activities || activities.length === 0) return null;

    const handleSelect = (actIdx, optIdx, activity) => {
        if (results[actIdx] !== undefined) return;

        setSelectedAnswers(prev => ({ ...prev, [actIdx]: optIdx }));

        const options = activity.options || activity.choices || [];
        const correctAnswer = activity.correct_answer ?? activity.answer ?? activity.correct ?? null;
        const isCorrect = correctAnswer !== null
            ? (typeof correctAnswer === 'number' ? optIdx === correctAnswer : options[optIdx] === correctAnswer)
            : false;

        setResults(prev => ({ ...prev, [actIdx]: isCorrect }));

        if (isCorrect) {
            onCorrect?.();
            const learnerId = getLearnerId();
            if (learnerId) {
                updateBKT({ learner_id: learnerId, concept_id: conceptId, is_correct: true });
            }
        } else {
            onIncorrect?.();
        }
    };

    const handleFillBlankSubmit = (actIdx, activity) => {
        if (results[actIdx] !== undefined) return;
        const userAnswer = (textAnswers[actIdx] || '').trim().toLowerCase();
        const correctAnswer = String(activity.correct_answer ?? activity.answer ?? activity.correct ?? '').trim().toLowerCase();
        const isCorrect = userAnswer === correctAnswer;
        setResults(prev => ({ ...prev, [actIdx]: isCorrect }));
        if (isCorrect) {
            onCorrect?.();
            const learnerId = getLearnerId();
            if (learnerId) updateBKT({ learner_id: learnerId, concept_id: conceptId, is_correct: true });
        } else {
            onIncorrect?.();
        }
    };

    const totalAnswered = Object.keys(results).length;
    const totalCorrect = Object.values(results).filter(Boolean).length;
    const allDone = totalAnswered === activities.length;
    const score = allDone ? Math.round((totalCorrect / activities.length) * 100) : 0;

    const typeIcon = { mcq: 'radio_button_checked', fill_blank: 'edit_note', true_false: 'check_circle', coding: 'code' };
    const typeLabel = { mcq: 'MCQ', fill_blank: 'Fill in the Blank', true_false: 'True / False', coding: 'Coding' };

    return (
        <div className="space-y-5">
            {/* Progress bar */}
            <div className="bg-card-dark border border-border-dark rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-[#E5E5E5] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#E87C03]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>quiz</span>
                        Assessment
                    </h3>
                    <span className="text-xs text-[#808080]">{totalAnswered}/{activities.length} answered</span>
                </div>
                <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div className="h-full bg-[#E87C03] rounded-full transition-all duration-500" style={{ width: `${(totalAnswered / activities.length) * 100}%` }} />
                </div>
            </div>

            {activities.map((act, actIdx) => {
                const type = (act.type || 'mcq').toLowerCase();
                const options = act.options || act.choices || [];
                const correctAnswer = act.correct_answer ?? act.answer ?? act.correct ?? null;
                const hasResult = results[actIdx] !== undefined;
                const explanation = act.explanation || '';

                return (
                    <motion.div
                        key={actIdx}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: actIdx * 0.05 }}
                        className="bg-card-dark border border-border-dark rounded-xl p-5"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#E87C03]/10 text-[#E87C03] border border-[#E87C03]/20">
                                {typeLabel[type] || type}
                            </span>
                            <span className="text-xs text-[#808080]">Q{actIdx + 1}</span>
                            {hasResult && (
                                <span className={`ml-auto material-symbols-outlined ${results[actIdx] ? 'text-emerald-400' : 'text-red-400'}`} style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
                                    {results[actIdx] ? 'check_circle' : 'cancel'}
                                </span>
                            )}
                        </div>

                        <p className="text-[#E5E5E5] font-medium text-sm mb-4">
                            {act.question || act.prompt || act.title || `Question ${actIdx + 1}`}
                        </p>

                        {/* MCQ / True-False options */}
                        {(type === 'mcq' || type === 'true_false') && options.length > 0 && (
                            <div className="space-y-2">
                                {options.map((opt, optIdx) => {
                                    const optText = typeof opt === 'string' ? opt : opt.text || opt.label || String(opt);
                                    const isSelected = selectedAnswers[actIdx] === optIdx;
                                    const isCorrectOpt = correctAnswer !== null
                                        ? (typeof correctAnswer === 'number' ? optIdx === correctAnswer : opt === correctAnswer)
                                        : false;

                                    let cls = 'border-border-dark hover:border-[#E50914]/40 text-[#B3B3B3] hover:text-[#E5E5E5]';
                                    if (hasResult && isSelected && isCorrectOpt) cls = 'border-emerald-500 bg-emerald-500/10 text-emerald-400';
                                    else if (hasResult && isSelected && !isCorrectOpt) cls = 'border-red-500 bg-red-500/10 text-red-400';
                                    else if (hasResult && isCorrectOpt) cls = 'border-emerald-500/40 text-emerald-400/70';

                                    return (
                                        <button key={optIdx} onClick={() => handleSelect(actIdx, optIdx, act)} disabled={hasResult}
                                            className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all disabled:cursor-default ${cls}`}>
                                            <span className="flex items-center gap-3">
                                                <span className="size-6 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0">
                                                    {String.fromCharCode(65 + optIdx)}
                                                </span>
                                                {optText}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Fill in the blank */}
                        {type === 'fill_blank' && !options.length && (
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <input type="text" value={textAnswers[actIdx] || ''}
                                        onChange={(e) => setTextAnswers(prev => ({ ...prev, [actIdx]: e.target.value }))}
                                        disabled={hasResult} placeholder="Type your answer..."
                                        className={`flex-1 px-4 py-3 rounded-lg border bg-[#2A2A2A] text-sm font-mono focus:outline-none transition-all ${
                                            results[actIdx] === true ? 'border-emerald-500 text-emerald-400' :
                                            results[actIdx] === false ? 'border-red-500 text-red-400' :
                                            'border-border-dark text-[#E5E5E5] focus:border-[#a855f7]/60'
                                        }`}
                                        onKeyDown={(e) => e.key === 'Enter' && handleFillBlankSubmit(actIdx, act)}
                                    />
                                    <button onClick={() => handleFillBlankSubmit(actIdx, act)}
                                        disabled={hasResult || !textAnswers[actIdx]?.trim()}
                                        className="px-5 py-3 rounded-lg bg-[#a855f7] text-white text-sm font-bold disabled:opacity-40 disabled:cursor-default hover:brightness-110 transition-all">
                                        Submit
                                    </button>
                                </div>
                                {hasResult && (
                                    <div className={`flex items-center gap-2 text-sm ${results[actIdx] ? 'text-emerald-400' : 'text-red-400'}`}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{results[actIdx] ? 'check_circle' : 'cancel'}</span>
                                        {results[actIdx] ? 'Correct!' : `Incorrect. Answer: ${correctAnswer}`}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Coding redirect */}
                        {type === 'coding' && !options.length && (
                            <p className="text-[#B3B3B3] text-sm italic">Head to the Code Lab tab to solve this in the editor.</p>
                        )}

                        {/* Explanation after answering */}
                        {hasResult && explanation && (
                            <div className="mt-3 pt-3 border-t border-border-dark">
                                <p className="text-xs text-[#B3B3B3] flex items-start gap-1.5">
                                    <span className="material-symbols-outlined text-[#E50914] shrink-0" style={{ fontSize: 14, marginTop: 2 }}>lightbulb</span>
                                    {explanation}
                                </p>
                            </div>
                        )}
                    </motion.div>
                );
            })}

            {/* ── Feedback Summary — shown when all questions answered ── */}
            {allDone && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card-dark border border-border-dark rounded-xl p-6"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`size-14 rounded-full flex items-center justify-center text-xl font-black ${
                            score >= 80 ? 'bg-emerald-500/15 text-emerald-400 border-2 border-emerald-500/30' :
                            score >= 50 ? 'bg-[#E87C03]/15 text-[#E87C03] border-2 border-[#E87C03]/30' :
                            'bg-red-500/15 text-red-400 border-2 border-red-500/30'
                        }`}>
                            {score}%
                        </div>
                        <div>
                            <h3 className="text-[#E5E5E5] font-bold text-base">
                                {score >= 80 ? 'Excellent work!' : score >= 50 ? 'Good effort!' : 'Keep practicing!'}
                            </h3>
                            <p className="text-[#B3B3B3] text-sm">
                                You got {totalCorrect} out of {activities.length} correct
                            </p>
                        </div>
                    </div>

                    {/* Areas to focus on */}
                    {totalCorrect < activities.length && (
                        <div className="mt-4 pt-4 border-t border-border-dark">
                            <h4 className="text-xs font-bold text-[#E50914] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>target</span>
                                Areas to Focus On
                            </h4>
                            <ul className="space-y-2">
                                {activities.map((act, idx) => (
                                    results[idx] === false && (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-[#B3B3B3]">
                                            <span className="material-symbols-outlined text-red-400 shrink-0" style={{ fontSize: 14, marginTop: 3 }}>close</span>
                                            <span>
                                                <span className="text-[#E5E5E5] font-medium">Q{idx + 1}:</span>{' '}
                                                {act.explanation || (act.question || '').slice(0, 80)}
                                            </span>
                                        </li>
                                    )
                                ))}
                            </ul>
                        </div>
                    )}

                    {score >= 80 && (
                        <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <p className="text-sm text-emerald-400 flex items-center gap-2">
                                <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                                Great mastery! You're ready to move to the next topic.
                            </p>
                        </div>
                    )}
                    {score < 50 && (
                        <div className="mt-4 p-3 rounded-lg bg-[#E87C03]/10 border border-[#E87C03]/20">
                            <p className="text-sm text-[#E87C03] flex items-center gap-2">
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>menu_book</span>
                                Revisit the Notes tab to strengthen your understanding before moving on.
                            </p>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}

// ─── Assessment Loader — uses backend activities or generates on demand ──────────

function AssessmentLoader({ activities, conceptId, conceptName, episodeContent, learnerId, onCorrect, onIncorrect }) {
    // If backend provided activities, use them directly
    const finalActivities = (activities && activities.length > 0)
        ? activities
        : generateAssessmentQuestions(conceptName);

    return <QuizSection activities={finalActivities} conceptId={conceptId} onCorrect={onCorrect} onIncorrect={onIncorrect} />;
}

// Generate fallback assessment questions for a concept
function generateAssessmentQuestions(conceptName) {
    return [
        {
            type: 'mcq',
            question: `What is the primary purpose of ${conceptName} in programming?`,
            options: [
                'To define the structure and rules of code',
                'To optimize runtime performance',
                'To handle error management',
                'To manage memory allocation'
            ],
            correct_answer: 0,
            explanation: `${conceptName} fundamentally defines how code is structured and the rules that govern its behavior.`,
        },
        {
            type: 'mcq',
            question: `Which of the following is a valid example of ${conceptName}?`,
            options: [
                'A correctly structured code snippet following the rules',
                'An unstructured block of pseudocode',
                'A comment explaining the logic',
                'A runtime error message'
            ],
            correct_answer: 0,
            explanation: 'Valid examples always follow the defined structure and rules of the concept.',
        },
        {
            type: 'true_false',
            question: `${conceptName} is only applicable to one specific programming language.`,
            options: ['True', 'False'],
            correct_answer: 1,
            explanation: `Most programming concepts including ${conceptName} apply across multiple languages, though syntax may differ.`,
        },
        {
            type: 'mcq',
            question: `What is a common mistake beginners make with ${conceptName}?`,
            options: [
                'Forgetting to handle edge cases',
                'Using it in the wrong context',
                'Not understanding the underlying logic',
                'All of the above'
            ],
            correct_answer: 3,
            explanation: 'All of these are common beginner mistakes. Practice and careful attention to detail helps avoid them.',
        },
        {
            type: 'mcq',
            question: `How does ${conceptName} relate to writing clean, maintainable code?`,
            options: [
                'It has no impact on code quality',
                'Proper use leads to more readable and maintainable code',
                'It only matters for performance',
                'It is purely a stylistic choice'
            ],
            correct_answer: 1,
            explanation: 'Understanding and properly applying concepts leads to cleaner, more maintainable code.',
        },
        {
            type: 'fill_blank',
            question: `The key benefit of understanding ${conceptName} is better _______ of your code.`,
            correct_answer: 'readability',
            explanation: 'Deep understanding of programming concepts primarily improves code readability and maintainability.',
        },
    ];
}

// ─── Adapt IQ — AI-generated personalized challenges ─────────────────────────────

function AdaptIQSection({ conceptId, conceptName, liveMetrics, zone, score, zoneMeta, timeline }) {
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generated, setGenerated] = useState(false);
    const [answers, setAnswers] = useState({});
    const [results, setResults] = useState({});
    const [textInputs, setTextInputs] = useState({});

    const errorRate = liveMetrics?.totalAttempts > 0
        ? Math.round((liveMetrics.errorCount / liveMetrics.totalAttempts) * 100)
        : 0;
    const successRate = 100 - errorRate;
    const isStruggling = ['struggling', 'frustrated', 'giving_up'].includes(zone);
    const isEasy = ['too_easy', 'comfortable'].includes(zone);

    // Determine strengths and weaknesses for report
    const weaknesses = [];
    const strengths = [];
    if (errorRate > 40) weaknesses.push({ label: 'High error rate', detail: `${errorRate}% of attempts failed`, icon: 'error' });
    else if (liveMetrics?.totalAttempts > 0) strengths.push({ label: 'Good accuracy', detail: `${successRate}% success rate`, icon: 'check_circle' });
    if (liveMetrics?.idleSeconds > 60) weaknesses.push({ label: 'Long idle stretches', detail: `${liveMetrics.idleSeconds}s inactive`, icon: 'hourglass_top' });
    else strengths.push({ label: 'Consistent engagement', detail: 'Minimal idle time', icon: 'pace' });
    if (liveMetrics?.undoCount > 2) weaknesses.push({ label: 'Frequent undo bursts', detail: `${liveMetrics.undoCount} rapid delete sessions`, icon: 'undo' });
    if (liveMetrics?.gateFailures > 1) weaknesses.push({ label: 'Quiz struggles', detail: `${liveMetrics.gateFailures} incorrect answers`, icon: 'quiz' });
    else if (liveMetrics?.gateFailures === 0 && liveMetrics?.totalAttempts > 0) strengths.push({ label: 'Strong quiz performance', detail: 'No quiz failures', icon: 'emoji_events' });
    if (strengths.length === 0) strengths.push({ label: 'Getting started', detail: 'Work through Code Lab to build your report', icon: 'rocket_launch' });

    const generateChallenges = async () => {
        setLoading(true);
        try {
            const learnerId = getLearnerId();
            const { data } = await getHint({
                learner_id: learnerId, concept_id: conceptId, hint_level: 0, question: '', learner_code: '',
                auto_triggered: false, request_type: 'adaptive_assessment', struggle_score: score, zone,
                metrics: { error_rate: errorRate, idle_seconds: liveMetrics?.idleSeconds || 0, undo_count: liveMetrics?.undoCount || 0, gate_failures: liveMetrics?.gateFailures || 0, total_attempts: liveMetrics?.totalAttempts || 0 },
            });
            if (data?.questions || data?.challenges || data?.activities) {
                setChallenges(data.questions || data.challenges || data.activities || []);
            } else if (data?.hint || data?.message) {
                setChallenges(parseAdaptiveResponse(data.hint || data.message));
            } else {
                setChallenges(generateLocalChallenges(conceptName, zone, errorRate, liveMetrics));
            }
            setGenerated(true);
        } catch (e) {
            setChallenges(generateLocalChallenges(conceptName, zone, errorRate, liveMetrics));
            setGenerated(true);
        }
        setLoading(false);
    };

    const handleSelect = (qIdx, optIdx, question) => {
        if (results[qIdx] !== undefined) return;
        setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
        const correct = question.correct_answer ?? question.answer ?? question.correct ?? 0;
        const isCorrect = typeof correct === 'number' ? optIdx === correct : (question.options || [])[optIdx] === correct;
        setResults(prev => ({ ...prev, [qIdx]: isCorrect }));
    };

    const handleTextSubmit = (qIdx, question) => {
        if (results[qIdx] !== undefined) return;
        const userAns = (textInputs[qIdx] || '').trim().toLowerCase();
        const correctAns = String(question.correct_answer ?? question.answer ?? '').trim().toLowerCase();
        setResults(prev => ({ ...prev, [qIdx]: userAns === correctAns }));
    };

    const totalAnswered = Object.keys(results).length;
    const totalCorrect = Object.values(results).filter(Boolean).length;
    const allDone = challenges.length > 0 && totalAnswered === challenges.length;

    return (
        <div className="space-y-5">
            {/* ── Performance Report Card ── */}
            <div className="bg-card-dark border border-border-dark rounded-2xl overflow-hidden">
                {/* Report Header */}
                <div className="px-6 py-4 border-b border-border-dark" style={{ background: `linear-gradient(135deg, ${zoneMeta.color}08, transparent)` }}>
                    <div className="flex items-center gap-3">
                        <div className="size-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${zoneMeta.color}15`, border: `1.5px solid ${zoneMeta.color}30` }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 24, color: zoneMeta.color, fontVariationSettings: "'FILL' 1" }}>auto_fix_high</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#E5E5E5]">Adapt IQ Report</h3>
                            <p className="text-xs text-[#808080]">Your real-time learning analysis for {conceptName}</p>
                        </div>
                    </div>
                </div>

                {/* Score Overview */}
                <div className="px-6 py-4 border-b border-border-dark">
                    <div className="flex items-center gap-5">
                        {/* Big score circle */}
                        <div className="relative size-20 shrink-0">
                            <svg className="size-20 -rotate-90" viewBox="0 0 80 80">
                                <circle cx="40" cy="40" r="35" fill="none" stroke="#2E2E2E" strokeWidth="6" />
                                <circle cx="40" cy="40" r="35" fill="none" stroke={zoneMeta.color} strokeWidth="6"
                                    strokeDasharray={`${(score / 100) * 220} 220`}
                                    strokeLinecap="round" className="transition-all duration-700" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xl font-black" style={{ color: zoneMeta.color }}>{score}</span>
                                <span className="text-[8px] text-[#808080] uppercase">Score</span>
                            </div>
                        </div>
                        {/* Metric pills */}
                        <div className="flex-1 grid grid-cols-2 gap-2">
                            <div className="p-2.5 rounded-xl bg-[#2A2A2A]">
                                <div className="text-lg font-black" style={{ color: errorRate > 40 ? '#E50914' : '#46D369' }}>{errorRate}%</div>
                                <div className="text-[9px] text-[#808080]">Error Rate</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-[#2A2A2A]">
                                <div className="text-lg font-black text-[#B3B3B3]">{liveMetrics?.totalAttempts || 0}</div>
                                <div className="text-[9px] text-[#808080]">Attempts</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-[#2A2A2A]">
                                <div className="text-lg font-black text-[#B3B3B3]">{liveMetrics?.idleSeconds || 0}s</div>
                                <div className="text-[9px] text-[#808080]">Idle Time</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-[#2A2A2A]">
                                <div className="flex items-center gap-1">
                                    <span className="size-2 rounded-full" style={{ backgroundColor: zoneMeta.color }} />
                                    <span className="text-xs font-bold" style={{ color: zoneMeta.color }}>{zoneMeta.label}</span>
                                </div>
                                <div className="text-[9px] text-[#808080] mt-0.5">Zone</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="px-6 py-4 grid grid-cols-2 gap-4 border-b border-border-dark">
                    <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#46D369] mb-2 flex items-center gap-1">
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>thumb_up</span> Strengths
                        </h4>
                        <div className="space-y-1.5">
                            {strengths.map((s, i) => (
                                <div key={i} className="flex items-start gap-1.5">
                                    <span className="material-symbols-outlined mt-0.5" style={{ fontSize: 13, color: '#46D369' }}>{s.icon}</span>
                                    <div>
                                        <p className="text-[11px] font-semibold text-[#E5E5E5]">{s.label}</p>
                                        <p className="text-[9px] text-[#808080]">{s.detail}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#E50914] mb-2 flex items-center gap-1">
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>flag</span> Areas to Work On
                        </h4>
                        <div className="space-y-1.5">
                            {weaknesses.length > 0 ? weaknesses.map((w, i) => (
                                <div key={i} className="flex items-start gap-1.5">
                                    <span className="material-symbols-outlined mt-0.5" style={{ fontSize: 13, color: '#E50914' }}>{w.icon}</span>
                                    <div>
                                        <p className="text-[11px] font-semibold text-[#E5E5E5]">{w.label}</p>
                                        <p className="text-[9px] text-[#808080]">{w.detail}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-[10px] text-[#808080] italic">No issues detected yet</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* AI Recommendation */}
                <div className="px-6 py-4 border-b border-border-dark" style={{ backgroundColor: `${zoneMeta.color}05` }}>
                    <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined mt-0.5" style={{ fontSize: 16, color: zoneMeta.color, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                        <div>
                            <p className="text-[11px] font-bold text-[#E5E5E5] mb-0.5">AI Recommendation</p>
                            <p className="text-[11px] text-[#B3B3B3] leading-relaxed">
                                {isStruggling
                                    ? `You're in the ${zoneMeta.label.toLowerCase()} zone. The personalized quiz below will focus on foundational concepts to help you build confidence.`
                                    : isEasy
                                    ? `You're breezing through this. The quiz will push you with advanced challenges to keep you growing.`
                                    : `You're in the productive struggle zone — the sweet spot for learning. The quiz will match your current level with balanced challenges.`
                                }
                            </p>
                        </div>
                    </div>
                </div>

                {/* Generate Button */}
                <div className="px-6 py-4">
                    {!generated ? (
                        <button
                            onClick={generateChallenges}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-50 shadow-lg"
                            style={{ backgroundColor: '#E50914', boxShadow: '0 4px 20px rgba(193,124,100,0.25)' }}
                        >
                            {loading ? (
                                <>
                                    <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Generating Personalized Quiz...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_fix_high</span>
                                    Generate Personalized Quiz
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 text-xs text-[#46D369]">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
                            {challenges.length} questions generated based on your {zoneMeta.label.toLowerCase()} zone
                        </div>
                    )}
                </div>
            </div>

            {/* ── Generated Challenges ── */}
            {generated && challenges.length > 0 && (
                <>
                    {/* Progress */}
                    <div className="bg-card-dark border border-border-dark rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-[#E5E5E5]">Progress</span>
                            <span className="text-xs text-[#808080]">{totalAnswered}/{challenges.length}</span>
                        </div>
                        <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                            <div className="h-full bg-[#E50914] rounded-full transition-all duration-500" style={{ width: `${(totalAnswered / challenges.length) * 100}%` }} />
                        </div>
                    </div>

                    {challenges.map((q, qIdx) => {
                        const options = q.options || q.choices || [];
                        const hasResult = results[qIdx] !== undefined;
                        const type = (q.type || 'mcq').toLowerCase();

                        return (
                            <motion.div
                                key={qIdx}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: qIdx * 0.06 }}
                                className="bg-card-dark border border-border-dark rounded-xl p-5"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#E50914]/10 text-[#E50914] border border-[#E50914]/20">
                                        {q.difficulty || (zone === 'struggling' ? 'Easier' : zone === 'comfortable' ? 'Challenge' : 'Adaptive')}
                                    </span>
                                    <span className="text-xs text-[#808080]">Q{qIdx + 1}</span>
                                    {hasResult && (
                                        <span className={`ml-auto material-symbols-outlined ${results[qIdx] ? 'text-emerald-400' : 'text-red-400'}`}
                                            style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
                                            {results[qIdx] ? 'check_circle' : 'cancel'}
                                        </span>
                                    )}
                                </div>

                                <p className="text-[#E5E5E5] font-medium text-sm mb-4">
                                    {q.question || q.prompt || q.title || `Challenge ${qIdx + 1}`}
                                </p>

                                {/* MCQ options */}
                                {options.length > 0 && (
                                    <div className="space-y-2">
                                        {options.map((opt, optIdx) => {
                                            const optText = typeof opt === 'string' ? opt : opt.text || opt.label || String(opt);
                                            const isSelected = answers[qIdx] === optIdx;
                                            const correctAnswer = q.correct_answer ?? q.answer ?? q.correct ?? null;
                                            const isCorrectOpt = correctAnswer !== null
                                                ? (typeof correctAnswer === 'number' ? optIdx === correctAnswer : opt === correctAnswer)
                                                : false;

                                            let cls = 'border-border-dark hover:border-[#E50914]/40 text-[#B3B3B3] hover:text-[#E5E5E5]';
                                            if (hasResult && isSelected && isCorrectOpt) cls = 'border-emerald-500 bg-emerald-500/10 text-emerald-400';
                                            else if (hasResult && isSelected && !isCorrectOpt) cls = 'border-red-500 bg-red-500/10 text-red-400';
                                            else if (hasResult && isCorrectOpt) cls = 'border-emerald-500/40 text-emerald-400/70';

                                            return (
                                                <button key={optIdx} onClick={() => handleSelect(qIdx, optIdx, q)} disabled={hasResult}
                                                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all disabled:cursor-default ${cls}`}>
                                                    <span className="flex items-center gap-3">
                                                        <span className="size-6 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0">
                                                            {String.fromCharCode(65 + optIdx)}
                                                        </span>
                                                        {optText}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Text input for non-MCQ */}
                                {options.length === 0 && type !== 'mcq' && (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={textInputs[qIdx] || ''}
                                            onChange={e => setTextInputs(prev => ({ ...prev, [qIdx]: e.target.value }))}
                                            disabled={hasResult}
                                            placeholder="Type your answer..."
                                            className={`flex-1 px-4 py-3 rounded-lg border bg-[#2A2A2A] text-sm font-mono focus:outline-none transition-all ${
                                                results[qIdx] === true ? 'border-emerald-500 text-emerald-400' :
                                                results[qIdx] === false ? 'border-red-500 text-red-400' :
                                                'border-border-dark text-[#E5E5E5] focus:border-[#E50914]/60'
                                            }`}
                                            onKeyDown={e => e.key === 'Enter' && handleTextSubmit(qIdx, q)}
                                        />
                                        <button onClick={() => handleTextSubmit(qIdx, q)} disabled={hasResult || !textInputs[qIdx]?.trim()}
                                            className="px-5 py-3 rounded-lg bg-[#E50914] text-white text-sm font-bold disabled:opacity-40 hover:brightness-110 transition-all">
                                            Submit
                                        </button>
                                    </div>
                                )}

                                {/* Explanation */}
                                {hasResult && q.explanation && (
                                    <div className="mt-3 pt-3 border-t border-border-dark">
                                        <p className="text-xs text-[#B3B3B3] flex items-start gap-1.5">
                                            <span className="material-symbols-outlined text-[#E50914] shrink-0" style={{ fontSize: 14, marginTop: 2 }}>lightbulb</span>
                                            {q.explanation}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}

                    {/* Results summary */}
                    {allDone && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-card-dark border border-border-dark rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`size-14 rounded-full flex items-center justify-center text-xl font-black ${
                                    totalCorrect === challenges.length ? 'bg-emerald-500/15 text-emerald-400 border-2 border-emerald-500/30' :
                                    totalCorrect >= challenges.length / 2 ? 'bg-[#E87C03]/15 text-[#E87C03] border-2 border-[#E87C03]/30' :
                                    'bg-red-500/15 text-red-400 border-2 border-red-500/30'
                                }`}>
                                    {Math.round((totalCorrect / challenges.length) * 100)}%
                                </div>
                                <div>
                                    <h3 className="text-[#E5E5E5] font-bold">
                                        {totalCorrect === challenges.length ? 'Perfect Score!' : totalCorrect >= challenges.length / 2 ? 'Good effort!' : 'Keep going!'}
                                    </h3>
                                    <p className="text-sm text-[#B3B3B3]">{totalCorrect}/{challenges.length} correct — tailored to your {zoneMeta.label.toLowerCase()} zone</p>
                                </div>
                            </div>
                            <button onClick={() => { setGenerated(false); setChallenges([]); setAnswers({}); setResults({}); setTextInputs({}); }}
                                className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border border-[#E50914]/30 text-[#E50914] hover:bg-[#E50914]/5 transition-all">
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
                                Generate New Challenges
                            </button>
                        </motion.div>
                    )}
                </>
            )}
        </div>
    );
}

// Helper: parse text-based mentor response into question objects
function parseAdaptiveResponse(text) {
    if (!text) return generateLocalChallenges('Topic', 'comfortable', 0, {});
    // Try to parse if it's JSON
    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed;
        if (parsed.questions) return parsed.questions;
    } catch {}
    return generateLocalChallenges('Topic', 'comfortable', 0, {});
}

// Fallback: generate local challenges based on struggle zone
function generateLocalChallenges(conceptName, zone, errorRate, metrics) {
    const isStruggling = ['struggling', 'frustrated', 'giving_up'].includes(zone);
    const isEasy = ['too_easy', 'comfortable'].includes(zone);

    if (isStruggling) {
        return [
            {
                question: `Which of the following best describes the core concept of ${conceptName}?`,
                type: 'mcq',
                difficulty: 'Foundation',
                options: ['A fundamental building block in programming', 'An advanced optimization technique', 'A debugging methodology', 'A deployment strategy'],
                correct_answer: 0,
                explanation: `${conceptName} is a foundational concept. Understanding the basics first helps build stronger advanced skills.`,
            },
            {
                question: `When working with ${conceptName}, what is the most common beginner mistake?`,
                type: 'mcq',
                difficulty: 'Foundation',
                options: ['Not understanding the syntax', 'Skipping edge cases', 'Overcomplicating the solution', 'All of the above'],
                correct_answer: 3,
                explanation: 'All of these are common pitfalls. Take it step by step and test with simple cases first.',
            },
            {
                question: `True or False: ${conceptName} can only be used in one specific context.`,
                type: 'mcq',
                difficulty: 'Foundation',
                options: ['True', 'False'],
                correct_answer: 1,
                explanation: `Most programming concepts, including ${conceptName}, are versatile and applicable in many contexts.`,
            },
        ];
    }

    if (isEasy) {
        return [
            {
                question: `What is the time complexity of the most efficient approach for ${conceptName}?`,
                type: 'mcq',
                difficulty: 'Advanced',
                options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
                correct_answer: 1,
                explanation: 'Think about divide-and-conquer or binary approaches to achieve logarithmic complexity.',
            },
            {
                question: `How would you optimize ${conceptName} for large-scale distributed systems?`,
                type: 'mcq',
                difficulty: 'Advanced',
                options: ['Caching and memoization', 'Parallel processing', 'Data partitioning', 'All of the above combined'],
                correct_answer: 3,
                explanation: 'At scale, a combination of all techniques is typically needed.',
            },
            {
                question: `Design a scenario where ${conceptName} would fail. What edge case breaks it?`,
                type: 'mcq',
                difficulty: 'Expert',
                options: ['Empty input', 'Extremely large input', 'Concurrent access', 'Depends on the implementation'],
                correct_answer: 3,
                explanation: 'The failure mode depends entirely on implementation details — always analyze your specific code.',
            },
        ];
    }

    // Productive struggle — balanced
    return [
        {
            question: `Which pattern is most commonly used when implementing ${conceptName}?`,
            type: 'mcq',
            difficulty: 'Intermediate',
            options: ['Iterative approach', 'Recursive approach', 'Dynamic programming', 'It depends on constraints'],
            correct_answer: 3,
            explanation: 'The best approach always depends on the specific constraints of your problem.',
        },
        {
            question: `What happens if you apply ${conceptName} without handling the base case?`,
            type: 'mcq',
            difficulty: 'Intermediate',
            options: ['Nothing, it still works', 'Infinite loop or stack overflow', 'Compile error', 'Undefined behavior only in production'],
            correct_answer: 1,
            explanation: 'Missing base cases typically cause infinite recursion or loops. Always define your termination condition.',
        },
        {
            question: `When debugging an issue with ${conceptName}, what should you check first?`,
            type: 'mcq',
            difficulty: 'Intermediate',
            options: ['Input validation', 'Output format', 'Memory usage', 'All boundary conditions'],
            correct_answer: 3,
            explanation: 'Boundary conditions are where most bugs hide. Check edge cases systematically.',
        },
    ];
}

// ─── Local mini-lesson generator for bridge sprint ──────────────────────────────
function generateLocalSprintItems(gapConcepts) {
    const items = [];
    gapConcepts.forEach((gap) => {
        const name = gap.label;
        const isBeginner = gap.mastery < 20;

        items.push({
            concept_name: name,
            section_label: 'What is it?',
            section_icon: 'menu_book',
            estimated_minutes: 3,
            content_sections: [
                {
                    type: 'definition',
                    title: `Understanding ${name}`,
                    body: isBeginner
                        ? `${name} is a foundational concept you'll encounter frequently as you progress. Before moving forward, let's make sure you have a solid grasp of what it means and why it matters.\n\nAt its core, ${name} addresses a specific problem or pattern in this domain. Understanding it well will make everything that builds on top of it much easier to learn.`
                        : `You've encountered ${name} before (${gap.mastery}% mastery), but there are gaps to fill. Let's do a focused review to strengthen your understanding.`,
                },
                {
                    type: 'key_points',
                    title: 'Key Points to Remember',
                    points: [
                        `${name} is important because it serves as a building block for more advanced topics`,
                        `The core idea revolves around solving a specific class of problems efficiently`,
                        `Understanding ${name} helps you recognize patterns and make better decisions`,
                        isBeginner ? `Focus on understanding the "why" first — memorization comes later` : `Focus on edge cases and nuances you might have missed before`,
                    ],
                },
            ],
        });

        items.push({
            concept_name: name,
            section_label: 'How does it work?',
            section_icon: 'science',
            estimated_minutes: 4,
            content_sections: [
                {
                    type: 'explanation',
                    title: 'Breaking It Down',
                    body: isBeginner
                        ? `Let's break ${name} down step by step:\n\n1. The Problem: Before ${name} existed, there was a challenge that needed solving. Think about what makes this concept necessary.\n\n2. The Approach: ${name} provides a structured way to handle this challenge. It works by establishing clear rules and patterns.\n\n3. The Result: When applied correctly, ${name} leads to cleaner, more efficient, and more maintainable solutions.\n\nThink of it like learning to ride a bicycle — once you understand the balance (the core principle), everything else becomes natural.`
                        : `Since you have some familiarity with ${name}, let's go deeper:\n\n1. Common Misconceptions: Many learners confuse ${name} with related concepts. The key distinction is in how and when it's applied.\n\n2. Edge Cases: ${name} doesn't always behave the same way. Consider scenarios where the standard approach might not work.\n\n3. Best Practices: Experienced practitioners use ${name} in specific patterns. Understanding these patterns will level up your skills.`,
                },
                {
                    type: 'example',
                    title: 'Real-World Analogy',
                    body: `Imagine you're organizing a library. ${name} is like the classification system — it tells you where things belong and how to find them quickly. Without it, you'd have to search through every shelf every time.\n\nIn the same way, ${name} gives structure to what would otherwise be chaos. Once you internalize this mental model, applying it becomes second nature.`,
                },
            ],
        });

        items.push({
            concept_name: name,
            section_label: 'Test Your Understanding',
            section_icon: 'quiz',
            estimated_minutes: 2,
            content_sections: [
                {
                    type: 'exercise',
                    title: 'Think About This',
                    body: `Before moving on, answer these in your head:\n\n• If someone asked "What is ${name}?", what would you say in one sentence?\n\n• Can you think of a scenario where ${name} would be the right approach? What about a scenario where it wouldn't be?\n\n• How does ${name} connect to what you've already learned?`,
                },
            ],
            question: `How well do you understand ${name} now?`,
            options: [
                'I can explain it clearly to someone else',
                'I understand the main idea and most details',
                'I get the basics but some parts are fuzzy',
                'I need to study this more thoroughly',
            ],
        });
    });
    return items;
}

// ─── Section renderer for bridge sprint ─────────────────────────────────────────
function SprintContentSection({ section }) {
    if (section.type === 'key_points') {
        return (
            <div className="mb-5 last:mb-0">
                <h3 className="text-base font-bold text-[#E5E5E5] mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#46D369]" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>checklist</span>
                    {section.title}
                </h3>
                <ul className="space-y-2.5">
                    {section.points.map((point, i) => (
                        <li key={i} className="flex items-start gap-3 text-[14.5px] text-[#E5E5E5] leading-relaxed">
                            <span className="mt-1 size-5 rounded-full bg-[#E50914]/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold text-[#E50914]">{i + 1}</span>
                            </span>
                            {point}
                        </li>
                    ))}
                </ul>
            </div>
        );
    }
    return (
        <div className="mb-5 last:mb-0">
            <h3 className="text-base font-bold text-[#E5E5E5] mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
                    {section.type === 'definition' ? 'auto_stories' : section.type === 'explanation' ? 'psychology' : section.type === 'example' ? 'lightbulb' : 'edit_note'}
                </span>
                {section.title}
            </h3>
            <div className="text-[#E5E5E5] text-[14.5px] leading-[1.75] whitespace-pre-line">{section.body}</div>
        </div>
    );
}

// ─── Pre-Episode Prerequisite Gate (wraps episode content) ──────────────────────

function PrerequisiteGate({ conceptId, learnerId, router, children }) {
    const [status, setStatus] = useState('checking'); // checking | clear | gaps | sprinting | done
    const [gaps, setGaps] = useState([]);
    const [sprintItems, setSprintItems] = useState([]);
    const [sprintStep, setSprintStep] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [scores, setScores] = useState([]);
    const [sprintLoading, setSprintLoading] = useState(false);

    useEffect(() => {
        if (!conceptId || !learnerId) { setStatus('clear'); return; }
        let cancelled = false;

        (async () => {
            try {
                const { data } = await getConstellation(learnerId);
                if (cancelled || !data) { setStatus('clear'); return; }

                const nodes = data.nodes || [];
                const links = data.links || data.edges || [];

                const prereqIds = links
                    .filter(l => {
                        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                        return targetId === conceptId;
                    })
                    .map(l => typeof l.source === 'object' ? l.source.id : l.source);

                // Gather prerequisite gaps (mastery < 60%)
                const prereqGaps = prereqIds
                    .map(pid => {
                        const node = nodes.find(n => n.id === pid || n.concept_id === pid);
                        if (!node) return null;
                        const mastery = node.mastery ?? node.p_known ?? 0;
                        return { id: pid, label: node.label || node.name || pid, mastery: Math.round(mastery * 100) };
                    })
                    .filter(p => p && p.mastery < 60);

                // If no prerequisite edges or all prereqs are mastered,
                // still offer a sprint for the current concept if it's not mastered
                if (prereqGaps.length === 0) {
                    const selfNode = nodes.find(n => (n.id || n.concept_id) === conceptId || (n.concept_id || n.id) === conceptId);
                    const selfMastery = selfNode ? Math.round((selfNode.mastery ?? selfNode.p_known ?? 0) * 100) : 0;
                    if (selfMastery < 80) {
                        prereqGaps.push({
                            id: conceptId,
                            label: selfNode?.label || selfNode?.name || conceptId,
                            mastery: selfMastery,
                        });
                    }
                }

                if (cancelled) return;
                if (prereqGaps.length === 0) { setStatus('clear'); } else { setGaps(prereqGaps); setStatus('gaps'); }
            } catch {
                if (!cancelled) setStatus('clear');
            }
        })();

        return () => { cancelled = true; };
    }, [conceptId, learnerId]);

    const handleStartSprint = async () => {
        setSprintLoading(true);
        // Try API first
        try {
            const { data } = await generateSprint({
                learner_id: learnerId,
                concept_id: conceptId,
                gap_concepts: gaps.map(g => g.id),
            });
            if (data?.sprint_items?.length || data?.items?.length) {
                setSprintItems(data.sprint_items || data.items);
                setSprintStep(0);
                setStatus('sprinting');
                setSprintLoading(false);
                return;
            }
        } catch { /* fall through */ }
        // Local fallback
        setSprintItems(generateLocalSprintItems(gaps));
        setSprintStep(0);
        setStatus('sprinting');
        setSprintLoading(false);
    };

    const current = sprintItems[sprintStep];
    const uniqueConcepts = [...new Set(sprintItems.map(i => i.concept_name))];
    const currentConceptIdx = current ? uniqueConcepts.indexOf(current.concept_name) : 0;
    const progress = sprintItems.length > 0 ? ((sprintStep + 1) / sprintItems.length) * 100 : 0;
    const totalTime = sprintItems.reduce((sum, item) => sum + (item.estimated_minutes || 3), 0);

    const handleSprintNext = () => {
        if (selectedAnswer !== null) {
            setScores(prev => [...prev, { step: sprintStep, answer: selectedAnswer, concept: current?.concept_name }]);
        }
        setSelectedAnswer(null);
        if (sprintStep < sprintItems.length - 1) {
            setSprintStep(sprintStep + 1);
        } else {
            // Sprint done — update BKT for each gap
            gaps.forEach(gap => {
                updateBKT({ learner_id: learnerId, concept_id: gap.id, is_correct: true }).catch(() => {});
            });
            setStatus('done');
        }
    };

    // ── Loading / clear / done → show episode children ──
    if (status === 'checking') {
        return (
            <div className="min-h-screen bg-[#141414] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="size-10 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-[#808080]">Checking prerequisites...</p>
                </div>
            </div>
        );
    }

    if (status === 'clear' || status === 'done') return children;

    // ── Gap Warning (before sprint) ──
    if (status === 'gaps') {
        return (
            <div className="min-h-screen bg-[#141414]">
                {/* Header */}
                <header className="sticky top-0 z-20 bg-[#141414]/95 backdrop-blur-sm border-b border-[#333333]">
                    <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-3">
                        <button onClick={() => router.back()} className="text-[#808080] hover:text-[#E5E5E5] transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
                        </button>
                        <span className="material-symbols-outlined text-[#E87C03]" style={{ fontSize: 20 }}>shield_with_heart</span>
                        <h1 className="text-sm font-bold text-[#E5E5E5]">Prerequisite Check</h1>
                    </div>
                </header>

                <div className="max-w-2xl mx-auto px-6 py-10">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="text-center mb-8">
                            <div className="size-16 rounded-2xl bg-[#E87C03]/10 flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-[#E87C03]" style={{ fontSize: 32 }}>shield_with_heart</span>
                            </div>
                            <h2 className="text-2xl font-bold text-[#E5E5E5]">Before you start this episode...</h2>
                            <p className="text-sm text-[#B3B3B3] mt-2 max-w-md mx-auto">
                                We found {gaps.length === 1 ? 'a prerequisite' : `${gaps.length} prerequisites`} that could use a quick review.
                                A short Bridge Sprint will help you learn this episode faster.
                            </p>
                        </div>

                        <div className="space-y-3 mb-8">
                            {gaps.map((gap) => (
                                <div key={gap.id} className="flex items-center gap-4 p-4 rounded-xl bg-[#1E1E1E] border border-[#333333]">
                                    <div className="size-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: gap.mastery < 30 ? '#E5091412' : '#E87C0312' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: gap.mastery < 30 ? '#E50914' : '#E87C03' }}>
                                            {gap.mastery < 30 ? 'warning' : 'pending'}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-[#E5E5E5] truncate">{gap.label}</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <div className="flex-1 h-1.5 bg-[#2E2E2E] rounded-full overflow-hidden max-w-[160px]">
                                                <div className="h-full rounded-full" style={{ width: `${Math.max(gap.mastery, 3)}%`, backgroundColor: gap.mastery < 30 ? '#E50914' : '#E87C03' }} />
                                            </div>
                                            <span className="text-[10px] font-bold text-[#808080]">{gap.mastery}% mastery</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleStartSprint}
                                disabled={sprintLoading}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#E50914] text-white font-bold text-sm hover:brightness-110 transition-all disabled:opacity-60"
                            >
                                {sprintLoading ? (
                                    <>
                                        <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Preparing Sprint...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>route</span>
                                        Start Bridge Sprint ({gaps.length === 1 ? '~9 min' : `~${gaps.length * 9} min`})
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => setStatus('clear')}
                                className="px-6 py-4 rounded-xl border border-[#333333] text-[#808080] font-semibold text-sm hover:text-[#E5E5E5] hover:border-[#E50914]/30 transition-all"
                            >
                                Skip
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    // ── Sprint Flow (inline, full page) ──
    if (status === 'sprinting' && current) {
        return (
            <div className="min-h-screen bg-[#141414]">
                {/* Sprint Header */}
                <header className="sticky top-0 z-20 bg-[#141414]/95 backdrop-blur-sm border-b border-[#333333]">
                    <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => { if (sprintStep > 0) { setSprintStep(sprintStep - 1); setSelectedAnswer(null); } else setStatus('gaps'); }} className="text-[#808080] hover:text-[#E5E5E5] transition-colors">
                                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
                            </button>
                            <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 20 }}>route</span>
                            <h1 className="text-sm font-bold text-[#E5E5E5]">Bridge Sprint</h1>
                            <span className="text-xs font-bold text-[#808080] bg-[#2A2A2A] px-2 py-0.5 rounded-full">
                                {sprintStep + 1} / {sprintItems.length}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-[#808080]">~{totalTime} min</span>
                            <button onClick={() => setStatus('clear')} className="text-xs text-[#808080] hover:text-[#E50914] font-semibold transition-colors">
                                Skip to Episode
                            </button>
                        </div>
                    </div>
                    <div className="h-1 bg-[#2E2E2E]">
                        <motion.div className="h-full bg-[#E50914] rounded-r-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
                    </div>
                </header>

                {/* Sprint Content */}
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={sprintStep}
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }}
                            transition={{ duration: 0.25 }}
                        >
                            {/* Concept & section indicator */}
                            <div className="flex items-center gap-3 mb-5">
                                <div className="size-10 rounded-xl bg-[#E50914]/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 20 }}>
                                        {current.section_icon || 'menu_book'}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold uppercase tracking-wider text-[#E50914] truncate">
                                        {current.concept_name}
                                    </p>
                                    <p className="text-[11px] text-[#808080]">
                                        {current.section_label || 'Study'} · ~{current.estimated_minutes || 3} min
                                    </p>
                                </div>
                                <div className="hidden sm:flex items-center gap-1">
                                    {uniqueConcepts.map((c, i) => (
                                        <div key={c} className="h-1.5 rounded-full transition-all" style={{
                                            width: i === currentConceptIdx ? 20 : 8,
                                            backgroundColor: i < currentConceptIdx ? '#46D369' : i === currentConceptIdx ? '#E50914' : '#2E2E2E',
                                        }} />
                                    ))}
                                </div>
                            </div>

                            {/* Main content card */}
                            <div className="bg-[#1E1E1E] rounded-2xl border border-[#333333] shadow-sm overflow-hidden">
                                <div className="px-5 sm:px-8 py-6">
                                    {current.content_sections ? (
                                        current.content_sections.map((section, idx) => (
                                            <SprintContentSection key={idx} section={section} />
                                        ))
                                    ) : (
                                        <div className="text-[#E5E5E5] text-[14.5px] leading-[1.75] whitespace-pre-line">
                                            {current.content || current.explanation || current.summary || 'Review this concept before proceeding.'}
                                        </div>
                                    )}
                                </div>

                                {/* Self-check question */}
                                {current.question && current.options && (
                                    <div className="px-5 sm:px-8 py-5 border-t border-[#2E2E2E] bg-gradient-to-b from-[#141414]/60 to-[#141414]/30">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="material-symbols-outlined text-[#B3B3B3]" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>school</span>
                                            <p className="text-xs font-bold uppercase tracking-wider text-[#B3B3B3]">Self Assessment</p>
                                        </div>
                                        <p className="text-sm text-[#E5E5E5] font-medium mb-4">{current.question}</p>
                                        <div className="space-y-2">
                                            {current.options.map((opt, oi) => {
                                                const label = typeof opt === 'string' ? opt : opt.label;
                                                return (
                                                    <button
                                                        key={oi}
                                                        onClick={() => setSelectedAnswer(oi)}
                                                        className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all border ${
                                                            selectedAnswer === oi
                                                                ? 'border-[#E50914] bg-[#E50914]/8 text-[#E5E5E5] font-semibold'
                                                                : 'border-[#2E2E2E] bg-[#1E1E1E] text-[#E5E5E5] hover:border-[#333333]'
                                                        }`}
                                                    >
                                                        <span className="flex items-center gap-3">
                                                            <span className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                                selectedAnswer === oi ? 'border-[#E50914] bg-[#E50914]' : 'border-[#333333]'
                                                            }`}>
                                                                {selectedAnswer === oi && <span className="material-symbols-outlined text-white" style={{ fontSize: 12 }}>check</span>}
                                                            </span>
                                                            {label}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center justify-between mt-6">
                                <button
                                    onClick={() => { if (sprintStep > 0) { setSprintStep(sprintStep - 1); setSelectedAnswer(null); } }}
                                    disabled={sprintStep === 0}
                                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-[#808080] hover:text-[#E5E5E5] disabled:opacity-30 transition-colors"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                                    Back
                                </button>
                                <button
                                    onClick={handleSprintNext}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E50914] text-white font-bold text-sm hover:brightness-110 transition-all"
                                >
                                    {sprintStep < sprintItems.length - 1 ? (
                                        <>Continue <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span></>
                                    ) : (
                                        <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span> Complete & Start Episode</>
                                    )}
                                </button>
                            </div>

                            {/* Step dots */}
                            <div className="flex items-center justify-center gap-1.5 mt-6">
                                {sprintItems.map((item, i) => {
                                    const isNewConcept = i === 0 || item.concept_name !== sprintItems[i - 1]?.concept_name;
                                    return (
                                        <div key={i} className="flex items-center gap-1.5">
                                            {isNewConcept && i > 0 && <div className="w-px h-3 bg-[#333333] mx-1" />}
                                            <div className="rounded-full transition-all" style={{
                                                width: i === sprintStep ? 20 : 8,
                                                height: 8,
                                                backgroundColor: i < sprintStep ? '#46D369' : i === sprintStep ? '#E50914' : '#2E2E2E',
                                            }} />
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        );
    }

    return children;
}

// ─── Main Episode Player ────────────────────────────────────────────────────────

function EpisodePlayer() {
    const { id } = useParams();
    const searchParams = useSearchParams();
    const conceptId = searchParams.get('concept_id') || id;
    const router = useRouter();

    const [episode, setEpisode] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [checkpointOpen, setCheckpointOpen] = useState(false);
    const [masteryPct, setMasteryPct] = useState(0);
    const [xpEarned, setXpEarned] = useState(0);
    const [startTime] = useState(Date.now());
    const [visualizations, setVisualizations] = useState([]);
    const [vizLoading, setVizLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('text');
    const [uploadedPages, setUploadedPages] = useState([]);
    const [currentCode, setCurrentCode] = useState('');
    const learnerId = useRef(null);

    // ── Real-time struggle detection ───────────────────────────────────
    const struggle = useStruggleTracker(conceptId, {
        enabled: !!conceptId,
        currentQuestion: episode?.title || '',
        learnerCode: currentCode,
    });

    // ── Inline Mentor Chat ──────────────────────────────────────────────
    const [mentorOpen, setMentorOpen] = useState(false);
    const [mentorAutoMsg, setMentorAutoMsg] = useState(null);
    const mentorAutoTriggeredRef = useRef(false);

    // Auto-trigger mentor when struggle zone escalates to struggling+
    useEffect(() => {
        const isHighStruggle = ['struggling', 'frustrated', 'giving_up'].includes(struggle.zone);
        const isOnRelevantTab = (activeTab === 'code' && isCodeTopic) || activeTab === 'assessment';

        if (isHighStruggle && isOnRelevantTab && !mentorAutoTriggeredRef.current && !mentorOpen) {
            mentorAutoTriggeredRef.current = true;

            // Build context-aware auto-trigger message
            const m = struggle.liveMetrics;
            const reasons = [];
            if (m.errorCount > 2) reasons.push(`${m.errorCount} errors`);
            if (m.idleSeconds > 30) reasons.push(`${m.idleSeconds}s idle`);
            if (m.gateFailures > 0) reasons.push(`${m.gateFailures} quiz failures`);
            if (m.undoCount > 1) reasons.push(`${m.undoCount} undo bursts`);

            const contextMsg = reasons.length > 0
                ? `I can see you've had ${reasons.join(', ')}. Let's work through this together.`
                : `It looks like you could use some guidance. Let's work through this together.`;

            setMentorAutoMsg(contextMsg);
            setMentorOpen(true);
        }

        // Reset auto-trigger flag when zone goes back to comfortable
        if (!isHighStruggle) {
            mentorAutoTriggeredRef.current = false;
        }
    }, [struggle.zone, activeTab, mentorOpen, struggle.liveMetrics]);

    // Reset mentor when concept changes
    useEffect(() => {
        setMentorOpen(false);
        setMentorAutoMsg(null);
        mentorAutoTriggeredRef.current = false;
    }, [conceptId]);

    const handleOpenMentor = useCallback(() => {
        setMentorAutoMsg(null);
        setMentorOpen(true);
    }, []);

    // ── Pre-generate presentation on episode load (background) ──────────
    const presentation = usePresentationPregeneration(
        conceptId,
        episode?.title || conceptId,
        learnerId.current,
        episode?.content || '',
    );

    useEffect(() => {
        learnerId.current = getLearnerId();
        if (!learnerId.current) {
            router.push('/profiles');
            return;
        }

        async function loadEpisode(attempt = 1) {
            // 1. Check localStorage cache first — instant load
            const cacheKey = `learnflix_episode_${id}_${conceptId}`;
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const { data: cachedData, ts } = JSON.parse(cached);
                    // Use cache if less than 1 hour old
                    if (cachedData && Date.now() - ts < 3600000) {
                        setEpisode(cachedData);
                        setLoading(false);
                        // Still load visualizations in background
                        loadVisualizations(cachedData);
                        // Silently refresh from API in background (won't block UI)
                        getEpisode(id, learnerId.current, conceptId, false, 30).then(({ data }) => {
                            if (data) {
                                setEpisode(data);
                                localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
                            }
                        });
                        return;
                    }
                }
            } catch (e) { /* cache miss, load from API */ }

            // 2. Load from API
            const { data, error: err } = await getEpisode(id, learnerId.current, conceptId, false, 30);
            if (err) {
                if (attempt < 3) {
                    console.log(`Episode load attempt ${attempt} failed, retrying...`);
                    setTimeout(() => loadEpisode(attempt + 1), 2000);
                    return;
                }
                setError(err);
            } else {
                setEpisode(data);
                // Cache for next time
                try { localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() })); } catch (e) {}
                // Load visualizations in background (don't block)
                loadVisualizations(data);
            }
            setLoading(false);
        }
        loadEpisode();
    }, [id, conceptId, router]);

    async function loadVisualizations(episodeData) {
        setVizLoading(true);
        try {
            const conceptName = episodeData?.title || conceptId;
            const summary = (episodeData?.content || '').replace(/<[^>]*>/g, '').slice(0, 1500);
            const { data } = await generateVisualizations({
                concept_name: conceptName,
                concept_id: conceptId,
                content_summary: summary,
            });
            if (data?.visualizations) {
                setVisualizations(data.visualizations);
            }
        } catch (e) {
            console.error('Visualization generation error:', e);
        }
        setVizLoading(false);
    }

    const handleComplete = useCallback(async () => {
        const lid = learnerId.current;
        const timeSpent = Math.round((Date.now() - startTime) / 1000);

        await postProgress(id, {
            learner_id: lid,
            concept_id: conceptId,
            completion_rate: 1.0,
            time_spent_seconds: timeSpent,
        });

        const { data: bktData } = await updateBKT({
            learner_id: lid,
            concept_id: conceptId,
            is_correct: true,
        });

        const newMastery = bktData?.p_know
            ? Math.round(bktData.p_know * 100)
            : bktData?.mastery
                ? Math.round(bktData.mastery * 100)
                : 85;
        const earnedXp = bktData?.xp_earned || bktData?.xp || 50;

        // Save progress to localStorage so season page can track it
        try {
            // Find which course this episode belongs to by checking concept_id pattern
            const epId = conceptId || id;
            // Try all possible season keys
            const allKeys = Object.keys(localStorage).filter(k => k.startsWith('learnflix_progress_'));
            // Also try the direct season pattern: seasonId_ep_N
            const seasonMatch = epId.match(/^(.+)_ep_\d+$/);
            if (seasonMatch) {
                const progressKey = `learnflix_progress_${lid}_${seasonMatch[1]}`;
                const existing = JSON.parse(localStorage.getItem(progressKey) || '{}');
                existing[epId] = newMastery;
                localStorage.setItem(progressKey, JSON.stringify(existing));
            }
            // Also save under a generic key for any episode
            const genericKey = `learnflix_ep_progress_${lid}`;
            const generic = JSON.parse(localStorage.getItem(genericKey) || '{}');
            generic[epId] = newMastery;
            localStorage.setItem(genericKey, JSON.stringify(generic));
        } catch (e) { console.log('Progress save:', e); }

        setMasteryPct(newMastery);
        setXpEarned(earnedXp);

        // Fire toast notifications
        setTimeout(() => toastXP(earnedXp), 500);
        if (newMastery >= 80) setTimeout(() => toastMastery(episode?.title || conceptId), 1500);
        if (newMastery >= 95) setTimeout(() => toastAchievement('Perfect Score!'), 2500);

        // Check streak
        const streakKey = `learnflix_streak_${lid}`;
        const lastDate = localStorage.getItem(streakKey + '_date');
        const today = new Date().toDateString();
        if (lastDate !== today) {
            const streak = parseInt(localStorage.getItem(streakKey) || '0') + 1;
            localStorage.setItem(streakKey, String(streak));
            localStorage.setItem(streakKey + '_date', today);
            localStorage.setItem('streak', String(streak));
            if (streak > 1) setTimeout(() => toastStreak(streak), 2000);
        }

        setCheckpointOpen(true);
    }, [id, conceptId, startTime, episode]);

    const handleNextEpisode = () => {
        const nextId = episode?.next_episode_id;
        if (nextId) {
            router.push(`/episode/${nextId}?concept_id=${episode.next_concept_id || conceptId}`);
        } else {
            // No next episode — season complete, go to finale
            const seasonRef = episode?.season_id || episode?.cluster_id || conceptId;
            router.push(`/season/${seasonRef}/finale`);
        }
    };

    const handleBackToConstellation = () => {
        router.push('/home');
    };

    // ── Loading ──
    if (loading) {
        const loadingSteps = [
            { icon: 'auto_awesome', text: 'Analyzing your learning profile', color: '#E50914' },
            { icon: 'psychology', text: 'AI is generating personalized content', color: '#E87C03' },
            { icon: 'movie', text: 'Creating visual presentations', color: '#5DADE2' },
            { icon: 'record_voice_over', text: 'Generating voice narration', color: '#46D369' },
            { icon: 'code', text: 'Building code challenges', color: '#AF7AC5' },
        ];
        return (
            <div className="min-h-screen bg-[#141414] flex flex-col relative overflow-hidden">
                {/* Animated background */}
                <div className="absolute inset-0">
                    {/* Floating particles */}
                    {Array.from({ length: 20 }).map((_, i) => (
                        <motion.div key={i}
                            className="absolute rounded-full"
                            style={{
                                width: 2 + Math.random() * 4,
                                height: 2 + Math.random() * 4,
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                backgroundColor: ['#E50914', '#E87C03', '#46D369', '#5DADE2', '#AF7AC5'][i % 5],
                                opacity: 0.15,
                            }}
                            animate={{
                                y: [0, -100 - Math.random() * 200],
                                x: [0, (Math.random() - 0.5) * 100],
                                opacity: [0, 0.3, 0],
                            }}
                            transition={{ duration: 4 + Math.random() * 6, repeat: Infinity, delay: Math.random() * 5, ease: 'easeOut' }}
                        />
                    ))}
                    {/* Radial glow */}
                    <motion.div className="absolute w-[600px] h-[600px] rounded-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                        style={{ background: 'radial-gradient(circle, rgba(229,9,20,0.06), transparent 70%)', filter: 'blur(40px)' }}
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
                </div>

                {/* Skeleton header */}
                <div className="border-b border-[#2E2E2E] px-6 py-4 flex items-center gap-4 relative z-10">
                    <div className="w-8 h-8 rounded bg-[#1E1E1E] animate-pulse" />
                    <div className="flex-1">
                        <div className="w-48 h-4 rounded bg-[#1E1E1E] animate-pulse mb-2" />
                        <div className="w-32 h-3 rounded bg-[#1A1A1A] animate-pulse" />
                    </div>
                </div>
                {/* Skeleton tabs */}
                <div className="border-b border-[#2E2E2E] px-6 flex gap-6 py-3 relative z-10">
                    {[1,2,3,4].map(i => <div key={i} className="w-20 h-4 rounded bg-[#1E1E1E] animate-pulse" />)}
                </div>

                {/* Main loading content */}
                <div className="flex-1 flex items-center justify-center relative z-10">
                    <div className="flex flex-col items-center gap-8">
                        {/* Animated rings */}
                        <div className="relative size-28">
                            <motion.div className="absolute inset-0 rounded-full border-2 border-[#E50914]/30"
                                animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} />
                            <motion.div className="absolute inset-2 rounded-full border-2 border-[#E87C03]/20 border-dashed"
                                animate={{ rotate: -360 }} transition={{ duration: 5, repeat: Infinity, ease: 'linear' }} />
                            <motion.div className="absolute inset-4 rounded-full border-2 border-[#5DADE2]/15"
                                animate={{ rotate: 360 }} transition={{ duration: 7, repeat: Infinity, ease: 'linear' }} />
                            {/* Center icon */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <motion.div
                                    animate={{ scale: [1, 1.15, 1] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                    className="size-14 rounded-full bg-[#E50914]/10 border border-[#E50914]/30 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                                </motion.div>
                            </div>
                        </div>

                        {/* Animated step text */}
                        <div className="text-center">
                            <p className="text-white font-bold text-lg mb-2">Building Your Episode</p>
                            <div className="h-5 overflow-hidden">
                                <motion.div
                                    animate={{ y: [0, -20, -40, -60, -80, 0] }}
                                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', times: [0, 0.2, 0.4, 0.6, 0.8, 1] }}>
                                    {loadingSteps.map((step, i) => (
                                        <div key={i} className="h-5 flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined" style={{ fontSize: 14, color: step.color }}>{step.icon}</span>
                                            <span className="text-[#808080] text-sm">{step.text}</span>
                                        </div>
                                    ))}
                                </motion.div>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-64">
                            <motion.div className="h-1 bg-[#2E2E2E] rounded-full overflow-hidden">
                                <motion.div className="h-full rounded-full"
                                    style={{ background: 'linear-gradient(90deg, #E50914, #E87C03, #46D369, #5DADE2)' }}
                                    animate={{ width: ['0%', '30%', '50%', '65%', '80%', '90%'] }}
                                    transition={{ duration: 20, ease: 'easeOut' }} />
                            </motion.div>
                            <div className="flex justify-between mt-2">
                                <span className="text-[#555] text-[10px]">Preparing</span>
                                <span className="text-[#555] text-[10px]">Almost ready</span>
                            </div>
                        </div>

                        {/* Fun fact */}
                        <motion.p className="text-[#444] text-xs text-center max-w-xs italic"
                            animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 4, repeat: Infinity }}>
                            Did you know? LearnFlix generates unique content for every learner using AI — no two episodes are exactly the same.
                        </motion.p>
                    </div>
                </div>
            </div>
        );
    }

    // ── Error ──
    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#141414] gap-4">
                <span className="material-symbols-outlined text-red-400" style={{ fontSize: 48 }}>error</span>
                <p className="text-red-400 text-lg">{error}</p>
                <button
                    onClick={() => router.push('/home')}
                    className="px-5 py-2.5 rounded-lg bg-surface-dark border border-border-dark text-[#E5E5E5] text-sm"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    if (!episode) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#141414] gap-4">
                <span className="material-symbols-outlined text-[#808080]" style={{ fontSize: 48 }}>movie</span>
                <p className="text-[#808080] text-lg">No Episode Found</p>
                <button
                    onClick={() => router.push('/home')}
                    className="px-5 py-2.5 rounded-lg bg-surface-dark border border-border-dark text-[#E5E5E5] text-sm"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    const format = (episode.format || 'Visual Story').trim();
    const isCodeLab = format === 'Code Lab';
    const seasonName = episode.season_name || episode.cluster_name || 'Season';

    const formatIcons = {
        'Visual Story': 'auto_stories',
        'Code Lab': 'terminal',
        'Concept X-Ray': 'layers',
        'Case Study': 'case_study',
        'Quick Byte': 'bolt',
    };

    // ── Match coding problems from the bank (5 problems: 2E, 2M, 1H) ──
    const conceptName = episode.title || conceptId || '';
    const contentText = (episode.content || '').replace(/<[^>]*>/g, '').slice(0, 500);
    const { type: problemType, problems: matchedProblems } = getBestProblem(conceptName, contentText);

    // Detect if this is a coding-related topic
    const topicLower = (episode?.title || conceptId || '').toLowerCase();
    const isCodeTopic = /\b(code|coding|program|algorithm|data structure|dsa|daa|python|java|javascript|c\+\+|cpp|sql|database|dbms|web dev|react|node|html|css|api|oop|object oriented|compiler|software eng|full stack|backend|frontend|devops|docker|git|linux|terminal|shell|recursion|sorting|searching|array|linked list|tree|graph|stack|queue|heap|hash|pointer|function|variable|loop|class|method|inheritance|polymorphism|encapsulation|abstraction)\b/.test(topicLower);

    const tabs = [
        { id: 'video', label: 'Video', icon: 'play_circle', color: '#E50914' },
        { id: 'text', label: 'Notes', icon: 'menu_book', color: '#a855f7' },
        ...(isCodeTopic ? [{ id: 'code', label: 'Code Lab', icon: 'terminal', color: '#46D369' }] : []),
        { id: 'assessment', label: 'Assessment', icon: 'quiz', color: '#E87C03' },
        { id: 'adapt', label: 'Adapt IQ', icon: 'auto_fix_high', color: '#E50914' },
    ];

    return (
        <PrerequisiteGate conceptId={conceptId} learnerId={learnerId.current} router={router}>
            <div className="min-h-screen bg-[#141414]">
                {/* ── Header Breadcrumb ── */}
                <header className="sticky top-0 z-30 bg-[#141414]/90 backdrop-blur-sm border-b border-border-dark">
                    <div className="max-w-6xl mx-auto px-6 lg:px-8 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm min-w-0">
                            <button
                                onClick={() => router.back()}
                                className="text-[#808080] hover:text-[#E5E5E5] transition-colors flex items-center gap-1 shrink-0"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
                            </button>
                            <span className="text-[#808080] hover:text-[#E5E5E5] transition-colors truncate cursor-pointer" onClick={() => router.push('/home')}>
                                {seasonName}
                            </span>
                            <span className="text-[#808080] shrink-0">/</span>
                            <span className="text-[#E5E5E5] font-medium truncate">{episode.title || conceptId}</span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-[#E50914] uppercase tracking-wider">
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{formatIcons[format] || 'auto_stories'}</span>
                                {format}
                            </span>
                        </div>
                    </div>
                </header>

                {/* ── Tab Bar ── */}
                <div className="sticky top-[53px] z-20 bg-[#141414]/95 backdrop-blur-sm border-b border-border-dark">
                    <div className="max-w-6xl mx-auto px-6 lg:px-8">
                        <div className="flex gap-1 overflow-x-auto hide-scrollbar">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-all relative whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'text-[#E5E5E5]'
                                            : 'text-[#808080] hover:text-[#E5E5E5]'
                                    }`}
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        style={{
                                            fontSize: 18,
                                            color: activeTab === tab.id ? tab.color : undefined,
                                        }}
                                    >
                                        {tab.icon}
                                    </span>
                                    {tab.label}
                                    {/* Video tab: show generation status badge */}
                                    {tab.id === 'video' && activeTab !== 'video' && presentation.status === 'ready' && (
                                        <span className="size-2 rounded-full bg-[#46D369] shrink-0" title="Presentation ready" />
                                    )}
                                    {tab.id === 'video' && activeTab !== 'video' && presentation.status === 'generating' && (
                                        <span className="size-3 border-[1.5px] border-[#E50914] border-t-transparent rounded-full animate-spin shrink-0" title="Generating..." />
                                    )}
                                    {activeTab === tab.id && (
                                        <motion.div
                                            layoutId="tab-underline"
                                            className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                                            style={{ backgroundColor: tab.color }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Tab Content ── */}
                <div className={`max-w-6xl mx-auto px-6 lg:px-8 py-8 transition-all duration-300 ${
                    ((activeTab === 'code' && isCodeTopic) || activeTab === 'assessment') ? 'lg:pr-[370px]' : ''
                }`}>
                    <AnimatePresence mode="wait">
                        {/* ── VIDEO TAB ── */}
                        {activeTab === 'video' && (
                            <motion.div
                                key="video"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.2 }}
                            >
                                <PresentationSection
                                    conceptName={episode.title || conceptId}
                                    presentation={presentation}
                                />
                            </motion.div>
                        )}

                        {/* ── TEXT TAB ── */}
                        {activeTab === 'text' && (
                            <motion.div
                                key="text"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.2 }}
                                className="h-[calc(100vh-220px)]"
                            >
                                <Notebook
                                    title={`${episode.title || 'Episode'} Notes`}
                                    loading={!episode}
                                    onUploadRequest={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = '.pdf,.ppt,.pptx,.txt';
                                        input.onchange = async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            try {
                                                // Read the file as text directly on frontend
                                                // This avoids S3 upload issues entirely
                                                let textContent = '';

                                                if (file.name.endsWith('.txt')) {
                                                    textContent = await file.text();
                                                } else {
                                                    // For PDF/PPT — read as text (may get partial text from text-based PDFs)
                                                    // Also try reading as ArrayBuffer and extracting text
                                                    textContent = await file.text();

                                                    // Clean up binary garbage from PDF text extraction
                                                    textContent = textContent.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, ' ').trim();
                                                }

                                                if (textContent.length < 20) {
                                                    alert('Could not extract text from this file. Please try a .txt file or a text-based PDF (not scanned images).');
                                                    return;
                                                }

                                                // Truncate if too long
                                                if (textContent.length > 8000) {
                                                    textContent = textContent.substring(0, 8000);
                                                }

                                                // Send text directly to backend — no S3 upload needed
                                                const { data: notesData, error: notesErr } = await generateNotesFromUpload({
                                                    learner_id: getLearnerId(),
                                                    text_content: textContent,
                                                    file_name: file.name,
                                                    topic: episode?.title || '',
                                                });

                                                if (notesErr || !notesData?.notes) {
                                                    alert('AI could not process the text. Please try again.');
                                                    return;
                                                }

                                                // Step 4: Parse AI-generated notes into notebook pages
                                                let rawNotes = notesData.notes;

                                                // Strip HTML tags if the backend returned HTML
                                                rawNotes = rawNotes
                                                    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n## $1\n')
                                                    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1')
                                                    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n')
                                                    .replace(/<br\s*\/?>/gi, '\n')
                                                    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
                                                    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
                                                    .replace(/<code>(.*?)<\/code>/gi, '`$1`')
                                                    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1')
                                                    .replace(/<[^>]*>/g, '') // strip any remaining HTML
                                                    .replace(/&nbsp;/g, ' ')
                                                    .replace(/&amp;/g, '&')
                                                    .replace(/&lt;/g, '<')
                                                    .replace(/&gt;/g, '>')
                                                    .replace(/\n{3,}/g, '\n\n')
                                                    .trim();

                                                const sections = rawNotes.split(/\n(?=##\s)/).filter(s => s.trim());
                                                const newPages = [];

                                                if (sections.length > 1) {
                                                    // Markdown with ## headings
                                                    sections.forEach((section, idx) => {
                                                        const lines = section.split('\n').filter(l => l.trim());
                                                        const title = lines[0]?.replace(/^#+\s*/, '') || `Section ${idx + 1}`;
                                                        const content = lines.slice(1).map(line => {
                                                            const clean = line.trim();
                                                            if (clean.startsWith('- ') || clean.startsWith('* ')) return { type: 'bullet', text: clean.replace(/^[-*]\s*/, '').replace(/\*\*/g, '') };
                                                            if (clean.startsWith('> ')) return { type: 'highlight', text: clean.replace(/^>\s*/, '') };
                                                            if (clean.startsWith('### ')) return { type: 'subheading', text: clean.replace(/^#+\s*/, '') };
                                                            if (clean.match(/^\d+\.\s/)) return { type: 'numberedList', num: parseInt(clean), text: clean.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '') };
                                                            if (clean.startsWith('**') && clean.endsWith('**')) return { type: 'important', text: clean.replace(/\*\*/g, '') };
                                                            return { type: 'text', text: clean.replace(/\*\*/g, '') };
                                                        }).filter(b => b.text.length > 0);
                                                        if (content.length > 0) {
                                                            newPages.push({ title, topic: `From: ${file.name}`, content });
                                                        }
                                                    });
                                                }

                                                // If no markdown sections found, split by sentences
                                                if (newPages.length === 0) {
                                                    const sentences = rawNotes.split(/[.!?]+/).filter(s => s.trim().length > 10).map(s => s.trim());
                                                    for (let i = 0; i < sentences.length; i += 5) {
                                                        const chunk = sentences.slice(i, i + 5);
                                                        newPages.push({
                                                            title: i === 0 ? `Your Notes: ${file.name}` : `Notes — Part ${Math.floor(i / 5) + 1}`,
                                                            topic: 'Uploaded Material',
                                                            content: [
                                                                { type: 'heading', text: i === 0 ? 'Key Points from Your Upload' : 'Continued' },
                                                                ...chunk.map(s => ({ type: 'text', text: s + '.' })),
                                                            ],
                                                        });
                                                    }
                                                }

                                                // Add a header page for the upload
                                                const headerPage = {
                                                    title: `Uploaded: ${file.name}`,
                                                    topic: 'Your Material',
                                                    content: [
                                                        { type: 'heading', text: 'Notes from Your Upload' },
                                                        { type: 'textLarge', text: `The following pages contain AI-processed notes from your uploaded file "${file.name}". The AI has extracted key information, filled knowledge gaps, and organized everything for easy revision.` },
                                                        { type: 'important', text: `${newPages.length} page${newPages.length !== 1 ? 's' : ''} of notes were generated from your material.` },
                                                    ],
                                                };

                                                setUploadedPages([headerPage, ...newPages]);
                                            } catch (err) {
                                                console.log('Upload error:', err);
                                                alert('Upload failed. Please try again.');
                                            }
                                        };
                                        input.click();
                                    }}
                                    pages={(() => {
                                        const epTitle = episode.title || 'Episode';
                                        const raw = episode.content || episode.story || episode.explanation || '';
                                        const cleanContent = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                                        const sentences = cleanContent.split(/[.!?]+/).filter(s => s.trim().length > 15).map(s => s.trim());
                                        const hasBEContent = sentences.length >= 5; // backend actually returned real content
                                        const P = [];

                                        if (hasBEContent) {
                                            // ═══ REAL CONTENT from backend ═══
                                            // Split into pages of ~4-5 sentences each with proper structure
                                            const chunkSize = 5;
                                            for (let i = 0; i < sentences.length; i += chunkSize) {
                                                const chunk = sentences.slice(i, i + chunkSize);
                                                const pageNum = Math.floor(i / chunkSize) + 1;
                                                P.push({
                                                    title: pageNum === 1 ? epTitle : `${epTitle} — Part ${pageNum}`,
                                                    topic: pageNum === 1 ? 'Overview' : `Page ${pageNum}`,
                                                    content: [
                                                        { type: 'heading', text: pageNum === 1 ? `Understanding ${epTitle}` : `Continued — ${epTitle}` },
                                                        ...chunk.map((s, j) => {
                                                            if (j === 0 && pageNum === 1) return { type: 'textLarge', text: s + '.' };
                                                            if (j === chunk.length - 1) return { type: 'highlight', text: s + '.' };
                                                            return { type: 'text', text: s + '.' };
                                                        }),
                                                    ],
                                                });
                                            }
                                        } else {
                                            // ═══ FALLBACK: Backend down — generate meaningful placeholder ═══
                                            // This teaches actual concepts based on the topic name
                                            P.push({ title: epTitle, topic: 'Introduction', content: [
                                                { type: 'textLarge', text: `This episode covers ${epTitle} — a core topic in your learning path. The notes below will be populated with AI-generated educational content once the backend is available.` },
                                                { type: 'important', text: 'The AI backend is currently unavailable. Notes shown here are placeholder outlines. Watch the video tab for full content, or upload your own notes using the Upload button above.' },
                                                { type: 'heading', text: 'What to Expect' },
                                                { type: 'bullet', text: `Definition and scope of ${epTitle}` },
                                                { type: 'bullet', text: 'Core principles and how they connect to other concepts' },
                                                { type: 'bullet', text: 'Step-by-step walkthrough with examples' },
                                                { type: 'bullet', text: 'Common pitfalls and how to avoid them' },
                                                { type: 'bullet', text: 'Practice problems and real-world applications' },
                                            ] });
                                        }

                                        // Always add a visual reference page
                                        P.push({ title: 'Visual Reference', topic: epTitle, content: [
                                            { type: 'heading', text: 'Concept Map' },
                                            { type: 'diagram', label: `${epTitle} Learning Path`, nodes: [
                                                'Prerequisites',
                                                epTitle.split(' ')[0] + ' Basics',
                                                'Core ' + epTitle,
                                                'Advanced Topics',
                                                'Applications',
                                            ]},
                                        ] });

                                        // Practice page
                                        P.push({ title: 'Practice & Review', topic: epTitle, content: [
                                            { type: 'heading', text: 'Test Your Understanding' },
                                            { type: 'numberedList', num: 1, text: `Explain ${epTitle} in simple terms — use an analogy from everyday life.` },
                                            { type: 'numberedList', num: 2, text: 'Write down the 3 most important things you learned.' },
                                            { type: 'numberedList', num: 3, text: 'Try the Code Lab problems in the next tab.' },
                                            { type: 'numberedList', num: 4, text: 'Take the Assessment to measure your understanding.' },
                                            { type: 'quote', text: 'What I cannot create, I do not understand.', author: 'Richard Feynman' },
                                            { type: 'textSmall', text: 'Use the pen tool to write your own notes on any page. Highlight important sections with the highlighter tool.' },
                                        ] });

                                        // Append any uploaded notes pages at the end
                                        return [...P, ...uploadedPages];
                                    })()}
                                />
                            </motion.div>
                        )}

                        {/* ── CODE LAB TAB — 5 problems in sequence ── */}
                        {activeTab === 'code' && isCodeTopic && (
                            <CodeLabTab
                                episode={episode}
                                conceptId={conceptId}
                                problems={matchedProblems}
                                problemType={problemType}
                                onCodeError={struggle.recordError}
                                onCodeSuccess={struggle.recordSuccess}
                                onCodeChange={setCurrentCode}
                            />
                        )}

                        {/* ── ASSESSMENT TAB ── */}
                        {activeTab === 'assessment' && (
                            <motion.div
                                key="assessment"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.2 }}
                            >
                                <AssessmentLoader
                                    activities={episode.activities}
                                    conceptId={conceptId}
                                    conceptName={episode.title || conceptId}
                                    episodeContent={episode.content || ''}
                                    learnerId={learnerId.current}
                                    onCorrect={struggle.recordSuccess}
                                    onIncorrect={() => { struggle.recordError(); struggle.recordGateFailure(); }}
                                />
                            </motion.div>
                        )}
                        {/* ── ADAPT IQ TAB — AI-personalized challenges based on struggle ── */}
                        {activeTab === 'adapt' && (
                            <motion.div
                                key="adapt"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.2 }}
                            >
                                <AdaptIQSection
                                    conceptId={conceptId}
                                    conceptName={episode.title || conceptId}
                                    liveMetrics={struggle.liveMetrics}
                                    zone={struggle.zone}
                                    score={struggle.score}
                                    zoneMeta={struggle.zoneMeta}
                                    timeline={struggle.timeline}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Mark Complete — always visible */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex justify-end pt-8 pb-8"
                    >
                        <button
                            onClick={handleComplete}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E87C03] text-white font-bold text-sm hover:brightness-110 transition-all shadow-[0_0_25px_rgba(212,165,116,0.2)] gold-glow"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check_circle</span>
                            Mark Complete
                        </button>
                    </motion.div>
                </div>

                {/* ── AI Mentor floating button ── */}
                <AnimatePresence>
                    {!mentorOpen && (
                        <motion.button
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1, scale: ['struggling', 'frustrated', 'giving_up'].includes(struggle.zone) ? [1, 1.08, 1] : 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            transition={{
                                delay: 0.5,
                                scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
                            }}
                            onClick={handleOpenMentor}
                            className="fixed bottom-6 right-6 size-14 rounded-full bg-[#E50914] text-white flex items-center justify-center hover:brightness-110 transition-all z-50"
                            style={{ boxShadow: '0 0 30px rgba(193,124,100,0.4), 0 4px 16px rgba(0,0,0,0.15)' }}
                            title="Ask AI Mentor"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>psychology</span>
                            {['struggling', 'frustrated', 'giving_up'].includes(struggle.zone) && (
                                <span className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                                    <span className="text-[8px] font-bold text-white">!</span>
                                </span>
                            )}
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* ── Inline Mentor Chat ── */}
                <InlineMentorChat
                    isOpen={mentorOpen}
                    onClose={() => setMentorOpen(false)}
                    conceptId={conceptId}
                    conceptName={episode?.title || conceptId}
                    autoTriggerMessage={mentorAutoMsg}
                    zone={struggle.zone}
                    zoneMeta={struggle.zoneMeta}
                    score={struggle.score}
                />

                {/* ── Real-Time Struggle Awareness ── */}
                <StruggleAwarenessPanel
                    zone={struggle.zone}
                    zoneMeta={struggle.zoneMeta}
                    score={struggle.score}
                    autoHint={struggle.autoHint}
                    suggestBridgeSprint={struggle.suggestBridgeSprint}
                    onDismissHint={struggle.dismissHint}
                    conceptId={conceptId}
                    liveMetrics={struggle.liveMetrics}
                    timeline={struggle.timeline}
                    activeTab={activeTab}
                    onOpenMentor={handleOpenMentor}
                    onOpenBridgeSprint={() => router.push(`/bridge-sprint?concept_id=${conceptId}`)}
                />

                {/* ── Mastery Checkpoint ── */}
                <MasteryCheckpoint
                    isOpen={checkpointOpen}
                    masteryPct={masteryPct}
                    xpEarned={xpEarned}
                    onNextEpisode={handleNextEpisode}
                    onBackToConstellation={handleBackToConstellation}
                />

            </div>
        </PrerequisiteGate>
    );
}

// ─── Export with Suspense ──────────────────────────────────────────────────────

export default function EpisodePlayerWrapper() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="size-10 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <EpisodePlayer />
        </Suspense>
    );
}

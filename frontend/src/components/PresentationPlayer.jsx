"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Slide type renderers ─────────────────────────────────────────────────────

function TitleSlide({ content, title }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
            >
                <h1 className="text-4xl md:text-5xl font-black text-[#2A2018] leading-tight mb-4">
                    {content?.headline || title}
                </h1>
                <motion.div
                    className="w-24 h-1 bg-gradient-to-r from-[#C17C64] to-[#D4A574] rounded-full mx-auto mb-4"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                />
                {content?.tagline && (
                    <motion.p
                        className="text-lg md:text-xl text-[#6B5E52] font-medium"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        {content.tagline}
                    </motion.p>
                )}
            </motion.div>
        </div>
    );
}

function BulletsSlide({ content, title }) {
    const points = content?.points || [];
    return (
        <div className="flex flex-col justify-center h-full px-10 md:px-16">
            <motion.h2
                className="text-2xl md:text-3xl font-bold text-[#C17C64] mb-8"
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                {title}
            </motion.h2>
            <div className="space-y-4">
                {points.map((point, i) => (
                    <motion.div
                        key={i}
                        className="flex items-start gap-4"
                        initial={{ x: -30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.3 + i * 0.4, duration: 0.4 }}
                    >
                        <div className="size-8 rounded-lg bg-gradient-to-br from-[#C17C64] to-[#D4A574] flex items-center justify-center shrink-0 mt-0.5 shadow-md">
                            <span className="text-white text-sm font-bold">{i + 1}</span>
                        </div>
                        <p className="text-base md:text-lg text-[#2A2018] font-medium leading-relaxed">{point}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function DiagramSlide({ content, title }) {
    const nodes = content?.nodes || [];
    const connections = content?.connections || [];
    const layout = content?.layout || 'flow';

    const colorMap = {
        primary: { bg: '#C17C64', text: '#FFFFFF' },
        secondary: { bg: '#D4A574', text: '#FFFFFF' },
        accent: { bg: '#8FA395', text: '#FFFFFF' },
    };

    // Calculate node positions based on layout
    const getNodePosition = (index, total) => {
        if (layout === 'cycle') {
            const angle = (2 * Math.PI * index) / total - Math.PI / 2;
            const rx = 140, ry = 100;
            return { x: 50 + (rx * Math.cos(angle)) / 3, y: 55 + (ry * Math.sin(angle)) / 2.5 };
        }
        if (layout === 'tree') {
            const cols = Math.ceil(Math.sqrt(total));
            const row = Math.floor(index / cols);
            const col = index % cols;
            const rowCount = Math.min(cols, total - row * cols);
            return { x: 20 + ((col + 0.5) / rowCount) * 60, y: 30 + row * 25 };
        }
        // flow (horizontal)
        return { x: 10 + (index / Math.max(1, total - 1)) * 80, y: 55 };
    };

    return (
        <div className="flex flex-col justify-center h-full px-10 md:px-16">
            <motion.h2
                className="text-2xl md:text-3xl font-bold text-[#C17C64] mb-6"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                {title}
            </motion.h2>
            <div className="relative w-full" style={{ height: '55%', minHeight: 200 }}>
                {/* Connection lines */}
                <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
                    {connections.map((conn, i) => {
                        const from = getNodePosition(conn.from, nodes.length);
                        const to = getNodePosition(conn.to, nodes.length);
                        return (
                            <motion.line
                                key={i}
                                x1={`${from.x}%`} y1={`${from.y}%`}
                                x2={`${to.x}%`} y2={`${to.y}%`}
                                stroke="#D4A574"
                                strokeWidth="2.5"
                                strokeDasharray="6,3"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.7 }}
                                transition={{ delay: 0.5 + i * 0.2, duration: 0.5 }}
                            />
                        );
                    })}
                    {/* Arrow markers */}
                    {connections.map((conn, i) => {
                        const to = getNodePosition(conn.to, nodes.length);
                        return (
                            <motion.circle
                                key={`arrow-${i}`}
                                cx={`${to.x}%`} cy={`${to.y}%`} r="4"
                                fill="#D4A574"
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.8 + i * 0.2 }}
                            />
                        );
                    })}
                </svg>

                {/* Nodes */}
                {nodes.map((node, i) => {
                    const pos = getNodePosition(i, nodes.length);
                    const colors = colorMap[node.type] || colorMap.primary;
                    return (
                        <motion.div
                            key={i}
                            className="absolute flex items-center justify-center text-center px-4 py-3 rounded-xl shadow-lg font-semibold text-sm md:text-base"
                            style={{
                                left: `${pos.x}%`,
                                top: `${pos.y}%`,
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: colors.bg,
                                color: colors.text,
                                zIndex: 1,
                                minWidth: 100,
                                maxWidth: 180,
                            }}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.3 + i * 0.25, type: 'spring', stiffness: 200 }}
                        >
                            {node.label}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

function CodeSlide({ content, title }) {
    const code = content?.code || '';
    const highlightLines = content?.highlight_lines || [];
    const lines = code.split('\n');

    return (
        <div className="flex flex-col justify-center h-full px-10 md:px-16">
            <motion.h2
                className="text-2xl md:text-3xl font-bold text-[#C17C64] mb-5"
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                {title}
            </motion.h2>
            <motion.div
                className="rounded-2xl overflow-hidden shadow-xl border border-[#D8CCBE]"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
            >
                {/* Terminal header */}
                <div className="bg-[#2A2018] px-4 py-2.5 flex items-center gap-2">
                    <div className="size-3 rounded-full bg-[#C17C64]" />
                    <div className="size-3 rounded-full bg-[#D4A574]" />
                    <div className="size-3 rounded-full bg-[#8FA395]" />
                    <span className="ml-3 text-[#9A8E82] text-xs font-mono">{content?.language || 'code'}</span>
                </div>
                <div className="bg-[#332B22] p-5 overflow-x-auto">
                    <pre className="text-sm md:text-base font-mono leading-relaxed">
                        {lines.map((line, i) => (
                            <motion.div
                                key={i}
                                className={`px-2 -mx-2 rounded ${highlightLines.includes(i + 1) ? 'bg-[#C17C64]/15 border-l-2 border-[#C17C64]' : ''}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + i * 0.15, duration: 0.3 }}
                            >
                                <span className="text-[#6B5E52] mr-4 select-none text-xs">{String(i + 1).padStart(2)}</span>
                                <span className="text-[#F5EDE4]">{line}</span>
                            </motion.div>
                        ))}
                    </pre>
                </div>
            </motion.div>
        </div>
    );
}

function ComparisonSlide({ content, title }) {
    const left = content?.left || {};
    const right = content?.right || {};

    const renderSide = (side, color, delay) => (
        <motion.div
            className="flex-1 rounded-2xl p-6 border"
            style={{ backgroundColor: `${color}08`, borderColor: `${color}25` }}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay, duration: 0.5 }}
        >
            <h3 className="text-lg md:text-xl font-bold mb-4" style={{ color }}>{side.title}</h3>
            <div className="space-y-3">
                {(side.points || []).map((point, i) => (
                    <motion.div
                        key={i}
                        className="flex items-start gap-2"
                        initial={{ x: -15, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: delay + 0.2 + i * 0.2 }}
                    >
                        <div className="size-2 rounded-full mt-2 shrink-0" style={{ backgroundColor: color }} />
                        <p className="text-sm md:text-base text-[#2A2018]">{point}</p>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );

    return (
        <div className="flex flex-col justify-center h-full px-10 md:px-16">
            <motion.h2
                className="text-2xl md:text-3xl font-bold text-[#C17C64] mb-6"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                {title}
            </motion.h2>
            <div className="flex gap-5">
                {renderSide(left, '#C17C64', 0.3)}
                <div className="flex items-center">
                    <div className="text-2xl font-bold text-[#D4A574]">vs</div>
                </div>
                {renderSide(right, '#8FA395', 0.5)}
            </div>
        </div>
    );
}

function SummarySlide({ content, title }) {
    const points = content?.points || [];
    return (
        <div className="flex flex-col items-center justify-center h-full px-10 md:px-16 text-center">
            <motion.div
                className="size-16 rounded-full bg-gradient-to-br from-[#8FA395] to-[#8FA395]/70 flex items-center justify-center mb-6 shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
            >
                <span className="material-symbols-outlined text-white" style={{ fontSize: 32 }}>check_circle</span>
            </motion.div>
            <motion.h2
                className="text-2xl md:text-3xl font-bold text-[#2A2018] mb-8"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                {title || 'Key Takeaways'}
            </motion.h2>
            <div className="space-y-4 max-w-lg">
                {points.map((point, i) => (
                    <motion.div
                        key={i}
                        className="flex items-center gap-3 bg-white/60 rounded-xl px-5 py-3 shadow-sm border border-[#D8CCBE]"
                        initial={{ x: i % 2 === 0 ? -40 : 40, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.4 + i * 0.3, duration: 0.4 }}
                    >
                        <span className="material-symbols-outlined text-[#8FA395]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
                            verified
                        </span>
                        <p className="text-sm md:text-base text-[#2A2018] font-medium text-left">{point}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function KeypointSlide({ content, title }) {
    const iconMap = {
        lightbulb: 'lightbulb',
        warning: 'warning',
        star: 'star',
        check: 'check_circle',
    };
    const icon = iconMap[content?.icon] || 'lightbulb';

    return (
        <div className="flex flex-col items-center justify-center h-full px-10 md:px-16 text-center">
            <motion.div
                className="size-20 rounded-2xl bg-gradient-to-br from-[#D4A574] to-[#C17C64] flex items-center justify-center mb-8 shadow-xl"
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 150, damping: 15 }}
            >
                <span className="material-symbols-outlined text-white" style={{ fontSize: 40, fontVariationSettings: "'FILL' 1" }}>
                    {icon}
                </span>
            </motion.div>
            <motion.h2
                className="text-xl md:text-2xl font-bold text-[#C17C64] mb-3"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
            >
                {title}
            </motion.h2>
            <motion.p
                className="text-2xl md:text-3xl font-black text-[#2A2018] mb-4 max-w-md leading-tight"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                {content?.text}
            </motion.p>
            {content?.detail && (
                <motion.p
                    className="text-base md:text-lg text-[#6B5E52] max-w-lg"
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                >
                    {content.detail}
                </motion.p>
            )}
        </div>
    );
}

// ─── Slide renderer dispatch ──────────────────────────────────────────────────

const SLIDE_RENDERERS = {
    title: TitleSlide,
    bullets: BulletsSlide,
    diagram: DiagramSlide,
    code: CodeSlide,
    comparison: ComparisonSlide,
    summary: SummarySlide,
    keypoint: KeypointSlide,
};

// ─── Animation variants for slide transitions ─────────────────────────────────

const slideVariants = {
    enter_left:   { initial: { x: '-100%', opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: '100%', opacity: 0 } },
    enter_right:  { initial: { x: '100%', opacity: 0 },  animate: { x: 0, opacity: 1 }, exit: { x: '-100%', opacity: 0 } },
    enter_bottom: { initial: { y: '50%', opacity: 0 },   animate: { y: 0, opacity: 1 }, exit: { y: '-50%', opacity: 0 } },
    fade:         { initial: { opacity: 0 },              animate: { opacity: 1 },       exit: { opacity: 0 } },
    zoom:         { initial: { scale: 0.7, opacity: 0 },  animate: { scale: 1, opacity: 1 }, exit: { scale: 1.2, opacity: 0 } },
    typewriter:   { initial: { opacity: 0, y: 20 },       animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } },
};

// ─── Main PresentationPlayer ──────────────────────────────────────────────────

export default function PresentationPlayer({ slides = [], conceptName = '', onComplete }) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [slideProgress, setSlideProgress] = useState(0);
    const [totalElapsed, setTotalElapsed] = useState(0);

    const audioRef = useRef(null);
    const timerRef = useRef(null);
    const utteranceRef = useRef(null);
    const synthRef = useRef(null);

    const totalDuration = slides.reduce((sum, s) => sum + (s.duration || 5), 0);
    const slide = slides[currentSlide];
    const isLastSlide = currentSlide === slides.length - 1;

    // Init speech synthesis
    useEffect(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            synthRef.current = window.speechSynthesis;
        }
    }, []);

    const stopSpeech = useCallback(() => {
        if (synthRef.current?.speaking) synthRef.current.cancel();
    }, []);

    // ── Advance to next slide ──
    const goToNext = useCallback(() => {
        stopSpeech();
        if (isLastSlide) {
            setIsPlaying(false);
            onComplete?.();
            return;
        }
        setCurrentSlide(prev => prev + 1);
        setSlideProgress(0);
    }, [isLastSlide, onComplete, stopSpeech]);

    const goToPrev = useCallback(() => {
        stopSpeech();
        if (currentSlide > 0) {
            setCurrentSlide(prev => prev - 1);
            setSlideProgress(0);
        }
    }, [currentSlide, stopSpeech]);

    // ── Play audio/speech for current slide ──
    useEffect(() => {
        if (!slide || !isPlaying) return;

        const aud = audioRef.current;
        const synth = synthRef.current;
        let speechDone = false;
        let timerDone = false;
        let cancelled = false;

        const tryAdvance = () => {
            // Only advance when BOTH timer is done AND speech is done
            if (speechDone && timerDone && !cancelled) {
                goToNext();
            }
        };

        // Use Polly audio if available, otherwise browser TTS
        if (aud && slide.audio_url) {
            aud.src = slide.audio_url;
            aud.load();
            aud.play().catch(() => {});
            aud.onended = () => { speechDone = true; tryAdvance(); };
        } else if (synth && slide.narration) {
            synth.cancel();
            const utt = new SpeechSynthesisUtterance(slide.narration);
            utt.lang = 'en-US';
            utt.rate = 1.0;
            utt.pitch = 1.0;
            const voices = synth.getVoices();
            const preferred = voices.find(v =>
                v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google'))
            ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
            if (preferred) utt.voice = preferred;
            utt.onend = () => { speechDone = true; tryAdvance(); };
            utteranceRef.current = utt;
            synth.speak(utt);
        } else {
            // No audio at all — just use timer
            speechDone = true;
        }

        // Timer for progress bar (visual only) — uses narration word count for estimate
        const wordCount = (slide.narration || '').split(/\s+/).length;
        const estimatedSpeechMs = Math.max((slide.duration || 5) * 1000, wordCount / 2.5 * 1000);
        const tick = 50;
        let elapsed = 0;

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            elapsed += tick;
            setSlideProgress(Math.min(1, elapsed / estimatedSpeechMs));
            setTotalElapsed(prev => prev + tick / 1000);

            if (elapsed >= estimatedSpeechMs) {
                clearInterval(timerRef.current);
                timerDone = true;
                tryAdvance();
            }
        }, tick);

        return () => {
            cancelled = true;
            if (timerRef.current) clearInterval(timerRef.current);
            if (aud) { aud.pause(); aud.currentTime = 0; aud.onended = null; }
            if (synth?.speaking) synth.cancel();
        };
    }, [currentSlide, isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Pause/Resume ──
    const togglePlay = () => {
        const next = !isPlaying;
        setIsPlaying(next);
        const aud = audioRef.current;
        const synth = synthRef.current;
        if (next) {
            if (aud && slide?.audio_url) aud.play().catch(() => {});
            else if (synth && slide?.narration) {
                // SpeechSynthesis can't resume reliably, restart current slide narration
                synth.cancel();
                const utt = new SpeechSynthesisUtterance(slide.narration);
                utt.lang = 'en-US';
                utt.rate = 1.0;
                const voices = synth.getVoices();
                const preferred = voices.find(v => v.lang.startsWith('en')) || voices[0];
                if (preferred) utt.voice = preferred;
                synth.speak(utt);
            }
        } else {
            if (aud) aud.pause();
            if (synth?.speaking) synth.cancel();
        }
    };

    // ── Click to go to specific slide ──
    const goToSlide = (index) => {
        setCurrentSlide(index);
        setSlideProgress(0);
        if (!isPlaying) setIsPlaying(true);
    };

    if (!slides.length) return null;

    const transition = slideVariants[slide?.visual_emphasis] || slideVariants.fade;

    // Calculate overall progress
    let elapsedBefore = 0;
    for (let i = 0; i < currentSlide; i++) elapsedBefore += (slides[i].duration || 5);
    const currentSlideDur = slide?.duration || 5;
    const overallProgress = (elapsedBefore + slideProgress * currentSlideDur) / totalDuration;

    const SlideRenderer = SLIDE_RENDERERS[slide?.type] || BulletsSlide;

    return (
        <div className="rounded-2xl overflow-hidden border border-[#D8CCBE] shadow-lg bg-white">
            {/* ── Slide Area ── */}
            <div
                className="aspect-video relative overflow-hidden cursor-pointer"
                style={{ backgroundColor: '#F5EDE4' }}
                onClick={togglePlay}
            >
                {/* Subtle background pattern */}
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: 'radial-gradient(circle at 20% 50%, #C17C64 1px, transparent 1px), radial-gradient(circle at 80% 50%, #D4A574 1px, transparent 1px)',
                        backgroundSize: '60px 60px',
                    }}
                />

                {/* Slide number badge */}
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#2A2018]/8 text-[10px] font-bold text-[#6B5E52] tracking-wider">
                        {currentSlide + 1} / {slides.length}
                    </span>
                </div>

                {/* PrimeLearn watermark */}
                <div className="absolute top-4 left-4 z-20">
                    <span className="text-[10px] font-black text-[#C17C64]/30 uppercase tracking-[0.2em]">PrimeLearn</span>
                </div>

                {/* Animated slide content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentSlide}
                        className="absolute inset-0"
                        initial={transition.initial}
                        animate={transition.animate}
                        exit={transition.exit}
                        transition={{ duration: 0.5, ease: 'easeInOut' }}
                    >
                        <SlideRenderer
                            content={slide?.content}
                            title={slide?.title}
                            subtitle={slide?.subtitle}
                        />
                    </motion.div>
                </AnimatePresence>

                {/* Narration subtitle bar */}
                {slide?.narration && isPlaying && (
                    <motion.div
                        className="absolute bottom-0 left-0 right-0 z-10"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="bg-gradient-to-t from-[#2A2018]/70 via-[#2A2018]/40 to-transparent pt-10 pb-4 px-8">
                            <p className="text-white text-sm md:text-base font-medium text-center leading-relaxed drop-shadow-lg max-w-2xl mx-auto">
                                {slide.narration}
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Pause overlay */}
                <AnimatePresence>
                    {!isPlaying && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-[#2A2018]/20 flex items-center justify-center z-30"
                        >
                            <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                className="size-16 rounded-full bg-[#C17C64]/90 backdrop-blur-sm flex items-center justify-center shadow-xl"
                            >
                                <span className="material-symbols-outlined text-white" style={{ fontSize: 32 }}>play_arrow</span>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Control Bar ── */}
            <div className="bg-[#F5EDE4] border-t border-[#D8CCBE]">
                {/* Overall progress bar */}
                <div className="px-4 pt-2">
                    <div className="w-full h-1.5 bg-[#E2D8CC] rounded-full overflow-hidden">
                        <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-[#C17C64] to-[#D4A574]"
                            animate={{ width: `${overallProgress * 100}%` }}
                            transition={{ duration: 0.1 }}
                        />
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="text-[#2A2018] hover:text-[#C17C64] transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                                {isPlaying ? 'pause' : 'play_arrow'}
                            </span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); goToPrev(); }} className="text-[#6B5E52] hover:text-[#C17C64] transition-colors disabled:opacity-30" disabled={currentSlide === 0}>
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>skip_previous</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); goToNext(); }} className="text-[#6B5E52] hover:text-[#C17C64] transition-colors disabled:opacity-30" disabled={isLastSlide && !isPlaying}>
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>skip_next</span>
                        </button>
                        <span className="text-[11px] font-mono text-[#6B5E52]">
                            {Math.floor(overallProgress * totalDuration / 60)}:{String(Math.floor(overallProgress * totalDuration) % 60).padStart(2, '0')} / {Math.floor(totalDuration / 60)}:{String(Math.floor(totalDuration) % 60).padStart(2, '0')}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Slide dots */}
                        <div className="hidden sm:flex items-center gap-1">
                            {slides.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={(e) => { e.stopPropagation(); goToSlide(i); }}
                                    className={`transition-all rounded-full ${
                                        i === currentSlide ? 'w-5 h-2 bg-[#C17C64]' :
                                        i < currentSlide ? 'size-2 bg-[#8FA395]' : 'size-2 bg-[#D8CCBE]'
                                    }`}
                                    title={`Slide ${i + 1}`}
                                />
                            ))}
                        </div>

                        <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-[#C17C64] uppercase tracking-wider bg-[#C17C64]/8 border border-[#C17C64]/15">
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>auto_awesome</span>
                            AI Presentation
                        </span>
                    </div>
                </div>
            </div>

            {/* Hidden audio element */}
            <audio ref={audioRef} preload="auto" />
        </div>
    );
}

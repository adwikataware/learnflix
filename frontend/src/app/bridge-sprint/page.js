"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getLearnerId, getConstellation, generateSprint, updateBKT } from '@/lib/api';

// ─── Rich local mini-lesson generator ────────────────────────────────────────
function generateLocalSprint(gapConcepts) {
    const items = [];

    gapConcepts.forEach((gap) => {
        const name = gap.label;
        const isBeginner = gap.mastery < 20;

        // Section 1: Introduction & Definition
        items.push({
            concept_name: name,
            section: 'introduction',
            section_label: 'What is it?',
            section_icon: 'menu_book',
            estimated_minutes: 3,
            content_sections: [
                {
                    type: 'definition',
                    title: `Understanding ${name}`,
                    body: isBeginner
                        ? `${name} is a foundational concept that you'll encounter frequently as you progress. Before moving forward, let's make sure you have a solid grasp of what it means and why it matters.\n\nAt its core, ${name} addresses a specific problem or pattern in this domain. Understanding it well will make everything that builds on top of it much easier to learn.`
                        : `You've encountered ${name} before (${gap.mastery}% mastery), but there are some gaps we should fill. Let's do a focused review to strengthen your understanding before moving on.`,
                },
                {
                    type: 'key_points',
                    title: 'Key Points to Remember',
                    points: [
                        `${name} is important because it serves as a building block for more advanced topics`,
                        `The core idea revolves around solving a specific class of problems efficiently`,
                        `Understanding ${name} helps you recognize patterns and make better decisions`,
                        isBeginner
                            ? `Don't worry about memorizing everything — focus on understanding the "why" first`
                            : `Focus on the edge cases and nuances you might have missed the first time`,
                    ],
                },
            ],
        });

        // Section 2: Deep Dive & Examples
        items.push({
            concept_name: name,
            section: 'deep_dive',
            section_label: 'How does it work?',
            section_icon: 'science',
            estimated_minutes: 4,
            content_sections: [
                {
                    type: 'explanation',
                    title: 'Breaking It Down',
                    body: isBeginner
                        ? `Let's break ${name} down step by step:\n\n1. The Problem: Before ${name} existed, there was a challenge that needed solving. Think about what makes this concept necessary.\n\n2. The Approach: ${name} provides a structured way to handle this challenge. It works by establishing clear rules and patterns.\n\n3. The Result: When applied correctly, ${name} leads to cleaner, more efficient, and more maintainable solutions.\n\nThink of it like learning to ride a bicycle — once you understand the balance (the core principle), everything else (steering, braking, turning) becomes natural.`
                        : `Since you have some familiarity with ${name}, let's go deeper:\n\n1. Common Misconceptions: Many learners confuse ${name} with related concepts. The key distinction is in how and when it's applied.\n\n2. Edge Cases: ${name} doesn't always behave the same way. Consider scenarios where the standard approach might not work.\n\n3. Best Practices: Experienced practitioners use ${name} in specific patterns. Understanding these patterns will level up your skills.`,
                },
                {
                    type: 'example',
                    title: 'Real-World Analogy',
                    body: `Imagine you're organizing a library. ${name} is like the classification system — it tells you where things belong and how to find them quickly. Without it, you'd have to search through every shelf every time.\n\nIn the same way, ${name} gives structure to what would otherwise be chaos. Once you internalize this mental model, applying it becomes second nature.`,
                },
            ],
        });

        // Section 3: Practice & Self-Check
        items.push({
            concept_name: name,
            section: 'practice',
            section_label: 'Test Your Understanding',
            section_icon: 'quiz',
            estimated_minutes: 2,
            content_sections: [
                {
                    type: 'exercise',
                    title: 'Think About This',
                    body: `Before moving on, try to answer these questions in your head:\n\n• If someone asked you "What is ${name}?", what would you say in one sentence?\n\n• Can you think of a scenario where ${name} would be the right approach? What about a scenario where it wouldn't be?\n\n• How does ${name} connect to what you've already learned?`,
                },
            ],
            question: `How well do you understand ${name} now?`,
            options: [
                { label: 'I can explain it clearly to someone else', score: 3 },
                { label: 'I understand the main idea and most details', score: 2 },
                { label: 'I get the basics but some parts are fuzzy', score: 1 },
                { label: 'I need to study this more thoroughly', score: 0 },
            ],
        });
    });

    return items;
}

// ─── Section renderer ────────────────────────────────────────────────────────
function ContentSection({ section }) {
    if (section.type === 'definition' || section.type === 'explanation' || section.type === 'exercise' || section.type === 'example') {
        return (
            <div className="mb-5 last:mb-0">
                <h3 className="text-base font-bold text-[#E5E5E5] mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
                        {section.type === 'definition' ? 'auto_stories' : section.type === 'explanation' ? 'psychology' : section.type === 'example' ? 'lightbulb' : 'edit_note'}
                    </span>
                    {section.title}
                </h3>
                <div className="text-[#E5E5E5] text-[14.5px] leading-[1.75] whitespace-pre-line">
                    {section.body}
                </div>
            </div>
        );
    }

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

    return null;
}

// ─── Main Bridge Sprint Page ────────────────────────────────────────────────
function BridgeSprintPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const conceptId = searchParams.get('concept_id');

    const [loading, setLoading] = useState(true);
    const [gaps, setGaps] = useState([]);
    const [sprintItems, setSprintItems] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [completed, setCompleted] = useState(false);
    const [scores, setScores] = useState([]);
    const [allConcepts, setAllConcepts] = useState([]);
    const [pickerMode, setPickerMode] = useState(false);
    const learnerId = useRef(null);
    const startTime = useRef(Date.now());

    // ── Load gaps and generate sprint ──
    useEffect(() => {
        learnerId.current = getLearnerId();
        if (!learnerId.current) { router.push('/onboarding'); return; }

        // If no concept_id, show concept picker
        if (!conceptId) {
            (async () => {
                try {
                    const { data } = await getConstellation(learnerId.current);
                    if (data?.nodes?.length) {
                        const concepts = data.nodes.map((n, i) => ({
                            id: n.concept_id || n.id,
                            label: n.label || n.concept_id || `Concept ${i + 1}`,
                            mastery: Math.round((n.mastery ?? n.p_known ?? 0) * 100),
                            status: (n.mastery ?? 0) >= 0.8 ? 'mastered' : 'active',
                        }));
                        setAllConcepts(concepts);
                        setPickerMode(true);
                    }
                } catch { /* ignore */ }
                setLoading(false);
            })();
            return;
        }

        (async () => {
            try {
                const { data } = await getConstellation(learnerId.current);
                if (!data?.nodes) { router.push('/home'); return; }

                const nodes = data.nodes || [];
                const links = data.links || data.edges || [];

                const prereqIds = links
                    .filter(l => {
                        const tid = typeof l.target === 'object' ? l.target.id : l.target;
                        return tid === conceptId;
                    })
                    .map(l => typeof l.source === 'object' ? l.source.id : l.source);

                const gapList = prereqIds
                    .map(pid => {
                        const node = nodes.find(n => (n.concept_id || n.id) === pid);
                        if (!node) return null;
                        const mastery = Math.round((node.mastery ?? node.p_known ?? 0) * 100);
                        return { id: pid, label: node.label || node.name || pid, mastery };
                    })
                    .filter(g => g && g.mastery < 60);

                if (gapList.length === 0) {
                    const selfNode = nodes.find(n => (n.concept_id || n.id) === conceptId);
                    gapList.push({
                        id: conceptId,
                        label: selfNode?.label || conceptId,
                        mastery: Math.round((selfNode?.mastery ?? 0) * 100),
                    });
                }

                setGaps(gapList);

                // Try API first
                try {
                    const { data: sprintData } = await generateSprint({
                        learner_id: learnerId.current,
                        concept_id: conceptId,
                        gap_concepts: gapList.map(g => g.id),
                    });
                    if (sprintData?.sprint_items?.length || sprintData?.items?.length) {
                        setSprintItems(sprintData.sprint_items || sprintData.items);
                        setLoading(false);
                        return;
                    }
                } catch { /* fall through */ }

                // Local fallback — rich mini-lessons
                setSprintItems(generateLocalSprint(gapList));
            } catch {
                setSprintItems(generateLocalSprint([{ id: conceptId, label: conceptId, mastery: 0 }]));
            }
            setLoading(false);
            startTime.current = Date.now();
        })();
    }, [conceptId, router]);

    const current = sprintItems[currentStep];
    const progress = sprintItems.length > 0 ? ((currentStep + 1) / sprintItems.length) * 100 : 0;
    const totalTime = sprintItems.reduce((sum, item) => sum + (item.estimated_minutes || 3), 0);

    // Figure out which concept we're currently studying
    const uniqueConcepts = [...new Set(sprintItems.map(i => i.concept_name))];
    const currentConceptIdx = current ? uniqueConcepts.indexOf(current.concept_name) : 0;

    const handleNext = () => {
        if (selectedAnswer !== null) {
            setScores(prev => [...prev, { step: currentStep, answer: selectedAnswer, concept: current?.concept_name }]);
        }
        setSelectedAnswer(null);

        if (currentStep < sprintItems.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            setCompleted(true);
            gaps.forEach(gap => {
                updateBKT({
                    learner_id: learnerId.current,
                    concept_id: gap.id,
                    is_correct: true,
                }).catch(() => {});
            });
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
            setSelectedAnswer(null);
        }
    };

    // ── Concept Picker (no concept_id) ──
    if (pickerMode) {
        return (
            <div className="min-h-screen bg-[#141414]">
                <header className="sticky top-0 z-20 bg-[#141414]/95 backdrop-blur-sm border-b border-[#333333]">
                    <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
                        <button onClick={() => router.push('/home')} className="text-[#808080] hover:text-[#E5E5E5] transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
                        </button>
                        <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 22 }}>route</span>
                        <h1 className="text-lg font-bold text-[#E5E5E5]">Bridge Sprint</h1>
                    </div>
                </header>

                <div className="max-w-3xl mx-auto px-6 py-8">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-[#E5E5E5]">Choose a concept to review</h2>
                        <p className="text-sm text-[#B3B3B3] mt-1">Pick a concept for a quick but thorough study sprint covering all prerequisites.</p>
                    </div>

                    <div className="space-y-3">
                        {allConcepts.map((concept) => (
                            <motion.button
                                key={concept.id}
                                whileHover={{ scale: 1.01, y: -2 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => router.push(`/bridge-sprint?concept_id=${concept.id}`)}
                                className="w-full text-left bg-[#1E1E1E] border border-[#333333] rounded-xl p-5 flex items-center gap-4 hover:border-[#E50914]/40 transition-all group"
                            >
                                <div className="size-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: concept.status === 'mastered' ? '#46D36915' : '#E5091415' }}>
                                    <span className="material-symbols-outlined"
                                        style={{
                                            fontSize: 24,
                                            color: concept.status === 'mastered' ? '#46D369' : '#E50914',
                                            fontVariationSettings: "'FILL' 1"
                                        }}>
                                        {concept.status === 'mastered' ? 'check_circle' : 'play_circle'}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-[#E5E5E5] font-semibold text-sm group-hover:text-[#E50914] transition-colors truncate">{concept.label}</h3>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <div className="flex-1 h-1.5 bg-[#2E2E2E] rounded-full overflow-hidden max-w-[140px]">
                                            <div className="h-full rounded-full" style={{
                                                width: `${concept.mastery}%`,
                                                backgroundColor: concept.status === 'mastered' ? '#46D369' : '#E50914',
                                            }} />
                                        </div>
                                        <span className="text-xs text-[#808080]">{concept.mastery}% mastery</span>
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-[#333333] group-hover:text-[#E50914] transition-colors" style={{ fontSize: 20 }}>
                                    arrow_forward
                                </span>
                            </motion.button>
                        ))}
                    </div>

                    {allConcepts.length === 0 && (
                        <div className="text-center py-12">
                            <span className="material-symbols-outlined text-[#808080]" style={{ fontSize: 48, opacity: 0.3 }}>route</span>
                            <p className="text-[#808080] text-sm mt-3">No concepts available yet. Complete your assessment first.</p>
                            <button onClick={() => router.push('/onboarding')} className="mt-4 px-5 py-2.5 bg-[#E50914] text-white rounded-xl text-sm font-bold hover:brightness-110">
                                Start Assessment
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── Loading ──
    if (loading) {
        return (
            <div className="min-h-screen bg-[#141414] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-12 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[#B3B3B3] text-sm font-medium">Preparing your study sprint...</p>
                    <p className="text-[#808080] text-xs">Building mini-lessons for your prerequisites</p>
                </div>
            </div>
        );
    }

    // ── Completion Screen ──
    if (completed) {
        const elapsedMin = Math.max(1, Math.round((Date.now() - startTime.current) / 60000));
        const strongCount = scores.filter(s => s.answer === 0 || s.answer === 1).length;
        const needsWorkCount = scores.filter(s => s.answer === 2 || s.answer === 3).length;

        return (
            <div className="min-h-screen bg-[#141414] flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-lg bg-[#1E1E1E] rounded-2xl border border-[#333333] shadow-xl overflow-hidden"
                >
                    <div className="px-8 py-8 text-center bg-gradient-to-b from-[#46D369]/10 to-transparent">
                        <div className="size-16 rounded-full bg-[#46D369]/15 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-[#46D369]" style={{ fontSize: 32, fontVariationSettings: "'FILL' 1" }}>
                                school
                            </span>
                        </div>
                        <h2 className="text-2xl font-bold text-[#E5E5E5]">Sprint Complete!</h2>
                        <p className="text-[#B3B3B3] text-sm mt-2">
                            You studied {uniqueConcepts.length} concept{uniqueConcepts.length > 1 ? 's' : ''} across {sprintItems.length} mini-lessons
                        </p>
                    </div>

                    <div className="px-8 py-5 border-t border-[#2E2E2E]">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-2xl font-bold text-[#46D369]">{strongCount}</p>
                                <p className="text-[9px] uppercase tracking-wider text-[#808080] font-bold mt-1">Strong</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[#E50914]">{needsWorkCount}</p>
                                <p className="text-[9px] uppercase tracking-wider text-[#808080] font-bold mt-1">Needs Review</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[#B3B3B3]">{elapsedMin}m</p>
                                <p className="text-[9px] uppercase tracking-wider text-[#808080] font-bold mt-1">Study Time</p>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-4 border-t border-[#2E2E2E]">
                        <h4 className="text-[10px] uppercase tracking-wider text-[#808080] font-bold mb-3">Concepts Covered</h4>
                        <div className="space-y-2">
                            {gaps.map((gap) => {
                                const gapScores = scores.filter(s => s.concept === gap.label);
                                const avgScore = gapScores.length > 0 ? gapScores.reduce((s, g) => s + (g.answer ?? 2), 0) / gapScores.length : 2;
                                const isStrong = avgScore < 2;
                                return (
                                    <div key={gap.id} className="flex items-center justify-between p-3 rounded-lg bg-[#141414]">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1", color: isStrong ? '#46D369' : '#E50914' }}>
                                                {isStrong ? 'check_circle' : 'pending'}
                                            </span>
                                            <span className="text-sm text-[#E5E5E5] font-medium">{gap.label}</span>
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isStrong ? '#46D369' : '#E50914' }}>
                                            {isStrong ? 'Strong' : 'Review again'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="px-8 py-5 border-t border-[#2E2E2E] flex gap-3">
                        <button
                            onClick={() => router.push(`/episode/${conceptId}?concept_id=${conceptId}`)}
                            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#E50914] text-white font-bold text-sm hover:brightness-110 transition-all"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_arrow</span>
                            Continue to Episode
                        </button>
                        <button
                            onClick={() => router.push('/home')}
                            className="px-5 py-3 rounded-xl border border-[#333333] text-[#B3B3B3] font-semibold text-sm hover:bg-[#141414] transition-all"
                        >
                            Home
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ── Sprint Flow ──
    return (
        <div className="min-h-screen bg-[#141414]">
            {/* ── Top Bar ── */}
            <header className="sticky top-0 z-20 bg-[#141414]/95 backdrop-blur-sm border-b border-[#333333]">
                <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="text-[#808080] hover:text-[#E5E5E5] transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 20 }}>route</span>
                            <h1 className="text-sm font-bold text-[#E5E5E5]">Bridge Sprint</h1>
                        </div>
                        <span className="text-xs font-bold text-[#808080] bg-[#EDE5DB] px-2 py-0.5 rounded-full">
                            {currentStep + 1} / {sprintItems.length}
                        </span>
                    </div>
                    <span className="text-xs text-[#808080]">~{totalTime} min total</span>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-[#2E2E2E]">
                    <motion.div
                        className="h-full bg-[#E50914] rounded-r-full"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4 }}
                    />
                </div>
            </header>

            {/* ── Content ── */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
                <AnimatePresence mode="wait">
                    {current && (
                        <motion.div
                            key={currentStep}
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
                                    <p className="text-[11px] text-[#808080] flex items-center gap-2">
                                        <span>{current.section_label || 'Study'}</span>
                                        <span className="text-[#333333]">·</span>
                                        <span>~{current.estimated_minutes || 3} min</span>
                                    </p>
                                </div>
                                {/* Concept progress pills */}
                                <div className="hidden sm:flex items-center gap-1">
                                    {uniqueConcepts.map((c, i) => (
                                        <div
                                            key={c}
                                            className="h-1.5 rounded-full transition-all"
                                            style={{
                                                width: i === currentConceptIdx ? 20 : 8,
                                                backgroundColor: i < currentConceptIdx ? '#46D369' : i === currentConceptIdx ? '#E50914' : '#2E2E2E',
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Main content card with sections */}
                            <div className="bg-[#1E1E1E] rounded-2xl border border-[#333333] shadow-sm overflow-hidden">
                                <div className="px-5 sm:px-8 py-6">
                                    {/* Structured content sections */}
                                    {current.content_sections ? (
                                        current.content_sections.map((section, idx) => (
                                            <ContentSection key={idx} section={section} />
                                        ))
                                    ) : (
                                        /* Fallback for API-returned content */
                                        <div className="text-[#E5E5E5] text-[14.5px] leading-[1.75] whitespace-pre-line">
                                            {current.content || current.explanation || current.summary || 'Review this concept before proceeding.'}
                                        </div>
                                    )}
                                </div>

                                {/* Self-check question (only on practice sections) */}
                                {current.question && current.options && (
                                    <div className="px-5 sm:px-8 py-5 border-t border-[#2E2E2E] bg-gradient-to-b from-[#141414]/60 to-[#141414]/30">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="material-symbols-outlined text-[#B3B3B3]" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>school</span>
                                            <p className="text-xs font-bold uppercase tracking-wider text-[#B3B3B3]">Self Assessment</p>
                                        </div>
                                        <p className="text-sm text-[#E5E5E5] font-medium mb-4">{current.question}</p>
                                        <div className="space-y-2">
                                            {current.options.map((opt, oi) => {
                                                const optLabel = typeof opt === 'string' ? opt : opt.label;
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
                                                                {selectedAnswer === oi && (
                                                                    <span className="material-symbols-outlined text-white" style={{ fontSize: 12 }}>check</span>
                                                                )}
                                                            </span>
                                                            {optLabel}
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
                                    onClick={handleBack}
                                    disabled={currentStep === 0}
                                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-[#808080] hover:text-[#E5E5E5] disabled:opacity-30 transition-colors"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                                    Back
                                </button>

                                <button
                                    onClick={handleNext}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E50914] text-white font-bold text-sm hover:brightness-110 transition-all"
                                >
                                    {currentStep < sprintItems.length - 1 ? (
                                        <>
                                            Continue
                                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                                            Complete Sprint
                                        </>
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
                                            <div
                                                className="rounded-full transition-all"
                                                style={{
                                                    width: i === currentStep ? 20 : 8,
                                                    height: 8,
                                                    backgroundColor: i < currentStep ? '#46D369' : i === currentStep ? '#E50914' : '#2E2E2E',
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default function BridgeSprintWrapper() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#141414] flex items-center justify-center">
                <div className="size-10 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <BridgeSprintPage />
        </Suspense>
    );
}

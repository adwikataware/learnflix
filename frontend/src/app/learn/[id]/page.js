'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    getLearnerId, getConstellation, getEpisode, executeCode,
    getHint, generatePresentation, generateNotesFromUpload,
    getAssessment, submitAssessment, updateBKT, signalStruggle,
} from '@/lib/api';
import Friend from '@/components/Friend';
import Notebook from '@/components/Notebook';

// ─── Series structure from time ────────────────────────────────────────────
function buildSeries(nodes, minutes) {
    if (!nodes || nodes.length === 0) return [];

    if (minutes === -1) {
        // No time limit — multiple seasons, 6-8 episodes each
        const seasons = [];
        for (let i = 0; i < nodes.length; i += 7) {
            const chunk = nodes.slice(i, i + 7);
            seasons.push({
                seasonNum: seasons.length + 1,
                title: `Season ${seasons.length + 1}`,
                episodes: chunk.map((n, j) => ({
                    num: j + 1,
                    concept_id: n.concept_id,
                    label: n.label,
                    status: n.status,
                    mastery: n.mastery,
                })),
            });
        }
        return seasons;
    }

    // Time limited: slice nodes
    let episodeCount;
    if (minutes <= 30) episodeCount = Math.min(4, nodes.length);
    else if (minutes <= 60) episodeCount = Math.min(8, nodes.length);
    else episodeCount = Math.min(16, nodes.length);

    const selected = nodes.slice(0, episodeCount);

    if (minutes <= 60) {
        return [{
            seasonNum: 1,
            title: 'Season 1',
            episodes: selected.map((n, j) => ({
                num: j + 1,
                concept_id: n.concept_id,
                label: n.label,
                status: n.status,
                mastery: n.mastery,
            })),
        }];
    }

    // 2 hours: 2 seasons
    const mid = Math.ceil(selected.length / 2);
    return [
        {
            seasonNum: 1,
            title: 'Season 1',
            episodes: selected.slice(0, mid).map((n, j) => ({
                num: j + 1, concept_id: n.concept_id, label: n.label, status: n.status, mastery: n.mastery,
            })),
        },
        {
            seasonNum: 2,
            title: 'Season 2',
            episodes: selected.slice(mid).map((n, j) => ({
                num: j + 1, concept_id: n.concept_id, label: n.label, status: n.status, mastery: n.mastery,
            })),
        },
    ];
}

// ─── Tab definitions ───────────────────────────────────────────────────────
const TABS = [
    { id: 'series', label: 'Series', icon: 'movie' },
    { id: 'notes', label: 'Notes', icon: 'menu_book' },
    { id: 'codelabs', label: 'Code Labs', icon: 'code' },
    { id: 'assessments', label: 'Assessments', icon: 'quiz' },
];

export default function LearnHub() {
    const { id } = useParams();
    const router = useRouter();
    const [session, setSession] = useState(null);
    const [activeTab, setActiveTab] = useState('series');
    const [loading, setLoading] = useState(true);

    // Series state
    const [series, setSeries] = useState([]);
    const [activeEpisode, setActiveEpisode] = useState(null);
    const [episodeContent, setEpisodeContent] = useState(null);
    const [episodeLoading, setEpisodeLoading] = useState(false);
    const [presentation, setPresentation] = useState(null);
    const [presentationLoading, setPresentationLoading] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const slideTimerRef = useRef(null);

    // Notes state
    const [notesPages, setNotesPages] = useState([]);
    const [notesLoading, setNotesLoading] = useState(false);
    const [notesGenerated, setNotesGenerated] = useState(false);

    // Code Labs state
    const [code, setCode] = useState('');
    const [codeOutput, setCodeOutput] = useState('');
    const [codeRunning, setCodeRunning] = useState(false);
    const [codeLanguage, setCodeLanguage] = useState('python');

    // Assessment state
    const [questions, setQuestions] = useState([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState({});
    const [assessmentDone, setAssessmentDone] = useState(false);
    const [score, setScore] = useState(0);
    const [assessmentLoading, setAssessmentLoading] = useState(false);

    // Load session data
    useEffect(() => {
        const sessionStr = localStorage.getItem(`learn_session_${id}`);
        if (!sessionStr) { router.push('/learn'); return; }

        const sess = JSON.parse(sessionStr);
        setSession(sess);

        const learnerId = getLearnerId();
        if (!learnerId) { router.push('/profiles'); return; }

        async function init() {
            // Fetch constellation to build series
            const { data } = await getConstellation(learnerId);
            if (data?.nodes?.length > 0) {
                const nodes = data.nodes.map((n, i) => ({
                    concept_id: n.concept_id || n.id,
                    label: n.label || n.concept_id || `Concept ${i + 1}`,
                    status: n.status || 'locked',
                    mastery: n.mastery ?? n.p_known ?? 0,
                }));
                const built = buildSeries(nodes, sess.minutes);
                setSeries(built);

                // Auto-select first episode
                if (built.length > 0 && built[0].episodes.length > 0) {
                    setActiveEpisode(built[0].episodes[0]);
                }
            }
            setLoading(false);
        }
        init();
    }, [id, router]);

    // ─── Episode Content Loading ───────────────────────────────────────────
    const loadEpisode = useCallback(async (episode) => {
        setActiveEpisode(episode);
        setEpisodeLoading(true);
        setPresentation(null);
        setCurrentSlide(0);
        setIsPlaying(false);

        const learnerId = getLearnerId();
        const { data } = await getEpisode(
            episode.concept_id, learnerId, episode.concept_id, false, 30
        );

        if (data) {
            setEpisodeContent(data);

            // Auto-generate presentation
            setPresentationLoading(true);
            try {
                const { data: presData } = await generatePresentation({
                    concept_id: episode.concept_id,
                    learner_id: learnerId,
                    concept_name: episode.label,
                });
                if (presData?.slides) {
                    setPresentation(presData.slides);
                }
            } catch (e) {
                console.log('Presentation gen:', e);
            }
            setPresentationLoading(false);
        }
        setEpisodeLoading(false);
    }, []);

    // ─── Presentation Auto-Play ────────────────────────────────────────────
    useEffect(() => {
        if (isPlaying && presentation) {
            slideTimerRef.current = setTimeout(() => {
                if (currentSlide < presentation.length - 1) {
                    setCurrentSlide(prev => prev + 1);
                } else {
                    setIsPlaying(false);
                }
            }, (presentation[currentSlide]?.duration || 8) * 1000);
        }
        return () => clearTimeout(slideTimerRef.current);
    }, [isPlaying, currentSlide, presentation]);

    // ─── Notes Generation ──────────────────────────────────────────────────
    const generateNotes = useCallback(async () => {
        if (notesGenerated) return;
        setNotesLoading(true);

        const learnerId = getLearnerId();
        let pages = [];

        // If user uploaded files, generate from uploads
        if (session?.uploadedFiles?.length > 0) {
            try {
                const { data } = await generateNotesFromUpload({
                    learner_id: learnerId,
                    s3_keys: session.uploadedFiles,
                    topic: session.topic,
                });
                if (data?.notes) {
                    // Parse AI notes into pages
                    const sections = data.notes.split(/\n(?=#{1,3}\s)/);
                    pages = sections.filter(s => s.trim()).map((section, idx) => {
                        const lines = section.split('\n').filter(l => l.trim());
                        const title = lines[0]?.replace(/^#+\s*/, '') || `Section ${idx + 1}`;
                        const content = lines.slice(1).map(line => {
                            if (line.startsWith('- ') || line.startsWith('* ')) return { type: 'bullet', text: line.replace(/^[-*]\s*/, '') };
                            if (line.startsWith('```')) return { type: 'code', text: line.replace(/```\w*\n?/, '').replace(/```$/, '') };
                            if (line.startsWith('> ')) return { type: 'highlight', text: line.replace(/^>\s*/, '') };
                            if (line.startsWith('## ') || line.startsWith('### ')) return { type: 'heading', text: line.replace(/^#+\s*/, '') };
                            return { type: 'text', text: line };
                        });
                        return { title, topic: session.topic, content };
                    });
                }
            } catch (e) {
                console.log('Notes from upload error:', e);
            }
        }

        // If no upload or upload failed, generate rich AI notes from episodes
        if (pages.length === 0 && series.length > 0) {
            const topic = session?.topic || 'Learning';
            const allEpisodes = series.flatMap(s => s.episodes);

            // First: a title/intro page
            pages.push({
                title: `${topic} — Study Notes`,
                topic,
                content: [
                    { type: 'heading', text: 'Welcome to Your Notes' },
                    { type: 'text', text: `These notes cover everything you need to know about ${topic}. Each section maps to an episode in your learning series, organized from foundational concepts to advanced topics.` },
                    { type: 'highlight', text: `Tip: Use the bookmarks (red ribbons) to mark pages you want to revisit later. You can find all bookmarks in the Table of Contents sidebar.` },
                    { type: 'heading', text: 'What\'s Inside' },
                    ...allEpisodes.map((ep, i) => ({
                        type: 'numberedList', num: i + 1, text: ep.label,
                    })),
                    { type: 'text', text: `Total: ${allEpisodes.length} topics across ${series.length} season${series.length > 1 ? 's' : ''}.` },
                ],
            });

            // Then: 2-3 rich pages per episode
            allEpisodes.forEach((ep, idx) => {
                const epLabel = ep.label;
                const prevEp = allEpisodes[idx - 1]?.label;
                const nextEp = allEpisodes[idx + 1]?.label;

                // Page 1: Core concepts & definitions
                pages.push({
                    title: epLabel,
                    topic: `Episode ${idx + 1}`,
                    content: [
                        { type: 'heading', text: `${epLabel} — Overview` },
                        { type: 'text', text: `${epLabel} is a fundamental concept in ${topic}. Understanding this topic is essential because it forms the building blocks for more advanced concepts that follow.` },
                        { type: 'subheading', text: 'Key Definitions' },
                        { type: 'bullet', text: `${epLabel}: The core principle that governs how this concept operates within the broader domain of ${topic}.` },
                        { type: 'bullet', text: `This concept relates to the efficient organization, processing, and retrieval of information in its domain.` },
                        { type: 'bullet', text: `Understanding ${epLabel} requires grasping both the theoretical foundations and practical applications.` },
                        { type: 'subheading', text: 'Why This Matters' },
                        { type: 'text', text: `In real-world applications, ${epLabel} is used extensively across industries. Whether you're building software, analyzing data, solving business problems, or conducting research — this concept will appear repeatedly.` },
                        { type: 'important', text: `Make sure you understand ${epLabel} thoroughly before moving on. The concepts that follow build directly on this foundation.` },
                        ...(prevEp ? [{ type: 'text', text: `This builds upon what you learned in "${prevEp}". If anything feels unclear, revisit those notes first.` }] : []),
                    ],
                });

                // Page 2: Deep dive, examples, patterns
                pages.push({
                    title: `${epLabel} — Deep Dive`,
                    topic: `Episode ${idx + 1}`,
                    content: [
                        { type: 'heading', text: 'How It Works' },
                        { type: 'text', text: `Let's break down the mechanics of ${epLabel} step by step. The goal is to understand not just the "what" but the "how" and "why".` },
                        { type: 'subheading', text: 'Step-by-Step Process' },
                        { type: 'numberedList', num: 1, text: `Identify the problem or input that ${epLabel} addresses. What are we trying to solve?` },
                        { type: 'numberedList', num: 2, text: `Apply the core principle: decompose the problem into manageable sub-parts using the ${epLabel} approach.` },
                        { type: 'numberedList', num: 3, text: `Process each part systematically, keeping track of intermediate results and state.` },
                        { type: 'numberedList', num: 4, text: `Combine the results and validate the output against expected outcomes.` },
                        { type: 'example', text: `Consider a real-world scenario: A company needs to process large volumes of data. Using ${epLabel}, they can break this into smaller batches, process each independently, and merge the results — achieving both correctness and efficiency.` },
                        { type: 'subheading', text: 'Common Patterns' },
                        { type: 'bullet', text: `Pattern 1: Start simple, then optimize. Get a working solution first, then apply ${epLabel} principles to improve performance.` },
                        { type: 'bullet', text: `Pattern 2: Think about edge cases. What happens with empty inputs? With very large inputs? With invalid data?` },
                        { type: 'bullet', text: `Pattern 3: Trace through examples by hand before coding. This prevents logical errors.` },
                        { type: 'highlight', text: `"The best way to understand ${epLabel} is to implement it yourself, then break it, then fix it." — Learning Principle` },
                    ],
                });

                // Page 3: Practice, pitfalls, connections
                pages.push({
                    title: `${epLabel} — Practice & Pitfalls`,
                    topic: `Episode ${idx + 1}`,
                    content: [
                        { type: 'heading', text: 'Common Mistakes to Avoid' },
                        { type: 'bullet', text: `Mistake #1: Jumping to implementation without understanding the underlying concept. Always study the theory first.` },
                        { type: 'bullet', text: `Mistake #2: Ignoring time and space complexity. A correct solution that's too slow is not a good solution.` },
                        { type: 'bullet', text: `Mistake #3: Not testing with edge cases. The boundaries are where most bugs hide.` },
                        { type: 'bullet', text: `Mistake #4: Memorizing solutions instead of understanding patterns. Patterns transfer; memorized answers don't.` },
                        { type: 'subheading', text: 'Practice Exercises' },
                        { type: 'numberedList', num: 1, text: `Explain ${epLabel} to someone who has never heard of it. Use analogies from everyday life.` },
                        { type: 'numberedList', num: 2, text: `Implement a basic version from scratch without looking at references.` },
                        { type: 'numberedList', num: 3, text: `Find three real-world applications where ${epLabel} is used and explain why it was chosen.` },
                        { type: 'numberedList', num: 4, text: `Compare ${epLabel} with alternative approaches. What are the trade-offs?` },
                        ...(nextEp ? [
                            { type: 'heading', text: 'What\'s Next' },
                            { type: 'text', text: `In the next section, we'll explore "${nextEp}", which builds on everything you've learned here. The connection between ${epLabel} and ${nextEp} is crucial — pay attention to how concepts layer on top of each other.` },
                        ] : [
                            { type: 'heading', text: 'Wrapping Up' },
                            { type: 'text', text: `This is the final topic in your current series. Review all previous sections and make sure you can explain each concept confidently. Use the Code Labs tab to practice implementation and the Assessment tab to test your knowledge.` },
                        ]),
                        { type: 'highlight', text: `Remember: Mastery comes from repeated practice over time, not from a single reading. Revisit these notes regularly.` },
                    ],
                });
            });

            // Final summary page
            pages.push({
                title: 'Summary & Review',
                topic,
                content: [
                    { type: 'heading', text: `${topic} — Key Takeaways` },
                    { type: 'text', text: `Congratulations on completing all the notes for ${topic}! Here's a quick summary of what you've covered:` },
                    ...allEpisodes.map((ep, i) => ({
                        type: 'bullet', text: `${ep.label} — foundations, mechanics, common patterns, and practice exercises`,
                    })),
                    { type: 'heading', text: 'Next Steps' },
                    { type: 'numberedList', num: 1, text: 'Complete all Code Lab exercises in the Code Labs tab' },
                    { type: 'numberedList', num: 2, text: 'Take the adaptive assessment to test your understanding' },
                    { type: 'numberedList', num: 3, text: 'Use F.R.I.E.N.D to ask about any concepts that are still unclear' },
                    { type: 'numberedList', num: 4, text: 'Revisit bookmarked pages for quick revision before exams' },
                    { type: 'important', text: 'Spaced repetition is key. Come back to these notes after 1 day, then 3 days, then 7 days for maximum retention.' },
                    { type: 'highlight', text: `"Education is not the filling of a pail, but the lighting of a fire." — W.B. Yeats` },
                ],
            });
        }

        setNotesPages(pages);
        setNotesGenerated(true);
        setNotesLoading(false);
    }, [session, series, notesGenerated]);

    // Generate notes when tab switched
    useEffect(() => {
        if (activeTab === 'notes' && !notesGenerated) generateNotes();
    }, [activeTab, notesGenerated, generateNotes]);

    // ─── Code Lab ──────────────────────────────────────────────────────────
    const runCode = async () => {
        setCodeRunning(true);
        setCodeOutput('');
        const { data, error } = await executeCode({
            code,
            language: codeLanguage,
            learner_id: getLearnerId(),
        });
        setCodeOutput(data?.output || data?.result || error || 'No output');
        setCodeRunning(false);
    };

    // ─── Assessment ────────────────────────────────────────────────────────
    const loadAssessment = useCallback(async () => {
        setAssessmentLoading(true);
        const learnerId = getLearnerId();
        const { data } = await getAssessment(learnerId);
        if (data?.assessment) {
            setQuestions(data.assessment);
            setCurrentQ(0);
            setAnswers({});
            setAssessmentDone(false);
        }
        setAssessmentLoading(false);
    }, []);

    useEffect(() => {
        if (activeTab === 'assessments' && questions.length === 0) loadAssessment();
    }, [activeTab, questions.length, loadAssessment]);

    const submitAnswer = (qIdx, answer) => {
        setAnswers(prev => ({ ...prev, [qIdx]: answer }));
    };

    const finishAssessment = async () => {
        const learnerId = getLearnerId();
        let correct = 0;
        const answerData = questions.map((q, i) => {
            const isCorrect = answers[i] === q.correct_answer;
            if (isCorrect) correct++;
            return { question_id: `q${i}`, difficulty: q.difficulty || 0.5, is_correct: isCorrect };
        });

        setScore(Math.round((correct / questions.length) * 100));
        setAssessmentDone(true);

        await submitAssessment({ learner_id: learnerId, answers: answerData });
    };

    // ─── Render ────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-[#181818] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-3 border-[#E50914] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[#B3B3B3] font-semibold">Building your learning series...</p>
                    <p className="text-[#808080] text-sm">{session?.topic}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#181818] flex flex-col">
            {/* ═══ Header ═══ */}
            <header className="sticky top-0 z-40 bg-[#141414]/90 backdrop-blur-md border-b border-[#333333]">
                <div className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/home')} className="text-[#808080] hover:text-[#E5E5E5] transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-[#E5E5E5] font-[Manrope]">{session?.topic}</h1>
                            <p className="text-[10px] text-[#808080] uppercase tracking-wider font-bold">
                                {series.length} Season{series.length !== 1 ? 's' : ''} &middot;
                                {series.reduce((a, s) => a + s.episodes.length, 0)} Episodes
                            </p>
                        </div>
                    </div>
                </div>

                {/* ═══ Tabs ═══ */}
                <div className="flex gap-0 px-6 border-t border-[#2E2E2E]">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all border-b-2 ${
                                activeTab === tab.id
                                    ? 'border-[#E50914] text-[#E50914]'
                                    : 'border-transparent text-[#808080] hover:text-[#B3B3B3]'
                            }`}
                        >
                            <span className="material-symbols-outlined" style={{
                                fontSize: 18,
                                fontVariationSettings: activeTab === tab.id ? "'FILL' 1" : "'FILL' 0",
                            }}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* ═══ Tab Content ═══ */}
            <div className="flex-1 px-6 py-6">
                <AnimatePresence mode="wait">
                    {/* ════════════ SERIES TAB ════════════ */}
                    {activeTab === 'series' && (
                        <motion.div key="series" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-6 h-[calc(100vh-160px)]">

                            {/* Episode List (Left) */}
                            <div className="w-80 flex-shrink-0 bg-[#1E1E1E] border border-[#333333] rounded-xl overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                {series.map((season) => (
                                    <div key={season.seasonNum}>
                                        <div className="sticky top-0 bg-[#141414] px-4 py-3 z-10">
                                            <h4 className="text-white font-bold text-sm">{season.title}</h4>
                                            <p className="text-white/40 text-[10px]">{season.episodes.length} episodes</p>
                                        </div>
                                        {season.episodes.map((ep) => (
                                            <button
                                                key={ep.concept_id}
                                                onClick={() => loadEpisode(ep)}
                                                className={`w-full text-left px-4 py-3 border-b border-[#2E2E2E] flex items-center gap-3 transition-all hover:bg-[#181818] ${
                                                    activeEpisode?.concept_id === ep.concept_id ? 'bg-[#E50914]/5 border-l-4 border-l-[#E50914]' : ''
                                                }`}
                                            >
                                                <div className="size-8 rounded-lg bg-[#181818] flex items-center justify-center flex-shrink-0 text-[#E50914] font-bold text-sm">
                                                    {ep.num}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-[#E5E5E5] truncate">{ep.label}</p>
                                                    <p className="text-[10px] text-[#808080]">Episode {ep.num}</p>
                                                </div>
                                                {activeEpisode?.concept_id === ep.concept_id && (
                                                    <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>

                            {/* Episode Player (Right) */}
                            <div className="flex-1 bg-[#1E1E1E] border border-[#333333] rounded-xl overflow-hidden flex flex-col">
                                {episodeLoading ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
                                            <p className="text-[#808080] text-sm">Generating episode...</p>
                                        </div>
                                    </div>
                                ) : !activeEpisode ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="text-center">
                                            <span className="material-symbols-outlined text-[#333333]" style={{ fontSize: 64 }}>movie</span>
                                            <p className="text-[#808080] mt-3">Select an episode to start watching</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col overflow-hidden">
                                        {/* Presentation Player */}
                                        <div className="flex-1 relative bg-[#0A0A0A] flex items-center justify-center overflow-hidden">
                                            {presentationLoading ? (
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-8 h-8 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
                                                    <p className="text-white/40 text-xs">Generating presentation...</p>
                                                </div>
                                            ) : presentation ? (
                                                <div className="w-full h-full flex flex-col">
                                                    {/* Slide content */}
                                                    <div className="flex-1 flex items-center justify-center p-8">
                                                        <AnimatePresence mode="wait">
                                                            <motion.div
                                                                key={currentSlide}
                                                                initial={{ opacity: 0, x: 50 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0, x: -50 }}
                                                                className="text-center max-w-2xl"
                                                            >
                                                                <h3 className="text-2xl font-bold text-white mb-4">
                                                                    {presentation[currentSlide]?.title}
                                                                </h3>
                                                                {presentation[currentSlide]?.content?.headline && (
                                                                    <p className="text-white/70 text-lg mb-2">{presentation[currentSlide].content.headline}</p>
                                                                )}
                                                                {presentation[currentSlide]?.content?.points?.map((p, i) => (
                                                                    <motion.p
                                                                        key={i}
                                                                        initial={{ opacity: 0, x: 20 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        transition={{ delay: i * 0.3 }}
                                                                        className="text-white/60 text-base mb-2 text-left pl-6"
                                                                    >
                                                                        <span className="text-[#E50914] mr-2">&#9679;</span>{p}
                                                                    </motion.p>
                                                                ))}
                                                                {presentation[currentSlide]?.content?.text && (
                                                                    <p className="text-white/60 text-base">{presentation[currentSlide].content.text}</p>
                                                                )}
                                                                {presentation[currentSlide]?.narration && (
                                                                    <p className="text-white/30 text-sm mt-6 italic max-w-lg mx-auto">
                                                                        {presentation[currentSlide].narration}
                                                                    </p>
                                                                )}
                                                            </motion.div>
                                                        </AnimatePresence>
                                                    </div>

                                                    {/* Controls */}
                                                    <div className="bg-[#141414] border-t border-white/10 px-6 py-3 flex items-center gap-4">
                                                        <button onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))} disabled={currentSlide === 0}
                                                            className="text-white/40 hover:text-white disabled:opacity-20">
                                                            <span className="material-symbols-outlined">skip_previous</span>
                                                        </button>
                                                        <button onClick={() => setIsPlaying(!isPlaying)}
                                                            className="size-10 rounded-full bg-[#E50914] text-white flex items-center justify-center hover:brightness-110">
                                                            <span className="material-symbols-outlined">{isPlaying ? 'pause' : 'play_arrow'}</span>
                                                        </button>
                                                        <button onClick={() => setCurrentSlide(prev => Math.min((presentation?.length || 1) - 1, prev + 1))}
                                                            disabled={currentSlide >= (presentation?.length || 1) - 1}
                                                            className="text-white/40 hover:text-white disabled:opacity-20">
                                                            <span className="material-symbols-outlined">skip_next</span>
                                                        </button>

                                                        {/* Progress bar */}
                                                        <div className="flex-1 h-1 bg-[#1E1E1E]/10 rounded-full overflow-hidden mx-4">
                                                            <div className="h-full bg-[#E50914] rounded-full transition-all"
                                                                style={{ width: `${((currentSlide + 1) / (presentation?.length || 1)) * 100}%` }} />
                                                        </div>
                                                        <span className="text-white/40 text-xs font-bold">
                                                            {currentSlide + 1}/{presentation?.length || 0}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center p-8">
                                                    <span className="material-symbols-outlined text-white/20" style={{ fontSize: 64 }}>slideshow</span>
                                                    <p className="text-white/30 mt-3 text-sm">Presentation will appear here</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Episode story content below player */}
                                        {episodeContent && (
                                            <div className="max-h-60 overflow-y-auto p-6 border-t border-[#2E2E2E]" style={{ scrollbarWidth: 'thin' }}>
                                                <h4 className="text-[#E5E5E5] font-bold text-base mb-3">{activeEpisode.label}</h4>
                                                <div className="text-sm text-[#E5E5E5] leading-7 prose prose-sm max-w-none"
                                                    dangerouslySetInnerHTML={{
                                                        __html: episodeContent.content || episodeContent.story || episodeContent.explanation || '<p>Episode content loading...</p>'
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* ════════════ NOTES TAB ════════════ */}
                    {activeTab === 'notes' && (
                        <motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="h-[calc(100vh-160px)]">
                            <Notebook
                                pages={notesPages}
                                title={`${session?.topic || 'Learning'} Notes`}
                                loading={notesLoading}
                            />
                        </motion.div>
                    )}

                    {/* ════════════ CODE LABS TAB ════════════ */}
                    {activeTab === 'codelabs' && (
                        <motion.div key="codelabs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="h-[calc(100vh-160px)] flex gap-4">

                            {/* Editor */}
                            <div className="flex-1 flex flex-col bg-[#1E1E1E] border border-[#333333] rounded-xl overflow-hidden">
                                {/* Toolbar */}
                                <div className="flex items-center justify-between px-4 py-2 border-b border-[#2E2E2E] bg-[#181818]">
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={codeLanguage}
                                            onChange={(e) => setCodeLanguage(e.target.value)}
                                            className="bg-[#1E1E1E] border border-[#333333] rounded-lg px-3 py-1.5 text-xs font-semibold text-[#E5E5E5]"
                                        >
                                            <option value="python">Python</option>
                                            <option value="sql">SQL</option>
                                            <option value="cpp">C++</option>
                                            <option value="java">Java</option>
                                        </select>
                                        <span className="text-[10px] text-[#808080] uppercase tracking-wider font-bold">Code Lab</span>
                                    </div>
                                    <button
                                        onClick={runCode}
                                        disabled={!code.trim() || codeRunning}
                                        className="flex items-center gap-2 bg-[#46D369] text-white font-bold text-xs px-4 py-2 rounded-lg hover:brightness-110 transition-all disabled:opacity-40"
                                    >
                                        {codeRunning ? (
                                            <span className="material-symbols-outlined animate-spin" style={{ fontSize: 14 }}>progress_activity</span>
                                        ) : (
                                            <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                                        )}
                                        {codeRunning ? 'Running...' : 'Run Code'}
                                    </button>
                                </div>

                                {/* Code editor */}
                                <textarea
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder={codeLanguage === 'sql'
                                        ? 'SELECT * FROM students\nWHERE grade = \'A\'\nORDER BY name;'
                                        : codeLanguage === 'python'
                                        ? '# Write your code here\ndef solution():\n    pass\n\nsolution()'
                                        : '// Write your code here'}
                                    className="flex-1 p-4 font-mono text-sm text-[#E5E5E5] bg-[#faf8f5] resize-none focus:outline-none leading-6"
                                    style={{ tabSize: 4 }}
                                    spellCheck={false}
                                />
                            </div>

                            {/* Output Panel */}
                            <div className="w-96 flex flex-col bg-[#141414] border border-[#333] rounded-xl overflow-hidden">
                                <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#46D369]" style={{ fontSize: 16 }}>terminal</span>
                                    <span className="text-white/50 text-xs font-bold uppercase tracking-wider">Output</span>
                                </div>
                                <div className="flex-1 p-4 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                    {codeOutput ? (
                                        <pre className="text-[#333333] text-sm font-mono whitespace-pre-wrap">{codeOutput}</pre>
                                    ) : (
                                        <p className="text-white/20 text-sm">Run your code to see output here...</p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ════════════ ASSESSMENTS TAB ════════════ */}
                    {activeTab === 'assessments' && (
                        <motion.div key="assessments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="max-w-3xl mx-auto">

                            {assessmentLoading ? (
                                <div className="flex items-center justify-center h-96">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-10 h-10 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
                                        <p className="text-[#808080] text-sm">Generating adaptive assessment...</p>
                                    </div>
                                </div>
                            ) : assessmentDone ? (
                                /* Score Card */
                                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                    className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-10 text-center mt-10">
                                    <div className="size-24 rounded-full mx-auto mb-6 flex items-center justify-center"
                                        style={{ backgroundColor: score >= 70 ? '#46D36920' : '#E5091420' }}>
                                        <span className="text-4xl font-extrabold" style={{ color: score >= 70 ? '#46D369' : '#E50914' }}>
                                            {score}%
                                        </span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-[#E5E5E5] mb-2">
                                        {score >= 80 ? 'Excellent!' : score >= 60 ? 'Good job!' : 'Keep practicing!'}
                                    </h3>
                                    <p className="text-[#B3B3B3] text-sm mb-6">
                                        You got {Math.round(score * questions.length / 100)} out of {questions.length} questions right.
                                    </p>
                                    <div className="flex gap-3 justify-center">
                                        <button onClick={() => { setAssessmentDone(false); setQuestions([]); loadAssessment(); }}
                                            className="px-6 py-3 rounded-xl bg-[#E50914] text-white font-bold hover:brightness-110 transition-all">
                                            Retake Assessment
                                        </button>
                                        <button onClick={() => setActiveTab('series')}
                                            className="px-6 py-3 rounded-xl border border-[#333333] text-[#B3B3B3] font-bold hover:border-[#E50914]/40 transition-all">
                                            Back to Series
                                        </button>
                                    </div>
                                </motion.div>
                            ) : questions.length > 0 ? (
                                /* Question Card */
                                <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-8 mt-6">
                                    {/* Progress */}
                                    <div className="flex items-center gap-4 mb-6">
                                        <span className="text-xs text-[#808080] font-bold">Q {currentQ + 1}/{questions.length}</span>
                                        <div className="flex-1 h-1.5 bg-[#2E2E2E] rounded-full overflow-hidden">
                                            <div className="h-full bg-[#E50914] rounded-full transition-all"
                                                style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
                                        </div>
                                        {questions[currentQ]?.difficulty && (
                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                                                style={{
                                                    backgroundColor: questions[currentQ].difficulty > 0.7 ? '#E5091415' : questions[currentQ].difficulty > 0.4 ? '#E87C0315' : '#46D36915',
                                                    color: questions[currentQ].difficulty > 0.7 ? '#E50914' : questions[currentQ].difficulty > 0.4 ? '#E87C03' : '#46D369',
                                                }}>
                                                {questions[currentQ].difficulty > 0.7 ? 'Hard' : questions[currentQ].difficulty > 0.4 ? 'Medium' : 'Easy'}
                                            </span>
                                        )}
                                    </div>

                                    <h4 className="text-lg font-bold text-[#E5E5E5] mb-6 leading-relaxed">
                                        {questions[currentQ]?.question}
                                    </h4>

                                    {/* Options */}
                                    <div className="space-y-3 mb-8">
                                        {(questions[currentQ]?.options || []).map((opt, idx) => {
                                            const optLabel = String.fromCharCode(65 + idx);
                                            const isSelected = answers[currentQ] === optLabel;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => submitAnswer(currentQ, optLabel)}
                                                    className={`w-full text-left rounded-xl border p-4 flex items-center gap-4 transition-all ${
                                                        isSelected
                                                            ? 'border-[#E50914] bg-[#E50914]/5'
                                                            : 'border-[#333333] hover:border-[#E87C03]/40 bg-[#181818]'
                                                    }`}
                                                >
                                                    <div className={`size-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                                                        isSelected ? 'bg-[#E50914] text-white' : 'bg-[#1E1E1E] border border-[#333333] text-[#B3B3B3]'
                                                    }`}>
                                                        {optLabel}
                                                    </div>
                                                    <span className="text-sm text-[#E5E5E5]">{opt}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Navigation */}
                                    <div className="flex items-center justify-between">
                                        <button
                                            onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
                                            disabled={currentQ === 0}
                                            className="px-5 py-3 rounded-xl border border-[#333333] text-[#B3B3B3] font-semibold text-sm disabled:opacity-30"
                                        >
                                            Previous
                                        </button>

                                        {currentQ === questions.length - 1 ? (
                                            <button
                                                onClick={finishAssessment}
                                                disabled={Object.keys(answers).length < questions.length}
                                                className="px-8 py-3 rounded-xl bg-[#E50914] text-white font-bold text-sm hover:brightness-110 disabled:opacity-40"
                                            >
                                                Submit Assessment
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setCurrentQ(prev => Math.min(questions.length - 1, prev + 1))}
                                                className="px-6 py-3 rounded-xl bg-[#E50914] text-white font-bold text-sm hover:brightness-110"
                                            >
                                                Next
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-96">
                                    <div className="text-center">
                                        <span className="material-symbols-outlined text-[#333333]" style={{ fontSize: 64 }}>quiz</span>
                                        <p className="text-[#808080] mt-3">No assessment questions available</p>
                                        <button onClick={loadAssessment}
                                            className="mt-4 px-6 py-3 rounded-xl bg-[#E50914] text-white font-bold text-sm">
                                            Generate Assessment
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ═══ F.R.I.E.N.D Floating Buddy ═══ */}
            <Friend
                context={{
                    topic: session?.topic,
                    activeTab,
                    episodeName: activeEpisode?.label,
                    episodeId: activeEpisode?.concept_id,
                    conceptId: activeEpisode?.concept_id,
                }}
                onPauseVideo={() => setIsPlaying(false)}
            />
        </div>
    );
}

"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboard, getLearnerId, getLearnerName, getDueConcepts, getConstellation } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Motivational Quotes ────────────────────────────────────────────────────
const QUOTES = [
    { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
    { text: "Learning is not attained by chance, it must be sought for with ardor.", author: "Abigail Adams" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
    { text: "The beautiful thing about learning is that nobody can take it away from you.", author: "B.B. King" },
    { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
    { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
    { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
];

const HEATMAP_COLORS = {
    mastered: '#8FA395',
    learning: '#D4A574',
    weak: '#C17C64',
    not_started: '#E2D8CC',
};

function formatConceptId(id) {
    if (!id) return '';
    return id.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function timeAgo(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - new Date(timestamp).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
}

const ACTIVITY_MAP = {
    STRUGGLE_SIGNAL: { label: 'Asked for help', icon: 'help_center', color: '#C17C64' },
    EPISODE_COMPLETE: { label: 'Completed episode', icon: 'check_circle', color: '#8FA395' },
    EPISODE_START: { label: 'Started learning', icon: 'play_circle', color: '#D4A574' },
    ASSESSMENT_COMPLETE: { label: 'Finished assessment', icon: 'quiz', color: '#8FA395' },
    LEITNER_REVIEW: { label: 'Reviewed flashcard', icon: 'style', color: '#a78bfa' },
    HINT_REQUEST: { label: 'Requested a hint', icon: 'lightbulb', color: '#D4A574' },
    CODE_EXECUTE: { label: 'Ran code', icon: 'code', color: '#6B5E52' },
    BKT_UPDATE: { label: 'Mastery updated', icon: 'trending_up', color: '#8FA395' },
    GOAL_SET: { label: 'Set learning goal', icon: 'flag', color: '#D4A574' },
};

const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' },
    }),
};

// ─── Circular Progress Ring ─────────────────────────────────────────────────
function ProgressRing({ value, max, size = 80, color = '#C17C64', label }) {
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const pct = max > 0 ? (value / max) * 100 : 0;
    const offset = circumference - (pct / 100) * circumference;
    const center = size / 2;

    return (
        <div className="flex flex-col items-center gap-1">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                    <circle cx={center} cy={center} r={radius} fill="none" stroke="#E2D8CC" strokeWidth={strokeWidth} />
                    <motion.circle
                        cx={center} cy={center} r={radius} fill="none" stroke={color}
                        strokeWidth={strokeWidth} strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-extrabold text-[#2A2018] font-[Manrope]">{value}</span>
                </div>
            </div>
            {label && <span className="text-[10px] text-[#9A8E82] font-bold uppercase tracking-wider">{label}</span>}
        </div>
    );
}

// ─── Profile Content ────────────────────────────────────────────────────────

function ProfileContent() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState(null);
    const [leitnerDue, setLeitnerDue] = useState(null);
    const [constellation, setConstellation] = useState(null);
    const [learnerName, setLName] = useState('Learner');
    const [quoteIdx, setQuoteIdx] = useState(0);

    useEffect(() => {
        const learnerId = getLearnerId();
        if (!learnerId) { router.push('/onboarding'); return; }
        setLName(getLearnerName());
        setQuoteIdx(Math.floor(Math.random() * QUOTES.length));

        async function load() {
            const [dashRes, leitnerRes, constRes] = await Promise.all([
                getDashboard(learnerId),
                getDueConcepts(learnerId),
                getConstellation(learnerId),
            ]);
            if (!dashRes.error && dashRes.data) setDashboard(dashRes.data);
            if (!leitnerRes.error && leitnerRes.data) setLeitnerDue(leitnerRes.data);
            if (!constRes.error && constRes.data) setConstellation(constRes.data);
            setLoading(false);
        }
        load();
    }, [router]);

    // Rotate quote every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setQuoteIdx(prev => (prev + 1) % QUOTES.length);
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="w-12 h-12 border-2 border-[#C17C64] border-t-transparent rounded-full animate-spin" />
                </div>
            </AppLayout>
        );
    }

    // ─── Extract data ───────────────────────────────────────────────────────
    const stats = dashboard?.stats || dashboard || {};
    const profile = dashboard?.profile || {};
    const xp = stats.xp ?? profile.xp ?? 0;
    const level = stats.level ?? profile.level ?? 1;
    const streak = stats.streak ?? profile.streak ?? 0;
    const totalHours = stats.total_hours ?? profile.total_hours ?? 0;

    const masteryItems = dashboard?.mastery?.items || [];
    const totalMastered = dashboard?.mastery?.total_mastered ?? masteryItems.filter(m => (m.p_known ?? 0) >= 0.85).length;
    const totalConcepts = dashboard?.mastery?.total_concepts ?? masteryItems.length;
    const heatmapData = dashboard?.heatmap || dashboard?.mastery?.heatmap || [];

    const skills = dashboard?.skills || dashboard?.radar_data?.map(r => ({
        domain: r.subject, value: r.value || r.A / 150
    })) || [];

    const recentActivity = dashboard?.recent_activity || [];
    const placement = dashboard?.placement_readiness ?? 0;
    const leitnerItems = leitnerDue?.due_concepts || leitnerDue?.items || [];
    const leitnerBoxCounts = leitnerDue?.box_counts || dashboard?.leitner?.box_counts || {};
    const totalLeitnerCards = Object.values(leitnerBoxCounts).reduce((a, b) => a + b, 0);

    // Constellation / field of interest
    const constellationNodes = constellation?.nodes || constellation?.concepts || [];
    const goalTopic = profile.goal || profile.topic || constellation?.topic || '';
    const interests = constellationNodes.slice(0, 8).map(n => n.label || n.id || n.concept_id);

    // Mastered vs learning vs weak breakdown
    const mastered = masteryItems.filter(m => (m.p_known ?? 0) >= 0.85);
    const learning = masteryItems.filter(m => (m.p_known ?? 0) >= 0.4 && (m.p_known ?? 0) < 0.85);
    const weak = masteryItems.filter(m => (m.p_known ?? 0) > 0 && (m.p_known ?? 0) < 0.4);

    const xpNextLevel = level * 5000;
    const quote = QUOTES[quoteIdx];

    return (
        <AppLayout>
            <div className="min-h-full px-4 lg:px-8 py-6 space-y-6">

                {/* ═══ Profile Header ═══ */}
                <motion.div
                    custom={0} variants={fadeIn} initial="hidden" animate="visible"
                    className="bg-gradient-to-r from-[#C17C64]/10 via-[#D4A574]/8 to-[#8FA395]/10 border border-[#D8CCBE] rounded-xl p-6"
                >
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full p-[3px] bg-gradient-to-br from-[#C17C64] via-[#D4A574] to-[#8FA395]">
                                <div className="w-full h-full rounded-full bg-[#2A2018] flex items-center justify-center">
                                    <span className="text-4xl font-extrabold text-white font-[Manrope]">
                                        {learnerName.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-[#D4A574] text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white">
                                Lv.{level}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="text-center sm:text-left flex-1">
                            <h1 className="text-2xl lg:text-3xl font-bold text-[#2A2018] font-[Manrope]">{learnerName}</h1>
                            <div className="flex items-center gap-3 mt-1.5 justify-center sm:justify-start flex-wrap">
                                <span className="flex items-center gap-1 text-sm text-[#6B5E52]">
                                    <span className="material-symbols-outlined text-[#D4A574]" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>bolt</span>
                                    {xp.toLocaleString()} XP
                                </span>
                                <span className="text-[#D8CCBE]">|</span>
                                <span className="flex items-center gap-1 text-sm text-[#6B5E52]">
                                    <span className="material-symbols-outlined text-[#C17C64]" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                                    {streak} day streak
                                </span>
                                {totalHours > 0 && (
                                    <>
                                        <span className="text-[#D8CCBE]">|</span>
                                        <span className="flex items-center gap-1 text-sm text-[#6B5E52]">
                                            <span className="material-symbols-outlined text-[#8FA395]" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>schedule</span>
                                            {totalHours.toFixed(1)}h learned
                                        </span>
                                    </>
                                )}
                            </div>
                            {goalTopic && (
                                <p className="text-xs text-[#9A8E82] mt-2 flex items-center gap-1 justify-center sm:justify-start">
                                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>school</span>
                                    Learning: {formatConceptId(goalTopic)}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4A574] text-white text-sm font-bold hover:brightness-110 transition-all shadow-sm"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>dashboard</span>
                                Dashboard
                            </button>
                            <button
                                onClick={() => router.push('/home')}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#D8CCBE] text-[#6B5E52] text-sm font-semibold hover:border-[#C17C64]/40 transition-colors"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>explore</span>
                                Explore
                            </button>
                        </div>
                    </div>

                    {/* XP Progress */}
                    <div className="mt-5">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] text-[#9A8E82] font-semibold">Level {level} → Level {level + 1}</span>
                            <span className="text-[11px] font-bold text-[#D4A574]">{xp.toLocaleString()} / {xpNextLevel.toLocaleString()} XP</span>
                        </div>
                        <div className="w-full h-2.5 bg-[#E2D8CC] rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-[#D4A574] to-[#C17C64]"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (xp / xpNextLevel) * 100)}%` }}
                                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                            />
                        </div>
                    </div>
                </motion.div>

                {/* ═══ Motivational Quote ═══ */}
                <motion.div
                    custom={1} variants={fadeIn} initial="hidden" animate="visible"
                    className="bg-white border border-[#D8CCBE] rounded-xl p-5 flex items-start gap-4"
                >
                    <span className="material-symbols-outlined text-[#D4A574] flex-shrink-0 mt-0.5" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>format_quote</span>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={quoteIdx}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.4 }}
                            className="flex-1"
                        >
                            <p className="text-sm text-[#2A2018] italic leading-relaxed">"{quote.text}"</p>
                            <p className="text-xs text-[#9A8E82] mt-1 font-semibold">— {quote.author}</p>
                        </motion.div>
                    </AnimatePresence>
                </motion.div>

                {/* ═══ Stats Overview ═══ */}
                <motion.div
                    custom={2} variants={fadeIn} initial="hidden" animate="visible"
                    className="bg-white border border-[#D8CCBE] rounded-xl p-6"
                >
                    <h2 className="text-base font-bold text-[#2A2018] font-[Manrope] flex items-center gap-2 mb-5">
                        <span className="material-symbols-outlined text-[#C17C64]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>analytics</span>
                        Learning Overview
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6 justify-items-center">
                        <ProgressRing value={totalMastered} max={Math.max(totalConcepts, 1)} size={80} color="#8FA395" label="Mastered" />
                        <ProgressRing value={learning.length} max={Math.max(totalConcepts, 1)} size={80} color="#D4A574" label="Learning" />
                        <ProgressRing value={weak.length} max={Math.max(totalConcepts, 1)} size={80} color="#C17C64" label="Weak" />
                        <ProgressRing value={totalLeitnerCards} max={Math.max(totalConcepts, 1)} size={80} color="#a78bfa" label="In Review" />
                        <ProgressRing value={Math.round(placement)} max={100} size={80} color="#D4A574" label="Placement" />
                    </div>
                </motion.div>

                {/* ═══ Two Column: Skills + Interests ═══ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Skill Breakdown */}
                    <motion.div
                        custom={3} variants={fadeIn} initial="hidden" animate="visible"
                        className="bg-white border border-[#D8CCBE] rounded-xl p-6"
                    >
                        <h2 className="text-base font-bold text-[#2A2018] font-[Manrope] flex items-center gap-2 mb-5">
                            <span className="material-symbols-outlined text-[#D4A574]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>donut_large</span>
                            Skill Breakdown
                        </h2>
                        {skills.length > 0 ? (
                            <div className="space-y-4">
                                {skills.map((skill, idx) => {
                                    const pct = Math.round((skill.value ?? 0) * 100);
                                    const levelKey = pct >= 75 ? 'ADVANCED' : pct >= 40 ? 'INTERMEDIATE' : 'BEGINNER';
                                    const barColor = levelKey === 'ADVANCED' ? '#8FA395' : levelKey === 'INTERMEDIATE' ? '#C17C64' : '#D4A574';
                                    return (
                                        <motion.div
                                            key={skill.domain || idx}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3 + idx * 0.08 }}
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-[#2A2018] font-medium">{formatConceptId(skill.domain)}</span>
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{
                                                        backgroundColor: `${barColor}15`,
                                                        color: barColor,
                                                    }}>
                                                        {levelKey}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-bold" style={{ color: barColor }}>{pct}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-[#E2D8CC] rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full rounded-full"
                                                    style={{ backgroundColor: barColor }}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 0.8, delay: 0.4 + idx * 0.08 }}
                                                />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8">
                                <span className="material-symbols-outlined text-[#D8CCBE] mb-2" style={{ fontSize: 36 }}>radar</span>
                                <p className="text-sm text-[#9A8E82]">Complete episodes to see your skills.</p>
                                <button onClick={() => router.push('/home')} className="mt-3 px-4 py-2 rounded-lg bg-[#D4A574] text-white text-xs font-bold hover:brightness-110 transition-all">
                                    Start Learning
                                </button>
                            </div>
                        )}
                    </motion.div>

                    {/* Field of Interest */}
                    <motion.div
                        custom={4} variants={fadeIn} initial="hidden" animate="visible"
                        className="bg-white border border-[#D8CCBE] rounded-xl p-6"
                    >
                        <h2 className="text-base font-bold text-[#2A2018] font-[Manrope] flex items-center gap-2 mb-5">
                            <span className="material-symbols-outlined text-[#C17C64]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>interests</span>
                            Field of Interest
                        </h2>
                        {goalTopic && (
                            <div className="mb-4 p-3 bg-gradient-to-r from-[#C17C64]/10 to-[#D4A574]/10 border border-[#D8CCBE] rounded-lg">
                                <span className="text-xs text-[#9A8E82] font-semibold uppercase tracking-wider">Current Goal</span>
                                <p className="text-base font-bold text-[#2A2018] font-[Manrope] mt-0.5">{formatConceptId(goalTopic)}</p>
                            </div>
                        )}
                        {interests.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {interests.map((topic, idx) => (
                                    <motion.button
                                        key={topic}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.3 + idx * 0.05 }}
                                        onClick={() => router.push(`/season/${topic}`)}
                                        className="px-3 py-1.5 rounded-full bg-[#F5EDE4] border border-[#D8CCBE] text-xs font-semibold text-[#6B5E52] hover:border-[#C17C64]/40 hover:text-[#C17C64] transition-colors"
                                    >
                                        {formatConceptId(topic)}
                                    </motion.button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6">
                                <span className="material-symbols-outlined text-[#D8CCBE] mb-2" style={{ fontSize: 36 }}>explore</span>
                                <p className="text-sm text-[#9A8E82]">Set a learning goal to see your interests.</p>
                                <button onClick={() => router.push('/onboarding')} className="mt-3 px-4 py-2 rounded-lg bg-[#D4A574] text-white text-xs font-bold hover:brightness-110 transition-all">
                                    Set Goal
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* ═══ Mastered Concepts ═══ */}
                <motion.div
                    custom={5} variants={fadeIn} initial="hidden" animate="visible"
                    className="bg-white border border-[#D8CCBE] rounded-xl p-6"
                >
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-base font-bold text-[#2A2018] font-[Manrope] flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#8FA395]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>verified</span>
                            Mastered Concepts
                            {totalMastered > 0 && (
                                <span className="text-xs font-bold text-[#8FA395] bg-[#8FA395]/10 px-2 py-0.5 rounded-full">{totalMastered}</span>
                            )}
                        </h2>
                        {totalConcepts > 0 && (
                            <span className="text-xs text-[#9A8E82]">{totalMastered} of {totalConcepts} concepts</span>
                        )}
                    </div>

                    {mastered.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {mastered.map((item, idx) => (
                                <motion.div
                                    key={item.concept_id || idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 + idx * 0.05 }}
                                    className="flex items-center gap-3 bg-[#8FA395]/8 border border-[#8FA395]/20 rounded-lg p-3 cursor-pointer hover:border-[#8FA395]/40 transition-colors"
                                    onClick={() => router.push(`/season/${item.concept_id}`)}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-[#8FA395]/15 flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-[#8FA395]" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-[#2A2018] truncate">{formatConceptId(item.label || item.concept_id)}</p>
                                        <p className="text-[10px] text-[#8FA395] font-bold">{Math.round((item.p_known ?? 0) * 100)}% mastery</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8">
                            <span className="material-symbols-outlined text-[#D8CCBE] mb-2" style={{ fontSize: 40 }}>emoji_events</span>
                            <p className="text-sm text-[#9A8E82] mb-1">No concepts mastered yet</p>
                            <p className="text-xs text-[#D8CCBE] max-w-xs text-center">Complete episodes and review flashcards to master concepts. Mastery is achieved at 85%+.</p>
                            <button onClick={() => router.push('/home')} className="mt-4 px-4 py-2 rounded-lg bg-[#D4A574] text-white text-xs font-bold hover:brightness-110 transition-all">
                                Start Learning
                            </button>
                        </div>
                    )}

                    {/* Also show learning/weak if any */}
                    {learning.length > 0 && (
                        <div className="mt-5">
                            <h3 className="text-xs font-bold text-[#D4A574] uppercase tracking-wider mb-3 flex items-center gap-1">
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>trending_up</span>
                                In Progress ({learning.length})
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {learning.map((item, idx) => (
                                    <button
                                        key={item.concept_id || idx}
                                        onClick={() => router.push(`/season/${item.concept_id}`)}
                                        className="px-3 py-1.5 rounded-full bg-[#D4A574]/10 border border-[#D4A574]/20 text-xs font-semibold text-[#D4A574] hover:border-[#D4A574]/40 transition-colors"
                                    >
                                        {formatConceptId(item.label || item.concept_id)} · {Math.round((item.p_known ?? 0) * 100)}%
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {weak.length > 0 && (
                        <div className="mt-4">
                            <h3 className="text-xs font-bold text-[#C17C64] uppercase tracking-wider mb-3 flex items-center gap-1">
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>
                                Needs Work ({weak.length})
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {weak.map((item, idx) => (
                                    <button
                                        key={item.concept_id || idx}
                                        onClick={() => router.push(`/season/${item.concept_id}`)}
                                        className="px-3 py-1.5 rounded-full bg-[#C17C64]/10 border border-[#C17C64]/20 text-xs font-semibold text-[#C17C64] hover:border-[#C17C64]/40 transition-colors"
                                    >
                                        {formatConceptId(item.label || item.concept_id)} · {Math.round((item.p_known ?? 0) * 100)}%
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* ═══ Concept Mastery Heatmap ═══ */}
                {heatmapData.length > 0 && (
                    <motion.div
                        custom={6} variants={fadeIn} initial="hidden" animate="visible"
                        className="bg-white border border-[#D8CCBE] rounded-xl p-6"
                    >
                        <h2 className="text-base font-bold text-[#2A2018] font-[Manrope] flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-[#D4A574]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>grid_view</span>
                            Mastery Heatmap
                        </h2>
                        <div className="flex items-center gap-3 mb-4">
                            {[
                                { label: 'Mastered', color: HEATMAP_COLORS.mastered },
                                { label: 'Learning', color: HEATMAP_COLORS.learning },
                                { label: 'Weak', color: HEATMAP_COLORS.weak },
                                { label: 'New', color: HEATMAP_COLORS.not_started },
                            ].map(l => (
                                <div key={l.label} className="flex items-center gap-1">
                                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                                    <span className="text-[9px] text-[#9A8E82]">{l.label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-[3px]">
                            {heatmapData.map((item, idx) => (
                                <motion.div
                                    key={item.id || item.concept_id || idx}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 + idx * 0.015 }}
                                    className="group relative"
                                    onClick={() => router.push(`/season/${item.concept_id || item.id}`)}
                                >
                                    <div
                                        className="w-[14px] h-[14px] rounded-[3px] cursor-pointer transition-transform hover:scale-150 hover:z-10"
                                        style={{ backgroundColor: HEATMAP_COLORS[item.status] || HEATMAP_COLORS.not_started }}
                                    />
                                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#2A2018] text-white text-[9px] px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 font-medium">
                                        {formatConceptId(item.label || item.concept_id || item.id)}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* ═══ Leitner Box Distribution ═══ */}
                {totalLeitnerCards > 0 && (
                    <motion.div
                        custom={7} variants={fadeIn} initial="hidden" animate="visible"
                        className="bg-white border border-[#D8CCBE] rounded-xl p-6"
                    >
                        <h2 className="text-base font-bold text-[#2A2018] font-[Manrope] flex items-center gap-2 mb-5">
                            <span className="material-symbols-outlined text-[#a78bfa]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>style</span>
                            Leitner Box Distribution
                            <span className="text-xs text-[#9A8E82] font-normal ml-2">{totalLeitnerCards} cards total</span>
                        </h2>
                        <div className="grid grid-cols-5 gap-3">
                            {[1, 2, 3, 4, 5].map((box) => {
                                const count = leitnerBoxCounts[box] || 0;
                                const pct = totalLeitnerCards > 0 ? (count / totalLeitnerCards) * 100 : 0;
                                const colors = ['#C17C64', '#D4A574', '#D4A574', '#8FA395', '#8FA395'];
                                return (
                                    <div key={box} className="flex flex-col items-center gap-2">
                                        <div className="w-full h-24 bg-[#F5EDE4] rounded-lg relative overflow-hidden flex items-end">
                                            <motion.div
                                                className="w-full rounded-t-md"
                                                style={{ backgroundColor: colors[box - 1] }}
                                                initial={{ height: 0 }}
                                                animate={{ height: `${Math.max(pct, 5)}%` }}
                                                transition={{ duration: 0.8, delay: 0.3 + box * 0.1 }}
                                            />
                                        </div>
                                        <span className="text-lg font-bold text-[#2A2018]">{count}</span>
                                        <span className="text-[9px] text-[#9A8E82] font-bold uppercase">Box {box}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-[#9A8E82] mt-3 text-center">
                            Box 1 = New/Difficult → Box 5 = Well Known. Cards move up when reviewed correctly.
                        </p>
                    </motion.div>
                )}

                {/* ═══ Recent Activity Timeline ═══ */}
                <motion.div
                    custom={8} variants={fadeIn} initial="hidden" animate="visible"
                    className="bg-white border border-[#D8CCBE] rounded-xl p-6"
                >
                    <h2 className="text-base font-bold text-[#2A2018] font-[Manrope] flex items-center gap-2 mb-5">
                        <span className="material-symbols-outlined text-[#a78bfa]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>timeline</span>
                        Learning Timeline
                    </h2>
                    {recentActivity.length > 0 ? (
                        <div className="relative pl-6 space-y-4">
                            {/* Timeline line */}
                            <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-[#E2D8CC]" />

                            {recentActivity.map((item, idx) => {
                                const mapped = ACTIVITY_MAP[item.action] || { label: item.action, icon: 'history', color: '#9A8E82' };
                                const target = item.target || formatConceptId(item.concept_id || item.episode_id || '');
                                const time = item.time || timeAgo(item.timestamp || item.created_at);
                                return (
                                    <motion.div
                                        key={item.id || idx}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + idx * 0.06 }}
                                        className="relative flex items-start gap-3"
                                    >
                                        {/* Dot */}
                                        <div
                                            className="absolute -left-6 top-1 w-[10px] h-[10px] rounded-full border-2 border-white z-10"
                                            style={{ backgroundColor: mapped.color }}
                                        />
                                        <div className="flex-1 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined" style={{ fontSize: 16, color: mapped.color, fontVariationSettings: "'FILL' 1" }}>{mapped.icon}</span>
                                                <span className="text-sm text-[#6B5E52]">{mapped.label}</span>
                                                {target && <span className="text-sm font-semibold text-[#2A2018]">{target}</span>}
                                            </div>
                                            {time && <span className="text-[10px] text-[#9A8E82] flex-shrink-0 ml-2">{time}</span>}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8">
                            <span className="material-symbols-outlined text-[#D8CCBE] mb-2" style={{ fontSize: 36 }}>timeline</span>
                            <p className="text-sm text-[#9A8E82]">Your learning activity will appear here.</p>
                        </div>
                    )}
                </motion.div>

                {/* ═══ Bottom: Mentor + Goals ═══ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* AI Mentor */}
                    <motion.div
                        custom={9} variants={fadeIn} initial="hidden" animate="visible"
                        className="bg-gradient-to-br from-white to-[#F5EDE4] border border-[#C17C64]/20 rounded-xl p-6 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#C17C64]/5 to-transparent rounded-bl-full pointer-events-none" />
                        <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-[#C17C64]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>psychology</span>
                            <h3 className="text-base font-bold text-[#2A2018] font-[Manrope]">Need Help?</h3>
                        </div>
                        <p className="text-sm text-[#6B5E52] leading-relaxed mb-4">
                            Get personalized guidance from your AI mentor — Socratic hints, concept breakdowns, and more.
                        </p>
                        <div className="flex items-center gap-2 relative">
                            <button onClick={() => router.push('/mentor')} className="px-4 py-2 rounded-lg bg-[#C17C64] text-white font-bold text-sm hover:brightness-110 transition-all shadow-sm flex items-center gap-2">
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat</span>
                                Ask Mentor
                            </button>
                            <button onClick={() => router.push('/bridge-sprint')} className="px-4 py-2 rounded-lg border border-[#D8CCBE] text-[#6B5E52] font-semibold text-sm hover:border-[#C17C64]/40 transition-colors flex items-center gap-2">
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>sprint</span>
                                Bridge Sprint
                            </button>
                        </div>
                    </motion.div>

                    {/* Achievements Summary */}
                    <motion.div
                        custom={10} variants={fadeIn} initial="hidden" animate="visible"
                        className="bg-white border border-[#D8CCBE] rounded-xl p-6"
                    >
                        <h3 className="text-base font-bold text-[#2A2018] font-[Manrope] flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-[#D4A574]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                            Achievements
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { icon: 'play_circle', label: 'First Episode', done: recentActivity.length > 0, color: '#D4A574' },
                                { icon: 'local_fire_department', label: '3-Day Streak', done: streak >= 3, color: '#C17C64' },
                                { icon: 'verified', label: 'First Mastery', done: totalMastered >= 1, color: '#8FA395' },
                                { icon: 'style', label: '10 Reviews', done: totalLeitnerCards >= 10, color: '#a78bfa' },
                                { icon: 'bolt', label: '1000 XP', done: xp >= 1000, color: '#D4A574' },
                                { icon: 'military_tech', label: 'Level 5', done: level >= 5, color: '#C17C64' },
                            ].map((badge, idx) => (
                                <motion.div
                                    key={badge.label}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.4 + idx * 0.06 }}
                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors ${
                                        badge.done
                                            ? 'bg-[#F5EDE4] border-[#D8CCBE]'
                                            : 'bg-[#FAF7F3] border-[#E2D8CC] opacity-40'
                                    }`}
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        style={{
                                            fontSize: 24,
                                            color: badge.done ? badge.color : '#D8CCBE',
                                            fontVariationSettings: "'FILL' 1"
                                        }}
                                    >
                                        {badge.icon}
                                    </span>
                                    <span className="text-[10px] font-bold text-[#6B5E52] text-center uppercase tracking-wider leading-tight">{badge.label}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>

            </div>
        </AppLayout>
    );
}

// ─── Export ────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-10 h-10 border-2 border-[#C17C64] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <ProfileContent />
        </Suspense>
    );
}

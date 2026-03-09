"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AppLayout from '@/components/layout/AppLayout';
import { getDashboard, getLearnerId, getLearnerName, getDueConcepts, getConstellation } from '@/lib/api';

// ─── Fallback / demo data ──────────────────────────────────────────────────
const FALLBACK_STATS = { xp: 0, streak: 0, concepts_mastered: 0, level: 1 };

const HEATMAP_COLORS = {
    mastered: '#8FA395',
    learning: '#D4A574',
    weak: '#C17C64',
    not_started: '#E2D8CC',
};

const URGENCY_STYLES = {
    high: { bg: 'bg-[#C17C64]/10', border: 'border-[#C17C64]/30', text: 'text-[#C17C64]', label: 'Urgent' },
    medium: { bg: 'bg-[#D4A574]/10', border: 'border-[#D4A574]/30', text: 'text-[#D4A574]', label: 'Soon' },
    low: { bg: 'bg-[#8FA395]/10', border: 'border-[#8FA395]/30', text: 'text-[#8FA395]', label: 'OK' },
};

// ─── Human-readable activity mapping ────────────────────────────────────────
const ACTIVITY_MAP = {
    STRUGGLE_SIGNAL: { label: 'Asked for help on', icon: 'help_center', color: '#C17C64' },
    EPISODE_COMPLETE: { label: 'Completed episode', icon: 'check_circle', color: '#8FA395' },
    EPISODE_START: { label: 'Started learning', icon: 'play_circle', color: '#D4A574' },
    ASSESSMENT_COMPLETE: { label: 'Finished assessment for', icon: 'quiz', color: '#8FA395' },
    ASSESSMENT_START: { label: 'Began assessment on', icon: 'assignment', color: '#D4A574' },
    LEITNER_REVIEW: { label: 'Reviewed flashcard', icon: 'style', color: '#a78bfa' },
    HINT_REQUEST: { label: 'Requested a hint on', icon: 'lightbulb', color: '#D4A574' },
    CODE_EXECUTE: { label: 'Ran code for', icon: 'code', color: '#6B5E52' },
    BRIDGE_SPRINT: { label: 'Completed bridge sprint', icon: 'sprint', color: '#C17C64' },
    BKT_UPDATE: { label: 'Mastery updated for', icon: 'trending_up', color: '#8FA395' },
    VIDEO_GENERATE: { label: 'Generated presentation for', icon: 'slideshow', color: '#a78bfa' },
    GOAL_SET: { label: 'Set learning goal', icon: 'flag', color: '#D4A574' },
};

const DEFAULT_ACTIVITY = { label: 'Activity on', icon: 'history', color: '#9A8E82' };

function formatConceptId(id) {
    if (!id) return '';
    return id.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function timeAgo(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
}

// ─── Circular Placement Gauge ───────────────────────────────────────────────
function PlacementGauge({ percentage, size = 180 }) {
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    const center = size / 2;
    const color = percentage >= 75 ? '#8FA395' : percentage >= 50 ? '#D4A574' : percentage >= 25 ? '#D4A574' : '#C17C64';

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={center} cy={center} r={radius} fill="none" stroke="#D8CCBE" strokeWidth={strokeWidth} />
                <motion.circle
                    cx={center} cy={center} r={radius} fill="none" stroke={color}
                    strokeWidth={strokeWidth} strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.4, ease: 'easeOut' }}
                />
                <motion.circle
                    cx={center} cy={center} r={radius} fill="none" stroke={color}
                    strokeWidth={strokeWidth + 6} strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.4, ease: 'easeOut' }}
                    opacity={0.12}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-[#2A2018] font-[Manrope]">{percentage}%</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#9A8E82] font-bold mt-1">Placement Ready</span>
            </div>
        </div>
    );
}

// ─── Skill Radar Donut ──────────────────────────────────────────────────────
function SkillDonut({ proficiency = 0, size = 140 }) {
    const strokeWidth = 14;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (proficiency / 100) * circumference;
    const center = size / 2;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={center} cy={center} r={radius} fill="none" stroke="#D8CCBE" strokeWidth={strokeWidth} />
                <motion.circle
                    cx={center} cy={center} r={radius} fill="none" stroke="#C17C64"
                    strokeWidth={strokeWidth} strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-[#2A2018] font-[Manrope]">{proficiency}%</span>
                <span className="text-[9px] uppercase tracking-widest text-[#9A8E82] font-bold">Proficiency</span>
            </div>
        </div>
    );
}

// ─── Empty State ────────────────────────────────────────────────────────────
function EmptyState({ icon, message, actionLabel, onAction }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="material-symbols-outlined text-[#D8CCBE] mb-2" style={{ fontSize: 36 }}>{icon}</span>
            <p className="text-sm text-[#9A8E82] max-w-xs">{message}</p>
            {actionLabel && (
                <button
                    onClick={onAction}
                    className="mt-3 px-4 py-2 rounded-lg bg-[#D4A574] text-white text-xs font-bold hover:brightness-110 transition-all"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

// ─── Card fade-in variants ──────────────────────────────────────────────────
const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' },
    }),
};

export default function DashboardPage() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [leitnerDue, setLeitnerDue] = useState(null);
    const [constellation, setConstellation] = useState(null);
    const [loading, setLoading] = useState(true);
    const learnerName = getLearnerName();

    useEffect(() => {
        const learnerId = getLearnerId();
        if (!learnerId) { router.push('/onboarding'); return; }

        async function fetchAll() {
            const [dashRes, leitnerRes, constRes] = await Promise.all([
                getDashboard(learnerId),
                getDueConcepts(learnerId),
                getConstellation(learnerId),
            ]);
            if (!dashRes.error && dashRes.data) setData(dashRes.data);
            if (!leitnerRes.error && leitnerRes.data) setLeitnerDue(leitnerRes.data);
            if (!constRes.error && constRes.data) setConstellation(constRes.data);
            setLoading(false);
        }
        fetchAll();
    }, [router]);

    // ─── Extract with fallbacks ─────────────────────────────────────────────
    const stats = {
        xp: data?.stats?.xp ?? data?.profile?.xp ?? FALLBACK_STATS.xp,
        streak: data?.stats?.streak ?? data?.profile?.streak ?? FALLBACK_STATS.streak,
        concepts_mastered: data?.stats?.total_mastered ?? data?.mastery?.total_mastered ?? FALLBACK_STATS.concepts_mastered,
        level: data?.stats?.level ?? data?.profile?.level ?? FALLBACK_STATS.level,
    };
    const placement = data?.placement_readiness ?? data?.stats?.placement_readiness ?? 0;
    const heatmapData = data?.heatmap || data?.mastery?.heatmap || [];
    const activeSeasons = data?.active_seasons || data?.seasons || [];
    const leitnerItems = leitnerDue?.due_concepts || leitnerDue?.items || data?.leitner?.due_concepts || [];
    const fadingConcepts = data?.fading_knowledge || data?.fading || [];
    const skills = data?.skills || data?.radar_data?.map(r => ({ domain: r.subject, value: r.value || r.A / 150 })) || [];
    const recentActivity = data?.recent_activity || [];
    const xpNextLevel = data?.xp_next_level ?? (stats.level * 5000);
    const totalConcepts = data?.mastery?.total_concepts ?? heatmapData.length;

    // Calculate actual proficiency from skills data
    const skillProficiency = skills.length > 0
        ? Math.round(skills.reduce((sum, s) => sum + (s.value ?? 0), 0) / skills.length * 100)
        : 0;

    // Get available topics from constellation for "What's Next"
    const constellationNodes = constellation?.nodes || constellation?.concepts || [];
    const nextTopics = constellationNodes.filter(n => n.status !== 'mastered').slice(0, 3);

    // Is this a new user with minimal data?
    const isNewUser = stats.xp === 0 && stats.concepts_mastered === 0 && recentActivity.length === 0;

    if (loading) {
        return (
            <AppLayout>
                <div className="h-[80vh] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-2 border-[#C17C64] border-t-transparent rounded-full animate-spin" />
                        <span className="text-[#6B5E52] text-sm">Loading dashboard...</span>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="min-h-full px-4 lg:px-8 py-6 space-y-6">

                {/* ═══ Welcome / What's Next Hero ═══ */}
                <motion.div
                    custom={0} variants={fadeIn} initial="hidden" animate="visible"
                    className="bg-gradient-to-r from-[#C17C64]/10 via-[#D4A574]/10 to-[#8FA395]/10 border border-[#D8CCBE] rounded-xl p-6"
                >
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-[#2A2018] font-[Manrope]">
                                {isNewUser ? `Welcome, ${learnerName}!` : `Welcome back, ${learnerName}!`}
                            </h2>
                            <p className="text-sm text-[#6B5E52] mt-1">
                                {isNewUser
                                    ? 'Start your learning journey — pick a topic below or explore the constellation.'
                                    : leitnerItems.length > 0
                                        ? `You have ${leitnerItems.length} concept${leitnerItems.length > 1 ? 's' : ''} due for review. Keep your streak alive!`
                                        : stats.concepts_mastered > 0
                                            ? `You've mastered ${stats.concepts_mastered} concept${stats.concepts_mastered > 1 ? 's' : ''}. Keep going!`
                                            : 'Continue where you left off or explore new topics.'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {leitnerItems.length > 0 && (
                                <button
                                    onClick={() => {
                                        const first = leitnerItems[0];
                                        router.push(`/season/${first.concept_id}`);
                                    }}
                                    className="px-4 py-2.5 rounded-lg bg-[#C17C64] text-white font-bold text-sm hover:brightness-110 transition-all shadow-sm flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>style</span>
                                    Review Due Cards
                                </button>
                            )}
                            <button
                                onClick={() => router.push('/home')}
                                className="px-4 py-2.5 rounded-lg bg-[#D4A574] text-white font-bold text-sm hover:brightness-110 transition-all shadow-sm flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>explore</span>
                                Explore Topics
                            </button>
                        </div>
                    </div>

                    {/* Quick-start topics for new users */}
                    {isNewUser && nextTopics.length > 0 && (
                        <div className="mt-4 flex items-center gap-3 flex-wrap">
                            <span className="text-xs text-[#9A8E82] font-semibold">Suggested:</span>
                            {nextTopics.map((topic) => (
                                <button
                                    key={topic.id || topic.concept_id}
                                    onClick={() => router.push(`/season/${topic.id || topic.concept_id}`)}
                                    className="px-3 py-1.5 rounded-full bg-white border border-[#D8CCBE] text-xs font-semibold text-[#6B5E52] hover:border-[#C17C64]/40 hover:text-[#C17C64] transition-colors"
                                >
                                    {formatConceptId(topic.label || topic.id || topic.concept_id)}
                                </button>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* ═══ Stats Row: Quick Glance ═══ */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { icon: 'bolt', color: '#D4A574', label: 'Total XP', value: stats.xp.toLocaleString() },
                        { icon: 'local_fire_department', color: '#C17C64', label: 'Day Streak', value: stats.streak },
                        { icon: 'verified', color: '#8FA395', label: 'Mastered', value: `${stats.concepts_mastered}${totalConcepts > 0 ? `/${totalConcepts}` : ''}` },
                        { icon: 'military_tech', color: '#D4A574', label: 'Level', value: stats.level },
                    ].map((stat, idx) => (
                        <motion.div
                            key={stat.label}
                            custom={idx + 1} variants={fadeIn} initial="hidden" animate="visible"
                            className="bg-white border border-[#D8CCBE] rounded-xl p-4 flex items-center gap-3"
                        >
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${stat.color}15` }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 22, color: stat.color, fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
                            </div>
                            <div>
                                <p className="text-xl font-extrabold text-[#2A2018] font-[Manrope]">{stat.value}</p>
                                <p className="text-[10px] text-[#9A8E82] uppercase tracking-wider font-bold">{stat.label}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* ═══ XP Progress Bar ═══ */}
                <motion.div
                    custom={5} variants={fadeIn} initial="hidden" animate="visible"
                    className="bg-white border border-[#D8CCBE] rounded-xl p-4"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[#9A8E82] font-semibold">Progress to Level {stats.level + 1}</span>
                        <span className="text-xs font-bold text-[#D4A574]">{stats.xp.toLocaleString()} / {xpNextLevel.toLocaleString()} XP</span>
                    </div>
                    <div className="w-full h-3 bg-[#E2D8CC] rounded-full overflow-hidden">
                        <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-[#D4A574] to-[#CB8A5E]"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (stats.xp / xpNextLevel) * 100)}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                        />
                    </div>
                </motion.div>

                {/* ═══ Main Grid: Placement + Skill Radar | Activity + Leitner ═══ */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* LEFT COLUMN */}
                    <div className="space-y-6">

                        {/* Placement Readiness */}
                        <motion.div
                            custom={6} variants={fadeIn} initial="hidden" animate="visible"
                            className="bg-white border border-[#D8CCBE] rounded-xl p-6 flex flex-col items-center"
                        >
                            <div className="flex items-center gap-2 self-start mb-4">
                                <span className="material-symbols-outlined text-[#C17C64]" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>target</span>
                                <h3 className="text-base font-bold text-[#2A2018] font-[Manrope]">Placement Readiness</h3>
                            </div>
                            <PlacementGauge percentage={placement} />
                            <p className="text-xs text-[#9A8E82] mt-4 text-center leading-relaxed max-w-xs">
                                {placement >= 75 ? 'You are well-prepared. Keep polishing weak areas.' :
                                 placement >= 50 ? 'Good progress! Focus on weak concepts to level up.' :
                                 placement > 0 ? 'Keep learning! Complete more episodes to improve readiness.' :
                                 'Complete episodes and reviews to build your placement score.'}
                            </p>
                            <div className="flex items-center gap-3 mt-5">
                                <button
                                    onClick={() => router.push('/onboarding')}
                                    className="px-4 py-2.5 rounded-lg bg-[#D4A574] text-white font-bold text-sm hover:brightness-110 transition-all shadow-sm"
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>quiz</span>
                                        Take Assessment
                                    </span>
                                </button>
                                <button
                                    onClick={() => router.push('/profile')}
                                    className="px-4 py-2.5 rounded-lg border border-[#D8CCBE] text-[#2A2018] font-semibold text-sm hover:border-[#C17C64]/40 transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person</span>
                                        Profile
                                    </span>
                                </button>
                            </div>
                        </motion.div>

                        {/* Skill Radar Donut */}
                        <motion.div
                            custom={7} variants={fadeIn} initial="hidden" animate="visible"
                            className="bg-white border border-[#D8CCBE] rounded-xl p-6 flex flex-col items-center"
                        >
                            <div className="flex items-center gap-2 self-start mb-4">
                                <span className="material-symbols-outlined text-[#C17C64]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>donut_large</span>
                                <h3 className="text-base font-bold text-[#2A2018] font-[Manrope]">Skill Radar</h3>
                            </div>
                            {skills.length > 0 ? (
                                <>
                                    <SkillDonut proficiency={skillProficiency} />
                                    <div className="w-full mt-5 space-y-3">
                                        {skills.slice(0, 6).map((skill, idx) => {
                                            const pct = Math.round((skill.value ?? 0) * 100);
                                            const domainLabel = formatConceptId(skill.domain);
                                            return (
                                                <div key={skill.domain || idx}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs text-[#6B5E52]">{domainLabel}</span>
                                                        <span className="text-xs font-bold text-[#C17C64]">{pct}%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-[#E2D8CC] rounded-full overflow-hidden">
                                                        <motion.div
                                                            className="h-full rounded-full bg-[#C17C64]"
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${pct}%` }}
                                                            transition={{ duration: 0.8, delay: 0.4 + idx * 0.1 }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <EmptyState
                                    icon="radar"
                                    message="Complete episodes to see your skill breakdown across topics."
                                    actionLabel="Start Learning"
                                    onAction={() => router.push('/home')}
                                />
                            )}
                        </motion.div>

                        {/* Concept Mastery Heatmap */}
                        <motion.div
                            custom={8} variants={fadeIn} initial="hidden" animate="visible"
                            className="bg-white border border-[#D8CCBE] rounded-xl p-6"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#D4A574]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>grid_view</span>
                                    <h3 className="text-base font-bold text-[#2A2018] font-[Manrope]">Concept Mastery</h3>
                                </div>
                            </div>
                            {heatmapData.length > 0 ? (
                                <>
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
                                </>
                            ) : (
                                <EmptyState
                                    icon="grid_view"
                                    message="Your concept mastery map will appear here as you learn."
                                />
                            )}
                        </motion.div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Active Seasons */}
                        <motion.div
                            custom={6} variants={fadeIn} initial="hidden" animate="visible"
                            className="bg-white border border-[#D8CCBE] rounded-xl p-6"
                        >
                            <div className="flex items-center gap-2 mb-5">
                                <span className="material-symbols-outlined text-[#C17C64]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>movie</span>
                                <h3 className="text-base font-bold text-[#2A2018] font-[Manrope]">Active Seasons</h3>
                            </div>
                            {activeSeasons.length > 0 ? (
                                <div className="space-y-3">
                                    {activeSeasons.map((season, idx) => {
                                        const pct = Math.round((season.progress ?? 0) * 100);
                                        return (
                                            <motion.div
                                                key={season.id || idx}
                                                initial={{ opacity: 0, x: -12 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.4 + idx * 0.1 }}
                                                className="bg-[#F0E7DC] border border-[#D8CCBE] rounded-xl p-4 cursor-pointer hover:border-[#C17C64]/30 transition-colors"
                                                onClick={() => router.push(`/season/${season.id}`)}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-semibold text-[#2A2018] truncate">{season.title || formatConceptId(season.id)}</span>
                                                    <span className="text-xs font-bold text-[#C17C64] ml-2 flex-shrink-0">{pct}%</span>
                                                </div>
                                                <div className="w-full h-2 bg-[#E2D8CC] rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full rounded-full bg-gradient-to-r from-[#C17C64] to-[#8FA395]"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${pct}%` }}
                                                        transition={{ duration: 0.8, delay: 0.5 + idx * 0.1 }}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1 mt-2 text-[10px] text-[#9A8E82]">
                                                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>play_circle</span>
                                                    {season.episodes_done ?? Math.round(season.progress * (season.total_episodes || 20))}/{season.total_episodes || 20} episodes
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <EmptyState
                                    icon="movie"
                                    message="No active learning seasons yet. Explore topics to start your first season!"
                                    actionLabel="Explore Topics"
                                    onAction={() => router.push('/home')}
                                />
                            )}
                        </motion.div>

                        {/* Recent Activity Feed */}
                        <motion.div
                            custom={7} variants={fadeIn} initial="hidden" animate="visible"
                            className="bg-white border border-[#D8CCBE] rounded-xl p-6"
                        >
                            <div className="flex items-center gap-2 mb-5">
                                <span className="material-symbols-outlined text-[#a78bfa]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>history</span>
                                <h3 className="text-base font-bold text-[#2A2018] font-[Manrope]">Recent Activity</h3>
                            </div>
                            {recentActivity.length > 0 ? (
                                <div className="space-y-3">
                                    {recentActivity.map((item, idx) => {
                                        const mapped = ACTIVITY_MAP[item.action] || DEFAULT_ACTIVITY;
                                        const icon = item.icon || mapped.icon;
                                        const color = item.color || mapped.color;
                                        const label = mapped.label;
                                        const target = item.target || formatConceptId(item.concept_id || item.episode_id || '');
                                        const time = item.time || timeAgo(item.timestamp || item.created_at);
                                        return (
                                            <motion.div
                                                key={item.id || idx}
                                                initial={{ opacity: 0, x: 10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.4 + idx * 0.08 }}
                                                className="flex items-center gap-3"
                                            >
                                                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: 18, color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-[#2A2018] truncate">
                                                        <span className="text-[#6B5E52]">{label}</span>{' '}
                                                        <span className="font-semibold">{target}</span>
                                                    </p>
                                                </div>
                                                {time && <span className="text-[10px] text-[#9A8E82] flex-shrink-0">{time}</span>}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <EmptyState
                                    icon="history"
                                    message="Your learning activity will show up here as you complete episodes and reviews."
                                />
                            )}
                        </motion.div>

                        {/* Leitner Review Queue */}
                        <motion.div
                            custom={8} variants={fadeIn} initial="hidden" animate="visible"
                            className="bg-white border border-[#D8CCBE] rounded-xl p-6"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#D4A574]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>inbox</span>
                                    <h3 className="text-base font-bold text-[#2A2018] font-[Manrope]">Leitner Review Queue</h3>
                                </div>
                                <span className="text-xs font-bold text-[#C17C64] bg-[#C17C64]/10 px-2.5 py-1 rounded-full">
                                    {leitnerItems.length} due
                                </span>
                            </div>
                            {leitnerItems.length > 0 ? (
                                <div className="space-y-3">
                                    {leitnerItems.map((item, idx) => {
                                        const urgency = URGENCY_STYLES[item.urgency] || URGENCY_STYLES.medium;
                                        return (
                                            <motion.div
                                                key={item.concept_id || idx}
                                                initial={{ opacity: 0, x: 12 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.4 + idx * 0.08 }}
                                                className="flex items-center gap-3 bg-[#F0E7DC] border border-[#D8CCBE] rounded-xl p-4 cursor-pointer hover:border-[#C17C64]/30 transition-colors"
                                                onClick={() => router.push(`/season/${item.concept_id}`)}
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-white border border-[#D8CCBE] flex items-center justify-center flex-shrink-0">
                                                    <span className="text-xs font-bold text-[#6B5E52]">B{item.box}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-[#2A2018] truncate">{formatConceptId(item.label || item.concept_id)}</p>
                                                    <p className="text-[10px] text-[#9A8E82] mt-0.5">Leitner Box {item.box}</p>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${urgency.bg} ${urgency.border} ${urgency.text}`}>
                                                    {urgency.label}
                                                </span>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <EmptyState
                                    icon="inbox"
                                    message="No cards due for review right now. Complete episodes to add concepts to your review queue."
                                />
                            )}
                        </motion.div>
                    </div>
                </div>

                {/* ═══ Bottom: Fading Knowledge + AI Mentor ═══ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Fading Knowledge Alerts */}
                    <motion.div
                        custom={9} variants={fadeIn} initial="hidden" animate="visible"
                        className="bg-white border border-[#D8CCBE] rounded-xl p-6"
                    >
                        <div className="flex items-center gap-2 mb-5">
                            <span className="material-symbols-outlined text-red-400" style={{ fontSize: 20 }}>trending_down</span>
                            <h3 className="text-base font-bold text-[#2A2018] font-[Manrope]">Fading Knowledge</h3>
                        </div>
                        {fadingConcepts.length > 0 ? (
                            <div className="space-y-3">
                                {fadingConcepts.map((item, idx) => {
                                    const pct = Math.round((item.mastery ?? 0) * 100);
                                    const delta = Math.round((item.delta ?? 0) * 100);
                                    return (
                                        <motion.div
                                            key={item.concept_id || idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.5 + idx * 0.1 }}
                                            className="bg-[#F0E7DC] border border-red-500/20 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-red-500/40 transition-colors"
                                            onClick={() => router.push(`/season/${item.concept_id}`)}
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                                                <span className="material-symbols-outlined text-red-400" style={{ fontSize: 20 }}>warning</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-[#2A2018] truncate">{formatConceptId(item.label || item.concept_id)}</p>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <div className="flex-1 h-1.5 bg-[#E2D8CC] rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full bg-red-500" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-red-400">{pct}%</span>
                                                </div>
                                            </div>
                                            {delta !== 0 && (
                                                <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-full flex-shrink-0">
                                                    {delta > 0 ? '+' : ''}{delta}%
                                                </span>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <span className="material-symbols-outlined text-[#8FA395] mb-2" style={{ fontSize: 36, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                <p className="text-sm text-[#6B5E52]">All concepts are holding steady!</p>
                            </div>
                        )}
                    </motion.div>

                    {/* AI Mentor Card */}
                    <motion.div
                        custom={10} variants={fadeIn} initial="hidden" animate="visible"
                        className="bg-gradient-to-br from-white to-[#F5EDE4] border border-[#C17C64]/20 rounded-xl p-6 flex flex-col justify-between relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-[#C17C64]/5 to-transparent rounded-bl-full pointer-events-none" />
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="material-symbols-outlined text-[#C17C64]" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>psychology</span>
                                <span className="text-xs font-extrabold text-[#C17C64] uppercase tracking-widest">AI Mentor</span>
                            </div>
                            <h3 className="text-xl font-bold text-[#2A2018] font-[Manrope] mb-2">Stuck on a concept?</h3>
                            <p className="text-sm text-[#6B5E52] leading-relaxed mb-6">
                                Get Socratic guidance, concept breakdowns, and personalized hints from your AI-powered mentor.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 relative">
                            <button onClick={() => router.push('/mentor')} className="px-5 py-2.5 rounded-lg bg-[#C17C64] text-white font-bold text-sm hover:brightness-110 transition-all shadow-sm">
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
                                    Ask Mentor
                                </span>
                            </button>
                            <button onClick={() => router.push('/bridge-sprint')} className="px-5 py-2.5 rounded-lg border border-[#D8CCBE] text-[#2A2018] font-semibold text-sm hover:border-[#C17C64]/40 transition-colors">
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>sprint</span>
                                    Bridge Sprint
                                </span>
                            </button>
                        </div>
                    </motion.div>
                </div>

            </div>
        </AppLayout>
    );
}

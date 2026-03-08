"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AppLayout from '@/components/layout/AppLayout';
import { getDashboard, getLearnerId, getDueConcepts } from '@/lib/api';

// ─── Fallback / demo data ──────────────────────────────────────────────────
// Empty defaults for new users — all data comes from API
const FALLBACK_STATS = { xp: 0, streak: 0, concepts_mastered: 0, level: 1 };
const FALLBACK_PLACEMENT = 0;
const FALLBACK_HEATMAP = [];
const FALLBACK_SEASONS = [];
const FALLBACK_LEITNER = [];
const FALLBACK_FADING = [];
const FALLBACK_SKILLS = [];
const FALLBACK_ACTIVITY = [];

const HEATMAP_COLORS = {
    mastered: '#00d26a',
    learning: '#f0c14b',
    weak: '#e74c3c',
    not_started: '#232f3e',
};

const URGENCY_STYLES = {
    high: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: 'Urgent' },
    medium: { bg: 'bg-[#f0c14b]/10', border: 'border-[#f0c14b]/30', text: 'text-[#f0c14b]', label: 'Soon' },
    low: { bg: 'bg-[#00d26a]/10', border: 'border-[#00d26a]/30', text: 'text-[#00d26a]', label: 'OK' },
};

// ─── Circular Placement Gauge ───────────────────────────────────────────────
function PlacementGauge({ percentage, size = 180 }) {
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    const center = size / 2;
    const color = percentage >= 75 ? '#00d26a' : percentage >= 50 ? '#00ace0' : percentage >= 25 ? '#f0c14b' : '#e74c3c';

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={center} cy={center} r={radius} fill="none" stroke="#2a3642" strokeWidth={strokeWidth} />
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
                <span className="text-4xl font-extrabold text-white font-[Manrope]">{percentage}%</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mt-1">Placement Ready</span>
            </div>
        </div>
    );
}

// ─── Skill Radar Donut ──────────────────────────────────────────────────────
function SkillDonut({ proficiency = 85, size = 140 }) {
    const strokeWidth = 14;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (proficiency / 100) * circumference;
    const center = size / 2;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={center} cy={center} r={radius} fill="none" stroke="#2a3642" strokeWidth={strokeWidth} />
                <motion.circle
                    cx={center} cy={center} r={radius} fill="none" stroke="#00ace0"
                    strokeWidth={strokeWidth} strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-white font-[Manrope]">{proficiency}%</span>
                <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Proficiency</span>
            </div>
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const learnerId = getLearnerId();
        if (!learnerId) { router.push('/onboarding'); return; }

        async function fetchAll() {
            const [dashRes, leitnerRes] = await Promise.all([
                getDashboard(learnerId),
                getDueConcepts(learnerId),
            ]);
            if (!dashRes.error && dashRes.data) setData(dashRes.data);
            if (!leitnerRes.error && leitnerRes.data) setLeitnerDue(leitnerRes.data);
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
    const placement = data?.placement_readiness ?? data?.stats?.placement_readiness ?? FALLBACK_PLACEMENT;
    const heatmapData = data?.heatmap || data?.mastery?.heatmap || FALLBACK_HEATMAP;
    const activeSeasons = data?.active_seasons || data?.seasons || FALLBACK_SEASONS;
    const leitnerItems = leitnerDue?.due_concepts || leitnerDue?.items || data?.leitner?.due_concepts || FALLBACK_LEITNER;
    const fadingConcepts = data?.fading_knowledge || data?.fading || FALLBACK_FADING;
    const skills = data?.skills || data?.radar_data?.map(r => ({ domain: r.subject, value: r.value || r.A / 150 })) || FALLBACK_SKILLS;
    const recentActivity = data?.recent_activity || FALLBACK_ACTIVITY;
    const skillProficiency = data?.skill_proficiency ?? 85;
    const xpNextLevel = data?.xp_next_level ?? 15000;

    if (loading) {
        return (
            <AppLayout>
                <div className="h-[80vh] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-2 border-[#00ace0] border-t-transparent rounded-full animate-spin" />
                        <span className="text-slate-400 text-sm">Loading dashboard...</span>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="min-h-full px-4 lg:px-8 py-6 space-y-6">

                {/* ═══ Top Row: Placement Gauge + XP Counter ═══ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Placement Readiness */}
                    <motion.div
                        custom={0} variants={fadeIn} initial="hidden" animate="visible"
                        className="bg-[#1a242f] border border-[#2a3642] rounded-xl p-6 flex flex-col items-center"
                    >
                        <div className="flex items-center gap-2 self-start mb-4">
                            <span className="material-symbols-outlined text-[#00ace0]" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>target</span>
                            <h3 className="text-base font-bold text-white font-[Manrope]">Placement Readiness</h3>
                        </div>
                        <PlacementGauge percentage={placement} />
                        <p className="text-xs text-slate-500 mt-4 text-center leading-relaxed max-w-xs">
                            {placement >= 75 ? 'You are well-prepared. Keep polishing weak areas.' :
                             placement >= 50 ? 'Good progress! Focus on weak concepts to level up.' :
                             'Keep learning! Complete more seasons to improve readiness.'}
                        </p>
                        <div className="flex items-center gap-3 mt-5">
                            <button
                                onClick={() => router.push('/assessment')}
                                className="px-5 py-2.5 rounded-lg bg-[#f0c14b] text-[#0f171e] font-bold text-sm hover:brightness-110 transition-all shadow-[0_0_20px_rgba(240,193,75,0.15)]"
                            >
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>quiz</span>
                                    TAKE ASSESSMENT
                                </span>
                            </button>
                            <button
                                onClick={() => router.push('/profile')}
                                className="px-5 py-2.5 rounded-lg border border-[#2a3642] text-white font-semibold text-sm hover:border-[#00ace0]/40 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>description</span>
                                    VIEW REPORT
                                </span>
                            </button>
                        </div>
                    </motion.div>

                    {/* XP Counter */}
                    <motion.div
                        custom={1} variants={fadeIn} initial="hidden" animate="visible"
                        className="bg-[#1a242f] border border-[#2a3642] rounded-xl p-6 flex flex-col justify-between"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-[#f0c14b]" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>bolt</span>
                            <h3 className="text-base font-bold text-white font-[Manrope]">Experience Points</h3>
                        </div>
                        <div className="flex items-end gap-3 mb-2">
                            <span className="text-5xl font-extrabold text-[#f0c14b] font-[Manrope]">{stats.xp.toLocaleString()}</span>
                            <span className="text-sm text-slate-500 font-semibold mb-2">XP</span>
                        </div>
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs text-slate-500">Progress to Level {stats.level + 1}</span>
                                <span className="text-xs font-bold text-[#f0c14b]">{stats.xp.toLocaleString()} / {xpNextLevel.toLocaleString()}</span>
                            </div>
                            <div className="w-full h-3 bg-[#2a3642] rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-[#f0c14b] to-[#ff9500]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (stats.xp / xpNextLevel) * 100)}%` }}
                                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-[#0f171e] border border-[#2a3642] rounded-lg p-3 text-center">
                                <span className="material-symbols-outlined text-orange-400 mb-1" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                                <p className="text-lg font-bold text-white">{stats.streak}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Streak</p>
                            </div>
                            <div className="bg-[#0f171e] border border-[#2a3642] rounded-lg p-3 text-center">
                                <span className="material-symbols-outlined text-[#00d26a] mb-1" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>verified</span>
                                <p className="text-lg font-bold text-white">{stats.concepts_mastered}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Mastered</p>
                            </div>
                            <div className="bg-[#0f171e] border border-[#2a3642] rounded-lg p-3 text-center">
                                <span className="material-symbols-outlined text-[#00ace0] mb-1" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                                <p className="text-lg font-bold text-white">{stats.level}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Level</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* ═══ Left Column + Right Column ═══ */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* LEFT COLUMN */}
                    <div className="space-y-6">

                        {/* Skill Radar Donut */}
                        <motion.div
                            custom={2} variants={fadeIn} initial="hidden" animate="visible"
                            className="bg-[#1a242f] border border-[#2a3642] rounded-xl p-6 flex flex-col items-center"
                        >
                            <div className="flex items-center gap-2 self-start mb-4">
                                <span className="material-symbols-outlined text-[#00ace0]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>donut_large</span>
                                <h3 className="text-base font-bold text-white font-[Manrope]">Skill Radar</h3>
                            </div>
                            <SkillDonut proficiency={skillProficiency} />
                            <div className="w-full mt-5 space-y-3">
                                {skills.slice(0, 4).map((skill, idx) => {
                                    const pct = Math.round((skill.value ?? 0) * 100);
                                    return (
                                        <div key={skill.domain || idx}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-slate-400">{skill.domain}</span>
                                                <span className="text-xs font-bold text-[#00ace0]">{pct}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-[#2a3642] rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full rounded-full bg-[#00ace0]"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 0.8, delay: 0.4 + idx * 0.1 }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>

                        {/* Concept Mastery Heatmap */}
                        <motion.div
                            custom={3} variants={fadeIn} initial="hidden" animate="visible"
                            className="bg-[#1a242f] border border-[#2a3642] rounded-xl p-6"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#f0c14b]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>grid_view</span>
                                    <h3 className="text-base font-bold text-white font-[Manrope]">Concept Mastery</h3>
                                </div>
                            </div>
                            {/* Legend */}
                            <div className="flex items-center gap-3 mb-4">
                                {[
                                    { label: 'Mastered', color: HEATMAP_COLORS.mastered },
                                    { label: 'Learning', color: HEATMAP_COLORS.learning },
                                    { label: 'Weak', color: HEATMAP_COLORS.weak },
                                    { label: 'New', color: HEATMAP_COLORS.not_started },
                                ].map(l => (
                                    <div key={l.label} className="flex items-center gap-1">
                                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                                        <span className="text-[9px] text-slate-500">{l.label}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {heatmapData.map((item, idx) => (
                                    <motion.div
                                        key={item.id || idx}
                                        initial={{ opacity: 0, scale: 0.7 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.3 + idx * 0.03 }}
                                        className="group relative"
                                    >
                                        <div
                                            className="aspect-square rounded-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-110 border border-transparent hover:border-white/10"
                                            style={{ backgroundColor: HEATMAP_COLORS[item.status] || HEATMAP_COLORS.not_started }}
                                        >
                                            {item.status === 'mastered' && (
                                                <span className="material-symbols-outlined text-white/70" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>done</span>
                                            )}
                                            {item.status === 'weak' && (
                                                <span className="material-symbols-outlined text-white/70" style={{ fontSize: 14 }}>warning</span>
                                            )}
                                        </div>
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0f171e] border border-[#2a3642] text-white text-[9px] px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 font-medium">
                                            {item.label || item.id}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Active Seasons */}
                        <motion.div
                            custom={4} variants={fadeIn} initial="hidden" animate="visible"
                            className="bg-[#1a242f] border border-[#2a3642] rounded-xl p-6"
                        >
                            <div className="flex items-center gap-2 mb-5">
                                <span className="material-symbols-outlined text-[#00ace0]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>movie</span>
                                <h3 className="text-base font-bold text-white font-[Manrope]">Active Seasons</h3>
                            </div>
                            <div className="space-y-3">
                                {activeSeasons.map((season, idx) => {
                                    const pct = Math.round((season.progress ?? 0) * 100);
                                    return (
                                        <motion.div
                                            key={season.id || idx}
                                            initial={{ opacity: 0, x: -12 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.4 + idx * 0.1 }}
                                            className="bg-[#0f171e] border border-[#2a3642] rounded-xl p-4 cursor-pointer hover:border-[#00ace0]/30 transition-colors"
                                            onClick={() => router.push(`/season/${season.id}`)}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-semibold text-white truncate">{season.title}</span>
                                                <span className="text-xs font-bold text-[#00ace0] ml-2 flex-shrink-0">{pct}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-[#2a3642] rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full rounded-full bg-gradient-to-r from-[#00ace0] to-[#00d26a]"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 0.8, delay: 0.5 + idx * 0.1 }}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500">
                                                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>play_circle</span>
                                                {season.episodes_done ?? Math.round(season.progress * (season.total_episodes || 20))}/{season.total_episodes || 20} episodes
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>

                        {/* Recent Activity Feed */}
                        <motion.div
                            custom={5} variants={fadeIn} initial="hidden" animate="visible"
                            className="bg-[#1a242f] border border-[#2a3642] rounded-xl p-6"
                        >
                            <div className="flex items-center gap-2 mb-5">
                                <span className="material-symbols-outlined text-[#a78bfa]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>history</span>
                                <h3 className="text-base font-bold text-white font-[Manrope]">Recent Activity</h3>
                            </div>
                            <div className="space-y-3">
                                {recentActivity.map((item, idx) => (
                                    <motion.div
                                        key={item.id || idx}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 + idx * 0.08 }}
                                        className="flex items-center gap-3"
                                    >
                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${item.color}15` }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: item.color, fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white truncate">
                                                <span className="text-slate-400">{item.action}</span>{' '}
                                                <span className="font-semibold">{item.target}</span>
                                            </p>
                                        </div>
                                        <span className="text-[10px] text-slate-600 flex-shrink-0">{item.time}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Leitner Review Queue */}
                        <motion.div
                            custom={6} variants={fadeIn} initial="hidden" animate="visible"
                            className="bg-[#1a242f] border border-[#2a3642] rounded-xl p-6"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#f0c14b]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>inbox</span>
                                    <h3 className="text-base font-bold text-white font-[Manrope]">Leitner Review Queue</h3>
                                </div>
                                <span className="text-xs font-bold text-[#00ace0] bg-[#00ace0]/10 px-2.5 py-1 rounded-full">
                                    {leitnerItems.length} due
                                </span>
                            </div>
                            <div className="space-y-3">
                                {leitnerItems.map((item, idx) => {
                                    const urgency = URGENCY_STYLES[item.urgency] || URGENCY_STYLES.medium;
                                    return (
                                        <motion.div
                                            key={item.concept_id || idx}
                                            initial={{ opacity: 0, x: 12 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.4 + idx * 0.08 }}
                                            className="flex items-center gap-3 bg-[#0f171e] border border-[#2a3642] rounded-xl p-4 cursor-pointer hover:border-[#00ace0]/30 transition-colors"
                                            onClick={() => router.push(`/season/${item.concept_id}`)}
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-[#1a242f] border border-[#2a3642] flex items-center justify-center flex-shrink-0">
                                                <span className="text-xs font-bold text-slate-400">B{item.box}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-white truncate">{item.label || item.concept_id}</p>
                                                <p className="text-[10px] text-slate-500 mt-0.5">Leitner Box {item.box}</p>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${urgency.bg} ${urgency.border} ${urgency.text}`}>
                                                {urgency.label}
                                            </span>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* ═══ Bottom: Fading Knowledge + Pro Career Card ═══ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Fading Knowledge Alerts */}
                    <motion.div
                        custom={7} variants={fadeIn} initial="hidden" animate="visible"
                        className="bg-[#1a242f] border border-[#2a3642] rounded-xl p-6"
                    >
                        <div className="flex items-center gap-2 mb-5">
                            <span className="material-symbols-outlined text-red-400" style={{ fontSize: 20 }}>trending_down</span>
                            <h3 className="text-base font-bold text-white font-[Manrope]">Fading Knowledge</h3>
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
                                            className="bg-[#0f171e] border border-red-500/20 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-red-500/40 transition-colors"
                                            onClick={() => router.push(`/season/${item.concept_id}`)}
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                                                <span className="material-symbols-outlined text-red-400" style={{ fontSize: 20 }}>warning</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-white truncate">{item.label || item.concept_id}</p>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <div className="flex-1 h-1.5 bg-[#2a3642] rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full bg-red-500" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-red-400">{pct}%</span>
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-full flex-shrink-0">
                                                {delta}%
                                            </span>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <span className="material-symbols-outlined text-[#00d26a] mb-2" style={{ fontSize: 36, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                <p className="text-sm text-slate-400">All concepts are holding steady!</p>
                            </div>
                        )}
                    </motion.div>

                    {/* AI Mentor Card */}
                    <motion.div
                        custom={8} variants={fadeIn} initial="hidden" animate="visible"
                        className="bg-gradient-to-br from-[#1a242f] to-[#0f171e] border border-[#00ace0]/20 rounded-xl p-6 flex flex-col justify-between relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-[#00ace0]/5 to-transparent rounded-bl-full pointer-events-none" />
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="material-symbols-outlined text-[#00ace0]" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>psychology</span>
                                <span className="text-xs font-extrabold text-[#00ace0] uppercase tracking-widest">AI Mentor</span>
                            </div>
                            <h3 className="text-xl font-bold text-white font-[Manrope] mb-2">Stuck on a concept?</h3>
                            <p className="text-sm text-slate-400 leading-relaxed mb-6">
                                Get Socratic guidance, concept breakdowns, and personalized hints from your AI-powered mentor.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 relative">
                            <button onClick={() => router.push('/mentor')} className="px-5 py-2.5 rounded-lg bg-[#00ace0] text-[#0f171e] font-bold text-sm hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,172,224,0.15)]">
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
                                    Ask Mentor
                                </span>
                            </button>
                        </div>
                    </motion.div>
                </div>

            </div>
        </AppLayout>
    );
}

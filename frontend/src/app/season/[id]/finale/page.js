"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { getConstellation, getDashboard, getLearnerId, getLearnerName } from '@/lib/api';

// ─── Animated counter ────────────────────────────────────────────────────────
function AnimatedNumber({ value, duration = 1.5, delay = 0 }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const timeout = setTimeout(() => {
            let start = 0;
            const step = value / (duration * 60);
            const interval = setInterval(() => {
                start += step;
                if (start >= value) { setDisplay(value); clearInterval(interval); }
                else setDisplay(Math.round(start));
            }, 1000 / 60);
            return () => clearInterval(interval);
        }, delay * 1000);
        return () => clearTimeout(timeout);
    }, [value, duration, delay]);
    return <>{display}</>;
}

// ─── Confetti particle ──────────────────────────────────────────────────────
function Confetti() {
    const colors = ['#C17C64', '#8FA395', '#D4A574', '#F5EDE4', '#6B5E52', '#e8b4b8', '#a8d5ba'];
    const particles = Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 3,
        size: 4 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        shape: Math.random() > 0.5 ? 'circle' : 'rect',
    }));

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {particles.map(p => (
                <motion.div
                    key={p.id}
                    initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
                    animate={{ y: '110vh', opacity: [1, 1, 0], rotate: p.rotation + 720 }}
                    transition={{ duration: p.duration, delay: p.delay, ease: 'linear' }}
                    style={{
                        position: 'absolute',
                        width: p.size,
                        height: p.shape === 'circle' ? p.size : p.size * 0.4,
                        borderRadius: p.shape === 'circle' ? '50%' : 2,
                        backgroundColor: p.color,
                    }}
                />
            ))}
        </div>
    );
}

// ─── Radial progress ring ───────────────────────────────────────────────────
function ProgressRing({ value, size = 160, strokeWidth = 10, color = '#8FA395', label, delay = 0 }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={center} cy={center} r={radius} fill="none" stroke="#E2D8CC" strokeWidth={strokeWidth} />
                <motion.circle
                    cx={center} cy={center} r={radius} fill="none" stroke={color}
                    strokeWidth={strokeWidth} strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference - (value / 100) * circumference }}
                    transition={{ duration: 1.8, ease: 'easeOut', delay }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-[#2A2018] font-[Manrope]">
                    <AnimatedNumber value={value} delay={delay} />%
                </span>
                {label && <span className="text-[9px] uppercase tracking-[0.15em] text-[#9A8E82] font-bold mt-1">{label}</span>}
            </div>
        </div>
    );
}

// ─── Badge card ─────────────────────────────────────────────────────────────
function BadgeCard({ icon, title, subtitle, color, delay }) {
    return (
        <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay }}
            whileHover={{ scale: 1.05, y: -4 }}
            className="bg-white rounded-2xl border border-[#D8CCBE] p-5 flex flex-col items-center gap-3 text-center"
        >
            <div className="size-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                <span className="material-symbols-outlined" style={{ fontSize: 28, color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            </div>
            <div>
                <h4 className="text-sm font-bold text-[#2A2018]">{title}</h4>
                <p className="text-[10px] text-[#9A8E82] mt-0.5">{subtitle}</p>
            </div>
        </motion.div>
    );
}

// ─── Fake leaderboard data ──────────────────────────────────────────────────
function generateLeaderboard(learnerName, xp) {
    const names = [
        'Arjun S.', 'Priya M.', 'Rahul K.', 'Sneha T.', 'Vikram J.',
        'Ananya R.', 'Karthik N.', 'Divya P.', 'Rohan D.', 'Meera L.',
    ];
    const board = names.map((name, i) => ({
        rank: i + 1,
        name,
        xp: Math.max(100, Math.round(xp * (1.3 - i * 0.08) + (Math.random() - 0.5) * 200)),
        isYou: false,
    }));
    // Insert learner at a competitive position
    const yourRank = Math.floor(Math.random() * 3) + 2; // rank 2-4
    board.splice(yourRank - 1, 0, {
        rank: yourRank,
        name: learnerName || 'You',
        xp: xp || 500,
        isYou: true,
    });
    // Re-sort by xp and re-rank
    board.sort((a, b) => b.xp - a.xp);
    board.forEach((entry, i) => { entry.rank = i + 1; });
    return board.slice(0, 8);
}

// ─── Recommendation card ────────────────────────────────────────────────────
function RecommendationCard({ title, description, icon, color, onClick, delay }) {
    return (
        <motion.button
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            whileHover={{ y: -4, scale: 1.02 }}
            onClick={onClick}
            className="w-full text-left bg-white rounded-xl border border-[#D8CCBE] p-5 hover:border-[#C17C64]/40 transition-all group"
        >
            <div className="flex items-start gap-4">
                <div className="size-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}12` }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22, color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-[#2A2018] group-hover:text-[#C17C64] transition-colors">{title}</h4>
                    <p className="text-xs text-[#9A8E82] mt-1 leading-relaxed">{description}</p>
                </div>
                <span className="material-symbols-outlined text-[#D8CCBE] group-hover:text-[#C17C64] transition-colors mt-1" style={{ fontSize: 18 }}>arrow_forward</span>
            </div>
        </motion.button>
    );
}

// ─── Main Finale Page ───────────────────────────────────────────────────────
function SeasonFinale() {
    const { id: seasonId } = useParams();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [showConfetti, setShowConfetti] = useState(false);
    const [season, setSeason] = useState(null);
    const [episodes, setEpisodes] = useState([]);
    const [stats, setStats] = useState({ xp: 0, streak: 0, level: 1, mastered: 0 });
    const [learnerName, setLearnerName] = useState('');
    const [leaderboard, setLeaderboard] = useState([]);
    const [activeSection, setActiveSection] = useState('overview'); // overview | episodes | leaderboard | next
    const [nextConcepts, setNextConcepts] = useState([]);

    useEffect(() => {
        const learnerId = getLearnerId();
        if (!learnerId) { router.push('/onboarding'); return; }
        setLearnerName(getLearnerName());

        (async () => {
            const [constRes, dashRes] = await Promise.all([
                getConstellation(learnerId),
                getDashboard(learnerId),
            ]);

            if (constRes.data?.nodes) {
                const nodes = constRes.data.nodes;
                const edges = constRes.data.edges || constRes.data.links || [];

                const seasonNode = nodes.find(n => n.id === seasonId || n.concept_id === seasonId);

                if (seasonNode) {
                    setSeason({
                        id: seasonNode.id || seasonNode.concept_id,
                        title: seasonNode.label || seasonNode.name || 'Season',
                        description: seasonNode.description || '',
                    });

                    // Get episode nodes
                    const group = seasonNode.group || seasonNode.cluster;
                    const childIds = edges.filter(e => e.source === (seasonNode.id || seasonNode.concept_id)).map(e => e.target);
                    let episodeNodes = childIds.length > 0
                        ? nodes.filter(n => childIds.includes(n.id || n.concept_id))
                        : group != null
                            ? nodes.filter(n => (n.group === group || n.cluster === group) && (n.id || n.concept_id) !== (seasonNode.id || seasonNode.concept_id))
                            : [seasonNode];

                    const mapped = episodeNodes.map((node, idx) => ({
                        id: node.id || node.concept_id,
                        title: node.label || node.name || `Episode ${idx + 1}`,
                        mastery: Math.round((node.mastery ?? node.p_known ?? 0) * 100),
                        format: node.format || ['Visual Story', 'Code Lab', 'Concept X-Ray', 'Quick Byte'][idx % 4],
                    }));
                    setEpisodes(mapped);

                    // Find next unlocked concepts for recommendations
                    const allIds = new Set(episodeNodes.map(n => n.id || n.concept_id));
                    allIds.add(seasonNode.id || seasonNode.concept_id);
                    const next = nodes
                        .filter(n => !allIds.has(n.id || n.concept_id) && (n.mastery ?? 0) < 0.8)
                        .slice(0, 3)
                        .map(n => ({ id: n.id || n.concept_id, label: n.label || n.name || n.concept_id, mastery: Math.round((n.mastery ?? 0) * 100) }));
                    setNextConcepts(next);
                }
            }

            if (dashRes.data) {
                const d = dashRes.data;
                const xp = d.stats?.xp ?? d.profile?.xp ?? 500;
                setStats({
                    xp,
                    streak: d.stats?.streak ?? d.profile?.streak ?? 0,
                    level: d.stats?.level ?? d.profile?.level ?? 1,
                    mastered: d.stats?.total_mastered ?? d.mastery?.total_mastered ?? 0,
                });
                setLeaderboard(generateLeaderboard(getLearnerName(), xp));
            }

            setLoading(false);
            // Trigger confetti after a brief delay
            setTimeout(() => setShowConfetti(true), 600);
        })();
    }, [seasonId, router]);

    const avgMastery = episodes.length > 0 ? Math.round(episodes.reduce((s, e) => s + e.mastery, 0) / episodes.length) : 0;
    const perfectCount = episodes.filter(e => e.mastery >= 90).length;
    const totalXpEarned = episodes.length * 50 + perfectCount * 25; // estimated

    // Generate badges
    const badges = [
        { icon: 'school', title: 'Season Complete', subtitle: `Finished ${episodes.length} episodes`, color: '#8FA395' },
        ...(avgMastery >= 85 ? [{ icon: 'workspace_premium', title: 'High Achiever', subtitle: `${avgMastery}% average mastery`, color: '#D4A574' }] : []),
        ...(perfectCount >= 3 ? [{ icon: 'diamond', title: 'Perfectionist', subtitle: `${perfectCount} episodes at 90%+`, color: '#C17C64' }] : []),
        ...(stats.streak >= 3 ? [{ icon: 'local_fire_department', title: 'On Fire', subtitle: `${stats.streak} day streak`, color: '#C17C64' }] : []),
        { icon: 'emoji_events', title: `Level ${stats.level}`, subtitle: `${stats.xp} XP total`, color: '#6B5E52' },
        ...(episodes.length >= 5 ? [{ icon: 'military_tech', title: 'Dedicated Learner', subtitle: '5+ episodes completed', color: '#8FA395' }] : []),
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F5EDE4] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-12 border-2 border-[#C17C64] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[#6B5E52] text-sm">Preparing your season recap...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5EDE4] overflow-x-hidden">
            {showConfetti && <Confetti />}

            {/* ═══════════════════════════════════════════════════════════════════
                HERO CELEBRATION
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="relative overflow-hidden">
                {/* Animated gradient bg */}
                <motion.div
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#2A2018] via-[#3D3228] to-[#1a1410]" />
                    {/* Animated glow orbs */}
                    <motion.div
                        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(193,124,100,0.15) 0%, transparent 70%)' }}
                        animate={{ x: [0, 30, -20, 0], y: [0, -20, 20, 0], scale: [1, 1.1, 0.95, 1] }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(143,163,149,0.12) 0%, transparent 70%)' }}
                        animate={{ x: [0, -25, 15, 0], y: [0, 15, -25, 0], scale: [1, 0.95, 1.1, 1] }}
                        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </motion.div>

                <div className="relative max-w-4xl mx-auto px-6 py-16 text-center">
                    {/* Trophy animation */}
                    <motion.div
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 150, delay: 0.3 }}
                        className="mb-6"
                    >
                        <div className="size-24 rounded-full bg-gradient-to-br from-[#D4A574] to-[#C17C64] flex items-center justify-center mx-auto shadow-[0_0_60px_rgba(212,165,116,0.3)]">
                            <motion.span
                                className="material-symbols-outlined text-white"
                                style={{ fontSize: 48, fontVariationSettings: "'FILL' 1" }}
                                animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                                transition={{ duration: 1, delay: 0.8 }}
                            >
                                emoji_events
                            </motion.span>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                        <p className="text-[#D4A574] text-sm font-bold uppercase tracking-[0.3em] mb-3">Season Complete</p>
                        <h1 className="text-3xl lg:text-5xl font-extrabold text-white font-[Manrope] mb-4 leading-tight">
                            {season?.title || 'Season'}
                        </h1>
                        <p className="text-[#9A8E82] text-base max-w-lg mx-auto leading-relaxed">
                            Congratulations, <span className="text-[#D4A574] font-semibold">{learnerName.split(' ')[0] || 'Learner'}</span>!
                            You've completed all {episodes.length} episodes. Here's your journey recap.
                        </p>
                    </motion.div>

                    {/* Quick stats row */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="flex flex-wrap justify-center gap-6 mt-10"
                    >
                        {[
                            { value: episodes.length, label: 'Episodes', icon: 'play_circle' },
                            { value: avgMastery, label: 'Avg Mastery', icon: 'trending_up', suffix: '%' },
                            { value: totalXpEarned, label: 'XP Earned', icon: 'star' },
                            { value: stats.streak, label: 'Day Streak', icon: 'local_fire_department' },
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', delay: 0.8 + i * 0.1 }}
                                className="flex flex-col items-center"
                            >
                                <div className="size-12 rounded-xl bg-white/5 flex items-center justify-center mb-2">
                                    <span className="material-symbols-outlined text-[#D4A574]" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
                                </div>
                                <span className="text-2xl font-extrabold text-white font-[Manrope]">
                                    <AnimatedNumber value={stat.value} delay={0.8 + i * 0.1} />{stat.suffix || ''}
                                </span>
                                <span className="text-[9px] uppercase tracking-[0.15em] text-[#9A8E82] font-bold mt-0.5">{stat.label}</span>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION TABS
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="sticky top-0 z-30 bg-[#F5EDE4]/95 backdrop-blur-sm border-b border-[#D8CCBE]">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="flex gap-1 overflow-x-auto hide-scrollbar">
                        {[
                            { id: 'overview', label: 'Overview', icon: 'dashboard' },
                            { id: 'episodes', label: 'Episode Breakdown', icon: 'list' },
                            { id: 'leaderboard', label: 'Leaderboard', icon: 'leaderboard' },
                            { id: 'next', label: 'What\'s Next', icon: 'rocket_launch' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSection(tab.id)}
                                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-all relative whitespace-nowrap ${
                                    activeSection === tab.id ? 'text-[#2A2018]' : 'text-[#9A8E82] hover:text-[#3D3228]'
                                }`}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 18, color: activeSection === tab.id ? '#C17C64' : undefined }}>{tab.icon}</span>
                                {tab.label}
                                {activeSection === tab.id && (
                                    <motion.div layoutId="finale-tab" className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#C17C64]" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                TAB CONTENT
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="max-w-4xl mx-auto px-6 py-8">
                <AnimatePresence mode="wait">

                    {/* ── OVERVIEW TAB ── */}
                    {activeSection === 'overview' && (
                        <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                            {/* Mastery ring + stats */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                                <div className="lg:col-span-1 bg-white rounded-2xl border border-[#D8CCBE] p-6 flex flex-col items-center justify-center">
                                    <ProgressRing value={avgMastery} color={avgMastery >= 80 ? '#8FA395' : '#C17C64'} label="Avg Mastery" delay={0.2} />
                                    <p className="text-xs text-[#9A8E82] mt-3 text-center">
                                        {avgMastery >= 90 ? 'Outstanding performance!' : avgMastery >= 70 ? 'Great work, keep it up!' : 'Good start, room to grow!'}
                                    </p>
                                </div>
                                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                                    {[
                                        { icon: 'school', label: 'Concepts Mastered', value: stats.mastered, color: '#8FA395' },
                                        { icon: 'star', label: 'Total XP', value: stats.xp, color: '#D4A574' },
                                        { icon: 'diamond', label: 'Perfect Scores', value: perfectCount, color: '#C17C64' },
                                        { icon: 'military_tech', label: 'Current Level', value: stats.level, color: '#6B5E52' },
                                    ].map((s, i) => (
                                        <motion.div
                                            key={s.label}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 + i * 0.1 }}
                                            className="bg-white rounded-xl border border-[#D8CCBE] p-4 flex items-center gap-3"
                                        >
                                            <div className="size-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}12` }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: 20, color: s.color, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                                            </div>
                                            <div>
                                                <p className="text-xl font-bold text-[#2A2018]"><AnimatedNumber value={s.value} delay={0.4 + i * 0.1} /></p>
                                                <p className="text-[9px] uppercase tracking-wider text-[#9A8E82] font-bold">{s.label}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Badges */}
                            <div className="mb-8">
                                <h3 className="text-lg font-bold text-[#2A2018] mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#D4A574]" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                                    Badges Earned
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                    {badges.map((badge, i) => (
                                        <BadgeCard key={badge.title} {...badge} delay={0.5 + i * 0.08} />
                                    ))}
                                </div>
                            </div>

                            {/* Mastery heatmap */}
                            <div className="bg-white rounded-2xl border border-[#D8CCBE] p-6">
                                <h3 className="text-sm font-bold text-[#2A2018] mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#6B5E52]" style={{ fontSize: 18 }}>grid_view</span>
                                    Mastery Heatmap
                                </h3>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                    {episodes.map((ep, i) => {
                                        const color = ep.mastery >= 90 ? '#8FA395' : ep.mastery >= 70 ? '#D4A574' : '#C17C64';
                                        return (
                                            <motion.div
                                                key={ep.id}
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 0.6 + i * 0.05 }}
                                                className="rounded-lg p-3 text-center"
                                                style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
                                            >
                                                <p className="text-lg font-bold" style={{ color }}>{ep.mastery}%</p>
                                                <p className="text-[9px] text-[#6B5E52] font-medium truncate mt-0.5">{ep.title}</p>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── EPISODES TAB ── */}
                    {activeSection === 'episodes' && (
                        <motion.div key="episodes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                            <div className="space-y-3">
                                {episodes.map((ep, i) => {
                                    const color = ep.mastery >= 90 ? '#8FA395' : ep.mastery >= 70 ? '#D4A574' : '#C17C64';
                                    const grade = ep.mastery >= 90 ? 'A+' : ep.mastery >= 80 ? 'A' : ep.mastery >= 70 ? 'B' : ep.mastery >= 60 ? 'C' : 'D';
                                    return (
                                        <motion.div
                                            key={ep.id}
                                            initial={{ opacity: 0, x: -30 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.06 }}
                                            whileHover={{ x: 4 }}
                                            className="bg-white rounded-xl border border-[#D8CCBE] p-5 flex items-center gap-4 cursor-pointer hover:border-[#C17C64]/30 transition-all"
                                            onClick={() => router.push(`/episode/${ep.id}?concept_id=${ep.id}`)}
                                        >
                                            <div className="size-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
                                                <span className="text-sm font-bold" style={{ color }}>{i + 1}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-semibold text-[#2A2018] truncate">{ep.title}</h4>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <div className="flex-1 h-1.5 bg-[#E2D8CC] rounded-full overflow-hidden max-w-[180px]">
                                                        <motion.div
                                                            className="h-full rounded-full"
                                                            style={{ backgroundColor: color }}
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${ep.mastery}%` }}
                                                            transition={{ duration: 0.8, delay: 0.2 + i * 0.06 }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold" style={{ color }}>{ep.mastery}%</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={{ backgroundColor: `${color}12`, color, border: `1px solid ${color}30` }}>
                                                    {ep.format}
                                                </span>
                                                <div className="size-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}10` }}>
                                                    <span className="text-lg font-extrabold font-[Manrope]" style={{ color }}>{grade}</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* ── LEADERBOARD TAB ── */}
                    {activeSection === 'leaderboard' && (
                        <motion.div key="leaderboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                            <div className="bg-white rounded-2xl border border-[#D8CCBE] overflow-hidden">
                                {/* Top 3 podium */}
                                <div className="bg-gradient-to-br from-[#2A2018] to-[#3D3228] px-6 py-8">
                                    <h3 className="text-center text-sm font-bold text-[#D4A574] uppercase tracking-[0.2em] mb-6">Season Leaderboard</h3>
                                    <div className="flex items-end justify-center gap-4">
                                        {[1, 0, 2].map((idx) => {
                                            const entry = leaderboard[idx];
                                            if (!entry) return null;
                                            const heights = ['h-28', 'h-20', 'h-16'];
                                            const podiumH = heights[entry.rank - 1] || 'h-14';
                                            const medals = ['#D4A574', '#9A8E82', '#C17C64'];
                                            const medalColor = medals[entry.rank - 1] || '#6B5E52';
                                            return (
                                                <motion.div
                                                    key={entry.rank}
                                                    initial={{ y: 40, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    transition={{ delay: 0.3 + idx * 0.15, type: 'spring' }}
                                                    className="flex flex-col items-center"
                                                >
                                                    <div className={`size-12 rounded-full flex items-center justify-center mb-2 ${entry.isYou ? 'ring-2 ring-[#D4A574] ring-offset-2 ring-offset-[#2A2018]' : ''}`}
                                                        style={{ backgroundColor: `${medalColor}25` }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: medalColor, fontVariationSettings: "'FILL' 1" }}>
                                                            {entry.rank === 1 ? 'emoji_events' : entry.rank === 2 ? 'military_tech' : 'star'}
                                                        </span>
                                                    </div>
                                                    <span className={`text-xs font-bold mb-1 ${entry.isYou ? 'text-[#D4A574]' : 'text-[#D8CCBE]'}`}>
                                                        {entry.isYou ? 'You' : entry.name}
                                                    </span>
                                                    <span className="text-[10px] text-[#9A8E82] mb-2">{entry.xp} XP</span>
                                                    <div className={`w-20 ${podiumH} rounded-t-lg flex items-start justify-center pt-2`} style={{ backgroundColor: `${medalColor}30` }}>
                                                        <span className="text-xl font-extrabold" style={{ color: medalColor }}>#{entry.rank}</span>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Full list */}
                                <div className="divide-y divide-[#E2D8CC]">
                                    {leaderboard.map((entry, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.5 + i * 0.05 }}
                                            className={`flex items-center gap-4 px-6 py-3.5 ${entry.isYou ? 'bg-[#C17C64]/5' : ''}`}
                                        >
                                            <span className={`w-6 text-center font-bold text-sm ${entry.rank <= 3 ? 'text-[#D4A574]' : 'text-[#9A8E82]'}`}>
                                                {entry.rank}
                                            </span>
                                            <div className={`size-8 rounded-full flex items-center justify-center ${entry.isYou ? 'bg-[#C17C64]/15' : 'bg-[#E2D8CC]'}`}>
                                                <span className="material-symbols-outlined" style={{ fontSize: 16, color: entry.isYou ? '#C17C64' : '#9A8E82' }}>person</span>
                                            </div>
                                            <span className={`flex-1 text-sm font-medium ${entry.isYou ? 'text-[#C17C64] font-bold' : 'text-[#2A2018]'}`}>
                                                {entry.isYou ? `${entry.name} (You)` : entry.name}
                                            </span>
                                            <span className="text-sm font-bold text-[#6B5E52]">{entry.xp} XP</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── WHAT'S NEXT TAB ── */}
                    {activeSection === 'next' && (
                        <motion.div key="next" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-[#2A2018] mb-2">Recommended Next Steps</h3>
                                <p className="text-sm text-[#6B5E52]">Based on your performance, here's what we suggest next.</p>
                            </div>

                            <div className="space-y-3 mb-8">
                                {avgMastery < 85 && (
                                    <RecommendationCard
                                        title="Review Weak Spots"
                                        description={`Your average mastery is ${avgMastery}%. Revisit episodes where you scored below 80% to strengthen your foundation.`}
                                        icon="refresh"
                                        color="#C17C64"
                                        onClick={() => router.push(`/bridge-sprint?concept_id=${seasonId}`)}
                                        delay={0.1}
                                    />
                                )}
                                <RecommendationCard
                                    title="Practice with AI Mentor"
                                    description="Get Socratic-style guidance to deepen your understanding of the concepts you've learned."
                                    icon="psychology"
                                    color="#D4A574"
                                    onClick={() => router.push('/mentor')}
                                    delay={0.2}
                                />
                                {nextConcepts.length > 0 && (
                                    <RecommendationCard
                                        title={`Start Next: ${nextConcepts[0]?.label}`}
                                        description={`Continue your learning journey with the next concept in your constellation. Current mastery: ${nextConcepts[0]?.mastery}%`}
                                        icon="rocket_launch"
                                        color="#8FA395"
                                        onClick={() => router.push(`/season/${nextConcepts[0]?.id}`)}
                                        delay={0.3}
                                    />
                                )}
                                <RecommendationCard
                                    title="Spaced Repetition Review"
                                    description="Use Leitner box flashcards to make sure you retain what you've learned over time."
                                    icon="style"
                                    color="#6B5E52"
                                    onClick={() => router.push('/dashboard')}
                                    delay={0.4}
                                />
                            </div>

                            {/* Next concepts preview */}
                            {nextConcepts.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-[#2A2018] mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[#8FA395]" style={{ fontSize: 18 }}>explore</span>
                                        Upcoming Concepts
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {nextConcepts.map((concept, i) => (
                                            <motion.button
                                                key={concept.id}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.5 + i * 0.1 }}
                                                whileHover={{ y: -3, scale: 1.02 }}
                                                onClick={() => router.push(`/season/${concept.id}`)}
                                                className="bg-white rounded-xl border border-[#D8CCBE] p-4 text-left hover:border-[#8FA395]/40 transition-all group"
                                            >
                                                <div className="size-10 rounded-lg bg-[#8FA395]/10 flex items-center justify-center mb-3">
                                                    <span className="material-symbols-outlined text-[#8FA395]" style={{ fontSize: 20 }}>play_circle</span>
                                                </div>
                                                <h4 className="text-sm font-semibold text-[#2A2018] group-hover:text-[#8FA395] transition-colors truncate">{concept.label}</h4>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <div className="flex-1 h-1 bg-[#E2D8CC] rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full bg-[#8FA395]" style={{ width: `${concept.mastery}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-[#9A8E82]">{concept.mastery}%</span>
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                BOTTOM ACTION BAR
            ═══════════════════════════════════════════════════════════════════ */}
            <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="sticky bottom-0 z-20 bg-white/90 backdrop-blur-sm border-t border-[#D8CCBE] py-4 px-6"
            >
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                    <button
                        onClick={() => router.push('/home')}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl border border-[#D8CCBE] text-[#6B5E52] font-semibold text-sm hover:bg-[#F5EDE4] transition-all"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>home</span>
                        Back to Home
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-[#D8CCBE] text-[#6B5E52] font-semibold text-sm hover:bg-[#F5EDE4] transition-all"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>analytics</span>
                            Dashboard
                        </button>
                        {nextConcepts.length > 0 && (
                            <button
                                onClick={() => router.push(`/season/${nextConcepts[0]?.id}`)}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C17C64] text-white font-bold text-sm hover:brightness-110 transition-all shadow-[0_0_20px_rgba(193,124,100,0.2)]"
                            >
                                Next Season
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default function SeasonFinalePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#F5EDE4] flex items-center justify-center">
                <div className="size-10 border-2 border-[#C17C64] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <SeasonFinale />
        </Suspense>
    );
}

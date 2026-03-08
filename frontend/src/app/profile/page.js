"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboard, getLearnerId, getLearnerName } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';

// Empty defaults — all data comes from API
const FALLBACK_PROFILE = { name: 'Learner', level: 1, xp: 0 };
const FALLBACK_SUBMISSIONS = [];
const FALLBACK_SKILLS = [];
const FALLBACK_CERTS = [];

const LEVEL_COLORS = {
    ADVANCED: { bg: 'bg-[#00d26a]/10', border: 'border-[#00d26a]/30', text: 'text-[#00d26a]' },
    INTERMEDIATE: { bg: 'bg-[#00ace0]/10', border: 'border-[#00ace0]/30', text: 'text-[#00ace0]' },
    BEGINNER: { bg: 'bg-[#f0c14b]/10', border: 'border-[#f0c14b]/30', text: 'text-[#f0c14b]' },
};

// ─── Fade-in variant ────────────────────────────────────────────────────────────
const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' },
    }),
};

// ─── Profile Content ────────────────────────────────────────────────────────────

function ProfileContent() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [learnerName, setLName] = useState('Learner');

    useEffect(() => {
        const learnerId = getLearnerId();
        if (!learnerId) { router.push('/onboarding'); return; }
        setLName(getLearnerName());

        async function load() {
            const { data, error: err } = await getDashboard(learnerId);
            if (err) { setError(err); } else { setDashboard(data); }
            setLoading(false);
        }
        load();
    }, [router]);

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="w-12 h-12 border-2 border-[#00ace0] border-t-transparent rounded-full animate-spin" />
                </div>
            </AppLayout>
        );
    }

    if (error) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <span className="material-symbols-outlined text-red-400" style={{ fontSize: 48 }}>error</span>
                    <p className="text-red-400">{error}</p>
                    <button
                        onClick={() => router.push('/home')}
                        className="px-5 py-2.5 rounded-lg bg-[#1a242f] border border-[#2a3642] text-white text-sm"
                    >
                        Back to Home
                    </button>
                </div>
            </AppLayout>
        );
    }

    // Extract with fallbacks
    const stats = dashboard?.stats || dashboard || {};
    const xp = stats.total_xp ?? stats.xp ?? FALLBACK_PROFILE.xp;
    const level = stats.level ?? Math.floor(xp / 500) + 1;
    const submissions = dashboard?.season_finales || dashboard?.projects || dashboard?.submissions || FALLBACK_SUBMISSIONS;
    const skills = dashboard?.skills || dashboard?.skill_summary || FALLBACK_SKILLS;
    const certs = dashboard?.badges || dashboard?.certifications || FALLBACK_CERTS;

    return (
        <AppLayout>
            <div className="min-h-full px-4 lg:px-8 py-6 space-y-8">

                {/* ═══ Profile Header ═══ */}
                <motion.div
                    custom={0} variants={fadeIn} initial="hidden" animate="visible"
                    className="bg-[#1a242f] border border-[#2a3642] rounded-xl p-6"
                >
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-br from-[#00ace0] via-[#f0c14b] to-[#00ace0]">
                                <div className="w-full h-full rounded-full bg-[#0f171e] flex items-center justify-center">
                                    <span className="text-3xl font-extrabold text-white">
                                        {learnerName.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Name + level */}
                        <div className="text-center sm:text-left flex-1">
                            <div className="flex items-center gap-3 justify-center sm:justify-start">
                                <h1 className="text-2xl lg:text-3xl font-bold text-white font-[Manrope]">{learnerName}</h1>
                                <span className="bg-[#00ace0]/15 text-[#00ace0] text-xs font-bold px-3 py-1 rounded-full border border-[#00ace0]/30">
                                    Level {level}
                                </span>
                            </div>
                            <p className="text-slate-400 mt-1 flex items-center gap-2 justify-center sm:justify-start">
                                <span className="material-symbols-outlined text-[#f0c14b]" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>bolt</span>
                                {xp.toLocaleString()} XP earned
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2a3642] text-slate-400 text-sm hover:text-white hover:border-[#00ace0]/40 transition-colors">
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>settings</span>
                                Settings
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* ═══ Season Finale Submissions ═══ */}
                <motion.div custom={1} variants={fadeIn} initial="hidden" animate="visible">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#f0c14b]" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>movie</span>
                            Season Finale Submissions
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {submissions.map((project, i) => (
                            <motion.div
                                key={project.id || i}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 + i * 0.08 }}
                                className="bg-[#1a242f] border border-[#2a3642] rounded-xl overflow-hidden hover:border-[#00ace0]/30 transition-colors group"
                            >
                                {/* Poster area */}
                                <div className="aspect-video bg-gradient-to-br from-[#1a242f] to-[#050d17] relative flex items-center justify-center">
                                    {project.image_url ? (
                                        <img src={project.image_url} alt={project.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-symbols-outlined text-slate-600" style={{ fontSize: 40 }}>movie</span>
                                    )}
                                    {/* Score badge */}
                                    {project.score != null && (
                                        <div className="absolute top-3 right-3 bg-[#f0c14b] text-[#0f171e] text-xs font-extrabold px-2.5 py-1 rounded-lg shadow-lg">
                                            {project.score}/100
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h4 className="text-white font-semibold text-sm truncate">{project.title || 'Season Finale'}</h4>
                                    <p className="text-slate-500 text-xs mt-1 line-clamp-2">{project.description || 'Capstone project submission'}</p>
                                    <div className="flex items-center justify-between mt-3">
                                        {project.submitted_at && (
                                            <p className="text-[11px] text-slate-600">
                                                {new Date(project.submitted_at).toLocaleDateString()}
                                            </p>
                                        )}
                                        <button className="text-xs font-semibold text-[#00ace0] hover:underline">
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* ═══ Skill Summary ═══ */}
                <motion.div
                    custom={2} variants={fadeIn} initial="hidden" animate="visible"
                    className="bg-[#1a242f] border border-[#2a3642] rounded-xl p-6"
                >
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#00ace0]" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>analytics</span>
                            Skill Summary
                        </h2>
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f0c14b] text-[#0f171e] font-bold text-sm hover:brightness-110 transition-all shadow-[0_0_20px_rgba(240,193,75,0.15)]">
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
                            Export Resume
                        </button>
                    </div>
                    <div className="space-y-4">
                        {skills.map((skill, idx) => {
                            const pct = Math.round((skill.progress ?? skill.mastery ?? skill.score ?? skill.value ?? 0) * 100);
                            const levelKey = skill.level || (pct >= 75 ? 'ADVANCED' : pct >= 50 ? 'INTERMEDIATE' : 'BEGINNER');
                            const levelStyle = LEVEL_COLORS[levelKey] || LEVEL_COLORS.BEGINNER;
                            const barColor = levelKey === 'ADVANCED' ? '#00d26a' : levelKey === 'INTERMEDIATE' ? '#00ace0' : '#f0c14b';

                            return (
                                <motion.div
                                    key={skill.name || skill.domain || idx}
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + idx * 0.08 }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-white font-medium">{skill.name || skill.domain || `Skill ${idx + 1}`}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${levelStyle.bg} ${levelStyle.border} ${levelStyle.text}`}>
                                                {levelKey}
                                            </span>
                                        </div>
                                        <span className="text-xs font-bold" style={{ color: barColor }}>{pct}%</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-[#2a3642] rounded-full overflow-hidden">
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
                </motion.div>

                {/* ═══ Certifications ═══ */}
                <motion.div
                    custom={3} variants={fadeIn} initial="hidden" animate="visible"
                    className="bg-[#1a242f] border border-[#2a3642] rounded-xl p-6"
                >
                    <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-5">
                        <span className="material-symbols-outlined text-[#f0c14b]" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                        Certifications
                    </h2>
                    <div className="flex flex-wrap gap-4">
                        {certs.map((cert, idx) => (
                            <motion.div
                                key={cert.id || idx}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.4 + idx * 0.06, type: 'spring', damping: 15 }}
                                className="flex items-center gap-3 bg-[#0f171e] border border-[#2a3642] rounded-xl px-4 py-3 hover:border-[#f0c14b]/30 transition-colors"
                            >
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: `${cert.color || '#f0c14b'}15` }}
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: 22, color: cert.color || '#f0c14b', fontVariationSettings: "'FILL' 1" }}
                                    >
                                        {cert.icon || 'emoji_events'}
                                    </span>
                                </div>
                                <span className="text-sm text-white font-semibold">{cert.name || 'Certificate'}</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* ═══ Learning Hub Link ═══ */}
                <motion.div
                    custom={4} variants={fadeIn} initial="hidden" animate="visible"
                    className="flex justify-center pb-4"
                >
                    <button
                        onClick={() => router.push('/home')}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[#2a3642] text-slate-400 hover:text-white hover:border-[#00ace0]/40 transition-colors text-sm"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>school</span>
                        Go to Learning Hub
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                    </button>
                </motion.div>

            </div>
        </AppLayout>
    );
}

// ─── Export ────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-[#0f171e]">
                <div className="w-10 h-10 border-2 border-[#00ace0] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <ProfileContent />
        </Suspense>
    );
}

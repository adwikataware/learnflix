"use client";

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getConstellation, getLearnerId } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Format Badge ──────────────────────────────────────────────────────────────

function FormatBadge({ format }) {
    const formatConfig = {
        'Visual Story': { icon: 'auto_stories', color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
        'Code Lab': { icon: 'terminal', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
        'Concept X-Ray': { icon: 'layers', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
        'Case Study': { icon: 'case_study', color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
        'Quick Byte': { icon: 'bolt', color: 'text-pink-400 bg-pink-400/10 border-pink-400/30' },
    };
    const cfg = formatConfig[format] || formatConfig['Visual Story'];

    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.color}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{cfg.icon}</span>
            {format}
        </span>
    );
}

// ─── Thumbnail icon helper ──────────────────────────────────────────────────────

function getThumbnailIcon(format) {
    const iconMap = {
        'Code Lab': 'terminal',
        'Visual Story': 'auto_stories',
        'Concept X-Ray': 'layers',
        'Quick Byte': 'bolt',
        'Case Study': 'case_study',
    };
    return iconMap[format] || 'play_circle';
}

// ─── Episode Row Card ───────────────────────────────────────────────────────────

function EpisodeRow({ episode, index, isActive, onClick }) {
    const status = episode.status || 'locked';

    const statusButton = () => {
        if (status === 'completed') {
            return (
                <button
                    onClick={(e) => { e.stopPropagation(); onClick(episode); }}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#8FA395]/10 border border-[#8FA395]/30 text-[#8FA395] hover:bg-[#8FA395]/20 transition-colors"
                >
                    Review
                </button>
            );
        }
        if (status === 'active') {
            return (
                <button
                    onClick={(e) => { e.stopPropagation(); onClick(episode); }}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                        episode.progress > 0
                            ? 'bg-[#C17C64] text-white hover:brightness-110 shadow-[0_0_20px_rgba(193,124,100,0.2)]'
                            : 'bg-[#D4A574] text-white hover:brightness-110 shadow-[0_0_20px_rgba(212,165,116,0.2)]'
                    }`}
                >
                    {episode.progress > 0 ? 'Resume' : 'Start'}
                </button>
            );
        }
        return (
            <div className="flex items-center gap-2 text-[#9A8E82]">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>lock</span>
            </div>
        );
    };

    const progressPct = Math.round((episode.progress || 0) * 100);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.06, duration: 0.4 }}
            className={`relative rounded-xl border transition-all duration-300 cursor-pointer ${
                isActive
                    ? 'bg-white border-[#C17C64]/40 shadow-[0_0_30px_rgba(193,124,100,0.08)]'
                    : status === 'locked'
                        ? 'bg-white/60 border-[#D8CCBE] opacity-60'
                        : 'bg-white border-[#D8CCBE] hover:border-[#C17C64]/20'
            }`}
            onClick={() => status !== 'locked' && onClick(episode)}
        >
            <div className="flex items-center gap-4 p-5">
                {/* Episode number circle */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                    status === 'completed' ? 'bg-[#8FA395]/15 text-[#8FA395]' :
                    status === 'active' ? 'bg-[#C17C64]/15 text-[#C17C64]' :
                    'bg-[#E2D8CC] text-[#9A8E82]'
                }`}>
                    {status === 'completed' ? (
                        <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    ) : status === 'locked' ? (
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>lock</span>
                    ) : (
                        <span className="text-lg">{index + 1}</span>
                    )}
                </div>

                {/* Thumbnail placeholder */}
                <div className={`w-20 h-14 rounded-lg flex-shrink-0 hidden sm:flex items-center justify-center ${
                    status === 'completed' ? 'bg-gradient-to-br from-[#8FA395]/20 to-[#8FA395]/5 border border-[#8FA395]/20' :
                    status === 'active' ? 'bg-gradient-to-br from-[#C17C64]/15 to-[#D4A574]/10 border border-[#C17C64]/20' :
                    'bg-[#F0E7DC] border border-[#E2D8CC]'
                }`}>
                    {status === 'completed' ? (
                        <span className="material-symbols-outlined text-[#8FA395]/40" style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    ) : status === 'active' ? (
                        <span className="material-symbols-outlined text-[#C17C64]/40" style={{ fontSize: 28 }}>{getThumbnailIcon(episode.format)}</span>
                    ) : (
                        <span className="material-symbols-outlined text-[#9A8E82]/40" style={{ fontSize: 28 }}>lock</span>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[11px] text-[#9A8E82] font-semibold uppercase tracking-wider">
                            Episode {index + 1}
                        </span>
                        {episode.format && <FormatBadge format={episode.format} />}
                    </div>
                    <h3 className={`font-semibold truncate ${status === 'locked' ? 'text-[#9A8E82]' : 'text-[#2A2018]'}`}>
                        {episode.title || episode.concept_id || `Episode ${index + 1}`}
                    </h3>
                    {episode.description && (
                        <p className="text-sm text-[#6B5E52] mt-1 line-clamp-1">{episode.description}</p>
                    )}
                    {/* Progress bar for in-progress episodes */}
                    {status === 'active' && episode.progress > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1.5 bg-[#E2D8CC] rounded-full overflow-hidden max-w-[200px]">
                                <motion.div
                                    className="h-full rounded-full bg-[#C17C64]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPct}%` }}
                                    transition={{ duration: 0.8, delay: 0.3 }}
                                />
                            </div>
                            <span className="text-[11px] font-bold text-[#C17C64]">{progressPct}%</span>
                        </div>
                    )}
                </div>

                {/* Action button */}
                <div className="flex-shrink-0">
                    {statusButton()}
                </div>
            </div>
        </motion.div>
    );
}

// ─── Season Detail Page ────────────────────────────────────────────────────────

function SeasonDetail() {
    const { id: seasonId } = useParams();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [season, setSeason] = useState(null);
    const [episodes, setEpisodes] = useState([]);
    const [missingPrereqs, setMissingPrereqs] = useState([]);

    useEffect(() => {
        const learnerId = getLearnerId();
        if (!learnerId) { router.push('/onboarding'); return; }

        async function loadSeason() {
            try {
                const { data, error: err } = await getConstellation(learnerId);
                if (err) { setError(err); setLoading(false); return; }

                const nodes = data?.nodes || data?.concepts || [];
                const edges = data?.edges || data?.prerequisites || [];

                const seasonNode = nodes.find(n =>
                    n.id === seasonId || n.concept_id === seasonId || n.slug === seasonId
                );

                if (!seasonNode) { setError('Season not found'); setLoading(false); return; }

                setSeason({
                    id: seasonNode.id || seasonNode.concept_id,
                    title: seasonNode.label || seasonNode.name || seasonNode.concept_id || 'Season',
                    description: seasonNode.description || seasonNode.summary || `Master the fundamentals of ${seasonNode.label || seasonNode.name || 'this topic'}.`,
                    image: seasonNode.image_url || null,
                });

                const group = seasonNode.group || seasonNode.cluster;
                let episodeNodes = [];

                const childIds = edges
                    .filter(e => e.source === (seasonNode.id || seasonNode.concept_id))
                    .map(e => e.target);

                if (childIds.length > 0) {
                    episodeNodes = nodes.filter(n => childIds.includes(n.id || n.concept_id));
                } else if (group != null) {
                    episodeNodes = nodes.filter(n =>
                        (n.group === group || n.cluster === group) &&
                        (n.id || n.concept_id) !== (seasonNode.id || seasonNode.concept_id)
                    );
                }

                if (episodeNodes.length === 0) {
                    episodeNodes = [seasonNode];
                }

                const mapped = episodeNodes.map((node, idx) => {
                    const mastery = node.mastery ?? node.p_know ?? 0;
                    let status = 'locked';
                    if (mastery >= 0.8) {
                        status = 'completed';
                    } else if (idx === 0 || (idx > 0 && episodeNodes[idx - 1] && (episodeNodes[idx - 1].mastery ?? episodeNodes[idx - 1].p_know ?? 0) >= 0.5)) {
                        status = 'active';
                    }

                    return {
                        id: node.id || node.concept_id,
                        concept_id: node.concept_id || node.id,
                        title: node.label || node.name || node.concept_id,
                        description: node.description || node.summary || '',
                        format: node.format || ['Visual Story', 'Code Lab', 'Concept X-Ray', 'Quick Byte'][idx % 4],
                        estimated_time: node.estimated_time || (10 + idx * 5),
                        mastery,
                        status,
                        progress: status === 'completed' ? 1 : 0,
                    };
                });

                setEpisodes(mapped);

                const prereqIds = edges
                    .filter(e => e.target === (seasonNode.id || seasonNode.concept_id))
                    .map(e => e.source);

                const missing = nodes
                    .filter(n =>
                        prereqIds.includes(n.id || n.concept_id) &&
                        (n.mastery ?? n.p_know ?? 0) < 0.5
                    )
                    .map(n => n.label || n.name || n.concept_id);

                setMissingPrereqs(missing);
            } catch (e) {
                setError('Failed to load season data');
            }
            setLoading(false);
        }
        loadSeason();
    }, [seasonId, router]);

    const handleEpisodeClick = (episode) => {
        router.push(`/episode/${episode.id}?concept_id=${episode.concept_id}`);
    };

    const completedCount = episodes.filter(e => e.status === 'completed').length;
    const activeEpisodeId = episodes.find(e => e.status === 'active')?.id;
    const progressPct = episodes.length > 0 ? Math.round((completedCount / episodes.length) * 100) : 0;

    // ── Loading ──
    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-2 border-[#C17C64] border-t-transparent rounded-full animate-spin" />
                        <p className="text-[#9A8E82] text-sm">Loading season...</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    // ── Error ──
    if (error) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <span className="material-symbols-outlined text-red-400" style={{ fontSize: 48 }}>error</span>
                    <p className="text-red-400 text-lg">{error}</p>
                    <button
                        onClick={() => router.push('/home')}
                        className="px-5 py-2.5 rounded-lg bg-white border border-[#D8CCBE] text-[#2A2018] text-sm hover:border-[#C17C64]/40 transition-colors"
                    >
                        Back to Home
                    </button>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="min-h-full">
                {/* ── Hero Banner ── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative overflow-hidden"
                >
                    {/* Gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#C17C64]/10 via-white to-[#D4A574]/5" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#F5EDE4] via-transparent to-transparent" />

                    <div className="relative px-6 lg:px-8 pt-8 pb-10">
                        {/* Breadcrumb */}
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-center gap-2 mb-6 text-sm"
                        >
                            <button
                                onClick={() => router.push('/home')}
                                className="text-[#9A8E82] hover:text-[#2A2018] transition-colors flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>home</span>
                                Home
                            </button>
                            <span className="text-[#9A8E82]">/</span>
                            <span className="text-[#9A8E82]">Seasons</span>
                            <span className="text-[#9A8E82]">/</span>
                            <span className="text-[#C17C64] font-medium truncate">{season?.title}</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="text-3xl lg:text-4xl font-extrabold text-[#2A2018] mb-3 font-[Manrope]"
                        >
                            {season?.title}
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-[#6B5E52] text-base leading-relaxed max-w-2xl mb-6"
                        >
                            {season?.description}
                        </motion.p>

                        {/* Stats + Progress bar */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            className="flex flex-wrap items-center gap-6"
                        >
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#C17C64]" style={{ fontSize: 20 }}>play_circle</span>
                                <span className="text-[#2A2018] font-semibold text-sm">{episodes.length} Episodes</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#8FA395]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                <span className="text-[#2A2018] font-semibold text-sm">{completedCount}/{episodes.length} Completed</span>
                            </div>
                            <div className="flex-1 min-w-[140px] max-w-xs">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] text-[#9A8E82] uppercase tracking-wider font-bold">Progress</span>
                                    <span className="text-xs font-bold text-[#C17C64]">{progressPct}%</span>
                                </div>
                                <div className="h-2.5 bg-[#E2D8CC] rounded-full overflow-hidden border border-[#D8CCBE]">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPct}%` }}
                                        transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                                        className="h-full bg-gradient-to-r from-[#C17C64] to-[#8FA395] rounded-full"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>

                {/* ── Bridge Sprint Alert ── */}
                {missingPrereqs.length > 0 && (
                    <div className="px-6 lg:px-8 mb-6">
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl bg-[#C17C64]/10 border border-[#C17C64]/20 p-4 flex items-start gap-3"
                        >
                            <span className="material-symbols-outlined text-[#C17C64] mt-0.5" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>sprint</span>
                            <div>
                                <h4 className="text-[#2A2018] font-semibold text-sm mb-1">Bridge Sprint Active</h4>
                                <p className="text-[#6B5E52] text-sm">
                                    You have {missingPrereqs.length} prerequisite{missingPrereqs.length > 1 ? 's' : ''} to cover before unlocking all episodes.
                                </p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {missingPrereqs.map((p, i) => (
                                        <span key={i} className="text-xs bg-[#C17C64]/15 text-[#C17C64] px-2.5 py-1 rounded-full border border-[#C17C64]/20">
                                            {p}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* ── Season Complete Banner ── */}
                {completedCount === episodes.length && episodes.length > 0 && (
                    <div className="px-6 lg:px-8 mb-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="rounded-2xl overflow-hidden relative"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-[#2A2018] via-[#3D3228] to-[#2A2018]" />
                            <motion.div
                                className="absolute top-0 left-1/3 w-64 h-64 rounded-full"
                                style={{ background: 'radial-gradient(circle, rgba(212,165,116,0.15) 0%, transparent 70%)' }}
                                animate={{ x: [0, 20, -10, 0], y: [0, -10, 10, 0] }}
                                transition={{ duration: 6, repeat: Infinity }}
                            />
                            <div className="relative px-8 py-8 flex items-center justify-between gap-6">
                                <div className="flex items-center gap-5">
                                    <motion.div
                                        animate={{ rotate: [0, -5, 5, 0] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                        className="size-16 rounded-xl bg-gradient-to-br from-[#D4A574] to-[#C17C64] flex items-center justify-center shadow-[0_0_30px_rgba(212,165,116,0.3)]"
                                    >
                                        <span className="material-symbols-outlined text-white" style={{ fontSize: 32, fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                                    </motion.div>
                                    <div>
                                        <p className="text-[#D4A574] text-xs font-bold uppercase tracking-[0.2em] mb-1">All Episodes Complete</p>
                                        <h3 className="text-xl font-bold text-white">Season Finale Unlocked!</h3>
                                        <p className="text-[#9A8E82] text-sm mt-1">View your achievements, leaderboard rank & what's next.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => router.push(`/season/${seasonId}/finale`)}
                                    className="flex items-center gap-2 bg-gradient-to-r from-[#D4A574] to-[#C17C64] text-white font-bold text-sm px-6 py-3.5 rounded-xl hover:brightness-110 transition-all shadow-[0_0_20px_rgba(212,165,116,0.25)] flex-shrink-0"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>celebration</span>
                                    View Finale
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* ── Episode List ── */}
                <div className="px-6 lg:px-8 pb-10">
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-[#2A2018] flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#C17C64]" style={{ fontSize: 22 }}>list</span>
                            Episodes
                            <span className="text-sm font-normal text-[#9A8E82] ml-1">({episodes.length})</span>
                        </h2>
                        <span className="text-xs text-[#9A8E82] uppercase tracking-wider font-semibold">
                            {completedCount} of {episodes.length} complete
                        </span>
                    </div>

                    <div className="space-y-3">
                        {episodes.map((episode, index) => (
                            <EpisodeRow
                                key={episode.id}
                                episode={episode}
                                index={index}
                                isActive={episode.id === activeEpisodeId}
                                onClick={handleEpisodeClick}
                            />
                        ))}
                    </div>

                    {episodes.length === 0 && (
                        <div className="text-center py-16">
                            <span className="material-symbols-outlined text-[#9A8E82] mb-3" style={{ fontSize: 48 }}>movie</span>
                            <p className="text-[#9A8E82]">No episodes found for this season.</p>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

// ─── Export with Suspense ──────────────────────────────────────────────────────

export default function SeasonDetailPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-10 h-10 border-2 border-[#C17C64] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <SeasonDetail />
        </Suspense>
    );
}

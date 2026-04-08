"use client";

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getConstellation, getLearnerId, getHint, getEpisode } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { motion, AnimatePresence } from 'framer-motion';

const ACCENT_COLORS = ['#E50914', '#E87C03', '#46D369', '#5DADE2', '#AF7AC5', '#F4D03F'];
const FORMAT_ICONS = {
    'Visual Story': 'auto_stories', 'Code Lab': 'terminal',
    'Concept X-Ray': 'layers', 'Case Study': 'case_study', 'Quick Byte': 'bolt',
};

// ─── Layout nodes horizontally ──────────────────────────────────────────────
function layoutNodes(nodes) {
    const startX = 80, stepX = 160, centerY = 130, amplitude = 30;
    return nodes.map((n, i) => ({ ...n, cx: startX + i * stepX, cy: centerY + Math.sin(i * 0.8) * amplitude }));
}

// ─── Episode Card ───────────────────────────────────────────────────────────
function EpisodeCard({ episode, index, onClick }) {
    const [hovered, setHovered] = useState(false);
    const status = episode.status || 'locked';
    const accent = ACCENT_COLORS[index % ACCENT_COLORS.length];
    const icon = FORMAT_ICONS[episode.format] || 'play_circle';

    // Prefetch episode on hover — cache in localStorage so click is instant
    const prefetch = useCallback(() => {
        if (status === 'locked') return;
        const cacheKey = `learnflix_episode_${episode.concept_id}_${episode.concept_id}`;
        if (localStorage.getItem(cacheKey)) return; // already cached
        const lid = getLearnerId();
        if (lid) {
            getEpisode(episode.concept_id, lid, episode.concept_id, false, 30).then(({ data }) => {
                if (data) {
                    try { localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() })); } catch (e) {}
                }
            });
        }
    }, [episode.concept_id, status]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + index * 0.05 }}
            onMouseEnter={() => { setHovered(true); prefetch(); }}
            onMouseLeave={() => setHovered(false)}
            onClick={() => status !== 'locked' && onClick(episode)}
            className={`group relative rounded-md overflow-hidden transition-all duration-300 cursor-pointer ${status === 'locked' ? 'opacity-40 cursor-not-allowed' : ''}`}
            style={{
                transform: hovered && status !== 'locked' ? 'scale(1.05)' : 'scale(1)',
                zIndex: hovered ? 20 : 1,
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                boxShadow: hovered && status !== 'locked' ? '0 8px 40px rgba(0,0,0,0.7)' : 'none',
            }}
        >
            <div className="relative w-full aspect-video bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] overflow-hidden">
                <div className="absolute inset-0 opacity-30" style={{ background: `linear-gradient(135deg, ${accent}30, transparent 70%)` }} />
                <div className="absolute inset-0 flex items-center justify-center">
                    {status === 'locked' ? (
                        <span className="material-symbols-outlined text-white/20" style={{ fontSize: 48 }}>lock</span>
                    ) : status === 'completed' ? (
                        <span className="material-symbols-outlined text-[#46D369]" style={{ fontSize: 48, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    ) : (
                        <span className="material-symbols-outlined text-white/40" style={{ fontSize: 48, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                    )}
                </div>

                {hovered && status !== 'locked' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="size-14 rounded-full bg-white flex items-center justify-center shadow-xl">
                            <span className="material-symbols-outlined text-black" style={{ fontSize: 32, fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                        </div>
                    </motion.div>
                )}

                <div className="absolute top-2 left-3 text-5xl font-black text-white/10 leading-none select-none"
                    style={{ WebkitTextStroke: '1px rgba(255,255,255,0.08)' }}>{index + 1}</div>
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    {episode.estimated_time || 15} min
                </div>
            </div>

            <AnimatePresence>
                {hovered && status !== 'locked' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="bg-[#181818] border-t border-[#333] px-3 pb-3 pt-2">
                        <div className="flex items-center gap-2 mb-2">
                            <button className="size-8 rounded-full border-2 border-white flex items-center justify-center hover:bg-white/10">
                                <span className="material-symbols-outlined text-white" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                            </button>
                            <button className="size-8 rounded-full border-2 border-white/40 flex items-center justify-center hover:border-white">
                                <span className="material-symbols-outlined text-white/70" style={{ fontSize: 16 }}>add</span>
                            </button>
                        </div>
                        {episode.format && <span className="text-[10px] font-bold text-[#46D369] border border-[#46D369]/30 px-2 py-0.5 rounded">{episode.format}</span>}
                        <p className="text-white/50 text-xs line-clamp-2 mt-1">{episode.description || `Learn ${episode.title} through interactive AI-powered lessons.`}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {!hovered && (
                <div className="px-2 pt-2 pb-1 bg-[#141414]">
                    <p className="text-white/80 text-xs font-semibold truncate">{episode.title}</p>
                </div>
            )}
        </motion.div>
    );
}

// ─── Season Detail ──────────────────────────────────────────────────────────
function SeasonDetail() {
    const { id: seasonId } = useParams();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [generatingEpisodes, setGeneratingEpisodes] = useState(false);
    const [error, setError] = useState(null);
    const [season, setSeason] = useState(null);
    const [episodes, setEpisodes] = useState([]);
    const [hoveredNode, setHoveredNode] = useState(null);

    useEffect(() => {
        const learnerId = getLearnerId();
        if (!learnerId) { router.push('/profiles'); return; }

        async function loadSeason() {
            try {
                // Get the main constellation to find this course
                const { data, error: err } = await getConstellation(learnerId);
                if (err) { setError(err); setLoading(false); return; }

                const nodes = data?.nodes || [];
                let seasonNode = nodes.find(n =>
                    n.id === seasonId || n.concept_id === seasonId || n.slug === seasonId
                );

                // Check custom courses from localStorage if not in constellation
                if (!seasonNode) {
                    const customKey = `learnflix_custom_courses_${learnerId}`;
                    const customCourses = JSON.parse(localStorage.getItem(customKey) || '[]');
                    seasonNode = customCourses.find(c => c.concept_id === seasonId);
                }

                // Last fallback: treat the seasonId as the course name (from slug)
                if (!seasonNode) {
                    const nameFromSlug = seasonId.replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    seasonNode = { concept_id: seasonId, label: nameFromSlug };
                }

                const courseName = seasonNode.label || seasonNode.name || seasonNode.concept_id;
                setSeason({
                    id: seasonNode.id || seasonNode.concept_id,
                    title: courseName,
                    description: seasonNode.description || `Master ${courseName} through AI-generated episodes.`,
                });

                // Check cache — use cached episode LIST but re-apply progress
                const cacheKey = `learnflix_episodes_${learnerId}_${seasonId}`;
                const progressKey = `learnflix_progress_${learnerId}_${seasonId}`;
                let savedProgress = {};
                try { savedProgress = JSON.parse(localStorage.getItem(progressKey) || '{}'); } catch (e) {}

                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    try {
                        const cachedData = JSON.parse(cached);
                        if (cachedData.episodes?.length > 0) {
                            // Re-apply progress status from saved progress
                            const refreshed = cachedData.episodes.map((ep, i) => {
                                const progress = savedProgress[ep.concept_id] || 0;
                                const isCompleted = progress >= 80;
                                let status = 'locked';
                                if (i < 4) {
                                    status = isCompleted ? 'completed' : 'active';
                                } else {
                                    const prevId = cachedData.episodes[i - 1]?.concept_id;
                                    const prevProgress = savedProgress[prevId] || 0;
                                    if (isCompleted) status = 'completed';
                                    else if (prevProgress >= 80) status = 'active';
                                }
                                return { ...ep, mastery: progress / 100, status };
                            });
                            setEpisodes(refreshed);
                            setLoading(false);
                            return;
                        }
                    } catch (e) { /* regenerate */ }
                }

                // Ask the AI mentor to generate subtopics for this course
                setLoading(false);
                setGeneratingEpisodes(true);

                const { data: hintData } = await getHint({
                    learner_id: learnerId,
                    concept_id: seasonId,
                    question: `List exactly 8-10 key subtopics/chapters for learning "${courseName}" in order from beginner to advanced. Return ONLY a JSON array of strings, nothing else. Example: ["Introduction to ${courseName}", "Topic 2", "Topic 3"]`,
                    hint_level: 4,
                });

                let subtopics = [];
                const response = hintData?.hint || hintData?.response || hintData?.message || '';

                // Try to parse JSON array from the response
                try {
                    const jsonMatch = response.match(/\[[\s\S]*?\]/);
                    if (jsonMatch) {
                        subtopics = JSON.parse(jsonMatch[0]);
                    }
                } catch (e) {
                    // Fallback: split by newlines or numbered items
                    subtopics = response.split(/\n/).map(l => l.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*]\s*/, '').trim()).filter(l => l.length > 3 && l.length < 100);
                }

                // Fallback if AI didn't give good subtopics
                if (subtopics.length < 3) {
                    subtopics = [
                        `Introduction to ${courseName}`,
                        `${courseName} Fundamentals`,
                        `Core Concepts of ${courseName}`,
                        `${courseName} in Practice`,
                        `Intermediate ${courseName}`,
                        `Advanced ${courseName}`,
                        `${courseName} Problem Solving`,
                        `${courseName} Applications`,
                    ];
                }

                // Limit to 10 max
                subtopics = subtopics.slice(0, 10);

                // Load any saved progress for this course's episodes
                // (progressKey and savedProgress already defined above from cache section)

                const eps = subtopics.map((topic, i) => {
                    const epId = `${seasonId}_ep_${i}`;
                    const progress = savedProgress[epId] || 0; // 0-100
                    const isCompleted = progress >= 80;

                    // First 4 episodes are always unlocked. Rest unlock when previous is completed.
                    let status = 'locked';
                    if (i < 4) {
                        status = isCompleted ? 'completed' : 'active';
                    } else {
                        const prevId = `${seasonId}_ep_${i - 1}`;
                        const prevProgress = savedProgress[prevId] || 0;
                        if (isCompleted) status = 'completed';
                        else if (prevProgress >= 80) status = 'active';
                    }

                    return {
                        concept_id: epId,
                        title: topic,
                        description: `Learn ${topic} as part of your ${courseName} journey.`,
                        format: ['Visual Story', 'Code Lab', 'Concept X-Ray', 'Quick Byte'][i % 4],
                        estimated_time: 12 + i * 3,
                        mastery: progress / 100,
                        status,
                    };
                });

                setEpisodes(eps);
                localStorage.setItem(cacheKey, JSON.stringify({ episodes: eps, timestamp: Date.now() }));
                setGeneratingEpisodes(false);
            } catch (e) {
                setError('Failed to load course');
                setLoading(false);
                setGeneratingEpisodes(false);
            }
        }
        loadSeason();
    }, [seasonId, router]);

    const handleEpisodeClick = (episode) => {
        router.push(`/episode/${episode.concept_id}?concept_id=${episode.concept_id}`);
    };

    const roadmapNodes = layoutNodes(episodes);
    const completedCount = episodes.filter(e => e.status === 'completed').length;
    const progressPct = episodes.length > 0 ? Math.round((completedCount / episodes.length) * 100) : 0;

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="w-12 h-12 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
                </div>
            </AppLayout>
        );
    }

    if (error) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 48 }}>error</span>
                    <p className="text-[#E50914]">{error}</p>
                    <button onClick={() => router.push('/home')} className="px-5 py-2.5 rounded bg-[#333] text-white text-sm hover:bg-[#444]">Back to Home</button>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="min-h-full bg-[#141414]">
                {/* ═══ Hero Banner ═══ */}
                <div className="relative overflow-hidden" style={{ minHeight: 280 }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#1A1A1A] to-[#141414]" />
                    <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(229,9,20,0.3), transparent 70%)' }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-[#141414]/60" />

                    <div className="relative z-10 px-6 lg:px-12 pt-10 pb-8 max-w-6xl">
                        <div className="flex items-center gap-2 mb-4 text-sm">
                            <button onClick={() => router.push('/home')} className="text-[#808080] hover:text-white transition-colors">Home</button>
                            <span className="text-[#808080]">/</span>
                            <span className="text-white font-medium">{season?.title}</span>
                        </div>

                        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="text-4xl lg:text-5xl font-extrabold text-white mb-3">{season?.title}</motion.h1>
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                            className="text-[#B3B3B3] text-base max-w-2xl mb-6">{season?.description}</motion.p>

                        <div className="flex items-center gap-5 flex-wrap mb-6">
                            <span className="text-[#46D369] font-bold text-sm">{progressPct}% Complete</span>
                            <span className="text-[#B3B3B3] text-sm">{episodes.length} Episodes</span>
                            <span className="text-[#B3B3B3] text-sm">{completedCount} Finished</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <button onClick={() => {
                                const next = episodes.find(e => e.status === 'active') || episodes[0];
                                if (next) handleEpisodeClick(next);
                            }} className="flex items-center gap-2 bg-white text-black font-bold px-8 py-3 rounded hover:bg-white/90 transition-all">
                                <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                                {completedCount > 0 ? 'Resume' : 'Play'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ═══ Roadmap ═══ */}
                {episodes.length > 0 && (
                    <div className="px-6 lg:px-12 mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>route</span>
                            Learning Path
                        </h3>
                        <div className="relative rounded-lg border overflow-x-auto overflow-y-hidden" style={{ background: '#0A0A0A', borderColor: '#2E2E2E' }}>
                            {(() => {
                                const svgW = Math.max(600, roadmapNodes.length * 160 + 160);
                                const svgH = 240;
                                let pathD = `M${roadmapNodes[0].cx},${roadmapNodes[0].cy}`;
                                for (let i = 1; i < roadmapNodes.length; i++) {
                                    const prev = roadmapNodes[i - 1], curr = roadmapNodes[i];
                                    pathD += ` S${prev.cx + (curr.cx - prev.cx) * 0.7},${(prev.cy + curr.cy) / 2} ${curr.cx},${curr.cy}`;
                                }
                                const activeIdx = roadmapNodes.findIndex(n => n.status === 'active');
                                const progressEnd = activeIdx >= 0 ? activeIdx : roadmapNodes.filter(n => n.status === 'completed').length;
                                let progressPath = '';
                                if (progressEnd > 0) {
                                    progressPath = `M${roadmapNodes[0].cx},${roadmapNodes[0].cy}`;
                                    for (let i = 1; i <= Math.min(progressEnd, roadmapNodes.length - 1); i++) {
                                        const prev = roadmapNodes[i - 1], curr = roadmapNodes[i];
                                        progressPath += ` S${prev.cx + (curr.cx - prev.cx) * 0.7},${(prev.cy + curr.cy) / 2} ${curr.cx},${curr.cy}`;
                                    }
                                }

                                return (
                                    <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ minWidth: svgW }}>
                                        <defs>
                                            <filter id="glow-r" x="-40%" y="-40%" width="180%" height="180%">
                                                <feGaussianBlur stdDeviation="4" result="b" />
                                                <feFlood floodColor="#E50914" floodOpacity="0.15" result="c" />
                                                <feComposite in="c" in2="b" operator="in" result="d" />
                                                <feMerge><feMergeNode in="d" /><feMergeNode in="SourceGraphic" /></feMerge>
                                            </filter>
                                        </defs>

                                        <motion.path d={pathD} fill="none" stroke="#333" strokeWidth="3" strokeDasharray="6 10" strokeLinecap="round"
                                            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5 }} />
                                        {progressPath && (
                                            <motion.path d={progressPath} fill="none" stroke="#E50914" strokeWidth="3" strokeLinecap="round"
                                                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, delay: 0.3 }} />
                                        )}

                                        <g><rect x={roadmapNodes[0].cx - 24} y={roadmapNodes[0].cy + 38} width="48" height="18" rx="9" fill="#1A1A1A" stroke="#555" strokeWidth="1" />
                                        <text x={roadmapNodes[0].cx} y={roadmapNodes[0].cy + 51} textAnchor="middle" fill="#B3B3B3" fontSize="9" fontWeight="800" fontFamily="Manrope">START</text></g>

                                        {roadmapNodes.length > 1 && (
                                            <g><rect x={roadmapNodes[roadmapNodes.length - 1].cx - 24} y={roadmapNodes[roadmapNodes.length - 1].cy + 38} width="48" height="18" rx="9" fill="#46D369" />
                                            <text x={roadmapNodes[roadmapNodes.length - 1].cx} y={roadmapNodes[roadmapNodes.length - 1].cy + 51} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="800" fontFamily="Manrope">FINISH</text></g>
                                        )}

                                        {roadmapNodes.map((node, idx) => {
                                            const { cx, cy } = node;
                                            const isLocked = node.status === 'locked';
                                            const isMastered = node.status === 'completed';
                                            const isActive = node.status === 'active';
                                            const isHovered = hoveredNode === node.concept_id;
                                            const baseR = isActive ? 24 : isMastered ? 20 : 16;
                                            const r = isHovered ? baseR + 5 : baseR;
                                            const fill = isLocked ? '#1A1A1A' : isMastered ? '#46D369' : isActive ? '#E50914' : '#555';
                                            const stroke = isLocked ? '#333' : isMastered ? '#2D8B4E' : isActive ? '#B20710' : '#808080';

                                            return (
                                                <g key={node.concept_id || idx} className="cursor-pointer"
                                                    onClick={() => !isLocked && handleEpisodeClick(node)}
                                                    onMouseEnter={() => setHoveredNode(node.concept_id)}
                                                    onMouseLeave={() => setHoveredNode(null)}
                                                    style={{ opacity: isLocked ? 0.4 : 1 }}>
                                                    {isActive && (
                                                        <circle cx={cx} cy={cy} r={baseR + 10} fill="none" stroke="#E50914" strokeWidth="1" opacity="0.3">
                                                            <animate attributeName="r" values={`${baseR + 6};${baseR + 18};${baseR + 6}`} dur="3s" repeatCount="indefinite" />
                                                            <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
                                                        </circle>
                                                    )}
                                                    <motion.circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth="2"
                                                        filter={!isLocked ? 'url(#glow-r)' : 'none'}
                                                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                        transition={{ type: 'spring', delay: 0.1 + idx * 0.04, stiffness: 220 }}
                                                        style={{ transformOrigin: `${cx}px ${cy}px` }} />
                                                    <text x={cx} y={cy + 6} textAnchor="middle" fill={isLocked ? '#555' : '#fff'}
                                                        fontSize={isActive ? '18' : '14'} fontFamily="Material Symbols Outlined"
                                                        style={{ fontVariationSettings: "'FILL' 1" }}>
                                                        {isLocked ? 'lock' : isMastered ? 'check_circle' : isActive ? 'play_arrow' : 'circle'}
                                                    </text>
                                                    <circle cx={cx + r * 0.7} cy={cy - r * 0.7} r="8" fill="#0A0A0A" stroke="#0A0A0A" strokeWidth="2" />
                                                    <text x={cx + r * 0.7} y={cy - r * 0.7 + 3} textAnchor="middle" fill="#B3B3B3" fontSize="7" fontWeight="800" fontFamily="Manrope">{idx + 1}</text>
                                                    <text x={cx} y={cy + r + 15} textAnchor="middle" fill={isHovered ? '#fff' : isLocked ? '#555' : '#B3B3B3'}
                                                        fontSize={isHovered ? '10' : '9'} fontWeight={isActive || isHovered ? '700' : '500'} fontFamily="Manrope, sans-serif">
                                                        {node.title.length > 16 ? node.title.slice(0, 14) + '…' : node.title}
                                                    </text>
                                                </g>
                                            );
                                        })}
                                    </svg>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* ═══ Generating episodes spinner ═══ */}
                {generatingEpisodes && (
                    <div className="px-6 lg:px-12 mb-8">
                        <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-lg p-10 text-center">
                            <div className="w-10 h-10 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-white font-semibold">AI is generating episodes for {season?.title}...</p>
                            <p className="text-[#808080] text-sm mt-1">Our LLM is creating a personalized learning path</p>
                        </div>
                    </div>
                )}

                {/* ═══ Episodes Grid ═══ */}
                {episodes.length > 0 && (
                    <div className="px-6 lg:px-12 pb-12">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white">Episodes <span className="text-[#808080] font-normal">({episodes.length})</span></h2>
                            <span className="text-xs text-[#808080]">{completedCount} of {episodes.length} complete</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {episodes.map((ep, idx) => (
                                <EpisodeCard key={ep.concept_id || idx} episode={ep} index={idx} onClick={handleEpisodeClick} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

export default function SeasonDetailPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-[#141414]">
                <div className="w-10 h-10 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <SeasonDetail />
        </Suspense>
    );
}

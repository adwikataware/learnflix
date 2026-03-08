"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '@/components/layout/AppLayout';
import { getConstellation, getLearnerId, getLearnerName, getDashboard } from '@/lib/api';

const NODE_COLORS = {
    mastered: '#00d26a',
    active: '#00ace0',
    locked: '#232f3e',
};

const NODE_RADIUS = {
    mastered: 16,
    active: 18,
    locked: 12,
};

// Layout nodes in a nice spread pattern when API doesn't provide x/y
function layoutNodes(nodes) {
    const cols = Math.ceil(Math.sqrt(nodes.length * 1.5));
    const spacingX = 850 / Math.max(cols, 1);
    const spacingY = 450 / Math.max(Math.ceil(nodes.length / cols), 1);

    return nodes.map((n, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        // Add jitter for organic look
        const jitterX = ((i * 37) % 60) - 30;
        const jitterY = ((i * 53) % 50) - 25;
        return {
            ...n,
            cx: 80 + col * spacingX + jitterX,
            cy: 80 + row * spacingY + jitterY,
        };
    });
}

export default function HomePage() {
    const router = useRouter();
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hoveredNode, setHoveredNode] = useState(null);
    const [learnerName, setLearnerName] = useState('');
    const [stats, setStats] = useState({ xp: 0, streak: 0, mastered: 0, level: 1 });

    useEffect(() => {
        const learnerId = getLearnerId();
        if (!learnerId) { router.push('/onboarding'); return; }
        setLearnerName(getLearnerName());

        async function fetchData() {
            const [constRes, dashRes] = await Promise.all([
                getConstellation(learnerId),
                getDashboard(learnerId),
            ]);

            if (!constRes.error && constRes.data?.nodes?.length > 0) {
                const raw = constRes.data.nodes.map((n, i) => {
                    const st = n.status || n.state || 'locked';
                    // Only show mastery for truly mastered nodes — active nodes start at 0
                    // until the user actually completes episodes
                    const mastery = st === 'mastered' ? (n.mastery ?? 1) : 0;
                    return {
                        concept_id: n.concept_id || n.id,
                        label: n.label || n.concept_id || `Concept ${i + 1}`,
                        x: n.x,
                        y: n.y,
                        status: st,
                        mastery,
                        prerequisites: n.prerequisites || [],
                    };
                });

                // Layout nodes properly
                const laid = layoutNodes(raw);
                setNodes(laid);

                const apiEdges = (constRes.data.edges || constRes.data.links || []).map(e => ({
                    source: e.source,
                    target: e.target,
                }));
                setEdges(apiEdges);
            }

            if (!dashRes.error && dashRes.data) {
                const d = dashRes.data;
                setStats({
                    xp: d.stats?.xp ?? d.profile?.xp ?? 0,
                    streak: d.stats?.streak ?? d.profile?.streak ?? 0,
                    mastered: d.stats?.total_mastered ?? d.mastery?.total_mastered ?? 0,
                    level: d.stats?.level ?? d.profile?.level ?? 1,
                });
            }

            setLoading(false);
        }
        fetchData();
    }, [router]);

    const activeNode = nodes.find(n => n.status === 'active');
    const masteredCount = nodes.filter(n => n.status === 'mastered').length;
    const activeCount = nodes.filter(n => n.status === 'active').length;
    const lockedCount = nodes.filter(n => n.status === 'locked').length;
    const totalProgress = nodes.length > 0 ? Math.round((masteredCount / nodes.length) * 100) : 0;

    const handleNodeClick = useCallback((node) => {
        if (node.status === 'locked') {
            setSelectedNode(prev => prev?.concept_id === node.concept_id ? null : node);
        } else {
            router.push(`/season/${node.concept_id}`);
        }
    }, [router]);

    if (loading) {
        return (
            <AppLayout>
                <div className="h-[80vh] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-slate-400 text-sm">Loading your learning universe...</span>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="flex flex-col min-h-[calc(100vh-64px)] overflow-x-hidden w-full max-w-full">

                {/* ═══ Welcome Banner ═══ */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-4 lg:mx-8 mt-5"
                >
                    <h1 className="text-2xl lg:text-3xl font-extrabold text-white font-[Manrope]">
                        Welcome back, <span className="text-primary">{learnerName.split(' ')[0] || 'Learner'}</span>
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Your personalized learning constellation awaits.</p>
                </motion.div>

                {/* ═══ Quick Stats Row ═══ */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mx-4 lg:mx-8 mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3"
                >
                    {[
                        { icon: 'school', label: 'Mastered', value: masteredCount, color: '#00d26a' },
                        { icon: 'trending_up', label: 'In Progress', value: activeCount, color: '#00ace0' },
                        { icon: 'lock_open', label: 'To Unlock', value: lockedCount, color: '#64748b' },
                        { icon: 'military_tech', label: 'Overall', value: `${totalProgress}%`, color: '#f0c14b' },
                    ].map((stat, i) => (
                        <div key={stat.label} className="bg-[#1a242f] border border-[#2a3642] rounded-xl px-4 py-3 flex items-center gap-3">
                            <div className="size-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 20, color: stat.color, fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-white">{stat.value}</p>
                                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </motion.div>

                {/* ═══ Continue Learning Banner ═══ */}
                {activeNode && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="mx-4 lg:mx-8 mt-4 rounded-2xl overflow-hidden relative border border-[#00ace0]/20"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#00ace0]/10 via-[#0f171e] to-[#00ace0]/5" />
                        <div className="relative px-6 lg:px-8 py-5 flex items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>play_circle</span>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-widest text-primary font-bold mb-1">Continue Learning</p>
                                    <h2 className="text-xl lg:text-2xl font-bold text-white">{activeNode.label}</h2>
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="w-40 h-1.5 bg-[#232f3e] rounded-full overflow-hidden">
                                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.round(activeNode.mastery * 100)}%` }} />
                                        </div>
                                        <span className="text-xs text-slate-400">{Math.round(activeNode.mastery * 100)}% mastery</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => router.push(`/season/${activeNode.concept_id}`)}
                                className="flex items-center gap-2 bg-accent text-bg-dark font-bold text-sm px-6 py-3 rounded-lg transition-all hover:brightness-110 gold-glow flex-shrink-0"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>play_arrow</span>
                                Resume
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* ═══ THE CONSTELLATION ═══ */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mx-4 lg:mx-8 mt-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                            Your Learning Constellation
                        </h3>
                        <div className="hidden sm:flex items-center gap-5">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#00d26a]" style={{ boxShadow: '0 0 6px #00d26a' }} />
                                <span className="text-xs text-slate-400">Mastered</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#00ace0] animate-pulse" />
                                <span className="text-xs text-slate-400">Active</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#232f3e] border border-[#3a4a5a]" />
                                <span className="text-xs text-slate-400">Locked</span>
                            </div>
                        </div>
                    </div>

                    <div
                        className="relative bg-[#0a1420] rounded-2xl border border-[#1a2b3c] overflow-hidden"
                        style={{ minHeight: nodes.length > 0 ? 520 : 400 }}
                    >
                        {/* Dot grid */}
                        <div
                            className="absolute inset-0 pointer-events-none opacity-20"
                            style={{
                                backgroundImage: 'radial-gradient(rgba(0,172,224,0.2) 1px, transparent 1px)',
                                backgroundSize: '32px 32px',
                            }}
                        />

                        {/* Empty state */}
                        {nodes.length === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-4">
                                <span className="material-symbols-outlined text-primary/20" style={{ fontSize: 80 }}>hub</span>
                                <h4 className="text-xl font-bold text-white/50">Your constellation is forming...</h4>
                                <p className="text-slate-500 text-sm max-w-md text-center">
                                    Complete your assessment to unlock your personalized learning path.
                                    Each node is a concept you'll master.
                                </p>
                                <button
                                    onClick={() => router.push('/onboarding')}
                                    className="mt-2 flex items-center gap-2 bg-accent text-bg-dark font-bold px-6 py-3 rounded-lg hover:brightness-110 transition-all gold-glow"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_arrow</span>
                                    Take Assessment
                                </button>
                            </div>
                        )}

                        {/* SVG Canvas */}
                        {nodes.length > 0 && (
                            <svg className="w-full" viewBox="0 0 960 520" preserveAspectRatio="xMidYMid meet" style={{ minHeight: 520 }}>
                                <defs>
                                    <filter id="glow-g" x="-50%" y="-50%" width="200%" height="200%">
                                        <feGaussianBlur stdDeviation="5" result="b" />
                                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                                    </filter>
                                    <filter id="glow-b" x="-50%" y="-50%" width="200%" height="200%">
                                        <feGaussianBlur stdDeviation="7" result="b" />
                                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                                    </filter>
                                </defs>

                                {/* Edges */}
                                {edges.map((edge, idx) => {
                                    const src = nodes.find(n => n.concept_id === edge.source);
                                    const tgt = nodes.find(n => n.concept_id === edge.target);
                                    if (!src || !tgt) return null;

                                    const bothMastered = src.status === 'mastered' && tgt.status === 'mastered';
                                    const hasActive = src.status === 'active' || tgt.status === 'active';
                                    let stroke = 'rgba(42,54,66,0.6)';
                                    let width = 1.5;
                                    if (bothMastered) { stroke = 'rgba(0,210,106,0.35)'; width = 2.5; }
                                    else if (hasActive) { stroke = 'rgba(0,172,224,0.3)'; width = 2; }

                                    return (
                                        <motion.line
                                            key={`e-${idx}`}
                                            x1={src.cx} y1={src.cy} x2={tgt.cx} y2={tgt.cy}
                                            stroke={stroke} strokeWidth={width}
                                            strokeDasharray={tgt.status === 'locked' ? '5 4' : 'none'}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.8, delay: idx * 0.05 }}
                                        />
                                    );
                                })}

                                {/* Nodes */}
                                {nodes.map((node, idx) => {
                                    const { cx, cy } = node;
                                    const color = NODE_COLORS[node.status];
                                    const r = NODE_RADIUS[node.status];
                                    const isHovered = hoveredNode === node.concept_id;
                                    const isSelected = selectedNode?.concept_id === node.concept_id;
                                    const isLocked = node.status === 'locked';
                                    const filter = node.status === 'mastered' ? 'url(#glow-g)' : node.status === 'active' ? 'url(#glow-b)' : 'none';

                                    return (
                                        <g
                                            key={node.concept_id}
                                            className={`cursor-pointer transition-opacity ${isLocked ? 'opacity-40' : 'opacity-100'}`}
                                            onClick={() => handleNodeClick(node)}
                                            onMouseEnter={() => setHoveredNode(node.concept_id)}
                                            onMouseLeave={() => setHoveredNode(null)}
                                        >
                                            {/* Pulse for active */}
                                            {node.status === 'active' && (
                                                <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke={color} strokeWidth="1.5" opacity="0.3">
                                                    <animate attributeName="r" values={`${r + 4};${r + 22};${r + 4}`} dur="3s" repeatCount="indefinite" />
                                                    <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
                                                </circle>
                                            )}

                                            {/* Selection ring */}
                                            {isSelected && (
                                                <circle cx={cx} cy={cy} r={r + 10} fill="none" stroke={color} strokeWidth="2" strokeDasharray="5 3">
                                                    <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="6s" repeatCount="indefinite" />
                                                </circle>
                                            )}

                                            {/* Main circle */}
                                            <motion.circle
                                                cx={cx} cy={cy}
                                                r={isHovered || isSelected ? r + 4 : r}
                                                fill={color}
                                                filter={filter}
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: 'spring', delay: idx * 0.04, stiffness: 200 }}
                                                style={{ transformOrigin: `${cx}px ${cy}px` }}
                                            />

                                            {/* Icon inside node */}
                                            {isLocked ? (
                                                <text x={cx} y={cy + 5} textAnchor="middle" fill="#556677" fontSize="13" fontFamily="Material Symbols Outlined">lock</text>
                                            ) : node.status === 'mastered' ? (
                                                <text x={cx} y={cy + 5} textAnchor="middle" fill="#0f171e" fontSize="14" fontFamily="Material Symbols Outlined" fontWeight="bold">check</text>
                                            ) : (
                                                <text x={cx} y={cy + 5} textAnchor="middle" fill="#0f171e" fontSize="14" fontFamily="Material Symbols Outlined">play_arrow</text>
                                            )}

                                            {/* Label */}
                                            <text
                                                x={cx} y={cy + r + 20}
                                                textAnchor="middle"
                                                fill={isHovered || isSelected ? '#ffffff' : isLocked ? '#445566' : '#c8d6e5'}
                                                fontSize="12"
                                                fontWeight="600"
                                                fontFamily="Manrope, sans-serif"
                                            >
                                                {node.label.length > 20 ? node.label.slice(0, 18) + '...' : node.label}
                                            </text>

                                            {/* Mastery % */}
                                            {!isLocked && node.mastery > 0 && (
                                                <text
                                                    x={cx} y={cy + r + 34}
                                                    textAnchor="middle"
                                                    fill={color} fontSize="10" fontWeight="700"
                                                    fontFamily="Manrope, sans-serif" opacity="0.7"
                                                >
                                                    {Math.round(node.mastery * 100)}%
                                                </text>
                                            )}
                                        </g>
                                    );
                                })}
                            </svg>
                        )}
                    </div>
                </motion.div>

                {/* ═══ Selected Node Detail Panel ═══ */}
                <AnimatePresence>
                    {selectedNode && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mx-4 lg:mx-8 mt-3 overflow-hidden"
                        >
                            <div className="bg-[#1a242f] border border-[#2a3642] rounded-xl p-5 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="size-11 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${NODE_COLORS[selectedNode.status]}15`, border: `1px solid ${NODE_COLORS[selectedNode.status]}30` }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 22, color: NODE_COLORS[selectedNode.status] }}>
                                            {selectedNode.status === 'mastered' ? 'verified' : selectedNode.status === 'active' ? 'auto_awesome' : 'lock'}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold">{selectedNode.label}</h4>
                                        <p className="text-slate-500 text-xs mt-0.5">
                                            {selectedNode.status === 'locked' ? 'Complete prerequisites to unlock' : `${Math.round(selectedNode.mastery * 100)}% mastery`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {selectedNode.status !== 'locked' ? (
                                        <button
                                            onClick={() => router.push(`/season/${selectedNode.concept_id}`)}
                                            className="flex items-center gap-2 bg-primary text-bg-dark font-bold text-sm px-5 py-2.5 rounded-lg transition-all hover:brightness-110"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>play_arrow</span>
                                            {selectedNode.status === 'mastered' ? 'Review' : 'Start'}
                                        </button>
                                    ) : (
                                        <span className="text-slate-500 text-sm flex items-center gap-1">
                                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock</span> Locked
                                        </span>
                                    )}
                                    <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-white">
                                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ═══ Seasons / Courses Grid ═══ */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mx-4 lg:mx-8 mt-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-accent" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>star</span>
                            Your Courses
                        </h3>
                        <button onClick={() => router.push('/dashboard')} className="text-xs text-primary hover:underline font-semibold">View Dashboard</button>
                    </div>

                    {nodes.length === 0 ? (
                        <div className="bg-[#1a242f] border border-[#2a3642] rounded-xl p-8 text-center">
                            <span className="material-symbols-outlined text-slate-600" style={{ fontSize: 40 }}>library_books</span>
                            <p className="text-slate-500 text-sm mt-2">Complete your assessment to see your personalized courses.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {nodes.slice(0, 9).map((node, idx) => (
                                <motion.div
                                    key={node.concept_id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 + idx * 0.05 }}
                                    onClick={() => {
                                        if (node.status !== 'locked') router.push(`/season/${node.concept_id}`);
                                    }}
                                    className={`bg-[#1a242f] border rounded-xl p-4 transition-all group ${
                                        node.status === 'locked'
                                            ? 'border-[#2a3642] opacity-50 cursor-not-allowed'
                                            : 'border-[#2a3642] hover:border-[#00ace0]/40 cursor-pointer prime-glow-hover'
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="size-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${NODE_COLORS[node.status]}12` }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 20, color: NODE_COLORS[node.status], fontVariationSettings: "'FILL' 1" }}>
                                                {node.status === 'mastered' ? 'check_circle' : node.status === 'active' ? 'play_circle' : 'lock'}
                                            </span>
                                        </div>
                                        <span
                                            className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full"
                                            style={{
                                                backgroundColor: `${NODE_COLORS[node.status]}15`,
                                                color: NODE_COLORS[node.status],
                                                border: `1px solid ${NODE_COLORS[node.status]}30`,
                                            }}
                                        >
                                            {node.status === 'mastered' ? 'Completed' : node.status === 'active' ? 'In Progress' : 'Locked'}
                                        </span>
                                    </div>
                                    <h4 className="text-white font-semibold text-sm mb-2 group-hover:text-primary transition-colors">{node.label}</h4>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-[#232f3e] rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(node.mastery * 100)}%`, backgroundColor: NODE_COLORS[node.status] }} />
                                        </div>
                                        <span className="text-[11px] font-bold" style={{ color: NODE_COLORS[node.status] }}>
                                            {Math.round(node.mastery * 100)}%
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* ═══ Change Learning Path ═══ */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="mx-4 lg:mx-8 mt-6"
                >
                    <div className="bg-gradient-to-r from-[#1a242f] via-[#0f171e] to-[#1a242f] border border-[#2a3642] rounded-xl p-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="size-11 rounded-lg bg-[#f0c14b]/10 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-[#f0c14b]" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>swap_horiz</span>
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm">Want to learn something different?</h4>
                                <p className="text-slate-500 text-xs mt-0.5">Switch your learning goal or add a new domain to explore.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/onboarding')}
                            className="flex items-center gap-2 bg-[#f0c14b]/10 border border-[#f0c14b]/30 text-[#f0c14b] font-bold text-sm px-5 py-2.5 rounded-lg transition-all hover:bg-[#f0c14b]/20 flex-shrink-0"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>explore</span>
                            Change Topic
                        </button>
                    </div>
                </motion.div>

                {/* ═══ Quick Actions ═══ */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mx-4 lg:mx-8 mt-6 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4"
                >
                    <button
                        onClick={() => router.push('/mentor')}
                        className="bg-[#1a242f] border border-[#2a3642] rounded-xl p-5 text-left hover:border-[#00ace0]/30 transition-all group"
                    >
                        <div className="size-10 rounded-lg bg-[#00ace0]/10 flex items-center justify-center mb-3 group-hover:bg-[#00ace0]/20 transition-colors">
                            <span className="material-symbols-outlined text-[#00ace0]" style={{ fontSize: 22 }}>psychology</span>
                        </div>
                        <h4 className="text-white font-bold text-sm mb-1">AI Mentor</h4>
                        <p className="text-slate-500 text-xs">Get Socratic guidance on any concept</p>
                    </button>

                    <button
                        onClick={() => router.push('/dashboard')}
                        className="bg-[#1a242f] border border-[#2a3642] rounded-xl p-5 text-left hover:border-[#f0c14b]/30 transition-all group"
                    >
                        <div className="size-10 rounded-lg bg-[#f0c14b]/10 flex items-center justify-center mb-3 group-hover:bg-[#f0c14b]/20 transition-colors">
                            <span className="material-symbols-outlined text-[#f0c14b]" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>analytics</span>
                        </div>
                        <h4 className="text-white font-bold text-sm mb-1">Dashboard</h4>
                        <p className="text-slate-500 text-xs">Track placement readiness & skills</p>
                    </button>

                    <button
                        onClick={() => router.push('/profile')}
                        className="bg-[#1a242f] border border-[#2a3642] rounded-xl p-5 text-left hover:border-[#00d26a]/30 transition-all group"
                    >
                        <div className="size-10 rounded-lg bg-[#00d26a]/10 flex items-center justify-center mb-3 group-hover:bg-[#00d26a]/20 transition-colors">
                            <span className="material-symbols-outlined text-[#00d26a]" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                        </div>
                        <h4 className="text-white font-bold text-sm mb-1">Achievements</h4>
                        <p className="text-slate-500 text-xs">View badges, skills & certifications</p>
                    </button>
                </motion.div>

            </div>
        </AppLayout>
    );
}

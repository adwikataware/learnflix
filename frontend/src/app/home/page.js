"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import AppLayout from '@/components/layout/AppLayout';
import { getConstellation, getLearnerId, getLearnerName, getDashboard } from '@/lib/api';

// ─── Theme-matched node palette ──────────────────────────────────────────────
const NODE_COLORS = {
    mastered: '#8FA395',   // sage green
    active: '#C17C64',     // terracotta
    locked: '#3D3228',     // dark brown
};

// ─── Layout nodes horizontally with gentle wave ─────────────────────────────
function layoutNodes(nodes) {
    const startX = 80;
    const stepX = 160; // spacing between nodes
    const centerY = 130;
    const amplitude = 30; // gentle wave up/down

    return nodes.map((n, i) => ({
        ...n,
        cx: startX + i * stepX,
        cy: centerY + Math.sin(i * 0.8) * amplitude,
        nodeIdx: i,
    }));
}

function ScrollReveal({ children, className = '', delay = 0 }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={className}
        >
            {children}
        </motion.div>
    );
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
                const raw = constRes.data.nodes.map((n, i) => ({
                    concept_id: n.concept_id || n.id,
                    label: n.label || n.concept_id || `Concept ${i + 1}`,
                    x: n.x,
                    y: n.y,
                    apiStatus: n.status || n.state || 'locked',
                    mastery: n.mastery ?? n.p_known ?? 0,
                    prerequisites: n.prerequisites || [],
                }));

                // ── Game-like sequential unlock logic ──
                // Node is mastered if mastery >= 0.8
                // Node is active if it's the first non-mastered node OR prev node is mastered
                // Everything else is locked
                let foundActive = false;
                const withStatus = raw.map((node, i) => {
                    const isMastered = node.mastery >= 0.8 || node.apiStatus === 'mastered';
                    if (isMastered) {
                        return { ...node, status: 'mastered', mastery: node.mastery || 1 };
                    }
                    // First node is always active if not mastered
                    if (i === 0 && !foundActive) {
                        foundActive = true;
                        return { ...node, status: 'active', mastery: node.mastery };
                    }
                    // Active if previous is mastered and we haven't assigned active yet
                    const prevMastered = raw[i - 1] && (raw[i - 1].mastery >= 0.8 || raw[i - 1].apiStatus === 'mastered');
                    if (prevMastered && !foundActive) {
                        foundActive = true;
                        return { ...node, status: 'active', mastery: node.mastery };
                    }
                    // Everything else is locked
                    return { ...node, status: 'locked', mastery: 0 };
                });

                // Layout nodes properly
                const laid = layoutNodes(withStatus);
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
                        <span className="text-[#6B5E52] text-sm">Loading your learning universe...</span>
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
                    <h1 className="text-2xl lg:text-3xl font-extrabold text-[#2A2018] font-[Manrope]">
                        Welcome back, <span className="text-primary">{learnerName.split(' ')[0] || 'Learner'}</span>
                    </h1>
                    <p className="text-[#6B5E52] text-sm mt-1">Your personalized learning constellation awaits.</p>
                </motion.div>

                {/* ═══ Quick Stats Row ═══ */}
                <ScrollReveal className="mx-4 lg:mx-8 mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { icon: 'school', label: 'Mastered', value: masteredCount, color: '#8FA395' },
                        { icon: 'trending_up', label: 'In Progress', value: activeCount, color: '#C17C64' },
                        { icon: 'lock_open', label: 'To Unlock', value: lockedCount, color: '#64748b' },
                        { icon: 'military_tech', label: 'Overall', value: `${totalProgress}%`, color: '#D4A574' },
                    ].map((stat, i) => (
                        <motion.div key={stat.label} whileHover={{ y: -3 }} className="bg-white border border-[#D8CCBE] rounded-xl px-4 py-3 flex items-center gap-3">
                            <div className="size-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 20, color: stat.color, fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-[#2A2018]">{stat.value}</p>
                                <p className="text-[10px] uppercase tracking-wider text-[#9A8E82] font-bold">{stat.label}</p>
                            </div>
                        </motion.div>
                    ))}
                </ScrollReveal>

                {/* ═══ Continue Learning Banner ═══ */}
                {activeNode && (
                    <ScrollReveal className="mx-4 lg:mx-8 mt-4 rounded-2xl overflow-hidden relative border border-[#C17C64]/20" delay={0.1}>
                        <div className="absolute inset-0 bg-gradient-to-r from-[#C17C64]/10 via-white to-[#C17C64]/5" />
                        <div className="relative px-6 lg:px-8 py-5 flex items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>play_circle</span>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-widest text-primary font-bold mb-1">Continue Learning</p>
                                    <h2 className="text-xl lg:text-2xl font-bold text-[#2A2018]">{activeNode.label}</h2>
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="w-40 h-1.5 bg-[#E2D8CC] rounded-full overflow-hidden">
                                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.round(activeNode.mastery * 100)}%` }} />
                                        </div>
                                        <span className="text-xs text-[#6B5E52]">{Math.round(activeNode.mastery * 100)}% mastery</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => router.push(`/season/${activeNode.concept_id}`)}
                                className="flex items-center gap-2 bg-accent text-white font-bold text-sm px-6 py-3 rounded-lg transition-all hover:brightness-110 gold-glow flex-shrink-0"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>play_arrow</span>
                                Resume
                            </button>
                        </div>
                    </ScrollReveal>
                )}

                {/* ═══ THE ROADMAP ═══ */}
                <ScrollReveal className="mx-4 lg:mx-8 mt-6" delay={0.1}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-[#2A2018] flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#6B5E52]" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>route</span>
                            Your Learning Path
                        </h3>
                        <div className="hidden sm:flex items-center gap-5">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#8FA395]" />
                                <span className="text-xs text-[#6B5E52]">Mastered</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#F5EDE4] border-2 border-[#6B5E52]" />
                                <span className="text-xs text-[#6B5E52]">Current</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#3D3228] border border-[#6B5E52]/30" />
                                <span className="text-xs text-[#6B5E52]">Locked</span>
                            </div>
                        </div>
                    </div>

                    <div
                        className="relative rounded-2xl border overflow-x-auto overflow-y-hidden"
                        style={{
                            background: '#1a1410',
                            borderColor: '#2A2018',
                        }}
                    >
                        {/* Empty state */}
                        {nodes.length === 0 && (
                            <div className="flex flex-col items-center justify-center gap-4 py-16">
                                <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#6B5E52', opacity: 0.3 }}>route</span>
                                <h4 className="text-lg font-bold text-[#F5EDE4]/30">Your path is being created...</h4>
                                <button
                                    onClick={() => router.push('/onboarding')}
                                    className="flex items-center gap-2 bg-[#3D3228] text-[#F5EDE4] font-bold px-6 py-3 rounded-lg hover:bg-[#4a3f34] transition-all"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_arrow</span>
                                    Take Assessment
                                </button>
                            </div>
                        )}

                        {/* Horizontal Roadmap */}
                        {nodes.length > 0 && (() => {
                            const svgW = Math.max(600, nodes.length * 160 + 160);
                            const svgH = 260;

                            // Build curved path through all nodes
                            let pathD = `M${nodes[0].cx},${nodes[0].cy}`;
                            for (let i = 1; i < nodes.length; i++) {
                                const prev = nodes[i - 1];
                                const curr = nodes[i];
                                const cpy = (prev.cy + curr.cy) / 2;
                                pathD += ` S${prev.cx + (curr.cx - prev.cx) * 0.7},${cpy} ${curr.cx},${curr.cy}`;
                            }

                            // Progress path up to active node
                            const activeIdx = nodes.findIndex(n => n.status === 'active');
                            const progressEnd = activeIdx >= 0 ? activeIdx : nodes.filter(n => n.status === 'mastered').length;

                            let progressPath = '';
                            if (progressEnd > 0) {
                                progressPath = `M${nodes[0].cx},${nodes[0].cy}`;
                                for (let i = 1; i <= Math.min(progressEnd, nodes.length - 1); i++) {
                                    const prev = nodes[i - 1];
                                    const curr = nodes[i];
                                    const cpy = (prev.cy + curr.cy) / 2;
                                    progressPath += ` S${prev.cx + (curr.cx - prev.cx) * 0.7},${cpy} ${curr.cx},${curr.cy}`;
                                }
                            }

                            return (
                                <svg
                                    width={svgW}
                                    height={svgH}
                                    viewBox={`0 0 ${svgW} ${svgH}`}
                                    className="relative z-10"
                                    style={{ minWidth: svgW }}
                                >
                                    <defs>
                                        <filter id="glow-soft" x="-40%" y="-40%" width="180%" height="180%">
                                            <feGaussianBlur stdDeviation="4" result="b" />
                                            <feFlood floodColor="#F5EDE4" floodOpacity="0.15" result="c" />
                                            <feComposite in="c" in2="b" operator="in" result="d" />
                                            <feMerge><feMergeNode in="d" /><feMergeNode in="SourceGraphic" /></feMerge>
                                        </filter>
                                    </defs>

                                    {/* ── Full road (dashed, dark) ── */}
                                    <motion.path
                                        d={pathD}
                                        fill="none"
                                        stroke="#3D3228"
                                        strokeWidth="3"
                                        strokeDasharray="6 10"
                                        strokeLinecap="round"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 1.5, ease: 'easeOut' }}
                                    />

                                    {/* ── Progress road (solid creme) ── */}
                                    {progressPath && (
                                        <motion.path
                                            d={progressPath}
                                            fill="none"
                                            stroke="#6B5E52"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 2, delay: 0.3, ease: 'easeOut' }}
                                        />
                                    )}

                                    {/* ── START marker ── */}
                                    <g>
                                        <rect x={nodes[0].cx - 24} y={nodes[0].cy + 38} width="48" height="18" rx="9" fill="#3D3228" stroke="#6B5E52" strokeWidth="1" />
                                        <text x={nodes[0].cx} y={nodes[0].cy + 51} textAnchor="middle" fill="#D8CCBE" fontSize="9" fontWeight="800" fontFamily="Manrope">START</text>
                                    </g>

                                    {/* ── FINISH marker ── */}
                                    {nodes.length > 1 && (
                                        <g>
                                            <rect x={nodes[nodes.length - 1].cx - 24} y={nodes[nodes.length - 1].cy + 38} width="48" height="18" rx="9" fill="#8FA395" />
                                            <text x={nodes[nodes.length - 1].cx} y={nodes[nodes.length - 1].cy + 51} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="800" fontFamily="Manrope">FINISH</text>
                                        </g>
                                    )}

                                    {/* ── Nodes ── */}
                                    {nodes.map((node, idx) => {
                                        const { cx, cy } = node;
                                        const isLocked = node.status === 'locked';
                                        const isMastered = node.status === 'mastered';
                                        const isActive = node.status === 'active';
                                        const isHovered = hoveredNode === node.concept_id;
                                        const isSelected = selectedNode?.concept_id === node.concept_id;

                                        const baseR = isActive ? 26 : isMastered ? 22 : 18;
                                        const r = (isHovered || isSelected) ? baseR + 6 : baseR;

                                        // Colors: warm brown/terracotta circles, creme icons
                                        const fillColor = isLocked ? '#2A2018'
                                            : isMastered ? '#8FA395'
                                            : isActive ? '#C17C64'
                                            : '#6B5E52';
                                        const strokeColor = isLocked ? '#4a3f34'
                                            : isMastered ? '#6d8a73'
                                            : isActive ? '#a85e48'
                                            : '#9A8E82';
                                        const iconColor = isLocked ? '#4a3f34'
                                            : isMastered ? '#F5EDE4'
                                            : isActive ? '#F5EDE4'
                                            : '#F5EDE4';

                                        return (
                                            <g
                                                key={node.concept_id}
                                                className="cursor-pointer"
                                                onClick={() => handleNodeClick(node)}
                                                onMouseEnter={() => setHoveredNode(node.concept_id)}
                                                onMouseLeave={() => setHoveredNode(null)}
                                                style={{ opacity: isLocked ? 0.45 : 1 }}
                                            >
                                                {/* Active: soft pulse */}
                                                {isActive && (
                                                    <circle cx={cx} cy={cy} r={baseR + 10} fill="none" stroke="#F5EDE4" strokeWidth="1" opacity="0.15">
                                                        <animate attributeName="r" values={`${baseR + 6};${baseR + 20};${baseR + 6}`} dur="3s" repeatCount="indefinite" />
                                                        <animate attributeName="opacity" values="0.2;0;0.2" dur="3s" repeatCount="indefinite" />
                                                    </circle>
                                                )}

                                                {/* Outer border */}
                                                <motion.circle
                                                    cx={cx} cy={cy} r={r + 3}
                                                    fill="none"
                                                    stroke={strokeColor}
                                                    strokeWidth={(isHovered || isSelected) ? 2.5 : 1.5}
                                                    opacity={(isHovered || isSelected) ? 0.6 : 0.3}
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: 'spring', delay: 0.1 + idx * 0.05, stiffness: 200 }}
                                                    style={{ transformOrigin: `${cx}px ${cy}px` }}
                                                />

                                                {/* Main circle */}
                                                <motion.circle
                                                    cx={cx} cy={cy} r={r}
                                                    fill={fillColor}
                                                    stroke={strokeColor}
                                                    strokeWidth="2"
                                                    filter={(!isLocked) ? 'url(#glow-soft)' : 'none'}
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: 'spring', delay: 0.1 + idx * 0.05, stiffness: 220 }}
                                                    style={{ transformOrigin: `${cx}px ${cy}px` }}
                                                />

                                                {/* Inner icon */}
                                                <text
                                                    x={cx} y={cy + 6}
                                                    textAnchor="middle"
                                                    fill={iconColor}
                                                    fontSize={isActive ? '20' : '16'}
                                                    fontFamily="Material Symbols Outlined"
                                                    style={{ fontVariationSettings: isMastered || isActive ? "'FILL' 1" : "'FILL' 0" }}
                                                >
                                                    {isLocked ? 'lock' : isMastered ? 'check_circle' : isActive ? 'play_arrow' : 'circle'}
                                                </text>

                                                {/* Level number */}
                                                <circle cx={cx + r * 0.7} cy={cy - r * 0.7} r="9" fill={isLocked ? '#2A2018' : '#3D3228'} stroke="#1a1410" strokeWidth="2" />
                                                <text x={cx + r * 0.7} y={cy - r * 0.7 + 3.5} textAnchor="middle" fill="#D8CCBE" fontSize="8" fontWeight="800" fontFamily="Manrope">
                                                    {idx + 1}
                                                </text>

                                                {/* Label below */}
                                                <text
                                                    x={cx} y={cy + r + 16}
                                                    textAnchor="middle"
                                                    fill={(isHovered || isSelected) ? '#F5EDE4' : isLocked ? '#4a3f34' : '#D8CCBE'}
                                                    fontSize={(isHovered || isSelected) ? '11' : '10'}
                                                    fontWeight={(isHovered || isActive) ? '700' : '500'}
                                                    fontFamily="Manrope, sans-serif"
                                                >
                                                    {node.label.length > 16 ? node.label.slice(0, 14) + '…' : node.label}
                                                </text>

                                                {/* Status sublabel */}
                                                {!isLocked && (
                                                    <text
                                                        x={cx} y={cy + r + 28}
                                                        textAnchor="middle"
                                                        fill="#6B5E52"
                                                        fontSize="8" fontWeight="600"
                                                        fontFamily="Manrope, sans-serif"
                                                    >
                                                        {isMastered ? `${Math.round(node.mastery * 100)}%` : isActive ? 'Current' : ''}
                                                    </text>
                                                )}

                                                {/* Hover tooltip for locked */}
                                                {isHovered && isLocked && (
                                                    <g>
                                                        <rect x={cx - 50} y={cy - r - 26} width="100" height="18" rx="5" fill="#2A2018" stroke="#4a3f34" strokeWidth="0.5" />
                                                        <text x={cx} y={cy - r - 14} textAnchor="middle" fill="#9A8E82" fontSize="8" fontWeight="600" fontFamily="Manrope">
                                                            Complete prev. levels
                                                        </text>
                                                    </g>
                                                )}
                                            </g>
                                        );
                                    })}
                                </svg>
                            );
                        })()}
                    </div>
                </ScrollReveal>

                {/* ═══ Selected Node Detail Panel ═══ */}
                <AnimatePresence>
                    {selectedNode && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            className="mx-4 lg:mx-8 mt-3 overflow-hidden"
                        >
                            <div className="bg-white border border-[#D8CCBE] rounded-xl p-5 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="size-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${NODE_COLORS[selectedNode.status]}15`, border: `2px solid ${NODE_COLORS[selectedNode.status]}40` }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 24, color: NODE_COLORS[selectedNode.status], fontVariationSettings: "'FILL' 1" }}>
                                            {selectedNode.status === 'mastered' ? 'verified' : selectedNode.status === 'active' ? 'rocket_launch' : 'lock'}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="text-[#2A2018] font-bold text-base">{selectedNode.label}</h4>
                                        <p className="text-[#9A8E82] text-xs mt-0.5">
                                            {selectedNode.status === 'locked'
                                                ? 'Complete prerequisites to unlock this level'
                                                : selectedNode.status === 'mastered'
                                                    ? `Mastered — ${Math.round(selectedNode.mastery * 100)}%`
                                                    : 'Ready to learn'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {selectedNode.status !== 'locked' ? (
                                        <button
                                            onClick={() => router.push(`/season/${selectedNode.concept_id}`)}
                                            className="flex items-center gap-2 bg-[#C17C64] text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all hover:brightness-110"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                                                {selectedNode.status === 'mastered' ? 'replay' : 'play_arrow'}
                                            </span>
                                            {selectedNode.status === 'mastered' ? 'Review' : 'Start'}
                                        </button>
                                    ) : (
                                        <span className="text-[#9A8E82] text-sm flex items-center gap-1.5 bg-[#F5EDE4] px-3 py-2 rounded-lg">
                                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock</span> Locked
                                        </span>
                                    )}
                                    <button onClick={() => setSelectedNode(null)} className="text-[#9A8E82] hover:text-[#2A2018]">
                                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ═══ Seasons / Courses Grid ═══ */}
                <ScrollReveal className="mx-4 lg:mx-8 mt-6" delay={0.1}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-[#2A2018] flex items-center gap-2">
                            <span className="material-symbols-outlined text-accent" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>star</span>
                            Your Courses
                        </h3>
                        <button onClick={() => router.push('/dashboard')} className="text-xs text-primary hover:underline font-semibold">View Dashboard</button>
                    </div>

                    {nodes.length === 0 ? (
                        <div className="bg-white border border-[#D8CCBE] rounded-xl p-8 text-center">
                            <span className="material-symbols-outlined text-[#9A8E82]" style={{ fontSize: 40 }}>library_books</span>
                            <p className="text-[#9A8E82] text-sm mt-2">Complete your assessment to see your personalized courses.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {nodes.slice(0, 9).map((node, idx) => (
                                <motion.div
                                    key={node.concept_id}
                                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ delay: 0.3 + idx * 0.05 }}
                                    whileHover={{ y: -4, scale: 1.02 }}
                                    onClick={() => {
                                        if (node.status !== 'locked') router.push(`/season/${node.concept_id}`);
                                    }}
                                    className={`bg-white border rounded-xl p-4 transition-all group ${
                                        node.status === 'locked'
                                            ? 'border-[#D8CCBE] opacity-50 cursor-not-allowed'
                                            : 'border-[#D8CCBE] hover:border-[#C17C64]/40 cursor-pointer prime-glow-hover'
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
                                    <h4 className="text-[#2A2018] font-semibold text-sm mb-2 group-hover:text-primary transition-colors">{node.label}</h4>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-[#E2D8CC] rounded-full overflow-hidden">
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
                </ScrollReveal>

                {/* ═══ Change Learning Path ═══ */}
                <ScrollReveal className="mx-4 lg:mx-8 mt-6" delay={0.1}>
                    <div className="bg-gradient-to-r from-white via-[#F5EDE4] to-white border border-[#D8CCBE] rounded-xl p-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="size-11 rounded-lg bg-[#D4A574]/10 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-[#D4A574]" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>swap_horiz</span>
                            </div>
                            <div>
                                <h4 className="text-[#2A2018] font-bold text-sm">Want to learn something different?</h4>
                                <p className="text-[#9A8E82] text-xs mt-0.5">Switch your learning goal or add a new domain to explore.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/onboarding')}
                            className="flex items-center gap-2 bg-[#D4A574]/10 border border-[#D4A574]/30 text-[#D4A574] font-bold text-sm px-5 py-2.5 rounded-lg transition-all hover:bg-[#D4A574]/20 flex-shrink-0"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>explore</span>
                            Change Topic
                        </button>
                    </div>
                </ScrollReveal>

                {/* ═══ Quick Actions ═══ */}
                <ScrollReveal className="mx-4 lg:mx-8 mt-6 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" delay={0.1}>
                    <button
                        onClick={() => {
                            const target = activeNode || nodes.find(n => n.status !== 'locked');
                            if (target) router.push(`/bridge-sprint?concept_id=${target.concept_id}`);
                            else router.push('/bridge-sprint');
                        }}
                        className="bg-white border border-[#D8CCBE] rounded-xl p-5 text-left hover:border-[#C17C64]/30 transition-all group"
                    >
                        <div className="size-10 rounded-lg bg-[#C17C64]/10 flex items-center justify-center mb-3 group-hover:bg-[#C17C64]/20 transition-colors">
                            <span className="material-symbols-outlined text-[#C17C64]" style={{ fontSize: 22 }}>route</span>
                        </div>
                        <h4 className="text-[#2A2018] font-bold text-sm mb-1">Bridge Sprint</h4>
                        <p className="text-[#9A8E82] text-xs">Quick review of prerequisite gaps</p>
                    </button>

                    <button
                        onClick={() => router.push('/mentor')}
                        className="bg-white border border-[#D8CCBE] rounded-xl p-5 text-left hover:border-[#C17C64]/30 transition-all group"
                    >
                        <div className="size-10 rounded-lg bg-[#D4A574]/10 flex items-center justify-center mb-3 group-hover:bg-[#D4A574]/20 transition-colors">
                            <span className="material-symbols-outlined text-[#D4A574]" style={{ fontSize: 22 }}>psychology</span>
                        </div>
                        <h4 className="text-[#2A2018] font-bold text-sm mb-1">AI Mentor</h4>
                        <p className="text-[#9A8E82] text-xs">Get Socratic guidance on any concept</p>
                    </button>

                    <button
                        onClick={() => router.push('/dashboard')}
                        className="bg-white border border-[#D8CCBE] rounded-xl p-5 text-left hover:border-[#D4A574]/30 transition-all group"
                    >
                        <div className="size-10 rounded-lg bg-[#D4A574]/10 flex items-center justify-center mb-3 group-hover:bg-[#D4A574]/20 transition-colors">
                            <span className="material-symbols-outlined text-[#D4A574]" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>analytics</span>
                        </div>
                        <h4 className="text-[#2A2018] font-bold text-sm mb-1">Dashboard</h4>
                        <p className="text-[#9A8E82] text-xs">Track placement readiness & skills</p>
                    </button>

                    <button
                        onClick={() => router.push('/profile')}
                        className="bg-white border border-[#D8CCBE] rounded-xl p-5 text-left hover:border-[#8FA395]/30 transition-all group"
                    >
                        <div className="size-10 rounded-lg bg-[#8FA395]/10 flex items-center justify-center mb-3 group-hover:bg-[#8FA395]/20 transition-colors">
                            <span className="material-symbols-outlined text-[#8FA395]" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                        </div>
                        <h4 className="text-[#2A2018] font-bold text-sm mb-1">Achievements</h4>
                        <p className="text-[#9A8E82] text-xs">View badges, skills & certifications</p>
                    </button>
                </ScrollReveal>

            </div>
        </AppLayout>
    );
}

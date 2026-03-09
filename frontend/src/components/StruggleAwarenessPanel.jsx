"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ZONE_STYLES = {
    too_easy:            { bg: '#9A8E82' },
    comfortable:         { bg: '#8FA395' },
    productive_struggle: { bg: '#D4A574' },
    struggling:          { bg: '#C17C64' },
    frustrated:          { bg: '#ef4444' },
    giving_up:           { bg: '#dc2626' },
};

const TIMELINE_ICONS = {
    zone_change: 'swap_vert', error: 'error', success: 'check_circle',
    gate_fail: 'quiz', undo_burst: 'undo', idle: 'hourglass_top', hint: 'psychology',
};
const TIMELINE_COLORS = {
    zone_change: '#D4A574', error: '#C17C64', success: '#8FA395',
    gate_fail: '#C17C64', undo_burst: '#D4A574', idle: '#9A8E82', hint: '#8FA395',
};

function formatTime(date) {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * StruggleAwarenessPanel — a floating card that auto-slides from the right
 * when the user is on Code Lab or Assessment tabs. Shows live analysis.
 */
export default function StruggleAwarenessPanel({
    zone, zoneMeta, score, autoHint, suggestBridgeSprint,
    onDismissHint, conceptId, liveMetrics, timeline, activeTab,
    onOpenMentor, onOpenBridgeSprint,
}) {
    const style = ZONE_STYLES[zone] || ZONE_STYLES.comfortable;
    const isStruggling = ['struggling', 'frustrated', 'giving_up'].includes(zone);
    const errorRate = liveMetrics?.totalAttempts > 0
        ? Math.round((liveMetrics.errorCount / liveMetrics.totalAttempts) * 100) : 0;

    // Auto-show on code/assessment tabs, allow manual dismiss
    const shouldAutoShow = activeTab === 'code' || activeTab === 'assessment';
    const [dismissed, setDismissed] = useState(false);

    // Reset dismiss when switching back to a relevant tab
    useEffect(() => {
        if (shouldAutoShow) setDismissed(false);
    }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

    const visible = shouldAutoShow && !dismissed;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ x: 380, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 380, opacity: 0 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                    className="fixed top-[120px] right-4 z-40 w-[340px] max-h-[calc(100vh-140px)] flex flex-col rounded-2xl border shadow-2xl overflow-hidden"
                    style={{
                        backgroundColor: '#F5EDE4',
                        borderColor: '#D8CCBE',
                        boxShadow: '-4px 4px 32px rgba(42,32,24,0.12)',
                    }}
                >
                    {/* ── Header ── */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: '#D8CCBE' }}>
                        <div className="flex items-center gap-2">
                            <span className="relative flex size-2.5">
                                {isStruggling && (
                                    <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: style.bg, opacity: 0.5 }} />
                                )}
                                <span className="relative inline-flex rounded-full size-2.5" style={{ backgroundColor: style.bg }} />
                            </span>
                            <span className="text-sm font-bold text-[#2A2018]">Struggle Detector</span>
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${style.bg}15`, color: style.bg }}>
                                LIVE
                            </span>
                        </div>
                        <button onClick={() => setDismissed(true)} className="text-[#9A8E82] hover:text-[#2A2018] transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                        </button>
                    </div>

                    {/* ── Zone + Score Bar ── */}
                    <div className="px-4 py-3 border-b" style={{ borderColor: '#E2D8CC' }}>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined" style={{ fontSize: 16, color: style.bg }}>{zoneMeta.icon}</span>
                                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: style.bg }}>{zoneMeta.label}</span>
                            </div>
                            <span className="text-xs font-mono font-bold" style={{ color: style.bg }}>{score}/100</span>
                        </div>
                        <div className="w-full h-2 bg-[#E2D8CC] rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: style.bg }}
                                animate={{ width: `${Math.min(Math.max(score, 2), 100)}%` }}
                                transition={{ duration: 0.6 }}
                            />
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className="text-[8px] text-[#9A8E82]">Easy</span>
                            <span className="text-[8px] text-[#9A8E82]">Giving Up</span>
                        </div>
                    </div>

                    {/* ── Live Metrics Grid ── */}
                    <div className="px-4 py-3 border-b" style={{ borderColor: '#E2D8CC' }}>
                        <div className="grid grid-cols-2 gap-2">
                            <MetricCard icon="error" value={liveMetrics?.errorCount || 0}
                                sub={`${errorRate}% error rate`}
                                color={errorRate > 40 ? '#C17C64' : '#6B5E52'} alert={errorRate > 40} />
                            <MetricCard icon="hourglass_top" value={`${liveMetrics?.idleSeconds || 0}s`}
                                sub="idle time"
                                color={liveMetrics?.idleSeconds > 60 ? '#C17C64' : '#6B5E52'} alert={liveMetrics?.idleSeconds > 60} />
                            <MetricCard icon="undo" value={liveMetrics?.undoCount || 0}
                                sub="undo bursts"
                                color={liveMetrics?.undoCount > 2 ? '#D4A574' : '#6B5E52'} alert={liveMetrics?.undoCount > 2} />
                            <MetricCard icon="assignment" value={liveMetrics?.totalAttempts || 0}
                                sub={`${liveMetrics?.gateFailures || 0} quiz fails`}
                                color={liveMetrics?.gateFailures > 1 ? '#C17C64' : '#6B5E52'} alert={liveMetrics?.gateFailures > 1} />
                        </div>
                    </div>

                    {/* ── Auto-Hint from AI Mentor ── */}
                    <AnimatePresence>
                        {autoHint && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-b" style={{ borderColor: '#E2D8CC' }}
                            >
                                <div className="px-4 py-3" style={{ backgroundColor: `${style.bg}08` }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="material-symbols-outlined" style={{ fontSize: 14, color: style.bg, fontVariationSettings: "'FILL' 1" }}>psychology</span>
                                            <span className="text-[11px] font-bold text-[#2A2018]">AI Mentor</span>
                                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${style.bg}15`, color: style.bg }}>
                                                L{autoHint.level}
                                            </span>
                                        </div>
                                        <button onClick={onDismissHint} className="text-[#9A8E82] hover:text-[#2A2018]">
                                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-[#3D3228] leading-relaxed whitespace-pre-line">{autoHint.message}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <button onClick={() => onOpenMentor?.()}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white hover:brightness-110"
                                            style={{ backgroundColor: '#C17C64' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>chat</span>
                                            Ask Mentor
                                        </button>
                                        {suggestBridgeSprint && (
                                            <button onClick={() => onOpenBridgeSprint?.()}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold border"
                                                style={{ borderColor: '#D8CCBE', color: '#D4A574' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>route</span>
                                                Bridge Sprint
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Activity Log (scrollable) ── */}
                    <div className="flex-1 overflow-y-auto min-h-0 px-4 py-2.5">
                        <h4 className="text-[9px] font-bold uppercase tracking-wider text-[#9A8E82] mb-2">Activity Log</h4>
                        {timeline?.length > 0 ? (
                            <div className="space-y-1">
                                {timeline.map((entry) => (
                                    <TimelineEntry key={entry.id} entry={entry} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-[10px] text-[#9A8E82] text-center py-4">
                                Events appear here as you code and answer questions.
                            </p>
                        )}
                    </div>

                    {/* ── Why You're Here (struggling only) ── */}
                    {isStruggling && timeline?.some(e => e.type === 'zone_change') && (
                        <div className="px-4 py-2.5 border-t" style={{ borderColor: '#E2D8CC', backgroundColor: `${style.bg}08` }}>
                            <h4 className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: style.bg }}>Why you're here</h4>
                            {(() => {
                                const last = timeline.find(e => e.type === 'zone_change');
                                return last?.details?.reasons?.map((r, i) => (
                                    <div key={i} className="flex items-start gap-1.5 mt-1">
                                        <span className="material-symbols-outlined mt-0.5" style={{ fontSize: 11, color: style.bg }}>arrow_right</span>
                                        <span className="text-[11px] text-[#3D3228]">{r}</span>
                                    </div>
                                ));
                            })()}
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ icon, value, sub, color, alert }) {
    return (
        <div className="flex items-center gap-2.5 p-2 rounded-lg transition-colors" style={{ backgroundColor: alert ? `${color}08` : '#EDE5DB' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color }}>{icon}</span>
            <div className="min-w-0">
                <div className="text-sm font-black leading-none" style={{ color }}>{value}</div>
                <div className="text-[9px] text-[#9A8E82] mt-0.5 truncate">{sub}</div>
            </div>
        </div>
    );
}

function TimelineEntry({ entry }) {
    const icon = TIMELINE_ICONS[entry.type] || 'circle';
    const color = TIMELINE_COLORS[entry.type] || '#9A8E82';
    return (
        <div className="flex items-start gap-2 py-1 px-1.5 rounded-lg hover:bg-[#EDE5DB]/50 transition-colors">
            <span className="material-symbols-outlined mt-0.5 shrink-0" style={{ fontSize: 13, color }}>{icon}</span>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] text-[#3D3228] leading-tight">{entry.message}</p>
                <p className="text-[8px] text-[#9A8E82] mt-0.5">{formatTime(entry.time)}</p>
            </div>
        </div>
    );
}

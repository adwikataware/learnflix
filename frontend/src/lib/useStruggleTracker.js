"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { signalStruggle, getLearnerId } from './api';

// ─── Zone thresholds (match backend ZPD scoring) ─────────────────────────────
const ZONE_META = {
    too_easy:            { label: 'Too Easy',           color: '#9A8E82', icon: 'speed',               level: 0 },
    comfortable:         { label: 'Comfortable',        color: '#8FA395', icon: 'check_circle',        level: 0 },
    productive_struggle: { label: 'Productive Struggle', color: '#D4A574', icon: 'psychology',         level: 0 },
    struggling:          { label: 'Struggling',          color: '#C17C64', icon: 'warning',            level: 1 },
    frustrated:          { label: 'Frustrated',          color: '#ef4444', icon: 'sentiment_stressed', level: 3 },
    giving_up:           { label: 'Giving Up',           color: '#dc2626', icon: 'crisis_alert',       level: 4 },
};

const SIGNAL_INTERVAL_MS = 30_000;
const IDLE_THRESHOLD_MS = 10_000;
const BACKSPACE_BURST_WINDOW = 2_000;

/**
 * useStruggleTracker — silently monitors learner behavior on the episode page
 * and periodically POSTs metrics to /struggle/signal.
 *
 * Returns: { zone, score, autoHint, liveMetrics, timeline, suggestBridgeSprint, ... }
 */
export default function useStruggleTracker(conceptId, { enabled = true, currentQuestion = '', learnerCode = '' } = {}) {
    const [zone, setZone] = useState('comfortable');
    const [score, setScore] = useState(0);
    const [autoHint, setAutoHint] = useState(null);
    const [suggestBridgeSprint, setSuggestBridgeSprint] = useState(false);

    // Reactive live metrics (re-renders sidebar)
    const [liveMetrics, setLiveMetrics] = useState({
        errorCount: 0,
        totalAttempts: 0,
        idleSeconds: 0,
        undoCount: 0,
        gateFailures: 0,
    });

    // Timeline log of events
    const [timeline, setTimeline] = useState([]);

    // Mutable metrics tracked between signals
    const metrics = useRef({
        errorCount: 0,
        totalAttempts: 0,
        idleSeconds: 0,
        undoCount: 0,
        gateFailures: 0,
    });

    // Refs for tracking activity
    const lastActivityRef = useRef(Date.now());
    const backspaceTimes = useRef([]);
    const intervalRef = useRef(null);
    const idleIntervalRef = useRef(null);
    const metricsTickRef = useRef(null);
    const learnerId = useRef(null);
    const prevZoneRef = useRef('comfortable');

    // ── Helper: add timeline entry ───────────────────────────────────────
    const timelineCounter = useRef(0);
    const addTimelineEntry = useCallback((type, message, details = {}) => {
        timelineCounter.current += 1;
        setTimeline(prev => [
            { id: `${Date.now()}-${timelineCounter.current}`, time: new Date(), type, message, details },
            ...prev,
        ].slice(0, 50));
    }, []);

    // ── Activity listeners ─────────────────────────────────────────────────
    const recordActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
    }, []);

    const recordError = useCallback(() => {
        metrics.current.errorCount += 1;
        metrics.current.totalAttempts += 1;
        addTimelineEntry('error', 'Code execution failed', {
            errorCount: metrics.current.errorCount,
            totalAttempts: metrics.current.totalAttempts,
        });
    }, [addTimelineEntry]);

    const recordSuccess = useCallback(() => {
        metrics.current.totalAttempts += 1;
        addTimelineEntry('success', 'Code executed successfully', {
            totalAttempts: metrics.current.totalAttempts,
        });
    }, [addTimelineEntry]);

    const recordGateFailure = useCallback(() => {
        metrics.current.gateFailures += 1;
        addTimelineEntry('gate_fail', 'Quiz answer incorrect', {
            gateFailures: metrics.current.gateFailures,
        });
    }, [addTimelineEntry]);

    // ── Keyboard listener for undo/backspace bursts ────────────────────────
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e) => {
            recordActivity();

            if (e.key === 'Backspace' || e.key === 'Delete' || (e.ctrlKey && e.key === 'z')) {
                const now = Date.now();
                backspaceTimes.current.push(now);
                backspaceTimes.current = backspaceTimes.current.filter(t => now - t < BACKSPACE_BURST_WINDOW);

                if (backspaceTimes.current.length >= 5) {
                    metrics.current.undoCount += 1;
                    backspaceTimes.current = [];
                    addTimelineEntry('undo_burst', 'Rapid undo/delete detected', {
                        undoCount: metrics.current.undoCount,
                    });
                }
            }
        };

        const handleMouseMove = () => recordActivity();
        const handleClick = () => recordActivity();
        const handleScroll = () => recordActivity();

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousemove', handleMouseMove, { passive: true });
        document.addEventListener('click', handleClick);
        document.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('click', handleClick);
            document.removeEventListener('scroll', handleScroll);
        };
    }, [enabled, recordActivity, addTimelineEntry]);

    // ── Idle time accumulator (every second) ───────────────────────────────
    useEffect(() => {
        if (!enabled) return;

        let idleLogged = false;

        idleIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - lastActivityRef.current;
            if (elapsed >= IDLE_THRESHOLD_MS) {
                metrics.current.idleSeconds += 1;
                // Log idle event once per idle stretch (every 30s of idle)
                if (!idleLogged && metrics.current.idleSeconds % 30 === 0 && metrics.current.idleSeconds > 0) {
                    addTimelineEntry('idle', `Idle for ${metrics.current.idleSeconds}s`, {
                        idleSeconds: metrics.current.idleSeconds,
                    });
                    idleLogged = true;
                }
            } else {
                idleLogged = false;
            }
        }, 1_000);

        return () => clearInterval(idleIntervalRef.current);
    }, [enabled, addTimelineEntry]);

    // ── Push live metrics to state every 2s (reactive for sidebar) ────────
    useEffect(() => {
        if (!enabled) return;

        metricsTickRef.current = setInterval(() => {
            const m = metrics.current;
            setLiveMetrics({
                errorCount: m.errorCount,
                totalAttempts: m.totalAttempts,
                idleSeconds: m.idleSeconds,
                undoCount: m.undoCount,
                gateFailures: m.gateFailures,
            });
        }, 2_000);

        return () => clearInterval(metricsTickRef.current);
    }, [enabled]);

    // ── Signal sender (every 30s) ──────────────────────────────────────────
    useEffect(() => {
        if (!enabled || !conceptId) return;

        learnerId.current = getLearnerId();
        if (!learnerId.current) return;

        const sendSignal = async () => {
            const m = metrics.current;
            const errorRate = m.totalAttempts > 0 ? m.errorCount / m.totalAttempts : 0;

            try {
                const { data } = await signalStruggle({
                    learner_id: learnerId.current,
                    concept_id: conceptId,
                    error_rate: parseFloat(errorRate.toFixed(3)),
                    idle_time_seconds: m.idleSeconds,
                    undo_count: m.undoCount,
                    gate_failures: m.gateFailures,
                    current_question: currentQuestion,
                    learner_code: learnerCode,
                });

                if (data) {
                    const newZone = data.zone || 'comfortable';
                    const newScore = data.struggle_score ?? 0;

                    // Log zone transition
                    if (newZone !== prevZoneRef.current) {
                        const reasons = buildReasons(m, errorRate);
                        addTimelineEntry('zone_change', `Zone: ${ZONE_META[newZone]?.label || newZone}`, {
                            from: prevZoneRef.current,
                            to: newZone,
                            score: newScore,
                            reasons,
                        });
                        prevZoneRef.current = newZone;
                    }

                    setZone(newZone);
                    setScore(newScore);
                    setSuggestBridgeSprint(!!data.suggest_bridge_sprint);

                    if (data.auto_hint?.message) {
                        setAutoHint({
                            level: data.auto_hint.hint_level,
                            message: data.auto_hint.message,
                            style: data.auto_hint.teaching_style,
                        });
                        addTimelineEntry('hint', `L${data.auto_hint.hint_level} hint received`, {
                            level: data.auto_hint.hint_level,
                        });
                    }
                }
            } catch (e) {
                console.warn('[StruggleTracker] Signal failed:', e);
            }
        };

        const initialTimeout = setTimeout(sendSignal, 15_000);
        intervalRef.current = setInterval(sendSignal, SIGNAL_INTERVAL_MS);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(intervalRef.current);
        };
    }, [enabled, conceptId, currentQuestion, learnerCode, addTimelineEntry]);

    // ── Reset metrics when concept changes ─────────────────────────────────
    useEffect(() => {
        metrics.current = { errorCount: 0, totalAttempts: 0, idleSeconds: 0, undoCount: 0, gateFailures: 0 };
        setLiveMetrics({ errorCount: 0, totalAttempts: 0, idleSeconds: 0, undoCount: 0, gateFailures: 0 });
        setTimeline([]);
        setZone('comfortable');
        setScore(0);
        setAutoHint(null);
        setSuggestBridgeSprint(false);
        prevZoneRef.current = 'comfortable';
    }, [conceptId]);

    const dismissHint = useCallback(() => setAutoHint(null), []);

    return {
        zone,
        zoneMeta: ZONE_META[zone] || ZONE_META.comfortable,
        score,
        autoHint,
        suggestBridgeSprint,
        dismissHint,
        recordError,
        recordSuccess,
        recordGateFailure,
        liveMetrics,
        timeline,
    };
}

// ── Build human-readable reasons for zone escalation ──────────────────────────
function buildReasons(m, errorRate) {
    const reasons = [];
    if (errorRate > 0.4) reasons.push(`Error rate: ${Math.round(errorRate * 100)}% (${m.errorCount}/${m.totalAttempts})`);
    if (m.idleSeconds > 30) reasons.push(`Idle for ${m.idleSeconds}s`);
    if (m.undoCount > 2) reasons.push(`${m.undoCount} rapid undo bursts`);
    if (m.gateFailures > 0) reasons.push(`${m.gateFailures} quiz failures`);
    if (reasons.length === 0) reasons.push('Metrics within normal range');
    return reasons;
}

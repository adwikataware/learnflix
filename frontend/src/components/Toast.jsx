'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Global toast store
let toastListeners = [];
let toastId = 0;

export function showToast({ title, message, icon, color = '#E50914', duration = 4000 }) {
    const id = ++toastId;
    const toast = { id, title, message, icon, color, duration };
    toastListeners.forEach(fn => fn(toast));
    return id;
}

// Pre-built toast helpers
export const toastXP = (amount) => showToast({ title: `+${amount} XP`, message: 'Experience earned!', icon: 'star', color: '#E50914' });
export const toastStreak = (days) => showToast({ title: `${days} Day Streak!`, message: 'Keep it up!', icon: 'local_fire_department', color: '#E87C03' });
export const toastAchievement = (name) => showToast({ title: 'Achievement Unlocked!', message: name, icon: 'emoji_events', color: '#46D369' });
export const toastMastery = (concept) => showToast({ title: 'Concept Mastered!', message: concept, icon: 'school', color: '#46D369' });
export const toastLevelUp = (level) => showToast({ title: `Level ${level}!`, message: 'You leveled up!', icon: 'military_tech', color: '#AF7AC5', duration: 5000 });

export default function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const handler = (toast) => {
            setToasts(prev => [...prev, toast]);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== toast.id));
            }, toast.duration);
        };
        toastListeners.push(handler);
        return () => { toastListeners = toastListeners.filter(fn => fn !== handler); };
    }, []);

    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 360 }}>
            <AnimatePresence>
                {toasts.map(toast => (
                    <motion.div key={toast.id}
                        initial={{ x: 400, opacity: 0, scale: 0.8 }}
                        animate={{ x: 0, opacity: 1, scale: 1 }}
                        exit={{ x: 400, opacity: 0, scale: 0.8 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="bg-[#1A1A1A] border border-[#333] rounded-lg shadow-2xl overflow-hidden pointer-events-auto"
                        style={{ boxShadow: `0 0 20px ${toast.color}20, 0 8px 32px rgba(0,0,0,0.5)` }}
                    >
                        <div className="flex items-center gap-3 px-4 py-3">
                            {/* Icon */}
                            <div className="size-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${toast.color}15` }}>
                                <span className="material-symbols-outlined"
                                    style={{ fontSize: 22, color: toast.color, fontVariationSettings: "'FILL' 1" }}>
                                    {toast.icon}
                                </span>
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-bold text-sm">{toast.title}</p>
                                {toast.message && <p className="text-[#808080] text-xs truncate">{toast.message}</p>}
                            </div>
                        </div>
                        {/* Progress bar */}
                        <motion.div className="h-[2px]" style={{ backgroundColor: toast.color }}
                            initial={{ width: '100%' }}
                            animate={{ width: '0%' }}
                            transition={{ duration: toast.duration / 1000, ease: 'linear' }} />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

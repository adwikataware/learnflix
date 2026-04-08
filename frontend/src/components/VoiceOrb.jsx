"use client";

import { motion } from 'framer-motion';

/**
 * VoiceOrb — animated orb that visualizes voice state.
 * States: idle (gentle pulse), listening (reactive to audio level),
 *         speaking (rhythmic pulse), processing (spinning).
 *
 * Props:
 * - state: 'idle' | 'listening' | 'speaking' | 'processing'
 * - audioLevel: 0-1 (mic input level for listening animation)
 * - onClick: () => void
 * - size: number (px, default 64)
 */
export default function VoiceOrb({ state = 'idle', audioLevel = 0, onClick, size = 64 }) {
    const isActive = state !== 'idle';
    const scale = state === 'listening' ? 1 + audioLevel * 0.4 : 1;

    // Color based on state
    const colors = {
        idle:       { core: '#E50914', glow: 'rgba(193,124,100,0.2)', ring: 'rgba(193,124,100,0.15)' },
        listening:  { core: '#E87C03', glow: 'rgba(212,165,116,0.4)', ring: 'rgba(212,165,116,0.25)' },
        speaking:   { core: '#46D369', glow: 'rgba(143,163,149,0.4)', ring: 'rgba(143,163,149,0.25)' },
        processing: { core: '#E50914', glow: 'rgba(193,124,100,0.3)', ring: 'rgba(193,124,100,0.2)' },
    };
    const c = colors[state] || colors.idle;

    return (
        <button
            onClick={onClick}
            className="relative flex items-center justify-center cursor-pointer group"
            style={{ width: size, height: size }}
            title={state === 'listening' ? 'Listening... click to stop' : state === 'speaking' ? 'Speaking... click to stop' : 'Click to speak'}
        >
            {/* Outer ring 3 — largest glow */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: c.ring }}
                animate={{
                    scale: state === 'listening'
                        ? [1.3 + audioLevel * 0.3, 1.5 + audioLevel * 0.4, 1.3 + audioLevel * 0.3]
                        : state === 'speaking'
                            ? [1.3, 1.5, 1.3]
                            : [1.1, 1.2, 1.1],
                    opacity: isActive ? [0.3, 0.15, 0.3] : [0.1, 0.05, 0.1],
                }}
                transition={{
                    duration: state === 'speaking' ? 0.8 : state === 'listening' ? 0.3 : 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />

            {/* Outer ring 2 */}
            <motion.div
                className="absolute rounded-full"
                style={{
                    width: size * 0.85,
                    height: size * 0.85,
                    backgroundColor: c.ring,
                }}
                animate={{
                    scale: state === 'listening'
                        ? [1.1 + audioLevel * 0.2, 1.25 + audioLevel * 0.3, 1.1 + audioLevel * 0.2]
                        : state === 'speaking'
                            ? [1.1, 1.25, 1.1]
                            : [1.05, 1.1, 1.05],
                    opacity: isActive ? [0.4, 0.2, 0.4] : [0.15, 0.08, 0.15],
                }}
                transition={{
                    duration: state === 'speaking' ? 0.6 : state === 'listening' ? 0.25 : 2.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.1,
                }}
            />

            {/* Inner glow ring */}
            <motion.div
                className="absolute rounded-full"
                style={{
                    width: size * 0.72,
                    height: size * 0.72,
                    backgroundColor: c.glow,
                }}
                animate={{
                    scale: state === 'listening'
                        ? [1 + audioLevel * 0.15, 1.1 + audioLevel * 0.2, 1 + audioLevel * 0.15]
                        : state === 'speaking'
                            ? [1, 1.1, 1]
                            : [1, 1.03, 1],
                    opacity: isActive ? [0.6, 0.35, 0.6] : [0.2, 0.1, 0.2],
                }}
                transition={{
                    duration: state === 'speaking' ? 0.5 : state === 'listening' ? 0.2 : 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.15,
                }}
            />

            {/* Core orb */}
            <motion.div
                className="relative rounded-full flex items-center justify-center shadow-lg"
                style={{
                    width: size * 0.55,
                    height: size * 0.55,
                    background: `radial-gradient(circle at 35% 35%, ${c.core}ee, ${c.core})`,
                    boxShadow: `0 0 ${isActive ? 20 : 8}px ${c.glow}, inset 0 -2px 6px rgba(0,0,0,0.15)`,
                }}
                animate={{
                    scale: state === 'listening' ? scale : state === 'speaking' ? [1, 1.08, 1] : [1, 1.02, 1],
                    ...(state === 'processing' ? { rotate: [0, 360] } : {}),
                }}
                transition={{
                    scale: {
                        duration: state === 'speaking' ? 0.4 : state === 'listening' ? 0.1 : 3,
                        repeat: state === 'idle' ? Infinity : state === 'speaking' ? Infinity : 0,
                        ease: 'easeInOut',
                    },
                    rotate: state === 'processing' ? { duration: 1.5, repeat: Infinity, ease: 'linear' } : undefined,
                }}
            >
                {/* Icon */}
                <span
                    className="material-symbols-outlined text-white"
                    style={{
                        fontSize: size * 0.22,
                        fontVariationSettings: "'FILL' 1",
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
                    }}
                >
                    {state === 'listening' ? 'mic' : state === 'speaking' ? 'volume_up' : state === 'processing' ? 'hourglass_top' : 'mic'}
                </span>

                {/* Shine highlight */}
                <div
                    className="absolute rounded-full"
                    style={{
                        width: size * 0.18,
                        height: size * 0.1,
                        top: size * 0.08,
                        left: size * 0.1,
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.4), transparent)',
                        borderRadius: '50%',
                    }}
                />
            </motion.div>

            {/* State label */}
            <motion.span
                className="absolute -bottom-5 text-[8px] font-bold uppercase tracking-widest whitespace-nowrap"
                style={{ color: c.core }}
                animate={{ opacity: isActive ? 1 : 0.5 }}
            >
                {state === 'listening' ? 'Listening...' : state === 'speaking' ? 'Speaking...' : state === 'processing' ? 'Thinking...' : 'Tap to speak'}
            </motion.span>
        </button>
    );
}

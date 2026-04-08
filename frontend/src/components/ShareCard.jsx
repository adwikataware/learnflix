'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ShareCard({ isOpen, onClose, stats = {} }) {
    const [copied, setCopied] = useState(false);
    const cardRef = useRef(null);

    if (!isOpen) return null;

    const name = stats.name || 'Learner';
    const xp = stats.xp || 0;
    const streak = stats.streak || 0;
    const mastered = stats.mastered || 0;
    const courses = stats.courses || 0;
    const level = stats.level || 1;

    const shareText = `I'm learning on LearnFlix! Level ${level} | ${xp} XP | ${streak} Day Streak | ${mastered} Concepts Mastered`;

    const handleCopy = () => {
        navigator.clipboard?.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleTwitter = () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText + '\n\nTry it: learnflix.app')}`, '_blank');
    };

    const handleLinkedIn = () => {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://learnflix.app')}&summary=${encodeURIComponent(shareText)}`, '_blank');
    };

    const handleWhatsApp = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + '\n\nTry it: learnflix.app')}`, '_blank');
    };

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                onClick={onClose}>
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }} transition={{ type: 'spring', damping: 20 }}
                    className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>

                    {/* The share card */}
                    <div ref={cardRef} className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-[#333] rounded-2xl overflow-hidden">
                        {/* Header */}
                        <div className="relative px-6 pt-6 pb-4">
                            <div className="absolute top-0 right-0 w-40 h-40 opacity-10"
                                style={{ background: 'radial-gradient(circle, rgba(229,9,20,0.5), transparent 70%)' }} />
                            <p className="text-[#E50914] text-sm font-black tracking-tighter mb-1">LEARNFLIX</p>
                            <h3 className="text-white text-xl font-bold">{name}'s Progress</h3>
                        </div>

                        {/* Stats grid */}
                        <div className="px-6 pb-4 grid grid-cols-2 gap-3">
                            {[
                                { label: 'Level', value: level, icon: 'military_tech', color: '#AF7AC5' },
                                { label: 'XP Earned', value: xp, icon: 'star', color: '#E50914' },
                                { label: 'Day Streak', value: streak, icon: 'local_fire_department', color: '#E87C03' },
                                { label: 'Mastered', value: mastered, icon: 'school', color: '#46D369' },
                            ].map(s => (
                                <div key={s.label} className="bg-white/5 rounded-lg px-3 py-2.5 flex items-center gap-2">
                                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: s.color, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                                    <div>
                                        <p className="text-white font-bold text-lg leading-none">{s.value}</p>
                                        <p className="text-[#808080] text-[9px] uppercase tracking-wider font-bold">{s.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 border-t border-[#2E2E2E] bg-black/30">
                            <p className="text-[#555] text-[10px] text-center">AI-Powered Adaptive Learning</p>
                        </div>
                    </div>

                    {/* Share buttons */}
                    <div className="mt-4 flex items-center justify-center gap-3">
                        <button onClick={handleTwitter}
                            className="size-11 rounded-full bg-[#1DA1F2]/15 border border-[#1DA1F2]/30 flex items-center justify-center hover:bg-[#1DA1F2]/25 transition-all"
                            title="Share on X/Twitter">
                            <span className="text-[#1DA1F2] font-bold text-sm">𝕏</span>
                        </button>
                        <button onClick={handleLinkedIn}
                            className="size-11 rounded-full bg-[#0077B5]/15 border border-[#0077B5]/30 flex items-center justify-center hover:bg-[#0077B5]/25 transition-all"
                            title="Share on LinkedIn">
                            <span className="text-[#0077B5] font-bold text-sm">in</span>
                        </button>
                        <button onClick={handleWhatsApp}
                            className="size-11 rounded-full bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center hover:bg-[#25D366]/25 transition-all"
                            title="Share on WhatsApp">
                            <span className="material-symbols-outlined text-[#25D366]" style={{ fontSize: 20 }}>chat</span>
                        </button>
                        <button onClick={handleCopy}
                            className="size-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"
                            title="Copy to clipboard">
                            <span className="material-symbols-outlined text-white" style={{ fontSize: 18 }}>
                                {copied ? 'check' : 'content_copy'}
                            </span>
                        </button>
                    </div>

                    {/* Close */}
                    <button onClick={onClose} className="mt-3 w-full text-center text-[#808080] text-xs hover:text-white transition-colors">
                        Close
                    </button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

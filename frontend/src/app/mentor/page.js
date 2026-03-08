"use client";

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getHint, getLearnerId } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Hint Level Selector ───────────────────────────────────────────────────────

function HintLevelSelector({ level, onChange }) {
    const levels = [
        { value: 1, label: 'L1', desc: 'Nudge' },
        { value: 2, label: 'L2', desc: 'Clue' },
        { value: 3, label: 'L3', desc: 'Explain' },
        { value: 4, label: 'L4', desc: 'Answer' },
    ];

    return (
        <div className="flex items-center gap-1 bg-[#050d17] rounded-full p-1 border border-border-dark">
            {levels.map((l) => (
                <button
                    key={l.value}
                    onClick={() => onChange(l.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        level === l.value
                            ? 'bg-[#00ace0] text-white shadow-[0_0_12px_rgba(0,172,224,0.3)]'
                            : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title={l.desc}
                >
                    {l.label}
                </button>
            ))}
        </div>
    );
}

// ─── Chat Message ──────────────────────────────────────────────────────────────

function ChatMessage({ message, index }) {
    const isUser = message.role === 'user';

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
        >
            {/* AI avatar */}
            {!isUser && (
                <div className="size-8 rounded-full bg-[#00ace0]/15 border border-[#00ace0]/30 flex items-center justify-center shrink-0 mr-3 mt-1">
                    <span className="material-symbols-outlined text-[#00ace0]" style={{ fontSize: 18 }}>psychology</span>
                </div>
            )}

            <div className={`max-w-[80%] ${isUser ? 'order-1' : ''}`}>
                <div
                    className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                        isUser
                            ? 'bg-[#00ace0]/10 text-white border border-[#00ace0]/20 rounded-br-md'
                            : 'bg-card-dark border-l-2 border-[#00ace0] border-t border-r border-b border-t-border-dark border-r-border-dark border-b-border-dark text-slate-300 rounded-bl-md'
                    }`}
                >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                </div>

                {/* Hint level indicator */}
                {message.level && (
                    <div className="flex items-center gap-1 mt-1 ml-1">
                        <span className="text-[10px] text-slate-600 uppercase tracking-wider">
                            Hint Level {message.level}
                        </span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ─── Typing Indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 mb-4"
        >
            <div className="size-8 rounded-full bg-[#00ace0]/15 border border-[#00ace0]/30 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#00ace0]" style={{ fontSize: 18 }}>psychology</span>
            </div>
            <div className="bg-card-dark border border-border-dark rounded-2xl rounded-bl-md px-5 py-3.5">
                <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="size-2 rounded-full bg-[#00ace0]"
                            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

// ─── Mentor Chat ───────────────────────────────────────────────────────────────

function MentorChat() {
    const searchParams = useSearchParams();
    const conceptId = searchParams.get('concept_id') || 'general';

    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: `Hello! I am your Socratic Mentor. ${conceptId !== 'general' ? `I see you're exploring "${conceptId.replace(/_/g, ' ')}". ` : ''}I won't give you direct answers -- instead, I'll guide you with questions so you discover the answers yourself. What would you like to explore?`
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [hintLevel, setHintLevel] = useState(1);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        const learnerId = getLearnerId() || 'demo_user';

        const { data, error } = await getHint({
            learner_id: learnerId,
            concept_id: conceptId,
            question: userMsg,
            hint_level: hintLevel,
        });

        if (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `I encountered an issue: ${error}. Let's try again -- what would you like to explore?`
            }]);
        } else {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.hint || data.message || 'Think about this step by step...',
                level: data.hint_level,
            }]);
            if (data.next_level) {
                setHintLevel(data.next_level);
            }
        }
        setLoading(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <AppLayout>
            <div className="flex flex-col h-[calc(100vh-57px)]">
                {/* ── Chat Header ── */}
                <div className="shrink-0 px-6 lg:px-8 py-4 border-b border-border-dark bg-[#0f171e]/80 backdrop-blur-sm">
                    <div className="max-w-3xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-gradient-to-br from-[#00ace0]/20 to-[#f0c14b]/10 border border-[#00ace0]/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[#00ace0]" style={{ fontSize: 22 }}>psychology</span>
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-base font-[Manrope]">Socratic Mentor</h2>
                                <p className="text-xs text-[#00ace0] font-semibold uppercase tracking-wider">
                                    {conceptId !== 'general' ? conceptId.replace(/_/g, ' ') : 'General Mode'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Hint Level Selector */}
                            <HintLevelSelector level={hintLevel} onChange={setHintLevel} />

                            {/* Concept badge */}
                            {conceptId !== 'general' && (
                                <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 border border-border-dark px-3 py-1.5 rounded-full bg-[#050d17]">
                                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>topic</span>
                                    {conceptId.replace(/_/g, ' ')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Messages Area ── */}
                <div className="flex-1 overflow-y-auto hide-scrollbar">
                    {/* Subtle grid pattern */}
                    <div className="relative min-h-full">
                        <div
                            className="absolute inset-0 pointer-events-none opacity-30"
                            style={{
                                backgroundImage: 'radial-gradient(rgba(0,172,224,0.06) 1px, transparent 1px)',
                                backgroundSize: '24px 24px',
                            }}
                        />

                        <div className="max-w-3xl mx-auto px-6 lg:px-8 py-6 relative z-10">
                            {messages.map((m, i) => (
                                <ChatMessage key={i} message={m} index={i} />
                            ))}

                            <AnimatePresence>
                                {loading && <TypingIndicator />}
                            </AnimatePresence>

                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                </div>

                {/* ── Input Bar ── */}
                <div className="shrink-0 px-6 lg:px-8 py-4 bg-[#050d17] border-t border-border-dark">
                    <div className="max-w-3xl mx-auto">
                        <div className="flex items-center gap-3">
                            <div className="flex-1 relative">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder={`Ask about ${conceptId !== 'general' ? conceptId.replace(/_/g, ' ') : 'anything'}...`}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={loading}
                                    className="w-full bg-[#1a242f] border border-border-dark rounded-full py-3.5 pl-5 pr-14 text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-[#00ace0] focus:border-[#00ace0] transition-all outline-none disabled:opacity-50"
                                />
                            </div>
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || loading}
                                className="size-12 rounded-full bg-[#00ace0] text-white flex items-center justify-center shrink-0 hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,172,224,0.2)]"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
                            </button>
                        </div>

                        {/* Quick actions */}
                        <div className="flex items-center gap-2 mt-3">
                            <span className="text-[10px] text-slate-600 uppercase tracking-wider">Quick:</span>
                            {[
                                'Explain this concept',
                                'Give me an analogy',
                                'What are the prerequisites?',
                            ].map((q) => (
                                <button
                                    key={q}
                                    onClick={() => { setInput(q); inputRef.current?.focus(); }}
                                    className="text-xs text-slate-500 hover:text-[#00ace0] border border-border-dark hover:border-[#00ace0]/30 px-3 py-1 rounded-full transition-colors bg-[#0f171e]"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

// ─── Export ────────────────────────────────────────────────────────────────────

export default function MentorPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-[#0f171e]">
                <div className="size-10 border-2 border-[#00ace0] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <MentorChat />
        </Suspense>
    );
}

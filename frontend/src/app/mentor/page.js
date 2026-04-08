"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getHint, getLearnerId, getConstellation } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { motion, AnimatePresence } from 'framer-motion';
import useVoiceChat from '@/lib/useVoiceChat';
import VoiceOrb from '@/components/VoiceOrb';

// ─── Chat Message ──────────────────────────────────────────────────────────────

function ChatMessage({ message }) {
    const isUser = message.role === 'user';

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
        >
            {!isUser && (
                <div className="size-8 rounded-full bg-[#E50914]/15 border border-[#E50914]/30 flex items-center justify-center shrink-0 mr-3 mt-1">
                    <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 18 }}>psychology</span>
                </div>
            )}

            <div className={`max-w-[80%] ${isUser ? 'order-1' : ''}`}>
                <div
                    className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                        isUser
                            ? 'bg-[#E50914]/10 text-[#E5E5E5] border border-[#E50914]/20 rounded-br-md'
                            : 'bg-[#1E1E1E] border-l-2 border-[#E50914] border-t border-r border-b border-t-[#333333] border-r-[#333333] border-b-[#333333] text-[#E5E5E5] rounded-bl-md'
                    }`}
                >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
                {message.viaVoice && (
                    <span className="text-[9px] text-[#808080] ml-1 mt-0.5 inline-flex items-center gap-0.5">
                        <span className="material-symbols-outlined" style={{ fontSize: 9 }}>mic</span>
                        voice
                    </span>
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
            <div className="size-8 rounded-full bg-[#E50914]/15 border border-[#E50914]/30 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 18 }}>psychology</span>
            </div>
            <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl rounded-bl-md px-5 py-3.5">
                <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="size-2 rounded-full bg-[#E50914]"
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
    const router = useRouter();
    const conceptId = searchParams.get('concept_id') || 'general';

    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: `Hello! I am your Socratic Mentor. ${conceptId !== 'general' ? `I see you're exploring "${conceptId.replace(/_/g, ' ')}". ` : ''}I won't give you direct answers -- instead, I'll guide you with questions so you discover the answers yourself. What would you like to explore?`
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [voiceMode, setVoiceMode] = useState(false);
    const [autoSpeak, setAutoSpeak] = useState(true);
    const [showNewTopic, setShowNewTopic] = useState(false);
    const [newTopic, setNewTopic] = useState('');
    const [creatingCourse, setCreatingCourse] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // ── Create new course on the fly ──
    const handleCreateCourse = async () => {
        if (!newTopic.trim()) return;
        setCreatingCourse(true);

        const learnerId = getLearnerId();
        if (!learnerId) { router.push('/profiles'); return; }

        try {
            const topicName = newTopic.trim();
            const slug = topicName.toLowerCase().replace(/[^a-z0-9]+/g, '_');

            // Check if this course already exists in localStorage custom courses
            const customKey = `learnflix_custom_courses_${learnerId}`;
            const existing = JSON.parse(localStorage.getItem(customKey) || '[]');
            const alreadyExists = existing.find(c =>
                c.label.toLowerCase() === topicName.toLowerCase() || c.concept_id === slug
            );

            if (alreadyExists) {
                router.push(`/season/${alreadyExists.concept_id}`);
                return;
            }

            // Also check the constellation
            const { data: constData } = await getConstellation(learnerId);
            const constMatch = (constData?.nodes || []).find(n =>
                (n.label || '').toLowerCase().includes(topicName.toLowerCase()) ||
                topicName.toLowerCase().includes((n.label || '').toLowerCase())
            );

            if (constMatch) {
                router.push(`/season/${constMatch.concept_id || constMatch.id}`);
                return;
            }

            // Create new course locally — no constellation regeneration
            const newCourse = {
                concept_id: slug,
                label: topicName,
                status: 'active',
                mastery: 0,
                custom: true,
                createdAt: new Date().toISOString(),
            };

            existing.push(newCourse);
            localStorage.setItem(customKey, JSON.stringify(existing));

            // Go directly to the course page — episodes will be generated there via AI
            router.push(`/season/${slug}`);
        } catch (e) {
            console.error('Create course error:', e);
            setCreatingCourse(false);
        }
    };

    // ── Voice ───────────────────────────────────────────────────────────
    const voice = useVoiceChat({
        onTranscript: (text) => sendMessage(text, true),
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    useEffect(() => {
        if (!voiceMode) inputRef.current?.focus();
    }, [voiceMode]);

    const sendMessage = useCallback(async (text, viaVoice = false) => {
        if (!text.trim() || loading) return;

        const userMsg = text.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg, viaVoice }]);
        setLoading(true);

        const learnerId = getLearnerId() || 'demo_user';

        const { data, error } = await getHint({
            learner_id: learnerId,
            concept_id: conceptId,
            question: userMsg,
            hint_level: 2,
        });

        let responseText;
        if (error) {
            responseText = `I encountered an issue: ${error}. Let's try again -- what would you like to explore?`;
        } else {
            responseText = data.hint || data.message || 'Think about this step by step...';
        }

        setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
        setLoading(false);

        // Auto-speak if voice mode
        if (autoSpeak && (viaVoice || voiceMode)) {
            setTimeout(() => voice.speak(responseText), 200);
        }
    }, [loading, conceptId, autoSpeak, voiceMode, voice]);

    const handleSend = useCallback(() => {
        sendMessage(input, false);
    }, [input, sendMessage]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleOrbClick = useCallback(() => {
        if (voice.isSpeaking) {
            voice.stopSpeaking();
        } else if (voice.isListening) {
            voice.stopListening();
        } else {
            voice.startListening();
        }
    }, [voice]);

    const orbState = loading ? 'processing' : voice.voiceState;

    return (
        <AppLayout>
            <div className="flex flex-col h-[calc(100vh-57px)]">
                {/* ── Chat Header ── */}
                <div className="shrink-0 px-6 lg:px-8 py-4 border-b border-[#333333] bg-[#1E1E1E]/80 backdrop-blur-sm">
                    <div className="max-w-3xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-gradient-to-br from-[#E50914]/20 to-[#E87C03]/10 border border-[#E50914]/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 22 }}>psychology</span>
                            </div>
                            <div>
                                <h2 className="text-[#E5E5E5] font-bold text-base font-[Manrope]">Socratic Mentor</h2>
                                <p className="text-xs text-[#E50914] font-semibold uppercase tracking-wider">
                                    {conceptId !== 'general' ? conceptId.replace(/_/g, ' ') : 'General Mode'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Voice mode toggle */}
                            {voice.supported && (
                                <button
                                    onClick={() => setVoiceMode(!voiceMode)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                        voiceMode
                                            ? 'bg-[#E50914]/15 text-[#E50914] border border-[#E50914]/30'
                                            : 'bg-[#EDE4D8] text-[#808080] border border-[#333333] hover:text-[#B3B3B3]'
                                    }`}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                                        {voiceMode ? 'keyboard' : 'mic'}
                                    </span>
                                    {voiceMode ? 'Text Mode' : 'Voice Mode'}
                                </button>
                            )}

                            {conceptId !== 'general' && (
                                <span className="hidden md:flex items-center gap-1.5 text-xs text-[#B3B3B3] border border-[#333333] px-3 py-1.5 rounded-full bg-[#2A2A2A]">
                                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>topic</span>
                                    {conceptId.replace(/_/g, ' ')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Messages Area ── */}
                <div className="flex-1 overflow-y-auto hide-scrollbar">
                    <div className="relative min-h-full">
                        <div
                            className="absolute inset-0 pointer-events-none opacity-30"
                            style={{
                                backgroundImage: 'radial-gradient(rgba(193,124,100,0.06) 1px, transparent 1px)',
                                backgroundSize: '24px 24px',
                            }}
                        />

                        <div className="max-w-3xl mx-auto px-6 lg:px-8 py-6 relative z-10">
                            {messages.map((m, i) => (
                                <ChatMessage key={i} message={m} />
                            ))}

                            <AnimatePresence>
                                {loading && <TypingIndicator />}
                            </AnimatePresence>

                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                </div>

                {/* ── Voice Mode: Orb Area ── */}
                {voiceMode && (
                    <div className="shrink-0 px-6 lg:px-8 py-6 bg-[#1E1E1E]/50 border-t border-[#333333]">
                        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4">
                            <VoiceOrb
                                state={orbState}
                                audioLevel={voice.audioLevel}
                                onClick={handleOrbClick}
                                size={88}
                            />

                            {/* Live transcript */}
                            {voice.isListening && voice.transcript && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-sm text-[#B3B3B3] text-center italic"
                                >
                                    "{voice.transcript}"
                                </motion.p>
                            )}

                            {/* Auto-speak toggle + text fallback */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setAutoSpeak(!autoSpeak)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                                        autoSpeak
                                            ? 'bg-[#46D369]/15 text-[#46D369] border border-[#46D369]/30'
                                            : 'bg-[#EDE4D8] text-[#808080] border border-[#333333]'
                                    }`}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                                        {autoSpeak ? 'volume_up' : 'volume_off'}
                                    </span>
                                    Auto-speak {autoSpeak ? 'ON' : 'OFF'}
                                </button>
                            </div>

                            {/* Text input fallback */}
                            <div className="w-full flex items-center gap-3">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Or type here..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={loading}
                                    className="flex-1 bg-[#141414] border border-[#333333] rounded-full py-3 pl-5 pr-5 text-sm text-[#E5E5E5] placeholder-[#808080] focus:ring-1 focus:ring-[#E50914] focus:border-[#E50914] transition-all outline-none disabled:opacity-50"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || loading}
                                    className="size-11 rounded-full bg-[#E50914] text-white flex items-center justify-center shrink-0 hover:brightness-110 transition-all disabled:opacity-40 shadow-[0_0_20px_rgba(193,124,100,0.2)]"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Text Mode: Input Bar ── */}
                {!voiceMode && (
                    <div className="shrink-0 px-6 lg:px-8 py-4 bg-[#1E1E1E] border-t border-[#333333]">
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
                                        className="w-full bg-[#141414] border border-[#333333] rounded-full py-3.5 pl-5 pr-14 text-sm text-[#E5E5E5] placeholder-[#808080] focus:ring-1 focus:ring-[#E50914] focus:border-[#E50914] transition-all outline-none disabled:opacity-50"
                                    />
                                </div>
                                {/* Mic button in text mode */}
                                {voice.supported && (
                                    <button
                                        onClick={() => {
                                            if (voice.isListening) voice.stopListening();
                                            else voice.startListening();
                                        }}
                                        className={`size-12 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                            voice.isListening
                                                ? 'bg-[#E87C03] text-white animate-pulse shadow-[0_0_20px_rgba(212,165,116,0.4)]'
                                                : 'bg-[#EDE4D8] text-[#808080] hover:text-[#E50914] hover:bg-[#E50914]/10 border border-[#333333]'
                                        }`}
                                        title={voice.isListening ? 'Stop listening' : 'Voice input'}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                            {voice.isListening ? 'mic' : 'mic_none'}
                                        </span>
                                    </button>
                                )}
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || loading}
                                    className="size-12 rounded-full bg-[#E50914] text-white flex items-center justify-center shrink-0 hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(193,124,100,0.2)]"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
                                </button>
                            </div>

                            {/* Quick actions */}
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                                <span className="text-[10px] text-[#808080] uppercase tracking-wider">Quick:</span>
                                {[
                                    'Explain this concept',
                                    'Give me an analogy',
                                    'What are the prerequisites?',
                                ].map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => { setInput(q); inputRef.current?.focus(); }}
                                        className="text-xs text-[#B3B3B3] hover:text-[#E50914] border border-[#333333] hover:border-[#E50914]/30 px-3 py-1 rounded-full transition-colors bg-[#141414]"
                                    >
                                        {q}
                                    </button>
                                ))}

                                {/* Learn New Topic button */}
                                <button
                                    onClick={() => setShowNewTopic(true)}
                                    className="text-xs text-[#46D369] hover:text-[#46D369] border border-[#46D369]/30 hover:border-[#46D369]/60 hover:bg-[#46D369]/10 px-3 py-1 rounded-full transition-all bg-[#46D369]/5 flex items-center gap-1 font-bold"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add_circle</span>
                                    Learn New Topic
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ Learn New Topic Modal ═══ */}
                <AnimatePresence>
                    {showNewTopic && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                            onClick={() => !creatingCourse && setShowNewTopic(false)}>
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                                className="bg-[#1A1A1A] border border-[#333] rounded-2xl p-6 max-w-md w-full mx-4"
                                onClick={(e) => e.stopPropagation()}>

                                <div className="flex items-center gap-3 mb-4">
                                    <div className="size-10 rounded-lg bg-[#46D369]/15 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[#46D369]" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>explore</span>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-lg">Learn Something New</h3>
                                        <p className="text-[#808080] text-xs">Type any topic — AI will create a course for you</p>
                                    </div>
                                </div>

                                <input
                                    type="text"
                                    placeholder="e.g. Operating Systems, Cooking, Stock Market, Guitar..."
                                    value={newTopic}
                                    onChange={(e) => setNewTopic(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCourse()}
                                    disabled={creatingCourse}
                                    autoFocus
                                    className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3.5 text-white placeholder-[#555] focus:outline-none focus:border-[#46D369]/50 transition-colors mb-4"
                                />

                                {creatingCourse ? (
                                    <div className="flex items-center justify-center gap-3 py-3">
                                        <div className="w-5 h-5 border-2 border-[#46D369] border-t-transparent rounded-full animate-spin" />
                                        <span className="text-[#46D369] text-sm font-semibold">Creating your course...</span>
                                    </div>
                                ) : (
                                    <div className="flex gap-3">
                                        <button onClick={() => setShowNewTopic(false)}
                                            className="flex-1 py-3 rounded-xl border border-[#333] text-[#808080] font-semibold hover:bg-white/5 transition-all">
                                            Cancel
                                        </button>
                                        <button onClick={handleCreateCourse}
                                            disabled={!newTopic.trim()}
                                            className="flex-1 py-3 rounded-xl bg-[#46D369] text-black font-bold hover:brightness-110 transition-all disabled:opacity-30 flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>rocket_launch</span>
                                            Create Course
                                        </button>
                                    </div>
                                )}

                                <p className="text-[#555] text-[10px] text-center mt-3">
                                    The AI will generate a full course with episodes, notes, and assessments.
                                </p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </AppLayout>
    );
}

// ─── Export ────────────────────────────────────────────────────────────────────

export default function MentorPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="size-10 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <MentorChat />
        </Suspense>
    );
}

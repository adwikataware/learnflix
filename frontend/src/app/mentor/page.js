"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getHint, getLearnerId } from '@/lib/api';
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
                <div className="size-8 rounded-full bg-[#C17C64]/15 border border-[#C17C64]/30 flex items-center justify-center shrink-0 mr-3 mt-1">
                    <span className="material-symbols-outlined text-[#C17C64]" style={{ fontSize: 18 }}>psychology</span>
                </div>
            )}

            <div className={`max-w-[80%] ${isUser ? 'order-1' : ''}`}>
                <div
                    className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                        isUser
                            ? 'bg-[#C17C64]/10 text-[#2A2018] border border-[#C17C64]/20 rounded-br-md'
                            : 'bg-white border-l-2 border-[#C17C64] border-t border-r border-b border-t-[#D8CCBE] border-r-[#D8CCBE] border-b-[#D8CCBE] text-[#3D3228] rounded-bl-md'
                    }`}
                >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
                {message.viaVoice && (
                    <span className="text-[9px] text-[#9A8E82] ml-1 mt-0.5 inline-flex items-center gap-0.5">
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
            <div className="size-8 rounded-full bg-[#C17C64]/15 border border-[#C17C64]/30 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#C17C64]" style={{ fontSize: 18 }}>psychology</span>
            </div>
            <div className="bg-white border border-[#D8CCBE] rounded-2xl rounded-bl-md px-5 py-3.5">
                <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="size-2 rounded-full bg-[#C17C64]"
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
    const [voiceMode, setVoiceMode] = useState(false);
    const [autoSpeak, setAutoSpeak] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

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
                <div className="shrink-0 px-6 lg:px-8 py-4 border-b border-[#D8CCBE] bg-white/80 backdrop-blur-sm">
                    <div className="max-w-3xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-gradient-to-br from-[#C17C64]/20 to-[#D4A574]/10 border border-[#C17C64]/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[#C17C64]" style={{ fontSize: 22 }}>psychology</span>
                            </div>
                            <div>
                                <h2 className="text-[#2A2018] font-bold text-base font-[Manrope]">Socratic Mentor</h2>
                                <p className="text-xs text-[#C17C64] font-semibold uppercase tracking-wider">
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
                                            ? 'bg-[#C17C64]/15 text-[#C17C64] border border-[#C17C64]/30'
                                            : 'bg-[#EDE4D8] text-[#9A8E82] border border-[#D8CCBE] hover:text-[#6B5E52]'
                                    }`}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                                        {voiceMode ? 'keyboard' : 'mic'}
                                    </span>
                                    {voiceMode ? 'Text Mode' : 'Voice Mode'}
                                </button>
                            )}

                            {conceptId !== 'general' && (
                                <span className="hidden md:flex items-center gap-1.5 text-xs text-[#6B5E52] border border-[#D8CCBE] px-3 py-1.5 rounded-full bg-[#F0E7DC]">
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
                    <div className="shrink-0 px-6 lg:px-8 py-6 bg-white/50 border-t border-[#D8CCBE]">
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
                                    className="text-sm text-[#6B5E52] text-center italic"
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
                                            ? 'bg-[#8FA395]/15 text-[#8FA395] border border-[#8FA395]/30'
                                            : 'bg-[#EDE4D8] text-[#9A8E82] border border-[#D8CCBE]'
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
                                    className="flex-1 bg-[#F5EDE4] border border-[#D8CCBE] rounded-full py-3 pl-5 pr-5 text-sm text-[#2A2018] placeholder-[#9A8E82] focus:ring-1 focus:ring-[#C17C64] focus:border-[#C17C64] transition-all outline-none disabled:opacity-50"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || loading}
                                    className="size-11 rounded-full bg-[#C17C64] text-white flex items-center justify-center shrink-0 hover:brightness-110 transition-all disabled:opacity-40 shadow-[0_0_20px_rgba(193,124,100,0.2)]"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Text Mode: Input Bar ── */}
                {!voiceMode && (
                    <div className="shrink-0 px-6 lg:px-8 py-4 bg-white border-t border-[#D8CCBE]">
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
                                        className="w-full bg-[#F5EDE4] border border-[#D8CCBE] rounded-full py-3.5 pl-5 pr-14 text-sm text-[#2A2018] placeholder-[#9A8E82] focus:ring-1 focus:ring-[#C17C64] focus:border-[#C17C64] transition-all outline-none disabled:opacity-50"
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
                                                ? 'bg-[#D4A574] text-white animate-pulse shadow-[0_0_20px_rgba(212,165,116,0.4)]'
                                                : 'bg-[#EDE4D8] text-[#9A8E82] hover:text-[#C17C64] hover:bg-[#C17C64]/10 border border-[#D8CCBE]'
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
                                    className="size-12 rounded-full bg-[#C17C64] text-white flex items-center justify-center shrink-0 hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(193,124,100,0.2)]"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
                                </button>
                            </div>

                            {/* Quick actions */}
                            <div className="flex items-center gap-2 mt-3">
                                <span className="text-[10px] text-[#9A8E82] uppercase tracking-wider">Quick:</span>
                                {[
                                    'Explain this concept',
                                    'Give me an analogy',
                                    'What are the prerequisites?',
                                ].map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => { setInput(q); inputRef.current?.focus(); }}
                                        className="text-xs text-[#6B5E52] hover:text-[#C17C64] border border-[#D8CCBE] hover:border-[#C17C64]/30 px-3 py-1 rounded-full transition-colors bg-[#F5EDE4]"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

// ─── Export ────────────────────────────────────────────────────────────────────

export default function MentorPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="size-10 border-2 border-[#C17C64] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <MentorChat />
        </Suspense>
    );
}

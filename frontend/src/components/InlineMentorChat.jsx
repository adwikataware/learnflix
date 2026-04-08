"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getHint, getLearnerId } from '@/lib/api';
import useVoiceChat from '@/lib/useVoiceChat';
import VoiceOrb from '@/components/VoiceOrb';

// ─── Chat Bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ message }) {
    const isUser = message.role === 'user';

    return (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
        >
            {!isUser && (
                <div className="size-6 rounded-full bg-[#E50914]/15 border border-[#E50914]/30 flex items-center justify-center shrink-0 mr-2 mt-1">
                    <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 14 }}>psychology</span>
                </div>
            )}
            <div className={`max-w-[85%]`}>
                <div
                    className={`rounded-xl px-3.5 py-2.5 text-[12px] leading-relaxed ${
                        isUser
                            ? 'bg-[#E50914]/10 text-[#E5E5E5] border border-[#E50914]/20 rounded-br-sm'
                            : 'bg-[#1E1E1E] border border-[#333333] border-l-2 border-l-[#E50914] text-[#E5E5E5] rounded-bl-sm'
                    }`}
                >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
                {/* Voice indicator */}
                {message.viaVoice && (
                    <span className="text-[8px] text-[#808080] ml-1 mt-0.5 inline-flex items-center gap-0.5">
                        <span className="material-symbols-outlined" style={{ fontSize: 8 }}>mic</span>
                        voice
                    </span>
                )}
            </div>
        </motion.div>
    );
}

// ─── Typing Dots ──────────────────────────────────────────────────────────────

function TypingDots() {
    return (
        <div className="flex items-center gap-2 mb-3">
            <div className="size-6 rounded-full bg-[#E50914]/15 border border-[#E50914]/30 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 14 }}>psychology</span>
            </div>
            <div className="bg-[#1E1E1E] border border-[#333333] rounded-xl rounded-bl-sm px-3.5 py-2.5">
                <div className="flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="size-1.5 rounded-full bg-[#E50914]"
                            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InlineMentorChat({
    isOpen,
    onClose,
    conceptId,
    conceptName,
    autoTriggerMessage = null,
    zone = 'comfortable',
    zoneMeta = {},
    score = 0,
}) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [voiceMode, setVoiceMode] = useState(false);
    const [autoSpeak, setAutoSpeak] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const hasAutoTriggered = useRef(false);
    const prevConceptRef = useRef(null);

    const isStruggling = ['struggling', 'frustrated', 'giving_up'].includes(zone);
    const zoneColor = zoneMeta?.color || '#E50914';

    // ── Voice Chat Hook ─────────────────────────────────────────────────
    const voice = useVoiceChat({
        onTranscript: (text) => {
            // Auto-send voice transcript
            handleSendVoice(text);
        },
    });

    // Reset chat when concept changes
    useEffect(() => {
        if (conceptId !== prevConceptRef.current) {
            setMessages([]);
            hasAutoTriggered.current = false;
            prevConceptRef.current = conceptId;
        }
    }, [conceptId]);

    // Initialize with welcome message when opened
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            const greeting = autoTriggerMessage
                ? `I noticed you might be having some difficulty${conceptName ? ` with "${conceptName.replace(/_/g, ' ')}"` : ''}. ${autoTriggerMessage}\n\nI'm here to help — I won't give you direct answers, but I'll guide you with questions so you discover the answer yourself. What's confusing you?`
                : `Hello! I'm your Socratic Mentor.${conceptName ? ` I see you're working on "${conceptName.replace(/_/g, ' ')}".` : ''} I'll guide you with questions rather than direct answers. What would you like to explore?`;

            setMessages([{ role: 'assistant', content: greeting }]);
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // Focus input when opened (only in text mode)
    useEffect(() => {
        if (isOpen && !minimized && !voiceMode) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen, minimized, voiceMode]);

    // Auto-derive hint level from struggle zone
    const getHintLevel = useCallback(() => {
        if (zone === 'giving_up') return 4;
        if (zone === 'frustrated') return 3;
        if (zone === 'struggling') return 2;
        return 1;
    }, [zone]);

    // Core send function
    const sendMessage = useCallback(async (text, viaVoice = false) => {
        if (!text.trim() || loading) return;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: text.trim(), viaVoice }]);
        setLoading(true);

        const learnerId = getLearnerId() || 'demo_user';
        const hintLevel = getHintLevel();

        const { data, error } = await getHint({
            learner_id: learnerId,
            concept_id: conceptId || 'general',
            question: text.trim(),
            hint_level: hintLevel,
        });

        let responseText;
        if (error) {
            responseText = generateLocalMentorResponse(text, conceptName, hintLevel);
        } else {
            responseText = data.hint || data.message || 'Think about this step by step...';
        }

        setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
        setLoading(false);

        // Auto-speak response if voice mode is on
        if (autoSpeak && (viaVoice || voiceMode)) {
            // Small delay so the text appears first
            setTimeout(() => voice.speak(responseText), 200);
        }
    }, [loading, conceptId, conceptName, getHintLevel, autoSpeak, voiceMode, voice]);

    const handleSend = useCallback((overrideMsg) => {
        sendMessage(overrideMsg || input, false);
    }, [input, sendMessage]);

    const handleSendVoice = useCallback((text) => {
        sendMessage(text, true);
    }, [sendMessage]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Voice orb click handler
    const handleOrbClick = useCallback(() => {
        if (voice.isSpeaking) {
            voice.stopSpeaking();
        } else if (voice.isListening) {
            voice.stopListening();
        } else {
            voice.startListening();
        }
    }, [voice]);

    // Quick prompts based on struggle context
    const quickPrompts = isStruggling
        ? [
            "I'm stuck, where do I start?",
            "What am I doing wrong?",
            "Can you give me a simpler example?",
        ]
        : [
            "Explain this concept",
            "Give me an analogy",
            "What should I focus on?",
        ];

    // Determine voice orb state
    const orbState = loading ? 'processing' : voice.voiceState;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: 420, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 420, opacity: 0 }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="fixed bottom-0 right-4 z-50 flex flex-col rounded-t-2xl border border-b-0 shadow-2xl overflow-hidden"
                    style={{
                        width: 380,
                        height: minimized ? 52 : voiceMode ? 580 : 520,
                        maxHeight: 'calc(100vh - 80px)',
                        backgroundColor: '#141414',
                        borderColor: '#333333',
                        boxShadow: '-4px -4px 40px rgba(42,32,24,0.15)',
                        transition: 'height 0.3s ease',
                    }}
                >
                    {/* ── Header ── */}
                    <div
                        className="flex items-center justify-between px-4 py-2.5 border-b cursor-pointer select-none"
                        style={{ borderColor: '#333333', background: `linear-gradient(135deg, ${zoneColor}08, transparent)` }}
                        onClick={() => setMinimized(!minimized)}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-lg bg-gradient-to-br from-[#E50914]/20 to-[#E87C03]/10 border border-[#E50914]/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>psychology</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold text-[#E5E5E5]">Socratic Mentor</span>
                                    {isStruggling && (
                                        <span className="relative flex size-2">
                                            <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: zoneColor, opacity: 0.5 }} />
                                            <span className="relative inline-flex rounded-full size-2" style={{ backgroundColor: zoneColor }} />
                                        </span>
                                    )}
                                </div>
                                <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: zoneColor }}>
                                    {conceptName ? conceptName.replace(/_/g, ' ') : 'Ready to help'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Voice mode toggle */}
                            {voice.supported && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setVoiceMode(!voiceMode); }}
                                    className={`p-1 rounded-md transition-all ${voiceMode ? 'bg-[#E50914]/15 text-[#E50914]' : 'text-[#808080] hover:text-[#E5E5E5]'}`}
                                    title={voiceMode ? 'Switch to text' : 'Switch to voice'}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                                        {voiceMode ? 'keyboard' : 'mic'}
                                    </span>
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); setMinimized(!minimized); }}
                                className="text-[#808080] hover:text-[#E5E5E5] transition-colors p-1"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                                    {minimized ? 'expand_less' : 'expand_more'}
                                </span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); voice.stopSpeaking(); voice.stopListening(); onClose(); }}
                                className="text-[#808080] hover:text-[#E5E5E5] transition-colors p-1"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                            </button>
                        </div>
                    </div>

                    {!minimized && (
                        <>
                            {/* ── Struggle Context Bar (when struggling) ── */}
                            {isStruggling && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className="px-4 py-2 border-b flex items-center gap-2"
                                    style={{ borderColor: '#2E2E2E', backgroundColor: `${zoneColor}08` }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: zoneColor }}>{zoneMeta.icon || 'warning'}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: zoneColor }}>
                                        {zoneMeta.label || zone} · Score {score}/100
                                    </span>
                                    <div className="flex-1 h-1.5 bg-[#2E2E2E] rounded-full overflow-hidden ml-2">
                                        <div className="h-full rounded-full" style={{ backgroundColor: zoneColor, width: `${Math.min(score, 100)}%` }} />
                                    </div>
                                </motion.div>
                            )}

                            {/* ── Messages ── */}
                            <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3">
                                <div className="relative min-h-full">
                                    <div
                                        className="absolute inset-0 pointer-events-none opacity-20"
                                        style={{
                                            backgroundImage: 'radial-gradient(rgba(193,124,100,0.05) 1px, transparent 1px)',
                                            backgroundSize: '20px 20px',
                                        }}
                                    />
                                    <div className="relative z-10">
                                        {messages.map((m, i) => (
                                            <ChatBubble key={i} message={m} />
                                        ))}
                                        <AnimatePresence>
                                            {loading && <TypingDots />}
                                        </AnimatePresence>
                                        <div ref={messagesEndRef} />
                                    </div>
                                </div>
                            </div>

                            {/* ── Quick Prompts ── */}
                            {messages.length <= 2 && !voiceMode && (
                                <div className="px-4 py-2 border-t flex flex-wrap gap-1.5" style={{ borderColor: '#2E2E2E' }}>
                                    {quickPrompts.map((q) => (
                                        <button
                                            key={q}
                                            onClick={() => handleSend(q)}
                                            className="text-[10px] text-[#B3B3B3] hover:text-[#E50914] border border-[#333333] hover:border-[#E50914]/30 px-2.5 py-1 rounded-full transition-colors bg-[#1E1E1E]/50"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* ── Voice Mode: Orb Interface ── */}
                            {voiceMode && (
                                <div className="px-3 py-4 border-t flex flex-col items-center gap-3" style={{ borderColor: '#333333', backgroundColor: 'rgba(255,255,255,0.3)' }}>
                                    {/* Voice Orb */}
                                    <VoiceOrb
                                        state={orbState}
                                        audioLevel={voice.audioLevel}
                                        onClick={handleOrbClick}
                                        size={72}
                                    />

                                    {/* Live transcript */}
                                    {voice.isListening && voice.transcript && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-xs text-[#B3B3B3] text-center px-4 italic mt-1"
                                        >
                                            "{voice.transcript}"
                                        </motion.p>
                                    )}

                                    {/* Auto-speak toggle */}
                                    <div className="flex items-center gap-2 mt-1">
                                        <button
                                            onClick={() => setAutoSpeak(!autoSpeak)}
                                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all ${
                                                autoSpeak
                                                    ? 'bg-[#46D369]/15 text-[#46D369] border border-[#46D369]/30'
                                                    : 'bg-[#EDE4D8] text-[#808080] border border-[#333333]'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>
                                                {autoSpeak ? 'volume_up' : 'volume_off'}
                                            </span>
                                            Auto-speak {autoSpeak ? 'ON' : 'OFF'}
                                        </button>
                                    </div>

                                    {/* Text input fallback in voice mode */}
                                    <div className="w-full flex items-center gap-2 mt-1">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            placeholder="Or type here..."
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            disabled={loading}
                                            className="flex-1 bg-[#141414] border border-[#333333] rounded-full py-2 pl-3 pr-3 text-[11px] text-[#E5E5E5] placeholder-[#808080] focus:ring-1 focus:ring-[#E50914] focus:border-[#E50914] transition-all outline-none disabled:opacity-50"
                                        />
                                        <button
                                            onClick={() => handleSend()}
                                            disabled={!input.trim() || loading}
                                            className="size-8 rounded-full bg-[#E50914] text-white flex items-center justify-center shrink-0 hover:brightness-110 transition-all disabled:opacity-40 shadow-[0_0_12px_rgba(193,124,100,0.2)]"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>send</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── Text Mode: Input Bar ── */}
                            {!voiceMode && (
                                <div className="px-3 py-3 border-t bg-[#1E1E1E]/50" style={{ borderColor: '#333333' }}>
                                    <div className="flex items-center gap-2">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            placeholder={`Ask about ${conceptName ? conceptName.replace(/_/g, ' ') : 'this concept'}...`}
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            disabled={loading}
                                            className="flex-1 bg-[#141414] border border-[#333333] rounded-full py-2.5 pl-4 pr-4 text-xs text-[#E5E5E5] placeholder-[#808080] focus:ring-1 focus:ring-[#E50914] focus:border-[#E50914] transition-all outline-none disabled:opacity-50"
                                        />
                                        {/* Mic button in text mode */}
                                        {voice.supported && (
                                            <button
                                                onClick={() => {
                                                    if (voice.isListening) {
                                                        voice.stopListening();
                                                    } else {
                                                        voice.startListening();
                                                    }
                                                }}
                                                className={`size-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                                    voice.isListening
                                                        ? 'bg-[#E87C03] text-white animate-pulse shadow-[0_0_15px_rgba(212,165,116,0.4)]'
                                                        : 'bg-[#EDE4D8] text-[#808080] hover:text-[#E50914] hover:bg-[#E50914]/10'
                                                }`}
                                                title={voice.isListening ? 'Stop listening' : 'Voice input'}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                                                    {voice.isListening ? 'mic' : 'mic_none'}
                                                </span>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleSend()}
                                            disabled={!input.trim() || loading}
                                            className="size-9 rounded-full bg-[#E50914] text-white flex items-center justify-center shrink-0 hover:brightness-110 transition-all disabled:opacity-40 shadow-[0_0_15px_rgba(193,124,100,0.2)]"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ─── Local fallback mentor response ───────────────────────────────────────────

function generateLocalMentorResponse(question, conceptName, hintLevel) {
    const concept = (conceptName || 'this concept').replace(/_/g, ' ');
    const q = question.toLowerCase();

    if (hintLevel >= 4) {
        if (q.includes('stuck') || q.includes('wrong') || q.includes('help'))
            return `Let's break ${concept} down into smaller pieces.\n\nThe key idea is: ${concept} works by taking input, processing it through a specific set of rules, and producing output.\n\n1. First, identify what your input is\n2. Then, think about what transformation needs to happen\n3. Finally, verify your output matches expectations\n\nTry applying each step one at a time. Which step is giving you trouble?`;
        return `Here's the core of ${concept}:\n\nIt's essentially a pattern where you define a structure, apply rules to transform data, and produce a result. The most common mistake is skipping the middle step.\n\nTry writing out the steps on paper first, then translate to code.`;
    }

    if (hintLevel >= 3) {
        if (q.includes('example') || q.includes('simpler'))
            return `Think of ${concept} like a recipe:\n\n- You have ingredients (inputs)\n- You follow steps (the algorithm/process)\n- You get a dish (output)\n\nWhat are your "ingredients" in this problem? Try listing them out.`;
        return `Good question about ${concept}! Let me guide you:\n\nThe fundamental principle here is about breaking the problem into parts. What's the first thing that needs to happen before everything else? Start there.`;
    }

    if (hintLevel >= 2) {
        if (q.includes('start') || q.includes('begin'))
            return `Here's a clue: start by looking at what you already know about ${concept}. What's the simplest version of this problem you could solve? Try that first, then build up.`;
        return `Think about what ${concept} has in common with things you already understand. What patterns do you see? That connection is your key.`;
    }

    if (q.includes('stuck'))
        return `Being stuck is part of learning! Take a step back — what part of ${concept} do you feel most confident about? Start from there and work outward.`;
    if (q.includes('wrong'))
        return `Let's check your assumptions. What do you expect to happen, and what's actually happening? The gap between those two is where the answer lies.`;
    return `Interesting question! Before I guide you further, try explaining ${concept} in your own words. What do you think it means? Sometimes articulating it reveals what you're missing.`;
}

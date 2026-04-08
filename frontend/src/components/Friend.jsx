'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getHint, getLearnerId } from '@/lib/api';

const HINT_LEVELS = [
    { level: 1, label: 'Nudge', icon: 'lightbulb', color: '#46D369', desc: 'A gentle push in the right direction' },
    { level: 2, label: 'Hint', icon: 'tips_and_updates', color: '#E87C03', desc: 'A hint with an analogy' },
    { level: 3, label: 'Explain', icon: 'school', color: '#E50914', desc: 'Near-complete explanation' },
    { level: 4, label: 'Answer', icon: 'check_circle', color: '#7C9EB8', desc: 'Full answer revealed' },
];

export default function Friend({ context = {}, onPauseVideo }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [hintLevel, setHintLevel] = useState(1);
    const [isListening, setIsListening] = useState(false);
    const chatEndRef = useRef(null);
    const recognitionRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Welcome message
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                role: 'friend',
                text: `Hey! I'm F.R.I.E.N.D — your learning buddy. I'm here to help you with anything${context.episodeName ? ` while you study "${context.episodeName}"` : ''}. Ask me a doubt, request a hint, or just chat! I won't give answers easily though — I'll guide you to think.`,
                time: new Date(),
            }]);
        }
    }, [isOpen, context.episodeName]);

    const sendMessage = async (text) => {
        if (!text.trim()) return;
        const userMsg = { role: 'user', text: text.trim(), time: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        const learnerId = getLearnerId();
        try {
            const { data, error } = await getHint({
                learner_id: learnerId,
                concept_id: context.conceptId || context.episodeId || 'general',
                question: text.trim(),
                hint_level: hintLevel,
                context: {
                    tab: context.activeTab || 'general',
                    episode: context.episodeName || '',
                    topic: context.topic || '',
                },
            });

            const reply = data?.hint || data?.response || data?.message || 'Hmm, let me think about that differently. Could you rephrase your question?';

            setMessages(prev => [...prev, {
                role: 'friend',
                text: reply,
                time: new Date(),
                level: hintLevel,
            }]);

            // Auto-escalate hint level for next message
            if (hintLevel < 4) setHintLevel(prev => Math.min(prev + 1, 4));
        } catch (e) {
            setMessages(prev => [...prev, {
                role: 'friend',
                text: "I'm having trouble connecting right now. Try again in a moment!",
                time: new Date(),
            }]);
        }
        setLoading(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    // Voice input
    const toggleVoice = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN';

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
            setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
    };

    const resetHintLevel = () => {
        setHintLevel(1);
    };

    const currentHint = HINT_LEVELS.find(h => h.level === hintLevel);

    return (
        <>
            {/* ═══ Floating Buddy Button ═══ */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 size-16 rounded-full flex items-center justify-center shadow-2xl transition-all"
                style={{
                    background: isOpen ? '#1A1A1A' : 'linear-gradient(135deg, #E50914, #E87C03)',
                    boxShadow: isOpen ? '0 4px 20px rgba(0,0,0,0.3)' : '0 0 30px rgba(229,9,20,0.5), 0 8px 32px rgba(0,0,0,0.2)',
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
            >
                <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {isOpen ? 'close' : 'emoji_people'}
                </span>
                {/* Unread indicator */}
                {!isOpen && messages.length > 0 && (
                    <span className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
            </motion.button>

            {/* ═══ Chat Panel ═══ */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ type: 'spring', damping: 20 }}
                        className="fixed bottom-24 right-6 z-50 w-96 max-h-[70vh] bg-[#1A1A1A] border border-[#333333] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#141414] to-[#1A1A1A] px-5 py-4 flex items-center gap-3">
                            <div className="size-10 rounded-full bg-gradient-to-br from-[#E50914] to-[#E87C03] flex items-center justify-center">
                                <span className="material-symbols-outlined text-white" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>emoji_people</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-bold text-sm">F.R.I.E.N.D</h3>
                                <p className="text-white/40 text-[10px]">
                                    {context.episodeName ? `Watching: ${context.episodeName}` : context.activeTab ? `On: ${context.activeTab}` : 'Your learning buddy'}
                                </p>
                            </div>
                            {/* Hint Level Indicator */}
                            <div className="flex items-center gap-1">
                                {HINT_LEVELS.map((h) => (
                                    <button
                                        key={h.level}
                                        onClick={() => setHintLevel(h.level)}
                                        title={`${h.label}: ${h.desc}`}
                                        className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                            hintLevel >= h.level ? 'text-white' : 'text-white/20'
                                        }`}
                                        style={{ backgroundColor: hintLevel >= h.level ? h.color : 'rgba(255,255,255,0.05)' }}
                                    >
                                        {h.level}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Hint level banner */}
                        <div className="px-4 py-2 flex items-center justify-between border-b border-[#2E2E2E]" style={{ backgroundColor: `${currentHint.color}08` }}>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined" style={{ fontSize: 14, color: currentHint.color }}>{currentHint.icon}</span>
                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: currentHint.color }}>
                                    Level {hintLevel}: {currentHint.label}
                                </span>
                            </div>
                            <button onClick={resetHintLevel} className="text-[10px] text-[#808080] hover:text-[#E50914] transition-colors">
                                Reset to L1
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: 350, scrollbarWidth: 'thin' }}>
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                                        msg.role === 'user'
                                            ? 'bg-[#E50914] text-white rounded-br-md'
                                            : 'bg-[#181818] border border-[#2E2E2E] text-[#E5E5E5] rounded-bl-md'
                                    }`}>
                                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                        {msg.level && (
                                            <p className="text-[9px] mt-1 opacity-50">Hint Level {msg.level}</p>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-[#181818] border border-[#2E2E2E] rounded-2xl rounded-bl-md px-4 py-3">
                                        <div className="flex gap-1.5">
                                            <div className="size-2 bg-[#E50914] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="size-2 bg-[#E50914] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="size-2 bg-[#E50914] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Quick Actions */}
                        {context.activeTab === 'series' && (
                            <div className="px-4 py-2 border-t border-[#2E2E2E] flex gap-2">
                                <button
                                    onClick={() => { onPauseVideo?.(); sendMessage("Can you explain what was just discussed in the video?"); }}
                                    className="text-[10px] font-bold text-[#E50914] bg-[#E50914]/8 px-3 py-1.5 rounded-full hover:bg-[#E50914]/15 transition-colors"
                                >
                                    Pause & Explain
                                </button>
                                <button
                                    onClick={() => sendMessage("I didn't understand the last concept. Can you simplify it?")}
                                    className="text-[10px] font-bold text-[#E87C03] bg-[#E87C03]/8 px-3 py-1.5 rounded-full hover:bg-[#E87C03]/15 transition-colors"
                                >
                                    Simplify
                                </button>
                            </div>
                        )}

                        {/* Input */}
                        <div className="px-4 py-3 border-t border-[#2E2E2E] bg-[#1A1A1A]">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={toggleVoice}
                                    className={`size-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                                        isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-[#181818] text-[#808080] hover:text-[#E50914]'
                                    }`}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                        {isListening ? 'mic' : 'mic_none'}
                                    </span>
                                </button>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask me anything..."
                                    className="flex-1 bg-[#181818] border border-[#2E2E2E] rounded-xl px-4 py-2.5 text-sm text-[#E5E5E5] placeholder-[#808080] focus:outline-none focus:border-[#E50914]/50 transition-colors"
                                />
                                <button
                                    onClick={() => sendMessage(input)}
                                    disabled={!input.trim() || loading}
                                    className="size-10 rounded-full bg-[#E50914] text-white flex items-center justify-center flex-shrink-0 hover:brightness-110 transition-all disabled:opacity-30"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

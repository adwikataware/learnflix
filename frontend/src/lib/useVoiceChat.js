"use client";

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * useVoiceChat — browser-native voice input/output for the mentor chat.
 * Uses Web Speech API for STT and SpeechSynthesis for TTS.
 *
 * Inspired by the eFLEX LOOP architecture (github.com/Aditya-Patil27/chat-bot)
 * but adapted for browser environment.
 *
 * Returns: { isListening, isSpeaking, voiceState, startListening, stopListening,
 *            speak, stopSpeaking, transcript, audioLevel, supported }
 */
export default function useVoiceChat({ onTranscript, lang = 'en-US' } = {}) {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [audioLevel, setAudioLevel] = useState(0);
    const [supported, setSupported] = useState(false);

    const recognitionRef = useRef(null);
    const analyserRef = useRef(null);
    const audioContextRef = useRef(null);
    const animFrameRef = useRef(null);
    const streamRef = useRef(null);
    const synthRef = useRef(null);

    // voiceState: 'idle' | 'listening' | 'processing' | 'speaking'
    const voiceState = isSpeaking ? 'speaking' : isListening ? 'listening' : 'idle';

    // Check browser support
    useEffect(() => {
        const hasSpeechRecognition = typeof window !== 'undefined' &&
            (window.SpeechRecognition || window.webkitSpeechRecognition);
        const hasSpeechSynthesis = typeof window !== 'undefined' && window.speechSynthesis;
        setSupported(!!(hasSpeechRecognition && hasSpeechSynthesis));

        if (typeof window !== 'undefined') {
            synthRef.current = window.speechSynthesis;
        }

        return () => {
            stopAudioAnalysis();
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch {}
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Audio level analysis (for orb animation) ─────────────────────────
    const startAudioAnalysis = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            analyserRef.current.smoothingTimeConstant = 0.8;
            source.connect(analyserRef.current);

            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

            const updateLevel = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                // Calculate RMS-like level (0-1)
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i] * dataArray[i];
                }
                const rms = Math.sqrt(sum / dataArray.length) / 255;
                setAudioLevel(rms);
                animFrameRef.current = requestAnimationFrame(updateLevel);
            };
            updateLevel();
        } catch (e) {
            console.warn('[VoiceChat] Mic access denied:', e);
        }
    }, []);

    const stopAudioAnalysis = useCallback(() => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (audioContextRef.current) {
            try { audioContextRef.current.close(); } catch {}
            audioContextRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        analyserRef.current = null;
        setAudioLevel(0);
    }, []);

    // ── Speech-to-Text ──────────────────────────────────────────────────
    const startListening = useCallback(() => {
        if (!supported) return;

        // Stop any ongoing speech first
        if (synthRef.current?.speaking) {
            synthRef.current.cancel();
            setIsSpeaking(false);
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = lang;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            startAudioAnalysis();
        };

        recognition.onresult = (event) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += t;
                } else {
                    interim += t;
                }
            }
            setTranscript(final || interim);
            if (final) {
                onTranscript?.(final);
            }
        };

        recognition.onerror = (event) => {
            console.warn('[VoiceChat] Recognition error:', event.error);
            setIsListening(false);
            stopAudioAnalysis();
        };

        recognition.onend = () => {
            setIsListening(false);
            stopAudioAnalysis();
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [supported, lang, onTranscript, startAudioAnalysis, stopAudioAnalysis]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch {}
        }
        setIsListening(false);
        stopAudioAnalysis();
    }, [stopAudioAnalysis]);

    // ── Text-to-Speech ──────────────────────────────────────────────────
    const speak = useCallback((text) => {
        if (!synthRef.current || !text) return;

        // Cancel any ongoing speech
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to pick a good voice
        const voices = synthRef.current.getVoices();
        const preferred = voices.find(v =>
            v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google'))
        ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
        if (preferred) utterance.voice = preferred;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synthRef.current.speak(utterance);
    }, [lang]);

    const stopSpeaking = useCallback(() => {
        if (synthRef.current?.speaking) {
            synthRef.current.cancel();
        }
        setIsSpeaking(false);
    }, []);

    return {
        isListening,
        isSpeaking,
        voiceState,
        startListening,
        stopListening,
        speak,
        stopSpeaking,
        transcript,
        audioLevel,
        supported,
    };
}

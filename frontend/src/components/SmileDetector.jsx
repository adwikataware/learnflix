'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

export default function SmileDetector({ onSmileComplete, smileThreshold = 70 }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const animRef = useRef(null);
    const faceapiRef = useRef(null);
    const [smilePercent, setSmilePercent] = useState(0);
    const [modelLoading, setModelLoading] = useState(true);
    const [cameraError, setCameraError] = useState(null);
    const [faceDetected, setFaceDetected] = useState(false);
    const [smileUnlocked, setSmileUnlocked] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function init() {
            try {
                const faceapi = await import('@vladmandic/face-api');
                faceapiRef.current = faceapi;

                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
                    faceapi.nets.faceExpressionNet.loadFromUri('/models'),
                ]);

                if (cancelled) return;
                setModelLoading(false);

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 480, height: 360, facingMode: 'user' },
                });
                if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }

                const detect = async () => {
                    if (cancelled || !videoRef.current || !faceapiRef.current) return;
                    const fapi = faceapiRef.current;

                    const result = await fapi.detectSingleFace(
                        videoRef.current,
                        new fapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
                    ).withFaceExpressions();

                    if (result) {
                        setFaceDetected(true);
                        const happy = Math.round((result.expressions.happy || 0) * 100);
                        setSmilePercent(happy);
                        if (happy >= smileThreshold) setSmileUnlocked(true);
                    } else {
                        setFaceDetected(false);
                        setSmilePercent(0);
                    }
                    animRef.current = requestAnimationFrame(detect);
                };

                setTimeout(() => { if (!cancelled) detect(); }, 500);
            } catch (err) {
                if (!cancelled) {
                    setCameraError(err.name === 'NotAllowedError'
                        ? 'Camera access denied. Please allow camera and refresh.'
                        : 'Could not start camera.');
                }
            }
        }

        init();
        return () => {
            cancelled = true;
            if (animRef.current) cancelAnimationFrame(animRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        };
    }, [smileThreshold]);

    useEffect(() => {
        if (smileUnlocked) onSmileComplete?.();
    }, [smileUnlocked, onSmileComplete]);

    const meterColor = smilePercent >= 70 ? '#46D369' : smilePercent >= 40 ? '#E87C03' : '#E50914';

    if (cameraError) {
        return (
            <div className="flex flex-col items-center gap-3 py-6">
                <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 36 }}>videocam_off</span>
                <p className="text-sm text-[#808080] text-center max-w-xs">{cameraError}</p>
                <button onClick={() => onSmileComplete?.()}
                    className="mt-2 px-4 py-2 rounded-lg border border-[#333] text-[#808080] text-sm hover:border-[#E50914]/40 transition-colors">
                    Skip for now
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Camera */}
            <div className="relative rounded-xl overflow-hidden border-2 border-[#333] bg-black" style={{ width: 280, height: 210 }}>
                {modelLoading && (
                    <div className="absolute inset-0 bg-[#141414] flex flex-col items-center justify-center z-10">
                        <div className="w-8 h-8 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin mb-3" />
                        <p className="text-xs text-[#808080]">Loading face detection...</p>
                    </div>
                )}
                <video ref={videoRef} className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} muted playsInline />

                {!modelLoading && (
                    <div className={`absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${
                        faceDetected ? 'bg-[#46D369]/90 text-white' : 'bg-[#E50914]/90 text-white'
                    }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${faceDetected ? 'bg-white' : 'bg-white/50 animate-pulse'}`} />
                        {faceDetected ? 'Face detected' : 'No face'}
                    </div>
                )}

                {smileUnlocked && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-[#46D369]/20 flex items-center justify-center">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10 }}
                            className="bg-[#141414] rounded-full p-3 shadow-lg border border-[#46D369]/40">
                            <span className="material-symbols-outlined text-[#46D369]" style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>
                                sentiment_very_satisfied
                            </span>
                        </motion.div>
                    </motion.div>
                )}
            </div>

            {/* Smile meter */}
            <div className="w-72">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[#B3B3B3] font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>mood</span>
                        Smile Meter
                    </span>
                    <span className="text-xs font-bold" style={{ color: meterColor }}>{smilePercent}%</span>
                </div>
                <div className="w-full h-3 bg-[#2E2E2E] rounded-full overflow-hidden relative">
                    <motion.div className="h-full rounded-full"
                        style={{ backgroundColor: meterColor }}
                        animate={{ width: `${smilePercent}%` }}
                        transition={{ duration: 0.15 }} />
                    <div className="absolute top-0 h-full w-0.5 bg-white/30" style={{ left: `${smileThreshold}%` }} />
                </div>
                <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] text-[#808080]">0</span>
                    <span className="text-[9px] text-[#808080]">Smile to unlock →</span>
                    <span className="text-[9px] text-[#808080]">100</span>
                </div>
            </div>

            <p className="text-sm text-center">
                {smileUnlocked ? (
                    <span className="text-[#46D369] font-bold flex items-center gap-1 justify-center">
                        <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        Beautiful smile! Let's go!
                    </span>
                ) : faceDetected ? (
                    <span className="text-[#E87C03]">Almost... give us a big smile!</span>
                ) : (
                    <span className="text-[#808080]">Look at the camera</span>
                )}
            </p>
        </div>
    );
}

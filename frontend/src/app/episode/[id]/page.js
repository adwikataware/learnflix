"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    getEpisode, postProgress, executeCode, getLearnerId, updateBKT,
    getHint, signalStruggle, generateManimVideo, getManimVideoStatus, generateVisualizations,
    getUploadUrl, generateNotesFromUpload
} from '@/lib/api';
import dynamic from 'next/dynamic';
const D3VisualizationEngine = dynamic(() => import('@/components/visualizations/D3VisualizationEngine'), { ssr: false });
import { motion, AnimatePresence } from 'framer-motion';
import { getBestProblem } from '@/lib/problemBank';

// ─── Video Section (auto-generate on load) ─────────────────────────────────────

function VideoSection({ conceptId, conceptName, learnerId }) {
    const [status, setStatus] = useState('idle'); // idle | generating | polling | ready | error
    const [videoUrl, setVideoUrl] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [elapsed, setElapsed] = useState(0);
    const pollRef = useRef(null);
    const timerRef = useRef(null);
    const videoRef = useRef(null);

    const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    const cleanup = useCallback(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
    }, []);

    const startGeneration = useCallback(async () => {
        cleanup();
        setStatus('generating');
        setErrorMsg('');
        setElapsed(0);

        timerRef.current = setInterval(() => {
            setElapsed(prev => prev + 1);
        }, 1000);

        const prompt = `Explain ${conceptName || conceptId || 'this concept'} step by step with visual animations`;

        const { data, error } = await generateManimVideo({
            learner_id: learnerId || 'demo_learner_001',
            concept_id: conceptId,
            prompt,
        });

        if (error) {
            cleanup();
            setStatus('error');
            setErrorMsg(error);
            return;
        }

        // Cache hit
        if (data?.status === 'Completed' && data?.video_url) {
            cleanup();
            setVideoUrl(data.video_url);
            setStatus('ready');
            return;
        }

        const jobId = data?.job_id;
        if (!jobId) {
            cleanup();
            setStatus('error');
            setErrorMsg('No job ID returned from video generation.');
            return;
        }

        setStatus('polling');

        pollRef.current = setInterval(async () => {
            const { data: statusData, error: statusError } = await getManimVideoStatus(jobId);
            if (statusError) {
                cleanup();
                setStatus('error');
                setErrorMsg(statusError);
                return;
            }
            const st = (statusData?.status || '').toLowerCase();
            if (st === 'completed' && statusData?.video_url) {
                cleanup();
                setVideoUrl(statusData.video_url);
                setStatus('ready');
            } else if (st === 'failed') {
                cleanup();
                setStatus('error');
                setErrorMsg(statusData?.failure_message || 'Animation rendering failed.');
            }
        }, 5000);
    }, [conceptId, conceptName, learnerId, cleanup]);

    // Auto-start on mount
    useEffect(() => {
        startGeneration();
        return cleanup;
    }, [startGeneration, cleanup]);

    return (
        <div className="aspect-video rounded-2xl overflow-hidden bg-card-dark border border-border-dark relative">
            {/* Generating / Polling state */}
            {(status === 'generating' || status === 'polling') && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    {/* Animated background pulse */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-[#00ace0]/5 to-transparent"
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />

                    {/* Progress ring */}
                    <div className="relative size-20">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="34" fill="none" stroke="#2a3642" strokeWidth="5" />
                            <motion.circle
                                cx="40" cy="40" r="34" fill="none" stroke="#00ace0" strokeWidth="5"
                                strokeDasharray={214}
                                strokeLinecap="round"
                                animate={{ strokeDashoffset: [214, 0] }}
                                transition={{ duration: 60, ease: 'linear' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-sm font-mono text-white font-bold">{formatTime(elapsed)}</span>
                        </div>
                    </div>

                    <div className="text-center relative z-10">
                        <p className="text-white font-semibold text-sm">
                            {status === 'generating' ? 'Generating visual explanation...' : 'Rendering animation...'}
                        </p>
                        <p className="text-slate-500 text-xs mt-1">This usually takes 30-60 seconds</p>
                    </div>

                    {/* Animated bars */}
                    <div className="flex gap-1">
                        {[0, 1, 2, 3, 4].map((i) => (
                            <motion.div
                                key={i}
                                className="w-1 h-5 bg-[#00ace0]/60 rounded-full"
                                animate={{ scaleY: [0.4, 1, 0.4] }}
                                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Ready state */}
            {status === 'ready' && videoUrl && (
                <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-contain bg-black"
                />
            )}

            {/* Error state */}
            {status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <span className="material-symbols-outlined text-red-400" style={{ fontSize: 36 }}>error</span>
                    <p className="text-red-400 text-sm text-center max-w-xs">{errorMsg}</p>
                    <button
                        onClick={startGeneration}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00ace0]/15 text-[#00ace0] text-sm font-semibold border border-[#00ace0]/30 hover:bg-[#00ace0]/25 transition-colors"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
                        Retry
                    </button>
                </div>
            )}

            {/* Idle / loading */}
            {status === 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="size-10 border-2 border-[#00ace0] border-t-transparent rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}

// ─── Mastery Checkpoint Overlay ─────────────────────────────────────────────────

function MasteryCheckpoint({ isOpen, masteryPct, xpEarned, onNextEpisode, onBackToConstellation }) {
    const circumference = 2 * Math.PI * 54;
    const mastered = masteryPct >= 80;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-[#050d17]/95 backdrop-blur-lg"
            >
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 200, delay: 0.1 }}
                    className="flex flex-col items-center gap-8 text-center max-w-md mx-4"
                >
                    {/* Circular progress */}
                    <div className="relative">
                        <svg width="140" height="140" viewBox="0 0 140 140">
                            <circle cx="70" cy="70" r="54" fill="none" stroke="#2a3642" strokeWidth="8" />
                            <motion.circle
                                cx="70" cy="70" r="54" fill="none"
                                stroke={mastered ? '#22c55e' : '#f0c14b'}
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset: circumference - (circumference * masteryPct / 100) }}
                                transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                                transform="rotate(-90 70 70)"
                            />
                        </svg>
                        <motion.div
                            className="absolute inset-0 flex flex-col items-center justify-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                        >
                            <span className="text-3xl font-bold text-white">{Math.round(masteryPct)}%</span>
                            <span className="text-xs text-slate-500">Mastery</span>
                        </motion.div>
                    </div>

                    {/* Message */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        {mastered ? (
                            <div className="flex items-center gap-3 text-[#f0c14b]">
                                <span className="material-symbols-outlined" style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                                <h2 className="text-3xl font-bold">Concept Mastered!</h2>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 text-[#00ace0]">
                                <span className="material-symbols-outlined" style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>bolt</span>
                                <h2 className="text-3xl font-bold">Keep Going!</h2>
                            </div>
                        )}
                    </motion.div>

                    {/* XP earned */}
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 1.0 }}
                        className="bg-[#00ace0]/15 border border-[#00ace0]/30 rounded-full px-6 py-3"
                    >
                        <span className="text-[#00ace0] font-bold text-lg">+{xpEarned} XP</span>
                    </motion.div>

                    {/* Buttons */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 1.3 }}
                        className="flex gap-4 mt-4"
                    >
                        <button
                            onClick={onBackToConstellation}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border-dark bg-surface-dark text-white text-sm font-semibold hover:border-[#00ace0]/40 transition-colors"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>home</span>
                            Back to Home
                        </button>
                        <button
                            onClick={onNextEpisode}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#00ace0] text-white text-sm font-bold hover:brightness-110 transition-all"
                        >
                            Next Episode
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                        </button>
                    </motion.div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ─── Mermaid Diagram ────────────────────────────────────────────────────────────

function MermaidDiagram({ chart, id }) {
    const [svg, setSvg] = useState('');

    useEffect(() => {
        if (!chart) return;
        let cancelled = false;
        import('mermaid').then(({ default: mermaid }) => {
            mermaid.initialize({
                startOnLoad: false,
                theme: 'dark',
                themeVariables: {
                    primaryColor: '#00ace0',
                    primaryTextColor: '#0f171e',
                    primaryBorderColor: '#00ace0',
                    lineColor: '#2a3642',
                    secondaryColor: '#1a242f',
                    tertiaryColor: '#2a3642',
                    fontFamily: 'Manrope, sans-serif',
                    fontSize: '14px',
                    background: '#0f171e',
                    mainBkg: '#1a242f',
                    nodeBorder: '#00ace0',
                },
            });
            const diagId = `mermaid-${id}-${Date.now()}`;
            mermaid.render(diagId, chart).then(({ svg: rendered }) => {
                if (!cancelled) setSvg(rendered);
            }).catch(() => {
                if (!cancelled) setSvg('');
            });
        });
        return () => { cancelled = true; };
    }, [chart, id]);

    if (!chart) return null;
    if (!svg) return (
        <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
            <span className="material-symbols-outlined animate-spin mr-2" style={{ fontSize: 18 }}>progress_activity</span>
            Rendering diagram...
        </div>
    );

    return (
        <div
            className="my-4 p-4 bg-[#050d17] rounded-xl border border-border-dark overflow-x-auto flex justify-center [&_svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}

// ─── Content Section ────────────────────────────────────────────────────────────

function ContentSection({ episode }) {
    const sections = episode.sections || [];
    const hasStructuredSections = sections.length > 0;

    if (hasStructuredSections) {
        return (
            <div className="space-y-6">
                {sections.map((section, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + idx * 0.08 }}
                        className="rounded-xl border border-border-dark overflow-hidden bg-card-dark"
                    >
                        <div className="px-6 py-4 flex items-center gap-3 border-b border-border-dark bg-[#0f171e]/50">
                            <div className="size-7 rounded-full bg-[#00ace0]/15 flex items-center justify-center text-[#00ace0] font-bold text-xs">
                                {idx + 1}
                            </div>
                            <h3 className="text-base font-semibold text-white">{section.title || `Section ${idx + 1}`}</h3>
                        </div>
                        <div className="p-6">
                            {section.diagram && <MermaidDiagram chart={section.diagram} id={`sec-${idx}`} />}
                            <div
                                className="prose-prime max-w-none"
                                dangerouslySetInnerHTML={{ __html: typeof section === 'string' ? section : (section.content || '') }}
                            />
                        </div>
                    </motion.div>
                ))}
            </div>
        );
    }

    // Fallback: raw HTML content
    if (episode.content) {
        return (
            <div
                className="prose-prime max-w-none"
                dangerouslySetInnerHTML={{ __html: episode.content.replace(/\n/g, '<br/>') }}
            />
        );
    }

    return <p className="text-slate-500">Content loading...</p>;
}

// ─── Code Section — SQL-only or multi-language based on topic ────────────────────

const DSA_LANGS = {
    python: { label: 'Python 3', ext: 'main.py', color: '#3572A5' },
    cpp:    { label: 'C++',      ext: 'main.cpp', color: '#f34b7d' },
    c:      { label: 'C',        ext: 'main.c',   color: '#555555' },
    java:   { label: 'Java',     ext: 'Main.java', color: '#b07219' },
};

function CodeSection({ episode, problem, problemType }) {
    const isSql = problemType === 'sql';
    const languages = isSql ? ['sql'] : Object.keys(DSA_LANGS);
    const [lang, setLang] = useState(isSql ? 'sql' : 'python');

    const getStarter = (l) => {
        if (!problem) return isSql ? '-- Write your SQL query here\n' : '# Write your solution here\n';
        if (isSql) return problem.starter_code || '-- Write your SQL query here\n';
        return problem.starters?.[l] || '# Write your solution here\n';
    };

    const [codeByLang, setCodeByLang] = useState(() => {
        const initial = {};
        languages.forEach(l => { initial[l] = getStarter(l); });
        return initial;
    });
    const [output, setOutput] = useState('');
    const [running, setRunning] = useState(false);

    const code = codeByLang[lang] || getStarter(lang);
    const setCode = (val) => setCodeByLang(prev => ({ ...prev, [lang]: val }));

    const handleRun = async () => {
        setRunning(true);
        setOutput('');
        const execLang = lang === 'cpp' ? 'cpp' : lang;
        const { data, error } = await executeCode({ code, language: execLang });
        if (error) {
            setOutput(`Error: ${error}`);
        } else {
            setOutput(data.error ? `Error:\n${data.error}` : data.output || 'Success (no output)');
            if (!data.error) {
                const learnerId = getLearnerId();
                if (learnerId) {
                    updateBKT({ learner_id: learnerId, concept_id: episode.concept_id, is_correct: true });
                }
            }
        }
        setRunning(false);
    };

    const handleReset = () => {
        setCode(getStarter(lang));
        setOutput('');
    };

    const fileName = isSql ? 'query.sql' : (DSA_LANGS[lang]?.ext || 'main.py');

    return (
        <div className="rounded-xl border border-border-dark overflow-hidden bg-card-dark">
            {/* Toolbar */}
            <div className="flex items-center justify-between bg-[#050d17] border-b border-border-dark px-3 py-2 gap-2 flex-wrap">
                {/* Language tabs — only show for DSA */}
                <div className="flex items-center gap-1">
                    {isSql ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00ace0]/15 text-[#00ace0] border border-[#00ace0]/30">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>database</span>
                            SQL
                        </div>
                    ) : (
                        languages.map(key => (
                            <button
                                key={key}
                                onClick={() => setLang(key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    lang === key
                                        ? 'bg-[#00d26a]/15 text-[#00d26a] border border-[#00d26a]/30'
                                        : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-border-dark'
                                }`}
                            >
                                <span className="size-2 rounded-full" style={{ background: DSA_LANGS[key].color }} />
                                {DSA_LANGS[key].label}
                            </button>
                        ))
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-white text-xs border border-transparent hover:border-border-dark transition-all"
                        title="Reset to template"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>restart_alt</span>
                        Reset
                    </button>
                    <button
                        onClick={handleRun}
                        disabled={running}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#00d26a] text-white text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50"
                    >
                        {running ? (
                            <span className="material-symbols-outlined animate-spin" style={{ fontSize: 14 }}>progress_activity</span>
                        ) : (
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>play_arrow</span>
                        )}
                        {running ? 'Running...' : 'Run Code'}
                    </button>
                </div>
            </div>

            {/* File name bar */}
            <div className="flex items-center gap-2 px-4 py-1.5 bg-[#080f18] border-b border-border-dark">
                <span className="material-symbols-outlined text-[#00d26a]" style={{ fontSize: 14 }}>description</span>
                <span className="text-xs font-mono text-slate-500">{fileName}</span>
            </div>

            {/* Editor with line numbers */}
            <div className="relative">
                <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-[#050d17] text-slate-300 p-5 pl-14 font-mono text-sm resize-none focus:outline-none min-h-[320px] leading-6"
                    spellCheck="false"
                    style={{ tabSize: 4 }}
                    onKeyDown={(e) => {
                        if (e.key === 'Tab') {
                            e.preventDefault();
                            const start = e.target.selectionStart;
                            const end = e.target.selectionEnd;
                            const spaces = '    ';
                            setCode(code.substring(0, start) + spaces + code.substring(end));
                            setTimeout(() => {
                                e.target.selectionStart = e.target.selectionEnd = start + 4;
                            }, 0);
                        }
                    }}
                />
                <div className="absolute top-0 left-0 w-10 h-full bg-[#050d17] border-r border-border-dark pointer-events-none">
                    <div className="p-5 pr-2 font-mono text-xs text-slate-700 leading-6 text-right select-none">
                        {code.split('\n').map((_, i) => (
                            <div key={i}>{i + 1}</div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Output console */}
            <div className="border-t border-border-dark bg-[#0f171e]">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-border-dark">
                    <span className="material-symbols-outlined text-[#00ace0]" style={{ fontSize: 14 }}>terminal</span>
                    <span className="text-xs text-[#00ace0] font-mono font-bold">Output</span>
                    {output && (
                        <button onClick={() => setOutput('')} className="ml-auto text-slate-600 hover:text-slate-400 transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                        </button>
                    )}
                </div>
                <div className={`p-4 font-mono text-sm min-h-[80px] whitespace-pre-wrap max-h-[200px] overflow-y-auto ${
                    output.startsWith('Error') ? 'text-red-400' : 'text-slate-400'
                }`}>
                    {output || 'No output yet. Click "Run Code" to execute.'}
                </div>
            </div>
        </div>
    );
}

// ─── PDF/PPT Upload & AI Notes Generator (S3 upload → server-side extraction) ────

function UploadNotesSection({ topic }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [generatedNotes, setGeneratedNotes] = useState(null);
    const [error, setError] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef(null);

    const handleFile = async (selectedFile) => {
        setError(null);
        setGeneratedNotes(null);
        const ext = selectedFile.name.split('.').pop().toLowerCase();
        if (!['pdf', 'ppt', 'pptx'].includes(ext)) {
            setError('Please upload a PDF or PPT/PPTX file.');
            return;
        }
        if (selectedFile.size > 10 * 1024 * 1024) {
            setError('File too large. Max 10MB.');
            return;
        }
        setFile(selectedFile);
    };

    const handleGenerate = async () => {
        if (!file) return;
        setUploading(true);
        setError(null);
        try {
            // Step 1: Get presigned S3 upload URL
            const { data: urlData, error: urlErr } = await getUploadUrl(file.name);
            if (urlErr || !urlData?.upload_url) {
                setError('Failed to get upload URL: ' + (urlErr || 'Unknown error'));
                setUploading(false);
                return;
            }

            // Step 2: Upload file directly to S3
            await fetch(urlData.upload_url, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': 'application/octet-stream' },
            });

            // Step 3: Call backend to extract text & generate notes
            const { data, error: apiErr } = await generateNotesFromUpload({
                s3_key: urlData.s3_key,
                file_name: file.name,
                topic: topic || '',
            });

            if (apiErr) {
                setError(typeof apiErr === 'string' ? apiErr : JSON.stringify(apiErr));
            } else if (data?.notes) {
                setGeneratedNotes({ html: data.notes, source: file.name });
            } else {
                setError('No notes were generated. Please try again.');
            }
        } catch (e) {
            setError('Failed to process file: ' + e.message);
        }
        setUploading(false);
    };

    return (
        <div className="mt-8">
            {/* Upload Card */}
            <div className="bg-card-dark border border-border-dark rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-[#a855f7]" style={{ fontSize: 22 }}>upload_file</span>
                    <h3 className="text-base font-bold text-white">Upload Your Notes</h3>
                    <span className="text-xs text-slate-500 ml-2">PDF, PPT, PPTX</span>
                </div>
                <p className="text-sm text-slate-400 mb-4">Upload your lecture slides or PDFs and our AI will generate comprehensive study notes for you.</p>

                {/* Drop Zone */}
                <div
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                        dragOver ? 'border-[#a855f7] bg-[#a855f7]/10' :
                        file ? 'border-emerald-500/50 bg-emerald-500/5' :
                        'border-border-dark hover:border-slate-500 hover:bg-white/[0.02]'
                    }`}
                >
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.ppt,.pptx"
                        className="hidden"
                        onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
                    />
                    {file ? (
                        <div className="flex items-center justify-center gap-3">
                            <span className="material-symbols-outlined text-emerald-400" style={{ fontSize: 28 }}>description</span>
                            <div className="text-left">
                                <p className="text-sm font-semibold text-white">{file.name}</p>
                                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setFile(null); setGeneratedNotes(null); }} className="ml-4 text-slate-500 hover:text-red-400 transition-colors">
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                            </button>
                        </div>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-slate-600 mb-2" style={{ fontSize: 40 }}>cloud_upload</span>
                            <p className="text-sm text-slate-400">Drop your file here or <span className="text-[#a855f7] font-semibold">browse</span></p>
                            <p className="text-xs text-slate-600 mt-1">PDF, PPT, PPTX up to 20MB</p>
                        </>
                    )}
                </div>

                {/* Generate Button */}
                {file && !generatedNotes && (
                    <button
                        onClick={handleGenerate}
                        disabled={uploading}
                        className="mt-4 w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-[#a855f7] text-white hover:bg-[#9333ea] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploading ? (
                            <>
                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Generating Notes...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>
                                Generate AI Notes
                            </>
                        )}
                    </button>
                )}

                {error && (
                    <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
                )}
            </div>

            {/* Generated Notes Display */}
            {generatedNotes && (
                <div className="mt-6 bg-card-dark border border-border-dark rounded-xl p-6 lg:p-8">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#a855f7]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                            <h3 className="text-base font-bold text-white">AI-Generated Notes</h3>
                        </div>
                        <span className="text-xs text-slate-500 bg-[#a855f7]/10 border border-[#a855f7]/20 px-2 py-1 rounded-full">
                            from {generatedNotes.source}
                        </span>
                    </div>
                    <div
                        className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed
                            [&_h2]:text-white [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3
                            [&_h3]:text-white [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2
                            [&_ul]:space-y-1 [&_li]:text-slate-300
                            [&_strong]:text-white [&_code]:text-[#00d26a] [&_code]:bg-[#00d26a]/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded"
                        dangerouslySetInnerHTML={{ __html: generatedNotes.html }}
                    />
                </div>
            )}
        </div>
    );
}

// ─── Code Lab Tab — 5 problems in sequence (2E, 2M, 1H) ─────────────────────────

function CodeLabTab({ episode, conceptId, problems, problemType }) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [completed, setCompleted] = useState({});
    const total = problems.length;
    const currentProblem = problems[currentIdx];
    const diffColor = { Easy: '#22c55e', Medium: '#f0c14b', Hard: '#ef4444' };

    if (!currentProblem) return <div className="text-slate-500 text-center py-10">No problems available for this topic.</div>;

    return (
        <motion.div
            key="code"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
        >
            {/* Progress bar — problem navigator */}
            <div className="bg-card-dark border border-border-dark rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                        Problem {currentIdx + 1} of {total}
                    </span>
                    <span className="text-xs text-slate-500">
                        {Object.keys(completed).length}/{total} solved
                    </span>
                </div>
                <div className="flex gap-1.5">
                    {problems.map((p, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentIdx(i)}
                            className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                                i === currentIdx
                                    ? 'text-white border-2'
                                    : completed[i]
                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-[#050d17] text-slate-500 border border-border-dark hover:border-slate-600'
                            }`}
                            style={i === currentIdx ? {
                                borderColor: diffColor[p.difficulty],
                                background: `${diffColor[p.difficulty]}15`,
                                color: diffColor[p.difficulty],
                            } : {}}
                        >
                            {completed[i] && <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check</span>}
                            Q{i + 1}
                            <span className="hidden sm:inline">· {p.difficulty[0]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Problem Statement */}
            <div className="bg-card-dark border border-border-dark rounded-xl p-6 mb-5">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-[#00d26a]" style={{ fontSize: 20 }}>description</span>
                    <h3 className="text-base font-bold text-white">{currentProblem.title}</h3>
                    <span className={`ml-auto text-xs px-2.5 py-0.5 rounded-full font-semibold border`}
                        style={{
                            background: `${diffColor[currentProblem.difficulty]}15`,
                            color: diffColor[currentProblem.difficulty],
                            borderColor: `${diffColor[currentProblem.difficulty]}40`,
                        }}
                    >
                        {currentProblem.difficulty}
                    </span>
                </div>

                <div
                    className="text-sm text-slate-300 leading-relaxed mb-4 [&_code]:bg-[#050d17] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[#00ace0] [&_code]:font-mono [&_code]:text-xs [&_b]:text-white [&_b]:font-semibold [&_pre]:bg-[#050d17] [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:my-2 [&_pre]:border [&_pre]:border-border-dark [&_pre]:font-mono [&_pre]:text-xs [&_pre]:text-slate-400 [&_ul]:space-y-1 [&_ul]:my-2 [&_ul]:ml-4 [&_ul]:list-disc [&_li]:text-slate-400"
                    dangerouslySetInnerHTML={{ __html: currentProblem.description }}
                />

                {currentProblem.input_format && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                            <h4 className="text-xs font-bold text-[#00d26a] uppercase tracking-wider mb-2">Input Format</h4>
                            <p className="text-xs text-slate-400 whitespace-pre-line">{currentProblem.input_format}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-[#00d26a] uppercase tracking-wider mb-2">Output Format</h4>
                            <p className="text-xs text-slate-400 whitespace-pre-line">{currentProblem.output_format}</p>
                        </div>
                    </div>
                )}

                {/* Sample I/O */}
                <div className="mt-5 pt-4 border-t border-border-dark">
                    <h4 className="text-xs font-bold text-[#f0c14b] uppercase tracking-wider mb-3">Sample</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#050d17] rounded-lg p-3 border border-border-dark">
                            <span className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">Input</span>
                            <pre className="text-xs text-slate-300 font-mono mt-1 whitespace-pre-wrap">{currentProblem.sample_input}</pre>
                        </div>
                        <div className="bg-[#050d17] rounded-lg p-3 border border-border-dark">
                            <span className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">Output</span>
                            <pre className="text-xs text-[#00d26a] font-mono mt-1 whitespace-pre-wrap">{currentProblem.sample_output}</pre>
                        </div>
                    </div>
                    {currentProblem.explanation && (
                        <p className="mt-2 text-xs text-slate-500 italic">{currentProblem.explanation}</p>
                    )}
                </div>
            </div>

            {/* Code Editor */}
            <CodeSection
                episode={{ ...episode, concept_id: conceptId }}
                problem={currentProblem}
                problemType={problemType}
                onSuccess={() => {
                    setCompleted(prev => ({ ...prev, [currentIdx]: true }));
                    // Auto-advance after short delay
                    if (currentIdx < total - 1) {
                        setTimeout(() => setCurrentIdx(currentIdx + 1), 1000);
                    }
                }}
            />

            {/* Navigation */}
            <div className="flex justify-between mt-5">
                <button
                    onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                    disabled={currentIdx === 0}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border-dark text-slate-400 text-sm disabled:opacity-30 hover:border-slate-500 transition-all"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                    Previous
                </button>
                <button
                    onClick={() => setCurrentIdx(Math.min(total - 1, currentIdx + 1))}
                    disabled={currentIdx === total - 1}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#00d26a]/15 text-[#00d26a] text-sm font-semibold border border-[#00d26a]/30 disabled:opacity-30 hover:bg-[#00d26a]/25 transition-all"
                >
                    Next
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                </button>
            </div>
        </motion.div>
    );
}

// ─── Quiz / Activities Section ──────────────────────────────────────────────────

function QuizSection({ activities, conceptId }) {
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [results, setResults] = useState({});
    const [textAnswers, setTextAnswers] = useState({});

    if (!activities || activities.length === 0) return null;

    const handleSelect = (actIdx, optIdx, activity) => {
        if (results[actIdx] !== undefined) return;

        setSelectedAnswers(prev => ({ ...prev, [actIdx]: optIdx }));

        const options = activity.options || activity.choices || [];
        const correctAnswer = activity.correct_answer ?? activity.answer ?? activity.correct ?? null;
        const isCorrect = correctAnswer !== null
            ? (typeof correctAnswer === 'number' ? optIdx === correctAnswer : options[optIdx] === correctAnswer)
            : false;

        setResults(prev => ({ ...prev, [actIdx]: isCorrect }));

        if (isCorrect) {
            const learnerId = getLearnerId();
            if (learnerId) {
                updateBKT({ learner_id: learnerId, concept_id: conceptId, is_correct: true });
            }
        }
    };

    const handleFillBlankSubmit = (actIdx, activity) => {
        if (results[actIdx] !== undefined) return;
        const userAnswer = (textAnswers[actIdx] || '').trim().toLowerCase();
        const correctAnswer = String(activity.correct_answer ?? activity.answer ?? activity.correct ?? '').trim().toLowerCase();
        const isCorrect = userAnswer === correctAnswer;
        setResults(prev => ({ ...prev, [actIdx]: isCorrect }));
        if (isCorrect) {
            const learnerId = getLearnerId();
            if (learnerId) updateBKT({ learner_id: learnerId, concept_id: conceptId, is_correct: true });
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#f0c14b]" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>quiz</span>
                Check Your Understanding
            </h3>

            {activities.map((act, actIdx) => {
                const type = (act.type || 'mcq').toLowerCase();
                const options = act.options || act.choices || [];
                const correctAnswer = act.correct_answer ?? act.answer ?? act.correct ?? null;

                return (
                    <motion.div
                        key={actIdx}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: actIdx * 0.1 }}
                        className="bg-card-dark border border-border-dark rounded-xl p-5"
                    >
                        <p className="text-white font-medium text-sm mb-4">
                            {act.question || act.prompt || act.title || `Question ${actIdx + 1}`}
                        </p>

                        {/* MCQ options */}
                        {options.length > 0 && (
                            <div className="space-y-2">
                                {options.map((opt, optIdx) => {
                                    const optText = typeof opt === 'string' ? opt : opt.text || opt.label || String(opt);
                                    const isSelected = selectedAnswers[actIdx] === optIdx;
                                    const hasResult = results[actIdx] !== undefined;
                                    const isCorrectOpt = correctAnswer !== null
                                        ? (typeof correctAnswer === 'number' ? optIdx === correctAnswer : opt === correctAnswer)
                                        : false;

                                    let cls = 'border-border-dark hover:border-[#00ace0]/40 text-slate-400 hover:text-white';
                                    if (hasResult && isSelected && isCorrectOpt) {
                                        cls = 'border-emerald-500 bg-emerald-500/10 text-emerald-400 prime-selected';
                                    } else if (hasResult && isSelected && !isCorrectOpt) {
                                        cls = 'border-red-500 bg-red-500/10 text-red-400';
                                    } else if (hasResult && isCorrectOpt) {
                                        cls = 'border-emerald-500/40 text-emerald-400/70';
                                    }

                                    return (
                                        <button
                                            key={optIdx}
                                            onClick={() => handleSelect(actIdx, optIdx, act)}
                                            disabled={hasResult}
                                            className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all disabled:cursor-default ${cls}`}
                                        >
                                            <span className="flex items-center gap-3">
                                                <span className="size-6 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0">
                                                    {String.fromCharCode(65 + optIdx)}
                                                </span>
                                                {optText}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Fill in the blank */}
                        {type === 'fill_blank' && !options.length && (
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={textAnswers[actIdx] || ''}
                                        onChange={(e) => setTextAnswers(prev => ({ ...prev, [actIdx]: e.target.value }))}
                                        disabled={results[actIdx] !== undefined}
                                        placeholder="Type your answer..."
                                        className={`flex-1 px-4 py-3 rounded-lg border bg-[#050d17] text-sm font-mono focus:outline-none transition-all ${
                                            results[actIdx] === true ? 'border-emerald-500 text-emerald-400' :
                                            results[actIdx] === false ? 'border-red-500 text-red-400' :
                                            'border-border-dark text-white focus:border-[#a855f7]/60'
                                        }`}
                                        onKeyDown={(e) => e.key === 'Enter' && handleFillBlankSubmit(actIdx, act)}
                                    />
                                    <button
                                        onClick={() => handleFillBlankSubmit(actIdx, act)}
                                        disabled={results[actIdx] !== undefined || !textAnswers[actIdx]?.trim()}
                                        className="px-5 py-3 rounded-lg bg-[#a855f7] text-white text-sm font-bold disabled:opacity-40 disabled:cursor-default hover:brightness-110 transition-all"
                                    >
                                        Submit
                                    </button>
                                </div>
                                {results[actIdx] !== undefined && (
                                    <div className={`flex items-center gap-2 text-sm ${results[actIdx] ? 'text-emerald-400' : 'text-red-400'}`}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                                            {results[actIdx] ? 'check_circle' : 'cancel'}
                                        </span>
                                        {results[actIdx] ? 'Correct!' : `Incorrect. The answer is: ${correctAnswer}`}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Coding question — just show as text, Code Lab tab handles actual coding */}
                        {type === 'coding' && !options.length && (
                            <p className="text-slate-400 text-sm italic">Head to the Code Lab tab to solve this in the editor.</p>
                        )}
                    </motion.div>
                );
            })}
        </div>
    );
}

// ─── Main Episode Player ────────────────────────────────────────────────────────

function EpisodePlayer() {
    const { id } = useParams();
    const searchParams = useSearchParams();
    const conceptId = searchParams.get('concept_id') || id;
    const router = useRouter();

    const [episode, setEpisode] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [checkpointOpen, setCheckpointOpen] = useState(false);
    const [masteryPct, setMasteryPct] = useState(0);
    const [xpEarned, setXpEarned] = useState(0);
    const [startTime] = useState(Date.now());
    const [visualizations, setVisualizations] = useState([]);
    const [vizLoading, setVizLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('text');
    const learnerId = useRef(null);

    useEffect(() => {
        learnerId.current = getLearnerId();
        if (!learnerId.current) {
            router.push('/onboarding');
            return;
        }

        async function loadEpisode() {
            const { data, error: err } = await getEpisode(id, learnerId.current, conceptId, false, 30);
            if (err) {
                setError(err);
            } else {
                setEpisode(data);
                loadVisualizations(data);
            }
            setLoading(false);
        }
        loadEpisode();
    }, [id, conceptId, router]);

    async function loadVisualizations(episodeData) {
        setVizLoading(true);
        try {
            const conceptName = episodeData?.title || conceptId;
            const summary = (episodeData?.content || '').replace(/<[^>]*>/g, '').slice(0, 300);
            const { data } = await generateVisualizations({
                concept_name: conceptName,
                concept_id: conceptId,
                content_summary: summary,
            });
            if (data?.visualizations) {
                setVisualizations(data.visualizations);
            }
        } catch (e) {
            console.error('Visualization generation error:', e);
        }
        setVizLoading(false);
    }

    const handleComplete = useCallback(async () => {
        const lid = learnerId.current;
        const timeSpent = Math.round((Date.now() - startTime) / 1000);

        await postProgress(id, {
            learner_id: lid,
            concept_id: conceptId,
            completion_rate: 1.0,
            time_spent_seconds: timeSpent,
        });

        const { data: bktData } = await updateBKT({
            learner_id: lid,
            concept_id: conceptId,
            is_correct: true,
        });

        const newMastery = bktData?.p_know
            ? Math.round(bktData.p_know * 100)
            : bktData?.mastery
                ? Math.round(bktData.mastery * 100)
                : 85;
        const earnedXp = bktData?.xp_earned || bktData?.xp || 50;

        setMasteryPct(newMastery);
        setXpEarned(earnedXp);
        setCheckpointOpen(true);
    }, [id, conceptId, startTime]);

    const handleNextEpisode = () => {
        const nextId = episode?.next_episode_id;
        if (nextId) {
            router.push(`/episode/${nextId}?concept_id=${episode.next_concept_id || conceptId}`);
        } else {
            router.push('/home');
        }
    };

    const handleBackToConstellation = () => {
        router.push('/home');
    };

    // ── Loading ──
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f171e]">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-12 border-2 border-[#00ace0] border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 text-sm">Loading episode...</p>
                </div>
            </div>
        );
    }

    // ── Error ──
    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f171e] gap-4">
                <span className="material-symbols-outlined text-red-400" style={{ fontSize: 48 }}>error</span>
                <p className="text-red-400 text-lg">{error}</p>
                <button
                    onClick={() => router.push('/home')}
                    className="px-5 py-2.5 rounded-lg bg-surface-dark border border-border-dark text-white text-sm"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    if (!episode) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f171e] gap-4">
                <span className="material-symbols-outlined text-slate-600" style={{ fontSize: 48 }}>movie</span>
                <p className="text-slate-500 text-lg">No Episode Found</p>
                <button
                    onClick={() => router.push('/home')}
                    className="px-5 py-2.5 rounded-lg bg-surface-dark border border-border-dark text-white text-sm"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    const format = (episode.format || 'Visual Story').trim();
    const isCodeLab = format === 'Code Lab';
    const seasonName = episode.season_name || episode.cluster_name || 'Season';

    const formatIcons = {
        'Visual Story': 'auto_stories',
        'Code Lab': 'terminal',
        'Concept X-Ray': 'layers',
        'Case Study': 'case_study',
        'Quick Byte': 'bolt',
    };

    // ── Match coding problems from the bank (5 problems: 2E, 2M, 1H) ──
    const conceptName = episode.title || conceptId || '';
    const contentText = (episode.content || '').replace(/<[^>]*>/g, '').slice(0, 500);
    const { type: problemType, problems: matchedProblems } = getBestProblem(conceptName, contentText);

    // Build tabs — Code Lab always present
    const tabs = [
        { id: 'video', label: 'Video', icon: 'play_circle', color: '#00ace0' },
        { id: 'text', label: 'Notes', icon: 'menu_book', color: '#a855f7' },
        { id: 'code', label: 'Code Lab', icon: 'terminal', color: '#00d26a' },
        { id: 'assessment', label: 'Assessment', icon: 'quiz', color: '#f0c14b' },
    ];

    return (
            <div className="min-h-screen bg-[#0f171e]">
                {/* ── Header Breadcrumb ── */}
                <header className="sticky top-0 z-30 bg-[#0f171e]/90 backdrop-blur-sm border-b border-border-dark">
                    <div className="max-w-6xl mx-auto px-6 lg:px-8 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm min-w-0">
                            <button
                                onClick={() => router.back()}
                                className="text-slate-500 hover:text-white transition-colors flex items-center gap-1 shrink-0"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
                            </button>
                            <span className="text-slate-500 hover:text-white transition-colors truncate cursor-pointer" onClick={() => router.push('/home')}>
                                {seasonName}
                            </span>
                            <span className="text-slate-600 shrink-0">/</span>
                            <span className="text-white font-medium truncate">{episode.title || conceptId}</span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-[#00ace0] uppercase tracking-wider">
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{formatIcons[format] || 'auto_stories'}</span>
                                {format}
                            </span>
                        </div>
                    </div>
                </header>

                {/* ── Tab Bar ── */}
                <div className="sticky top-[53px] z-20 bg-[#0f171e]/95 backdrop-blur-sm border-b border-border-dark">
                    <div className="max-w-6xl mx-auto px-6 lg:px-8">
                        <div className="flex gap-1 overflow-x-auto hide-scrollbar">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-all relative whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'text-white'
                                            : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        style={{
                                            fontSize: 18,
                                            color: activeTab === tab.id ? tab.color : undefined,
                                        }}
                                    >
                                        {tab.icon}
                                    </span>
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <motion.div
                                            layoutId="tab-underline"
                                            className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                                            style={{ backgroundColor: tab.color }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Tab Content ── */}
                <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8">
                    <AnimatePresence mode="wait">
                        {/* ── VIDEO TAB ── */}
                        {activeTab === 'video' && (
                            <motion.div
                                key="video"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.2 }}
                            >
                                <VideoSection
                                    conceptId={conceptId}
                                    conceptName={episode.title || conceptId}
                                    learnerId={learnerId.current}
                                />
                            </motion.div>
                        )}

                        {/* ── TEXT TAB ── */}
                        {activeTab === 'text' && (
                            <motion.div
                                key="text"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="bg-card-dark border border-border-dark rounded-xl p-6 lg:p-8">
                                    <h1 className="text-2xl lg:text-3xl font-bold text-white mb-6 font-[Manrope]">{episode.title}</h1>
                                    <ContentSection episode={episode} />
                                </div>

                                {/* D3 Interactive Visualizations */}
                                {(visualizations.length > 0 || vizLoading) && (
                                    <div className="mt-8">
                                        <D3VisualizationEngine
                                            visualizations={visualizations}
                                            conceptName={episode.title || ''}
                                            isLoading={vizLoading}
                                        />
                                    </div>
                                )}

                                {/* Upload PDF/PPT to generate AI notes */}
                                <UploadNotesSection topic={episode.title || ''} />
                            </motion.div>
                        )}

                        {/* ── CODE LAB TAB — 5 problems in sequence ── */}
                        {activeTab === 'code' && (
                            <CodeLabTab
                                episode={episode}
                                conceptId={conceptId}
                                problems={matchedProblems}
                                problemType={problemType}
                            />
                        )}

                        {/* ── ASSESSMENT TAB ── */}
                        {activeTab === 'assessment' && (
                            <motion.div
                                key="assessment"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.2 }}
                            >
                                {episode.activities && episode.activities.length > 0 ? (
                                    <QuizSection activities={episode.activities} conceptId={conceptId} />
                                ) : (
                                    <div className="bg-card-dark border border-border-dark rounded-xl p-10 flex flex-col items-center gap-4 text-center">
                                        <span className="material-symbols-outlined text-slate-600" style={{ fontSize: 48 }}>quiz</span>
                                        <h3 className="text-white font-bold text-lg">Assessment Coming Soon</h3>
                                        <p className="text-slate-500 text-sm max-w-md">
                                            Complete the video and text content first. Your AI mentor will generate a personalized assessment based on your learning progress.
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Mark Complete — always visible */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex justify-end pt-8 pb-8"
                    >
                        <button
                            onClick={handleComplete}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#f0c14b] text-[#0f171e] font-bold text-sm hover:brightness-110 transition-all shadow-[0_0_25px_rgba(240,193,75,0.2)] gold-glow"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check_circle</span>
                            Mark Complete
                        </button>
                    </motion.div>
                </div>

                {/* ── AI Mentor floating button ── */}
                <motion.button
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1 }}
                    onClick={() => router.push(`/mentor?concept_id=${conceptId}`)}
                    className="fixed bottom-6 right-6 size-14 rounded-full bg-[#00ace0] text-white flex items-center justify-center shadow-[0_0_30px_rgba(0,172,224,0.3)] hover:brightness-110 transition-all z-20"
                    title="Ask AI Mentor"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 24 }}>psychology</span>
                </motion.button>

                {/* ── Mastery Checkpoint ── */}
                <MasteryCheckpoint
                    isOpen={checkpointOpen}
                    masteryPct={masteryPct}
                    xpEarned={xpEarned}
                    onNextEpisode={handleNextEpisode}
                    onBackToConstellation={handleBackToConstellation}
                />
            </div>
    );
}

// ─── Export with Suspense ──────────────────────────────────────────────────────

export default function EpisodePlayerWrapper() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#0f171e]">
                <div className="size-10 border-2 border-[#00ace0] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <EpisodePlayer />
        </Suspense>
    );
}

'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getLearnerId, setGoal, getAssessment, submitAssessment, getUploadUrl } from '@/lib/api';

const TIME_OPTIONS = [
    { id: '30min', label: '30 Minutes', desc: '3-4 episodes, quick sprint', icon: 'timer', minutes: 30 },
    { id: '1hr', label: '1 Hour', desc: '6-8 episodes, solid session', icon: 'schedule', minutes: 60 },
    { id: '2hr', label: '2 Hours', desc: '2 seasons, deep dive', icon: 'hourglass_top', minutes: 120 },
    { id: 'unlimited', label: 'No Time Limit', desc: 'Full course, multiple seasons', icon: 'all_inclusive', minutes: -1 },
];

export default function LearnSetup() {
    const router = useRouter();
    const fileInputRef = useRef(null);
    const [step, setStep] = useState(1); // 1: topic+time, 2: upload
    const [topic, setTopic] = useState('');
    const [timeOption, setTimeOption] = useState('');
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);

    const progressPercent = step === 1 ? 50 : 100;

    const handleFileDrop = (e) => {
        e.preventDefault();
        const dropped = Array.from(e.dataTransfer?.files || []).filter(f =>
            f.type === 'application/pdf' ||
            f.type === 'application/vnd.ms-powerpoint' ||
            f.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
            f.name.endsWith('.pdf') || f.name.endsWith('.ppt') || f.name.endsWith('.pptx') || f.name.endsWith('.txt')
        );
        setFiles(prev => [...prev, ...dropped].slice(0, 5));
    };

    const handleFileSelect = (e) => {
        const selected = Array.from(e.target.files || []);
        setFiles(prev => [...prev, ...selected].slice(0, 5));
    };

    const removeFile = (idx) => {
        setFiles(prev => prev.filter((_, i) => i !== idx));
    };

    const handleNext = () => {
        if (!topic.trim() || !timeOption) return;
        setStep(2);
    };

    const handleStartLearning = async () => {
        const learnerId = getLearnerId();
        if (!learnerId) { router.push('/profiles'); return; }

        setGenerating(true);
        setError(null);

        try {
            // Set the goal for this learning session
            await setGoal({ learner_id: learnerId, goal: topic.trim() });

            // Auto-submit assessment to seed constellation for the topic
            try {
                const { data: assessData } = await getAssessment(learnerId);
                if (assessData?.assessment?.length > 0) {
                    const defaultAnswers = assessData.assessment.map((q, i) => ({
                        question_id: `q${i}`,
                        difficulty: q.difficulty || 0.5,
                        is_correct: false,
                    }));
                    await submitAssessment({ learner_id: learnerId, answers: defaultAnswers });
                }
            } catch (e) {
                console.log('Assessment seed:', e);
            }

            // Upload files if any
            const uploadedKeys = [];
            if (files.length > 0) {
                setUploading(true);
                for (const file of files) {
                    try {
                        const { data: urlData } = await getUploadUrl(file.name);
                        if (urlData?.upload_url) {
                            await fetch(urlData.upload_url, {
                                method: 'PUT',
                                body: file,
                                headers: { 'Content-Type': file.type },
                            });
                            if (urlData.s3_key) uploadedKeys.push(urlData.s3_key);
                        }
                    } catch (e) {
                        console.log('File upload error:', e);
                    }
                }
                setUploading(false);
            }

            // Store session data for the learning hub
            const sessionId = Date.now().toString();
            const sessionData = {
                id: sessionId,
                topic: topic.trim(),
                timeOption,
                minutes: TIME_OPTIONS.find(t => t.id === timeOption)?.minutes || -1,
                uploadedFiles: uploadedKeys,
                fileNames: files.map(f => f.name),
                learnerId,
                createdAt: new Date().toISOString(),
            };
            localStorage.setItem(`learn_session_${sessionId}`, JSON.stringify(sessionData));

            router.push(`/learn/${sessionId}`);
        } catch (e) {
            setError('Something went wrong. Please try again.');
            setGenerating(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    return (
        <div className="min-h-screen bg-[#181818] text-[#E5E5E5] flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#141414]/90 backdrop-blur-md border-b border-[#333333]">
                <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
                    <span className="text-xl font-bold text-[#E5E5E5] font-[Manrope]">
                        Learn<span className="text-[#E50914]">Flix</span>
                    </span>
                    <button
                        onClick={() => router.push('/home')}
                        className="text-[#808080] text-sm hover:text-[#E5E5E5] transition-colors flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-base">close</span>
                        Cancel
                    </button>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="w-full bg-[#1E1E1E] border-b border-[#2E2E2E]">
                <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-4">
                    <span className="text-[#808080] text-xs font-semibold tracking-wider uppercase whitespace-nowrap">
                        Step {step} of 2
                    </span>
                    <div className="flex-1 h-1.5 bg-[#2E2E2E] rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-[#E50914] rounded-full"
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                    </div>
                    <span className="text-[#E50914] text-xs font-bold">{progressPercent}%</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-start justify-center px-6 py-10">
                <AnimatePresence mode="wait">
                    {/* ═══ STEP 1: Topic + Time ═══ */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 60 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -60 }}
                            className="w-full max-w-2xl"
                        >
                            <div className="text-center mb-8">
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', damping: 10 }}
                                    className="material-symbols-outlined text-[#E50914] text-5xl mb-4 block"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                    school
                                </motion.span>
                                <h1 className="text-3xl md:text-4xl font-bold text-[#E5E5E5] font-[Manrope] mb-2">
                                    What do you want to learn?
                                </h1>
                                <p className="text-[#B3B3B3] text-base">
                                    Tell us the topic and how much time you have. We'll build your perfect learning series.
                                </p>
                            </div>

                            <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-8 shadow-sm">
                                {/* Topic Input */}
                                <label className="block text-[#B3B3B3] text-sm font-semibold mb-2 uppercase tracking-wider">
                                    Topic
                                </label>
                                <div className="relative mb-8">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#E50914]" style={{ fontSize: 20 }}>search</span>
                                    <input
                                        type="text"
                                        placeholder="e.g. SQL & Databases, Organic Chemistry, Financial Modeling..."
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        className="w-full bg-[#181818] border border-[#333333] rounded-xl pl-12 pr-4 py-4 text-[#E5E5E5] placeholder-[#808080] focus:outline-none focus:border-[#E50914] transition-colors text-lg"
                                        autoFocus
                                    />
                                </div>

                                {/* Time Selection */}
                                <label className="block text-[#B3B3B3] text-sm font-semibold mb-3 uppercase tracking-wider">
                                    How much time do you have?
                                </label>
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    {TIME_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setTimeOption(opt.id)}
                                            className={`text-left rounded-xl border p-4 transition-all ${
                                                timeOption === opt.id
                                                    ? 'border-[#E50914] bg-[#E50914]/5 shadow-sm'
                                                    : 'border-[#333333] bg-[#181818] hover:border-[#E87C03]/40'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`size-10 rounded-lg flex items-center justify-center ${
                                                    timeOption === opt.id ? 'bg-[#E50914]/15' : 'bg-[#E87C03]/10'
                                                }`}>
                                                    <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 22 }}>{opt.icon}</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-[#E5E5E5] font-semibold text-sm">{opt.label}</h4>
                                                    <p className="text-[#808080] text-xs mt-0.5">{opt.desc}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={handleNext}
                                    disabled={!topic.trim() || !timeOption}
                                    className="w-full bg-[#E50914] text-white font-bold px-8 py-4 rounded-xl text-lg hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    Next
                                    <span className="material-symbols-outlined text-xl">arrow_forward</span>
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ═══ STEP 2: Upload Material ═══ */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 60 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -60 }}
                            className="w-full max-w-2xl"
                        >
                            <div className="text-center mb-8">
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', damping: 10 }}
                                    className="material-symbols-outlined text-[#E87C03] text-5xl mb-4 block"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                    upload_file
                                </motion.span>
                                <h1 className="text-3xl md:text-4xl font-bold text-[#E5E5E5] font-[Manrope] mb-2">
                                    Got study material?
                                </h1>
                                <p className="text-[#B3B3B3] text-base">
                                    Upload your PDFs, PPTs, or notes. We'll use AI to create structured notes from them.
                                    <br />
                                    <span className="text-[#808080]">This is optional — skip if you don't have any.</span>
                                </p>
                            </div>

                            <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-8 shadow-sm">
                                {/* Topic summary */}
                                <div className="flex items-center gap-3 mb-6 bg-[#181818] border border-[#2E2E2E] rounded-xl px-4 py-3">
                                    <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 20 }}>book</span>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-[#E5E5E5]">{topic}</p>
                                        <p className="text-xs text-[#808080]">{TIME_OPTIONS.find(t => t.id === timeOption)?.label}</p>
                                    </div>
                                    <button onClick={() => setStep(1)} className="text-xs text-[#E50914] font-semibold hover:underline">Edit</button>
                                </div>

                                {/* Drop Zone */}
                                <div
                                    onDrop={handleFileDrop}
                                    onDragOver={(e) => e.preventDefault()}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-[#333333] rounded-xl p-8 text-center cursor-pointer hover:border-[#E50914]/40 transition-colors mb-4"
                                >
                                    <span className="material-symbols-outlined text-[#808080] mb-3 block" style={{ fontSize: 48 }}>cloud_upload</span>
                                    <p className="text-[#B3B3B3] font-semibold text-sm">Drop files here or click to browse</p>
                                    <p className="text-[#808080] text-xs mt-1">PDF, PPT, PPTX, TXT — max 5 files</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept=".pdf,.ppt,.pptx,.txt"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                </div>

                                {/* File List */}
                                {files.length > 0 && (
                                    <div className="space-y-2 mb-6">
                                        {files.map((file, idx) => (
                                            <div key={idx} className="flex items-center gap-3 bg-[#181818] border border-[#2E2E2E] rounded-lg px-4 py-3">
                                                <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 20 }}>
                                                    {file.name.endsWith('.pdf') ? 'picture_as_pdf' : file.name.endsWith('.txt') ? 'description' : 'slideshow'}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-[#E5E5E5] truncate">{file.name}</p>
                                                    <p className="text-xs text-[#808080]">{formatFileSize(file.size)}</p>
                                                </div>
                                                <button onClick={() => removeFile(idx)} className="text-[#808080] hover:text-red-500 transition-colors">
                                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="px-6 py-4 rounded-xl border border-[#333333] text-[#B3B3B3] font-semibold hover:border-[#E50914]/40 transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleStartLearning}
                                        disabled={generating}
                                        className="flex-1 bg-[#E50914] text-white font-bold px-8 py-4 rounded-xl text-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {generating ? (
                                            <>
                                                <span className="material-symbols-outlined animate-spin" style={{ fontSize: 20 }}>progress_activity</span>
                                                {uploading ? 'Uploading files...' : 'Building your series...'}
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
                                                {files.length > 0 ? 'Upload & Start Learning' : 'Start Learning'}
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Skip upload */}
                                {files.length === 0 && !generating && (
                                    <button
                                        onClick={handleStartLearning}
                                        className="w-full mt-3 text-center text-sm text-[#808080] hover:text-[#E50914] transition-colors font-semibold"
                                    >
                                        Skip — I don't have any material
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

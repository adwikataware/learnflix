'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import SmileDetector from '@/components/SmileDetector';
import {
    getProfiles, addProfile, deleteProfile, setActiveProfile,
    clearActiveProfile, PROFILE_COLORS, registerUser, setGoal,
    getAssessment, submitAssessment, setLearnerId, setLearnerName,
} from '@/lib/api';

const SPECIALIZATIONS = [
    { id: 'cs', label: 'Computer Science', icon: 'computer', desc: 'Programming, algorithms, systems',
      goal: 'Computer Science core subjects: Object Oriented Programming (OOPs), Data Structures and Algorithms (DSA), Database Management Systems (DBMS), Operating Systems (OS), Computer Networks (CN), Design and Analysis of Algorithms (DAA), Software Engineering, Compiler Design, Theory of Computation, Web Development' },
    { id: 'ds', label: 'Data Science', icon: 'query_stats', desc: 'Statistics, ML, analytics',
      goal: 'Data Science core subjects: Statistics and Probability, Python for Data Science, Machine Learning, Deep Learning, Natural Language Processing (NLP), Data Visualization, Big Data Analytics, Feature Engineering, Time Series Analysis, SQL for Data Science' },
    { id: 'finance', label: 'Finance & Business', icon: 'account_balance', desc: 'Accounting, markets, economics',
      goal: 'Finance and Business core subjects: Financial Accounting, Corporate Finance, Stock Market Analysis, Investment Banking, Financial Modeling, Risk Management, Macroeconomics, Microeconomics, Business Analytics, Taxation and Auditing' },
    { id: 'math', label: 'Mathematics', icon: 'calculate', desc: 'Algebra, calculus, discrete math',
      goal: 'Mathematics core subjects: Linear Algebra, Calculus (Single and Multivariable), Discrete Mathematics, Probability and Statistics, Real Analysis, Abstract Algebra, Number Theory, Differential Equations, Optimization Methods, Graph Theory' },
    { id: 'science', label: 'Science', icon: 'science', desc: 'Physics, chemistry, biology',
      goal: 'Science core subjects: Classical Mechanics, Electromagnetism, Thermodynamics, Quantum Mechanics, Organic Chemistry, Inorganic Chemistry, Physical Chemistry, Cell Biology, Genetics and Evolution, Environmental Science' },
    { id: 'arts', label: 'Arts & Humanities', icon: 'palette', desc: 'History, literature, philosophy',
      goal: 'Arts and Humanities core subjects: World History, Indian History, English Literature, Philosophy, Political Science, Sociology, Psychology, Creative Writing, Art History, Cultural Studies' },
    { id: 'engineering', label: 'Engineering', icon: 'engineering', desc: 'Mechanical, electrical, civil',
      goal: 'Engineering core subjects: Engineering Mechanics, Fluid Mechanics, Strength of Materials, Electrical Circuits, Control Systems, Digital Electronics, Engineering Drawing, Manufacturing Processes, Heat Transfer, Engineering Mathematics' },
    { id: 'medical', label: 'Medical & Health', icon: 'health_and_safety', desc: 'Anatomy, pharma, healthcare',
      goal: 'Medical and Health Sciences core subjects: Human Anatomy, Physiology, Biochemistry, Pharmacology, Pathology, Microbiology, Community Medicine, Forensic Medicine, Surgery Basics, Clinical Diagnostics' },
    { id: 'law', label: 'Law & Policy', icon: 'gavel', desc: 'Legal studies, governance',
      goal: 'Law and Policy core subjects: Constitutional Law, Criminal Law, Civil Procedure, Contract Law, Corporate Law, International Law, Human Rights Law, Environmental Law, Intellectual Property Law, Legal Research and Writing' },
    { id: 'design', label: 'Design & Media', icon: 'brush', desc: 'UI/UX, graphics, film',
      goal: 'Design and Media core subjects: UI/UX Design, Graphic Design, Typography, Color Theory, Motion Graphics, Video Production, Photography, Brand Identity Design, Interaction Design, Design Thinking' },
];

export default function ProfilesPage() {
    const router = useRouter();
    const [profiles, setProfiles] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newSpec, setNewSpec] = useState('');
    const [creating, setCreating] = useState(false);
    const [smileCompleted, setSmileCompleted] = useState(false);
    const handleSmileComplete = useCallback(() => setSmileCompleted(true), []);
    const [error, setError] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    useEffect(() => {
        setProfiles(getProfiles());
    }, []);

    const handleSelectProfile = (profile) => {
        setActiveProfile(profile);
        router.push('/home');
    };

    const handleCreateProfile = async () => {
        if (!newName.trim() || !newSpec) return;
        setCreating(true);
        setError(null);

        try {
            // Register with backend
            const { data: regData, error: regErr } = await registerUser({ language: 'en' });
            if (regErr) { setError(regErr); setCreating(false); return; }

            const learnerId = regData.learner_id;

            // Set goal with detailed subject list so LLM generates proper courses
            const specObj = SPECIALIZATIONS.find(s => s.id === newSpec);
            const specLabel = specObj?.label || newSpec;
            const specGoal = specObj?.goal || specLabel;
            await setGoal({ learner_id: learnerId, goal: specGoal });

            // Auto-submit assessment to seed backend data
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
                console.log('Auto-assessment seed:', e);
            }

            // Save profile locally
            const profile = addProfile({
                name: newName.trim(),
                specialization: specLabel,
                learner_id: learnerId,
                color: PROFILE_COLORS[profiles.length % PROFILE_COLORS.length],
            });

            // Set as active and go to home
            setActiveProfile(profile);
            setLearnerId(learnerId);
            setLearnerName(newName.trim());
            router.push('/home');
        } catch (e) {
            setError('Something went wrong. Please try again.');
            setCreating(false);
        }
    };

    const handleDelete = (profileId) => {
        deleteProfile(profileId);
        setProfiles(getProfiles());
        setConfirmDelete(null);
    };

    return (
        <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#141414] via-[#141414] to-[#0A0A0A]" />
            <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(229,9,20,0.15) 0%, transparent 60%)',
            }} />

            {/* Logo */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 mb-10"
            >
                <h1 className="text-4xl font-extrabold tracking-tight">
                    <span className="text-white">Learn</span>
                    <span className="text-[#E50914]">Flix</span>
                </h1>
            </motion.div>

            <AnimatePresence mode="wait">
                {!showCreate ? (
                    /* ═══ Profile Selection ═══ */
                    <motion.div
                        key="select"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative z-10 text-center"
                    >
                        <h2 className="text-2xl font-bold text-white/90 mb-8">Who's learning?</h2>

                        <div className="flex flex-wrap items-center justify-center gap-6 max-w-3xl mx-auto px-6">
                            {profiles.map((profile, idx) => (
                                <motion.div
                                    key={profile.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="group relative"
                                >
                                    <button
                                        onClick={() => handleSelectProfile(profile)}
                                        className="flex flex-col items-center gap-3 transition-all group-hover:scale-105"
                                    >
                                        <div
                                            className="w-28 h-28 rounded-xl flex items-center justify-center text-white text-4xl font-extrabold border-2 border-transparent group-hover:border-white/40 transition-all shadow-lg"
                                            style={{ backgroundColor: profile.color }}
                                        >
                                            {profile.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-white/80 font-semibold text-sm group-hover:text-white transition-colors">
                                                {profile.name}
                                            </p>
                                            <p className="text-white/30 text-[10px] uppercase tracking-wider mt-0.5">
                                                {profile.specialization}
                                            </p>
                                        </div>
                                    </button>
                                    {/* Delete button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(profile.id); }}
                                        className="absolute -top-2 -right-2 size-6 rounded-full bg-[#141414] border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/50"
                                    >
                                        <span className="material-symbols-outlined text-white/50 hover:text-red-400" style={{ fontSize: 14 }}>close</span>
                                    </button>
                                </motion.div>
                            ))}

                            {/* Add Profile Button */}
                            {profiles.length < 5 && (
                                <motion.button
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: profiles.length * 0.1 }}
                                    onClick={() => setShowCreate(true)}
                                    className="flex flex-col items-center gap-3 group"
                                >
                                    <div className="w-28 h-28 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center group-hover:border-[#E50914]/60 transition-all">
                                        <span className="material-symbols-outlined text-white/30 group-hover:text-[#E50914] transition-colors" style={{ fontSize: 48 }}>
                                            add
                                        </span>
                                    </div>
                                    <p className="text-white/30 font-semibold text-sm group-hover:text-white/60 transition-colors">
                                        Add Profile
                                    </p>
                                </motion.button>
                            )}
                        </div>

                        {profiles.length === 0 && (
                            <p className="text-white/20 text-sm mt-8">Create your first profile to start learning</p>
                        )}
                    </motion.div>
                ) : (
                    /* ═══ Create Profile ═══ */
                    <motion.div
                        key="create"
                        initial={{ opacity: 0, x: 60 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -60 }}
                        className="relative z-10 w-full max-w-2xl px-6"
                    >
                        <button
                            onClick={() => { setShowCreate(false); setNewName(''); setNewSpec(''); setSmileCompleted(false); setError(null); }}
                            className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors mb-6"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
                            Back
                        </button>

                        <h2 className="text-3xl font-bold text-white mb-2">Create Profile</h2>
                        <p className="text-white/40 mb-8">Set up your learning identity</p>

                        {/* Name Input */}
                        <div className="mb-6">
                            <label className="block text-white/50 text-xs font-bold uppercase tracking-wider mb-2">
                                Profile Name
                            </label>
                            <input
                                type="text"
                                placeholder="Enter your name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-[#E50914]/50 transition-colors text-lg"
                                autoFocus
                            />
                        </div>

                        {/* Smile to Unlock */}
                        <div className="mb-6">
                            <label className="block text-white/50 text-xs font-bold uppercase tracking-wider mb-3">
                                Smile to Start Learning
                            </label>
                            {smileCompleted ? (
                                <div className="flex items-center gap-3 bg-[#46D369]/10 border border-[#46D369]/30 rounded-xl px-4 py-3">
                                    <span className="material-symbols-outlined text-[#46D369]" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>sentiment_very_satisfied</span>
                                    <span className="text-[#46D369] font-bold text-sm">Smile verified! You're ready.</span>
                                </div>
                            ) : (
                                <SmileDetector onSmileComplete={handleSmileComplete} smileThreshold={70} />
                            )}
                        </div>

                        {/* Specialization */}
                        <div className="mb-8">
                            <label className="block text-white/50 text-xs font-bold uppercase tracking-wider mb-3">
                                Specialization (Field of Education)
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {SPECIALIZATIONS.map((spec) => (
                                    <button
                                        key={spec.id}
                                        onClick={() => setNewSpec(spec.id)}
                                        className={`text-left rounded-xl border p-3 transition-all ${
                                            newSpec === spec.id
                                                ? 'border-[#E50914] bg-[#E50914]/10'
                                                : 'border-white/10 bg-white/3 hover:border-white/20'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="material-symbols-outlined" style={{
                                                fontSize: 18,
                                                color: newSpec === spec.id ? '#E50914' : 'rgba(255,255,255,0.4)',
                                            }}>{spec.icon}</span>
                                            <span className={`text-sm font-semibold ${newSpec === spec.id ? 'text-white' : 'text-white/60'}`}>
                                                {spec.label}
                                            </span>
                                        </div>
                                        <p className="text-white/25 text-[10px] pl-7">{spec.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm text-center mb-4">{error}</p>
                        )}

                        <button
                            onClick={handleCreateProfile}
                            disabled={!newName.trim() || !newSpec || !smileCompleted || creating}
                            className="w-full bg-[#E50914] text-white font-bold py-4 rounded-xl text-lg hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {creating ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: 20 }}>progress_activity</span>
                                    Setting up your profile...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person_add</span>
                                    Create Profile
                                </>
                            )}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {confirmDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 max-w-sm mx-4"
                        >
                            <h3 className="text-white font-bold text-lg mb-2">Delete Profile?</h3>
                            <p className="text-white/40 text-sm mb-6">This will remove the profile and all its progress. This action cannot be undone.</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmDelete(null)}
                                    className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 font-semibold hover:bg-white/5 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(confirmDelete)}
                                    className="flex-1 py-3 rounded-xl bg-red-600/80 text-white font-semibold hover:bg-red-600 transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

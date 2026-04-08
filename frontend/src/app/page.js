'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getProfiles, getActiveProfile } from '@/lib/api';

/* ─── Education "poster" tiles for the background grid ─── */
const POSTERS = [
  { title: 'Data Structures', icon: 'account_tree', gradient: 'from-red-900 to-red-700' },
  { title: 'Machine Learning', icon: 'model_training', gradient: 'from-blue-900 to-blue-700' },
  { title: 'Python Mastery', icon: 'code', gradient: 'from-green-900 to-green-700' },
  { title: 'SQL & Databases', icon: 'database', gradient: 'from-purple-900 to-purple-700' },
  { title: 'Web Development', icon: 'language', gradient: 'from-orange-900 to-orange-700' },
  { title: 'System Design', icon: 'hub', gradient: 'from-cyan-900 to-cyan-700' },
  { title: 'Deep Learning', icon: 'neurology', gradient: 'from-pink-900 to-pink-700' },
  { title: 'Statistics', icon: 'query_stats', gradient: 'from-indigo-900 to-indigo-700' },
  { title: 'Cloud & AWS', icon: 'cloud', gradient: 'from-yellow-900 to-yellow-700' },
  { title: 'Algorithms', icon: 'functions', gradient: 'from-teal-900 to-teal-700' },
  { title: 'React & Next.js', icon: 'web', gradient: 'from-sky-900 to-sky-700' },
  { title: 'Cyber Security', icon: 'security', gradient: 'from-red-950 to-rose-800' },
  { title: 'Operating Systems', icon: 'computer', gradient: 'from-slate-800 to-slate-600' },
  { title: 'Linear Algebra', icon: 'calculate', gradient: 'from-violet-900 to-violet-700' },
  { title: 'Computer Networks', icon: 'router', gradient: 'from-emerald-900 to-emerald-700' },
  { title: 'Physics', icon: 'science', gradient: 'from-amber-900 to-amber-700' },
  { title: 'Chemistry', icon: 'biotech', gradient: 'from-lime-900 to-lime-700' },
  { title: 'Finance', icon: 'account_balance', gradient: 'from-green-950 to-green-800' },
  { title: 'Docker & DevOps', icon: 'deployed_code', gradient: 'from-blue-950 to-blue-800' },
  { title: 'AI & Agents', icon: 'smart_toy', gradient: 'from-fuchsia-900 to-fuchsia-700' },
  { title: 'Blockchain', icon: 'link', gradient: 'from-orange-950 to-orange-800' },
  { title: 'Data Science', icon: 'analytics', gradient: 'from-indigo-950 to-indigo-800' },
  { title: 'Economics', icon: 'trending_up', gradient: 'from-red-800 to-rose-600' },
  { title: 'Organic Chem', icon: 'science', gradient: 'from-teal-950 to-teal-800' },
  { title: 'Calculus', icon: 'integration_instructions', gradient: 'from-cyan-950 to-cyan-800' },
  { title: 'Compilers', icon: 'terminal', gradient: 'from-gray-800 to-gray-600' },
  { title: 'Digital Logic', icon: 'memory', gradient: 'from-sky-950 to-sky-800' },
  { title: 'Game Theory', icon: 'casino', gradient: 'from-amber-800 to-amber-600' },
  { title: 'NLP', icon: 'chat', gradient: 'from-violet-800 to-violet-600' },
  { title: 'Probability', icon: 'pie_chart', gradient: 'from-pink-800 to-pink-600' },
  { title: 'Java OOP', icon: 'data_object', gradient: 'from-red-900 to-orange-800' },
  { title: 'C++ Mastery', icon: 'code_blocks', gradient: 'from-blue-800 to-indigo-700' },
  { title: 'Graph Theory', icon: 'share', gradient: 'from-green-800 to-teal-700' },
  { title: 'Cryptography', icon: 'lock', gradient: 'from-slate-900 to-slate-700' },
  { title: 'Robotics', icon: 'precision_manufacturing', gradient: 'from-zinc-800 to-zinc-600' },
  { title: 'Ethics in AI', icon: 'balance', gradient: 'from-stone-800 to-stone-600' },
];

// Build 5 rows of posters for the tilted grid
const ROWS = [
  POSTERS.slice(0, 7),
  POSTERS.slice(7, 14),
  POSTERS.slice(14, 21),
  POSTERS.slice(21, 28),
  POSTERS.slice(28, 36),
];

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [existingUser, setExistingUser] = useState(null);

  useEffect(() => {
    const active = getActiveProfile();
    if (active?.learner_id) setExistingUser(active);
  }, []);

  const handleGetStarted = () => {
    router.push('/profiles');
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">

      {/* ═══════════ TILTED POSTER GRID BACKGROUND ═══════════ */}
      <div className="absolute inset-0 overflow-hidden">
        {/* The tilted container */}
        <div
          className="absolute w-[200%] h-[200%] -left-[50%] -top-[30%]"
          style={{
            transform: 'rotate(-12deg)',
          }}
        >
          {ROWS.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className="flex gap-3 mb-3"
              style={{
                paddingLeft: rowIdx % 2 === 0 ? 0 : 80,
                animation: `scroll-row-${rowIdx % 2 === 0 ? 'left' : 'right'} ${60 + rowIdx * 10}s linear infinite`,
              }}
            >
              {/* Duplicate row for seamless scroll */}
              {[...row, ...row, ...row].map((poster, idx) => (
                <div
                  key={`${rowIdx}-${idx}`}
                  className={`flex-shrink-0 w-44 h-64 rounded-lg overflow-hidden bg-gradient-to-br ${poster.gradient} relative group`}
                >
                  {/* Poster content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
                    <span
                      className="material-symbols-outlined text-white/30 mb-3"
                      style={{ fontSize: 48, fontVariationSettings: "'FILL' 1" }}
                    >
                      {poster.icon}
                    </span>
                    <p className="text-white/40 text-xs font-bold text-center leading-tight uppercase tracking-wider">
                      {poster.title}
                    </p>
                  </div>
                  {/* LearnFlix badge */}
                  {idx % 5 === 0 && (
                    <div className="absolute top-2 left-2">
                      <div className="text-[8px] font-black text-[#E50914] bg-black/40 px-1.5 py-0.5 rounded">LF</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Dark overlay gradient — Netflix style */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />
        {/* Extra vignette */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.5) 80%)',
        }} />
      </div>

      {/* ═══════════ TOP NAV ═══════════ */}
      <nav className="relative z-20 flex items-center justify-between px-8 md:px-12 py-6">
        <Link href="/" className="flex items-center">
          <span className="text-[#E50914] text-3xl md:text-4xl font-black tracking-tighter"
            style={{ fontFamily: "'Manrope', sans-serif" }}>
            LEARNFLIX
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <button className="hidden md:flex items-center gap-1.5 border border-white/30 text-white text-sm px-3 py-1.5 rounded hover:bg-white/10 transition-all">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>translate</span>
            English
          </button>
          <button
            onClick={() => router.push(existingUser ? '/home' : '/profiles')}
            className="bg-[#E50914] text-white text-sm font-bold px-5 py-1.5 rounded hover:bg-[#F6121D] transition-all"
          >
            {existingUser ? 'Go to Home' : 'Sign In'}
          </button>
        </div>
      </nav>

      {/* ═══════════ HERO CENTER CONTENT ═══════════ */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 mt-16 md:mt-24 lg:mt-32">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight max-w-4xl"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Unlimited courses,
          <br />
          skills, and more
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg md:text-xl text-white/80 mt-5 font-medium"
        >
          Learn anything. AI-powered. Personalized for you.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35 }}
          className="text-base md:text-lg text-white/60 mt-4 max-w-lg"
        >
          Ready to learn? Enter your email to create or restart your learning journey.
        </motion.p>

        {/* ═══ CTA ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-6 w-full max-w-xl"
        >
          {/* Continue as existing user */}
          {existingUser && (
            <button
              onClick={() => router.push('/home')}
              className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold text-lg py-4 rounded hover:bg-white/90 transition-all mb-3"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              Continue as {existingUser.name}
            </button>
          )}

          {/* Email + Get Started */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full sm:flex-1 bg-black/60 border border-white/30 rounded px-5 py-4 text-white placeholder-white/40 text-base focus:outline-none focus:border-white/60 transition-all"
            />
            <button
              onClick={handleGetStarted}
              className="flex items-center gap-2 bg-[#E50914] text-white font-bold text-lg md:text-xl px-8 py-4 rounded hover:bg-[#F6121D] transition-all whitespace-nowrap"
            >
              {existingUser ? 'New Profile' : 'Get Started'}
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* ═══════════ FEATURE STRIP (below hero) ═══════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1 }}
        className="relative z-10 mt-24 mb-8"
      >
        {/* Separator line */}
        <div className="w-full h-2 bg-gradient-to-r from-transparent via-[#333] to-transparent" />

        <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            {
              icon: 'smart_toy',
              title: 'AI-Generated Episodes',
              desc: 'Every lesson is freshly created by AI — stories, code labs, visual presentations, and voice narration. No pre-recorded videos.',
            },
            {
              icon: 'psychology',
              title: 'Adaptive Learning',
              desc: 'Your F.R.I.E.N.D buddy detects when you\'re stuck and adapts in real-time. Hint levels, bridge sprints, and IQ-adaptive assessments.',
            },
            {
              icon: 'menu_book',
              title: 'Learn Any Subject',
              desc: 'From Data Structures to Finance, Physics to Organic Chemistry. Upload your notes or let AI generate everything from scratch.',
            },
          ].map((feature, idx) => (
            <div key={feature.title} className="text-center">
              <div className="w-14 h-14 rounded-full bg-[#E50914]/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>
                  {feature.icon}
                </span>
              </div>
              <h3 className="text-white text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        <div className="w-full h-2 bg-gradient-to-r from-transparent via-[#333] to-transparent" />
      </motion.div>

      {/* ═══════════ BOTTOM CTA ═══════════ */}
      <div className="relative z-10 text-center px-6 pb-20">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Start binge-learning today.
        </h2>
        <p className="text-white/50 mb-6">Personalized. Adaptive. Powered by AI.</p>
        <button
          onClick={handleGetStarted}
          className="bg-[#E50914] text-white font-bold text-lg px-10 py-4 rounded hover:bg-[#F6121D] transition-all"
        >
          Get Started
        </button>
      </div>

    </div>
  );
}

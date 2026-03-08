'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

/* ─── Data ─── */
const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Courses', href: '/home' },
  { label: 'Skills', href: '/skills' },
  { label: 'Mentors', href: '/mentors' },
  { label: 'Library', href: '/library' },
];

const continueLearning = [
  { title: 'React & Next.js Mastery', progress: 68, episodes: 24, icon: 'code', accent: '#00ace0', bg: '#0a2540' },
  { title: 'Node.js Backend Deep Dive', progress: 42, episodes: 18, icon: 'dns', accent: '#00d26a', bg: '#0a2a1a' },
  { title: 'TypeScript Fundamentals', progress: 85, episodes: 12, icon: 'data_object', accent: '#a855f7', bg: '#1a0a30' },
  { title: 'GraphQL API Design', progress: 30, episodes: 16, icon: 'hub', accent: '#f59e0b', bg: '#2a1a05' },
  { title: 'Docker & Kubernetes', progress: 55, episodes: 20, icon: 'cloud', accent: '#38bdf8', bg: '#0a1e30' },
  { title: 'PostgreSQL Advanced', progress: 15, episodes: 14, icon: 'storage', accent: '#fb923c', bg: '#2a1505' },
];

const newReleases = [
  { title: 'Full Stack with AI', episodes: 22, icon: 'smart_toy', accent: '#00ace0', bg: '#061e2e' },
  { title: 'MERN Stack 2026', episodes: 28, icon: 'stacks', accent: '#a855f7', bg: '#150a28' },
  { title: 'Serverless Architecture', episodes: 16, icon: 'cloud_queue', accent: '#00d26a', bg: '#0a2218' },
  { title: 'React Native Mobile', episodes: 20, icon: 'smartphone', accent: '#f59e0b', bg: '#221505' },
  { title: 'Vue.js 4 Complete', episodes: 18, icon: 'view_quilt', accent: '#38bdf8', bg: '#081a28' },
  { title: 'Django REST APIs', episodes: 14, icon: 'api', accent: '#fb923c', bg: '#221005' },
];

const trendingDesign = [
  { title: 'Microservices Patterns', episodes: 24, icon: 'account_tree', accent: '#a855f7', bg: '#150a28' },
  { title: 'Event-Driven Systems', episodes: 18, icon: 'bolt', accent: '#00ace0', bg: '#061e2e' },
  { title: 'Database Sharding', episodes: 12, icon: 'grid_view', accent: '#00d26a', bg: '#0a2218' },
  { title: 'Load Balancing & CDN', episodes: 10, icon: 'balance', accent: '#f59e0b', bg: '#221505' },
  { title: 'API Gateway Design', episodes: 16, icon: 'router', accent: '#38bdf8', bg: '#081a28' },
  { title: 'Caching Strategies', episodes: 14, icon: 'cached', accent: '#fb923c', bg: '#221005' },
];

/* ─── Floating Learning Elements Background ─── */
const FLOAT_ITEMS = [
  // Code snippets
  { type: 'code', text: 'const learn = () =>', color: '#00ace0' },
  { type: 'code', text: 'import AI from "brain"', color: '#a855f7' },
  { type: 'code', text: 'async function grow()', color: '#00d26a' },
  { type: 'code', text: '<Knowledge />', color: '#38bdf8' },
  { type: 'code', text: 'model.fit(data)', color: '#f59e0b' },
  { type: 'code', text: 'git push origin master', color: '#fb923c' },
  // Icons
  { type: 'icon', text: 'school', color: '#00ace0' },
  { type: 'icon', text: 'psychology', color: '#a855f7' },
  { type: 'icon', text: 'code', color: '#00d26a' },
  { type: 'icon', text: 'auto_awesome', color: '#f0c14b' },
  { type: 'icon', text: 'terminal', color: '#38bdf8' },
  { type: 'icon', text: 'neurology', color: '#fb923c' },
  { type: 'icon', text: 'lightbulb', color: '#00d26a' },
  { type: 'icon', text: 'rocket_launch', color: '#f59e0b' },
  { type: 'icon', text: 'data_object', color: '#a855f7' },
  { type: 'icon', text: 'hub', color: '#00ace0' },
  { type: 'icon', text: 'science', color: '#38bdf8' },
  { type: 'icon', text: 'menu_book', color: '#00d26a' },
];

function FloatingElements() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {FLOAT_ITEMS.map((item, i) => {
        const startX = 40 + Math.random() * 55;
        const startY = 5 + Math.random() * 85;
        const dur = 15 + Math.random() * 20;
        const delay = -(Math.random() * dur);
        const size = item.type === 'icon' ? (28 + Math.random() * 20) : 12;
        const opacity = 0.08 + Math.random() * 0.12;

        return (
          <div
            key={i}
            className="absolute animate-float-learn"
            style={{
              left: `${startX}%`,
              top: `${startY}%`,
              animationDuration: `${dur}s`,
              animationDelay: `${delay}s`,
              opacity,
              color: item.color,
            }}
          >
            {item.type === 'icon' ? (
              <span className="material-symbols-outlined" style={{ fontSize: size }}>{item.text}</span>
            ) : (
              <span className="font-mono font-bold whitespace-nowrap" style={{ fontSize: size }}>{item.text}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Card with generated visual ─── */
function CourseCard({ item, idx, variant = 'wide' }) {
  const isWide = variant === 'wide';
  return (
    <Link href="/home"
      className={`group flex-shrink-0 ${isWide ? 'w-72 md:w-80 aspect-video' : 'w-44 md:w-48 aspect-[2/3]'} rounded-xl overflow-hidden relative cursor-pointer transition-all duration-300 hover:scale-105 hover:z-20`}
      style={{ transitionDelay: `${idx * 50}ms` }}
    >
      {/* Mesh gradient background */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse at 20% 20%, ${item.accent}22 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, ${item.accent}18 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, ${item.accent}0a 0%, transparent 70%),
          linear-gradient(135deg, ${item.bg} 0%, #0f171e 100%)
        `
      }} />

      {/* Animated geometric pattern */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large icon */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.07] group-hover:opacity-[0.15] transition-opacity duration-500">
          <span className="material-symbols-outlined text-white" style={{ fontSize: isWide ? 120 : 80 }}>{item.icon}</span>
        </div>
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-[0.06]"
          style={{ background: `radial-gradient(circle, ${item.accent}, transparent)` }} />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-[0.04]"
          style={{ background: `radial-gradient(circle, ${item.accent}, transparent)` }} />
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(${item.accent}40 1px, transparent 1px), linear-gradient(90deg, ${item.accent}40 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Hover glow border */}
      <div className="absolute inset-0 rounded-xl border border-white/[0.06] group-hover:border-white/[0.15] transition-all duration-300" />
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ boxShadow: `0 0 30px ${item.accent}30, inset 0 0 30px ${item.accent}08` }} />

      {/* Bottom gradient for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {item.progress !== undefined && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold" style={{ color: item.accent }}>{item.progress}% complete</span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.progress}%`, backgroundColor: item.accent }} />
            </div>
          </div>
        )}
        <h3 className="text-white font-bold text-sm leading-snug">{item.title}</h3>
        <p className="text-white/50 text-xs mt-1">{item.episodes} episodes</p>
      </div>

      {/* Badges */}
      {item.badge && (
        <div className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-md"
          style={{ backgroundColor: item.accent, color: '#0f171e' }}>
          {item.badge}
        </div>
      )}
    </Link>
  );
}

/* ─── Component ─── */
export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll('.reveal-on-scroll');
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-bg-dark text-text-primary overflow-x-hidden">

      {/* ════════════════════ FIXED TOP NAV ════════════════════ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-bg-dark/95 backdrop-blur-md shadow-lg shadow-black/30' : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="material-symbols-outlined text-primary text-3xl group-hover:scale-110 transition-transform">play_circle</span>
            <span className="text-xl font-extrabold text-text-white tracking-tight">
              Prime<span className="text-primary">Learn</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href}
                className="text-sm font-medium text-text-secondary hover:text-text-white transition-colors">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center bg-surface-dark/60 border border-border-dark rounded-full px-3 py-1.5 gap-2 focus-within:border-primary/50 transition-colors">
              <span className="material-symbols-outlined text-text-muted text-lg">search</span>
              <input type="text" placeholder="Search..."
                className="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-32 focus:w-48 transition-all" />
            </div>
            <button className="relative text-text-secondary hover:text-text-white transition-colors">
              <span className="material-symbols-outlined text-xl">notifications</span>
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center text-xs font-bold text-bg-dark cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
              U
            </div>
          </div>
        </div>
      </nav>

      {/* ════════════════════ HERO SECTION ════════════════════ */}
      <section className="relative h-[90vh] flex items-center overflow-hidden">
        {/* Floating learning icons & code snippets */}
        <FloatingElements />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-900/10" />
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-bg-dark to-transparent" />

        {/* Hero content */}
        <div className="relative z-10 max-w-[1400px] mx-auto w-full px-6">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6"
            >
              <span className="material-symbols-outlined text-sm">verified</span>
              AI-Powered Learning Platform
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="text-5xl md:text-7xl font-extrabold tracking-tight text-text-white mb-6 leading-[1.08]"
            >
              Your Learning{' '}
              <br className="hidden md:block" />
              Journey,{' '}
              <span className="text-primary italic">Streamed.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-text-secondary text-lg md:text-xl leading-relaxed mb-10 max-w-lg"
            >
              Cinematic, AI-powered learning experiences that adapt to you.
              Master any skill through binge-worthy seasons and smart assessments.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="flex items-center gap-4"
            >
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 bg-accent text-bg-dark font-bold px-8 py-4 rounded-lg text-base hover:brightness-110 transition-all gold-glow hover:scale-105"
              >
                <span className="material-symbols-outlined text-xl">play_arrow</span>
                Begin Journey
              </Link>
              <Link href="/home"
                className="inline-flex items-center gap-2 border border-border-dark text-text-primary font-semibold px-6 py-4 rounded-lg text-base hover:border-primary hover:text-primary transition-all hover:bg-primary/5">
                <span className="material-symbols-outlined text-xl">explore</span>
                Explore Courses
              </Link>
            </motion.div>

            {/* Stats strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="flex items-center gap-8 mt-12"
            >
              {[
                { label: 'AI-Generated', value: 'Courses', icon: 'auto_awesome' },
                { label: 'Personalized', value: 'Learning', icon: 'psychology' },
                { label: 'Adaptive', value: 'Assessments', icon: 'quiz' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">{s.icon}</span>
                  <div>
                    <p className="text-text-white text-sm font-bold">{s.value}</p>
                    <p className="text-text-muted text-[10px]">{s.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════════════════ MAIN CONTENT ════════════════════ */}
      <main className="relative z-10 pt-8">

        {/* ─── Continue Learning Row ─── */}
        <section className="max-w-[1400px] mx-auto px-6 mb-16 reveal-on-scroll">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-white">Continue Learning</h2>
            <Link href="/home" className="text-sm text-text-secondary hover:text-primary transition-colors flex items-center gap-1">
              View all <span className="material-symbols-outlined text-base">chevron_right</span>
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4">
            {continueLearning.map((item, idx) => (
              <CourseCard key={item.title} item={item} idx={idx} variant="wide" />
            ))}
          </div>
        </section>

        {/* ─── New Releases ─── */}
        <section className="max-w-[1400px] mx-auto px-6 mb-16 reveal-on-scroll">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-white">New Releases in Full Stack</h2>
            <Link href="/home" className="text-sm text-text-secondary hover:text-primary transition-colors flex items-center gap-1">
              View all <span className="material-symbols-outlined text-base">chevron_right</span>
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4">
            {newReleases.map((item, idx) => (
              <CourseCard key={item.title} item={{ ...item, badge: 'NEW' }} idx={idx} variant="tall" />
            ))}
          </div>
        </section>

        {/* ─── Trending in System Design ─── */}
        <section className="max-w-[1400px] mx-auto px-6 mb-20 reveal-on-scroll">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-white">Trending in System Design</h2>
            <Link href="/home" className="text-sm text-text-secondary hover:text-primary transition-colors flex items-center gap-1">
              View all <span className="material-symbols-outlined text-base">chevron_right</span>
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4">
            {trendingDesign.map((item, idx) => (
              <CourseCard key={item.title} item={{ ...item, badge: 'TRENDING' }} idx={idx} variant="wide" />
            ))}
          </div>
        </section>
      </main>

      {/* ════════════════════ FOOTER ════════════════════ */}
      <footer className="border-t border-border-dark bg-bg-deeper">
        <div className="max-w-[1400px] mx-auto px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary text-2xl">play_circle</span>
                <span className="text-lg font-extrabold text-text-white">
                  Prime<span className="text-primary">Learn</span>
                </span>
              </div>
              <p className="text-text-secondary text-sm leading-relaxed">
                Cinematic AI-powered learning that adapts to your pace and fills your knowledge gaps.
              </p>
            </div>
            <div>
              <h4 className="text-text-white font-semibold text-sm mb-3">Explore</h4>
              <ul className="space-y-2">
                {['Courses', 'Skills', 'Mentors', 'Library'].map((l) => (
                  <li key={l}>
                    <Link href="/home" className="text-text-secondary text-sm hover:text-primary transition-colors">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-text-white font-semibold text-sm mb-3">Resources</h4>
              <ul className="space-y-2">
                {['Documentation', 'API', 'Community', 'Blog'].map((l) => (
                  <li key={l}>
                    <Link href="/" className="text-text-secondary text-sm hover:text-primary transition-colors">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-text-white font-semibold text-sm mb-3">Company</h4>
              <ul className="space-y-2">
                {['About', 'Careers', 'Privacy', 'Terms'].map((l) => (
                  <li key={l}>
                    <Link href="/" className="text-text-secondary text-sm hover:text-primary transition-colors">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-border-dark pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-text-muted text-xs">
              Built for the <span className="text-accent">AWS AI for Bharat Hackathon</span>
            </p>
            <p className="text-text-muted text-xs">
              &copy; 2026 PrimeLearn. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

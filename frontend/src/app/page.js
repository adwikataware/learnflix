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
  { title: 'React & Next.js Mastery', progress: 68, episodes: 24, icon: 'code', accent: '#C17C64', bg: '#3D2E24' },
  { title: 'Node.js Backend Deep Dive', progress: 42, episodes: 18, icon: 'dns', accent: '#8FA395', bg: '#2A3830' },
  { title: 'TypeScript Fundamentals', progress: 85, episodes: 12, icon: 'data_object', accent: '#B8926A', bg: '#3D3425' },
  { title: 'GraphQL API Design', progress: 30, episodes: 16, icon: 'hub', accent: '#D4A574', bg: '#3D3020' },
  { title: 'Docker & Kubernetes', progress: 55, episodes: 20, icon: 'cloud', accent: '#A68E7B', bg: '#35302A' },
  { title: 'PostgreSQL Advanced', progress: 15, episodes: 14, icon: 'storage', accent: '#CB8A5E', bg: '#3D2A18' },
];

const newReleases = [
  { title: 'Full Stack with AI', episodes: 22, icon: 'smart_toy', accent: '#C17C64', bg: '#3D2E24' },
  { title: 'MERN Stack 2026', episodes: 28, icon: 'stacks', accent: '#B8926A', bg: '#3D3425' },
  { title: 'Serverless Architecture', episodes: 16, icon: 'cloud_queue', accent: '#8FA395', bg: '#2A3830' },
  { title: 'React Native Mobile', episodes: 20, icon: 'smartphone', accent: '#D4A574', bg: '#3D3020' },
  { title: 'Vue.js 4 Complete', episodes: 18, icon: 'view_quilt', accent: '#A68E7B', bg: '#35302A' },
  { title: 'Django REST APIs', episodes: 14, icon: 'api', accent: '#CB8A5E', bg: '#3D2A18' },
];

const trendingDesign = [
  { title: 'Microservices Patterns', episodes: 24, icon: 'account_tree', accent: '#B8926A', bg: '#3D3425' },
  { title: 'Event-Driven Systems', episodes: 18, icon: 'bolt', accent: '#C17C64', bg: '#3D2E24' },
  { title: 'Database Sharding', episodes: 12, icon: 'grid_view', accent: '#8FA395', bg: '#2A3830' },
  { title: 'Load Balancing & CDN', episodes: 10, icon: 'balance', accent: '#D4A574', bg: '#3D3020' },
  { title: 'API Gateway Design', episodes: 16, icon: 'router', accent: '#A68E7B', bg: '#35302A' },
  { title: 'Caching Strategies', episodes: 14, icon: 'cached', accent: '#CB8A5E', bg: '#3D2A18' },
];

/* ─── Floating Learning Elements Background ─── */
const FLOAT_ITEMS = [
  // Code snippets
  { type: 'code', text: 'const learn = () =>', color: '#C17C6440' },
  { type: 'code', text: 'import AI from "brain"', color: '#B8926A40' },
  { type: 'code', text: 'async function grow()', color: '#8FA39540' },
  { type: 'code', text: '<Knowledge />', color: '#A68E7B40' },
  { type: 'code', text: 'model.fit(data)', color: '#D4A57440' },
  { type: 'code', text: 'git push origin master', color: '#CB8A5E40' },
  // Icons
  { type: 'icon', text: 'school', color: '#C17C6430' },
  { type: 'icon', text: 'psychology', color: '#B8926A30' },
  { type: 'icon', text: 'code', color: '#8FA39530' },
  { type: 'icon', text: 'auto_awesome', color: '#D4A57430' },
  { type: 'icon', text: 'terminal', color: '#A68E7B30' },
  { type: 'icon', text: 'neurology', color: '#CB8A5E30' },
  { type: 'icon', text: 'lightbulb', color: '#8FA39530' },
  { type: 'icon', text: 'rocket_launch', color: '#D4A57430' },
  { type: 'icon', text: 'data_object', color: '#B8926A30' },
  { type: 'icon', text: 'hub', color: '#C17C6430' },
  { type: 'icon', text: 'science', color: '#A68E7B30' },
  { type: 'icon', text: 'menu_book', color: '#8FA39530' },
];

const FLOAT_SEEDS = [
  { x: 52, y: 12, dur: 18, del: 3, sz: 32, op: 0.10 },
  { x: 78, y: 45, dur: 22, del: 7, sz: 38, op: 0.14 },
  { x: 65, y: 72, dur: 28, del: 2, sz: 12, op: 0.12 },
  { x: 88, y: 25, dur: 16, del: 10, sz: 35, op: 0.09 },
  { x: 45, y: 60, dur: 32, del: 5, sz: 30, op: 0.18 },
  { x: 72, y: 80, dur: 20, del: 8, sz: 12, op: 0.11 },
  { x: 55, y: 35, dur: 25, del: 1, sz: 40, op: 0.15 },
  { x: 90, y: 55, dur: 19, del: 12, sz: 28, op: 0.10 },
  { x: 48, y: 88, dur: 30, del: 6, sz: 12, op: 0.13 },
  { x: 82, y: 15, dur: 21, del: 4, sz: 36, op: 0.16 },
  { x: 60, y: 50, dur: 17, del: 9, sz: 33, op: 0.12 },
  { x: 75, y: 68, dur: 26, del: 11, sz: 12, op: 0.09 },
];

function FloatingElements() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {FLOAT_ITEMS.map((item, i) => {
        const seed = FLOAT_SEEDS[i % FLOAT_SEEDS.length];
        const startX = seed.x;
        const startY = seed.y;
        const dur = seed.dur;
        const delay = -seed.del;
        const size = item.type === 'icon' ? seed.sz : 12;
        const opacity = seed.op;

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

/* ─── Ambient Blobs ─── */
function AmbientBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute w-[600px] h-[600px] rounded-full animate-drift"
        style={{
          top: '-10%', right: '-5%',
          background: 'radial-gradient(circle, rgba(193,124,100,0.12) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full animate-breathe"
        style={{
          bottom: '10%', left: '-8%',
          background: 'radial-gradient(circle, rgba(143,163,149,0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animationDelay: '-3s',
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full animate-drift"
        style={{
          top: '40%', left: '30%',
          background: 'radial-gradient(circle, rgba(212,165,116,0.05) 0%, transparent 70%)',
          filter: 'blur(70px)',
          animationDelay: '-10s',
        }}
      />
    </div>
  );
}

/* ─── Card with generated visual ─── */
function CourseCard({ item, idx, variant = 'wide' }) {
  const isWide = variant === 'wide';
  return (
    <Link href="/home"
      className={`group flex-shrink-0 ${isWide ? 'w-72 md:w-80' : 'w-44 md:w-48'} rounded-2xl overflow-hidden relative cursor-pointer card-lift bg-white border border-[#E2D8CC]`}
      style={{ transitionDelay: `${idx * 50}ms` }}
    >
      {/* Colored header area with icon */}
      <div
        className={`relative ${isWide ? 'h-32' : 'h-36'} overflow-hidden`}
        style={{ background: `linear-gradient(135deg, ${item.accent}18 0%, ${item.accent}08 50%, transparent 100%)` }}
      >
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(${item.accent} 1px, transparent 1px)`,
          backgroundSize: '16px 16px',
        }} />

        {/* Diagonal accent strip */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-[0.08]"
          style={{ backgroundColor: item.accent }} />
        <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-[0.05]"
          style={{ backgroundColor: item.accent }} />

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500"
              style={{ backgroundColor: `${item.accent}15`, border: `1.5px solid ${item.accent}25` }}
            >
              <span className="material-symbols-outlined group-hover:scale-110 transition-transform duration-500"
                style={{ fontSize: 32, color: item.accent, fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
            </div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
      </div>

      {/* Content */}
      <div className="px-4 pb-4 pt-1">
        {item.progress !== undefined && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold" style={{ color: item.accent }}>{item.progress}% complete</span>
            </div>
            <div className="w-full h-1.5 bg-[#E2D8CC] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.progress}%`, backgroundColor: item.accent }} />
            </div>
          </div>
        )}
        <h3 className="text-[#2A2018] font-semibold text-sm leading-snug" style={{ fontFamily: '"Manrope", sans-serif' }}>{item.title}</h3>
        <p className="text-[#9A8E82] text-xs mt-1">{item.episodes} episodes</p>
      </div>

      {/* Hover border accent */}
      <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-opacity-30 transition-all duration-500"
        style={{ borderColor: 'transparent' }}
      />
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ boxShadow: `0 4px 20px ${item.accent}20` }}
      />

      {/* Badges */}
      {item.badge && (
        <div className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wide shadow-sm"
          style={{ backgroundColor: item.accent, color: '#fff' }}>
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
    <div className="min-h-screen bg-bg-dark text-text-primary overflow-x-hidden relative">
      {/* Grain overlay */}
      <div className="fixed inset-0 pointer-events-none bg-noise z-[100]" />

      {/* ════════════════════ FIXED TOP NAV ════════════════════ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'bg-bg-dark/90 backdrop-blur-xl shadow-lg shadow-black/5 border-b border-border-dark/50' : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="material-symbols-outlined text-primary text-2xl group-hover:scale-110 transition-transform duration-300">play_circle</span>
            <span className="text-xl font-bold text-text-white tracking-tight" style={{ fontFamily: '"Playfair Display", serif' }}>
              Prime<span className="text-primary">Learn</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href}
                className="text-sm font-medium text-text-muted hover:text-text-white transition-colors duration-300 relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[1.5px] after:bg-primary after:transition-all after:duration-300 hover:after:w-full">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center bg-surface-dark/40 border border-border-dark/60 rounded-full px-3.5 py-1.5 gap-2 focus-within:border-primary/40 transition-colors duration-300">
              <span className="material-symbols-outlined text-text-muted text-lg">search</span>
              <input type="text" placeholder="Search..."
                className="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-32 focus:w-48 transition-all duration-300" />
            </div>
            <button className="relative text-text-muted hover:text-text-white transition-colors duration-300">
              <span className="material-symbols-outlined text-xl">notifications</span>
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all duration-300">
              U
            </div>
          </div>
        </div>
      </nav>

      {/* ════════════════════ HERO SECTION ════════════════════ */}
      <section className="relative h-[90vh] flex items-center overflow-hidden">
        {/* Ambient blobs */}
        <AmbientBlobs />

        {/* Floating learning icons & code snippets */}
        <FloatingElements />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-success/5" />
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-bg-dark to-transparent" />

        {/* Hero content */}
        <div className="relative z-10 max-w-[1400px] mx-auto w-full px-6">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold px-4 py-2 rounded-full mb-6"
            >
              <span className="material-symbols-outlined text-sm">verified</span>
              AI-Powered Learning Platform
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="text-5xl md:text-7xl font-bold tracking-tight text-text-white mb-6 leading-[1.08]"
              style={{ fontFamily: '"Playfair Display", serif' }}
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
                className="inline-flex items-center gap-2 bg-primary text-white font-bold px-8 py-4 rounded-xl text-base hover:brightness-110 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg hover:shadow-primary/20"
              >
                <span className="material-symbols-outlined text-xl">play_arrow</span>
                Begin Journey
              </Link>
              <Link href="/home"
                className="inline-flex items-center gap-2 border border-border-dark text-text-primary font-semibold px-6 py-4 rounded-xl text-base hover:border-primary/50 hover:text-primary transition-all duration-300 hover:bg-primary/5">
                <span className="material-symbols-outlined text-xl">explore</span>
                Explore Courses
              </Link>
            </motion.div>

            {/* Stats strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="flex items-center gap-8 mt-14"
            >
              {[
                { label: 'AI-Generated', value: 'Courses', icon: 'auto_awesome' },
                { label: 'Personalized', value: 'Learning', icon: 'psychology' },
                { label: 'Adaptive', value: 'Assessments', icon: 'quiz' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary/70 text-lg">{s.icon}</span>
                  <div>
                    <p className="text-text-white text-sm font-semibold">{s.value}</p>
                    <p className="text-text-muted text-[10px] tracking-wide uppercase">{s.label}</p>
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
            <h2 className="text-2xl text-text-white" style={{ fontFamily: '"Playfair Display", serif' }}>Continue Learning</h2>
            <Link href="/home" className="text-sm text-text-muted hover:text-primary transition-colors duration-300 flex items-center gap-1">
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
            <h2 className="text-2xl text-text-white" style={{ fontFamily: '"Playfair Display", serif' }}>New Releases in Full Stack</h2>
            <Link href="/home" className="text-sm text-text-muted hover:text-primary transition-colors duration-300 flex items-center gap-1">
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
            <h2 className="text-2xl text-text-white" style={{ fontFamily: '"Playfair Display", serif' }}>Trending in System Design</h2>
            <Link href="/home" className="text-sm text-text-muted hover:text-primary transition-colors duration-300 flex items-center gap-1">
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

    </div>
  );
}

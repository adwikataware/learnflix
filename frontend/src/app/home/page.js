"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useInView } from 'framer-motion';
import ShareCard from '@/components/ShareCard';
import AppLayout from '@/components/layout/AppLayout';
import { getLearnerId, getLearnerName, getDashboard, getConstellation, getActiveProfile } from '@/lib/api';

const TRENDING_NEWS = {
    'Computer Science': [
        { title: 'GPT-5 Released: What It Means for Developers', tag: 'AI', image: 'smart_toy', match: 95 },
        { title: 'Rust Overtakes C++ in Systems Programming', tag: 'Languages', image: 'code', match: 88 },
        { title: 'WebAssembly 3.0: The Future of Browser Computing', tag: 'Web', image: 'language', match: 82 },
    ],
    'Data Science': [
        { title: 'OpenAI Launches Data Analysis Agents', tag: 'AI', image: 'smart_toy', match: 93 },
        { title: 'Python 3.14 Brings Native DataFrame Support', tag: 'Tools', image: 'code', match: 87 },
        { title: 'Real-Time ML Inference at Scale', tag: 'ML Ops', image: 'cloud', match: 79 },
    ],
    'Finance & Business': [
        { title: 'RBI Launches Digital Rupee 2.0', tag: 'FinTech', image: 'currency_rupee', match: 91 },
        { title: 'AI-Powered Trading Algorithms Reshape Markets', tag: 'Trading', image: 'trending_up', match: 85 },
        { title: 'India Becomes World\'s 3rd Largest Economy', tag: 'Economy', image: 'public', match: 78 },
    ],
    'default': [
        { title: 'AI Transforms Education: Personalized Learning', tag: 'EdTech', image: 'school', match: 90 },
        { title: 'India\'s Skill India 2.0 Trains 10M', tag: 'India', image: 'public', match: 84 },
        { title: 'Remote Learning Platforms See 300% Growth', tag: 'Trends', image: 'trending_up', match: 76 },
    ],
};

const COURSE_ICONS = [
    'code', 'database', 'terminal', 'hub', 'memory', 'analytics', 'cloud',
    'language', 'smart_toy', 'calculate', 'science', 'security', 'account_tree',
    'data_object', 'dns', 'model_training', 'neurology', 'query_stats',
];

const COURSE_COLORS = ['#E50914', '#E87C03', '#46D369', '#5DADE2', '#AF7AC5', '#F4D03F', '#E50914', '#E87C03', '#46D369', '#5DADE2', '#AF7AC5', '#F4D03F', '#E50914', '#E87C03'];

function ScrollReveal({ children, className = '', delay = 0 }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-60px" });
    return (
        <motion.div ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={className}>
            {children}
        </motion.div>
    );
}

// Netflix-style horizontal row with title
function CourseRow({ title, icon, courses, router, startIdx = 0 }) {
    const scrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScroll = () => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 10);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    };

    const scroll = (dir) => {
        scrollRef.current?.scrollBy({ left: dir * 400, behavior: 'smooth' });
    };

    return (
        <div className="relative group/row">
            <div className="flex items-center justify-between mb-3 px-4 lg:px-12">
                <h3 className="text-base lg:text-lg font-bold text-white flex items-center gap-2">
                    {icon && <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>{icon}</span>}
                    {title}
                </h3>
                <button className="text-[11px] text-[#808080] hover:text-white transition-colors font-semibold flex items-center gap-1">
                    Explore All <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
                </button>
            </div>

            <div className="relative">
                {/* Left arrow */}
                {canScrollLeft && (
                    <button onClick={() => scroll(-1)}
                        className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-[#141414] to-transparent flex items-center justify-start pl-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white text-3xl">chevron_left</span>
                    </button>
                )}
                {/* Right arrow */}
                {canScrollRight && (
                    <button onClick={() => scroll(1)}
                        className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-[#141414] to-transparent flex items-center justify-end pr-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white text-3xl">chevron_right</span>
                    </button>
                )}

                <div ref={scrollRef} onScroll={checkScroll}
                    className="flex gap-2 overflow-x-auto hide-scrollbar px-4 lg:px-12 pb-2">
                    {courses.map((course, idx) => {
                        const color = COURSE_COLORS[(startIdx + idx) % COURSE_COLORS.length];
                        const iconName = COURSE_ICONS[(startIdx + idx) % COURSE_ICONS.length];
                        return (
                            <motion.div key={course.concept_id || idx}
                                whileHover={{ scale: 1.08, zIndex: 20 }}
                                transition={{ duration: 0.2 }}
                                onClick={() => router.push(`/season/${course.concept_id}`)}
                                className="flex-shrink-0 w-[200px] lg:w-[230px] rounded overflow-hidden cursor-pointer group/card relative"
                                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>

                                <div className="aspect-[16/10] relative bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A]">
                                    <div className="absolute inset-0 opacity-20" style={{ background: `linear-gradient(135deg, ${color}40, transparent 70%)` }} />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white/15 group-hover/card:text-white/35 transition-all duration-300"
                                            style={{ fontSize: 48, fontVariationSettings: "'FILL' 1" }}>{iconName}</span>
                                    </div>

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-200">
                                        <div className="size-11 rounded-full bg-white/90 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-black" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    {course.mastery > 0 && (
                                        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#333]">
                                            <div className="h-full bg-[#E50914]" style={{ width: `${Math.round(course.mastery * 100)}%` }} />
                                        </div>
                                    )}

                                    {/* Maturity / difficulty badge */}
                                    <div className="absolute bottom-2 right-2 bg-[#333]/80 text-white/70 text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/10">
                                        {idx < 3 ? 'Beginner' : idx < 7 ? 'Intermediate' : 'Advanced'}
                                    </div>
                                </div>

                                <div className="bg-[#181818] px-3 py-2.5">
                                    <p className="text-white/90 text-[13px] font-semibold truncate group-hover/card:text-white">{course.label}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {course.mastery > 0 && (
                                            <span className="text-[#46D369] text-[10px] font-bold">{Math.round(course.mastery * 100)}%</span>
                                        )}
                                        <span className="text-[#808080] text-[10px]">
                                            {course.status === 'mastered' ? 'Completed' : course.mastery > 0 ? 'In Progress' : 'New'}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default function HomePage() {
    const router = useRouter();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [learnerName, setLN] = useState('');
    const [specialization, setSpecialization] = useState('default');
    const [stats, setStats] = useState({ xp: 0, streak: 0, mastered: 0, level: 1 });
    const [bannerIndex, setBannerIndex] = useState(0);
    const [showShare, setShowShare] = useState(false);

    useEffect(() => {
        const lid = getLearnerId();
        if (!lid) { router.push('/profiles'); return; }
        setLN(getLearnerName());
        const ap = getActiveProfile();
        if (ap?.specialization) setSpecialization(ap.specialization);

        async function fetchData() {
            const [constRes, dashRes] = await Promise.all([getConstellation(lid), getDashboard(lid)]);
            if (!constRes.error && constRes.data?.nodes?.length > 0) {
                const raw = constRes.data.nodes.map((n, i) => ({
                    concept_id: n.concept_id || n.id,
                    label: n.label || n.concept_id || `Course ${i + 1}`,
                    apiStatus: n.status || n.state || 'locked',
                    mastery: n.mastery ?? n.p_known ?? 0,
                }));
                const withStatus = raw.map(node => {
                    if (node.mastery >= 0.8 || node.apiStatus === 'mastered') return { ...node, status: 'mastered', mastery: node.mastery || 1 };
                    return { ...node, status: 'active' };
                });
                // Also load custom courses from localStorage
                const customKey = `learnflix_custom_courses_${lid}`;
                const customCourses = JSON.parse(localStorage.getItem(customKey) || '[]');
                setCourses([...withStatus, ...customCourses]);
            }
            if (!dashRes.error && dashRes.data) {
                const d = dashRes.data;
                setStats({
                    xp: d.stats?.xp ?? d.profile?.xp ?? 0,
                    streak: d.stats?.streak ?? d.profile?.streak ?? 0,
                    mastered: d.stats?.total_mastered ?? d.mastery?.total_mastered ?? 0,
                    level: d.stats?.level ?? d.profile?.level ?? 1,
                });
            }
            setLoading(false);
        }
        fetchData();
    }, [router]);

    const newsItems = TRENDING_NEWS[specialization] || TRENDING_NEWS['default'];
    useEffect(() => {
        const i = setInterval(() => setBannerIndex(p => (p + 1) % newsItems.length), 5000);
        return () => clearInterval(i);
    }, [newsItems.length]);

    const masteredCount = courses.filter(n => n.status === 'mastered').length;
    const totalProgress = courses.length > 0 ? Math.round((masteredCount / courses.length) * 100) : 0;
    const activeCourse = courses.find(n => n.status === 'active' && n.mastery > 0) || courses[0];
    const inProgress = courses.filter(c => c.mastery > 0 && c.status !== 'mastered');
    const notStarted = courses.filter(c => c.mastery === 0);

    if (loading) {
        return (
            <AppLayout>
                <div className="h-[80vh] flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="flex flex-col min-h-[calc(100vh-64px)] overflow-x-hidden w-full">

                {/* ═══ NETFLIX-STYLE HERO BANNER (Full width, cinematic) ═══ */}
                <div className="relative w-full" style={{ minHeight: 420 }}>
                    {/* Background animated visual — education-themed particles */}
                    <div className="absolute inset-0 overflow-hidden">
                        {/* Animated gradient blobs */}
                        <motion.div className="absolute w-[500px] h-[500px] rounded-full"
                            style={{ top: '-10%', right: '5%', background: 'radial-gradient(circle, rgba(229,9,20,0.08), transparent 70%)', filter: 'blur(60px)' }}
                            animate={{ x: [0, 30, -20, 0], y: [0, -20, 15, 0], scale: [1, 1.1, 0.95, 1] }}
                            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} />
                        <motion.div className="absolute w-[400px] h-[400px] rounded-full"
                            style={{ bottom: '5%', left: '20%', background: 'radial-gradient(circle, rgba(70,211,105,0.05), transparent 70%)', filter: 'blur(50px)' }}
                            animate={{ x: [0, -25, 15, 0], y: [0, 20, -10, 0] }}
                            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: -5 }} />

                        {/* Floating education icons */}
                        {['code', 'school', 'science', 'calculate', 'terminal', 'psychology', 'analytics', 'hub'].map((ic, i) => (
                            <motion.span key={ic}
                                className="material-symbols-outlined text-white/[0.03] absolute select-none pointer-events-none"
                                style={{ fontSize: 40 + i * 8, left: `${10 + i * 11}%`, top: `${15 + (i % 3) * 25}%`, fontVariationSettings: "'FILL' 1" }}
                                animate={{ y: [0, -15, 5, -10, 0], rotate: [0, 3, -2, 1, 0] }}
                                transition={{ duration: 12 + i * 2, repeat: Infinity, ease: 'easeInOut', delay: -i * 1.5 }}>
                                {ic}
                            </motion.span>
                        ))}
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/60 via-[#141414]/80 to-[#141414]" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-transparent to-transparent" />

                    {/* Featured course icon (large, faded) */}
                    {activeCourse && (
                        <div className="absolute right-[10%] top-1/2 -translate-y-1/2 opacity-[0.04]">
                            <span className="material-symbols-outlined text-white" style={{ fontSize: 300, fontVariationSettings: "'FILL' 1" }}>
                                {COURSE_ICONS[0]}
                            </span>
                        </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#141414] to-transparent z-10" />

                    <div className="relative z-20 px-6 lg:px-12 pt-12 pb-16 max-w-4xl">
                        {/* LearnFlix original badge */}
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                            className="flex items-center gap-2 mb-4">
                            <span className="text-[#E50914] font-black text-sm tracking-tight">L</span>
                            <span className="text-white/50 text-[11px] font-bold uppercase tracking-widest">LearnFlix Original</span>
                        </motion.div>

                        {/* Trending news title */}
                        {newsItems.map((news, idx) => (
                            <motion.div key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: bannerIndex === idx ? 1 : 0, y: bannerIndex === idx ? 0 : 20 }}
                                transition={{ duration: 0.6 }}
                                className={bannerIndex === idx ? 'block' : 'hidden'}>
                                <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold text-white leading-[1.1] mb-4 max-w-3xl">
                                    {news.title}
                                </h1>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-[#46D369] text-sm font-bold">{news.match}% Match</span>
                                    <span className="text-white/50 text-sm">2026</span>
                                    <span className="border border-white/30 text-white/60 text-[10px] px-1.5 py-0.5 rounded">{news.tag}</span>
                                    <span className="text-white/50 text-sm">{specialization}</span>
                                </div>
                                <p className="text-white/60 text-sm lg:text-base max-w-xl leading-relaxed mb-6">
                                    Stay updated with the latest trends in your field. Explore curated courses designed by AI to match your learning goals.
                                </p>
                            </motion.div>
                        ))}

                        {/* Hero CTA buttons — Netflix style */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                            className="flex items-center gap-3">
                            {activeCourse && (
                                <button onClick={() => router.push(`/season/${activeCourse.concept_id}`)}
                                    className="flex items-center gap-2 bg-white text-black font-bold text-base px-7 py-3 rounded hover:bg-white/85 transition-all">
                                    <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                                    {inProgress.length > 0 ? 'Resume' : 'Play'}
                                </button>
                            )}
                            <button onClick={() => router.push('/dashboard')}
                                className="flex items-center gap-2 bg-[#6D6D6E]/70 text-white font-bold text-base px-7 py-3 rounded hover:bg-[#6D6D6E] transition-all">
                                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>info</span>
                                My Progress
                            </button>
                        </motion.div>

                        {/* Banner dots */}
                        <div className="flex gap-2 mt-6">
                            {newsItems.map((_, idx) => (
                                <button key={idx} onClick={() => setBannerIndex(idx)}
                                    className={`h-[3px] rounded-full transition-all duration-500 ${bannerIndex === idx ? 'w-6 bg-white' : 'w-3 bg-white/30'}`} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* ═══ Stats strip (compact, below hero) ═══ */}
                <ScrollReveal className="px-4 lg:px-12 -mt-6 mb-6 relative z-20">
                    <div className="flex items-center gap-6 bg-[#1A1A1A]/80 backdrop-blur-md border border-[#2E2E2E] rounded-lg px-6 py-3">
                        {[
                            { icon: 'school', label: 'Mastered', value: masteredCount, color: '#46D369' },
                            { icon: 'local_fire_department', label: 'Streak', value: `${stats.streak}d`, color: '#E87C03' },
                            { icon: 'star', label: 'XP', value: stats.xp, color: '#E50914' },
                            { icon: 'military_tech', label: 'Progress', value: `${totalProgress}%`, color: '#5DADE2' },
                        ].map((s, i) => (
                            <div key={s.label} className="flex items-center gap-2">
                                <span className="material-symbols-outlined" style={{ fontSize: 18, color: s.color, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                                <span className="text-white font-bold text-sm">{s.value}</span>
                                <span className="text-[#808080] text-[10px] uppercase tracking-wider font-bold hidden sm:inline">{s.label}</span>
                                {i < 3 && <div className="w-px h-4 bg-[#333] ml-4 hidden sm:block" />}
                            </div>
                        ))}
                        <div className="ml-auto">
                            <button onClick={() => router.push('/profiles')}
                                className="text-[11px] text-[#808080] hover:text-white transition-colors flex items-center gap-1">
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>swap_horiz</span>
                                Switch
                            </button>
                        </div>
                    </div>
                </ScrollReveal>

                {/* ═══ Continue Watching Row ═══ */}
                {inProgress.length > 0 && (
                    <ScrollReveal className="mb-6" delay={0.05}>
                        <CourseRow title="Continue Watching" icon="history" courses={inProgress} router={router} startIdx={0} />
                    </ScrollReveal>
                )}

                {/* ═══ Top 10 in Your Field ═══ */}
                {courses.length > 0 && (
                    <ScrollReveal className="mb-6" delay={0.1}>
                        <div className="px-4 lg:px-12 mb-3">
                            <h3 className="text-base lg:text-lg font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#E50914]" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                                Top {Math.min(10, courses.length)} in {specialization} Today
                            </h3>
                        </div>
                        <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 lg:px-12 pb-2">
                            {courses.slice(0, 10).map((course, idx) => (
                                <motion.div key={course.concept_id}
                                    whileHover={{ scale: 1.05 }}
                                    onClick={() => router.push(`/season/${course.concept_id}`)}
                                    className="flex-shrink-0 flex items-end cursor-pointer group/top"
                                    style={{ width: 200 }}>
                                    {/* Big number */}
                                    <span className="text-[120px] font-black leading-none select-none -mr-3 relative z-10"
                                        style={{
                                            color: 'transparent',
                                            WebkitTextStroke: '3px rgba(255,255,255,0.15)',
                                            fontFamily: "'Manrope', sans-serif",
                                        }}>
                                        {idx + 1}
                                    </span>
                                    {/* Card */}
                                    <div className="w-[130px] flex-shrink-0 rounded overflow-hidden relative"
                                        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                                        <div className="aspect-[2/3] relative bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A]">
                                            <div className="absolute inset-0 opacity-25"
                                                style={{ background: `linear-gradient(180deg, ${COURSE_COLORS[idx]}30, transparent 60%)` }} />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-white/15 group-hover/top:text-white/30 transition-all"
                                                    style={{ fontSize: 44, fontVariationSettings: "'FILL' 1" }}>
                                                    {COURSE_ICONS[idx % COURSE_ICONS.length]}
                                                </span>
                                            </div>
                                            <div className="absolute top-2 left-2 text-[8px] font-black text-[#E50914]">LF</div>
                                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent pt-8 pb-2 px-2">
                                                <p className="text-white text-[11px] font-bold leading-tight">{course.label}</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </ScrollReveal>
                )}

                {/* ═══ All Courses Row ═══ */}
                {courses.length > 0 && (
                    <ScrollReveal className="mb-6" delay={0.15}>
                        <CourseRow title="Your Courses" icon="library_books" courses={courses} router={router} startIdx={0} />
                    </ScrollReveal>
                )}

                {/* ═══ New For You (courses not yet started) ═══ */}
                {notStarted.length > 3 && (
                    <ScrollReveal className="mb-6" delay={0.2}>
                        <CourseRow title="New For You" icon="new_releases" courses={notStarted} router={router} startIdx={5} />
                    </ScrollReveal>
                )}

                {/* ═══ "Because you studied X" row ═══ */}
                {inProgress.length > 0 && courses.length > 3 && (
                    <ScrollReveal className="mb-6" delay={0.25}>
                        <CourseRow
                            title={`Because You Studied ${inProgress[0]?.label?.split(' ')[0] || ''}`}
                            icon="recommend"
                            courses={courses.filter(c => c.concept_id !== inProgress[0]?.concept_id).slice(0, 8)}
                            router={router}
                            startIdx={3}
                        />
                    </ScrollReveal>
                )}

                {/* ═══ Quick Actions ═══ */}
                <ScrollReveal className="px-4 lg:px-12 mt-4 mb-10" delay={0.3}>
                    <div className="flex gap-3 overflow-x-auto hide-scrollbar">
                        {[
                            { icon: 'psychology', label: 'AI Mentor', desc: 'Ask any doubt', path: '/mentor', color: '#E87C03' },
                            { icon: 'analytics', label: 'Dashboard', desc: 'Track progress', path: '/dashboard', color: '#5DADE2' },
                            { icon: 'emoji_events', label: 'Achievements', desc: 'Badges & skills', path: '/profile', color: '#46D369' },
                            { icon: 'route', label: 'Bridge Sprint', desc: 'Fill gaps', path: '/bridge-sprint', color: '#E50914' },
                            { icon: 'share', label: 'Share Progress', desc: 'Show off!', action: () => setShowShare(true), color: '#1DA1F2' },
                        ].map(a => (
                            <button key={a.label} onClick={() => a.action ? a.action() : router.push(a.path)}
                                className="flex-shrink-0 bg-[#1E1E1E] border border-[#2E2E2E] rounded-lg px-5 py-3 flex items-center gap-3 hover:border-[#444] transition-all group/qa">
                                <span className="material-symbols-outlined group-hover/qa:scale-110 transition-transform" style={{ fontSize: 22, color: a.color, fontVariationSettings: "'FILL' 1" }}>{a.icon}</span>
                                <div className="text-left">
                                    <p className="text-white text-sm font-bold">{a.label}</p>
                                    <p className="text-[#808080] text-[10px]">{a.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </ScrollReveal>
            </div>

            {/* Share Card Modal */}
            <ShareCard isOpen={showShare} onClose={() => setShowShare(false)}
                stats={{ name: learnerName, xp: stats.xp, streak: stats.streak, mastered: masteredCount, courses: courses.length, level: stats.level }} />
        </AppLayout>
    );
}

'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { getLearnerName, getLearnerId, getConstellation } from '@/lib/api';

const STATUS_COLORS = { mastered: '#8FA395', active: '#C17C64', locked: '#9A8E82' };
const STATUS_ICONS = { mastered: 'check_circle', active: 'play_circle', locked: 'lock' };

export default function AppLayout({ children, hideHeader = false }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [learnerName, setLearnerName] = useState('Learner');
    const [streak, setStreak] = useState(0);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [courseNodes, setCourseNodes] = useState([]);
    const searchInputRef = useRef(null);
    const router = useRouter();

    useEffect(() => {
        setLearnerName(getLearnerName());
        const s = typeof window !== 'undefined' ? parseInt(localStorage.getItem('streak') || '0') : 0;
        setStreak(s);

        const lid = getLearnerId();
        if (lid) {
            getConstellation(lid).then(res => {
                if (!res.error && res.data?.nodes) {
                    setCourseNodes(res.data.nodes.map(n => {
                        const st = n.status || 'locked';
                        return {
                            label: n.label || n.concept_id,
                            concept_id: n.concept_id || n.id,
                            status: st,
                            mastery: st === 'mastered' ? (n.mastery ?? 1) : 0,
                        };
                    }));
                }
            });
        }
    }, []);

    // Focus input when overlay opens
    useEffect(() => {
        if (searchOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [searchOpen]);

    // Keyboard shortcuts: Escape to close, / to open
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') setSearchOpen(false);
            if (e.key === '/' && !searchOpen && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [searchOpen]);

    const filteredCourses = searchQuery.trim().length > 0
        ? courseNodes.filter(n => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
        : courseNodes;

    const activeCourses = courseNodes.filter(n => n.status === 'active');
    const masteredCourses = courseNodes.filter(n => n.status === 'mastered');

    const handleSelect = (node) => {
        setSearchOpen(false);
        setSearchQuery('');
        if (node.status !== 'locked') {
            router.push(`/season/${node.concept_id}`);
        }
    };

    return (
        <div className="flex min-h-screen bg-bg-dark">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="w-64 flex-shrink-0 hidden lg:block" />

            <div className="flex-1 flex flex-col min-h-screen w-full overflow-x-hidden overflow-y-auto">
                {!hideHeader && (
                    <header className="sticky top-0 z-30 flex items-center justify-between px-6 lg:px-8 py-3 glass-panel border-b border-border-dark">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 -ml-2 text-[#6B5E52] hover:text-[#2A2018] transition-colors"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>menu</span>
                        </button>

                        {/* Search trigger */}
                        <div className="flex-1 max-w-xl hidden sm:block">
                            <button
                                onClick={() => setSearchOpen(true)}
                                className="w-full flex items-center gap-3 bg-surface-dark border border-border-dark rounded-full py-2.5 pl-4 pr-4 text-sm text-[#9A8E82] hover:border-primary/40 transition-all"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>search</span>
                                <span>Search courses, concepts, or skills...</span>
                                <kbd className="ml-auto hidden lg:inline-flex items-center gap-0.5 text-[10px] text-[#9A8E82] bg-[#F0E7DC] border border-[#D8CCBE] px-2 py-0.5 rounded-md font-mono">/</kbd>
                            </button>
                        </div>

                        <div className="flex items-center gap-4 lg:gap-6 ml-auto">
                            <div className="hidden md:flex items-center gap-2">
                                <span className="material-symbols-outlined text-orange-500 animate-pulse" style={{ fontVariationSettings: "'FILL' 1", fontSize: 22 }}>local_fire_department</span>
                                <span className="text-[#2A2018] font-bold text-sm">{streak} Day Streak</span>
                            </div>
                            <button className="relative text-[#6B5E52] hover:text-[#2A2018] transition-colors">
                                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
                                <span className="absolute -top-0.5 -right-0.5 size-2 bg-primary rounded-full border-2 border-bg-dark" />
                            </button>
                            <div
                                className="flex items-center gap-3 pl-4 border-l border-border-dark cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => router.push('/profile')}
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-bold text-[#2A2018] leading-none">{learnerName}</p>
                                    <p className="text-[10px] text-primary uppercase tracking-wider font-bold mt-0.5">Active Learner</p>
                                </div>
                                <div className="size-9 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-primary/40 flex items-center justify-center">
                                    <span className="text-white font-extrabold text-sm">{learnerName.charAt(0).toUpperCase()}</span>
                                </div>
                            </div>
                        </div>
                    </header>
                )}

                {/* ═══ Search Overlay ═══ */}
                {searchOpen && (
                    <div className="fixed inset-0 z-50 flex flex-col">
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-[#2A2018]/70 backdrop-blur-md" onClick={() => setSearchOpen(false)} />

                        {/* Overlay content */}
                        <div className="relative z-10 flex flex-col h-full max-w-5xl mx-auto w-full px-6 pt-8">
                            {/* Search bar */}
                            <div className="flex items-center gap-4 mb-8">
                                <div className="flex-1 relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#6B5E52]" style={{ fontSize: 24 }}>search</span>
                                    <input
                                        ref={searchInputRef}
                                        className="w-full bg-white border border-[#D8CCBE] rounded-2xl py-4 pl-14 pr-6 text-lg text-[#2A2018] placeholder-[#9A8E82] focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                        placeholder="What do you want to learn?"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={() => setSearchOpen(false)}
                                    className="size-12 rounded-xl bg-white border border-[#D8CCBE] flex items-center justify-center text-[#6B5E52] hover:text-[#2A2018] hover:border-[#9A8E82] transition-all flex-shrink-0"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
                                </button>
                            </div>

                            {/* Content area */}
                            <div className="flex-1 overflow-y-auto pb-12" style={{ scrollbarWidth: 'thin', scrollbarColor: '#D8CCBE transparent' }}>
                                {/* Searching — show filtered results as cards */}
                                {searchQuery.trim().length > 0 ? (
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-[#9A8E82] mb-4">
                                            {filteredCourses.length} result{filteredCourses.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
                                        </p>
                                        {filteredCourses.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {filteredCourses.map((node) => (
                                                    <button
                                                        key={node.concept_id}
                                                        onClick={() => handleSelect(node)}
                                                        className={`text-left bg-white border rounded-xl p-4 transition-all group hover:scale-[1.03] ${
                                                            node.status === 'locked'
                                                                ? 'border-[#D8CCBE] opacity-50 cursor-not-allowed'
                                                                : 'border-[#D8CCBE] hover:border-primary/40 cursor-pointer'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="size-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${STATUS_COLORS[node.status]}15` }}>
                                                                <span className="material-symbols-outlined" style={{ fontSize: 18, color: STATUS_COLORS[node.status], fontVariationSettings: "'FILL' 1" }}>
                                                                    {STATUS_ICONS[node.status]}
                                                                </span>
                                                            </div>
                                                            <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${STATUS_COLORS[node.status]}12`, color: STATUS_COLORS[node.status] }}>
                                                                {node.status}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-[#2A2018] text-sm font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">{node.label}</h4>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 h-1 bg-[#E2D8CC] rounded-full overflow-hidden">
                                                                <div className="h-full rounded-full" style={{ width: `${Math.round(node.mastery * 100)}%`, backgroundColor: STATUS_COLORS[node.status] }} />
                                                            </div>
                                                            <span className="text-[10px] font-bold" style={{ color: STATUS_COLORS[node.status] }}>{Math.round(node.mastery * 100)}%</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-16">
                                                <span className="material-symbols-outlined text-[#9A8E82] mb-3" style={{ fontSize: 56 }}>search_off</span>
                                                <p className="text-[#9A8E82] text-lg font-semibold">No courses found</p>
                                                <p className="text-[#9A8E82] text-sm mt-1">Try a different search term</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        {/* Continue Learning */}
                                        {activeCourses.length > 0 && (
                                            <div className="mb-8">
                                                <p className="text-[11px] font-bold uppercase tracking-widest text-[#9A8E82] mb-4 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>play_circle</span>
                                                    Continue Learning
                                                </p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                                    {activeCourses.map((node) => (
                                                        <button
                                                            key={node.concept_id}
                                                            onClick={() => handleSelect(node)}
                                                            className="text-left bg-white border border-[#C17C64]/20 rounded-xl p-4 transition-all group hover:scale-[1.03] hover:border-primary/50 cursor-pointer relative overflow-hidden"
                                                        >
                                                            <div className="absolute inset-0 bg-gradient-to-br from-[#C17C64]/5 to-transparent pointer-events-none" />
                                                            <div className="relative">
                                                                <div className="size-10 rounded-lg bg-[#C17C64]/10 flex items-center justify-center mb-3">
                                                                    <span className="material-symbols-outlined text-[#C17C64]" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                                                                </div>
                                                                <h4 className="text-[#2A2018] text-sm font-semibold mb-2 group-hover:text-primary transition-colors">{node.label}</h4>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex-1 h-1.5 bg-[#E2D8CC] rounded-full overflow-hidden">
                                                                        <div className="h-full bg-[#C17C64] rounded-full" style={{ width: `${Math.round(node.mastery * 100)}%` }} />
                                                                    </div>
                                                                    <span className="text-[11px] font-bold text-[#C17C64]">{Math.round(node.mastery * 100)}%</span>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* All Seasons */}
                                        {courseNodes.length > 0 && (
                                            <div className="mb-8">
                                                <p className="text-[11px] font-bold uppercase tracking-widest text-[#9A8E82] mb-4 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[#D4A574]" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>star</span>
                                                    All Seasons
                                                </p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                                    {courseNodes.map((node) => (
                                                        <button
                                                            key={node.concept_id}
                                                            onClick={() => handleSelect(node)}
                                                            className={`text-left bg-white border rounded-xl p-4 transition-all group hover:scale-[1.03] ${
                                                                node.status === 'locked'
                                                                    ? 'border-[#D8CCBE] opacity-40 cursor-not-allowed'
                                                                    : 'border-[#D8CCBE] hover:border-primary/40 cursor-pointer'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="size-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${STATUS_COLORS[node.status]}15` }}>
                                                                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: STATUS_COLORS[node.status], fontVariationSettings: "'FILL' 1" }}>
                                                                        {STATUS_ICONS[node.status]}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${STATUS_COLORS[node.status]}12`, color: STATUS_COLORS[node.status] }}>
                                                                    {node.status}
                                                                </span>
                                                            </div>
                                                            <h4 className="text-[#2A2018] text-sm font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">{node.label}</h4>
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 h-1 bg-[#E2D8CC] rounded-full overflow-hidden">
                                                                    <div className="h-full rounded-full" style={{ width: `${Math.round(node.mastery * 100)}%`, backgroundColor: STATUS_COLORS[node.status] }} />
                                                                </div>
                                                                <span className="text-[10px] font-bold" style={{ color: STATUS_COLORS[node.status] }}>{Math.round(node.mastery * 100)}%</span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Quick Links Row */}
                                        <div>
                                            <p className="text-[11px] font-bold uppercase tracking-widest text-[#9A8E82] mb-4 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[#9A8E82]" style={{ fontSize: 16 }}>link</span>
                                                Quick Links
                                            </p>
                                            <div className="flex gap-3">
                                                {[
                                                    { icon: 'psychology', label: 'AI Mentor', path: '/mentor', color: '#C17C64' },
                                                    { icon: 'analytics', label: 'Dashboard', path: '/dashboard', color: '#D4A574' },
                                                    { icon: 'hub', label: 'Constellation', path: '/home', color: '#8FA395' },
                                                    { icon: 'swap_horiz', label: 'Change Topic', path: '/onboarding', color: '#B8926A' },
                                                ].map((link) => (
                                                    <button
                                                        key={link.path}
                                                        onClick={() => { setSearchOpen(false); router.push(link.path); }}
                                                        className="flex items-center gap-3 bg-white border border-[#D8CCBE] rounded-xl px-5 py-3 hover:border-primary/30 transition-all group"
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: link.color }}>{link.icon}</span>
                                                        <span className="text-sm text-[#3D3228] group-hover:text-[#2A2018] font-semibold">{link.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <main className="flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}

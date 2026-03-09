'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getLearnerId, getLearnerName } from '@/lib/api';

const NAV_ITEMS = [
    { icon: 'home', label: 'Home', path: '/home' },
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { icon: 'psychology', label: 'AI Mentor', path: '/mentor' },
    { icon: 'account_circle', label: 'Profile', path: '/profile' },
];

export default function Sidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const router = useRouter();
    const [streak, setStreak] = useState(0);
    const [learnerName, setLearnerName] = useState('Learner');

    useEffect(() => {
        setLearnerName(getLearnerName());
        const s = typeof window !== 'undefined' ? parseInt(localStorage.getItem('streak') || '0') : 0;
        setStreak(s);
    }, []);

    const navigate = (path) => {
        router.push(path);
        onClose?.();
    };

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />
            )}

            <aside className={`
                fixed left-0 top-0 h-screen w-64 bg-[#2A2018] border-r border-border-dark z-50
                flex flex-col transition-transform duration-300
                lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Logo */}
                <div className="p-6 flex items-center gap-3">
                    <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white">
                        <span className="material-symbols-outlined font-bold" style={{ fontSize: 24 }}>play_arrow</span>
                    </div>
                    <h1 className="text-xl font-extrabold tracking-tight">
                        <span className="text-white">Prime</span>
                        <span className="text-primary">Learn</span>
                    </h1>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-2 space-y-1">
                    <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">Navigation</p>
                    {NAV_ITEMS.map((item, idx) => {
                        const isActive = pathname === item.path || (item.path === '/home' && pathname === '/');
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                style={{ animationDelay: `${idx * 0.08}s` }}
                                className={`
                                    sidebar-nav-enter w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-left hover:translate-x-1
                                    ${isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-[#A89A8C] hover:bg-white/5 hover:text-slate-100'
                                    }
                                `}
                            >
                                <span className="material-symbols-outlined transition-transform group-hover:scale-110" style={{ fontSize: 22 }}>
                                    {item.icon}
                                </span>
                                <span className="text-sm font-semibold">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Daily Streak */}
                <div className="px-6 pb-4">
                    <div className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-[#3D3228] to-[#2A2018] p-4 border border-[#4A3E34]/50">
                        <span
                            className="material-symbols-outlined text-[#D4A574] mb-1 animate-pulse"
                            style={{ fontVariationSettings: "'FILL' 1", fontSize: 40 }}
                        >
                            local_fire_department
                        </span>
                        <p className="text-2xl font-extrabold text-white">{streak} Days</p>
                        <p className="text-[10px] text-[#A89A8C] mt-0.5">Keep it up, {learnerName.split(' ')[0]}!</p>
                    </div>
                </div>

                {/* Help Card */}
                <div className="px-6 pb-6">
                    <div className="bg-primary/5 rounded-2xl p-4 border border-primary/20">
                        <p className="text-[10px] text-[#A89A8C] font-bold uppercase tracking-widest mb-1">NEED HELP?</p>
                        <p className="text-sm font-bold text-slate-100 mb-3 leading-snug">Ask your AI Mentor for guidance on any concept.</p>
                        <button onClick={() => navigate('/mentor')} className="w-full py-2 bg-accent text-white font-bold rounded-lg text-xs transition-all hover:scale-[1.02] hover:brightness-110 hover:translate-y-[-2px] active:scale-95">
                            ASK AI MENTOR
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}

// Named export for backwards compatibility
export { Sidebar };

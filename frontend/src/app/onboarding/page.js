'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Onboarding() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/profiles');
    }, [router]);

    return (
        <div className="min-h-screen bg-[#141414] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
                <span className="text-white/40 text-sm">Redirecting...</span>
            </div>
        </div>
    );
}

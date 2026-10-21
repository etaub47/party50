'use client'

import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

// HQ pages never pass through '/', which is where a session normally gets
// established, so a browser whose anonymous session expired would leave every
// HQ query waiting on auth. Make sure one exists before rendering, but never
// block HQ for more than a few seconds on it.
const ensureSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session)
        await supabase.auth.signInAnonymously();
};

export default function HQLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        let isActive = true;

        const checkHQAccess = async () => {
            const hasHQAccess = document.cookie.includes("hq_access=true");

            if (!hasHQAccess && pathname !== '/hq/login') {
                router.replace('/hq/login');
                setIsAuthorized(false);
                return;
            }

            await Promise.race([
                ensureSession().catch(err => console.error("HQ session check failed:", err)),
                new Promise(resolve => setTimeout(resolve, 5000)),
            ]);
            if (isActive)
                setIsAuthorized(true);
        };

        void checkHQAccess();
        return () => {
            isActive = false;
        };
    }, [pathname, router]);

    // simple loading state to prevent "G-d Mode" from flickering on screen
    if (isAuthorized === null && pathname !== '/hq/login') {
        return <div className="min-h-screen bg-slate-950" />;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
            {pathname !== '/hq/login' && (
                <header className="border-b border-slate-800 bg-slate-900/50 p-4 flex justify-between items-center">
                    <span className="font-mono text-blue-500 font-bold tracking-tighter">COMMAND CENTER</span>
                    <nav className="flex gap-6 text-xs font-mono">
                        <button onClick={() => router.push('/hq')} className="hover:text-blue-400">DASHBOARD</button>
                        <button onClick={() => router.push('/')} className="hover:text-red-400 italic">EXIT TO FIELD</button>
                    </nav>
                </header>
            )}
            <main>{children}</main>
        </div>
    );
}

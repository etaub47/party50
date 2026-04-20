'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HQLogin() {
    const [pass, setPass] = useState('');
    const router = useRouter();

    const handleAuth = (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (pass === process.env.NEXT_PUBLIC_HQ_PASSCODE) {
            document.cookie = "hq_access=true; path=/; max-age=86400; SameSite=Lax";
            router.push('/hq');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md border border-blue-500/30 p-8 bg-slate-900 rounded-lg shadow-[0_0_50px_rgba(30,58,138,0.5)]">
                <h1 className="text-blue-400 font-mono text-2xl mb-8 text-center tracking-tighter">
                    IDENTIFICATION REQUIRED
                </h1>
                <form onSubmit={handleAuth} className="space-y-6">
                    <input
                        type="password"
                        value={pass}
                        onChange={(e) => setPass(e.target.value)}
                        className="w-full bg-black border border-blue-900 text-blue-500 p-4 rounded font-mono text-center focus:border-blue-400 outline-none"
                        placeholder="ENTER ACCESS KEY"
                        autoFocus
                    />
                    <button className="w-full py-4 bg-blue-900/40 border border-blue-500/50 text-blue-400 font-mono hover:bg-blue-800/60 transition-all uppercase tracking-[0.2em]">
                        Initialize HQ
                    </button>
                </form>
            </div>
        </div>
    );
}

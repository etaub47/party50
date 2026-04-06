'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Gatekeeper() {
    const [code, setCode] = useState('');
    const [error, setError] = useState(false);
    const router = useRouter();

    const handleSubmit = (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (code.toUpperCase() === process.env.NEXT_PUBLIC_PARTY_PASSCODE) {
            // Set a cookie that lasts for the duration of the party (7 days)
            document.cookie = "party_access=true; path=/; max-age=604800; SameSite=Lax";
            router.push('/');
        } else {
            setError(true);
            setCode('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6 z-[100]">
            <div className="w-full max-w-sm border-2 border-red-900/50 bg-gray-900 p-8 rounded-2xl shadow-2xl">
                <h1 className="text-red-500 font-mono text-xl mb-2 tracking-tighter uppercase text-center">
                    Restricted Access
                </h1>
                <p className="text-gray-500 text-xs font-mono mb-8 text-center uppercase tracking-widest">
                    Enter Authorization Key to Proceed
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => { setCode(e.target.value); setError(false); }}
                        placeholder="••••••••"
                        className={`bg-black border-2 ${error ? 'border-red-600' : 'border-gray-700'} text-white text-center py-4 rounded-xl font-mono text-2xl focus:outline-none focus:border-red-500 transition-colors uppercase`}
                        autoFocus
                    />

                    <button
                        type="submit"
                        className="bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-500/30 py-4 rounded-xl font-mono font-bold uppercase tracking-widest transition-all"
                    >
                        Validate Identity
                    </button>
                </form>

                {error && (
                    <p className="text-red-600 text-[10px] mt-4 text-center font-mono animate-bounce">
                        INVALID KEY. SECURITY PROTOCOL INITIATED.
                    </p>
                )}
            </div>
        </div>
    );
}

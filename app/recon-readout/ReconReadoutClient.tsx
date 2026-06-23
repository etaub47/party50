'use client';

import Link from 'next/link';

interface MissionStatus {
    id: string;
    title: string;
    description: string;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

interface ReconClientProps {
    hasAccess: boolean;
    foundCount: number;
    missionStatuses: MissionStatus[];
}

export default function ReconReadoutClient({ hasAccess, foundCount, missionStatuses }: ReconClientProps) {

    // GATING INTERCEPT SYSTEM WALL
    if (!hasAccess) {
        return (
            <div className="p-8 bg-black min-h-screen font-mono flex flex-col items-center justify-center text-center">
                <div className="border border-red-500 bg-red-950/20 rounded-xl p-8 max-w-md">
                    <h1 className="text-xl font-bold text-red-500 tracking-widest mb-4">⚠️ ACCESS RESTRICTED</h1>
                    <p className="text-sm text-slate-400 leading-relaxed mb-6">
                        Recon Readout module not detected in your active hardware inventory ledger. Acquire this firmware module from the central store terminal to unlock live system metrics.
                    </p>
                    <div className="text-[10px] text-red-400/50 uppercase border-t border-red-500/30 pt-4">
                        Hardware Signature Required: Recon Readout
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-slate-950 min-h-screen text-slate-100 font-mono">
            {/* HUD Dashboard Header */}
            <header className="mb-8 border-b border-green-500/30 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <Link href={"/"} className="text-xs text-slate-500 hover:text-slate-300 tracking-widest uppercase mb-2 inline-block">
                        ← BACK TO FIELD
                    </Link>
                    <h1 className="text-2xl font-bold text-green-400 tracking-wider">RECON READOUT</h1>
                    <p className="text-xs text-slate-400 mt-1">REAL-TIME SYSTEM STATUS SYNCHRONIZATION</p>
                </div>

                {/* Scavenged Items Counter Box */}
                <div className="bg-slate-900 border border-green-500/40 px-6 py-3 rounded-lg flex items-center gap-4">
                    <span className="text-xs text-slate-400">HIDDEN ASSETS RETRIEVED:</span>
                    <span className="text-xl font-bold text-green-400">
                        {foundCount} <span className="text-xs text-slate-500">/ 10</span>
                    </span>
                </div>
            </header>

            {/* Mission Manifest Matrix Grid */}
            <h2 className="text-xs text-green-400/70 tracking-widest uppercase mb-4">Available Operations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {missionStatuses.map((m) => (
                    <div
                        key={m.id}
                        className="bg-slate-900/60 p-4 border border-slate-800 rounded-lg flex justify-between items-center transition-all hover:border-slate-700"
                    >
                        <div>
                            <h3 className="text-sm font-bold uppercase text-slate-200">{m.title}</h3>
                            <span className="text-[9px] text-slate-500 uppercase">{m.description}</span>
                        </div>
                        <StatusBadge status={m.status} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: MissionStatus['status'] }) {
    // Dynamically assign classes matching tactical radar profiles
    const badges = {
        NOT_STARTED: 'bg-slate-800 text-slate-400 border-slate-700',
        IN_PROGRESS: 'bg-blue-950 text-blue-400 border-blue-500/40 animate-pulse',
        COMPLETED: 'bg-green-950 text-green-400 border-green-500/40',
        FAILED: 'bg-red-950 text-red-400 border-red-500/40'
    };

    const textLabels = {
        NOT_STARTED: 'READY',
        IN_PROGRESS: 'ACTIVE',
        COMPLETED: 'CLEARED',
        FAILED: 'FAILED'
    };

    return (
        <span className={`text-[10px] px-3 py-1 font-bold rounded-md border uppercase tracking-wider ${badges[status]}`}>
            {textLabels[status]}
        </span>
    );
}

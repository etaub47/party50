'use client'

import { useRouter } from 'next/navigation';

export default function HQDashboard() {
    const router = useRouter();

    const modules = [
        {
            title: "OPERATIONS MANIFEST",
            desc: "Generate and print QR codes for items, missions, and registration.",
            path: "/hq/manifest",
            icon: "🖨️",
            color: "border-blue-500/50"
        },
        {
            title: "AGENT MONITOR",
            desc: "Real-time surveillance of agent stats, inventory, and pulse status.",
            path: "/hq/monitor",
            icon: "📡",
            color: "border-emerald-500/50"
        },
        {
            title: "RECOVERY & RESET",
            desc: "Generate account recovery tokens and perform emergency player resets.",
            path: "/hq/recovery",
            icon: "🔑",
            color: "border-amber-500/50"
        },
        {
            title: "GLOBAL TRIGGERS",
            desc: "Manual event overrides, game freeze, and mass alerts.",
            path: "/hq/triggers",
            icon: "🚨",
            color: "border-red-500/50"
        }
    ];

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <header className="mb-12">
                <h1 className="text-4xl font-mono font-bold text-blue-500 tracking-tighter mb-2">
                    SYSTEM DASHBOARD
                </h1>
                <p className="text-slate-500 font-mono text-sm uppercase tracking-widest">
                    Central Intelligence Command
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {modules.map((mod) => (
                    <button
                        key={mod.path}
                        onClick={() => router.push(mod.path)}
                        className={`text-left p-6 bg-slate-900 border ${mod.color} rounded-xl hover:bg-slate-800 transition-all group active:scale-[0.98]`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <span className="text-3xl grayscale group-hover:grayscale-0 transition-all">
                                {mod.icon}
                            </span>
                            <span className="text-slate-700 font-mono text-xs">READY</span>
                        </div>
                        <h3 className="text-xl font-mono font-bold text-slate-200 mb-2">
                            {mod.title}
                        </h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            {mod.desc}
                        </p>
                    </button>
                ))}
            </div>

            <footer className="mt-12 pt-8 border-t border-slate-800 flex justify-between items-center text-[10px] font-mono text-slate-600">
                <span>ENCRYPTION: AES-256 ACTIVE</span>
                <span>OS VERSION: SPY_OS 2.0</span>
            </footer>
        </div>
    );
}

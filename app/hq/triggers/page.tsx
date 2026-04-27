'use client'

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

export default function GlobalTriggersPage() {
    const [ isSending, setIsSending ] = useState(false);

    const executeTrigger = async (template: any) => {
        const confirmDeploy = confirm(`Confirm deployment of ${template.title}? This will alert all active agents.`);
        if (!confirmDeploy)
            return;

        setIsSending(true);
        const { error } = await supabase.rpc('trigger_global_event', {
            p_title: template.title,
            p_message: template.message,
            p_type: template.type,
            p_target_id: template.target_scan_id,
            p_success_event_id: template.success_id,
            p_failure_event_id: template.failure_id
        });

        if (error) {
            alert(error.message);
        } else {
            alert("Global event triggered");
        }

        setIsSending(false);
    };

    const templates = [
        {
            title: "MISSION FUNDING",
            type: "BOON",
            target_scan_id: "mission-funding-qr",
            message: "Your agency wants to provide additional mission funding. Meet your contact in less than 5 minutes to claim some credits.",
            success_id: "4a0576b4-e633-42ce-9b43-9773cb9a817f",
            failure_id: "668abe89-b480-452f-b812-dc36ab0599db"
        },
        {
            title: "SECURITY SWEEP",
            type: "BANE",
            target_scan_id: "security-sweep-qr",
            message: "Security is shaking down guests accused of tampering with company data. Stash your evidence in less than 5 minutes to avoid suspicion.",
            success_id: "96ce7ce7-f3df-4983-9724-d748432cc4e8",
            failure_id: "dc1e86aa-59e5-4be9-92fe-e31082063286"
        },
        {
            title: "PRIVILEGED CONVERSATION",
            type: "BOON",
            target_scan_id: "privileged-conversation-qr",
            message: "There is a business meeting happening now. If you bug the conversation in less than 5 minutes, you will score some intel.",
            success_id: "2c9416c2-d269-4fef-a8c3-d5bafe82d130",
            failure_id: "3d148a2e-fc20-4ff5-a19b-ca9b8daf0f80"
        }
    ];

    return (
        <div className="p-8 max-w-2xl mx-auto font-mono text-slate-200">
            <header className="mb-12 border-b border-red-900 pb-4">
                <h1 className="text-3xl font-bold text-red-600 tracking-tighter uppercase italic">
                    Global Command Console
                </h1>
                <p className="text-xs text-slate-500 mt-2">AUTHORIZED PERSONNEL ONLY</p>
            </header>

            <div className="grid gap-6">
                {templates.map((t, i) => (
                    <div key={i} className="bg-slate-950 border border-slate-800 p-6 rounded-2xl flex justify-between items-center group hover:border-red-600 transition-colors">
                        <div className="space-y-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded border ${t.type === 'BANE' ? 'border-red-500 text-red-500' : 'border-emerald-500 text-emerald-500'}`}>
                                {t.type}
                            </span>
                            <h3 className="text-xl font-bold tracking-tight">{t.title}</h3>
                            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">"{t.message}"</p>
                        </div>
                        <button
                            disabled={isSending}
                            onClick={() => executeTrigger(t)}
                            className="bg-red-700 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest disabled:opacity-50 transition-all shadow-lg active:scale-95"
                        >
                            {isSending ? "EXECUTING..." : "DEPLOY"}
                        </button>
                    </div>
                ))}
            </div>

            <footer className="mt-12 text-center">
                <p className="text-[10px] text-slate-700 uppercase tracking-widest">
                    Operational Status: Ready
                </p>
            </footer>
        </div>
    );
}

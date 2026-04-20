'use client'

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

export default function AgentMonitor() {
    const [ agents, setAgents ] = useState<any[]>([]);
    const [ loading, setLoading ] = useState(true);

    useEffect(() => {
        const fetchAgents = async () => {
            const { data } = await supabase
                .from('player_stats')
                .select('*')
                .order('total_intel', { ascending: false });
            if (data) setAgents(data);
            setLoading(false);
        };

        void fetchAgents();
        const channelName = `hq-monitor-${Date.now()}`;
        const channel = supabase.channel(channelName)
            .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'player' }, () => fetchAgents())
            .subscribe();
        return () => {
            if (channel) {
                console.log("Cleaning up channel:", channel.topic);
                void supabase.removeChannel(channel);
            }
        };
    }, []);

    if (loading) return <div className="p-8 font-mono text-emerald-500 animate-pulse">CONNECTING TO FIELD...</div>;

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-mono font-bold text-emerald-500 tracking-tighter">AGENT MONITOR</h1>
                    <p className="text-[10px] text-slate-500 font-mono uppercase">Number of Players: {agents.length}</p>
                </div>
            </header>
            <div className="flex flex-col gap-3">
                {agents.map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                ))}
            </div>
        </div>
    );
}

function AgentCard({ agent }: { agent: any }) {
    const isIdle = false;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg active:bg-slate-800 transition-colors">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isIdle ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'} shadow-[0_0_10px_rgba(16,185,129,0.3)]`} />
                    <div>
                        <h3 className="font-bold text-slate-100 leading-none">{agent.name}</h3>
                        <span className="text-[10px] text-blue-400 font-mono uppercase tracking-widest">{agent.role}</span>
                    </div>
                </div>
                <button className="text-[10px] font-mono border border-slate-700 text-slate-400 px-3 py-1 rounded-md uppercase">
                    Dossier
                </button>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-slate-800/50 pt-3 text-center">
                <div>
                    <p className="text-[9px] text-slate-500 font-mono uppercase mb-1">Intel</p>
                    <p className="text-sm font-bold text-slate-200">{agent.total_intel}</p>
                </div>
                <div>
                    <p className="text-[9px] text-slate-500 font-mono uppercase mb-1">Heat</p>
                    <p className={`text-sm font-bold ${agent.total_heat > 70 ? 'text-red-500' : 'text-slate-200'}`}>
                        {agent.total_heat}
                    </p>
                </div>
                <div>
                    <p className="text-[9px] text-slate-500 font-mono uppercase mb-1">Credits</p>
                    <p className="text-sm font-bold text-emerald-400">${agent.current_credits}</p>
                </div>
            </div>
        </div>
    );
}

'use client'

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { differenceInMinutes, parseISO } from 'date-fns';

const supabase = createClient();

export default function AgentMonitor() {
    const [ agents, setAgents ] = useState<any[]>([]);
    const [ loading, setLoading ] = useState(true);
    const [ pulseData, setPulseData ] = useState<Record<string, string>>({});
    const [ selectedAgent, setSelectedAgent ] = useState<any | null>(null);

    useEffect(() => {
        const fetchAgents = async () => {
            const { data: stats } = await supabase
                .from('player_stats')
                .select('*')
                .order('total_intel', { ascending: false })
                .order('total_heat', { ascending: true });
            const { data: pulse } = await supabase.rpc('get_agent_pulse');
            if (stats) setAgents(stats);
            if (pulse) {
                // map the array to an object { [id]: last_active_at } for quick lookup
                const pulseMap = pulse.reduce((acc: any, row: { player_id: string, last_active_at: string }) => {
                    acc[row.player_id] = row.last_active_at;
                    return acc;
                }, {});
                setPulseData(pulseMap);
            }
            setLoading(false);
        };

        void fetchAgents();
        const channelName = `hq-monitor-${Date.now()}`;
        const channel = supabase.channel(channelName)
            .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'player' }, () => fetchAgents())
            .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'player_item' }, () => fetchAgents())
            .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'player_event' }, () => fetchAgents())
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
                    <AgentCard
                        key={agent.id}
                        agent={agent}
                        lastActive={pulseData[agent.id]}
                        onViewDossier={() => setSelectedAgent(agent)}
                    />
                ))}
                {selectedAgent && (
                    <AgentDossier
                        agent={selectedAgent}
                        onClose={() => setSelectedAgent(null)}
                    />
                )}
            </div>
        </div>
    );
}

function AgentCard({ agent, lastActive, onViewDossier }: {
    agent: any, lastActive: string, onViewDossier: () => void })
{
    const minutesIdle = lastActive ? differenceInMinutes(new Date(), parseISO(lastActive)) : 0;

    // status logic
    let statusColor = "bg-emerald-500 shadow-emerald-500/50";
    let statusLabel = "ACTIVE";
    if (minutesIdle >= 45) {
        statusColor = "bg-red-500 shadow-red-500/50 animate-pulse";
        statusLabel = "GONE DARK";
    } else if (minutesIdle >= 20) {
        statusColor = "bg-amber-500 shadow-amber-500/50";
        statusLabel = "STALE";
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg active:bg-slate-800 transition-colors">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${statusColor} shadow-[0_0_10px_2px_var(--tw-shadow-color)]`} />
                    <div>
                        <h3 className="font-bold text-slate-100 leading-none">{agent.name}</h3>
                        <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">{agent.role}</span>
                        <p className="text-[9px] font-mono text-slate-500 uppercase">
                            {statusLabel} — {lastActive ? `${minutesIdle}m AGO` : 'NO DATA'}
                        </p>
                    </div>
                </div>
                <button
                    className="text-[10px] font-mono border border-slate-700 text-slate-400 px-3 py-1 rounded-md uppercase"
                    onClick={onViewDossier}
                >
                    Dossier
                </button>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-slate-800/50 pt-3 text-center">
                <div>
                    <p className="text-[9px] text-slate-500 font-mono uppercase mb-1">Intel</p>
                    <p className="text-sm font-bold text-blue-500">{agent.total_intel}</p>
                </div>
                <div>
                    <p className="text-[9px] text-slate-500 font-mono uppercase mb-1">Heat</p>
                    <p className="text-sm font-bold text-red-500">{agent.total_heat}</p>
                </div>
                <div>
                    <p className="text-[9px] text-slate-500 font-mono uppercase mb-1">Credits</p>
                    <p className="text-sm font-bold text-emerald-400">${agent.current_credits}</p>
                </div>
            </div>
        </div>
    );
}

function AgentDossier({ agent, onClose }: { agent: any, onClose: () => void }) {
    const [ inventory, setInventory ] = useState<any[]>([]);
    const [ history, setHistory ] = useState<any[]>([]);
    const [ loading, setLoading ] = useState(true);
    const [ showRecovery, setShowRecovery ] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {

            // fetch Inventory
            const { data: inv } = await supabase
                .from('player_item')
                .select('created_at, item(name, type)')
                .eq('player_id', agent.id);

            // fetch recent Events
            const { data: events } = await supabase
                .from('player_event')
                .select('created_at, event(description)')
                .eq('player_id', agent.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (inv) setInventory(inv);
            if (events) setHistory(events);
            setLoading(false);
        };
        void fetchDetails();
    }, [agent.id]);

    if (loading) return <div className="p-8 font-mono text-emerald-500 animate-pulse">CONNECTING TO FIELD...</div>;

    return (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-md bg-slate-900 border-l border-slate-700 h-full flex flex-col shadow-2xl">

                {/* header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <div>
                        <h2 className="text-xl font-mono font-bold text-blue-400">{agent.name}</h2>
                        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{agent.role}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white font-mono text-xl">×</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* stats snapshot */}
                    <div className="grid grid-cols-2 gap-4 bg-black/40 p-4 rounded-lg border border-slate-800">
                        <div>
                            <p className="text-[9px] text-slate-500 font-mono uppercase">Total Intel</p>
                            <p className="text-lg font-bold text-slate-200">{agent.total_intel}</p>
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-500 font-mono uppercase">Current Heat</p>
                            <p className="text-lg font-bold text-red-500">{agent.total_heat}</p>
                        </div>
                    </div>

                    {/* inventory section */}
                    <section>
                        <h3 className="text-xs font-mono font-bold text-slate-400 mb-3 border-b border-slate-800 pb-1">EQUIPMENT MANIFEST</h3>
                        {inventory.length === 0 ? (
                            <p className="text-xs text-slate-600 italic">No assets acquired.</p>
                        ) : (
                            <ul className="space-y-2">
                                {inventory.map((inv, i) => (
                                    <li key={i} className="flex justify-between items-center text-xs">
                                        <span className="text-slate-200">{inv.item.name}</span>
                                        <span className="text-[9px] text-slate-500 font-mono">[{inv.item.type}]</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* activity log */}
                    <section>
                        <h3 className="text-xs font-mono font-bold text-slate-400 mb-3 border-b border-slate-800 pb-1">RECENT ACTIVITY</h3>
                        <div className="space-y-3">
                            {history.map((h, i) => (
                                <div key={i} className="border-l-2 border-slate-800 pl-3">
                                    <p className="text-[11px] text-slate-300 leading-tight">{h.event.description}</p>
                                    <p className="text-[8px] text-slate-600 font-mono mt-1 uppercase">
                                        {differenceInMinutes(new Date(), parseISO(h.created_at))}m ago
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* footer actions */}
                <div className="p-6 border-t border-slate-800 bg-slate-950">
                    <button
                        onClick={() => setShowRecovery(true)}
                        className="w-full py-3 bg-amber-900/20 border border-amber-600/30 text-amber-500 font-mono text-xs hover:bg-amber-900/40 transition-all uppercase tracking-widest"
                    >
                        Generate Recovery Token
                    </button>
                </div>
            </div>

            {showRecovery && (
                <div className="absolute inset-0 z-[210] bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                    <h3 className="text-amber-500 font-mono font-bold mb-2 uppercase">Identity Recovery Token</h3>
                    <p className="text-slate-500 text-[10px] mb-6 uppercase tracking-widest">{agent.name}</p>

                    <div className="p-4 bg-white rounded-xl mb-6">
                        <QRCodeSVG
                            value={`${window.location.origin}/scan/recovery/${agent.id}`}
                            size={200}
                            level="H"
                        />
                    </div>

                    <button
                        onClick={() => setShowRecovery(false)}
                        className="text-slate-500 font-mono text-xs underline uppercase"
                    >
                        Cancel and Return
                    </button>
                </div>
            )}
        </div>
    );
}

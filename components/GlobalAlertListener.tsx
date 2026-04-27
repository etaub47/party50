'use client'

import { GlobalEvent } from "@/types/dbtypes";
import { createClient } from '@/utils/supabase/client';
import { useCallback, useEffect, useState } from 'react';

const supabase = createClient();

export default function GlobalAlertListener() {
    const [ alert, setAlert ] = useState<GlobalEvent | null>(null);
    const [ timeLeft, setTimeLeft ] = useState<number>(0);

    const setupRealtime = useCallback(() => {
        const channelName = `global-alert-listener-${Date.now()}`;
        return supabase.channel(channelName)
            .on('postgres_changes' as any,
                {event: 'INSERT', schema: 'public', table: 'global_event'},
                (payload) => {
                    setAlert(payload.new as GlobalEvent);
                    if ('vibrate' in navigator)
                        navigator.vibrate([500, 110, 500]);
                }
            )
            .subscribe((status: string) => {
                console.log(`📡 DB Listener (${channelName}): ${status}`);
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setTimeout(setupRealtime, 2000);
                }
            });
    }, []);

    useEffect(() => {
        const channel = setupRealtime();
        return () => { void supabase.removeChannel(channel); };
    }, [setupRealtime]);

    useEffect(() => {
        if (!alert)
            return;
        const timer = setInterval(() => {
            const expiry = new Date(alert.expires_at).getTime();
            const now = new Date().getTime();
            const diff = Math.floor((expiry - now) / 1000);
            if (diff <= 0) {
                setAlert(null);
                clearInterval(timer);
            } else {
                setTimeLeft(diff);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [alert]);

    if (!alert)
        return null;

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 font-mono text-white">
            <div className={`max-w-sm w-full p-8 border-2 rounded-2xl shadow-2xl transition-all ${alert.event_type === 'BANE' ? 'border-red-600 bg-red-950/20' : 'border-emerald-600 bg-emerald-950/20'}`}>
                <div className="flex justify-between items-start mb-6">
                    <span className={`text-[10px] px-2 py-1 border rounded ${alert.event_type === 'BANE' ? 'border-red-500 text-red-500' : 'border-emerald-500 text-emerald-500'}`}>
                        PRIORITY ALERT
                    </span>
                    <span className="text-xl font-bold tabular-nums">{formatTime(timeLeft)}</span>
                </div>
                <h2 className="text-2xl font-black mb-4 uppercase italic tracking-tighter">{alert.title}</h2>
                <p className="text-slate-300 text-sm mb-8 leading-relaxed italic">"{alert.message}"</p>
                <button onClick={() => setAlert(null)} className={`w-full py-4 font-bold rounded-xl active:scale-95 transition-all ${alert.event_type === 'BANE' ? 'bg-red-600' : 'bg-emerald-600'}`}>
                    ACKNOWLEDGE
                </button>
            </div>
        </div>
    );
}

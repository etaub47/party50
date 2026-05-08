'use client'

import { GlobalEvent } from "@/types/dbtypes";
import { createClient } from '@/utils/supabase/client';
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from 'react';

const supabase = createClient();

type GlobalEventWithParticipation = GlobalEvent & {
    global_event_participation: { id: string }[]
}

export default function GlobalAlertListener() {
    const [ alert, setAlert ] = useState<GlobalEvent | null>(null);
    const [ timeLeft, setTimeLeft ] = useState<number>(0);
    const [ isAcknowledged, setIsAcknowledged ] = useState(false);

    const pathname = usePathname();
    const isInSafeZone = pathname?.startsWith('/hq');

    // check if there is an existing, unexpired, un-participated event in the DB
    const syncExistingAlert = useCallback(async () => {
        if (isInSafeZone)
            return;
        const { data: { session } } = await supabase.auth.getSession();
        const playerId = session?.user?.id;
        if (!playerId)
            return;

        const { data } = await supabase
            .from('global_event')
            .select('*, global_event_participation!left (id)')
            .eq('global_event_participation.player_id', playerId)
            .gt('expires_at', new Date().toISOString())
            .order('expires_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const eventData = data as GlobalEventWithParticipation | null;
        const hasParticipated = eventData?.global_event_participation &&
            eventData.global_event_participation.length > 0;
        if (data && !hasParticipated) {
            setAlert(data as GlobalEvent);
            setIsAcknowledged(false);
        } else {
            setAlert(null);
            setIsAcknowledged(false);
        }
    }, [isInSafeZone]);

    const setupRealtime = useCallback(() => {
        const channelName = `global-alert-listener-${Date.now()}`;
        return supabase.channel(channelName)
            .on('postgres_changes' as any,
                {event: 'INSERT', schema: 'public', table: 'global_event'},
                (payload) => {
                    setAlert(payload.new as GlobalEvent);
                    setIsAcknowledged(false);
                    if ('vibrate' in navigator)
                        navigator.vibrate([500, 110, 500]);
                }
            )
            .subscribe((status: string) => {
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setTimeout(setupRealtime, 5000);
                }
            });
    }, []);

    useEffect(() => {
        void syncExistingAlert();
        const channel = setupRealtime();
        window.addEventListener('focus', syncExistingAlert);
        return () => {
            void supabase.removeChannel(channel);
            window.removeEventListener('focus', syncExistingAlert)
        };
    }, [setupRealtime, syncExistingAlert]);

    useEffect(() => {
        if (!alert)
            return;
        const timer = setInterval(() => {
            const expiry = new Date(alert.expires_at).getTime();
            const now = new Date().getTime();
            const diff = Math.floor((expiry - now) / 1000);
            if (diff <= 0) {
                setAlert(null);
                setIsAcknowledged(false);
                clearInterval(timer);
            } else {
                setTimeLeft(diff);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [alert]);

    if (!alert || isInSafeZone)
        return null;

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <>
            {/* persistent mini-banner */}
            {alert && (
                <div
                    className={`fixed top-0 inset-x-0 h-18 border-b-2 text-white flex justify-between items-center px-6 font-mono shadow-2xl transition-all duration-500 z-[10002]
                        ${alert.event_type === 'BANE' ? 'bg-red-950 border-red-600' : 'bg-emerald-950 border-emerald-600'}
                        ${isAcknowledged ? 'translate-y-0' : '-translate-y-full'}`}
                >
                    <div className="flex flex-col min-w-0">
                        <span className="text-[8px] uppercase font-bold tracking-widest opacity-70">Priority Alert</span>
                        <span className="text-xs font-black truncate pb-2">{alert.title}</span>
                        <span className="text-[10px] font-black truncate">{alert.message}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-xl font-bold tabular-nums leading-none">{formatTime(timeLeft)}</span>
                        <span className="text-[8px] opacity-50 uppercase">Remaining</span>
                    </div>
                </div>
            )}

            {/* initial overlay */}
            {(alert && !isAcknowledged) && (
                <div className="fixed inset-0 z-[10005] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 font-mono text-white">
                    <div className={`max-w-sm w-full p-8 border-2 rounded-2xl shadow-2xl ${alert.event_type === 'BANE' ? 'border-red-600 bg-red-950/20' : 'border-emerald-600 bg-emerald-950/20'}`}>
                        {/* ... (Your existing Priority Alert Header) ... */}
                        <div className="flex justify-between items-start mb-6">
                        <span className={`text-[10px] px-2 py-1 border rounded ${alert.event_type === 'BANE' ? 'border-red-500 text-red-500' : 'border-emerald-500 text-emerald-500'}`}>
                            PRIORITY ALERT
                        </span>
                            <span className="text-xl font-bold tabular-nums">{formatTime(timeLeft)}</span>
                        </div>
                        <h2 className="text-2xl font-black mb-4 uppercase italic tracking-tighter">{alert.title}</h2>
                        <p className="text-slate-300 text-sm mb-8 leading-relaxed italic">"{alert.message}"</p>
                        <button
                            onClick={() => setIsAcknowledged(true)}
                            className={`w-full py-4 font-bold rounded-xl active:scale-95 transition-all ${alert.event_type === 'BANE' ? 'bg-red-600' : 'bg-emerald-600'}`}
                        >
                            ACKNOWLEDGE
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

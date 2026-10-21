'use client'

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { listMissions } from '@/app/actions/getMission';

const supabase = createClient();

export default function ManifestPage() {
    const [items, setItems] = useState<any[]>([]);
    const [missions, setMissions] = useState<{ id: string, title: string, description: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const specialEvents = [
        { id: 'mission-funding-qr', title: 'MISSION FUNDING', sub: 'Meet your contact here at the proper time.' },
        { id: 'security-sweep-qr', title: 'SECURITY SWEEP', sub: 'Stash your evidence here at the proper time.' },
        { id: 'privileged-conversation-qr', title: 'PRIVILEGED CONVERSATION', sub: 'Bug the conversation here at the proper time.' },
    ];

    useEffect(() => {
        // every exit must clear loading, or the page sits on SCANNING DATABASE
        // forever with no hint of what broke
        const fetchAll = async () => {
            try {
                const [itemRes, missionList] = await Promise.all([
                    supabase.from('item').select('*').neq('type', 'Intel').order('type', { ascending: true }),
                    listMissions(),
                ]) as [any, any[]];
                if (itemRes.error)
                    throw new Error(`Item lookup failed: ${itemRes.error.message}`);
                setItems(itemRes.data ?? []);
                setMissions(missionList);
            } catch (err) {
                setLoadError(err instanceof Error && err.message ? err.message : 'Unknown error loading the manifest.');
            } finally {
                setLoading(false);
            }
        };
        void fetchAll();
    }, []);

    const baseUrl = "https://party50.vercel.app"; // fallback for QR generation

    if (loading) return <div className="p-8 font-mono text-blue-500 animate-pulse">SCANNING DATABASE...</div>;
    if (loadError) return (
        <div className="p-8 font-mono text-red-400">
            <p>MANIFEST UNAVAILABLE: {loadError}</p>
            <button onClick={() => window.location.reload()} className="mt-4 underline">Reload</button>
        </div>
    );

    return (
        <div className="p-8 bg-white min-h-screen text-black">

            {/* control header - hidden when printing */}
            <header className="mb-8 p-6 bg-slate-900 text-white rounded-xl flex justify-between items-center print:hidden">
                <div>
                    <h1 className="text-2xl font-mono font-bold text-blue-400">OPERATIONS MANIFEST</h1>
                    <p className="text-xs text-slate-400 font-mono">PRINT THIS PAGE TO GENERATE PHYSICAL FIELD ASSETS</p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded font-mono text-sm transition-all"
                >
                    PRINT SHEET
                </button>
            </header>

            {/* the QR grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">

                {/* registration code */}
                <QRCard
                    title="REGISTRATION"
                    subtitle="Initial Entry"
                    url={`${baseUrl}/`}
                />

                {/* dynamic items from db */}
                {items.map((item) => (
                    <QRCard
                        key={item.id}
                        title={item.name}
                        subtitle={item.type === 'Tool' ? `TOOL | COST: ${item.cost}` : 'HIDDEN ITEM'}
                        url={`${baseUrl}/scan/${item.type === 'Tool' ? 'buy' : 'find'}/${item.id}`}
                    />
                ))}

                {/* missions */}
                {missions.map((m) => (
                    <QRCard
                        key={m.id}
                        title={m.title}
                        subtitle={`MISSION | ${m.description}`}
                        url={`${baseUrl}/scan/challenge/${m.id}`}
                    />
                ))}

                {/* special events */}
                {specialEvents.map((e) => (
                    <QRCard
                        key={e.id}
                        title={e.title}
                        subtitle={e.sub}
                        url={`${baseUrl}/scan/global/${e.id}`}
                    />
                ))}

            </div>
        </div>
    );
}

function QRCard({ title, subtitle, url }: { title: string, subtitle: string, url: string }) {
    return (
        <div className="inline-block w-full" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg bg-white mb-4">
                <QRCodeSVG value={url} size={150} level="H" />
                <h3 className="mt-4 font-mono font-bold text-sm uppercase text-center leading-tight">
                    {title}
                </h3>
                <p className="text-[10px] font-mono text-gray-500 text-center mt-1">
                    {subtitle}
                </p>
            </div>
        </div>
    );
}

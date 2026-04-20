'use client'

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { QRCodeSVG } from 'qrcode.react';

const supabase = createClient();

export default function ManifestPage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const missions = [
        { id: 'vault_breach', title: 'VAULT BREACH', sub: 'High-Sec Infiltration' },
        { id: 'piano_breach', title: 'PIANO BREACH', sub: 'Retrieve classified intel' },
        // ...
    ];

    const specialEvents = [
        { id: 'basement_signal', title: 'BASEMENT SIGNAL', sub: 'Scan to disable local alarms (-20 Heat)' },
        { id: 'safehouse_entry', title: 'SAFEHOUSE ACCESS', sub: 'One-time credit bonus (+50 Credits)' },
    ];

    useEffect(() => {
        const fetchItems = async () => {
            const { data } = await supabase
                .from('item')
                .select('*')
                .order('type', { ascending: true });
            if (data) setItems(data);
            setLoading(false);
        };
        void fetchItems();
    }, []);

    const baseUrl = "https://party50.vercel.app"; // fallback for QR generation

    if (loading) return <div className="p-8 font-mono text-blue-500 animate-pulse">SCANNING DATABASE...</div>;

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
                        subtitle={`${item.type.toUpperCase()} | COST: ${item.cost}`}
                        url={`${baseUrl}/scan/${item.type === 'Tool' ? 'buy' : 'find'}/${item.id}`}
                    />
                ))}

                {/* missions */}
                {missions.map((m) => (
                    <QRCard
                        key={m.id}
                        title={m.title}
                        subtitle={`MISSION | ${m.sub}`}
                        url={`${baseUrl}/scan/challenge/${m.id}`}
                    />
                ))}

                {/* special events */}
                {specialEvents.map((e) => (
                    <QRCard
                        key={e.id}
                        title={e.title}
                        subtitle={`GLOBAL EVENT | ${e.sub}`}
                        url={`${baseUrl}/scan/event/${e.id}`}
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
                <p className="text-[8px] text-gray-300 mt-2 break-all max-w-full italic">
                    {url}
                </p>
            </div>
        </div>
    );
}

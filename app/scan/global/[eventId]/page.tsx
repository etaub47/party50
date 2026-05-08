'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

export default function GlobalScanPage() {
    const { eventId } = useParams();
    const router = useRouter();
    const [ status, setStatus ] = useState('VERIFYING OBJECTIVE...');
    const [ result, setResult ] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        const checkIn = async () => {
            if (!eventId) return;

            setStatus('UPLOADING ENCRYPTED DATA...');
            const { data, error } = await supabase.rpc('process_global_checkin', {
                p_target_slug: eventId
            });

            if (error) {
                console.log(error);
                setResult({ success: false, message: "System failure during check-in:" + error.message });
            } else if (data && data[0]) {
                // the RPC returns a table/array, so we take the first row
                setResult({ success: data[0].success, message: data[0].message });
            }
        };

        void checkIn();
    }, [eventId]);

    const handleReturn = () => {
        router.push('/');
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center font-mono">
            {!result ? (
                <div className="space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-blue-500 text-sm animate-pulse tracking-widest">{status}</p>
                </div>
            ) : (
                <div className={`p-8 border-2 rounded-2xl max-w-sm w-full ${result.success ? 'border-emerald-500' : 'border-red-500'}`}>
                    <h2 className={`text-2xl font-bold mb-4 ${result.success ? 'text-emerald-500' : 'text-red-500'}`}>
                        {result.success ? 'OBJECTIVE COMPLETE' : 'CHECK IN FAILED'}
                    </h2>
                    <p className="text-slate-300 text-sm mb-8 leading-relaxed italic">
                        "{result.message}"
                    </p>
                    <button
                        onClick={handleReturn}
                        className="w-full py-3 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-all uppercase text-xs tracking-widest"
                    >
                        Return to Field
                    </button>
                </div>
            )}
        </div>
    );
}

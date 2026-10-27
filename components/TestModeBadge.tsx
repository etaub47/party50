'use client'

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

// Small corner tag so nobody mistakes a test game for the real one. Read once
// per page load: test mode can only be switched on before Start Game, and a
// stale tag after HQ switches it off mid-game is harmless.
export default function TestModeBadge() {
    const [ testMode, setTestMode ] = useState(false);

    useEffect(() => {
        let isActive = true;
        void supabase
            .from('game_state')
            .select('test_mode')
            .eq('id', 1)
            .maybeSingle<{ test_mode: boolean }>()
            .then(({ data }) => {
                if (isActive)
                    setTestMode(data?.test_mode ?? false);
            });
        return () => {
            isActive = false;
        };
    }, []);

    if (!testMode)
        return null;

    return (
        <div className="fixed bottom-2 left-2 z-40 pointer-events-none print:hidden px-2 py-0.5 rounded border border-yellow-500 bg-black/80 text-yellow-400 font-mono text-[10px] font-bold tracking-widest">
            TEST MODE
        </div>
    );
}

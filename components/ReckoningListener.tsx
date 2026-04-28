'use client'

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

export default function ReckoningListener() {
    const pathname = usePathname();

    const checkPenalties = async () => {
        const { data, error } = await supabase.rpc('apply_missed_global_penalties');

        if (error) {
            console.log("Reckoning Error:", error);
            return;
        }

        // if data is returned, it means the player was penalized
        if (data && data.length > 0) {
            data.forEach((penalty: { event_title: string }) => {
                alert(`⚠️ You failed to check in for ${penalty.event_title} before time expired.`);
            });
        }
    };

    useEffect(() => {
        void checkPenalties();
    }, [pathname]);

    return null;
}

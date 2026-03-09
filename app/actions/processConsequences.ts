'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

interface ConsequenceParams {
    playerIds: string[];
    challengeId: string;
    stepIndex: number;
    eventId?: string;
    itemId?: string;
}

export async function processStepConsequences({ playerIds, challengeId, stepIndex, eventId, itemId}: ConsequenceParams) {
    const supabase = await createClient();
    const results = [];

    for (const playerId of playerIds) {

        // check if this player already has an event for this mission/step
        if (eventId) {
            const { data: existing } = await supabase
                .from('player_event')
                .select('event_id, event!inner(challenge_id, step)')
                .eq('player_id', playerId)
                .eq('event.challenge_id', challengeId)
                .eq('event.step', stepIndex)
                .maybeSingle();

            if (!existing) {
                const { error } = await supabase
                    .from('player_event')
                    .insert({ player_id: playerId, event_id: eventId });

                if (!error)
                    results.push({ pId: playerId, type: 'EVENT', id: eventId });
            }
        }

        // item logic (duplicates shouldn't be possible, and worst case the DB will prevent it)
        if (itemId) {
            const { error } = await supabase
                .from('player_item')
                .insert({ player_id: playerId, item_id: itemId });

            if (!error)
                results.push({ pId: playerId, type: 'ITEM', id: itemId });
        }
    }

    revalidatePath('/');
    return { success: true, processed: results };
}

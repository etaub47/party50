'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

interface ConsequenceParams {
    playerId: string;
    challengeId: string;
    stepIndex: number;
    eventId?: string;
    itemId?: string;
}

export async function processStepConsequences({ playerId, challengeId, stepIndex, eventId, itemId}: ConsequenceParams) {
    const supabase = await createClient();
    const results = [];

    console.log("DEBUG: Processing consequences for", { playerId, challengeId, stepIndex, eventId, itemId });

    // check if this player already has an event for this mission/step
    if (eventId) {
        const { data: existing, error: checkError } = await supabase
            .from('player_event')
            .select('event_id, event!inner(challenge_id, step)')
            .eq('player_id', playerId)
            .eq('event.challenge_id', challengeId)
            .eq('event.step', stepIndex)
            .maybeSingle();

        if (checkError)
            console.error("CONSEQUENCE_CHECK_ERROR: ", checkError.message);

        if (!existing && !checkError) {
            const { error: insertError } = await supabase
                .from('player_event')
                .insert({ player_id: playerId, event_id: eventId });

            if (insertError) {
                console.error("EVENT_INSERT_ERROR: ", insertError.message);
            } else {
                results.push({pId: playerId, type: 'EVENT', id: eventId});
            }
        }
    }

    // item logic (duplicates shouldn't be possible, and worst case the DB will prevent it)
    if (itemId) {
        const { error: itemError } = await supabase
            .from('player_item')
            .insert({ player_id: playerId, item_id: itemId });

        if (itemError) {
            console.error("ITEM_INSERT_ERROR:", itemError.message);
        } else {
            results.push({pId: playerId, type: 'ITEM', id: itemId});
        }
    }

    revalidatePath('/');
    return { success: true, processed: results };
}

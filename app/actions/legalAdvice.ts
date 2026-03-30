'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function executeLegalAdvice(
    lawyerId: string,
    lawyerName: string,
    recipientId: string
): Promise<{success: boolean, error?: string}> {
    const supabase = await createClient();

    const { error } = await supabase.rpc('offer_legal_advice', {
        p_lawyer_id: lawyerId,
        p_recipient_id: recipientId,
        p_lawyer_name: lawyerName
    });

    if (error) {
        console.error("Legal Advice Error: ", error.message);
        return {
            success: false,
            error: error.message.includes('unique_violation')
                ? "Counsel already provided to this agent."
                : error.message
        };
    }

    // Revalidate the root to update Heat counts and the Leaderboard UI
    revalidatePath('/');

    return { success: true };
}

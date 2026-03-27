'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function executeTransfer(
    senderId: string,
    senderName: string,
    receiverId: string,
    receiverName: string,
    amountStr: string
): Promise<{ success: boolean, error?: string }> {
    const supabase = await createClient();
    const amount = parseInt(amountStr, 10);

    // Basic sanity check before hitting the DB
    if (isNaN(amount) || amount <= 0) {
        return { success: false, error: "Invalid transfer amount." };
    }

    const { error } = await supabase.rpc('transfer_credits', {
        p_sender_id: senderId,
        p_receiver_id: receiverId,
        p_amount: amount,
        p_sender_name: senderName,
        p_receiver_name: receiverName
    });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath('/');

    return { success: true };
}

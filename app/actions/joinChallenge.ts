'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import fs from 'fs/promises'
import path from 'path'

export async function joinChallenge(playerId: string, challengeId: string) {
    const supabase = await createClient();

    // load the challenge definition from the JSON file
    const filePath = path.join(process.cwd(), 'challenges', `${challengeId}.json`);
    const fileContent = await fs.readFile(filePath, 'utf8');
    const challengeDef: { requirements: { min_players: number} } = JSON.parse(fileContent);

    // check for an existing WAITING team for this specific challenge
    const { data: existingTeam } = await supabase
        .from('player_challenge')
        .select('team_id')
        .eq('challenge_id', challengeId)
        .eq('status', 'WAITING')
        .limit(1)
        .maybeSingle();

    // assign a team_id: use the found one or create a new UUID
    const teamId = (existingTeam as { team_id: string } | null)?.team_id || crypto.randomUUID();

    // join the challenge
    const { error: joinError } = await supabase
        .from('player_challenge')
        .insert({
            player_id: playerId,
            challenge_id: challengeId,
            team_id: teamId,
            status: 'WAITING'
        });

    if (joinError) return { success: false, error: "Already engaged or link failure." };

    // count how many agents are now in this team
    const { count } = await supabase
        .from('player_challenge')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);

    // if we hit the threshold, flip everyone to IN_PROGRESS
    if (count && count >= challengeDef.requirements.min_players) {
        await supabase
            .from('player_challenge')
            .update({ status: 'IN_PROGRESS' })
            .eq('team_id', teamId);
    }

    revalidatePath('/');
    return { success: true, teamId };
}

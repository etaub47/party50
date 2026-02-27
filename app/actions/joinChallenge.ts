'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import fs from 'fs/promises'
import path from 'path'

export interface JoinChallengeResult { success: boolean, teamId?: string, error?: string }
export async function joinChallenge(playerId: string, challengeId: string): Promise<JoinChallengeResult> {

    console.log("JOIN ATTEMPT:", { playerId, challengeId });

    try {
        // load the challenge definition from the JSON file
        const filePath = path.join(process.cwd(), 'challenges', `${challengeId}.json`);
        console.log("LOOKING FOR FILE AT:", filePath);
        const fileContent = await fs.readFile(filePath, 'utf8');
        const challengeDef: { requirements: { min_players: number } } = JSON.parse(fileContent);
        console.log("FILE LOADED SUCCESSFULLY");
        const supabase = await createClient();

        // check for an existing WAITING team for this specific challenge
        const { data: existingTeam, error} = await supabase
            .from('player_challenge')
            .select('team_id')
            .eq('challenge_id', challengeId)
            .eq('status', 'WAITING')
            .limit(1)
            .maybeSingle();
        if (error)
            console.log(error.message);

        // assign a team_id: use the found one or create a new UUID
        console.log(`Lookup for ${challengeId}:`, existingTeam ? `Found team ${existingTeam.team_id}` :
            "No team found, creating new.");
        const teamId = (existingTeam as { team_id: string } | null)?.team_id || crypto.randomUUID();

        // join the challenge
        console.log("ATTEMPTING INSERT FOR PLAYER:", playerId);
        const { error: joinError} = await supabase
            .from('player_challenge')
            .insert({
                player_id: playerId,
                challenge_id: challengeId,
                team_id: teamId,
                status: 'WAITING'
            });

        if (joinError) {
            console.error("SUPABASE INSERT ERROR:", joinError);
            return { success: false, error: joinError.message };
        }

        // count how many agents are now in this team
        const {count} = await supabase
            .from('player_challenge')
            .select('*', {count: 'exact', head: true})
            .eq('team_id', teamId);

        // if we hit the threshold, flip everyone to IN_PROGRESS
        if (count && count >= challengeDef.requirements.min_players) {
            await supabase
                .from('player_challenge')
                .update({status: 'IN_PROGRESS'})
                .eq('team_id', teamId);
        }

        revalidatePath('/');
        return {success: true, teamId};
    } catch (err: any) {
        console.error("FS ERROR:", err.message);
        return { success: false, error: `Configuration error: ${err.message}` };
    }
}

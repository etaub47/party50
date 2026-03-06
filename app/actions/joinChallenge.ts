'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import fs from 'fs/promises'
import path from 'path'
import { PlayerChallenge } from "@/types/dbtypes";

export interface JoinChallengeResult {
    success: boolean,
    teamId?: string,
    status?: string,
    error?: string
}

export async function joinChallenge(playerId: string, challengeId: string): Promise<JoinChallengeResult> {
    console.log("JOIN ATTEMPT:", { playerId, challengeId });
    const supabase = await createClient();

    try {
        const { data } = await supabase
            .from('player_challenge')
            .select('*')
            .eq('player_id', playerId)
            .eq('challenge_id', challengeId)
            .maybeSingle();

        // any row in the player_challenge table should prevent this player joining again
        // only players who have not yet attempted (or aborted) the challenge are eligible
        if (data) {
            const player_challenge: PlayerChallenge = data as PlayerChallenge;
            switch (player_challenge.status) {
                case "COMPLETED":
                    return { success: false, error: "You have already completed this mission." };
                case "FAILED":
                    return { success: false, error: "You have previously failed this mission." };
                case "WAITING":
                case "IN_PROGRESS":
                    return { success: false, error: "You are already engaged with this mission." };
            }
        }

        // load the challenge definition from the JSON file
        const filePath = path.join(process.cwd(), 'challenges', `${challengeId}.json`);
        console.log("LOOKING FOR FILE AT:", filePath);
        const fileContent = await fs.readFile(filePath, 'utf8');
        // TODO: check the mission requirements, refactor to use getMission.ts
        const challengeDef: { requirements: { min_players: number } } = JSON.parse(fileContent);
        console.log("FILE LOADED SUCCESSFULLY");

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
        let status = "WAITING";
        const { error: joinError} = await supabase
            .from('player_challenge')
            .insert({
                player_id: playerId,
                challenge_id: challengeId,
                team_id: teamId,
                status: status
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
            status = "IN_PROGRESS";
            await supabase
                .from('player_challenge')
                .update({status: status})
                .eq('team_id', teamId);
        }

        revalidatePath('/');
        return { success: true, teamId, status };
    } catch (err: any) {
        console.error("FS ERROR:", err.message);
        return { success: false, error: `Configuration error: ${err.message}` };
    }
}

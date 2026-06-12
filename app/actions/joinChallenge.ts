'use server'

import { getMissionManifest } from "@/app/actions/getMission";
import { OverlayProps } from "@/components/Overlay";
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { PlayerChallenge } from "@/types/dbtypes";

export interface JoinChallengeResult {
    success: boolean,
    teamId?: string,
    status?: string,
    overlayProps?: OverlayProps
}

export async function joinChallenge(playerId: string, challengeId: string): Promise<JoinChallengeResult> {
    console.log("JOIN ATTEMPT:", { playerId, challengeId });
    const supabase = await createClient();

    try {
        // check for any active mission (any challenge) first
        const { data: activeMission } = await supabase
            .from('player_challenge')
            .select('challenge_id, status')
            .eq('player_id', playerId)
            .or('status.eq.WAITING,status.eq.IN_PROGRESS')
            .maybeSingle();

        if (activeMission) {
            return {
                success: false,
                overlayProps: {
                    type: 'INFO',
                    title: 'MISSION IN PROGRESS',
                    message: 'You are already engaged with an active mission.'
                }
            };
        }

        // check if player has a terminal record for this specific challenge
        const { data: priorAttempt } = await supabase
            .from('player_challenge')
            .select('status')
            .eq('player_id', playerId)
            .eq('challenge_id', challengeId)
            .maybeSingle();

        if (priorAttempt) {
            const player_challenge: PlayerChallenge = priorAttempt as PlayerChallenge;
            switch (player_challenge.status) {
                case "COMPLETED":
                    return {
                        success: false,
                        overlayProps: {
                            type: 'INFO',
                            title: 'ALREADY COMPLETED',
                            message: 'You have already completed this mission.'
                        }
                    };
                case "FAILED":
                    return {
                        success: false,
                        overlayProps: {
                            type: 'INFO',
                            title: 'PREVIOUSLY FAILED',
                            message: 'You have previously failed this mission.'
                        }
                    };
            }
        }

        // load the challenge definition from the JSON file
        const missionManifest = await getMissionManifest(challengeId);
        if (missionManifest.error) {
            return {
                success: false,
                overlayProps: {
                    type: 'ERROR',
                    title: 'ERROR LOADING MISSION',
                    message: missionManifest.error
                }
            };
        }

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
            return {
                success: false,
                overlayProps: {
                    type: 'ERROR',
                    title: 'UNEXPECTED ERROR',
                    message: joinError.message
                }
            };
        }

        revalidatePath('/');
        return { success: true, teamId, status };
    } catch (err: any) {
        return {
            success: false,
            overlayProps: {
                type: 'ERROR',
                title: 'CONFIGURATION ERROR',
                message: err.message
            }
        };
    }
}

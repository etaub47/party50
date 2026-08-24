'use server'

import { getMissionManifest } from "@/app/actions/getMission";
import { OverlayProps } from "@/components/Overlay";
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface JoinChallengeResult {
    success: boolean,
    teamId?: string,
    status?: string,
    overlayProps?: OverlayProps
}

interface JoinChallengeRow {
    result_code: string,
    out_team_id: string | null,
    out_status: string | null
}

// refusals the RPC can report, in the wording the agent sees
const REFUSALS: Record<string, OverlayProps> = {
    GAME_NOT_ACTIVE: {
        type: 'INFO',
        title: 'GAME NOT ACTIVE',
        message: 'The game is not currently running. Check with your handler before attempting to join a mission.'
    },
    LOCKED_OUT: {
        type: 'ERROR',
        title: 'SURVEILLANCE CRITICAL',
        message: 'Your heat has maxed out. Every operation you touch is being watched — ' +
            'no team will take you until you cool off.'
    },
    ACTIVE_MISSION: {
        type: 'INFO',
        title: 'MISSION IN PROGRESS',
        message: 'You are already engaged with an active mission.'
    },
    ALREADY_COMPLETED: {
        type: 'INFO',
        title: 'ALREADY COMPLETED',
        message: 'You have already completed this mission.'
    },
    ALREADY_FAILED: {
        type: 'INFO',
        title: 'PREVIOUSLY FAILED',
        message: 'You have previously failed this mission.'
    },
    UNKNOWN_PLAYER: {
        type: 'ERROR',
        title: 'UNKNOWN AGENT',
        message: 'Your dossier could not be found. Re-register to continue.'
    }
};

export async function joinChallenge(playerId: string, challengeId: string): Promise<JoinChallengeResult> {
    console.log("JOIN ATTEMPT:", { playerId, challengeId });
    const supabase = await createClient();

    try {
        // load the challenge definition from the JSON file: the team size the RPC fills to
        // comes from here, never from the caller
        const missionManifest = await getMissionManifest(challengeId);
        if (missionManifest.error || !missionManifest.data) {
            return {
                success: false,
                overlayProps: {
                    type: 'ERROR',
                    title: 'ERROR LOADING MISSION',
                    message: missionManifest.error ?? 'Mission file not found'
                }
            };
        }

        // one round trip does the lot: heat lockout, prior-attempt checks, and an atomic
        // claim-or-create of the team. Doing any of it here leaves a window for two
        // simultaneous scans to build separate one-person teams, and reading heat on this
        // side would mean trusting a client-supplied player id for the check.
        const { data, error } = await supabase
            .rpc('join_challenge', {
                p_player_id: playerId,
                p_challenge_id: challengeId,
                p_min_players: missionManifest.data.requirements.min_players
            });

        if (error) {
            console.error("SUPABASE RPC ERROR:", error);
            return {
                success: false,
                overlayProps: {
                    type: 'ERROR',
                    title: 'UNEXPECTED ERROR',
                    message: error.message
                }
            };
        }

        // a set-returning function comes back as rows; there is exactly one
        const result: JoinChallengeRow | undefined = (data as JoinChallengeRow[] | null)?.[0];
        if (!result) {
            return {
                success: false,
                overlayProps: {
                    type: 'ERROR',
                    title: 'UNEXPECTED ERROR',
                    message: 'The mission server did not respond. Try scanning again.'
                }
            };
        }

        if (result.result_code !== 'OK') {
            console.log("JOIN REFUSED:", result.result_code);
            return {
                success: false,
                overlayProps: REFUSALS[result.result_code] ?? {
                    type: 'ERROR',
                    title: 'UNEXPECTED ERROR',
                    message: `The mission server refused the request [${result.result_code}].`
                }
            };
        }

        console.log(`JOINED ${challengeId}: team ${result.out_team_id}`);
        revalidatePath('/');
        return {
            success: true,
            teamId: result.out_team_id!,
            status: result.out_status!
        };
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

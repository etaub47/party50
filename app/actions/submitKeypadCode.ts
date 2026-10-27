'use server'

import { createClient } from '@/utils/supabase/server'
import { readMission } from "@/utils/missionFile";

export type KeypadResult =
    | { result: 'CORRECT' }
    | { result: 'WRONG', attemptsRemaining: number }
    | { result: 'FAILED' }
    | { result: 'ERROR', error: string };

// Checks a keypad code against the mission file, which never leaves the server.
// The player is whoever owns the session (not a caller-supplied id), and the
// mission and step come from their own player_challenge row, so the caller only
// chooses the team and the guess.
export async function submitKeypadCode(teamId: string, code: string): Promise<KeypadResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return { result: 'ERROR', error: 'No active session.' };

    const { data: row, error: rowError } = await supabase
        .from('player_challenge')
        .select('challenge_id, current_step, status')
        .eq('team_id', teamId)
        .eq('player_id', user.id)
        .maybeSingle<{ challenge_id: string, current_step: number, status: string }>();
    if (rowError || !row) {
        console.error("KEYPAD_ERROR:", rowError?.message ?? 'no mission row');
        return { result: 'ERROR', error: 'Mission not found.' };
    }
    if (row.status !== 'IN_PROGRESS')
        return { result: 'ERROR', error: 'Mission is not in progress.' };

    const mission = await readMission(row.challenge_id);
    const step = mission.steps.find(s => s.order === row.current_step);
    if (step?.type !== 'KEYPAD' || !step.config.solution)
        return { result: 'ERROR', error: 'No keypad on this step.' };

    // trust the stored role, not the caller's copy of it
    const { data: playerData } = await supabase
        .from('player')
        .select('role')
        .eq('id', user.id)
        .single<{ role: string | null }>();
    const maxAllowed = playerData?.role === 'Hacker' ? 3 : 1;

    const { data: attemptData } = await supabase
        .from('player_attempt')
        .select('attempts_used')
        .eq('player_id', user.id)
        .eq('challenge_id', row.challenge_id)
        .maybeSingle<{ attempts_used: number }>();
    const used = attemptData?.attempts_used ?? 0;

    const failTeam = async () => {
        await supabase.from('player_challenge').update({ status: 'FAILED' }).eq('team_id', teamId);
    };

    // out of attempts already: no more guesses get checked
    if (used >= maxAllowed) {
        await failTeam();
        return { result: 'FAILED' };
    }

    if (code === step.config.solution)
        return { result: 'CORRECT' };

    const nextCount = used + 1;
    const { error: attemptError } = await supabase.from('player_attempt').upsert(
        { player_id: user.id, challenge_id: row.challenge_id, attempts_used: nextCount },
        { onConflict: 'player_id, challenge_id' }
    );
    if (attemptError)
        console.error("KEYPAD_ATTEMPT_ERROR:", attemptError.message);

    if (nextCount >= maxAllowed) {
        await failTeam();
        return { result: 'FAILED' };
    }
    return { result: 'WRONG', attemptsRemaining: maxAllowed - nextCount };
}

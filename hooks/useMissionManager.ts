'use client'

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getMissionManifest, Mission } from '@/app/actions/getMission';
import { ActiveMission } from '@/types/types';

const supabase = createClient();

export function useMissionManager(playerId: string | null) {
    const [ activeMission, setActiveMission ] = useState<ActiveMission | null>(null);
    const [ missionData, setMissionData ] = useState<Mission | null>(null);
    const [ isManifestLoading, setIsManifestLoading ] = useState(false);

    // check for existing mission in DB
    const checkExistingMission = useCallback(async (pId: string) => {
        const { data, error } = await supabase
            .from('player_challenge')
            .select('challenge_id, team_id, status, current_step')
            .eq('player_id', pId)
            .or('status.eq.WAITING, status.eq.IN_PROGRESS')
            .maybeSingle();
        if (error)
            console.log(error.message)
        if (data && !error) {
            setActiveMission({
                challengeId: data.challenge_id,
                teamId: data.team_id,
                status: data.status,
                currentStep: data.current_step
            });
        }
    }, []);

    // handle URL sync
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const challengeId = params.get('activeChallenge');
        const teamId = params.get('teamId');
        const status = params.get('status');

        if (challengeId && teamId && status && !activeMission) {
            setActiveMission({ challengeId, teamId, status, currentStep: 1 });
            window.history.replaceState({}, '', '/');
        }
    }, [activeMission]);

    // load Manifest when activeMission changes
    useEffect(() => {
        async function loadManifest() {
            if (!activeMission?.challengeId || missionData?.id === activeMission.challengeId)
                return;
            setIsManifestLoading(true);
            const result = await getMissionManifest(activeMission.challengeId);
            if (result.success) {
                setMissionData(result.data as Mission);
            }
            setIsManifestLoading(false);
        }
        void loadManifest();
    }, [activeMission?.challengeId, missionData?.id]);

    // start an active mission
    const startMission = useCallback(() => {
        if (!activeMission)
            return;
        setActiveMission(prev => prev ? { ...prev, status: "IN_PROGRESS" } : null);
    }, [activeMission]);

    // abort the current mission
    const abortMission = useCallback(async () => {
        if (!activeMission || !playerId)
            return;

        await supabase.from('player_vote').delete().eq('team_id', activeMission.teamId);
        const { error } = await supabase.from('player_challenge')
            .delete().eq('team_id', activeMission.teamId);

        if (!error) {
            setActiveMission(null);
            setMissionData(null);
            return { success: true };
        }
        return { success: false, error: error.message };
    }, [activeMission, playerId]);

    // terminate the active mission
    const terminateMission = useCallback(async () => {
        setActiveMission(null);
    }, [])

    return {
        activeMission,
        missionData,
        isManifestLoading,
        checkExistingMission,
        startMission,
        abortMission,
        terminateMission
    };
}

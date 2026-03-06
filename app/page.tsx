'use client'

import { ChangeEvent, useEffect, useState } from 'react'

import { createClient } from '@/utils/supabase/client'
import { registerPlayer } from '@/app/actions/register'
import { useAuth } from "@/hooks/useAuth";
import { usePurchase } from "@/hooks/usePurchase";
import { getMissionManifest, Mission } from '@/app/actions/getMission';
import { PlayerItem, PlayerStats } from '@/types/dbtypes'

import ProfileView from '@/components/ProfileView'
import InventoryView from '@/components/InventoryView'
import Leaderboard from '@/components/LeaderBoard'
import Overlay from "@/components/Overlay";
import WaitingRoom from "@/components/WaitingRoom";
import MissionRunner from "@/components/MissionRunner";

export default function WelcomePage() {

  const {
    playerData, setPlayerData, items, setItems, isRegistered, setIsRegistered, isLoading,
    setIsLoading, activeMission, setActiveMission
  } = useAuth();

  const {
    purchaseOverlay, isProcessing, purchaseItem
  } = usePurchase(playerData?.id, playerData?.role);

  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [activeTab, setActiveTab] = useState<'profile' | 'inventory' | 'leaderboard'>('profile');
  const [hasDossier, setHasDossier] = useState(false);
  const [missionData, setMissionData] = useState<any | null>(null);
  const [abortOverlayVisible, setAbortOverlayVisible] = useState(false);

  const supabase = createClient()

  // handle the URL parameters that set the active mission
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const challengeId = params.get('activeChallenge');
    const teamId = params.get('teamId');
    const status: string|null = params.get('status');
    const scanItemId = params.get('scanItem');

    if (challengeId && teamId && status) {
      setActiveMission({ challengeId, teamId, status, currentStep: 1 });
      window.history.replaceState({}, '', '/');
    }

    if (scanItemId && playerData?.id) {
      void purchaseItem(scanItemId);
      window.history.replaceState({}, '', '/');
    }

  }, [playerData?.id, setActiveMission]);

  // load the mission data from the server
  useEffect(() => {
    const loadMission = async () => {
      if (!activeMission?.challengeId || missionData) return;
      const result: { data?: Mission, success: boolean, error?: string } =
          await getMissionManifest(activeMission.challengeId);
      if (result.success)
        setMissionData(result.data);
    };
    void loadMission();
  }, [activeMission?.challengeId]);

  // register a new player who has just completed the registration form
  const handleStartGame = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);

    let { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError) {
        setIsLoading(false);
        return;
      }
      user = signInData.user;
    }

    if (!user) {
      setIsLoading(false);
      return;
    }

    const formData = new FormData()
    formData.append('playerName', name)
    formData.append('playerRole', role)
    formData.append('playerId', user.id)

    const result = await registerPlayer(formData as any)
    if (result.success) {

      // re-fetch from the view after successful registration to get initial stats
      const { data: stats } = await supabase
          .from('player_stats')
          .select('*')
          .eq('id', user.id)
          .single();

      setPlayerData(stats as PlayerStats);
      setItems([]);
      setHasDossier(false);
      setIsRegistered(true);
    }

    setIsLoading(false);
  }

  // when a player changes tabs, do a new dossier check before switching to the leaderboard
  const handleTabChange = async (tab: 'profile' | 'inventory' | 'leaderboard') => {
    setActiveTab(tab);

    // if they click leaderboard, do a quick check to see if they acquired the dossier
    if (tab === 'leaderboard' && playerData?.id) {
      const { data, error } = await supabase
          .from('player_item')
          .select(`item:item_id (name)`)
          .eq('player_id', playerData.id);

      if (error)
        console.error("Dossier check error:", error.message);

      if (data && !error) {
        const playerItems: PlayerItem[] = data as any as PlayerItem[];
        const hasDossier = playerItems?.some(row => row.item?.name === 'Agent Dossier');
        setHasDossier(!!hasDossier);
      }
    }
  };

  // abort the current mission
  const handleAbort = async () => {
    if (!activeMission || !playerData?.id)
      return;

    // delete any previous votes associated with the active mission/team
    await supabase
        .from('player_vote')
        .delete()
        .eq('team_id', activeMission.teamId);

    // delete all rows associated with the active mission's team id
    const { error } = await supabase
        .from('player_challenge')
        .delete()
        .eq('team_id', activeMission.teamId);

    // only clear local state if DB deletion was successful
    if (!error) {
      setActiveMission(null);
    } else {
      console.error("Failed to terminate mission:", error.message);
    }
  };

  // updates the active mission to indicate that it has started
  const handleStartMission = async () => {
    if (!activeMission) return;
    setActiveMission({
      ...activeMission,
      status: "IN_PROGRESS"
    });
  };

  // game is loading
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading Game...</div>;
  }

  if (isRegistered) { // player is already registered
    if (activeMission) { // mission is active

      if (activeMission.status === "IN_PROGRESS") { // mission has started
        if (!missionData) {
          return <div className="flex items-center justify-center min-h-screen">Decrypting Mission Manifest...</div>;
        }
        return (
            <div>
              <MissionRunner
                  teamId={activeMission.teamId}
                  missionData={missionData}
                  playerRole={playerData.role}
                  initialStep={activeMission.currentStep}
                  playerId={playerData.id}
                  onAbort={() => setAbortOverlayVisible(true)}
              />

              {abortOverlayVisible && (
                <Overlay
                    title="CRITICAL WARNING"
                    message="ABORT MISSION? Connection for all team members will be severed."
                    type="ERROR"
                    onConfirm={handleAbort}
                    onClose={() => setAbortOverlayVisible(false)}
                    isProcessing={isProcessing}
                />
              )}
            </div>
        );
      }

      return (
          <div className="p-10 text-center flex flex-col items-center justify-center min-h-screen">
            <WaitingRoom
                teamId={activeMission.teamId}
                minPlayers={3}
                playerId={playerData.id}
                onStart={() => handleStartMission()}
                onAbort={() => setAbortOverlayVisible(true)}
            />
            {abortOverlayVisible && (
                <Overlay
                    title="CRITICAL WARNING"
                    message="ABORT MISSION? Connection for all team members will be severed."
                    type="ERROR"
                    onConfirm={handleAbort}
                    onClose={() => setAbortOverlayVisible(false)}
                    isProcessing={isProcessing}
                />
            )}
          </div>
      );
    }

    // show the standard tabs
    return (
        <div className="p-10 text-center flex flex-col items-center">
          <div className="flex gap-4 mb-6 border-b border-gray-700">
            <button
                onClick={() => handleTabChange('profile')}
                className={activeTab === 'profile' ? 'border-b-2 border-blue-500' : ''}
            >
              Profile
            </button>
            <button
                onClick={() => handleTabChange('inventory')}
                className={activeTab === 'inventory' ? 'border-b-2 border-blue-500' : ''}
            >
              Inventory
            </button>
            <button
                onClick={() => handleTabChange('leaderboard')}
                className={activeTab === 'leaderboard' ? 'border-b-2 border-blue-500' : ''}
            >
              Leaderboard
            </button>
          </div>

          <div className="tab-content max-w-md w-full">
            <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
              <ProfileView initialPlayerData={playerData} />
            </div>
            <div className={activeTab === 'inventory' ? 'block' : 'hidden'}>
              <InventoryView initialItems={items} playerId={playerData?.id} />
            </div>
            <div className={activeTab === 'leaderboard' ? 'block' : 'hidden'}>
              <Leaderboard hasDossier={hasDossier} />
            </div>
          </div>

          {/* overlays */}
          {purchaseOverlay && (
              <Overlay
                  title={purchaseOverlay.title}
                  message={purchaseOverlay.message}
                  type={purchaseOverlay.type}
                  onConfirm={purchaseOverlay.onConfirm}
                  onClose={purchaseOverlay.onClose}
                  isProcessing={isProcessing}
              />
          )}

        </div>
    )
  }

  // not yet registered
  return (
      <main className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-4xl font-bold mb-8">Corporate Espionage Agent Registration</h1>

        <form onSubmit={handleStartGame} className="flex flex-col gap-4 w-full max-w-sm">
          <input
              type="text"
              placeholder="Please enter your name"
              className="p-3 border rounded-lg text-black"
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              required
          />
          <select
              className="p-3 border rounded-lg text-black bg-white"
              value={role}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setRole(e.target.value)}
              required
          >
            <option value="" disabled>Please select your role</option>
            <option value="Hacker">Hacker</option>
            <option value="Lawyer">Lawyer</option>
            <option value="Bargain Hunter">Bargain Hunter</option>
            <option value="Scavenger">Scavenger</option>
          </select>
          <button
              type="submit"
              className="bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700"
          >
            Register
          </button>
        </form>
      </main>
  )
}

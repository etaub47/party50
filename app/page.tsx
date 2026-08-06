'use client'

import HistoryView from "@/components/HistoryView";
import { useMissionManager } from "@/hooks/useMissionManager";
import { usePlayerDataSync } from "@/hooks/usePlayerDataSync";
import { ChangeEvent, useCallback, useEffect, useState } from 'react'

import { createClient } from '@/utils/supabase/client'
import { registerPlayer } from '@/app/actions/register'

import ProfileView from '@/components/ProfileView'
import InventoryView from '@/components/InventoryView'
import Leaderboard from '@/components/LeaderBoard'
import WaitingRoom from "@/components/WaitingRoom";
import MissionRunner from "@/components/MissionRunner";

export default function WelcomePage() {

  const [ name, setName ] = useState('')
  const [ role, setRole ] = useState('')
  const [ activeTab, setActiveTab ] = useState<'profile' | 'inventory' | 'leaderboard' | 'history'>('profile');
  const [ playerId, setPlayerId ] = useState<any | null>(null);
  const [ isRegistered, setIsRegistered ] = useState(false);
  const [ isLoading, setIsLoading ] = useState(true);
  const [ registrationError, setRegistrationError ] = useState<string | null>(null);

  const supabase = createClient()

  const { playerStats, items, events, isConnected,
    isInitialLoading, refresh } = usePlayerDataSync(playerId);
  const { activeMission, missionData, isManifestLoading,
    checkExistingMission, startMission, abortMission, terminateMission } = useMissionManager(playerId);

  const refreshAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    let user = session?.user;
    if (!user) {
      const { data } = await supabase.auth.signInAnonymously();
      user = data.user ?? undefined;
    }

    if (user) {
      setIsRegistered(true);
      setPlayerId(user.id);
      void refresh();
      void checkExistingMission(user.id);
    }
    setIsLoading(false);
  }, [supabase, refresh, checkExistingMission]);

  useEffect(() => {
    void refreshAuth();
  }, []);

  // register a new player who has just completed the registration form
  const registerNewPlayer = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    setRegistrationError(null);

    // every exit path must clear isLoading, or the form is replaced by
    // "Loading Game..." forever with nothing telling the player what broke
    try {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) {
          setRegistrationError(`Could not open a secure channel: ${signInError.message}`);
          return;
        }
        user = signInData.user;
      }

      if (!user) {
        setRegistrationError("Could not open a secure channel. Check your connection and try again.");
        return;
      }

      const formData = new FormData()
      formData.append('playerName', name)
      formData.append('playerRole', role)
      formData.append('playerId', user.id)
      const result = await registerPlayer(formData as any)

      if (!result.success) {
        setRegistrationError(result.error || "Registration was refused. Please try again.");
        return;
      }

      setIsRegistered(true);
      setPlayerId(user.id);
      void refresh();
    } catch (err) {
      setRegistrationError(
          err instanceof Error && err.message
              ? err.message
              : "Unexpected error during registration."
      );
    } finally {
      setIsLoading(false);
    }
  }

  // game is loading
  if (isLoading || (playerId && isInitialLoading)) {
    return <div className="flex items-center justify-center min-h-screen">Loading Game...</div>;
  }

  // not yet registered
  if (!isRegistered || playerStats == null) {
    return (
        <main className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-4xl font-bold mb-8">Corporate Espionage Agent Registration</h1>

          <form onSubmit={registerNewPlayer} className="flex flex-col gap-4 w-full max-w-sm">
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

            {registrationError && (
                <div
                    role="alert"
                    className="p-3 border-2 border-red-600 bg-red-950/40 rounded-lg font-mono text-xs text-red-400"
                >
                  <span className="block font-bold uppercase tracking-widest mb-1">
                    Registration Failed
                  </span>
                  {registrationError}
                </div>
            )}
          </form>
        </main>
    )
  }

  if (activeMission) {
    if (isManifestLoading || !missionData) {
      return (
          <div className="flex items-center justify-center min-h-screen">
            Decrypting Mission Manifest...
          </div>
      )
    }

    if (activeMission.status === "IN_PROGRESS") {
      return (
          <MissionRunner
              key={`mission-${activeMission.teamId}`}
              teamId={activeMission.teamId}
              missionData={missionData}
              playerRole={playerStats!.role}
              initialStep={activeMission.currentStep}
              playerId={playerStats!.id}
              onAbort={abortMission}
              onTerminate={terminateMission}
          />
      );
    }

    // waiting room
    return (
        <WaitingRoom
            teamId={activeMission.teamId}
            missionData={missionData}
            playerId={playerStats!.id}
            onStart={startMission}
            onAbort={abortMission}
            onTerminate={terminateMission}
        />
    );
  }

  // show the standard tabs
  return (
      <div className="p-10 text-center flex flex-col items-center">
        <div className="flex gap-4 mb-6 border-b border-gray-700">
          <button
              onClick={() => setActiveTab('profile')}
              className={activeTab === 'profile' ? 'border-b-2 border-blue-500' : ''}
          >
            Profile
          </button>
          <button
              onClick={() => setActiveTab('inventory')}
              className={activeTab === 'inventory' ? 'border-b-2 border-blue-500' : ''}
          >
            Inventory
          </button>
          <button
              onClick={() => setActiveTab('leaderboard')}
              className={activeTab === 'leaderboard' ? 'border-b-2 border-blue-500' : ''}
          >
            Leaderboard
          </button>
          <button
              onClick={() => setActiveTab('history')}
              className={activeTab === 'history' ? 'border-b-2 border-blue-500' : ''}
          >
            History
          </button>
        </div>
        <div className="tab-content max-w-md w-full">
          <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
            <ProfileView playerStats={playerStats} isConnected={isConnected} />
          </div>
          <div className={activeTab === 'inventory' ? 'block' : 'hidden'}>
            <InventoryView items={items} playerId={playerStats!.id} playerRole={playerStats!.role} isConnected={isConnected} />
          </div>
          <div className={activeTab === 'leaderboard' ? 'block' : 'hidden'}>
            <Leaderboard
                playerStats={playerStats}
                items={items}
                isActive={activeTab === 'leaderboard'}
                isConnected={isConnected}/>
          </div>
          <div className={activeTab === 'history' ? 'block' : 'hidden'}>
            <HistoryView events={events} isConnected={isConnected} />
          </div>
        </div>
      </div>
  )
}

'use client'

import { ChangeEvent, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { registerPlayer } from '@/app/actions/register'

import ProfileView from '@/components/ProfileView'
import InventoryView from '@/components/InventoryView'
import Leaderboard from '@/components/LeaderBoard'

export default function WelcomePage() {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [isRegistered, setIsRegistered] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'inventory' | 'leaderboard'>('profile');
  const [playerData, setPlayerData] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [hasDossier, setHasDossier] = useState(false);
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: player } = await supabase
            .from('player')
            .select('*, player_item(player_id, item_id, item:item_id (name, type, intel, heat))')
            .eq('id', user.id)
            .single() as any;

        if (player?.name) {
          setName(player.name);
          setPlayerData(player);
          setItems(player.player_item || []);
          setIsRegistered(true);
          setHasDossier(player.player_item?.some(
              (pi: any) => pi.item?.name === 'Agent Dossier'
          ) || false);
        }

      } else {
        await supabase.auth.signInAnonymously();
      }
      setIsLoading(false);
    };

    const ignored = checkUser();
  }, [supabase]);

  const handleStartGame = async (e: any) => {
    e.preventDefault();

    const formData = new FormData()
    formData.append('playerName', name)
    formData.append('playerRole', role)

    const result = await registerPlayer(formData as any)
    if (result.success && result.player) {
      setPlayerData(result.player);
      setItems([]);
      setHasDossier(false);
      setIsRegistered(true);
    } else {
      alert("Error joining game: " + result.error)
    }
  }

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
      const hasDossier = data?.some(row => row.item?.name === 'Agent Dossier');
      setHasDossier(!!hasDossier);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading Game...</div>;
  }

  if (isRegistered) {
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

          <div className="tab-content">
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
        </div>
    )
  }

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

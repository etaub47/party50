'use client'

import { ChangeEvent, useEffect, useState } from 'react'

import { createClient } from '@/utils/supabase/client'
import { registerPlayer } from '@/app/actions/register'
import { executePurchase, PurchaseResult, validatePurchase, ValidationResult } from "@/app/actions/purchase";

import ProfileView from '@/components/ProfileView'
import InventoryView from '@/components/InventoryView'
import Leaderboard from '@/components/LeaderBoard'
import PurchaseOverlay from "@/components/PurchaseOverlay";

interface Item { id?: string, name: string, type?: string, intel?: number, heat?: number }
interface PlayerItem { item: Item | null }
interface Player { id: string, name: string, player_item: PlayerItem[] }

export default function WelcomePage() {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [isRegistered, setIsRegistered] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'inventory' | 'leaderboard'>('profile');
  const [playerData, setPlayerData] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [hasDossier, setHasDossier] = useState(false);
  const [overlay, setOverlay] = useState<{ type: string, itemName?: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScannedItemId, setLastScannedItemId] = useState<string | null>(null);
  const supabase = createClient()

  useEffect(() => {
    const initializeAuth = async () => {

      // 1. First, check if a session already exists locally (non-blocking)
      const { data: { session } } = await supabase.auth.getSession();

      let user = session?.user;

      // 2. If no session, force the sign-in immediately
      if (!user) {
        console.log("No session found. Attempting anonymous sign-in...");
        const { data, error } = await supabase.auth.signInAnonymously();

        if (error) {
          console.error("Sign-in failed:", error.message);
          alert("CRITICAL AUTH ERROR: " + error.message);
          setIsLoading(false);
          return;
        }
        user = data.user ?? undefined;
      }

      // 3. Now that we have a user, fetch the player data
      if (user) {
        const { data: playerData, error: playerError } = await supabase
            .from('player')
            .select('*, player_item(player_id, item_id, item:item_id (name, type, intel, heat))')
            .eq('id', user.id)
            .single();

        if (playerData && !playerError) {
          const player: Player = playerData as Player;

          if (player?.name) {
            setName(player.name);
            setPlayerData(player);
            setItems(player.player_item || []);
            setIsRegistered(true);
            setHasDossier(player.player_item?.some(
                (pi: any) => pi.item?.name === 'Agent Dossier'
            ) || false);
          }
        }
      }

      setIsLoading(false);
    };

    const ignored = initializeAuth();
  }, [supabase]);

  {/*
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
            .from('player')
            .select('*, player_item(player_id, item_id, item:item_id (name, type, intel, heat))')
            .eq('id', user.id)
            .single();

        if (error)
          console.error("Check user error:", error.message);

        if (data && !error) {
          const player: Player = data as Player;
          if (player?.name) {
            setName(player.name);
            setPlayerData(player);
            setItems(player.player_item || []);
            setIsRegistered(true);
            setHasDossier(player.player_item?.some(
                (pi: any) => pi.item?.name === 'Agent Dossier'
            ) || false);
          }
        }

      } else {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error("Anonymous Sign-in Error:", error.message);
          alert("Auth Error: " + error.message); // This will show on your phone
        } else {
          console.log("Anonymous Sign-in Success:", data.user?.id);
        }
      }
      setIsLoading(false);
    };

    const ignored = checkUser();
  }, [supabase]);
  */ }

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
    if (result.success && result.player) {
      setPlayerData(result.player);
      setItems([]);
      setHasDossier(false);
      setIsRegistered(true);
    }

    setIsLoading(false);
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

      if (data && !error) {
        const playerItems: PlayerItem[] = data as any as PlayerItem[];
        const hasDossier = playerItems?.some(row => row.item?.name === 'Agent Dossier');
        setHasDossier(!!hasDossier);
      }
    }
  };

  const handleScan = async (itemId: string) => {
    console.log("Scan initiated for ID:", itemId);
    setLastScannedItemId(itemId);
    const result: ValidationResult = await validatePurchase(playerData.id, itemId, playerData.role);
    console.log("Server response:", result);

    if (result.status === 'owned') {
      setOverlay({ type: 'ERROR_OWNED', itemName: result.itemName ?? 'Unknown Item' });
    } else if (result.status === 'poor') {
      setOverlay({ type: 'ERROR_CREDITS', itemName: result.itemName ?? 'Unknown Item' });
    } else if (result.status === 'confirm') {
      setOverlay({ type: 'CONFIRM', itemName: result.itemName ?? 'Unknown Item' });
    } else {
      alert(`Status: ${result.status}. Message: ${result.message || 'No message'}`);
    }
  };

  const handleConfirmPurchase = async () => {
    if (!playerData?.id || !lastScannedItemId)
      return;

    setIsProcessing(true);
    const result: PurchaseResult = await executePurchase(playerData.id, lastScannedItemId, playerData.role);
    setIsProcessing(false);

    if (result.success) {
      setOverlay({ type: 'SUCCESS', itemName: result.itemName || 'Item' });
    } else {
      setOverlay({ type: 'ERROR_GENERIC', itemName: result.error || 'Transaction Failed' });
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

          <div className="tab-content max-w-md w-full">
            <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
              <ProfileView initialPlayerData={playerData} />
            </div>
            <div className={activeTab === 'inventory' ? 'block' : 'hidden'}>
              <InventoryView initialItems={items} playerId={playerData?.id} onScan={handleScan} />
            </div>
            <div className={activeTab === 'leaderboard' ? 'block' : 'hidden'}>
              <Leaderboard hasDossier={hasDossier} />
            </div>
          </div>

          {overlay && (
              <PurchaseOverlay
                  overlay={overlay}
                  isProcessing={isProcessing}
                  onClose={() => setOverlay(null)}
                  onConfirm={handleConfirmPurchase}
              />
          )}
        </div>
    )
  }

  {/* not yet registered */}
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

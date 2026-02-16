'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { registerPlayer } from '@/app/actions/register'

import Leaderboard from '@/components/LeaderBoard'

export default function WelcomePage() {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [isRegistered, setIsRegistered] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      // 1. Check if we already have a session
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // 2. If user exists, fetch their profile to see if they have a name/role
        const { data: profile } = await supabase
            .from('player')
            .select('name')
            .eq('id', user.id)
            .single() as { data: { name: string } | null };

        if (profile?.name) {
          setName(profile.name);
          setIsRegistered(true);
        }
      } else {
        // 3. Only sign in anonymously if no user exists at all
        await supabase.auth.signInAnonymously();
      }
      setIsLoading(false);
    };

    checkUser();
  }, [supabase]);

  const handleStartGame = async (e: any) => {
    e.preventDefault();

    // 2. Call your Server Action to save the name to the DB
    const formData = new FormData()
    formData.append('playerName', name)
    formData.append('playerRole', role)

    const result = await registerPlayer(formData as any)
    if (result.success) {
      setIsRegistered(true)
    } else {
      alert("Error joining game: " + result.error)
    }
  }

  // 3. Show a clean screen while checking the cookie
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading Game...</div>;
  }

  if (isRegistered) {
    return (
        <div className="p-10 text-center flex flex-col items-center">
          <h1 className="text-2xl font-bold mb-4">Welcome to the game, {name}!</h1>
          <Leaderboard />
        </div>
    )
  }

  return (
      <main className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-4xl font-bold mb-8">Corporate Espionage Agent Registration</h1>

        <form onSubmit={handleStartGame} className="flex flex-col gap-4 w-full max-w-sm">
          <input
              type="text"
              placeholder="Please enter your name:"
              className="p-3 border rounded-lg text-black"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
          />
          <select
              className="p-3 border rounded-lg text-black bg-white"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
          >
            <option value="" disabled>Select your role:</option>
            <option value="Hacker">Hacker</option>
            <option value="Lawyer">Lawyer</option>
            <option value="Bargain Hunter">Bargain Hunter</option>
            <option value="Scavenger">Scavenger</option>
          </select>
          <button
              type="submit"
              className="bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700"
          >
            Join Game
          </button>
        </form>
      </main>
  )
}

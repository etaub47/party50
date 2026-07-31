This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Potential bugs found by Claude Code

High

4. Client-supplied role = free cheat — FIXED
   app/actions/purchaseItem.ts:18,51 take playerRole from the caller and pass it to purchase_item_with_discount. Client can send "Bargain Hunter" → 30% off everything. Same for app/actions/discoverItem.ts:45 ("Scavenger" → steal already-claimed items). Read the role server-side from player using the session user id.
   purchase_item_with_discount now ignores p_player_role and prices off player.role; handleItemDiscovery no longer takes playerRole and reads it from player by id. No client-supplied role grants anything. Two leftovers, neither exploitable as item 4 described: validatePurchase:42 still prices the pre-flight check off the caller's role, so a faker passes the affordability check and then gets "Insufficient credits" from the RPC instead of a clean message; and see 19 for the same shape of bug in KeypadView.

Medium

6. app/scan/global/[eventId]/page.tsx:27 — infinite spinner
   else if (data && data[0]). RPC returning null/[] with no error → result stays null → spinner with no escape button. Add a final else.

7. app/actions/processConsequences.ts:33 — error silently eats the reward
   if (!existing && !checkError). A failed dedupe query means the player loses their event award, logged only to console. Should fail loud or insert anyway (DB constraint dedupes).

8. components/ProfileView.tsx:24,43 — NaN width
   (total_intel / max_intel) * 100 → max_intel = 0 gives NaN, Math.max(NaN, 2) is NaN, width: NaN% is dropped. Same for max_credits. Guard the denominator.

9. components/LeaderBoard.tsx:94 — ADVISED badge lags 30s
   handleLegalAdvice success calls fetchPlayers() but not fetchAdviceHistory(), so the button stays clickable until the interval tick. Lawyer can re-click and hit the unique violation. Also :142 and :157 omit fetchAdviceHistory from deps.

10. app/actions/joinChallenge.ts:22 — maybeSingle() on a multi-row query — FIXED here, still open elsewhere
    Player with two active player_challenge rows → PostgREST error, data null, error not destructured → treated as "no active mission". Same shape at :41. Use .limit(1) or check error.
    Both joinChallenge queries are gone: the active-mission and prior-attempt checks now run inside join_challenge() as SELECT ... LIMIT 1 into a scalar, which cannot error on extra rows. processConsequences still has the same shape.

11. app/actions/joinChallenge.ts:86-99 — team assignment race — FIXED, not yet tested under concurrency
    Two players scanning simultaneously both find no WAITING row and both mint a fresh team_id → two teams of 1 that never fill. Needs an atomic RPC or unique constraint.
    data/functions/join_challenge.sql takes pg_advisory_xact_lock(hashtext(challenge_id)) and does claim-or-create in one transaction (no challenge table exists to FOR UPDATE — missions are JSON keyed by text id). Single-session logic tests pass; the two-session lock test and the 3-phones-at-once test have not been run, so this is fixed in principle only.

12. Team of 4 deadlocks majority vote — FIXED at the join path
    A 4th player joining before the others flip to IN_PROGRESS yields a 4-person team. DecisionView.tsx:38 needs count > totalRequired / 2 — a 2-2 split has no winner and the step never advances. Cap team size at min_players.
    join_challenge() only offers a team with COUNT(*) < min_players and no non-WAITING row, so a 4th scanner seeds a new team instead of joining a trio that is already under way. DecisionView.tsx:38 is untouched: correct for min_players 1 and 3, would break again for any even team size.

Low

13. components/missionsteps/SignalPathView.tsx:140-141 — [...grid] is shallow; newGrid[idx].rotation = ... mutates the object still held by the previous state. Works today, breaks under concurrent rendering. Use {...newGrid[idx], rotation: ...}.

14. components/MissionRunner.tsx:243-296 — MEMORY/MASTERMIND/MATRIX/SLIDER/ROTARY have no key={...currentStepIndex} (KEYPAD/DECISION/SIGNAL do). Two consecutive steps of the same puzzle type would keep stale isSolved: true → instant free pass. No current mission does this, so latent.

15. components/missionsteps/KeypadView.tsx:48 — findIndex returning -1 gives hints[-1] → "No intel available." instead of a hint. Happens if the team row isn't visible yet.

16. components/QRScanner.tsx:28 — decodedText.includes('party50.vercel.app') hardcoded; scanner silently ignores every code on localhost or any other host.

17. Client-only gates. AppGuard.tsx:12 and app/hq/layout.tsx:13 check document.cookie in the browser, and both passcodes are NEXT_PUBLIC_* (shipped in the JS bundle). HQ "god mode" — global event triggers, all agent dossiers — is reachable by typing document.cookie='hq_access=true'. Also .includes("hq_access=true") substring-matches, so a cookie named xhq_access passes. Fine if the threat model is "nobody at the party opens devtools"; not fine otherwise.

19. components/missionsteps/KeypadView.tsx:73 — keypad attempt limit is client-side only
    maxAllowed = playerRole === 'Hacker' ? 3 : 1 runs in the browser, and the client also writes both the attempt count (player_attempt upsert) and the team's status: 'FAILED'. Devtools gets unlimited guesses, or can skip recording a failure entirely; RLS keeps it to the player's own team, so it is self-serving rather than griefing. Same class as 17. Fix needs the attempt count and the fail transition moved into an RPC that reads the role itself.

Content

18. 22 of 25 missions have "solution": "TODO" and "hints": ["TODO",...] — unbeatable, and on mobile the numeric keypad can't even type TODO. Only boardroom_audit (4624), cleaning_crew_shift (4991), tax_loophole_breach (1234) are real. Your two uncommitted diffs are exactly this work; both check out (4·6=24 → 4624; 4991 reversed → 1994).

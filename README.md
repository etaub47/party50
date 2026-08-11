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

Medium

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

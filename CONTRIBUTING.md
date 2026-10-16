# Contributing to SNAKE NEON

Thanks for helping make the game better. This guide is short on ceremony and long on signal.

## Ground rules

1. **The engine stays pure.** `src/game/` must never import React and never touch UI DOM. It owns simulation, canvas rendering, audio synthesis, input, and storage. React (`src/components/`) owns menus, HUD, panels, and buttons only.
2. **All tuning lives in `src/game/config.ts`.** No inline magic numbers for speeds, scores, durations, probabilities, or colors.
3. **Feel > features.** If a change makes the game slower, laggier, or less responsive, it doesn't ship. Target 60 FPS on a mid-range phone.
4. **Verified, not vibes.** `npm run build` must pass, and you must have actually played a round with your change.

## Local setup

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production check (= what CI runs)
```

## Finding something to do

- Check the **Roadmap Ideas** in the README.
- Look for issues labeled `good first issue`.
- Tuning proposals (speed curve, spawn odds, combo tiers) are welcome — justify with gameplay reasoning.

## Code style

- TypeScript strict mode is on — no new `any`, no unused locals.
- Small, single-responsibility modules; prefer extending existing managers (`FoodManager`, `ParticleSystem`, …) over new globals.
- Comments explain **why**, not what. The code says what.
- Visual additions go through the existing `BoardRenderer` layer on the single canvas — no new per-entity DOM nodes in the game loop.

## Testing a gameplay change (manual QA pass)

- [ ] Start, steer with arrows **and** WASD, quick direction reversals are blocked
- [ ] Eat each orb type; score, growth, popups, combo tier all correct
- [ ] Die by wall and by self; shield absorbs one hit when active
- [ ] Pause (button / Space / Esc / tab switch) and resume cleanly
- [ ] Restart is instant; high score and leaderboard persist after reload
- [ ] Power-up badges tick down and expire
- [ ] Resize window + rotate device mid-run — no crash, no cheap deaths
- [ ] Phone-width layout: swipe and D-pad work, no horizontal scroll

## Commit & PR

- Conventional-ish messages: `feat:`, `fix:`, `tune:`, `docs:`, `perf:`, `refactor:`
- Fill out the PR template; screenshots/GIFs for anything visual.
- CI (build) must be green before merge.

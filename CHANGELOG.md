# Changelog

All notable changes to SNAKE NEON are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/), versioning is [SemVer](https://semver.org/).

## [1.0.0] — 2026-02-16

### Added
- Full playable game: fixed-timestep grid simulation with interpolated 60 FPS rendering
- Four orb types — Normal (+10), Gold (+25), Purple bonus (+50, timed), Energy (power-up carrier)
- Four power-ups — Overdrive, Slow-Mo, Shield, Double Score — with live HUD countdown rings
- Combo multiplier system (x1 → x2) with draining timer
- Difficulty ramp: smooth score-based acceleration, level milestones, Normal/Hard modes
- Attract mode: autopilot snake demo behind the main menu
- Juice: trauma screen shake, pooled particles, eat pulses, floating score popups, death shatter
- Synthesized WebAudio SFX + optional ambient music pad (gesture-safe autoplay)
- Complete state flow: Menu → 3-2-1-GO → Playing ⇄ Paused → Game Over (instant restart)
- Persistence: high score, best length/combo, Top-5 local leaderboard, all settings
- Controls: arrows/WASD, Space/Esc/R shortcuts, pointer swipes, optional touch D-pad
- Auto-pause on tab hide/blur; resize/orientation-safe with collision grace window
- Settings: sound, music, shake, particles, reduced motion, difficulty, D-pad
- Accessibility: focus-visible rings, aria-live announcements, reduced-motion support
- Repo: CI + GitHub Pages deploy workflows, issue & PR templates, contributing guide

### Fixed
- Boot order crash: engine now initializes the world before the first grid resize
- Autopilot steering no longer blocked by the player-input phase gate
- Keyboard handler no longer suppresses native button activation (Space/Enter)

[1.0.0]: https://github.com/OWNER/snake-neon/releases/tag/v1.0.0

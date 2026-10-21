# Graphics and Meme Audio Implementation Plan

> **For agentic workers:** Use subagent-driven-development with disjoint file ownership. User approved execution on 2026-10-21. Steps use checkboxes for tracking.

**Goal:** Clean up the existing low-poly highway presentation and integrate two provided meme WAVs without changing scoring or driving rules.

**Architecture:** Retain the global Three.js r128 classes and existing TrafficManager → Game → SoundEngine flow. Track completed passes in traffic simulation, arbitrate one spoken reward per frame in the game coordinator, and own decoded buffers, gains and cooldown inside SoundEngine. CSS owns a shared minimal visual vocabulary, responsive overlays, and accessible sound controls.

**Tech Stack:** Existing Three.js r128, browser Web Audio, plain JavaScript/CSS, Python HTTP server, Node built-in test runner. No new runtime dependencies.

## Approved design and measured constraints

Preserve low-poly vehicles, chai/Sting/Vimal identity, existing score amounts, horn, driving mechanics, camera modes, and session timer. Use charcoal/off-white and restrained amber, with vehicle identity colors intact. Simplify glass effects and typography, correct mobile overflow, and tune existing lighting/materials without adding bloom or post-processing.

Both source WAVs are complete 16-bit stereo 48 kHz PCM. charpata_gang is 2.28s, RMS -30.00 dBFS. shamshanghat is 4.33s, RMS -11.92 dBFS with 181 full-scale samples. Use conservative per-clip gains (initially 1.0 and 0.125), no extra reverb, then audition. User originals remain untouched.

## Ownership and work packages

### 1. Baseline and preparation
- [x] Inspect code, score paths and audio metadata.
- [x] Verify user approval and record implementation scope.
- [ ] Capture baseline menu and play view, viewport and renderer statistics.
- [ ] Commit this plan independently of generated graph artifacts.

### 2. Audio and gameplay integration
Owner: audio worker. Files: `js/audio.js`, `js/physics.js`, lifecycle/input/feedback portions of `js/main.js`, `tests/audio.test.js`, `tests/rewards.test.js`, `assets/audio/*.wav`.
- [ ] Write Node tests loading production scripts through `node:vm`, using minimal Web Audio/Three mocks only where browser dependencies require them. Assert one playback voice, 6s cooldown, gain difference, missing asset fallback, mute, stop/reset, pass crossing, recycled-vehicle reset and crash suppression. Run `node --test tests/audio.test.js tests/rewards.test.js` and observe missing-feature failures.
- [ ] Copy the two requested Downloads files into `assets/audio/charpata_gang_MEME_EXTRA_ECHO.wav` and `assets/audio/shamshanghat_MEME_EXTRA_ECHO.wav` using `cp` (do not rewrite samples).
- [ ] Add cached async fetch/decode guarded against errors; loading never blocks play. Start audio only after gesture/context unlock. Do not queue stale events.
- [ ] Add `playReward(kind)`, `stopReward()`, `resetRewards()`, `setMuted(muted)` and `setMemeMuted(muted)` to SoundEngine, adapting names only with matching tests and coordinator wiring. All synthesized output respects master mute. One voice and six-second start cooldown. Reset stops speech and clears session state. Failed WAV falls back to an existing synthesized cue.
- [ ] Detect forward completed overtakes once per encounter using relative world Z (ahead is negative), body clearance and active play. Reset after vehicle recycling. Never award new score just for a pass.
- [ ] Coordinator suppresses speech on crash frames and outside PLAYING. Priority: pickup/toll or new 5000-point milestone before overtake. Advance milestone watermark even when cooldown drops speech. Multiple awards in a frame collapse to one request.
- [ ] On pause/crash/menu/reset/hidden document clear speech; no stale playback after an async decode. Hook controls `#sound-toggle`, `#meme-toggle` using accessible pressed state. Do not edit index.html/CSS, which the graphics worker owns.
- [ ] Run all tests and JS syntax checks. Commit owned files only.

### 3. Cohesive graphics and UI
Owner: graphics worker. Files: `style.css`, `index.html`, `js/vehicles.js`, `js/scenery.js`, `js/road.js`, renderer/environment/particle portions of `js/main.js` only by coordinator patch.
- [ ] Capture current visible layout. Baseline browser screenshot already shows menu title and bottom controls clipped on a narrow viewport.
- [ ] Write layout/markup guard tests where useful and establish screenshot acceptance criteria before CSS edits.
- [ ] Define a compact charcoal/off-white/amber UI vocabulary, modest corners and shadows, tabular score digits, consistent type and space. Preserve all existing element IDs and controls.
- [ ] Correct overlay sizing/scroll behavior at 390×844, 844×390 and desktop; no clipped start/restart/resume controls. Shorten decorative headers/chips as necessary without removing meme personality. Use safe-area offsets and reduced-motion media query.
- [ ] Add accessible `#sound-toggle` and `#meme-toggle` buttons with clear labels and pressed states, styled as quiet controls not center-screen distractions.
- [ ] Preserve central road visibility and confine reward feedback. Avoid CSS append-only duplication: modify existing rules or add focused responsive overrides.
- [ ] Tune material contrast and roadside palette only where inspection shows need; no new textures or geometry budget inflation. Send desired main.js lighting changes to coordinator rather than editing shared code.
- [ ] Version local script/CSS URLs consistently. Keep existing Three.js r128 URL. Commit owned files only.

### 4. Integration and review
Owner: coordinator.
- [ ] Review spec compliance first, then quality. Inspect exact diffs and verify unchanged award formulas and session timer.
- [ ] Add `npm test` as `node --test tests/*.test.js`, and update README controls, voice mapping, local asset paths, HTTP launch requirement and known CDN dependency.
- [ ] Run `npm test`, `node --check` on all JS, and `git diff --check`.
- [ ] Through actual HTTP server verify both WAVs return bytes matching source, correct MIME, and decode in browser.
- [ ] Exercise real browser start, pass reward, score reward, voice concurrency/cooldown, mute, pause/resume, restart, crash and resize. Check console and JS state. Simulate missing asset in a separate instance or isolated test, not by deleting user files.
- [ ] Compare baseline/after screenshots and capture frame timing/draw-call data. Screenshot correctness is not evidence of subjective audio quality. Synthetic tests are not a substitute for browser verification.
- [ ] Fix discovered problems and rerun affected tests. Record any unavailable perceptual/performance checks honestly.

### 5. Delivery
- [ ] Commit final integration fixes and documentation, excluding prior `graphify-out/` artifacts unless explicitly regenerated and validated.
- [ ] Update graph after changes only with compatible validated tooling; mark stale if full update cannot be safely completed.
- [ ] Report delivered features, passing checks and limitations concisely.

# 🏎️ KHACHA COMPANY - HIGHWAY RUSH (खाचा कंपनी)
### An Atmospheric Indian Highway Arcade Racer built with Three.js

Inspired by the smooth procedural road mechanics of **Slow Roads** and the thrilling traffic weaving of **Traffic Racer**, set on the vibrant, scenic highways of India (NH-44).

---

## 🚦 How to Launch & Play

### One-click launch (recommended)

From a terminal in this directory:

```bash
./run.sh
```

You can also double-click `run.sh` in a Linux file manager configured to run shell files. The launcher prefers `uv` and uses `python3` automatically when uv is unavailable. It starts a local server at `http://localhost:8080/` (or the next free port) and opens the game in your default browser. The server only listens on `127.0.0.1`.

Optional environment variables: `KHACHA_PORT` (start port), `KHACHA_HOST` (bind address), `KHACHA_NO_BROWSER=1` (don't open a browser).

### Other launch options

```bash
# Same launcher through npm
npm start

# Direct Python fallback
python3 server.py

# Alternative static server
npx serve .
```

> Use an HTTP server for full meme voice playback. The WAV files are fetched from `assets/audio/`. Three.js r128 is vendored in `assets/vendor/`, so the game runs offline (only the Google Fonts are remote, with system-font fallbacks).

---

## 🎮 Controls

| Action | Keyboard | Gamepad (Xbox/PlayStation) |
| :--- | :--- | :--- |
| **Steer Left / Right** | `A` / `D` or `Left` / `Right` Arrow | Left Stick / D-Pad |
| **Accelerate** | `W` or `Up` Arrow | Right Trigger (RT) / `A` Button |
| **Brake / Reverse** | `S` or `Down` Arrow | Left Trigger (LT) / `B` Button |
| **Desi Musical Horn** | `Spacebar` or `H` | `X` Button / Right Bumper |
| **Khacha Nitro** (when meter is full) | `Shift` or `N` (or tap the meter) | `Y` Button |
| **Change Ride** | `1` (Auto) / `2` (Swift) / `3` (Truck) / `V` | Left Bumper (LB) |
| **Pause Game** | `P` or `Esc` (auto-pauses when you switch tabs) | Menu / Start Button |
| **Change Camera View** | `C` (Chase, Hood, High-Angle) | - |
| **Quick Restart** | `R` | - |

## 🔥 How to Score Big

- **Near-misses build your Flow Streak** (up to **x8**). Every near-miss multiplies its points by the streak, but you have **4.5 seconds** to chain the next one before the combo drops. Watch the bar under the streak pill.
- **Chain a x4+ near-miss** for a split-second **slow-mo** moment.
- **Khacha Meter** fills from near-misses, overtakes, power-ups, FASTag lanes and **slipstreaming** (tuck in right behind a vehicle for a small speed tow). When it glows, hit `Shift` for **KHACHA NITRO**: +45% top speed, and you **smash traffic and barricades out of the way** for bonus points instead of crashing. Toll booth pillars will still stop you.
- **🔀 Pick your route:** at 540 m, and every 480 m after, the highway splits in two. Gantry signs show where each carriageway goes. Once the concrete centre barrier starts you're committed to your side, and the road beyond reshapes itself into that route with its own scenery, sky and traffic:

  The road you *don't* pick doesn't vanish: it peels away from the other carriageway as a real 2-lane road (on an embankment, or up on piers if it's the flyover), and the traffic in that carriageway, plus some of that route's own buses, trucks and taxis, takes the exit and drives off down it.

  | Route | What changes | Traffic | Perk |
  | :--- | :--- | :--- | :--- |
  | 🏙 **City Flyover** | Road climbs 8 m onto pillars through a neon-night skyline | Light & fast (cars, taxis, bikes) | +15% top speed |
  | 🌾 **Village Road** | Turns off into curvy country road at golden hour, dhabas & dogs | Packed & slow (autos, bikes, trucks, buses) | Double power-ups |
  | ⛰ **Ghat Section** | Hairpins, steep hills, mossy cliffs and monsoon mist | Trucks & buses crawling | 2x near-miss points |
  | 🌊 **Konkan Coast** | Palm-lined beach road beside the sea, sunny noon | Bikes & taxis | Khacha Meter charges 2x |

- **Highway Orders:** every run deals three random missions (near-misses, overtakes, smashes, top speed, slipstream time, distance...). Each one completed is worth **+3 seconds and +1,000 points**.

## 🔊 Meme Voice Rewards

- **Completed clean overtake:** `charpata_gang_MEME_EXTRA_ECHO.wav`
- **Pickup, FASTag clearance, or each new 5,000-point milestone:** `shamshanghat_MEME_EXTRA_ECHO.wav`
- Voice rewards play one at a time with a short cooldown. They never play for ordinary distance-score ticks, crashes, attract mode, or stale events after pause/restart.
- Use the HUD **Sound** and **Memes** controls to mute all game audio or only the voice clips.

---

## 🚗 Playable Fleet & Meme Power-Ups

| Vehicle | Profile & Top Speed | Meme Power-Up | Boost Effect & In-Game Toast |
| :---: | :---: | :---: | :--- |
| **🛺 Auto-Rickshaw** | 95 KM/H (`26.5 m/s`) | **☕ Kadak Cutting Chai** | `+8s Tapri Chai Turbo` • Amber smoke trail |
| **🚗 Maruti Swift** | 118 KM/H (`33.0 m/s`) | **🔴⚡ Sting Energy Red** | `+5s Khacha Company Nitro` • Crimson red smoke trail |
| **🚛 Tata Freight Truck** | 82 KM/H (`22.5 m/s`) | **✌️ Golden Vimal Pouch** | `+10s Bolo Zubaan Kesari!` • Saffron gold smoke trail |

*Power-up items floating on the highway dynamically morph in real time to match whichever vehicle you are piloting!*

---

## 🎪 Key Features

1. **Realistic Reactive Traffic AI** with six vehicle types: Tata trucks (with jhalar tassels & mud flaps), Maruti Swifts, kaali-peeli Ambassador taxis, auto-rickshaws ("OK TATA" rear canvas), Royal Enfield Bullets and MSRTC "Lal Pari" buses. Brake lights glow when anyone slows down:
   * AI vehicles autonomously overtake slower vehicles in front of them.
   * Mischievous drivers cut off the player, squeeze passing corridors, or brake-check at high speeds.
   * Full 3D steering yaw into turns and natural road wobble.
2. **Tactical Musical Horn:**
   * Honking sends a visible shockwave; panic-swerves autos and slow trucks into outer lanes.
3. **Attract Mode (Screensaver):**
   * Automatically enters autopilot cruise with a cinematic orbiting camera when idle.
4. **40-Second Sprint:**
   * High-intensity time-attack format; power-ups and completed Highway Orders extend the clock (up to 99s).
5. **E-Challan / Trip Receipt:**
   * Scorecard with overtakes, smashes, best streak and Highway Orders, plus local high-score tracking.
6. **Cultural Authenticity:**
   * Hand-painted *"HORN OK PLEASE"* truck tailgates with *"⚡ KHACHA COMPANY EXPRESS ⚡"*.
   * Roadside Dhabas, Western Ghats silhouettes, yellow-and-white milestones, and peaceful Indie dogs lounging in the gravel shoulder.
   * Zero cows on the tarmac for high-speed uninterrupted flow.

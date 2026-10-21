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

You can also double-click `run.sh` in a Linux file manager configured to run shell files. The launcher prefers `uv` and uses `python3` automatically when uv is unavailable. It starts a local server at `http://localhost:8080/` and opens the game in your default browser.

### Other launch options

```bash
# Same launcher through npm
npm start

# Direct Python fallback
python3 server.py

# Alternative static server
npx serve .
```

> Use an HTTP server for full meme voice playback. The WAV files are fetched from `assets/audio/`, and Three.js still loads from its CDN.

---

## 🎮 Controls

| Action | Keyboard | Gamepad (Xbox/PlayStation) |
| :--- | :--- | :--- |
| **Steer Left / Right** | `A` / `D` or `Left` / `Right` Arrow | Left Stick / D-Pad |
| **Accelerate** | `W` or `Up` Arrow | Right Trigger (RT) / `A` Button |
| **Brake / Reverse** | `S` or `Down` Arrow | Left Trigger (LT) / `B` Button |
| **Desi Musical Horn** | `Spacebar` or `H` | `X` Button / Right Bumper |
| **Change Ride** | `1` (Auto) / `2` (Swift) / `3` (Truck) / `V` | Left Bumper (LB) |
| **Pause Game** | `P` or `Esc` | Menu / Start Button |
| **Change Camera View** | `C` (Chase, Hood, High-Angle) | - |
| **Quick Restart** | `R` | - |

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

1. **Realistic Reactive Traffic AI:**
   * AI vehicles autonomously overtake slower vehicles in front of them.
   * Mischievous drivers cut off the player, squeeze passing corridors, or brake-check at high speeds.
   * Full 3D steering yaw into turns and natural road wobble.
2. **Tactical Musical Horn:**
   * Honking sends a visible shockwave; panic-swerves autos and slow trucks into outer lanes.
3. **Attract Mode (Screensaver):**
   * Automatically enters autopilot cruise with a cinematic orbiting camera when idle.
4. **90-Second Event Rush:**
   * High-intensity time-attack format with clutch power-up extensions.
5. **E-Challan / Trip Receipt:**
   * Detailed performance scorecard at the end of each run with local high-score tracking.
6. **Cultural Authenticity:**
   * Hand-painted *"HORN OK PLEASE"* truck tailgates with *"⚡ KHACHA COMPANY EXPRESS ⚡"*.
   * Roadside Dhabas, Western Ghats silhouettes, yellow-and-white milestones, and peaceful Indie dogs lounging in the gravel shoulder.
   * Zero cows on the tarmac for high-speed uninterrupted flow.

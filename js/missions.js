// Per-run "Highway Orders": three random missions that reward time + points when completed.
// Pure logic (no Three.js / DOM) so it can be unit-tested in Node.

const MISSION_REWARD_SECONDS = 3;
const MISSION_REWARD_POINTS = 1000;

const MISSION_POOL = [
  { id: 'nearmiss', stat: 'nearMissCount', targets: [3, 5, 8], label: n => `Pull off ${n} near-misses` },
  { id: 'overtake', stat: 'overtakeCount', targets: [6, 10, 15], label: n => `Overtake ${n} vehicles` },
  { id: 'streak', stat: 'bestStreak', targets: [3, 4, 6], label: n => `Reach a x${n} flow streak` },
  { id: 'smash', stat: 'smashCount', targets: [1, 2, 4], label: n => `Nitro-smash ${n} ${n === 1 ? 'vehicle' : 'vehicles'}` },
  { id: 'pickup', stat: 'chaiCount', targets: [1, 2, 3], label: n => `Grab ${n} power-up${n === 1 ? '' : 's'}` },
  { id: 'slip', stat: 'slipstreamTime', targets: [3, 5, 8], label: n => `Slipstream for ${n}s total` },
  { id: 'toll', stat: 'tollCount', targets: [1], label: () => 'Clear a FASTag green lane' },
  { id: 'distance', stat: 'distanceCovered', targets: [500, 700, 900], label: n => `Drive ${(n / 1000).toFixed(1)} km` },
  // Speed targets are scaled to the ride's top speed (km/h) in pickMissions
  { id: 'speed', stat: 'topSpeedKmh', speedFactors: [0.95, 1.12, 1.3], label: n => `Hit ${n} km/h` }
];

class MissionTracker {
  constructor(rng = Math.random) {
    this.rng = rng;
    this.missions = [];
  }

  // Choose `count` distinct missions. Difficulty tier is random per mission.
  pick(maxKmh = 95, count = 3) {
    const pool = MISSION_POOL.slice();
    this.missions = [];
    while (this.missions.length < count && pool.length) {
      const idx = Math.floor(this.rng() * pool.length);
      const def = pool.splice(idx, 1)[0];
      let target;
      if (def.speedFactors) {
        const f = def.speedFactors[Math.floor(this.rng() * def.speedFactors.length)];
        target = Math.round((maxKmh * f) / 5) * 5;
      } else {
        target = def.targets[Math.floor(this.rng() * def.targets.length)];
      }
      this.missions.push({ id: def.id, stat: def.stat, target, label: def.label(target), progress: 0, done: false });
    }
    return this.missions;
  }

  // Feed the latest stat counters; returns the missions completed on this call.
  update(stats) {
    const completed = [];
    this.missions.forEach(m => {
      if (m.done) return;
      const value = Number(stats[m.stat]) || 0;
      m.progress = Math.min(value, m.target);
      if (value >= m.target) {
        m.done = true;
        completed.push(m);
      }
    });
    return completed;
  }

  get doneCount() {
    return this.missions.filter(m => m.done).length;
  }

  get allDone() {
    return this.missions.length > 0 && this.missions.every(m => m.done);
  }
}

if (typeof window !== 'undefined') {
  window.MissionTracker = MissionTracker;
  window.MISSION_REWARD_SECONDS = MISSION_REWARD_SECONDS;
  window.MISSION_REWARD_POINTS = MISSION_REWARD_POINTS;
}

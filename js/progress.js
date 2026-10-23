// Pure game-rule helpers for NH Odyssey: ranks, difficulty ramp, timer bar and
// per-vehicle progression. No DOM or Three.js access so it can be unit-tested.

const Progress = {
  SESSION_SECONDS: 40,
  MAX_TIMER: 99,
  STORAGE_KEY: 'khacha_progress',
  VEHICLES: ['auto', 'car', 'truck'],

  LANES: [-5.4, -1.8, 1.8, 5.4],

  // Steering feel per ride. maxLateral: sideways m/s at full lock; response: how quickly
  // sideways speed builds (higher = sharper); fullLockSpeed: speed (m/s) at which steering is
  // fully effective; highSpeedLoss: share of authority lost at top speed; roll/yaw: body lean.
  HANDLING: {
    auto: { maxLateral: 10.5, response: 9, fullLockSpeed: 9, highSpeedLoss: 0.1, roll: 0.07, yaw: 0.035 },
    car: { maxLateral: 11.5, response: 16, fullLockSpeed: 12, highSpeedLoss: 0, roll: 0.04, yaw: 0.03 },
    truck: { maxLateral: 6.5, response: 4.5, fullLockSpeed: 14, highSpeedLoss: 0.3, roll: 0.015, yaw: 0.02 }
  },

  // Any two of the four toll lanes are open; the other two are closed. Never fewer than two open,
  // so the plaza can always be cleared from wherever the player is.
  pickOpenTollLanes(rand = Math.random) {
    const pairs = [];
    for (let i = 0; i < this.LANES.length; i++) {
      for (let j = i + 1; j < this.LANES.length; j++) pairs.push([this.LANES[i], this.LANES[j]]);
    }
    return pairs[Math.min(Math.floor(rand() * pairs.length), pairs.length - 1)];
  },

  timerBarPercent(secondsLeft) {
    const pct = (secondsLeft / this.SESSION_SECONDS) * 100;
    return Math.max(0, Math.min(100, pct));
  },

  rankForScore(score) {
    if (score > 35000) return '👑 KHACHA COMPANY EMPEROR';
    if (score > 25000) return '⚡ DESI DRIFT RAJA';
    if (score > 15000) return '🏎️ EXPRESS CRUISER';
    if (score > 8000) return '🚗 PUNCTUAL COMMUTER';
    return '🚦 LEARNER LICENSE (NEED MORE KHACHA ENERGY)';
  },

  // Difficulty steps up every 250m, capped at level 6.
  // More traffic, drivers who harass the player sooner, and smaller time bonuses.
  difficultyForDistance(distanceM) {
    const level = Math.max(0, Math.min(6, Math.floor(distanceM / 250)));
    return {
      level,
      trafficCount: 14 + level,
      messScale: Math.max(0.5, 1 - level * 0.1),
      chaiBonusScale: Math.max(0.5, 1 - level * 0.08)
    };
  },

  scaledChaiBonus(baseSeconds, difficulty) {
    return Math.max(2, Math.round(baseSeconds * difficulty.chaiBonusScale));
  },

  nearMissLabel(streak, points) {
    return `NEAR MISS x${streak} +${points} PTS`;
  },

  // ---------------------------------------------------------------- leaderboard
  BOARD_KEY: 'khacha_leaderboard',
  BOARD_SHOW: 10,
  BOARD_KEEP_PER_RIDE: 15,
  NAME_MAX: 12,

  // Letters (any script), digits and a few separators only; never empty
  sanitizeName(raw) {
    const clean = String(raw == null ? '' : raw)
      .replace(/[^\p{L}\p{M}\p{N} ._'-]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, this.NAME_MAX)
      .trim()
      .toUpperCase();
    return clean || 'GUEST';
  },

  sortBoard(list) {
    return list.slice().sort((a, b) => b.score - a.score || a.at - b.at);
  },

  // Rank (1-based) a score would take today; ties rank behind existing equal scores
  rankFor(list, score, vehicle = 'all') {
    const pool = vehicle === 'all' ? list : list.filter(e => e.vehicle === vehicle);
    return 1 + pool.filter(e => e.score >= score).length;
  },

  qualifies(list, score, vehicle) {
    if (!(score > 0)) return false;
    return this.rankFor(list, score) <= this.BOARD_SHOW || this.rankFor(list, score, vehicle) <= this.BOARD_SHOW;
  },

  // Keep each ride's best few so a ride filter always has something to show
  pruneBoard(list) {
    const keep = new Set();
    this.VEHICLES.forEach(v => {
      this.sortBoard(list.filter(e => e.vehicle === v)).slice(0, this.BOARD_KEEP_PER_RIDE).forEach(e => keep.add(e));
    });
    return this.sortBoard(list.filter(e => keep.has(e)));
  },

  addEntry(list, { name, score, vehicle, distanceKm, at }) {
    const entry = {
      id: `${at}-${Math.random().toString(36).slice(2, 6)}`,
      name: this.sanitizeName(name),
      score: Math.floor(score),
      vehicle,
      distanceKm: Number(distanceKm) || 0,
      at
    };
    return { entry, list: this.pruneBoard(list.concat(entry)) };
  },

  boardView(list, filter = 'all') {
    const pool = filter === 'all' ? list : list.filter(e => e.vehicle === filter);
    return this.sortBoard(pool).slice(0, this.BOARD_SHOW);
  },

  loadBoard(storage) {
    try {
      const raw = JSON.parse(storage.getItem(this.BOARD_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return this.sortBoard(raw
        .filter(e => e && Number.isFinite(e.score) && e.score > 0 && this.VEHICLES.includes(e.vehicle))
        .map(e => ({
          id: String(e.id || `${e.at}-x`),
          name: this.sanitizeName(e.name),
          score: Math.floor(e.score),
          vehicle: e.vehicle,
          distanceKm: Number(e.distanceKm) || 0,
          at: Number(e.at) || 0
        })));
    } catch (e) {
      return [];
    }
  },

  saveBoard(storage, list) {
    try {
      storage.setItem(this.BOARD_KEY, JSON.stringify(list));
    } catch (e) {
      // storage blocked or full: the board just won't persist
    }
  },

  emptyProgress() {
    return { best: { auto: 0, car: 0, truck: 0 }, lastVehicle: 'auto' };
  },

  // Storage is injected (localStorage in the browser) and may throw or hold junk.
  load(storage) {
    const progress = this.emptyProgress();
    try {
      const raw = JSON.parse(storage.getItem(this.STORAGE_KEY) || '{}');
      this.VEHICLES.forEach(v => {
        const n = Number(raw.best && raw.best[v]);
        if (Number.isFinite(n) && n > 0) progress.best[v] = Math.floor(n);
      });
      if (this.VEHICLES.includes(raw.lastVehicle)) progress.lastVehicle = raw.lastVehicle;
    } catch (e) {
      // corrupted or unavailable storage: fall back to defaults
    }
    return progress;
  },

  save(storage, progress) {
    try {
      storage.setItem(this.STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      // storage full or blocked: progression just won't persist
    }
  },

  recordRun(progress, vehicle, score) {
    const previous = progress.best[vehicle] || 0;
    const isNewBest = score > previous;
    if (isNewBest) progress.best[vehicle] = score;
    return { isNewBest, previousBest: previous };
  }
};

window.Progress = Progress;

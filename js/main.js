// Master Game Coordinator for NH Odyssey (Desi Highway Racer)
// Manages Three.js scene, lighting, camera rigs, input, and game state transitions

class Game {
  constructor() {
    this.container = document.getElementById('game-container');
    this.state = 'ATTRACT'; // ATTRACT | PLAYING | CRASH | GAMEOVER
    this.sessionTimer = 40; // 40-second high-intensity sprint
    this.crashTimer = 0;
    this.autoResetTimer = 12;
    this.cameraMode = 0; // 0: Smooth Chase, 1: Close Hood, 2: Far Cinematic
    this.highScore = parseInt(localStorage.getItem('khacha_best') || localStorage.getItem('nh_odyssey_best') || '0', 10);
    this.lastRewardMilestone = 0;
    this.progress = window.Progress.load(localStorage);
    this.board = window.Progress.loadBoard(localStorage);
    this.boardOpen = false;
    this.boardFilter = 'all';
    this.pendingEntry = null;   // finished run waiting for a name
    this.lastEntryId = null;    // highlighted on the board
    this.shake = 0;
    this.gamepadWasActive = false;

    // Input State
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      forward: false,
      backward: false,
      horn: false
    };

    // DOM Elements
    this.dom = {
      hud: document.getElementById('hud'),
      hudDistance: document.getElementById('hud-distance'),
      hudTimer: document.getElementById('hud-timer'),
      hudTimerBar: document.getElementById('hud-timer-bar'),
      hudScore: document.getElementById('hud-score'),
      hudSpeed: document.getElementById('hud-speed'),
      hudStreakPill: document.getElementById('hud-streak-pill'),
      speedoFill: document.getElementById('speedo-fill'),
      hornBtn: document.getElementById('horn-btn'),
      flowToast: document.getElementById('flow-toast'),
      attractOverlay: document.getElementById('attract-overlay'),
      startBtn: document.getElementById('start-btn'),
      gameoverOverlay: document.getElementById('gameover-overlay'),
      restartBtn: document.getElementById('restart-btn'),
      finalDistance: document.getElementById('final-distance'),
      finalSpeed: document.getElementById('final-speed'),
      finalNearmiss: document.getElementById('final-nearmiss'),
      finalHorns: document.getElementById('final-horns'),
      finalScore: document.getElementById('final-score'),
      finalBest: document.getElementById('final-best'),
      finalVehicleLabel: document.getElementById('final-vehicle-label'),
      finalVehicleBest: document.getElementById('final-vehicle-best'),
      newBestBadge: document.getElementById('new-best-badge'),
      vehicleBestHint: document.getElementById('vehicle-best-hint'),
      flowPoints: document.querySelector('#flow-toast .flow-points'),
      boardOverlay: document.getElementById('leaderboard-overlay'),
      boardList: document.getElementById('board-list'),
      boardEmpty: document.getElementById('board-empty'),
      boardTabs: document.querySelectorAll('.board-tab'),
      boardClear: document.getElementById('board-clear'),
      boardClose: document.getElementById('board-close'),
      nameEntry: document.getElementById('name-entry'),
      nameInput: document.getElementById('name-input'),
      boardNote: document.getElementById('board-note'),
      driverRank: document.getElementById('driver-rank'),
      hudGear: document.getElementById('hud-gear'),
      chaiToast: document.getElementById('chai-toast'),
      vehicleToast: document.getElementById('vehicle-toast'),
      vehicleToastText: document.getElementById('vehicle-toast-text'),
      vSelector: document.getElementById('v-selector'),
      autoResetTimer: document.getElementById('auto-reset-timer'),
      audioPrompt: document.getElementById('audio-prompt'),
      pauseOverlay: document.getElementById('pause-overlay'),
      pauseBtn: document.getElementById('pause-btn'),
      resumeBtn: document.getElementById('resume-btn'),
      restartPauseBtn: document.getElementById('restart-pause-btn'),
      hudBiomeBadge: document.getElementById('hud-biome-badge'),
      fastagToast: document.getElementById('fastag-toast'),
      soundToggle: document.getElementById('sound-toggle'),
      memeToggle: document.getElementById('meme-toggle')
    };

    this.selectedVehicle = this.progress.lastVehicle;

    this.initThree();
    this.initEnvironment();
    this.initParticles();
    this.initManagers();
    this.initEvents();
    this.syncVehicleButtons();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);

    // 2. Scene with Golden Hour Atmosphere
    this.scene = new THREE.Scene();
    const fogColor = new THREE.Color(0xd99b66); // Warm golden-amber sunset fog
    this.scene.background = fogColor;
    this.scene.fog = new THREE.FogExp2(fogColor, 0.0035);

    // 3. Camera
    this.camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.5, 800);
    this.camera.position.set(0, 5, 12);

    this.clock = new THREE.Clock();
  }

  initEnvironment() {
    // Warm Indian Twilight / Golden Hour Lighting
    this.hemiLight = new THREE.HemisphereLight(0xffeedd, 0x8a6344, 0.85);
    this.hemiLight.position.set(0, 100, 0);
    this.scene.add(this.hemiLight);

    // Low Golden Sun
    this.sunLight = new THREE.DirectionalLight(0xffbe76, 1.4);
    this.sunLight.position.set(120, 60, -180);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 400;
    const d = 50;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    // 4. Vehicle Headlights (Dual Forward Beams for Night Atmosphere)
    this.headlightTarget = new THREE.Object3D();
    this.scene.add(this.headlightTarget);

    this.headlightL = new THREE.SpotLight(0xfffaed, 1.2, 75, Math.PI / 6.5, 0.45, 1.2);
    this.headlightL.castShadow = false;
    this.headlightR = new THREE.SpotLight(0xfffaed, 1.2, 75, Math.PI / 6.5, 0.45, 1.2);
    this.headlightR.castShadow = false;
    this.scene.add(this.headlightL, this.headlightR);

    // 5. Vehicle Neon Underglow (Maruti Swift Electric Cyan / Truck Amber / Auto Emerald)
    this.underglowLight = new THREE.PointLight(0x00f0ff, 0.6, 6.0, 1.6);
    this.scene.add(this.underglowLight);

    // Distant Mountain Ridgelines along Horizon (Western Ghats silhouette)
    // Two ridgelines of faceted, jittered peaks; the far one is hazier (colour set in updateEnvironment)
    this.mountainGroup = new THREE.Group();
    this.mountainMatNear = new THREE.MeshPhongMaterial({ color: 0x935c3c, flatShading: true, specular: 0x000000 });
    this.mountainMatFar = new THREE.MeshPhongMaterial({ color: 0x8a6a58, flatShading: true, specular: 0x000000 });
    const addPeak = (mat, h, rad, x, z) => {
      const geo = new THREE.ConeGeometry(rad, h, 7, 3);
      const p = geo.attributes.position;
      for (let v = 0; v < p.count; v++) {
        if (p.getY(v) > h * 0.49) continue; // keep the apex sharp
        p.setX(v, p.getX(v) + (Math.random() - 0.5) * rad * 0.28);
        p.setZ(v, p.getZ(v) + (Math.random() - 0.5) * rad * 0.28);
        p.setY(v, p.getY(v) + (Math.random() - 0.5) * h * 0.08);
      }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, h * 0.45, z);
      this.mountainGroup.add(mesh);
    };
    for (let m = 0; m < 26; m++) {
      const side = (m % 2 === 0 ? 1 : -1);
      addPeak(this.mountainMatNear, 40 + Math.random() * 55, 45 + Math.random() * 40, side * (210 + Math.random() * 70), -m * 45);
    }
    for (let m = 0; m < 14; m++) {
      const side = (m % 2 === 0 ? -1 : 1);
      addPeak(this.mountainMatFar, 80 + Math.random() * 70, 70 + Math.random() * 50, side * (330 + Math.random() * 90), -m * 80 - 20);
    }
    this.scene.add(this.mountainGroup);

    // Sun / moon, clouds and stars that follow the camera
    this.sky = window.detailBuilder.createSky();
    this.scene.add(this.sky.group);
    this.baseMountainNear = new THREE.Color(0x935c3c);
    this.baseMountainFar = new THREE.Color(0x8a6a58);
  }

  // Particle System for 2-stroke exhaust smoke & boost sparks
  initParticles() {
    this.particles = [];
    const geo = new THREE.SphereGeometry(0.18, 6, 6);
    for (let i = 0; i < 35; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xd1d5db, transparent: true, opacity: 0.5 });
      const p = new THREE.Mesh(geo, mat);
      p.visible = false;
      this.scene.add(p);
      this.particles.push({ mesh: p, life: 0, maxLife: 0.6, vx: 0, vy: 0, vz: 0 });
    }
  }

  emitSmoke(pos, isBoost = false) {
    const p = this.particles.find(pt => pt.life <= 0);
    if (!p) return;
    p.mesh.position.set(pos.x + (Math.random() * 0.2 - 0.1), pos.y + 0.35, pos.z + 1.4);
    p.mesh.scale.setScalar(isBoost ? 1.8 : 0.85);

    let boostColor = 0xff0038; // Default Swift: Sting Red
    if (this.selectedVehicle === 'truck') {
      boostColor = 0xf59e0b; // Truck: Kesari Gold Vimal Power
    } else if (this.selectedVehicle === 'auto') {
      boostColor = 0xfbbf24; // Auto: Kadak Cutting Chai Amber
    }

    p.mesh.material.color.setHex(isBoost ? boostColor : 0xd1d5db);
    p.mesh.material.opacity = isBoost ? 0.95 : 0.45;
    p.mesh.visible = true;
    p.life = 0.5;
    p.maxLife = 0.5;
    p.vx = (Math.random() - 0.5) * 0.4;
    p.vy = 0.35 + Math.random() * 0.4;
    p.vz = 1.2 + Math.random() * 0.6;
  }

  updateParticles(delta) {
    this.particles.forEach(p => {
      if (p.life > 0) {
        p.life -= delta;
        p.mesh.position.x += p.vx * delta;
        p.mesh.position.y += p.vy * delta;
        p.mesh.position.z += p.vz * delta;
        p.mesh.scale.multiplyScalar(1.0 + delta * 2.2);
        p.mesh.material.opacity = (p.life / p.maxLife) * 0.45;
        if (p.life <= 0) p.mesh.visible = false;
      }
    });
  }

  initManagers() {
    this.road = new window.RoadManager(this.scene);
    this.road.init(0);

    this.traffic = new window.TrafficManager(this.scene, this.road);
    this.traffic.initPlayer(this.selectedVehicle, 0);
  }

  initEvents() {
    // Keyboard Events
    // Typing a name must not drive the car, pick a ride or restart the game
    const typing = (e) => {
      const active = document.activeElement;
      return (active && active.tagName === 'INPUT') || (e.target && e.target.tagName === 'INPUT');
    };
    window.addEventListener('keydown', (e) => {
      if (typing(e) || e.repeat) return;
      this.handleInput(e.code, true);
    });

    window.addEventListener('keyup', (e) => {
      if (typing(e)) return;
      this.handleInput(e.code, false);
    });

    this.initLeaderboardEvents();

    // Vehicle Selector click handling
    const vButtons = document.querySelectorAll('.v-btn');
    vButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.getAttribute('data-v');
        if (type) {
          this.selectVehicle(type);
        }
      });
    });

    // Touch / Click to Start
    this.dom.startBtn.addEventListener('click', () => this.startGame());
    this.dom.restartBtn.addEventListener('click', () => this.startGame());

    this.dom.hornBtn.addEventListener('mousedown', () => this.triggerHorn());
    this.dom.hornBtn.addEventListener('mouseup', () => this.releaseHorn());
    this.dom.hornBtn.addEventListener('mouseleave', () => this.releaseHorn());
    this.dom.hornBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.triggerHorn();
    });
    this.dom.hornBtn.addEventListener('touchend', () => this.releaseHorn());
    this.dom.hornBtn.addEventListener('touchcancel', () => this.releaseHorn());

    // Pause / Resume Handlers
    if (this.dom.pauseBtn) {
      this.dom.pauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePause();
      });
    }

    if (this.dom.resumeBtn) {
      this.dom.resumeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resumeGame();
      });
    }

    if (this.dom.restartPauseBtn) {
      this.dom.restartPauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dom.pauseOverlay.classList.add('hidden');
        this.startGame();
      });
    }

    if (this.dom.soundToggle) {
      this.dom.soundToggle.addEventListener('click', () => {
        const muted = this.dom.soundToggle.getAttribute('aria-pressed') !== 'true';
        window.soundEngine.setMuted(muted);
        this.dom.soundToggle.setAttribute('aria-pressed', String(muted));
        this.dom.soundToggle.textContent = muted ? 'Sound off' : 'Sound on';
      });
    }
    if (this.dom.memeToggle) {
      this.dom.memeToggle.addEventListener('click', () => {
        const muted = this.dom.memeToggle.getAttribute('aria-pressed') !== 'true';
        window.soundEngine.setMemeMuted(muted);
        this.dom.memeToggle.setAttribute('aria-pressed', String(muted));
        this.dom.memeToggle.textContent = muted ? 'Memes off' : 'Memes on';
      });
    }

    const testMemes = document.getElementById('test-memes');
    const testStatus = document.getElementById('audio-test-status');
    let previewKind = 'overtake';
    testMemes.addEventListener('click', async () => {
      testMemes.disabled = true;
      testStatus.textContent = 'Loading meme audio…';
      try {
        const pending = window.soundEngine.previewReward(previewKind);
        this.dom.soundToggle.setAttribute('aria-pressed', 'false');
        this.dom.soundToggle.textContent = 'Sound on';
        this.dom.memeToggle.setAttribute('aria-pressed', 'false');
        this.dom.memeToggle.textContent = 'Memes on';
        const played = await pending;
        testStatus.textContent = played
          ? `Playing ${previewKind === 'overtake' ? 'Charpata Gang' : 'Shamshanghat'}. Click again to test the other clip.`
          : 'Audio could not start. Check browser sound permissions and try again.';
        if (played) {
          previewKind = previewKind === 'overtake' ? 'points' : 'overtake';
          this.dom.audioPrompt?.classList.add('hidden');
        }
      } catch (error) {
        console.warn('Meme sound check failed', error);
        testStatus.textContent = 'Audio could not start. Check browser sound permissions and try again.';
      } finally {
        testMemes.disabled = false;
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        window.soundEngine.stopReward();
        this.pauseGame();
      }
    });
    window.addEventListener('blur', () => this.pauseGame());

    // Keep retrying on user gestures if the browser initially blocks audio.
    const activateAudio = () => {
      const sound = window.soundEngine;
      sound.ensureContext();
      if (!sound.ctx) return;
      const updatePrompt = () => {
        const ready = sound.ctx.state === 'running';
        this.dom.audioPrompt?.classList.toggle('hidden', ready);
        if (ready) {
          sound.loadReward('overtake');
          sound.loadReward('points');
        }
      };
      sound.ctx.onstatechange = updatePrompt;
      updatePrompt();
    };
    window.addEventListener('pointerdown', activateAudio, { capture: true });
    window.addEventListener('click', activateAudio, { capture: true });
    window.addEventListener('keydown', activateAudio, { capture: true });

    // Window Resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // ---------------------------------------------------------------- leaderboard
  initLeaderboardEvents() {
    document.querySelectorAll('.js-open-board').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.currentTarget.blur(); // keep Space/Enter from re-activating the button later
        this.openBoard();
      });
    });
    this.dom.boardClose.addEventListener('click', (e) => { e.currentTarget.blur(); this.closeBoard(); });
    this.dom.boardTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.setBoardFilter(tab.getAttribute('data-filter'));
        e.currentTarget.blur();
      });
    });

    // Clearing needs a second click within 3 seconds so it can't happen by accident
    this.dom.boardClear.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      if (!btn.classList.contains('armed')) {
        btn.classList.add('armed');
        btn.textContent = 'SURE? CLICK AGAIN';
        clearTimeout(this.clearTimeout);
        this.clearTimeout = setTimeout(() => this.disarmClear(), 3000);
        return;
      }
      this.disarmClear();
      this.board = [];
      this.lastEntryId = null;
      window.Progress.saveBoard(localStorage, this.board);
      this.renderBoard();
      btn.blur();
    });

    this.dom.nameEntry.addEventListener('submit', (e) => {
      e.preventDefault();
      this.commitPendingEntry();
    });
  }

  disarmClear() {
    clearTimeout(this.clearTimeout);
    this.dom.boardClear.classList.remove('armed');
    this.dom.boardClear.textContent = 'CLEAR BOARD';
  }

  openBoard() {
    this.boardOpen = true;
    this.renderBoard();
    this.dom.boardOverlay.classList.remove('hidden');
  }

  closeBoard() {
    this.boardOpen = false;
    this.disarmClear();
    this.dom.boardOverlay.classList.add('hidden');
  }

  setBoardFilter(filter) {
    this.boardFilter = filter;
    this.renderBoard();
  }

  cycleBoardFilter(step) {
    const filters = ['all', ...window.Progress.VEHICLES];
    const next = (filters.indexOf(this.boardFilter) + step + filters.length) % filters.length;
    this.setBoardFilter(filters[next]);
  }

  renderBoard() {
    const icons = { auto: '🛺', car: '🚗', truck: '🚛' };
    this.dom.boardTabs.forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-filter') === this.boardFilter);
    });
    const rows = window.Progress.boardView(this.board, this.boardFilter);
    this.dom.boardEmpty.classList.toggle('hidden', rows.length > 0);
    this.dom.boardList.replaceChildren();
    rows.forEach((entry, i) => {
      const li = document.createElement('li');
      li.className = 'board-row' + (entry.id === this.lastEntryId ? ' mine' : '');
      const cell = (cls, text) => {
        const span = document.createElement('span');
        span.className = cls;
        span.textContent = text; // textContent only: names are user input
        li.appendChild(span);
      };
      cell('board-rank', String(i + 1));
      cell('board-name', entry.name);
      cell('board-ride', icons[entry.vehicle] || '');
      cell('board-dist', `${entry.distanceKm.toFixed(2)} KM`);
      cell('board-score', entry.score.toLocaleString());
      this.dom.boardList.appendChild(li);
    });
  }

  // Ask for a name when the run reaches the board; otherwise hint at what it takes to get on
  prepareNameEntry(finalScore) {
    const P = window.Progress;
    const entry = {
      score: finalScore,
      vehicle: this.selectedVehicle,
      distanceKm: +(this.traffic.distanceCovered / 1000).toFixed(2),
      at: Date.now()
    };
    this.dom.nameInput.blur();
    this.dom.boardNote.classList.add('hidden');
    if (P.qualifies(this.board, finalScore, this.selectedVehicle)) {
      this.pendingEntry = entry;
      const rank = P.rankFor(this.board, finalScore);
      this.dom.nameEntry.querySelector('label').textContent = rank <= P.BOARD_SHOW
        ? `YOU MADE THE LEADERBOARD (#${rank})! ENTER YOUR NAME`
        : 'TOP 10 FOR THIS RIDE! ENTER YOUR NAME';
      this.dom.nameInput.value = '';
      this.dom.nameEntry.classList.remove('hidden');
      // Delay focus so a still-held steering key doesn't type into the box
      clearTimeout(this.nameFocusTimeout);
      this.nameFocusTimeout = setTimeout(() => {
        if (this.pendingEntry) this.dom.nameInput.focus();
      }, 1500);
    } else {
      this.pendingEntry = null;
      this.dom.nameEntry.classList.add('hidden');
      if (finalScore > 0 && this.board.length >= P.BOARD_SHOW) {
        const tenth = P.boardView(this.board, 'all')[P.BOARD_SHOW - 1];
        this.dom.boardNote.textContent = `BEAT ${tenth.score.toLocaleString()} TO ENTER THE TOP ${P.BOARD_SHOW}`;
        this.dom.boardNote.classList.remove('hidden');
      }
    }
  }

  // Saves the waiting run under the typed name (or GUEST if nobody typed one)
  commitPendingEntry() {
    if (!this.pendingEntry) return;
    const P = window.Progress;
    const result = P.addEntry(this.board, { ...this.pendingEntry, name: this.dom.nameInput.value });
    this.pendingEntry = null;
    clearTimeout(this.nameFocusTimeout);
    this.board = result.list;
    this.lastEntryId = result.entry.id;
    P.saveBoard(localStorage, this.board);
    const rank = this.board.findIndex(e => e.id === result.entry.id) + 1;
    this.dom.nameInput.blur();
    this.dom.nameEntry.classList.add('hidden');
    this.dom.boardNote.textContent = `SAVED AS ${result.entry.name} • OVERALL RANK #${rank}`;
    this.dom.boardNote.classList.remove('hidden');
    if (this.boardOpen) this.renderBoard();
  }

  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.input.horn = false;
    this.releaseHorn();
    window.soundEngine.stopEngine();
    window.soundEngine.stopReward();
    this.dom.pauseOverlay.classList.remove('hidden');
    // Sync buttons on pause screen
    const vButtons = document.querySelectorAll('.v-btn');
    vButtons.forEach(btn => {
      if (btn.getAttribute('data-v') === this.selectedVehicle) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.dom.pauseOverlay.classList.add('hidden');
    this.clock.getDelta(); // flush any accumulated delta so no physics jump!
    window.soundEngine.startEngine();
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.pauseGame();
    } else if (this.state === 'PAUSED') {
      this.resumeGame();
    }
  }

  // Highlight the selected ride on every screen and show its personal best
  syncVehicleButtons() {
    document.querySelectorAll('.v-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-v') === this.selectedVehicle);
    });
    if (this.dom.vehicleBestHint) {
      const best = this.progress.best[this.selectedVehicle] || 0;
      this.dom.vehicleBestHint.innerText = `RIDE BEST: ${best.toLocaleString()}`;
    }
  }

  selectVehicle(type) {
    if (!window.Progress.VEHICLES.includes(type)) return;
    this.selectedVehicle = type;
    this.progress.lastVehicle = type;
    window.Progress.save(localStorage, this.progress);
    this.syncVehicleButtons();

    // Switch 3D vehicle model in real time (smooth swap)
    if (this.traffic) {
      this.traffic.switchPlayerVehicle(type);
    }

    this.showVehicleToast(type);
  }

  cycleVehicle() {
    const list = ['auto', 'car', 'truck'];
    const nextIdx = (list.indexOf(this.selectedVehicle) + 1) % list.length;
    this.selectVehicle(list[nextIdx]);
  }

  showVehicleToast(type) {
    if (!this.dom.vehicleToast || !this.dom.vehicleToastText) return;
    const names = {
      auto: '🛺 AUTO-RICKSHAW SELECTED (95 KM/H)',
      car: '🚗 MARUTI SWIFT SELECTED (118 KM/H)',
      truck: '🚛 TATA FREIGHT TRUCK SELECTED (82 KM/H)'
    };
    this.dom.vehicleToastText.innerText = names[type] || 'VEHICLE SELECTED';
    this.dom.vehicleToast.classList.add('active');
    clearTimeout(this.vehicleToastTimeout);
    this.vehicleToastTimeout = setTimeout(() => {
      this.dom.vehicleToast.classList.remove('active');
    }, 1400);
  }

  handleInput(code, isPressed) {
    // Releasing the horn must work in any state (e.g. after pausing while it was held)
    if (!isPressed && (code === 'Space' || code === 'KeyH')) {
      this.input.horn = false;
      this.releaseHorn();
    }

    // Leaderboard: L opens it from the menus, and while it is open it owns the keyboard
    if (this.boardOpen) {
      if (isPressed) {
        if (code === 'Escape' || code === 'KeyL' || code === 'Enter') this.closeBoard();
        else if (code === 'ArrowLeft') this.cycleBoardFilter(-1);
        else if (code === 'ArrowRight') this.cycleBoardFilter(1);
      }
      return;
    }
    if (isPressed && code === 'KeyL' && ['ATTRACT', 'PAUSED', 'GAMEOVER'].includes(this.state)) {
      this.openBoard();
      return;
    }

    // 1. Vehicle selection hotkeys work anytime (Attract, Playing, Paused, or Game Over)
    if (isPressed) {
      if (code === 'Digit1' || code === 'Numpad1') {
        this.selectVehicle('auto');
        return;
      }
      if (code === 'Digit2' || code === 'Numpad2') {
        this.selectVehicle('car');
        return;
      }
      if (code === 'Digit3' || code === 'Numpad3') {
        this.selectVehicle('truck');
        return;
      }
      if (code === 'KeyV') {
        this.cycleVehicle();
        return;
      }
    }

    // 2. Pause toggle hotkey (KeyP or Escape)
    if (isPressed && (code === 'KeyP' || code === 'Escape')) {
      this.togglePause();
      return;
    }

    // 3. If in Paused state, Enter/Space resumes, R restarts
    if (this.state === 'PAUSED' && isPressed) {
      if (code === 'Space' || code === 'Enter') {
        this.resumeGame();
        return;
      }
      if (code === 'KeyR') {
        this.dom.pauseOverlay.classList.add('hidden');
        this.startGame();
        return;
      }
      return;
    }

    // 4. In Attract mode, start game with Space, Enter, or forward keys
    if (this.state === 'ATTRACT' && isPressed) {
      if (code === 'Space' || code === 'Enter' || code === 'KeyW' || code === 'ArrowUp') {
        this.startGame();
      }
      return;
    }

    // 5. In Game Over mode, Space or Enter restarts
    if (this.state === 'GAMEOVER' && isPressed && (code === 'Space' || code === 'Enter')) {
      this.startGame();
      return;
    }

    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        this.input.up = isPressed;
        this.input.forward = isPressed;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.input.down = isPressed;
        this.input.backward = isPressed;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.input.left = isPressed;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.input.right = isPressed;
        break;
      case 'Space':
      case 'KeyH':
        if (isPressed && !this.input.horn) {
          this.triggerHorn();
        }
        this.input.horn = isPressed;
        break;
      case 'KeyC':
        if (isPressed) {
          this.cameraMode = (this.cameraMode + 1) % 3;
        }
        break;
      case 'KeyR':
        if (isPressed && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
          this.dom.pauseOverlay.classList.add('hidden');
          this.startGame();
        }
        break;
    }
  }

  // Poll Gamepad (Xbox / PlayStation controller support)
  pollGamepad() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (!gamepads || !gamepads[0]) return;
    const gp = gamepads[0];

    // Gamepad Menu/Start button (button 9) for Pause toggle
    if (gp.buttons[9]?.pressed && !this.menuBtnPressed) {
      this.togglePause();
      this.menuBtnPressed = true;
    } else if (!gp.buttons[9]?.pressed) {
      this.menuBtnPressed = false;
    }

    // If Paused, A button resumes
    if (this.state === 'PAUSED') {
      if (gp.buttons[0]?.pressed) {
        this.resumeGame();
      }
      return;
    }

    // Trigger button or A button to start from attract
    if (this.state === 'ATTRACT' && (gp.buttons[0]?.pressed || gp.buttons[9]?.pressed)) {
      this.startGame();
      return;
    }

    // Left Stick / D-pad
    const stickX = gp.axes[0] || 0;
    const left = stickX < -0.2 || !!gp.buttons[14]?.pressed;
    const right = stickX > 0.2 || !!gp.buttons[15]?.pressed;

    // Trigger / Gas (Right Trigger or A button)
    const rt = gp.buttons[7]?.value || (gp.buttons[0]?.pressed ? 1 : 0);
    const up = rt > 0.1 || !!gp.buttons[12]?.pressed;

    // Brake (Left Trigger or B button)
    const lt = gp.buttons[6]?.value || (gp.buttons[1]?.pressed ? 1 : 0);
    const down = lt > 0.1 || !!gp.buttons[13]?.pressed;

    // Only write driving input while the pad is in use (and once more to release),
    // so an idle connected controller doesn't cancel keyboard input.
    const gamepadActive = left || right || up || down;
    if (gamepadActive || this.gamepadWasActive) {
      this.input.left = left;
      this.input.right = right;
      this.input.up = up;
      this.input.down = down;
    }
    this.gamepadWasActive = gamepadActive;

    // Horn (X button or RB)
    if ((gp.buttons[2]?.pressed || gp.buttons[5]?.pressed) && !this.input.horn) {
      this.triggerHorn();
      this.input.horn = true;
    } else if (!gp.buttons[2]?.pressed && !gp.buttons[5]?.pressed) {
      if (this.input.horn) this.releaseHorn();
      this.input.horn = false;
    }

    // Cycle vehicle with LB (button 4)
    if (gp.buttons[4]?.pressed && !this.bumperPressed) {
      this.cycleVehicle();
      this.bumperPressed = true;
    } else if (!gp.buttons[4]?.pressed) {
      this.bumperPressed = false;
    }
  }

  triggerHorn() {
    this.traffic.triggerHorn();
    this.dom.hornBtn.classList.add('active');
  }

  releaseHorn() {
    window.soundEngine.stopHorn();
    this.dom.hornBtn.classList.remove('active');
  }

  playRewardFeedback(stats) {
    if (this.state !== 'PLAYING' || stats.crashed) return;
    const milestone = Math.floor(stats.score / 5000) * 5000;
    const majorReward = stats.chaiPickup || stats.fastagCleared || milestone > this.lastRewardMilestone;
    if (milestone > this.lastRewardMilestone) this.lastRewardMilestone = milestone;
    if (majorReward) {
      window.soundEngine.playReward('points');
    } else if (stats.overtake) {
      window.soundEngine.playReward('overtake');
    }
  }

  startGame() {
    this.commitPendingEntry();
    window.soundEngine.ensureContext();
    window.soundEngine.resetRewards();
    window.soundEngine.startEngine();

    this.state = 'PLAYING';
    this.sessionTimer = 40;
    this.crashTimer = 0;
    this.lastRewardMilestone = 0;

    // Reset road chunks cleanly to starting line (z = 0)
    this.road.reset(0);

    // Reset traffic & player to z = 0 with 2.5s invulnerability grace period
    this.traffic.reset(0, this.selectedVehicle);

    // Reset camera position directly behind fresh player
    if (this.traffic.player) {
      const camCfg = this.getCameraConfig(this.selectedVehicle);
      this.camera.position.set(
        this.traffic.player.position.x,
        this.traffic.player.position.y + camCfg.chaseHeight,
        this.traffic.player.position.z + camCfg.chaseDist
      );
    }
    this.camera.fov = 56;
    this.camera.updateProjectionMatrix();

    // Clear active particles
    this.particles.forEach(p => { p.life = 0; p.mesh.visible = false; });

    // Reset UI
    this.dom.attractOverlay.classList.add('hidden');
    this.dom.gameoverOverlay.classList.add('hidden');
    this.dom.pauseOverlay.classList.add('hidden');
    this.dom.hud.classList.remove('hidden');
  }

  triggerCrash() {
    this.state = 'CRASH';
    this.crashTimer = 1.8;
    this.shake = 1.0;
    this.input.horn = false;
    this.releaseHorn();
    window.soundEngine.playCrash();
    window.soundEngine.stopEngine();
    window.soundEngine.stopReward();
  }

  endSession() {
    this.state = 'GAMEOVER';
    this.autoResetTimer = 12;
    window.soundEngine.stopEngine();
    window.soundEngine.stopReward();

    // Check High Score
    const finalScore = this.traffic.score;
    if (finalScore > this.highScore) {
      this.highScore = finalScore;
      localStorage.setItem('khacha_best', this.highScore.toString());
    }

    // Populate Challan
    this.dom.finalDistance.innerText = (this.traffic.distanceCovered / 1000).toFixed(2) + ' KM';
    this.dom.finalSpeed.innerText = this.traffic.topSpeedKmh + ' KM/H';
    this.dom.finalNearmiss.innerText = this.traffic.nearMissCount;
    this.dom.finalHorns.innerText = this.traffic.hornCount;
    this.dom.finalScore.innerText = finalScore.toLocaleString();
    this.dom.finalBest.innerText = this.highScore.toLocaleString();

    this.dom.driverRank.innerText = 'RANK: ' + window.Progress.rankForScore(finalScore);

    // Per-vehicle progression
    const run = window.Progress.recordRun(this.progress, this.selectedVehicle, finalScore);
    window.Progress.save(localStorage, this.progress);
    const vehicleNames = { auto: 'AUTO', car: 'SWIFT', truck: 'TRUCK' };
    this.dom.finalVehicleLabel.innerText = `${vehicleNames[this.selectedVehicle]} BEST`;
    this.dom.finalVehicleBest.innerText = this.progress.best[this.selectedVehicle].toLocaleString();
    this.dom.newBestBadge.classList.toggle('hidden', !(run.isNewBest && finalScore > 0));

    this.syncVehicleButtons();
    this.prepareNameEntry(finalScore);

    this.dom.hud.classList.add('hidden');
    this.dom.gameoverOverlay.classList.remove('hidden');
  }

  showNearMissToast(streak, points) {
    if (this.dom.flowPoints) {
      this.dom.flowPoints.innerText = window.Progress.nearMissLabel(streak, points);
    }
    this.shake = Math.max(this.shake, 0.15);
    this.dom.flowToast.classList.add('active');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.dom.flowToast.classList.remove('active');
    }, 900);
  }

  showChaiToast(type = this.selectedVehicle, bonus = 8) {
    if (!this.dom.chaiToast) return;
    const titles = {
      auto: '☕ KADAK CUTTING CHAI!',
      car: '🔴⚡ STING RED! KHACHA COMPANY',
      truck: '✌️ BOLO ZUBAAN KESARI!'
    };
    const subs = {
      auto: `+${bonus} SECONDS • TAPRI CHAI TURBO!`,
      car: `+${bonus} SECONDS • HIGH-OCTANE NITRO SURGE!`,
      truck: `+${bonus} SECONDS • 100% HIGHWAY STAMINA!`
    };
    const titleEl = this.dom.chaiToast.querySelector('.chai-title');
    const subEl = this.dom.chaiToast.querySelector('.chai-sub');
    if (titleEl) titleEl.innerText = titles[type] || '🔴⚡ STING ENERGY RED!';
    if (subEl) subEl.innerText = subs[type] || `+${bonus} SECONDS • SPEED BOOST!`;

    this.dom.chaiToast.classList.add('active');
    clearTimeout(this.chaiTimeout);
    this.chaiTimeout = setTimeout(() => {
      this.dom.chaiToast.classList.remove('active');
    }, 1800);
  }

  showFastagToast() {
    if (!this.dom.fastagToast) return;
    this.dom.fastagToast.classList.add('active');
    clearTimeout(this.fastagTimeout);
    this.fastagTimeout = setTimeout(() => {
      this.dom.fastagToast.classList.remove('active');
    }, 2200);
  }

  // Dynamic Day-to-Night Highway Atmosphere & Biome Transitions (Ultra-Fast 40s Sprint Progression)
  // Phase 1 (0 - 180m): Golden Sunset over Rural Foothills
  // Phase 2 (180m - 480m): Violet Dusk & Twilight over Expressway Corridor
  // Phase 3 (480m+): Midnight Cyber-Desi Neon Highway with Vehicle Spotlights & Swift Underglow
  updateEnvironment(playerZ) {
    if (!this.traffic || !this.traffic.player) return;
    const playerPos = this.traffic.player.position;
    const dist = Math.abs(playerZ);

    let skyCol = new THREE.Color();
    let sunCol = new THREE.Color();
    let sunIntensity = 1.4;
    let hemiSky = new THREE.Color();
    let hemiGround = new THREE.Color();
    let headIntensity = 0.5;
    let underglowIntensity = 0.4;
    let badgeText = '';

    if (dist < 180) {
      const t = dist / 180;
      skyCol.lerpColors(new THREE.Color(0xd99b66), new THREE.Color(0x9333ea), t * 0.7);
      sunCol.lerpColors(new THREE.Color(0xffbe76), new THREE.Color(0xf43f5e), t);
      sunIntensity = THREE.MathUtils.lerp(1.4, 0.85, t);
      hemiSky.lerpColors(new THREE.Color(0xffeedd), new THREE.Color(0xa78bfa), t);
      hemiGround.lerpColors(new THREE.Color(0x8a6344), new THREE.Color(0x312e81), t);
      headIntensity = THREE.MathUtils.lerp(0.4, 1.4, t);
      underglowIntensity = THREE.MathUtils.lerp(0.2, 1.0, t);
      badgeText = '🌅 RURAL FOOTHILLS • GOLDEN SUNSET';
    } else if (dist < 480) {
      const t = (dist - 180) / 300;
      skyCol.lerpColors(new THREE.Color(0x6b21a8), new THREE.Color(0x1e1b4b), t);
      sunCol.lerpColors(new THREE.Color(0xf43f5e), new THREE.Color(0x38bdf8), t);
      sunIntensity = THREE.MathUtils.lerp(0.85, 0.35, t);
      hemiSky.lerpColors(new THREE.Color(0x818cf8), new THREE.Color(0x1e293b), t);
      hemiGround.lerpColors(new THREE.Color(0x312e81), new THREE.Color(0x0f172a), t);
      headIntensity = THREE.MathUtils.lerp(1.4, 2.4, t);
      underglowIntensity = THREE.MathUtils.lerp(1.0, 2.0, t);
      badgeText = '🌆 EXPRESSWAY CORRIDOR • DUSK TWILIGHT';
    } else {
      const t = Math.min((dist - 480) / 240, 1.0);
      skyCol.lerpColors(new THREE.Color(0x1e1b4b), new THREE.Color(0x070b14), t);
      sunCol.setHex(0x38bdf8); // Moonlight
      sunIntensity = 0.32;
      hemiSky.setHex(0x0f172a);
      hemiGround.setHex(0x020617);
      headIntensity = 2.8;
      underglowIntensity = 2.4;
      badgeText = '🌃 NEON URBAN OUTSKIRTS • MIDNIGHT';
    }

    // 0 in daylight, 1 deep into the night
    const nightFactor = dist < 180 ? 0 : (dist < 480 ? ((dist - 180) / 300) * 0.6 : 0.6 + Math.min((dist - 480) / 240, 1.0) * 0.4);

    // Sky dressing: sun turns into a small cool moon, clouds take the sky tint, stars fade in
    if (this.sky) {
      this.sky.sun.material.color.copy(sunCol);
      const sunSize = THREE.MathUtils.lerp(130, 55, nightFactor);
      this.sky.sun.scale.set(sunSize, sunSize, 1);
      this.sky.clouds.forEach(c => {
        c.material.color.copy(skyCol).lerp(this._white || (this._white = new THREE.Color(0xffffff)), 0.55 * (1 - nightFactor));
        c.material.opacity = 0.7 - nightFactor * 0.45;
      });
      this.sky.stars.material.opacity = Math.max(0, (nightFactor - 0.35) / 0.65);
    }
    // Distant ridges pick up the sky colour for atmospheric depth
    this.mountainMatNear.color.copy(this.baseMountainNear).lerp(skyCol, 0.18 + nightFactor * 0.3);
    this.mountainMatFar.color.copy(this.baseMountainFar).lerp(skyCol, 0.5 + nightFactor * 0.25);

    // Apply colors to scene background & fog
    this.scene.background.copy(skyCol);
    if (this.scene.fog) {
      this.scene.fog.color.copy(skyCol);
    }
    this.sunLight.color.copy(sunCol);
    this.sunLight.intensity = sunIntensity;
    if (this.hemiLight) {
      this.hemiLight.color.copy(hemiSky);
      this.hemiLight.groundColor.copy(hemiGround);
    }

    // Update forward vehicle spotlights
    const hw = (this.selectedVehicle === 'truck') ? 0.95 : 0.65;
    const yOff = (this.selectedVehicle === 'truck') ? 1.2 : 0.55;
    const zAhead = (this.selectedVehicle === 'truck') ? -2.8 : -1.8;

    this.headlightTarget.position.set(playerPos.x, playerPos.y + 0.3, playerPos.z - 36);
    this.headlightTarget.updateMatrixWorld();

    this.headlightL.position.set(playerPos.x - hw, playerPos.y + yOff, playerPos.z + zAhead);
    this.headlightL.intensity = headIntensity;
    this.headlightL.target = this.headlightTarget;

    this.headlightR.position.set(playerPos.x + hw, playerPos.y + yOff, playerPos.z + zAhead);
    this.headlightR.intensity = headIntensity;
    this.headlightR.target = this.headlightTarget;

    // Underglow Neon (Maruti Swift gets electric cyan; Truck gets amber; Auto gets emerald)
    let underColor = 0x00f0ff;
    if (this.selectedVehicle === 'truck') underColor = 0xf59e0b;
    else if (this.selectedVehicle === 'auto') underColor = 0x22c55e;

    this.underglowLight.color.setHex(underColor);
    this.underglowLight.position.set(playerPos.x, playerPos.y + 0.2, playerPos.z);
    this.underglowLight.intensity = underglowIntensity;

    // Update HUD Environment badge (soft highlight on change, then quiet fade)
    if (this.dom.hudBiomeBadge && this.dom.hudBiomeBadge.innerText !== badgeText) {
      this.dom.hudBiomeBadge.innerText = badgeText;
      this.dom.hudBiomeBadge.classList.add('highlight');
      clearTimeout(this.biomeBadgeTimeout);
      this.biomeBadgeTimeout = setTimeout(() => {
        if (this.dom.hudBiomeBadge) this.dom.hudBiomeBadge.classList.remove('highlight');
      }, 2500);
    }
  }

  updateHUD(stats) {
    this.dom.hudDistance.innerHTML = stats.distanceKm + ' <small>KM</small>';
    this.dom.hudScore.innerText = stats.score.toLocaleString();
    this.dom.hudSpeed.innerText = stats.speedKmh;
    this.dom.hudStreakPill.innerText = `FLOW STREAK x${stats.flowStreak}`;
    if (this.dom.hudGear) {
      this.dom.hudGear.innerText = `GEAR ${stats.gear}`;
    }

    // Speedometer SVG arc fill (188.5 total dash offset)
    const speedRatio = Math.min(stats.speedKmh / 140, 1.0);
    const strokeOffset = 188.5 - (speedRatio * 188.5);
    this.dom.speedoFill.style.strokeDashoffset = strokeOffset;

    // Session Timer (40s sprint)
    const secsLeft = Math.ceil(this.sessionTimer);
    this.dom.hudTimer.innerHTML = secsLeft + '<small>S</small>';
    this.dom.hudTimerBar.style.width = window.Progress.timerBarPercent(this.sessionTimer) + '%';
  }

  getCameraConfig(type = this.selectedVehicle) {
    const configs = {
      truck: {
        chaseHeight: 4.9,   // High above cargo top (3.1m) - clear line of sight over truck roof
        chaseDist: 11.2,    // Framed further back for heavy rig scale
        chaseLookDist: 36,  // Look far down highway to see upcoming curves and traffic
        chaseLookY: 2.2,    // Look target height
        hoodHeight: 2.7,    // High cabin windshield view
        hoodDist: -2.8,     // Sits right at the front windshield
        highHeight: 9.2,    // High angle highway view
        highDist: 18.0
      },
      car: {
        chaseHeight: 2.5,   // Sporty, road-connected hot hatchback stance
        chaseDist: 6.8,
        chaseLookDist: 30,  // Fast forward visibility for 118 km/h sprint
        chaseLookY: 1.2,
        hoodHeight: 1.35,   // Low sloping hood camera
        hoodDist: -0.8,
        highHeight: 6.5,
        highDist: 13.8
      },
      auto: {
        chaseHeight: 2.4,
        chaseDist: 6.2,
        chaseLookDist: 24,
        chaseLookY: 1.1,
        hoodHeight: 1.35,
        hoodDist: -0.4,
        highHeight: 5.6,
        highDist: 12.5
      }
    };
    return configs[type] || configs.auto;
  }

  updateCamera(delta) {
    if (!this.traffic.player) return;
    const playerPos = this.traffic.player.position;

    // Dynamic FOV sensation of speed (56 deg at rest to 68 deg at full speed)
    const targetFov = 56 + (Math.min(this.traffic.playerSpeed / 28, 1.0) * 12);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, delta * 3);
    this.camera.updateProjectionMatrix();

    // Parallax scrolling for background mountains
    if (this.mountainGroup) {
      this.mountainGroup.position.z = playerPos.z * 0.92;
    }

    if (this.state === 'ATTRACT') {
      // Cinematic orbiting camera for Attract Mode
      const camCfg = this.getCameraConfig(this.selectedVehicle);
      const time = Date.now() * 0.0006;
      const orbitRad = (this.selectedVehicle === 'truck') ? 14.5 : 11.0;
      const camX = playerPos.x + Math.sin(time) * orbitRad;
      const camZ = playerPos.z + Math.cos(time) * (orbitRad + 1);
      const camY = playerPos.y + camCfg.chaseHeight + Math.sin(time * 0.5) * 1.5;

      this.camera.position.lerp(new THREE.Vector3(camX, camY, camZ), delta * 3);
      this.camera.lookAt(playerPos.x, playerPos.y + (this.selectedVehicle === 'truck' ? 2.2 : 1.2), playerPos.z - 3);
    } else if (this.state === 'CRASH') {
      // Tumble crash camera with slight shake
      this.camera.position.y += delta * 2;
      this.camera.lookAt(playerPos);
    } else {
      // Gameplay Cameras tailored per vehicle
      const camCfg = this.getCameraConfig(this.selectedVehicle);
      let targetCamX, targetCamY, targetCamZ, lookDist, lookYOffset;

      if (this.cameraMode === 0) {
        // Mode 0: Smooth Dynamic Chase Camera directly behind player
        const speedLag = Math.min(this.traffic.playerSpeed / 40, 1.0) * 1.5;
        targetCamX = playerPos.x;
        targetCamY = playerPos.y + camCfg.chaseHeight + (this.traffic.playerSpeed * 0.015);
        targetCamZ = playerPos.z + camCfg.chaseDist + speedLag;
        lookDist = camCfg.chaseLookDist;
        lookYOffset = camCfg.chaseLookY;
      } else if (this.cameraMode === 1) {
        // Mode 1: Vehicle Hood / High Cabin View
        targetCamX = playerPos.x;
        targetCamY = playerPos.y + camCfg.hoodHeight;
        targetCamZ = playerPos.z + camCfg.hoodDist;
        lookDist = camCfg.chaseLookDist + 5;
        lookYOffset = camCfg.hoodHeight * 0.85;
      } else {
        // Mode 2: Far High-Angle Highway View
        targetCamX = playerPos.x;
        targetCamY = playerPos.y + camCfg.highHeight;
        targetCamZ = playerPos.z + camCfg.highDist;
        lookDist = camCfg.chaseLookDist + 10;
        lookYOffset = 1.2;
      }

      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamX, delta * 9);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamY, delta * 9);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCamZ, delta * 9);

      // Look straight ahead along vehicle's travel lane
      const lookZ = playerPos.z - lookDist;
      const lookX = this.road.getRoadCurve(lookZ) + this.traffic.playerLateralOffset;
      const lookY = this.road.getRoadElevation(lookZ) + lookYOffset;
      this.camera.lookAt(lookX, lookY, lookZ);
    }

    // Sky follows the camera so sun, clouds and stars stay at infinity
    if (this.sky) this.sky.group.position.copy(this.camera.position);

    // Screen shake (crash and near-miss feedback); lookAt above resets rotation each frame
    if (this.shake > 0.01) {
      this.camera.rotation.z += (Math.random() - 0.5) * this.shake * 0.06;
      this.camera.rotation.x += (Math.random() - 0.5) * this.shake * 0.03;
      this.shake *= Math.max(0, 1 - delta * 6);
    }

    // Keep Directional Sunlight following player
    this.sunLight.position.z = playerPos.z - 180;
    this.sunLight.target.position.copy(playerPos);
    this.sunLight.target.updateMatrixWorld();
  }

  animate() {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.pollGamepad();

    // Freeze game simulation completely when paused
    if (this.state === 'PAUSED') {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.updateParticles(delta);

    // Dynamic Night & Neon Highway Atmosphere update
    if (this.traffic && this.traffic.player) {
      this.updateEnvironment(this.traffic.player.position.z);
    }

    if (this.state === 'ATTRACT') {
      // Autopilot cruise
      this.traffic.update(delta, this.input, true);
      this.road.update(this.traffic.player.position.z);
    } else if (this.state === 'PLAYING') {
      // Active Session
      this.sessionTimer -= delta;
      if (this.sessionTimer <= 0) {
        this.sessionTimer = 0;
        this.endSession();
        return;
      }

      const stats = this.traffic.update(delta, this.input, false);
      this.road.update(this.traffic.player.position.z);
      this.updateHUD(stats);
      this.playRewardFeedback(stats);

      if (stats.chaiPickup) {
        const bonus = stats.chaiTimeBonus || (this.selectedVehicle === 'truck' ? 10 : (this.selectedVehicle === 'auto' ? 8 : 5));
        this.sessionTimer = Math.min(this.sessionTimer + bonus, 99);
        this.showChaiToast(this.selectedVehicle, bonus);
      }

      if (stats.fastagCleared) {
        this.showFastagToast();
      }

      // Emit exhaust smoke when accelerating
      if (this.input.up || stats.isBoosting) {
        this.emitSmoke(this.traffic.player.position, stats.isBoosting);
      }

      if (stats.nearMiss) {
        this.showNearMissToast(stats.flowStreak, stats.nearMissPoints);
      }

      if (stats.crashed) {
        this.triggerCrash();
      }
    } else if (this.state === 'CRASH') {
      this.traffic.doCrashTumble(delta * 0.45); // slow-motion tumble
      this.crashTimer -= delta;
      if (this.crashTimer <= 0) {
        this.endSession();
      }
    } else if (this.state === 'GAMEOVER') {
      // Auto-reset countdown (holds still while someone is typing their name)
      if (document.activeElement !== this.dom.nameInput) this.autoResetTimer -= delta;
      this.dom.autoResetTimer.innerText = Math.max(Math.ceil(this.autoResetTimer), 0);
      if (this.autoResetTimer <= 0) {
        // Return to Attract Mode with clean world
        this.commitPendingEntry();
        this.state = 'ATTRACT';
        this.road.reset(0);
        this.traffic.reset(0, this.selectedVehicle);
        this.dom.gameoverOverlay.classList.add('hidden');
        this.dom.attractOverlay.classList.remove('hidden');
      }
    }

    this.updateCamera(delta);
    this.renderer.render(this.scene, this.camera);
  }
}

// Start Game on Window Load
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});

// Procedural Web Audio API sound engine for NH Odyssey
// Zero external files required — 100% reliable local offline playback

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.isEngineRunning = false;
    this.isHornPlaying = false;
    this.masterGain = null;
    this.isMemeMuted = false;
    this.rewardSource = null;
    this.rewardBuffers = {};
    this.rewardLoads = {};
    this.lastRewardAt = -Infinity;
    this.rewardCooldown = 6;
    this.rewardEpoch = 0;
    this.rewardGainByKind = { overtake: 1.6, points: 0.25 };
    this.rewardFiles = {
      overtake: 'assets/audio/charpata_gang_MEME_EXTRA_ECHO.wav',
      points: 'assets/audio/shamshanghat_MEME_EXTRA_ECHO.wav'
    };
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      return this.ctx.resume().catch(error => {
        console.warn('Audio activation blocked', error);
        return false;
      });
    }
  }

  getOutput() {
    if (!this.ctx) return null;
    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    return this.masterGain;
  }

  setMuted(muted) {
    this.isMuted = Boolean(muted);
    this.ensureContext();
    if (this.masterGain) this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime, 0.02);
    if (this.isMuted) this.stopReward();
  }

  setMemeMuted(muted) {
    this.isMemeMuted = Boolean(muted);
    if (this.isMemeMuted) this.stopReward();
  }

  async loadReward(kind) {
    if (this.rewardBuffers[kind]) return this.rewardBuffers[kind];
    if (this.rewardLoads[kind]) return this.rewardLoads[kind];
    const path = this.rewardFiles[kind];
    if (!path || typeof fetch !== 'function') return null;
    this.rewardLoads[kind] = fetch(path)
      .then(response => {
        if (!response.ok) throw new Error(`Could not load ${path}`);
        return response.arrayBuffer();
      })
      .then(data => this.ctx.decodeAudioData(data))
      .then(buffer => {
        this.rewardBuffers[kind] = buffer;
        return buffer;
      })
      .catch(error => {
        console.warn('Meme reward audio unavailable', error);
        return null;
      })
      .finally(() => { delete this.rewardLoads[kind]; });
    return this.rewardLoads[kind];
  }

  async previewReward(kind) {
    // This explicit sound-check action enables both audio controls.
    this.setMuted(false);
    this.setMemeMuted(false);
    this.resetRewards();
    if (!this.ctx) return false;
    if (this.ctx.state !== 'running') {
      let timeout;
      try {
        await Promise.race([
          this.ensureContext(),
          new Promise(resolve => { timeout = setTimeout(resolve, 2000); })
        ]);
      } finally {
        clearTimeout(timeout);
      }
    }
    if (this.ctx.state !== 'running') return false;
    return this.playReward(kind);
  }

  async playReward(kind) {
    this.ensureContext();
    if (!this.ctx || this.isMuted || this.isMemeMuted || this.rewardSource) return false;
    const now = this.ctx.currentTime;
    if (now - this.lastRewardAt < this.rewardCooldown) return false;
    const epoch = this.rewardEpoch;
    const buffer = await this.loadReward(kind);
    if (!buffer || epoch !== this.rewardEpoch || this.isMuted || this.isMemeMuted || this.rewardSource) {
      if (!buffer) this.playChaiPickup();
      return false;
    }
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(this.rewardGainByKind[kind] || 0.2, this.ctx.currentTime);
    source.connect(gain);
    gain.connect(this.getOutput());
    source.onended = () => {
      if (this.rewardSource === source) this.rewardSource = null;
    };
    this.rewardSource = source;
    this.lastRewardAt = this.ctx.currentTime;
    source.start(this.ctx.currentTime);
    return true;
  }

  stopReward() {
    if (!this.rewardSource) return;
    try { this.rewardSource.stop(); } catch (e) {}
    this.rewardSource = null;
  }

  resetRewards() {
    this.stopReward();
    this.lastRewardAt = -Infinity;
    this.rewardEpoch++;
  }

  startEngine() {
    if (this.isEngineRunning) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      // Dual oscillator setup for deep throaty 2-stroke / 4-stroke thrum
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineGain = this.ctx.createGain();

      this.engineOsc1.type = 'sawtooth';
      this.engineOsc2.type = 'triangle';

      this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);
      this.engineOsc2.frequency.setValueAtTime(22.5, this.ctx.currentTime);

      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(180, this.ctx.currentTime);

      this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.getOutput());

      this.engineOsc1.start();
      this.engineOsc2.start();
      this.isEngineRunning = true;
    } catch (e) {
      console.warn("Failed to start engine audio", e);
    }
  }

  updateEngine(speedKmh, throttle, gear = 1) {
    if (!this.ctx || !this.isEngineRunning) return;
    const now = this.ctx.currentTime;

    // Calculate gear RPM ratio (revs rise with speed, then drop on upshift)
    let gearMin = 0, gearMax = 24;
    if (gear === 2) { gearMin = 24; gearMax = 48; }
    else if (gear === 3) { gearMin = 48; gearMax = 72; }
    else if (gear === 4) { gearMin = 72; gearMax = 110; }

    const gearProgress = THREE.MathUtils.clamp((speedKmh - gearMin) / (gearMax - gearMin), 0, 1);
    const rpmBase = (gear === 1 ? 0 : 0.35) + gearProgress * 0.65;
    const baseFreq = 48 + (rpmBase * 55) + (throttle ? 14 : 0);

    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.06);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.06);
    this.engineFilter.frequency.setTargetAtTime(220 + (rpmBase * 380), now, 0.08);
    
    const targetGain = (0.05 + Math.min(speedKmh / 100, 1) * 0.05 + (throttle ? 0.03 : 0))
      * (this.rewardSource ? 0.25 : 1);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.08);
  }

  // Sparkling electric powerup sound on collecting Khacha Energy Drink
  playChaiPickup() {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Energetic rising chord (C5, G5, C6, E6)
    const notes = [523.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle'; // Crisp electric timbre
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0, now + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.32, now + idx * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.38);

      osc.connect(gain);
      gain.connect(this.getOutput());
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.42);
    });

    // Sub-bass electric energy pulse
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(320, now + 0.25);
    subGain.gain.setValueAtTime(0.35, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    subOsc.connect(subGain);
    subGain.connect(this.getOutput());
    subOsc.start(now);
    subOsc.stop(now + 0.32);
  }

  stopEngine() {
    if (!this.isEngineRunning) return;
    try {
      this.engineOsc1.stop();
      this.engineOsc2.stop();
      this.isEngineRunning = false;
    } catch(e) {}
  }

  // Authentic Indian Multi-Tone Musical Brass Horn (Pee-Poo-Pee-Poo)
  playHorn() {
    this.ensureContext();
    if (!this.ctx || this.isHornPlaying) return;
    this.isHornPlaying = true;

    const now = this.ctx.currentTime;
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.32, now);
    masterGain.connect(this.getOutput());

    // Multi-harmonic horn chords
    const notes = [
      { f1: 523.25, f2: 659.25, start: 0, dur: 0.14 },    // C5 + E5
      { f1: 659.25, f2: 783.99, start: 0.14, dur: 0.14 }, // E5 + G5
      { f1: 523.25, f2: 659.25, start: 0.28, dur: 0.14 }, // C5 + E5
      { f1: 783.99, f2: 1046.5, start: 0.42, dur: 0.35 }  // G5 + C6 flourish
    ];

    notes.forEach(note => {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const noteGain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(note.f1, now + note.start);
      osc2.frequency.setValueAtTime(note.f2, now + note.start);

      // Brass envelope filter
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(note.f1 * 1.5, now + note.start);
      filter.Q.setValueAtTime(3.0, now + note.start);

      noteGain.gain.setValueAtTime(0, now + note.start);
      noteGain.gain.linearRampToValueAtTime(0.36, now + note.start + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(masterGain);

      osc1.start(now + note.start);
      osc2.start(now + note.start);
      osc1.stop(now + note.start + note.dur);
      osc2.stop(now + note.start + note.dur);
    });

    setTimeout(() => {
      this.isHornPlaying = false;
    }, 750);
  }

  // Smooth wind rush / whoosh on high-speed near-miss
  playNearMiss() {
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 0.2);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.4);
    filter.Q.setValueAtTime(4.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getOutput());

    noise.start(now);
  }

  // Suspension clunk over pothole / speed bump
  playBump() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.15);

    gain.gain.setValueAtTime(0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.getOutput());
    osc.start(now);
    osc.stop(now + 0.16);
  }

  // Dramatic crash impact with metal crunch
  playCrash() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Sub thud
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.4);
    oscGain.gain.setValueAtTime(0.55, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(oscGain);
    oscGain.connect(this.getOutput());
    osc.start(now);
    osc.stop(now + 0.4);

    // Metal clatter noise
    const bufferSize = this.ctx.sampleRate * 0.6;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.15));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getOutput());
    noise.start(now);
  }
}

window.soundEngine = new SoundEngine();

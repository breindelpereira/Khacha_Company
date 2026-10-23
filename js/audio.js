// Procedural Web Audio API sound engine for NH Odyssey
// Zero external files required — 100% reliable local offline playback

const BULB_MAKEUP = 5;

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.isEngineRunning = false;
    this.hornVoice = null;
    this.hornProfiles = {
      car: { kind: 'electric', tones: [420, 525], level: 0.4, attack: 0.012, release: 0.07, minHold: 0.22 },
      auto: { kind: 'bulb', level: 0.34, phraseLength: 0.5 },
      truck: { kind: 'air', tones: [207.65, 261.63, 311.13], level: 0.5, attack: 0.045, release: 0.24, minHold: 0.35 }
    };
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
    this.stopHorn();
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

  // ---------------------------------------------------------------- horns
  // Each ride has its own horn. Electric and air horns sound for as long as the key is held
  // (with a short minimum so a tap still sounds like a honk); the rubber-bulb horn is a fixed
  // "pa-paawn" phrase.
  //   car:   twin-tone electric disc horn (two notes about a fourth apart, buzzing diaphragm)
  //   auto:  reedy rubber-bulb horn
  //   truck: compressed-air horn, a deep three-note chord with a hiss of air on the attack
  startHorn(type = 'car') {
    this.ensureContext();
    if (!this.ctx || this.hornVoice) return false;
    const profile = this.hornProfiles[type] || this.hornProfiles.car;
    const now = this.ctx.currentTime;

    const out = this.ctx.createGain();
    out.gain.setValueAtTime(0.32, now);
    out.connect(this.getOutput());

    const voice = { profile, out, oscs: [], amp: null, startedAt: now, released: false };
    if (profile.kind === 'bulb') this.buildBulbHorn(voice, now);
    else if (profile.kind === 'air') this.buildAirHorn(voice, now);
    else this.buildElectricHorn(voice, now);
    this.hornVoice = voice;

    // Bulb horn ends by itself; the others get a failsafe in case the release never arrives
    this.endHornLater(voice, profile.kind === 'bulb' ? profile.phraseLength : 5);
    return true;
  }

  endHornLater(voice, seconds) {
    const timer = setTimeout(() => {
      if (this.hornVoice === voice) this.hornVoice = null;
      if (voice.profile.kind !== 'bulb') this.releaseHornVoice(voice);
    }, seconds * 1000);
    if (timer && timer.unref) timer.unref();
    voice.timer = timer;
  }

  // Key released: let the note ring for its minimum length, then release
  stopHorn() {
    const voice = this.hornVoice;
    if (!voice || voice.profile.kind === 'bulb') return;
    this.hornVoice = null;
    clearTimeout(voice.timer);
    this.releaseHornVoice(voice);
  }

  releaseHornVoice(voice) {
    if (voice.released || !this.ctx) return;
    voice.released = true;
    const { profile, amp } = voice;
    const now = this.ctx.currentTime;
    const at = Math.max(now, voice.startedAt + (profile.minHold || 0));
    const end = at + profile.release;
    if (amp) {
      if (amp.gain.cancelScheduledValues) amp.gain.cancelScheduledValues(at);
      amp.gain.setValueAtTime(amp.gain.value, at);
      amp.gain.linearRampToValueAtTime(0.0001, end);
    }
    // Air horns drop a little in pitch as the pressure bleeds off
    if (profile.kind === 'air') {
      voice.oscs.forEach(o => {
        if (o.frequency.cancelScheduledValues) o.frequency.cancelScheduledValues(at);
        o.frequency.setValueAtTime(o.frequency.value, at);
        o.frequency.linearRampToValueAtTime(o.frequency.value * 0.96, end);
      });
    }
    voice.oscs.forEach(o => { try { o.stop(end + 0.05); } catch (e) {} });
  }

  makeNoise(seconds) {
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    return src;
  }

  // Twin-tone electric disc horn: two buzzy square tones with a vibrating-diaphragm flutter
  buildElectricHorn(voice, now) {
    const { profile, out } = voice;
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(0, now);
    amp.gain.linearRampToValueAtTime(profile.level, now + profile.attack);
    const body = this.ctx.createBiquadFilter();
    body.type = 'lowpass';
    body.frequency.setValueAtTime(3200, now);
    const horn = this.ctx.createBiquadFilter(); // trumpet-shaped resonance
    horn.type = 'bandpass';
    horn.frequency.setValueAtTime(1300, now);
    horn.Q.setValueAtTime(0.9, now);

    profile.tones.forEach((f, i) => {
      const sq = this.ctx.createOscillator();
      const saw = this.ctx.createOscillator();
      sq.type = 'square';
      saw.type = 'sawtooth';
      sq.frequency.setValueAtTime(f * 1.04, now);
      sq.frequency.setTargetAtTime(f, now, 0.02); // brief pitch scoop as the diaphragm starts
      saw.frequency.setValueAtTime(f * (1.004 + i * 0.002), now);
      const sawGain = this.ctx.createGain();
      sawGain.gain.setValueAtTime(0.5, now);
      sq.connect(body);
      saw.connect(sawGain);
      sawGain.connect(body);
      sq.start(now);
      saw.start(now);
      voice.oscs.push(sq, saw);
    });

    // Diaphragm flutter modulating the amplitude
    const lfo = this.ctx.createOscillator();
    const lfoDepth = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(92, now);
    lfoDepth.gain.setValueAtTime(profile.level * 0.18, now);
    lfo.connect(lfoDepth);
    lfoDepth.connect(amp.gain);
    lfo.start(now);
    voice.oscs.push(lfo);

    body.connect(horn);
    horn.connect(amp);
    amp.connect(out);
    voice.amp = amp;
  }

  // Rubber-bulb horn: nasal reed, two squeezes ("pa-paawn")
  buildBulbHorn(voice, now) {
    const { profile, out } = voice;
    const pulses = [
      { at: 0, dur: 0.11, f0: 330, f1: 355 },
      { at: 0.16, dur: 0.3, f0: 292, f1: 345 }
    ];
    pulses.forEach(p => {
      const t0 = now + p.at;
      const reed = this.ctx.createOscillator();
      const buzz = this.ctx.createOscillator();
      reed.type = 'sawtooth';
      buzz.type = 'square';
      reed.frequency.setValueAtTime(p.f0, t0);
      reed.frequency.linearRampToValueAtTime(p.f1, t0 + p.dur * 0.7);
      buzz.frequency.setValueAtTime(p.f0 * 2.01, t0);
      buzz.frequency.linearRampToValueAtTime(p.f1 * 2.01, t0 + p.dur * 0.7);
      const buzzGain = this.ctx.createGain();
      buzzGain.gain.setValueAtTime(0.25, t0);
      const nasal = this.ctx.createBiquadFilter();
      nasal.type = 'bandpass';
      nasal.frequency.setValueAtTime(1250, t0);
      nasal.Q.setValueAtTime(2.2, t0);
      const amp = this.ctx.createGain();
      amp.gain.setValueAtTime(0, t0);
      // The narrow reed filter removes most of the signal, so make the level back up
      const level = profile.level * BULB_MAKEUP;
      amp.gain.linearRampToValueAtTime(level, t0 + 0.012);
      amp.gain.setValueAtTime(level, t0 + p.dur - 0.04);
      amp.gain.linearRampToValueAtTime(0.0001, t0 + p.dur);
      reed.connect(nasal);
      buzz.connect(buzzGain);
      buzzGain.connect(nasal);
      nasal.connect(amp);
      amp.connect(out);
      reed.start(t0);
      buzz.start(t0);
      reed.stop(t0 + p.dur + 0.02);
      buzz.stop(t0 + p.dur + 0.02);
    });
  }

  // Compressed-air horn: three-note chord, slow swell, hiss of air on the attack
  buildAirHorn(voice, now) {
    const { profile, out } = voice;
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(0, now);
    amp.gain.linearRampToValueAtTime(profile.level * 1.2, now + profile.attack); // overshoot as the pressure hits
    amp.gain.linearRampToValueAtTime(profile.level, now + profile.attack + 0.14);
    const body = this.ctx.createBiquadFilter();
    body.type = 'lowpass';
    body.frequency.setValueAtTime(1700, now);
    body.Q.setValueAtTime(1.2, now);

    profile.tones.forEach(f => {
      const saw = this.ctx.createOscillator();
      const sub = this.ctx.createOscillator();
      saw.type = 'sawtooth';
      sub.type = 'triangle';
      saw.frequency.setValueAtTime(f * 0.97, now);
      saw.frequency.setTargetAtTime(f, now, 0.05);
      sub.frequency.setValueAtTime(f * 0.5, now);
      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.6, now);
      saw.connect(body);
      sub.connect(subGain);
      subGain.connect(body);
      saw.start(now);
      sub.start(now);
      voice.oscs.push(saw, sub);
    });

    // Slow breath wobble so the three notes don't sound locked together
    const lfo = this.ctx.createOscillator();
    const lfoDepth = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(5.5, now);
    lfoDepth.gain.setValueAtTime(profile.level * 0.05, now);
    lfo.connect(lfoDepth);
    lfoDepth.connect(amp.gain);
    lfo.start(now);
    voice.oscs.push(lfo);

    const hiss = this.makeNoise(0.3);
    const hissFilter = this.ctx.createBiquadFilter();
    hissFilter.type = 'highpass';
    hissFilter.frequency.setValueAtTime(3500, now);
    const hissGain = this.ctx.createGain();
    hissGain.gain.setValueAtTime(0.14, now);
    hissGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    hiss.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(out);
    hiss.start(now);

    body.connect(amp);
    amp.connect(out);
    voice.amp = amp;
  }

  // A quick tap: sounds for the profile's minimum length
  playHorn(type = 'car') {
    if (this.startHorn(type)) this.stopHorn();
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

const fs = require('node:fs');
const vm = require('node:vm');
function load(file, name, extras = {}) {
  const context = vm.createContext({ console: { ...console, warn() {} }, setTimeout, clearTimeout, window: {}, document: { addEventListener() {}, hidden: false }, ...extras });
  vm.runInContext(fs.readFileSync(file, 'utf8') + `\nthis.Subject = ${name};`, context);
  return context;
}
function audio(fetchImpl = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) })) {
  const nodes = [];
  const param = () => ({ value: 0, setValueAtTime(v) { this.value = v; }, setTargetAtTime(v) { this.value = v; }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  class Context {
    constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; this.sampleRate = 100; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    createGain() { return this.node(); }
    createOscillator() { return this.node(); }
    createBiquadFilter() { return this.node(); }
    createBufferSource() { return this.node(); }
    createBuffer() { return { getChannelData: () => new Float32Array(100) }; }
    decodeAudioData() { return Promise.resolve({ duration: 2 }); }
    node() { const n = { gain: param(), frequency: param(), Q: param(), connect(to) { this.output = to; }, disconnect() {}, start() { this.started = true; }, stop() { this.stopped = true; } }; nodes.push(n); return n; }
  }
  const c = load('js/audio.js', 'SoundEngine', { THREE: { MathUtils: { clamp: (v, min, max) => Math.max(min, Math.min(max, v)) } }, window: { AudioContext: Context }, fetch: fetchImpl });
  const engine = new c.Subject();
  engine.ensureContext();
  return { engine, nodes };
}
module.exports = { load, audio };

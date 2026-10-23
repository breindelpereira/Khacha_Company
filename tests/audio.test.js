const test = require('node:test');
const assert = require('node:assert/strict');
const { audio } = require('./helpers.cjs');

test('meme preview enables both mute controls and bypasses old reward cooldown', async () => {
  const { engine } = audio();
  engine.setMuted(true);
  engine.setMemeMuted(true);
  engine.lastRewardAt = engine.ctx.currentTime;
  assert.equal(await engine.previewReward('overtake'), true);
  assert.equal(engine.isMuted, false);
  assert.equal(engine.isMemeMuted, false);
  assert.equal(engine.masterGain.gain.value, 1);
  const previous = engine.rewardSource;
  assert.equal(await engine.previewReward('points'), true);
  assert.equal(previous.stopped, true);
});

test('engine ducks while a meme is playing and recovers afterward', async () => {
  const { engine } = audio();
  engine.startEngine();
  engine.updateEngine(80, true, 3);
  const normal = engine.engineGain.gain.value;
  await engine.playReward('overtake');
  engine.updateEngine(80, true, 3);
  assert.equal(engine.engineGain.gain.value, normal * 0.25);
  engine.stopReward();
  engine.updateEngine(80, true, 3);
  assert.equal(engine.engineGain.gain.value, normal);
});

test('blocked audio activation returns failure and remains retryable', async () => {
  const { engine } = audio();
  engine.ctx.state = 'suspended';
  engine.ctx.resume = () => Promise.reject(new Error('NotAllowedError'));
  assert.equal(await engine.previewReward('points'), false);
  assert.equal(engine.rewardSource, null);
  engine.ctx.resume = () => { engine.ctx.state = 'running'; return Promise.resolve(); };
  assert.equal(await engine.previewReward('points'), true);
});

test('meme reward uses one source, per-clip gain, and cooldown', async () => {
  const { engine, nodes } = audio();
  const first = await engine.playReward('overtake');
  const second = await engine.playReward('points');
  assert.equal(first, true);
  assert.equal(second, false);
  const sources = nodes.filter(node => node.started && node.buffer);
  assert.equal(sources.length, 1);
  assert.equal(engine.rewardGainByKind.overtake, 1.6);
  assert.equal(engine.rewardGainByKind.points, 0.25);
});

test('startEngine creates an audio context before checking engine state', () => {
  const { engine } = audio();
  engine.ctx = null;
  engine.startEngine();
  assert.ok(engine.ctx);
  assert.equal(engine.isEngineRunning, true);
});

test('procedural effects use boosted gain levels', () => {
  const { engine, nodes } = audio();
  engine.startEngine();
  assert.equal(engine.engineGain.gain.value, 0.08);

  engine.playHorn();
  engine.playNearMiss();
  assert.ok(nodes.some(node => node.gain.value === 0.32));
  assert.ok(nodes.some(node => node.gain.value === 0.28));
});

test('meme reward respects mute and reset stops active source', async () => {
  const { engine, nodes } = audio();
  engine.setMemeMuted(true);
  assert.equal(await engine.playReward('overtake'), false);
  engine.setMemeMuted(false);
  await engine.playReward('points');
  engine.resetRewards();
  assert.ok(nodes.some(node => node.stopped));
});

test('failed meme clip uses existing pickup cue without rejecting', async () => {
  const { engine } = audio(async () => ({ ok: false }));
  let fallback = 0;
  engine.playChaiPickup = () => { fallback++; };
  assert.equal(await engine.playReward('points'), false);
  assert.equal(fallback, 1);
});

test('reset prevents an in-flight decode from becoming stale speech', async () => {
  let resolveFetch;
  const { engine, nodes } = audio(() => new Promise(resolve => { resolveFetch = resolve; }));
  const pending = engine.playReward('overtake');
  engine.resetRewards();
  resolveFetch({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) });
  assert.equal(await pending, false);
  assert.equal(nodes.filter(node => node.started && node.buffer).length, 0);
});

test('each ride has a different horn voice', () => {
  const { engine } = audio();
  const { car, auto, truck } = engine.hornProfiles;
  assert.deepEqual([car.kind, auto.kind, truck.kind], ['electric', 'bulb', 'air']);
  assert.equal(car.tones.length, 2);
  assert.equal(truck.tones.length, 3);
  assert.ok(Math.max(...truck.tones) < Math.min(...car.tones), 'air horn sits below the electric horn');
  assert.ok(truck.level > car.level && car.level > auto.level);
});

test('electric and air horns sustain until released, bulb horn is a fixed phrase', () => {
  ['car', 'truck'].forEach(type => {
    const { engine, nodes } = audio();
    assert.equal(engine.startHorn(type), true);
    assert.equal(engine.startHorn(type), false, 'no second voice while held');
    const oscillators = engine.hornVoice.oscs;
    assert.ok(oscillators.length >= 5);
    assert.ok(oscillators.every(o => o.started && !o.stopped));
    engine.stopHorn();
    assert.equal(engine.hornVoice, null);
    assert.ok(oscillators.every(o => o.stopped));
    assert.equal(engine.startHorn(type), true, 'can honk again after release');
    void nodes;
  });

  const { engine, nodes } = audio();
  assert.equal(engine.startHorn('auto'), true);
  const started = nodes.filter(n => n.started).length;
  assert.ok(started >= 4, 'two squeezes, each a reed plus buzz');
  engine.stopHorn();
  assert.ok(engine.hornVoice, 'releasing the key does not cut the bulb phrase short');
});

test('a quick tap still produces a full honk and muting or pausing silences a held horn', () => {
  const { engine } = audio();
  engine.playHorn('truck');
  assert.equal(engine.hornVoice, null);
  engine.startHorn('car');
  const held = engine.hornVoice.oscs;
  engine.stopReward();
  assert.ok(held.every(o => o.stopped));
});

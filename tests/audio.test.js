const test = require('node:test');
const assert = require('node:assert/strict');
const { audio } = require('./helpers.cjs');

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

test('procedural effects use boosted gain levels', () => {
  const { engine, nodes } = audio();
  engine.startEngine();
  assert.equal(engine.engineGain.gain.value, 0.16);

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

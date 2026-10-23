const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');

const Progress = () => load('js/progress.js', 'Progress').Subject;

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return { data, getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; } };
};

test('timer bar never exceeds 100% after a time bonus', () => {
  const p = Progress();
  assert.equal(p.timerBarPercent(40), 100);
  assert.equal(p.timerBarPercent(99), 100);
  assert.equal(p.timerBarPercent(20), 50);
  assert.equal(p.timerBarPercent(-1), 0);
});

test('rank tiers follow score thresholds, including the lowest', () => {
  const p = Progress();
  assert.match(p.rankForScore(0), /LEARNER/);
  assert.match(p.rankForScore(8001), /COMMUTER/);
  assert.match(p.rankForScore(15001), /CRUISER/);
  assert.match(p.rankForScore(25001), /RAJA/);
  assert.match(p.rankForScore(35001), /EMPEROR/);
});

test('difficulty ramps with distance and is capped', () => {
  const p = Progress();
  const start = p.difficultyForDistance(0);
  const mid = p.difficultyForDistance(750);
  const far = p.difficultyForDistance(100000);
  assert.equal(start.level, 0);
  assert.equal(mid.level, 3);
  assert.equal(far.level, 6);
  assert.ok(mid.trafficCount > start.trafficCount);
  assert.ok(far.messScale < start.messScale);
  assert.ok(far.messScale >= 0.5);
  assert.ok(far.chaiBonusScale >= 0.5);
});

test('chai bonus shrinks with difficulty but never below 2 seconds', () => {
  const p = Progress();
  assert.equal(p.scaledChaiBonus(10, p.difficultyForDistance(0)), 10);
  assert.ok(p.scaledChaiBonus(10, p.difficultyForDistance(1500)) < 10);
  assert.equal(p.scaledChaiBonus(2, p.difficultyForDistance(1500)), 2);
});

test('near-miss label shows streak and points', () => {
  assert.equal(Progress().nearMissLabel(3, 750), 'NEAR MISS x3 +750 PTS');
});

test('per-vehicle bests persist and report new bests', () => {
  const p = Progress();
  const storage = memoryStorage();
  const progress = p.load(storage);
  assert.equal(p.recordRun(progress, 'car', 5000).isNewBest, true);
  assert.equal(p.recordRun(progress, 'car', 4000).isNewBest, false);
  assert.equal(p.recordRun(progress, 'truck', 100).isNewBest, true);
  progress.lastVehicle = 'truck';
  p.save(storage, progress);

  const reloaded = p.load(storage);
  assert.equal(reloaded.best.car, 5000);
  assert.equal(reloaded.best.truck, 100);
  assert.equal(reloaded.best.auto, 0);
  assert.equal(reloaded.lastVehicle, 'truck');
});

test('corrupted or unavailable storage falls back to defaults', () => {
  const p = Progress();
  const junk = memoryStorage({ khacha_progress: '{not json' });
  assert.equal(p.load(junk).lastVehicle, 'auto');

  const badValues = memoryStorage({ khacha_progress: JSON.stringify({ best: { auto: 'x', car: -5 }, lastVehicle: 'tank' }) });
  const loaded = p.load(badValues);
  assert.equal(loaded.best.auto, 0);
  assert.equal(loaded.best.car, 0);
  assert.equal(loaded.lastVehicle, 'auto');

  const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(p.load(throwing).best.auto, 0);
  assert.doesNotThrow(() => p.save(throwing, p.emptyProgress()));
});

test('toll plazas always open exactly two distinct lanes, and every pair can occur', () => {
  const p = Progress();
  const seen = new Set();
  for (let i = 0; i < 6; i++) {
    const lanes = p.pickOpenTollLanes(() => (i + 0.5) / 6);
    assert.equal(lanes.length, 2);
    assert.notEqual(lanes[0], lanes[1]);
    lanes.forEach(l => assert.ok(p.LANES.includes(l)));
    seen.add(lanes.join(','));
  }
  assert.equal(seen.size, 6);
  assert.equal(p.pickOpenTollLanes(() => 0.9999999).length, 2);
});

test('rides steer differently: truck is heavy, swift is sharp, auto is nimble but floaty', () => {
  const { auto, car, truck } = Progress().HANDLING;
  assert.ok(truck.maxLateral < auto.maxLateral && auto.maxLateral < car.maxLateral);
  assert.ok(truck.response < auto.response && auto.response < car.response);
  assert.ok(truck.highSpeedLoss > auto.highSpeedLoss && auto.highSpeedLoss >= car.highSpeedLoss);
  assert.ok(auto.roll > truck.roll);
});

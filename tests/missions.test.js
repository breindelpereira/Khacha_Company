const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');

function tracker(seq = [0.1, 0.5, 0.9, 0.3, 0.7, 0.2]) {
  let i = 0;
  const rng = () => seq[i++ % seq.length];
  const ctx = load('js/missions.js', 'MissionTracker');
  return { t: new ctx.Subject(rng), ctx };
}

test('picks three distinct missions with labels and targets', () => {
  const { t } = tracker();
  const missions = t.pick(95);
  assert.equal(missions.length, 3);
  assert.equal(new Set(missions.map(m => m.id)).size, 3);
  missions.forEach(m => {
    assert.ok(m.target > 0);
    assert.match(m.label, /\S/);
    assert.equal(m.done, false);
  });
});

test('speed missions scale with the ride top speed', () => {
  const { t } = tracker([0.99, 0.0]); // last pool entry = speed, lowest tier
  const [m] = t.pick(118, 1);
  assert.equal(m.id, 'speed');
  assert.equal(m.target, 110); // 118 * 0.95 rounded to nearest 5
});

test('update completes missions exactly once and clamps progress', () => {
  const { t } = tracker([0.0, 0.0]); // first pool entry = nearmiss, target 3
  const [m] = t.pick(95, 1);
  assert.equal(m.id, 'nearmiss');
  assert.deepEqual(t.update({ nearMissCount: 2 }).length, 0);
  assert.equal(m.progress, 2);
  const done = t.update({ nearMissCount: 7 });
  assert.equal(done.length, 1);
  assert.equal(m.progress, 3);
  assert.equal(t.update({ nearMissCount: 9 }).length, 0);
  assert.equal(t.doneCount, 1);
  assert.equal(t.allDone, true);
});

test('missing stats count as zero progress', () => {
  const { t } = tracker();
  t.pick(95);
  assert.equal(t.update({}).length, 0);
  assert.equal(t.doneCount, 0);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');

const Progress = () => load('js/progress.js', 'Progress').Subject;

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return { data, getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; } };
};

const fill = (p, scores, vehicle = 'car') => {
  let list = [];
  scores.forEach((score, i) => {
    list = p.addEntry(list, { name: `P${i}`, score, vehicle, distanceKm: 1, at: 1000 + i }).list;
  });
  return list;
};

test('names are cleaned, capped and never empty', () => {
  const p = Progress();
  assert.equal(p.sanitizeName('  raju  '), 'RAJU');
  assert.equal(p.sanitizeName('<b>Priya</b>'), 'BPRIYAB');
  assert.equal(p.sanitizeName('a very long driver name indeed'), 'A VERY LONG');
  assert.equal(p.sanitizeName(''), 'GUEST');
  assert.equal(p.sanitizeName('<>/\\'), 'GUEST');
  assert.equal(p.sanitizeName(null), 'GUEST');
  assert.equal(p.sanitizeName('राहुल'), 'राहुल');
  assert.equal(p.sanitizeName('a   b'), 'A B');
});

test('board sorts by score, earlier run wins ties', () => {
  const p = Progress();
  let list = [];
  list = p.addEntry(list, { name: 'a', score: 500, vehicle: 'auto', distanceKm: 1, at: 2 }).list;
  list = p.addEntry(list, { name: 'b', score: 900, vehicle: 'auto', distanceKm: 1, at: 3 }).list;
  list = p.addEntry(list, { name: 'c', score: 500, vehicle: 'auto', distanceKm: 1, at: 1 }).list;
  assert.equal(list.map(e => e.name).join(), 'B,C,A');
});

test('rank for a new score sits behind equal existing scores', () => {
  const p = Progress();
  const list = fill(p, [300, 200, 100]);
  assert.equal(p.rankFor(list, 400), 1);
  assert.equal(p.rankFor(list, 200), 3);
  assert.equal(p.rankFor(list, 50), 4);
});

test('a zero score never qualifies; an empty board always accepts a real score', () => {
  const p = Progress();
  assert.equal(p.qualifies([], 0, 'car'), false);
  assert.equal(p.qualifies([], 1, 'car'), true);
});

test('a full board only accepts scores that reach the top 10', () => {
  const p = Progress();
  const list = fill(p, [1000, 900, 800, 700, 600, 500, 400, 300, 200, 100]);
  assert.equal(p.qualifies(list, 50, 'car'), false);
  assert.equal(p.qualifies(list, 100, 'car'), false, 'a tie with 10th place ranks 11th');
  assert.equal(p.qualifies(list, 101, 'car'), true);
});

test('a score can qualify through its own ride even when it is outside the overall top 10', () => {
  const p = Progress();
  const list = fill(p, [1000, 900, 800, 700, 600, 500, 400, 300, 200, 100], 'car');
  assert.equal(p.qualifies(list, 50, 'truck'), true, 'first truck score');
});

test('ride tabs show only that ride, capped at 10', () => {
  const p = Progress();
  let list = fill(p, Array.from({ length: 12 }, (_, i) => 100 + i), 'auto');
  list = p.addEntry(list, { name: 'T', score: 5, vehicle: 'truck', distanceKm: 1, at: 9999 }).list;
  const autoRows = p.boardView(list, 'auto');
  assert.equal(autoRows.length, 10);
  assert.ok(autoRows.every(e => e.vehicle === 'auto'));
  assert.equal(autoRows[0].score, 111);
  assert.equal(p.boardView(list, 'truck').length, 1);
  assert.equal(p.boardView(list, 'all').length, 10);
});

test('pruning keeps each ride\'s best entries so a small ride is never wiped out', () => {
  const p = Progress();
  let list = fill(p, Array.from({ length: 40 }, (_, i) => 1000 + i), 'car');
  list = p.addEntry(list, { name: 'T', score: 1, vehicle: 'truck', distanceKm: 1, at: 99999 }).list;
  assert.equal(list.filter(e => e.vehicle === 'car').length, p.BOARD_KEEP_PER_RIDE);
  assert.equal(list.filter(e => e.vehicle === 'truck').length, 1);
});

test('board persists and survives broken storage', () => {
  const p = Progress();
  const storage = memoryStorage();
  const list = fill(p, [300, 200]);
  p.saveBoard(storage, list);
  const loaded = p.loadBoard(storage);
  assert.equal(loaded.map(e => e.score).join(), '300,200');
  assert.equal(loaded[0].name, 'P0');

  assert.equal(p.loadBoard(memoryStorage({ khacha_leaderboard: '{nope' })).length, 0);
  assert.equal(p.loadBoard(memoryStorage({ khacha_leaderboard: '{"a":1}' })).length, 0);
  const junk = JSON.stringify([{ name: 'X', score: -5, vehicle: 'car' }, { name: 'Y', score: 10, vehicle: 'tank' }, { name: '<i>Z', score: 7, vehicle: 'auto', at: 1 }]);
  const cleaned = p.loadBoard(memoryStorage({ khacha_leaderboard: junk }));
  assert.equal(cleaned.length, 1);
  assert.equal(cleaned[0].name, 'IZ');

  const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(p.loadBoard(throwing).length, 0);
  assert.doesNotThrow(() => p.saveBoard(throwing, list));
});

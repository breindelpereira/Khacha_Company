const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');

const ctx = load('js/routes.js', 'pickRouteOptions');
const w = ctx.window;

test('junction chunks appear at 540m and then every 480m', () => {
  assert.equal(w.isRouteChunk(-540), true);
  assert.equal(w.isRouteChunk(-1020), true);
  assert.equal(w.isRouteChunk(-1500), true);
  assert.equal(w.isRouteChunk(-480), false);
  assert.equal(w.isRouteChunk(-600), false);
  assert.equal(w.isRouteChunk(0), false);
});

test('approach to a junction is kept clear of hazards', () => {
  assert.equal(w.nearRouteJunction(-480), true);  // 60m before
  assert.equal(w.nearRouteJunction(-540), true);
  assert.equal(w.nearRouteJunction(-300), false);
  assert.equal(w.nearRouteJunction(-780), false);
});

test('one distinct option per lane', () => {
  const opts = w.pickRouteOptions();
  assert.equal(opts.length, w.ROUTE_LANES.length);
  assert.equal(new Set(opts.map(o => o.id)).size, opts.length);
});

test('mystery resolves to a real effect or a challan, never itself', () => {
  assert.equal(w.resolveMystery(() => 0.1).id, 'challan');
  for (const r of [0.3, 0.5, 0.99]) {
    const out = w.resolveMystery(() => r);
    assert.notEqual(out.id, 'mystery');
    assert.ok(out.title);
  }
});

test('nearest lane index maps offsets to lanes', () => {
  assert.equal(w.nearestLaneIndex(-6), 0);
  assert.equal(w.nearestLaneIndex(-1), 1);
  assert.equal(w.nearestLaneIndex(0.5), 2);
  assert.equal(w.nearestLaneIndex(7), 3);
});

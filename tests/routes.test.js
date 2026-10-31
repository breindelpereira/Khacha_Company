const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');

const w = load('js/routes.js', 'ROUTE_API').window;

test('junction chunks appear at 540m and then every 480m', () => {
  assert.equal(w.isRouteChunk(-540), true);
  assert.equal(w.isRouteChunk(-1020), true);
  assert.equal(w.isRouteChunk(-1500), true);
  assert.equal(w.isRouteChunk(-480), false);
  assert.equal(w.isRouteChunk(-600), false);
  assert.equal(w.isRouteChunk(0), false);
});

test('approach to a junction is kept clear of hazards', () => {
  assert.equal(w.nearRouteJunction(-480), true);
  assert.equal(w.nearRouteJunction(-540), true);
  assert.equal(w.nearRouteJunction(-300), false);
  assert.equal(w.nearRouteJunction(-780), false);
});

test('a junction offers two different routes', () => {
  for (const r of [0, 0.3, 0.6, 0.99]) {
    const [a, b] = w.pickRouteOptions(() => r);
    assert.ok(a && b);
    assert.notEqual(a.id, b.id);
  }
});

test('every route defines environment, traffic and perk', () => {
  Object.values(w.ROUTES).forEach(route => {
    assert.ok(route.biome && route.badge && route.perkLabel && route.trafficLabel);
    assert.equal(typeof route.palette.sky, 'number');
    assert.ok(route.traffic.mix.length > 0 && route.traffic.count > 0);
    assert.ok(Object.keys(route.perk).length > 0);
  });
});

test('road shape is neutral at both junctions and full mid-route', () => {
  assert.equal(w.routeWeight(0), 0);
  assert.equal(w.routeWeight(w.ROUTE_START), 0);
  assert.equal(w.routeWeight(260), 1);
  assert.equal(w.routeWeight(w.ROUTE_SPACING), 0);
  const fly = w.routeShape(w.ROUTES.flyover, 260, 1);
  assert.equal(fly.lift, w.ROUTES.flyover.lift);
  const left = w.routeShape(w.ROUTES.village, 260, 0);
  const right = w.routeShape(w.ROUTES.village, 260, 1);
  assert.ok(left.curve < right.curve, 'left carriageway turns off to the left');
});

test('side index and traffic mix picking', () => {
  assert.equal(w.sideIndex(-2), 0);
  assert.equal(w.sideIndex(2), 1);
  const mix = [['car', 1], ['bike', 3]];
  assert.equal(w.pickTrafficType(mix, () => 0.1), 'car');
  assert.equal(w.pickTrafficType(mix, () => 0.9), 'bike');
});

// Route Choice junctions: every few hundred metres a gantry offers one deal per lane.
// The lane you are locked into when you pass the gate decides your route.
// Pure data/logic (no Three.js / DOM) so it can be unit-tested in Node.

const ROUTE_FIRST_Z = 540;      // metres from the start of the first junction
const ROUTE_SPACING = 480;      // metres between junctions (multiple of the 60m chunk length)
const ROUTE_LOCK_LENGTH = 45;   // metres before the gate where lane bollards lock you in
const ROUTE_LANES = [-5.4, -1.8, 1.8, 5.4];

const ROUTE_OPTIONS = [
  { id: 'time', icon: '⏱', title: '+6 SEC', sub: 'Shortcut', color: '#16a34a' },
  { id: 'nitro', icon: '🔥', title: 'FULL NITRO', sub: 'Dhaba fuel', color: '#0284c7' },
  { id: 'double', icon: '💰', title: '2X SCORE', sub: 'For 15 sec', color: '#ca8a04' },
  { id: 'rush', icon: '🚦', title: 'RUSH HOUR', sub: '3x near-miss', color: '#dc2626' },
  { id: 'clear', icon: '🛣', title: 'OPEN ROAD', sub: 'Traffic cleared', color: '#7c3aed' },
  { id: 'cash', icon: '🪙', title: '+2500', sub: 'Toll refund', color: '#0f766e' },
  { id: 'mystery', icon: '❓', title: 'MYSTERY', sub: 'Feeling lucky?', color: '#be185d' }
];

// Is this chunk start (zPos, negative going forward) the one that hosts a junction?
function isRouteChunk(zPos, chunkLength = 60) {
  const d = -zPos;
  if (d < ROUTE_FIRST_Z - chunkLength * 0.5) return false;
  const k = Math.round((d - ROUTE_FIRST_Z) / ROUTE_SPACING);
  return k >= 0 && Math.abs(d - (ROUTE_FIRST_Z + k * ROUTE_SPACING)) < chunkLength * 0.5;
}

// Is this chunk close to a junction (keep its approach clear of hazards)?
function nearRouteJunction(zPos, before = 120, after = 40) {
  const d = -zPos;
  const k = Math.round((d - ROUTE_FIRST_Z) / ROUTE_SPACING);
  for (const kk of [k - 1, k, k + 1]) {
    if (kk < 0) continue;
    const j = ROUTE_FIRST_Z + kk * ROUTE_SPACING;
    if (d > j - before && d < j + after) return true;
  }
  return false;
}

// Pick one distinct option per lane (left to right)
function pickRouteOptions(rng = Math.random) {
  const pool = ROUTE_OPTIONS.slice();
  const picked = [];
  while (picked.length < ROUTE_LANES.length) {
    picked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return picked;
}

// Resolve a mystery box into a real effect (or a cheeky challan)
function resolveMystery(rng = Math.random) {
  const outcomes = ROUTE_OPTIONS.filter(o => o.id !== 'mystery');
  if (rng() < 0.25) {
    return { id: 'challan', icon: '🚓', title: 'CHALLAN -750', sub: 'Caught by traffic police', color: '#475569' };
  }
  return outcomes[Math.floor(rng() * outcomes.length)];
}

// Index of the lane nearest to a lateral offset
function nearestLaneIndex(offset) {
  let best = 0;
  ROUTE_LANES.forEach((l, i) => {
    if (Math.abs(offset - l) < Math.abs(offset - ROUTE_LANES[best])) best = i;
  });
  return best;
}

if (typeof window !== 'undefined') {
  Object.assign(window, {
    ROUTE_OPTIONS, ROUTE_LANES, ROUTE_LOCK_LENGTH,
    isRouteChunk, nearRouteJunction, pickRouteOptions, resolveMystery, nearestLaneIndex
  });
}

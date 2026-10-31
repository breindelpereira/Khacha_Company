// Procedural Endless Highway & Terrain Generator for NH Odyssey
// Generates winding highway curves, elevation, road markings, and roadside scenery chunks

const BRANCH_LENGTH = 650; // metres a branch road runs before it disappears into the haze

class RoadManager {
  constructor(scene) {
    this.scene = scene;
    this.chunkLength = 60; // Length of each road chunk in units (meters)
    this.visibleChunks = 10; // Number of chunks rendered ahead (~600m view distance)
    this.roadWidth = 16; // 4-lane highway (4m per lane)
    this.chunks = [];
    this.activeScenery = [];
    this.currentChunkIndex = 0;

    // Biome Materials
    this.matAsphalt = new THREE.MeshLambertMaterial({ color: 0x22262e });
    this.matShoulderRural = new THREE.MeshLambertMaterial({ color: 0x926c45 }); // Dusty gravel shoulder
    this.matShoulderExpress = new THREE.MeshLambertMaterial({ color: 0x475569 }); // Paved asphalt shoulder
    this.matShoulderUrban = new THREE.MeshLambertMaterial({ color: 0x334155 }); // Concrete urban curb

    this.matTerrainRural = new THREE.MeshLambertMaterial({ color: 0x8a724d });  // Warm Indian earth / fields
    this.matTerrainExpress = new THREE.MeshLambertMaterial({ color: 0x2d4a22 }); // Lush green highway verges
    this.matTerrainUrban = new THREE.MeshLambertMaterial({ color: 0x1e293b });  // Dark urban tarmac landscape
    this.matTerrainGhat = new THREE.MeshLambertMaterial({ color: 0x24522f });   // Monsoon-green Western Ghats
    this.matShoulderGhat = new THREE.MeshLambertMaterial({ color: 0x57534e });  // Wet laterite gravel
    this.matTerrainCoast = new THREE.MeshLambertMaterial({ color: 0xe2c48f });  // Konkan beach sand
    this.matShoulderCoast = new THREE.MeshLambertMaterial({ color: 0xd6b37a });
    this.matSea = new THREE.MeshLambertMaterial({ color: 0x0ea5e9 });
    this.matPillar = new THREE.MeshLambertMaterial({ color: 0x9ca3af });
    this.matBranchAsphalt = new THREE.MeshLambertMaterial({ color: 0x2a2e36 });
    this.matBranchSkirt = new THREE.MeshLambertMaterial({ color: 0x7c5f3e });
    this._branchDashGeo = new THREE.PlaneGeometry(0.2, 3.5);
    this._branchDashGeo.rotateX(-Math.PI / 2);
    this.matParapet = new THREE.MeshLambertMaterial({ color: 0xe5e7eb });

    // Chosen routes: [{ gateZ, routeId, side }], set as the player commits at each junction
    this.routePlan = [];
    // The road NOT taken at each junction, kept as real geometry that traffic can drive down
    this.branches = [];

    this.matMedian = new THREE.MeshLambertMaterial({ color: 0x334155 });   // Concrete median divider
    this.matWhiteLine = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.matYellowLine = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    // Procedural curve parameters (Smooth winding highway like Slow Roads)
    this.curveSeed = Math.random() * 1000;
  }

  // Get Biome based on distance along NH-44 (Z position) - Ultra-Fast 40s Sprint Progression
  // 0 - 180m: Rural Foothills (Dhabas, Indie Dogs, Trees, Sugarcane Tractor)
  // 180m - 540m: Expressway & Industrial Corridor (FASTag Toll Plaza at ~300m, Gantries, Streetlights)
  // 540m+: Cyber-Desi Neon Urban Outskirts (IT Park Towers, Concrete Flyovers, Neon Billboards)
  getBiome(z) {
    const route = this.getRouteAt(z);
    if (route) return route.biome;
    const dist = Math.abs(z);
    if (dist < 180) return 'rural';
    if (dist < 540) return 'expressway';
    return 'urban';
  }

  // Route segment governing z: the latest junction gate at or behind z
  getRouteSegment(z) {
    let best = null;
    for (const entry of this.routePlan) {
      if (entry.gateZ >= z && (!best || entry.gateZ < best.gateZ)) best = entry;
    }
    return best ? { entry: best, d: best.gateZ - z } : null;
  }

  // The route in force at z (only once its scenery starts, ROUTE_START metres past the gate)
  getRouteAt(z) {
    const seg = this.getRouteSegment(z);
    if (!seg || seg.d < window.ROUTE_START) return null;
    return window.ROUTES[seg.entry.routeId];
  }

  getRouteShape(z) {
    const seg = this.getRouteSegment(z);
    if (!seg) return null;
    return window.routeShape(window.ROUTES[seg.entry.routeId], seg.d, seg.entry.side);
  }

  // Commit a route at a junction and rebuild the road beyond the gate in its shape.
  // The other carriageway becomes a branch road that peels off towards `otherRouteId`.
  setRoute(gateZ, routeId, side, otherRouteId = null) {
    this.routePlan = this.routePlan.filter(e => e.gateZ !== gateZ);
    this.routePlan.push({ gateZ, routeId, side });
    if (otherRouteId && !this.branches.some(b => b.gateZ === gateZ)) {
      this.buildBranch(gateZ, window.ROUTES[otherRouteId], 1 - side);
    }
    const limit = gateZ - window.ROUTE_START;
    const stale = this.chunks.filter(c => c.userData.zPos <= limit);
    stale.forEach(c => this.scene.remove(c));
    this.chunks = this.chunks.filter(c => c.userData.zPos > limit);
    stale.map(c => c.userData.zPos).sort((a, b) => b - a).forEach(z => this.createChunk(z));
  }

  // How far the branch centreline sits from the main road centre, d metres past its gate
  static branchSeparation(d) {
    return 3.6 + 220 * window.smoothstep(30, BRANCH_LENGTH, d);
  }

  // Build the road not taken: a 2-lane road on an embankment (or flyover piers) peeling away
  buildBranch(gateZ, route, side) {
    const sign = side === 0 ? -1 : 1;
    const samples = [];
    for (let d = 20; d <= BRANCH_LENGTH; d += 5) {
      const z = gateZ - d;
      const sep = RoadManager.branchSeparation(d);
      const lift = route.lift * window.smoothstep(80, 220, d);
      // Slightly below the main road while the two overlap, so the main surface wins
      const y = this.getGroundElevation(z) + lift - (sep < 10 ? 0.04 : 0);
      samples.push({ d, z, x: this.getRoadCurve(z) + sign * sep, y, lift });
    }
    samples.forEach((p, i) => {
      const a = samples[Math.max(0, i - 1)];
      const b = samples[Math.min(samples.length - 1, i + 1)];
      // Heading in the XZ plane (forward = -Z), same convention as getRoadAngle
      p.angle = Math.atan2(-(b.x - a.x), a.z - b.z);
    });

    const group = new THREE.Group();
    const hw = 4.0;          // 2 lanes
    const shoulder = 1.6;
    const roadV = [], shoulderV = [], skirtV = [];
    samples.forEach(p => {
      // Perpendicular to the heading
      const px = Math.cos(p.angle), pz = -Math.sin(p.angle);
      const at = (off, dy) => [p.x + px * off, p.y + dy, p.z + pz * off];
      roadV.push(...at(-hw, 0), ...at(hw, 0));
      shoulderV.push(...at(-hw - shoulder, -0.05), ...at(-hw, 0), ...at(hw, 0), ...at(hw + shoulder, -0.05));
      const drop = p.lift > 0.8 ? 0.6 : 4.5; // embankment unless it's up on piers
      skirtV.push(...at(-hw - shoulder, -0.05), ...at(-hw - shoulder - 3.5, -drop), ...at(hw + shoulder, -0.05), ...at(hw + shoulder + 3.5, -drop));
    });
    const n = samples.length - 1;
    const ribbon = (verts, stride, pairs, mat) => {
      const geo = new THREE.BufferGeometry();
      const idx = [];
      for (let i = 0; i < n; i++) {
        pairs.forEach(([l, r]) => {
          const a = i * stride + l, b = i * stride + r, c = (i + 1) * stride + l, d2 = (i + 1) * stride + r;
          idx.push(a, b, c, b, d2, c);
        });
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.material.side = THREE.DoubleSide;
      return mesh;
    };
    group.add(ribbon(roadV, 2, [[0, 1]], this.matBranchAsphalt));
    group.add(ribbon(shoulderV, 4, [[0, 1], [2, 3]], this.matShoulderExpress));
    group.add(ribbon(skirtV, 4, [[0, 1], [2, 3]], this.matBranchSkirt));

    // Dashed centre line, flyover piers, parapets
    samples.forEach((p, i) => {
      if (i % 2 === 0 && p.d > 40) {
        const dash = new THREE.Mesh(this._branchDashGeo, this.matWhiteLine);
        dash.position.set(p.x, p.y + 0.03, p.z);
        dash.rotation.y = p.angle;
        group.add(dash);
      }
      if (p.lift > 0.8 && i % 4 === 0) {
        const pierH = p.lift + 2;
        const pier = new THREE.Mesh(new THREE.BoxGeometry(1.8, pierH, 1.4), this.matPillar);
        pier.position.set(p.x, p.y - pierH / 2 - 0.3, p.z);
        pier.rotation.y = p.angle;
        group.add(pier);
      }
    });

    // Destination sign at the start of the branch
    const start = samples.find(p => p.d >= 70) || samples[0];
    const sign_ = window.sceneryBuilder.createBranchSign(route, sign < 0 ? '↖' : '↗');
    sign_.position.set(start.x + sign * 6.5, start.y, start.z);
    sign_.rotation.y = start.angle;
    group.add(sign_);

    this.scene.add(group);
    this.branches.push({ gateZ, side, sign, route, group, samples });
  }

  // Position on a branch at world z (interpolated), or null if off its ends
  sampleBranch(branch, z) {
    const d = branch.gateZ - z;
    const s = branch.samples;
    if (d < s[0].d || d > s[s.length - 1].d) return null;
    const i = Math.min(s.length - 2, Math.floor((d - s[0].d) / 5));
    const a = s[i], b = s[i + 1];
    const t = (d - a.d) / (b.d - a.d);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: a.angle + (b.angle - a.angle) * t, d };
  }

  // Would roadside scenery at (z, lateral offset from the main road centre) sit on a branch road?
  onBranch(z, lateral) {
    return this.branches.some(b => {
      const d = b.gateZ - z;
      if (d < 20 || d > BRANCH_LENGTH) return false;
      if (Math.sign(lateral) !== b.sign) return false;
      return Math.abs(Math.abs(lateral) - RoadManager.branchSeparation(d)) < 16;
    });
  }

  // Get road center X offset at distance Z
  getRoadCurve(z) {
    // Keep first 60m straight so vehicle and camera spawn perfectly aligned
    const blend = Math.min(Math.max(-z / 60.0, 0), 1.0);
    const zScaled = z * 0.0025;
    const curve = Math.sin(zScaled) * 36 + Math.sin(zScaled * 0.45) * 18;
    const shape = this.routePlan.length ? this.getRouteShape(z) : null;
    return curve * blend + (shape ? shape.curve : 0);
  }

  // Ground height (terrain & roadside scenery) - rolling hills plus route hills
  getGroundElevation(z) {
    const blend = Math.min(Math.max(-z / 80.0, 0), 1.0);
    const zScaled = z * 0.0018;
    const shape = this.routePlan.length ? this.getRouteShape(z) : null;
    return Math.sin(zScaled * 0.8) * 3.2 * blend + (shape ? shape.hill : 0);
  }

  // Road deck height: ground plus any flyover lift
  getRoadElevation(z) {
    const shape = this.routePlan.length ? this.getRouteShape(z) : null;
    return this.getGroundElevation(z) + (shape ? shape.lift : 0);
  }

  // Get Road Center Position (Vector3) at any Z
  getRoadPoint(z) {
    return new THREE.Vector3(this.getRoadCurve(z), this.getRoadElevation(z), z);
  }

  // Get road slope / tangent angle at distance Z
  getRoadAngle(z) {
    const delta = 1.0;
    // Step forward in -Z: from z + delta to z - delta
    const xAhead = this.getRoadCurve(z - delta);
    const xBehind = this.getRoadCurve(z + delta);
    const dx = xAhead - xBehind; // lateral displacement as z decreases (moving forward)
    const dz = delta * 2.0;       // distance along Z
    // In Three.js with forward = -Z: turning right (dx > 0) is negative Y rotation
    return Math.atan2(-dx, dz);
  }

  // Initialize starting road chunks
  init(startZ = 0) {
    for (let i = -2; i < this.visibleChunks; i++) {
      this.createChunk(startZ - i * this.chunkLength);
    }
  }

  // Clear existing chunks and rebuild fresh road from startZ
  reset(startZ = 0) {
    this.chunks.forEach(chunk => {
      this.scene.remove(chunk);
    });
    this.chunks = [];
    this.routePlan = [];
    this.branches.forEach(b => this.scene.remove(b.group));
    this.branches = [];
    this.init(startZ);
  }

  // Generate a single chunk of road, shoulders, and terrain
  createChunk(zPos) {
    const group = new THREE.Group();
    const segments = 12; // Smooth curve interpolation
    const dz = this.chunkLength / segments;

    // Build ribbon geometry for road and shoulders
    const roadGeo = new THREE.BufferGeometry();
    const shoulderLGeo = new THREE.BufferGeometry();
    const shoulderRGeo = new THREE.BufferGeometry();
    const terrainGeo = new THREE.BufferGeometry();

    const roadVerts = [], roadNorms = [], roadUVs = [], roadIndices = [];
    const shLVerts = [], shRVerts = [];
    const terrVerts = [], terrIndices = [];

    let vertIndex = 0;
    let terrIndex = 0;
    // On the Konkan coast the left-hand beach slopes down under the sea
    const coastDrop = this.getBiome(zPos - this.chunkLength * 0.5) === 'coastal' ? 7 : 0;

    for (let i = 0; i <= segments; i++) {
      const z = zPos - i * dz;
      const xCenter = this.getRoadCurve(z);
      const yCenter = this.getRoadElevation(z);
      const yGround = this.getGroundElevation(z);

      const hw = this.roadWidth * 0.5;
      const shWidth = 4.0; // Shoulder width
      const terrWidth = 140.0; // Distant landscape width

      // Road vertices: Left edge, Center, Right edge
      roadVerts.push(xCenter - hw, yCenter, z);
      roadVerts.push(xCenter + hw, yCenter, z);

      roadNorms.push(0, 1, 0, 0, 1, 0);
      roadUVs.push(0, i / segments, 1, i / segments);

      // Shoulders
      shLVerts.push(xCenter - hw - shWidth, yCenter - 0.1, z);
      shLVerts.push(xCenter - hw, yCenter, z);

      shRVerts.push(xCenter + hw, yCenter, z);
      shRVerts.push(xCenter + hw + shWidth, yCenter - 0.1, z);

      // Terrain left and right
      terrVerts.push(xCenter - hw - shWidth - terrWidth, yGround - 2.5 - coastDrop + Math.sin(z * 0.01) * 3 * (coastDrop ? 0.2 : 1), z);
      terrVerts.push(xCenter - hw - shWidth, yGround - 0.1, z);
      terrVerts.push(xCenter + hw + shWidth, yGround - 0.1, z);
      terrVerts.push(xCenter + hw + shWidth + terrWidth, yGround - 2.5 + Math.cos(z * 0.01) * 3, z);

      if (i < segments) {
        // Road quads (2 triangles)
        const row = i * 2;
        roadIndices.push(row, row + 1, row + 2);
        roadIndices.push(row + 1, row + 3, row + 2);

        // Terrain quads
        const tRow = i * 4;
        // Left terrain
        terrIndices.push(tRow, tRow + 1, tRow + 4);
        terrIndices.push(tRow + 1, tRow + 5, tRow + 4);
        // Right terrain
        terrIndices.push(tRow + 2, tRow + 3, tRow + 6);
        terrIndices.push(tRow + 3, tRow + 7, tRow + 6);
      }
    }

    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVerts, 3));
    roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNorms, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUVs, 2));
    roadGeo.setIndex(roadIndices);

    const roadMesh = new THREE.Mesh(roadGeo, this.matAsphalt);
    roadMesh.receiveShadow = true;
    group.add(roadMesh);

    // Select Biome Materials
    const biome = this.getBiome(zPos);
    let terrMat = this.matTerrainRural;
    let shMat = this.matShoulderRural;
    if (biome === 'expressway') {
      terrMat = this.matTerrainExpress;
      shMat = this.matShoulderExpress;
    } else if (biome === 'urban') {
      terrMat = this.matTerrainUrban;
      shMat = this.matShoulderUrban;
    } else if (biome === 'ghat') {
      terrMat = this.matTerrainGhat;
      shMat = this.matShoulderGhat;
    } else if (biome === 'coastal') {
      terrMat = this.matTerrainCoast;
      shMat = this.matShoulderCoast;
    }

    // Shoulder meshes
    const shLMesh = this.buildRibbonMesh(shLVerts, segments, shMat);
    const shRMesh = this.buildRibbonMesh(shRVerts, segments, shMat);
    group.add(shLMesh, shRMesh);

    // Terrain mesh
    terrainGeo.setAttribute('position', new THREE.Float32BufferAttribute(terrVerts, 3));
    terrainGeo.computeVertexNormals();
    terrainGeo.setIndex(terrIndices);
    const terrMesh = new THREE.Mesh(terrainGeo, terrMat);
    terrMesh.receiveShadow = true;
    group.add(terrMesh);

    // Road Markings (Dashed white lane lines & yellow border lines)
    this.addRoadMarkings(group, zPos, segments, dz);

    // Route structures: flyover piers & parapets, the Konkan sea
    this.addRouteStructures(group, zPos, segments, dz, biome);

    // Populate Scenery on this chunk
    const sceneryItems = this.populateChunkScenery(group, zPos);

    group.userData = {
      zPos: zPos,
      scenery: sceneryItems,
      biome: biome
    };

    this.scene.add(group);
    this.chunks.push(group);
  }

  addRouteStructures(group, zPos, segments, dz, biome) {
    const hw = this.roadWidth * 0.5;
    for (let i = 0; i <= segments; i += 3) {
      const z = zPos - i * dz;
      const deck = this.getRoadElevation(z);
      const ground = this.getGroundElevation(z);
      const lift = deck - ground;
      if (lift < 0.8) continue;
      const x = this.getRoadCurve(z);
      const angle = this.getRoadAngle(z);
      // Hammerhead pier under the deck
      const pierH = lift + 1.5;
      const pier = new THREE.Mesh(new THREE.BoxGeometry(2.2, pierH, 1.6), this.matPillar);
      pier.position.set(x, ground - 1.5 + pierH / 2 - 0.4, z);
      pier.rotation.y = angle;
      group.add(pier);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 6, 0.8, 1.8), this.matPillar);
      cap.position.set(x, deck - 0.6, z);
      cap.rotation.y = angle;
      group.add(cap);
    }
    // Crash-barrier parapets along the deck edges while elevated
    for (let i = 0; i < segments; i += 2) {
      const z = zPos - (i + 1) * dz;
      const deck = this.getRoadElevation(z);
      if (deck - this.getGroundElevation(z) < 0.8) continue;
      const x = this.getRoadCurve(z);
      const angle = this.getRoadAngle(z);
      [-1, 1].forEach(side => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.0, dz * 2 + 0.2), this.matParapet);
        wall.position.set(x + side * (hw + 3.8), deck + 0.45, z);
        wall.rotation.y = angle;
        group.add(wall);
      });
    }
    // Arabian Sea along the left of the Konkan coast
    if (biome === 'coastal') {
      const midZ = zPos - this.chunkLength * 0.5;
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(260, this.chunkLength + 2), this.matSea);
      sea.rotation.x = -Math.PI / 2;
      sea.position.set(this.getRoadCurve(midZ) - hw - 4 - 30 - 130, this.getGroundElevation(midZ) - 1.2, midZ);
      group.add(sea);
    }
  }

  buildRibbonMesh(verts, segments, material) {
    const geo = new THREE.BufferGeometry();
    const indices = [];
    for (let i = 0; i < segments; i++) {
      const row = i * 2;
      indices.push(row, row + 1, row + 2);
      indices.push(row + 1, row + 3, row + 2);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    geo.setIndex(indices);
    return new THREE.Mesh(geo, material);
  }

  // Add painted lines and central divider
  addRoadMarkings(group, zPos, segments, dz) {
    // 4 Lanes: Lane dividers at -4m and +4m from center
    const laneXOffsets = [-4.0, 4.0];
    const hw = this.roadWidth * 0.5;

    for (let i = 0; i < segments; i += 2) {
      const z = zPos - i * dz;
      const x = this.getRoadCurve(z);
      const y = this.getRoadElevation(z) + 0.02;
      const angle = this.getRoadAngle(z);

      // Dashed lane marks
      laneXOffsets.forEach(laneX => {
        const dashGeo = new THREE.PlaneGeometry(0.2, 3.5);
        dashGeo.rotateX(-Math.PI / 2);
        const dash = new THREE.Mesh(dashGeo, this.matWhiteLine);
        dash.position.set(x + laneX, y, z);
        dash.rotation.y = angle;
        group.add(dash);
      });

      // Yellow road edge solid lines
      [-hw + 0.4, hw - 0.4].forEach(edgeX => {
        const edgeGeo = new THREE.PlaneGeometry(0.25, dz * 2);
        edgeGeo.rotateX(-Math.PI / 2);
        const edge = new THREE.Mesh(edgeGeo, this.matYellowLine);
        edge.position.set(x + edgeX, y, z - dz * 0.5);
        edge.rotation.y = angle;
        group.add(edge);
      });
    }

    // Concrete median divider in the center
    const medianGeo = new THREE.BoxGeometry(0.8, 0.4, this.chunkLength);
    const median = new THREE.Mesh(medianGeo, this.matMedian);
    const midZ = zPos - this.chunkLength * 0.5;
    median.position.set(this.getRoadCurve(midZ), this.getRoadElevation(midZ) + 0.2, midZ);
    median.rotation.y = this.getRoadAngle(midZ);
    group.add(median);
  }

  // Populate Indian scenery, hazards, and biome architecture along this chunk
  populateChunkScenery(group, zPos) {
    const items = [];
    const chunkMidZ = zPos - this.chunkLength * 0.5;
    const xCenter = this.getRoadCurve(chunkMidZ);
    const yCenter = this.getRoadElevation(chunkMidZ);
    const yGround = this.getGroundElevation(chunkMidZ);
    const elevated = yCenter - yGround > 0.8; // on the flyover deck
    const angle = this.getRoadAngle(chunkMidZ);
    const biome = this.getBiome(chunkMidZ);
    const route = this.getRouteAt(chunkMidZ);

    // =========================================================================
    // 1. FASTag ELECTRONIC TOLL PLAZA EVENT (Located in Expressway at ~300m and ~900m)
    // 4 Lanes: 2 Green Open Lanes (grant +1500 PTS) vs 2 Closed Red Boom Barriers
    // =========================================================================
    if (Math.abs(zPos - (-300)) < this.chunkLength * 0.5 || Math.abs(zPos - (-900)) < this.chunkLength * 0.5) {
      const toll = window.sceneryBuilder.createTollPlaza({ openLanes: [-1.8, 1.8] });
      toll.position.set(xCenter, yCenter, chunkMidZ);
      toll.rotation.y = angle;
      group.add(toll);
      items.push(toll);
    }

    // =========================================================================
    // 1b. ROUTE CHOICE JUNCTION: a deal over each lane, bollards lock you into a lane
    // for the last ROUTE_LOCK_LENGTH metres; your lane at the gate picks the route.
    // =========================================================================
    if (window.isRouteChunk && window.isRouteChunk(zPos, this.chunkLength)) {
      const options = window.pickRouteOptions();
      const gate = window.sceneryBuilder.createRouteGantry(options, window.ROUTE_SIDES);
      gate.position.set(xCenter, yCenter, chunkMidZ);
      gate.rotation.y = angle;
      gate.userData = { isRouteGate: true, options, resolved: false, decided: false, lockedSide: null };
      group.add(gate);
      items.push(gate);

      // Concrete jersey barrier down the centre: splits the carriageways for the lock zone and past the gate
      for (let dz = -26; dz <= window.ROUTE_LOCK_LENGTH; dz += 4) {
        const bz = chunkMidZ + dz;
        const wall = window.sceneryBuilder.createJerseyBarrier();
        wall.position.set(this.getRoadCurve(bz), this.getRoadElevation(bz), bz);
        wall.rotation.y = this.getRoadAngle(bz);
        group.add(wall);
      }
    }
    const nearJunction = window.nearRouteJunction ? window.nearRouteJunction(zPos) : false;

    // =========================================================================
    // 2. HIGHWAY CONSTRUCTION BARRICADES & DIVERSIONS (Every ~240m, not at toll)
    // Red/white barricades, orange cones, and blinking amber beacons blocking 1 lane
    // =========================================================================
    if (!nearJunction && Math.abs(zPos) > 120 && Math.abs(zPos % 240) < this.chunkLength && Math.abs(zPos - (-300)) > 60 && Math.abs(zPos - (-900)) > 60) {
      const candidateLanes = [-5.4, -1.8, 1.8, 5.4];
      const laneX = candidateLanes[Math.floor(Math.random() * candidateLanes.length)];
      const barricade = window.sceneryBuilder.createConstructionZone(laneX);
      barricade.position.set(xCenter, yCenter, chunkMidZ);
      barricade.rotation.y = angle;
      group.add(barricade);
      items.push(barricade);
    }

    // =========================================================================
    // 3. OVERLOADED SUGARCANE TRACTOR-TROLLEY (Rural Foothills Biome Only)
    // Slow lumbering agricultural hazard in the slow lanes
    // =========================================================================
    if (biome === 'rural' && Math.abs(zPos) > 60 && Math.abs(zPos) < 180) {
      const tractor = window.sceneryBuilder.createTractorObstacle();
      const slowLanes = [-5.4, 5.4];
      const laneX = slowLanes[Math.floor(Math.random() * slowLanes.length)];
      const tZ = chunkMidZ + (Math.random() * 8 - 4);
      tractor.position.set(this.getRoadCurve(tZ) + laneX, this.getRoadElevation(tZ), tZ);
      tractor.rotation.y = this.getRoadAngle(tZ);
      group.add(tractor);
      items.push(tractor);
    }

    // =========================================================================
    // 4. HIGHWAY SODIUM STREETLIGHTS (Expressway & Urban Biomes)
    // 8.2m steel poles with cantilevered arms & warm sodium glow on road shoulders
    // =========================================================================
    if (biome === 'expressway' || biome === 'urban') {
      const lightL = window.sceneryBuilder.createStreetLight(-1);
      lightL.position.set(xCenter - (this.roadWidth * 0.5 + 1.2), yCenter, chunkMidZ);
      lightL.rotation.y = angle;
      group.add(lightL);
      items.push(lightL);

      const lightR = window.sceneryBuilder.createStreetLight(1);
      lightR.position.set(xCenter + (this.roadWidth * 0.5 + 1.2), yCenter, chunkMidZ);
      lightR.rotation.y = angle;
      group.add(lightR);
      items.push(lightR);
    }

    // =========================================================================
    // 5. OVERHEAD EXPRESSWAY DESTINATION SIGN GANTRY (Expressway Corridor)
    // "MUMBAI 120 KM • PUNE 45 KM • NH-44 SPEEDWAY"
    // =========================================================================
    if (biome === 'expressway' && Math.abs(zPos - (-420)) < this.chunkLength * 0.5) {
      const gantry = window.sceneryBuilder.createSignGantry();
      gantry.position.set(xCenter, yCenter, chunkMidZ);
      gantry.rotation.y = angle;
      group.add(gantry);
      items.push(gantry);
    }

    // =========================================================================
    // 6. URBAN IT PARK TOWERS & CONCRETE FLYOVERS (Urban Outskirts Biome)
    // Illuminated glass windows, rooftop beacons, and bridge overpasses
    // =========================================================================
    if (biome === 'urban') {
      [-1, 1].forEach(side => {
        const height = 32 + Math.random() * 32;
        const tower = window.sceneryBuilder.createUrbanBuilding(side, height);
        const dist = this.roadWidth * 0.5 + 16.0 + Math.random() * 20.0;
        const bZ = chunkMidZ + (Math.random() * 20 - 10);
        if (this.onBranch(bZ, side * dist)) return;
        tower.position.set(this.getRoadCurve(bZ) + side * dist, this.getGroundElevation(bZ), bZ);
        tower.rotation.y = angle;
        group.add(tower);
        items.push(tower);
      });

      // Flyover bridge overpass every ~240m
      if (!elevated && !route && Math.abs(zPos % 240) < this.chunkLength) {
        const flyover = window.sceneryBuilder.createFlyover();
        flyover.position.set(xCenter, yCenter, chunkMidZ);
        flyover.rotation.y = angle;
        group.add(flyover);
        items.push(flyover);
      }
    }

    // =========================================================================
    // 7. ROADSIDE DHABA (Rural & Expressway)
    // Authentic charpais, glowing string lights, tandoor hut
    // =========================================================================
    if ((biome === 'rural' || biome === 'expressway') && Math.abs(zPos % 180) < this.chunkLength && !this.onBranch(chunkMidZ, 16)) {
      const dhaba = window.sceneryBuilder.createDhaba();
      dhaba.position.set(xCenter + 16, yGround, chunkMidZ);
      dhaba.rotation.y = angle - Math.PI / 2;
      group.add(dhaba);
      items.push(dhaba);
    }

    // =========================================================================
    // 8. THE INDIE DOG (Rural Biome Only - STRICTLY NO COWS)
    // Lounging calmly by the highway shoulder
    // =========================================================================
    if (biome === 'rural' && !elevated && Math.random() < 0.6) {
      const dogPose = Math.random() < 0.5 ? 'sitting' : 'sleeping';
      const dog = window.sceneryBuilder.createIndieDog(dogPose);
      const side = Math.random() < 0.5 ? -1 : 1;
      dog.position.set(xCenter + side * (this.roadWidth * 0.5 + 2.5), yCenter, chunkMidZ + (Math.random() * 20 - 10));
      dog.rotation.y = angle + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
      group.add(dog);
      items.push(dog);
    }

    // =========================================================================
    // 9. MEME POWER-UP PICKUPS (Every ~180m)
    // Adapts to selected vehicle: Sting Red for Swift, Vimal for Truck, Chai for Auto
    // =========================================================================
    const pickupSpacing = (route && route.perk.pickupSpacing) || 180;
    if (!nearJunction && Math.abs(zPos) > 60 && Math.abs(zPos % pickupSpacing) < this.chunkLength && Math.abs(zPos - (-300)) > 50 && Math.abs(zPos - (-900)) > 50) {
      const vType = (window.game && window.game.selectedVehicle) || 'auto';
      const pickup = window.sceneryBuilder.createChaiPickup(vType);
      const lanes = [-5.4, -1.8, 1.8, 5.4];
      const laneX = lanes[Math.floor(Math.random() * lanes.length)];
      const chaiZ = chunkMidZ + (Math.random() * 10 - 5);
      pickup.position.set(this.getRoadCurve(chaiZ) + laneX, this.getRoadElevation(chaiZ), chaiZ);
      group.add(pickup);
      items.push(pickup);
    }

    // =========================================================================
    // 10. HIGHWAY BILLBOARDS (Every ~150m)
    // Authentic Desi advertisements & Khacha Company branding
    // =========================================================================
    const billboardSide = Math.random() < 0.5 ? -1 : 1;
    if (Math.abs(zPos % 150) < this.chunkLength && !this.onBranch(chunkMidZ, billboardSide * (this.roadWidth * 0.5 + 8))) {
      const billboard = window.sceneryBuilder.createHighwayBillboard(Math.floor(Math.abs(zPos / 150)));
      const side = billboardSide;
      billboard.position.set(xCenter + side * (this.roadWidth * 0.5 + 8.0), yGround, chunkMidZ);
      billboard.rotation.y = angle + (side > 0 ? -Math.PI * 0.45 : Math.PI * 0.45);
      group.add(billboard);
      items.push(billboard);
    }

    // =========================================================================
    // 11. TENDER COCONUT WATER CART (Rural Biome)
    // =========================================================================
    if ((biome === 'rural' || biome === 'coastal') && !elevated && Math.random() < 0.4) {
      const cart = window.sceneryBuilder.createCoconutCart();
      const side = Math.random() < 0.5 ? -1 : 1;
      cart.position.set(xCenter + side * (this.roadWidth * 0.5 + 3.2), yCenter, chunkMidZ + (Math.random() * 16 - 8));
      cart.rotation.y = angle + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
      group.add(cart);
      items.push(cart);
    }

    // =========================================================================
    // 12. MILESTONE STONE ("NH 44")
    // =========================================================================
    if (Math.abs(zPos % 120) < this.chunkLength) {
      const milestone = window.sceneryBuilder.createMilestone();
      milestone.position.set(xCenter + (this.roadWidth * 0.5 + 1.2), yCenter, chunkMidZ);
      milestone.rotation.y = angle;
      group.add(milestone);
      items.push(milestone);
    }

    // =========================================================================
    // 13. BANYAN & GULMOHAR TREES
    // Lush in rural/expressway; sparse in urban
    // =========================================================================
    // Ghat cliffs: mossy laterite rocks hugging the hillside
    if (biome === 'ghat') {
      for (let r = 0; r < 3; r++) {
        const rock = window.sceneryBuilder.createRockCliff();
        const side = r === 0 ? 1 : (Math.random() < 0.7 ? -1 : 1);
        const rZ = zPos - Math.random() * this.chunkLength;
        const rDist = this.roadWidth * 0.5 + 9 + Math.random() * 14;
        if (this.onBranch(rZ, side * rDist)) continue;
        rock.position.set(this.getRoadCurve(rZ) + side * rDist, this.getGroundElevation(rZ), rZ);
        group.add(rock);
        items.push(rock);
      }
    }

    const numTrees = biome === 'urban' ? (Math.random() < 0.4 ? 1 : 0) : (Math.floor(Math.random() * 2) + 2);
    for (let t = 0; t < numTrees; t++) {
      const isGulmohar = Math.random() < 0.45;
      const tree = biome === 'coastal' ? window.sceneryBuilder.createPalmTree()
        : (isGulmohar ? window.sceneryBuilder.createGulmoharTree() : window.sceneryBuilder.createBanyanTree());
      // Coconut palms line the land side of the coast
      const side = biome === 'coastal' ? (Math.random() < 0.75 ? 1 : -1) : (Math.random() < 0.5 ? -1 : 1);
      const dist = this.roadWidth * 0.5 + 6.0 + Math.random() * 15;
      const treeZ = zPos - Math.random() * this.chunkLength;
      if (this.onBranch(treeZ, side * dist)) continue;
      tree.position.set(this.getRoadCurve(treeZ) + side * dist, this.getGroundElevation(treeZ), treeZ);
      tree.scale.setScalar(0.85 + Math.random() * 0.4);
      group.add(tree);
      items.push(tree);
    }

    return items;
  }

  // Update chunks as player moves forward (endless recycling)
  update(playerZ) {
    // Drop branch roads the player has left far behind
    for (let i = this.branches.length - 1; i >= 0; i--) {
      if (playerZ < this.branches[i].gateZ - BRANCH_LENGTH - 60) {
        this.scene.remove(this.branches[i].group);
        this.branches.splice(i, 1);
      }
    }

    // Check if player has progressed past earliest chunks
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const chunk = this.chunks[i];
      // If chunk is 100m behind player, recycle it ahead
      if (chunk.userData.zPos > playerZ + 100) {
        this.scene.remove(chunk);
        this.chunks.splice(i, 1);

        // Find furthest chunk ahead
        let minZ = 0;
        this.chunks.forEach(c => {
          if (c.userData.zPos < minZ) minZ = c.userData.zPos;
        });

        // Spawn new chunk ahead
        this.createChunk(minZ - this.chunkLength);
      }
    }
  }
}

window.RoadManager = RoadManager;

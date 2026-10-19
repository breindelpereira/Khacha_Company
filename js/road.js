// Procedural Endless Highway & Terrain Generator for NH Odyssey
// Generates winding highway curves, elevation, road markings, and roadside scenery chunks

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

    this.matMedian = new THREE.MeshLambertMaterial({ color: 0x334155 });   // Concrete median divider
    this.matWhiteLine = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.matYellowLine = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    // Procedural curve parameters (Smooth winding highway like Slow Roads)
    this.curveSeed = Math.random() * 1000;
  }

  // Get Biome based on distance along NH-44 (Z position) - Fast 40s Sprint Progression
  // 0 - 450m: Rural Foothills (Dhabas, Indie Dogs, Trees, Sugarcane Tractor)
  // 450m - 1050m: Expressway & Industrial Corridor (FASTag Toll Plaza, Gantries, Streetlights)
  // 1050m+: Cyber-Desi Neon Urban Outskirts (IT Park Towers, Concrete Flyovers, Neon Billboards)
  getBiome(z) {
    const dist = Math.abs(z);
    if (dist < 450) return 'rural';
    if (dist < 1050) return 'expressway';
    return 'urban';
  }

  // Get road center X offset at distance Z
  getRoadCurve(z) {
    // Keep first 60m straight so vehicle and camera spawn perfectly aligned
    const blend = Math.min(Math.max(-z / 60.0, 0), 1.0);
    const zScaled = z * 0.0025;
    const curve = Math.sin(zScaled) * 36 + Math.sin(zScaled * 0.45) * 18;
    return curve * blend;
  }

  // Get road elevation Y offset at distance Z (Gentle rolling hills)
  getRoadElevation(z) {
    const blend = Math.min(Math.max(-z / 80.0, 0), 1.0);
    const zScaled = z * 0.0018;
    return Math.sin(zScaled * 0.8) * 3.2 * blend;
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

    for (let i = 0; i <= segments; i++) {
      const z = zPos - i * dz;
      const xCenter = this.getRoadCurve(z);
      const yCenter = this.getRoadElevation(z);

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
      terrVerts.push(xCenter - hw - shWidth - terrWidth, yCenter - 2.5 + Math.sin(z * 0.01) * 3, z);
      terrVerts.push(xCenter - hw - shWidth, yCenter - 0.1, z);
      terrVerts.push(xCenter + hw + shWidth, yCenter - 0.1, z);
      terrVerts.push(xCenter + hw + shWidth + terrWidth, yCenter - 2.5 + Math.cos(z * 0.01) * 3, z);

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
    const angle = this.getRoadAngle(chunkMidZ);
    const biome = this.getBiome(chunkMidZ);

    // =========================================================================
    // 1. FASTag ELECTRONIC TOLL PLAZA EVENT (Located in Expressway at ~720m)
    // 4 Lanes: 2 Green Open Lanes (grant +1500 PTS) vs 2 Closed Red Boom Barriers
    // =========================================================================
    if (Math.abs(zPos - (-720)) < this.chunkLength * 0.5) {
      const toll = window.sceneryBuilder.createTollPlaza({ openLanes: [-1.8, 1.8] });
      toll.position.set(xCenter, yCenter, chunkMidZ);
      toll.rotation.y = angle;
      group.add(toll);
      items.push(toll);
    }

    // =========================================================================
    // 2. HIGHWAY CONSTRUCTION BARRICADES & DIVERSIONS (Every ~360m, not at toll)
    // Red/white barricades, orange cones, and blinking amber beacons blocking 1 lane
    // =========================================================================
    if (Math.abs(zPos) > 240 && Math.abs(zPos % 360) < this.chunkLength && Math.abs(zPos - (-720)) > 90) {
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
    if (biome === 'rural' && Math.abs(zPos) > 120 && Math.abs(zPos % 240) < this.chunkLength) {
      const tractor = window.sceneryBuilder.createTractorObstacle();
      const slowLanes = [-5.4, 5.4];
      const laneX = slowLanes[Math.floor(Math.random() * slowLanes.length)];
      const tZ = chunkMidZ + (Math.random() * 12 - 6);
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
    if (biome === 'expressway' && Math.abs(zPos % 300) < this.chunkLength && Math.abs(zPos - (-720)) > 90) {
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
        tower.position.set(this.getRoadCurve(bZ) + side * dist, this.getRoadElevation(bZ), bZ);
        tower.rotation.y = angle;
        group.add(tower);
        items.push(tower);
      });

      // Flyover bridge overpass every ~300m
      if (Math.abs(zPos % 300) < this.chunkLength) {
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
    if ((biome === 'rural' || biome === 'expressway') && Math.abs(zPos % 180) < this.chunkLength) {
      const dhaba = window.sceneryBuilder.createDhaba();
      dhaba.position.set(xCenter + 16, yCenter, chunkMidZ);
      dhaba.rotation.y = angle - Math.PI / 2;
      group.add(dhaba);
      items.push(dhaba);
    }

    // =========================================================================
    // 8. THE INDIE DOG (Rural Biome Only - STRICTLY NO COWS)
    // Lounging calmly by the highway shoulder
    // =========================================================================
    if (biome === 'rural' && Math.random() < 0.6) {
      const dogPose = Math.random() < 0.5 ? 'sitting' : 'sleeping';
      const dog = window.sceneryBuilder.createIndieDog(dogPose);
      const side = Math.random() < 0.5 ? -1 : 1;
      dog.position.set(xCenter + side * (this.roadWidth * 0.5 + 2.5), yCenter, chunkMidZ + (Math.random() * 20 - 10));
      dog.rotation.y = angle + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
      group.add(dog);
      items.push(dog);
    }

    // =========================================================================
    // 9. MEME POWER-UP PICKUPS (Every ~240m)
    // Adapts to selected vehicle: Sting Red for Swift, Vimal for Truck, Chai for Auto
    // =========================================================================
    if (Math.abs(zPos) > 80 && Math.abs(zPos % 240) < this.chunkLength && Math.abs(zPos - (-720)) > 60) {
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
    if (Math.abs(zPos % 150) < this.chunkLength) {
      const billboard = window.sceneryBuilder.createHighwayBillboard(Math.floor(Math.abs(zPos / 150)));
      const side = Math.random() < 0.5 ? -1 : 1;
      billboard.position.set(xCenter + side * (this.roadWidth * 0.5 + 8.0), yCenter, chunkMidZ);
      billboard.rotation.y = angle + (side > 0 ? -Math.PI * 0.45 : Math.PI * 0.45);
      group.add(billboard);
      items.push(billboard);
    }

    // =========================================================================
    // 11. TENDER COCONUT WATER CART (Rural Biome)
    // =========================================================================
    if (biome === 'rural' && Math.random() < 0.4) {
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
    const numTrees = biome === 'urban' ? (Math.random() < 0.4 ? 1 : 0) : (Math.floor(Math.random() * 2) + 2);
    for (let t = 0; t < numTrees; t++) {
      const isGulmohar = Math.random() < 0.45;
      const tree = isGulmohar ? window.sceneryBuilder.createGulmoharTree() : window.sceneryBuilder.createBanyanTree();
      const side = Math.random() < 0.5 ? -1 : 1;
      const dist = this.roadWidth * 0.5 + 6.0 + Math.random() * 15;
      const treeZ = zPos - Math.random() * this.chunkLength;
      tree.position.set(this.getRoadCurve(treeZ) + side * dist, this.getRoadElevation(treeZ), treeZ);
      tree.scale.setScalar(0.85 + Math.random() * 0.4);
      group.add(tree);
      items.push(tree);
    }

    return items;
  }

  // Update chunks as player moves forward (endless recycling)
  update(playerZ) {
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

// Arcade Vehicle Physics, Player Controls, AI Traffic & Near-Miss Detection for NH Odyssey

class TrafficManager {
  constructor(scene, roadManager) {
    this.scene = scene;
    this.road = roadManager;
    this.vehicles = [];
    this.difficulty = window.Progress.difficultyForDistance(0);
    this.maxTraffic = this.difficulty.trafficCount; // Grows with distance
    this.laneWidth = 3.6;    // 4 Lanes: Left-Slow (-5.4m), Left-Fast (-1.8m), Right-Fast (+1.8m), Right-Slow (+5.4m)
    this.lanes = [-5.4, -1.8, 1.8, 5.4];

    // Player State
    this.player = null;
    this.vehicleType = 'auto'; // 'auto' | 'car' | 'truck'
    this.playerSpeed = 0; // Current speed in units/sec (1 unit = ~1 meter, 1 m/s = 3.6 km/h)
    this.playerMaxSpeed = 26.5; // ~95 km/h for Auto-Rickshaw
    this.playerAcceleration = 8.5; // Realistic progressive torque
    this.playerBraking = 16.0; // Firm, progressive braking
    this.playerDrag = 1.8;
    this.playerLateralOffset = 1.8; // Lateral offset from road center (-hw to +hw)
    this.playerLateralSpeed = 0;
    this.playerRoll = 0; // Visual lean on turns
    this.currentGear = 1;
    this.boostTimer = 0;
    this.invulnerableTimer = 0;
    this.chaiTimeBonus = 8; // Default Auto: +8s
    this.chaiBoostDuration = 3.5;

    // Stats
    this.distanceCovered = 0; // In meters
    this.nearMissCount = 0;
    this.hornCount = 0;
    this.chaiCount = 0;
    this.flowStreak = 1;
    this.score = 0;
    this.topSpeedKmh = 0;

    // Shockwave mesh for horn effect
    this.hornWave = this.createHornWave();
    this.scene.add(this.hornWave);
  }

  createHornWave() {
    const geo = new THREE.RingGeometry(0.5, 1.2, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    return mesh;
  }

  // Complete reset to clean spawn line (prevents death loops)
  reset(startZ = 0, vehicleType = null) {
    if (vehicleType) {
      this.vehicleType = vehicleType;
    }
    // Re-create player vehicle clean
    this.initPlayer(this.vehicleType, startZ);

    // Reset physics & momentum
    this.playerSpeed = 0;
    this.playerLateralSpeed = 0;
    this.playerLateralOffset = 1.8;
    this.playerRoll = 0;
    this.boostTimer = 0;
    this.invulnerableTimer = 2.5; // 2.5s safe grace period!

    if (this.player) {
      this.player.rotation.set(0, 0, 0);
      this.player.visible = true;
    }

    // Reset stats
    this.distanceCovered = 0;
    this.nearMissCount = 0;
    this.hornCount = 0;
    this.chaiCount = 0;
    this.flowStreak = 1;
    this.score = 0;
    this.topSpeedKmh = 0;
    this.currentGear = 1;
    this.difficulty = window.Progress.difficultyForDistance(0);
    this.maxTraffic = this.difficulty.trafficCount;

    // Clear and respawn fresh AI traffic at least 60m ahead
    this.initTraffic(startZ);
  }

  // Initialize Player Vehicle with vehicle selection
  initPlayer(vehicleType = 'auto', startZ = 0, spawnTraffic = true) {
    if (this.player) {
      this.scene.remove(this.player);
    }
    this.vehicleType = vehicleType;

    if (vehicleType === 'truck') {
      this.player = window.vehicleBuilder.createTataTruck({ cabColor: 0xd97706 });
      this.playerMaxSpeed = 22.5; // ~81 km/h
      this.playerAcceleration = 6.2;
      this.playerBraking = 14.0;
      this.chaiTimeBonus = 10; // +10s Dhaba Kulhad Chai
      this.chaiBoostDuration = 4.5;
    } else if (vehicleType === 'car') {
      this.player = window.vehicleBuilder.createMarutiSwift({
        bodyColor: 0xdc2626,
        hasBlackRoof: true
      });
      this.playerMaxSpeed = 33.0; // ~118 km/h
      this.playerAcceleration = 10.2;
      this.playerBraking = 18.0;
      this.chaiTimeBonus = 5; // +5s Sting Energy Surge
      this.chaiBoostDuration = 3.0;
    } else {
      // Auto-Rickshaw (Default)
      this.player = window.vehicleBuilder.createAutoRickshaw({
        primaryColor: 0x15803d,
        canopyColor: 0xfacc15
      });
      this.playerMaxSpeed = 26.5; // ~95 km/h
      this.playerAcceleration = 8.5;
      this.playerBraking = 16.0;
      this.chaiTimeBonus = 8; // +8s Kadak Cutting Chai
      this.chaiBoostDuration = 3.5;
    }

    this.player.position.set(this.road.getRoadCurve(startZ) + 1.8, this.road.getRoadElevation(startZ), startZ);
    this.scene.add(this.player);

    this.updatePickupVisuals(this.vehicleType);

    if (spawnTraffic) {
      // Populate initial AI Traffic ahead
      this.initTraffic(startZ);
    }
  }

  // Smooth real-time vehicle swap during gameplay or attract mode
  switchPlayerVehicle(vehicleType) {
    if (this.vehicleType === vehicleType && this.player) return;
    this.vehicleType = vehicleType;

    const oldPos = this.player ? this.player.position.clone() : new THREE.Vector3(1.8, 0, 0);
    const oldRot = this.player ? this.player.rotation.clone() : new THREE.Euler(0, 0, 0);

    if (this.player) {
      this.scene.remove(this.player);
    }

    if (vehicleType === 'truck') {
      this.player = window.vehicleBuilder.createTataTruck({ cabColor: 0xd97706 });
      this.playerMaxSpeed = 22.5; // ~81 km/h
      this.playerAcceleration = 6.2;
      this.playerBraking = 14.0;
      this.chaiTimeBonus = 10; // +10s Kesari Vimal Stamina
      this.chaiBoostDuration = 4.5;
    } else if (vehicleType === 'car') {
      this.player = window.vehicleBuilder.createMarutiSwift({
        bodyColor: 0xdc2626,
        hasBlackRoof: true
      });
      this.playerMaxSpeed = 33.0; // ~118 km/h
      this.playerAcceleration = 10.2;
      this.playerBraking = 18.0;
      this.chaiTimeBonus = 5; // +5s Sting Red Nitro
      this.chaiBoostDuration = 3.0;
    } else {
      // Auto-Rickshaw
      this.player = window.vehicleBuilder.createAutoRickshaw({
        primaryColor: 0x15803d,
        canopyColor: 0xfacc15
      });
      this.playerMaxSpeed = 26.5; // ~95 km/h
      this.playerAcceleration = 8.5;
      this.playerBraking = 16.0;
      this.chaiTimeBonus = 8; // +8s Kadak Cutting Chai
      this.chaiBoostDuration = 3.5;
    }

    this.player.position.copy(oldPos);
    this.player.rotation.copy(oldRot);
    this.scene.add(this.player);

    this.updatePickupVisuals(this.vehicleType);

    // Brief safety grace period so switching mid-flow doesn't cause immediate hit
    this.invulnerableTimer = Math.max(this.invulnerableTimer, 1.2);
  }

  // Update all highway pickups to match current player vehicle's meme item
  updatePickupVisuals(vehicleType) {
    if (!this.road || !this.road.chunks) return;
    this.road.chunks.forEach(chunk => {
      if (chunk.userData && chunk.userData.scenery) {
        chunk.userData.scenery.forEach(item => {
          if (item.userData && item.userData.isPickup && item.updateVehicleType) {
            item.updateVehicleType(vehicleType);
          }
        });
      }
    });
  }

  // Spawn initial AI traffic
  initTraffic(startZ) {
    // Clear existing
    this.vehicles.forEach(v => this.scene.remove(v.mesh));
    this.vehicles = [];

    for (let i = 0; i < this.maxTraffic; i++) {
      const zSpawn = startZ - 60 - (i * 35) - (Math.random() * 20);
      this.spawnAIVehicle(zSpawn);
    }
  }

  // Spawn a single AI vehicle (Tata Truck, Maruti Swift, or Auto)
  spawnAIVehicle(z) {
    const rand = Math.random();
    let mesh, type, speedKmh, width, length;

    if (rand < 0.45) {
      // 45% Tata Freight Truck ("Horn OK Please")
      mesh = window.vehicleBuilder.createTataTruck({
        cabColor: Math.random() < 0.5 ? 0x2563eb : 0xd97706
      });
      type = 'truck';
      speedKmh = 48 + Math.random() * 24; // 48 - 72 km/h
      width = 2.6;
      length = 7.5;
    } else if (rand < 0.8) {
      // 35% Maruti Suzuki Swift
      const swiftColors = [0xdc2626, 0xf8fafc, 0x475569, 0x1e3a8a];
      const randomColor = swiftColors[Math.floor(Math.random() * swiftColors.length)];
      mesh = window.vehicleBuilder.createMarutiSwift({
        bodyColor: randomColor,
        hasBlackRoof: Math.random() < 0.65
      });
      type = 'car';
      speedKmh = 76 + Math.random() * 26; // 76 - 102 km/h
      width = 1.74;
      length = 3.85;
    } else {
      // 20% Fellow Auto-Rickshaw
      mesh = window.vehicleBuilder.createAutoRickshaw();
      type = 'auto';
      speedKmh = 55 + Math.random() * 20; // 55 - 75 km/h
      width = 1.6;
      length = 3.2;
    }

    // Pick random lane
    const laneIndex = Math.floor(Math.random() * this.lanes.length);
    const laneOffset = this.lanes[laneIndex];

    const roadX = this.road.getRoadCurve(z);
    const roadY = this.road.getRoadElevation(z);
    const angle = this.road.getRoadAngle(z);

    mesh.position.set(roadX + laneOffset, roadY, z);
    mesh.rotation.y = angle;
    this.scene.add(mesh);

    const baseSpeed = speedKmh / 3.6;
    this.vehicles.push({
      mesh: mesh,
      type: type,
      speedUnits: baseSpeed,
      baseSpeedUnits: baseSpeed,
      targetSpeedUnits: baseSpeed,
      laneOffset: laneOffset,
      targetLaneOffset: laneOffset,
      laneChangeTimer: 2.0 + Math.random() * 4.5,
      laneChangeSpeed: type === 'car' ? 4.4 : (type === 'auto' ? 3.6 : 2.2),
      wanderPhase: Math.random() * Math.PI * 2,
      wanderAmp: type === 'auto' ? 0.35 : (type === 'truck' ? 0.22 : 0.12),
      brakeTimer: 0,
      messCooldown: 3.5 + Math.random() * 5.0,
      isYielding: false,
      width: width,
      length: length,
      nearMissed: false,
      passArmed: false
    });
  }

  // Trigger Desi Horn and push AI traffic to yield
  triggerHorn() {
    this.hornCount++;
    window.soundEngine.startHorn(this.vehicleType); // sustained until the key is released

    // Trigger visual shockwave
    if (this.player) {
      this.hornWave.position.copy(this.player.position);
      this.hornWave.position.y += 0.2;
      this.hornWave.position.z -= 1.0;
      this.hornWave.scale.set(1, 1, 1);
      this.hornWave.material.opacity = 0.8;
      this.hornWave.visible = true;
    }

    // Push ahead vehicles in the player's path to yield
    const playerZ = this.player.position.z;
    const playerLane = this.playerLateralOffset;

    this.vehicles.forEach(v => {
      const distZ = playerZ - v.mesh.position.z;
      // If vehicle is 5m to 65m ahead and roughly in player's path (+/- 2.6m)
      if (distZ > 5 && distZ < 65 && Math.abs(v.laneOffset - playerLane) < 2.6) {
        v.isYielding = true;
        v.brakeTimer = 0; // Cancel any brake check immediately

        // Determine best escape lane (prefer lanes farther from player)
        let candidateLanes = this.lanes.filter(l => Math.abs(l - playerLane) > 2.2);
        if (candidateLanes.length === 0) {
          candidateLanes = [v.laneOffset > 0 ? 5.4 : -5.4];
        }
        candidateLanes.sort((a, b) => Math.abs(a - v.laneOffset) - Math.abs(b - v.laneOffset));
        v.targetLaneOffset = candidateLanes[0];
        v.laneChangeSpeed = v.type === 'auto' ? 5.8 : (v.type === 'car' ? 5.2 : 2.8);

        // Autos and Swifts give an extra burst of acceleration when startled
        if (v.type === 'auto') {
          v.speedUnits = Math.min(v.speedUnits * 1.15, 24.0);
        } else if (v.type === 'car') {
          v.speedUnits = Math.min(v.speedUnits * 1.1, 30.0);
        }
      }
    });
  }

  // Update Player & Traffic Dynamics (delta in seconds)
  update(delta, input, isAutopilot = false) {
    if (!this.player) return { crashed: false, nearMiss: false };

    // Handle invulnerability countdown & arcade blink
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= delta;
      if (this.player) {
        this.player.visible = Math.floor(Date.now() / 90) % 2 === 0;
      }
    } else if (this.player && !this.player.visible) {
      this.player.visible = true;
    }

    // 1. Process Player Input
    let throttle = false;
    let brake = false;
    let steer = 0;

    if (isAutopilot) {
      // Autopilot cruise mode (Attract mode)
      this.playerSpeed = THREE.MathUtils.lerp(this.playerSpeed, 18, delta * 2); // Cruise ~65 km/h
      // Smooth lane following with slight gentle drift
      const targetOffset = Math.sin(Date.now() * 0.0008) * 3.5;
      this.playerLateralOffset = THREE.MathUtils.lerp(this.playerLateralOffset, targetOffset, delta * 1.5);
    } else {
      // Handle Boost
      if (this.boostTimer > 0) {
        this.boostTimer -= delta;
        this.playerSpeed = THREE.MathUtils.lerp(this.playerSpeed, this.playerMaxSpeed * 1.25, delta * 3.5);
        throttle = true;
      } else if (input.up || input.forward) {
        // Realistic torque curve: strong pull at low speed, gradual build to top speed
        const speedRatio = this.playerSpeed / this.playerMaxSpeed;
        const torqueMult = Math.max(0.18, Math.pow(1.0 - Math.min(speedRatio, 0.98), 1.2));
        this.playerSpeed += this.playerAcceleration * torqueMult * delta;
        throttle = true;
      }

      if (input.down || input.backward) {
        // Progressive, controllable braking
        this.playerSpeed -= this.playerBraking * delta;
        brake = true;
      }

      if (input.left) steer -= 1;
      if (input.right) steer += 1;

      // Realistic rolling drag & air resistance
      if (!throttle && this.boostTimer <= 0) {
        const airDrag = 1.4 + (this.playerSpeed * 0.05);
        this.playerSpeed -= airDrag * delta;
      }
    }

    // Clamp speed (0 to max or boosted max)
    const effectiveMax = (this.boostTimer > 0) ? this.playerMaxSpeed * 1.25 : this.playerMaxSpeed;
    this.playerSpeed = THREE.MathUtils.clamp(this.playerSpeed, 0, effectiveMax);
    const speedKmh = Math.round(this.playerSpeed * 3.6);
    if (speedKmh > this.topSpeedKmh) this.topSpeedKmh = speedKmh;

    // Calculate current Gear
    if (speedKmh > 70) this.currentGear = 4;
    else if (speedKmh > 45) this.currentGear = 3;
    else if (speedKmh > 20) this.currentGear = 2;
    else this.currentGear = 1;

    // Update sound engine pitch with gear harmonics
    window.soundEngine.updateEngine(speedKmh, throttle, this.currentGear);

    // Lateral Steering Physics (speed-dependent sensitivity)
    const h = window.Progress.HANDLING[this.vehicleType] || window.Progress.HANDLING.auto;
    const steerFactor = Math.min(this.playerSpeed / h.fullLockSpeed, 1.0); // Don't steer when stationary
    const speedLoss = 1 - h.highSpeedLoss * (this.playerSpeed / this.playerMaxSpeed); // heavy rigs wash out at speed
    this.playerLateralSpeed = THREE.MathUtils.lerp(
      this.playerLateralSpeed,
      steer * h.maxLateral * steerFactor * speedLoss,
      Math.min(delta * h.response, 1)
    );
    this.playerLateralOffset += this.playerLateralSpeed * delta;

    // Constrain player within highway boundaries (-7.2m to +7.2m)
    this.playerLateralOffset = THREE.MathUtils.clamp(this.playerLateralOffset, -7.2, 7.2);

    // Advance player position along the road
    const distanceDelta = this.playerSpeed * delta;
    this.player.position.z -= distanceDelta;
    this.distanceCovered += distanceDelta;
    this.score += Math.round(distanceDelta * 1.2 * this.flowStreak);

    // Update player X and Y from road curve & elevation
    const roadX = this.road.getRoadCurve(this.player.position.z);
    const roadY = this.road.getRoadElevation(this.player.position.z);
    const roadAngle = this.road.getRoadAngle(this.player.position.z);

    this.player.position.x = roadX + this.playerLateralOffset;
    this.player.position.y = roadY;

    // Realistic vehicle lean (roll angle) on hard turns
    const targetRoll = -this.playerLateralSpeed * h.roll;
    this.playerRoll = THREE.MathUtils.lerp(this.playerRoll, targetRoll, delta * 10);
    this.player.rotation.set(0, roadAngle + (-this.playerLateralSpeed * h.yaw), this.playerRoll);

    // Rotate player wheels
    if (this.player.userData.wheels) {
      const wheelRot = this.playerSpeed * delta * 4;
      this.player.userData.wheels.forEach(w => w.rotation.x += wheelRot);
    }

    // Animate Horn Shockwave
    if (this.hornWave.visible) {
      this.hornWave.scale.multiplyScalar(1.0 + delta * 5.0);
      this.hornWave.material.opacity -= delta * 1.8;
      if (this.hornWave.material.opacity <= 0) {
        this.hornWave.visible = false;
      }
    }

    // 2. Update AI Traffic
    let collisionOccurred = false;
    let nearMissOccurred = false;
    let nearMissPoints = 0;
    let overtakeOccurred = false;
    const playerZ = this.player.position.z;
    const playerX = this.player.position.x;
    let playerWidth = 1.6;
    let playerLength = 3.2;
    if (this.vehicleType === 'truck') {
      playerWidth = 2.2;
      playerLength = 6.2;
    } else if (this.vehicleType === 'car') {
      playerWidth = 1.74;
      playerLength = 3.85;
    }

    // 0. Gather all road hazards & toll plazas ahead for AI vehicle awareness
    const roadObstacles = [];
    if (this.road && this.road.chunks) {
      this.road.chunks.forEach(chunk => {
        if (chunk.userData && chunk.userData.scenery) {
          chunk.userData.scenery.forEach(item => {
            if (!item.userData) return;
            if (item.userData.isHazard && item.userData.hazardType === 'barricade') {
              roadObstacles.push({
                type: 'barricade',
                z: item.position.z,
                laneX: item.position.x + (item.userData.laneX || 0)
              });
            } else if (item.userData.isHazard && item.userData.isTractor) {
              roadObstacles.push({
                type: 'tractor',
                z: item.position.z,
                laneX: item.position.x
              });
            } else if (item.userData.isTollPlaza) {
              roadObstacles.push({
                type: 'toll',
                z: item.position.z,
                openLanes: item.userData.openLanes || [-1.8, 1.8],
                closedLanes: [-5.4, 5.4]
              });
            }
          });
        }
      });
    }

    // Difficulty ramp: add traffic ahead as the run progresses
    if (!isAutopilot) {
      this.difficulty = window.Progress.difficultyForDistance(this.distanceCovered);
      this.maxTraffic = this.difficulty.trafficCount;
      while (this.vehicles.length < this.maxTraffic) {
        this.spawnAIVehicle(playerZ - 180 - Math.random() * 80);
      }
    }

    this.vehicles.forEach(v => {
      const distAheadOfPlayer = playerZ - v.mesh.position.z; // Positive = vehicle is in front of player

      // 1. Static Hazard & Toll Plaza Avoidance for AI
      let hazardAhead = false;
      roadObstacles.forEach(obs => {
        const gapZ = v.mesh.position.z - obs.z; // Positive if obs is in front of v
        if (gapZ > 0 && gapZ < 65) {
          if (obs.type === 'toll') {
            // Approaching Toll Plaza: AI must pick an OPEN green lane!
            const inOpenLane = obs.openLanes.some(l => Math.abs(v.targetLaneOffset - l) < 1.0);
            if (!inOpenLane) {
              const bestLane = obs.openLanes.reduce((prev, curr) =>
                Math.abs(curr - v.laneOffset) < Math.abs(prev - v.laneOffset) ? curr : prev
              );
              v.targetLaneOffset = bestLane;
              v.laneChangeSpeed = 5.2;
              v.laneChangeTimer = 4.0;
              hazardAhead = true;
            }
            if (gapZ < 28) {
              v.targetSpeedUnits = Math.min(v.targetSpeedUnits, 13.5); // Slow down for toll transit
            }
          } else if (obs.type === 'barricade' || obs.type === 'tractor') {
            const obsOffset = obs.laneX - this.road.getRoadCurve(obs.z);
            const inHazardLane = Math.abs(v.targetLaneOffset - obsOffset) < 1.9 || Math.abs(v.laneOffset - obsOffset) < 1.9;
            if (inHazardLane) {
              hazardAhead = true;
              const safeLanes = this.lanes.filter(l => Math.abs(l - obsOffset) > 1.8);
              if (safeLanes.length > 0) {
                // Find clear safe lane not occupied by another car
                const clearLanes = safeLanes.filter(sl => !this.vehicles.some(other =>
                  other !== v && Math.abs(other.laneOffset - sl) < 1.8 && Math.abs(other.mesh.position.z - v.mesh.position.z) < 18
                ));
                const candidates = clearLanes.length > 0 ? clearLanes : safeLanes;
                candidates.sort((a, b) => Math.abs(a - v.laneOffset) - Math.abs(b - v.laneOffset));
                v.targetLaneOffset = candidates[0];
                v.laneChangeSpeed = 5.2;
                v.laneChangeTimer = 3.5;
              }
              if (gapZ < 25) {
                v.targetSpeedUnits = Math.min(v.targetSpeedUnits, 10.0);
                if (gapZ < 10) {
                  v.speedUnits = Math.min(v.speedUnits, 8.0);
                }
              }
            }
          }
        }
      });

      // 2. Inter-AI Traffic Awareness: Detect closest vehicle ahead in same or merging lane
      let closestAhead = null;
      let minGapZ = 999;
      this.vehicles.forEach(other => {
        if (other === v) return;
        const gapZ = v.mesh.position.z - other.mesh.position.z; // other is ahead of v if gapZ > 0
        if (gapZ > 0 && gapZ < minGapZ) {
          const latDist = Math.abs(other.laneOffset - v.laneOffset);
          const targetLatDist = Math.abs(other.targetLaneOffset - v.targetLaneOffset);
          if (latDist < 1.9 || targetLatDist < 1.5) {
            minGapZ = gapZ;
            closestAhead = other;
          }
        }
      });

      // 3. Responsive progressive & emergency braking to prevent rear-ending other vehicles
      if (closestAhead && minGapZ < 28) {
        if (minGapZ < 8) {
          // Emergency brake! Prevent rear-end collision
          v.speedUnits = Math.min(v.speedUnits, closestAhead.speedUnits * 0.85);
          v.targetSpeedUnits = closestAhead.speedUnits * 0.8;
        } else if (minGapZ < 15) {
          v.targetSpeedUnits = Math.min(v.targetSpeedUnits, closestAhead.speedUnits * 0.92);
        } else if (v.speedUnits > closestAhead.speedUnits) {
          v.targetSpeedUnits = closestAhead.speedUnits * 0.96;
        }
        // Early overtake decision if blocked ahead
        if (v.laneChangeTimer > 0.8 && !hazardAhead) {
          v.laneChangeTimer = 0.2 + Math.random() * 0.4;
        }
      } else if (!hazardAhead && v.brakeTimer <= 0 && !v.isYielding) {
        v.targetSpeedUnits = v.baseSpeedUnits;
      }

      // 4. Lateral Anti-Clipping: prevent side-by-side overlap during lane changes
      this.vehicles.forEach(other => {
        if (other === v) return;
        const dZ = Math.abs(v.mesh.position.z - other.mesh.position.z);
        if (dZ < 4.5) {
          const dX = v.laneOffset - other.laneOffset;
          const minLatDist = (v.width + other.width) * 0.5 + 0.35;
          if (Math.abs(dX) < minLatDist && Math.abs(dX) > 0.01) {
            // Push gently apart laterally so vehicles don't merge into each other
            const push = Math.sign(dX) * (minLatDist - Math.abs(dX)) * delta * 3.0;
            v.laneOffset += push;
            v.targetLaneOffset = v.laneOffset;
          }
        }
      });

      // 5. Autonomous Lane Changing & Overtaking Logic
      v.laneChangeTimer -= delta;
      if (v.laneChangeTimer <= 0 && !hazardAhead) {
        v.laneChangeTimer = 3.5 + Math.random() * 5.0; // Reset decision timer

        const currLaneIdx = this.lanes.findIndex(l => Math.abs(l - v.targetLaneOffset) < 0.5);
        const candidateIndices = [];
        if (currLaneIdx > 0) candidateIndices.push(currLaneIdx - 1);
        if (currLaneIdx < this.lanes.length - 1) candidateIndices.push(currLaneIdx + 1);

        // Filter lanes that are clear of both cars and road hazards
        const safeCandidates = candidateIndices.filter(idx => {
          const testLane = this.lanes[idx];
          const blockedByCar = this.vehicles.some(other => {
            if (other === v) return false;
            const sameLane = Math.abs(other.laneOffset - testLane) < 1.8;
            const closeDist = Math.abs(other.mesh.position.z - v.mesh.position.z);
            return sameLane && closeDist < 18;
          });
          const blockedByObs = roadObstacles.some(obs => {
            const gapZ = v.mesh.position.z - obs.z;
            if (gapZ > 0 && gapZ < 45) {
              if (obs.type === 'toll') {
                return !obs.openLanes.some(l => Math.abs(testLane - l) < 1.0);
              }
              const obsOffset = obs.laneX - this.road.getRoadCurve(obs.z);
              return Math.abs(testLane - obsOffset) < 1.8;
            }
            return false;
          });
          const playerInLane = Math.abs(this.playerLateralOffset - testLane) < 1.8;
          const playerClose = Math.abs(playerZ - v.mesh.position.z) < 16;
          return !blockedByCar && !blockedByObs && !(playerInLane && playerClose);
        });

        if (safeCandidates.length > 0) {
          if (closestAhead && minGapZ < 30) {
            // Blocked ahead -> overtake!
            v.targetLaneOffset = this.lanes[safeCandidates[Math.floor(Math.random() * safeCandidates.length)]];
            v.laneChangeSpeed = v.type === 'car' ? 4.8 : (v.type === 'auto' ? 4.0 : 2.5);
          } else if (v.type === 'car' && Math.random() < 0.45) {
            v.targetLaneOffset = this.lanes[safeCandidates[Math.floor(Math.random() * safeCandidates.length)]];
          } else if (v.type === 'auto' && Math.random() < 0.35) {
            v.targetLaneOffset = this.lanes[safeCandidates[Math.floor(Math.random() * safeCandidates.length)]];
          } else if (v.type === 'truck' && Math.random() < 0.15) {
            v.targetLaneOffset = this.lanes[safeCandidates[Math.floor(Math.random() * safeCandidates.length)]];
          }
        }
      }

      // 6. "MESS WITH THE PLAYER" AI BEHAVIORS
      // Triggers when the player is rapidly closing in from behind
      if (!isAutopilot && distAheadOfPlayer > 14 && distAheadOfPlayer < 55 && this.playerSpeed > (v.speedUnits + 3.0) && !hazardAhead) {
        v.messCooldown -= delta;
        if (v.messCooldown <= 0 && !v.isYielding) {
          v.messCooldown = (5.0 + Math.random() * 7.0) * this.difficulty.messScale;

          const latDistanceToPlayer = Math.abs(v.laneOffset - this.playerLateralOffset);
          const roll = Math.random();

          if (latDistanceToPlayer > 1.8 && latDistanceToPlayer < 4.2 && roll < 0.45) {
            // TACTIC 1: THE SURPRISE CUT-OFF (only into lanes clear of obstacles)
            const targetLane = this.lanes.reduce((prev, curr) =>
              Math.abs(curr - this.playerLateralOffset) < Math.abs(prev - this.playerLateralOffset) ? curr : prev
            );
            const hazardInLane = roadObstacles.some(obs => {
              const gapZ = v.mesh.position.z - obs.z;
              if (gapZ > 0 && gapZ < 40) {
                if (obs.type === 'toll') return !obs.openLanes.some(l => Math.abs(targetLane - l) < 1.0);
                const obsOffset = obs.laneX - this.road.getRoadCurve(obs.z);
                return Math.abs(targetLane - obsOffset) < 1.8;
              }
              return false;
            });
            if (!hazardInLane) {
              v.targetLaneOffset = targetLane;
              v.laneChangeSpeed = v.type === 'car' ? 5.2 : (v.type === 'auto' ? 4.6 : 2.8);
            }
          } else if (latDistanceToPlayer > 1.8 && roll < 0.75) {
            // TACTIC 2: THE SQUEEZE / LANE DRIFTER
            const driftDir = Math.sign(this.playerLateralOffset - v.laneOffset);
            v.wanderPhase += driftDir * 1.5;
            v.wanderAmp = Math.min(v.wanderAmp * 1.6, 0.65);
          } else if (latDistanceToPlayer < 2.0 && roll >= 0.75) {
            // TACTIC 3: THE SUDDEN BRAKE-CHECK
            v.brakeTimer = 1.3;
            v.targetSpeedUnits = v.baseSpeedUnits * 0.72;
          }
        }
      }

      // 7. Handle Brake Timer
      if (v.brakeTimer > 0) {
        v.brakeTimer -= delta;
        if (v.brakeTimer <= 0) {
          v.targetSpeedUnits = v.baseSpeedUnits;
        }
      }

      // 8. Smooth Lateral Steering Execution
      const dOffset = v.targetLaneOffset - v.laneOffset;
      let latSpeed = 0;
      if (Math.abs(dOffset) > 0.04) {
        latSpeed = Math.sign(dOffset) * Math.min(Math.abs(dOffset) * 3.6, v.laneChangeSpeed);
        v.laneOffset += latSpeed * delta;
      } else {
        v.laneOffset = v.targetLaneOffset;
        v.isYielding = false;
      }

      // 7. Natural Micro-Wander / Indian Highway Wobble
      v.wanderPhase += delta * 1.6;
      const naturalDrift = Math.sin(v.wanderPhase) * v.wanderAmp;

      // 8. Smooth Speed Interpolation & Advance Position
      v.speedUnits = THREE.MathUtils.lerp(v.speedUnits, v.targetSpeedUnits, delta * 2.8);
      v.mesh.position.z -= v.speedUnits * delta;

      // 9. Snap AI Vehicle to Road with Dynamic Steering Yaw & Chassis Roll
      const vRoadX = this.road.getRoadCurve(v.mesh.position.z);
      const vRoadY = this.road.getRoadElevation(v.mesh.position.z);
      const vAngle = this.road.getRoadAngle(v.mesh.position.z);

      v.mesh.position.x = vRoadX + v.laneOffset + naturalDrift;
      v.mesh.position.y = vRoadY;

      // Realistic Steering Yaw into the lane change + subtle chassis roll
      v.mesh.rotation.y = vAngle + (-latSpeed * 0.07);
      v.mesh.rotation.z = -latSpeed * 0.025;

      // 10. Rotate AI Wheels
      if (v.mesh.userData.wheels) {
        const aiWheelRot = v.speedUnits * delta * 3.5;
        v.mesh.userData.wheels.forEach(w => w.rotation.x += aiWheelRot);
      }

      // 11. Check Collision with Player (protected during invulnerability grace period)
      const dx = Math.abs(playerX - v.mesh.position.x);
      const dz = Math.abs(playerZ - v.mesh.position.z);
      const minDistanceX = (playerWidth + v.width) * 0.5 * 0.85;
      const minDistanceZ = (playerLength + v.length) * 0.5 * 0.85;

      if (this.invulnerableTimer <= 0 && dx < minDistanceX && dz < minDistanceZ && !isAutopilot) {
        collisionOccurred = true;
      }

      // 12. Check Near-Miss Detection (Close shave at high speed)
      // Passed within 1.8m laterally and within longitudinal range, speed > 65 km/h
      if (!v.nearMissed && dx < (minDistanceX + 1.2) && dz < (minDistanceZ + 1.5) && speedKmh > 65 && !isAutopilot) {
        v.nearMissed = true;
        nearMissOccurred = true;
        this.nearMissCount++;
        this.flowStreak = Math.min(this.flowStreak + 1, 5);
        nearMissPoints = 250 * this.flowStreak;
        this.score += nearMissPoints;
        window.soundEngine.playNearMiss();
      }

      // A pass is a completed ahead-to-behind crossing with body clearance.
      // It is feedback only, never an additional scoring source.
      const clearAhead = playerLength + v.length;
      const clearBehind = (playerLength + v.length) * 0.5;
      if (!isAutopilot && distAheadOfPlayer > clearAhead) {
        v.passArmed = true;
      } else if (!isAutopilot && v.passArmed && distAheadOfPlayer < -clearBehind && dx > minDistanceX) {
        v.passArmed = false;
        overtakeOccurred = true;
      }

      // 13. Recycle AI vehicle if it falls far behind player (>80m behind)
      if (v.mesh.position.z > playerZ + 80) {
        // Spawn far ahead (180m to 260m ahead of player)
        v.mesh.position.z = playerZ - 180 - Math.random() * 80;
        const newLane = this.lanes[Math.floor(Math.random() * this.lanes.length)];
        v.laneOffset = newLane;
        v.targetLaneOffset = newLane;        v.speedUnits = v.baseSpeedUnits;
        v.targetSpeedUnits = v.baseSpeedUnits;
        v.laneChangeTimer = 2.0 + Math.random() * 4.0;
        v.messCooldown = 3.5 + Math.random() * 6.0;
        v.brakeTimer = 0;
        v.isYielding = false;
        v.nearMissed = false;
        v.passArmed = false;
      }
    });

    // Check Pickup Collections (Meme Powerup Boost), Hazards & FASTag Toll Plazas
    let pickedUpChai = false;
    let fastagPassed = false;

    if (this.road && this.road.chunks) {
      this.road.chunks.forEach(chunk => {
        if (chunk.userData && chunk.userData.scenery) {
          chunk.userData.scenery.forEach(item => {
            if (!item.userData) return;

            // 1. Meme Powerup Pickups
            if (item.userData.isPickup && item.visible) {
              item.rotation.y += delta * 3.0; // Spin pickup
              const dx = Math.abs(playerX - item.position.x);
              const dz = Math.abs(playerZ - item.position.z);
              if (dx < 2.0 && dz < 2.4) {
                item.visible = false;
                pickedUpChai = true;
                this.chaiCount++;
                this.score += 500;
                this.boostTimer = this.chaiBoostDuration || 3.5; // Unique vehicle speed surge!
                window.soundEngine.playChaiPickup();
              }
            }

            // 2. Highway Construction Barricades & Diversions
            if (item.userData.isHazard && item.userData.hazardType === 'barricade') {
              const hX = item.position.x + (item.userData.laneX || 0);
              const hZ = item.position.z;
              const dx = Math.abs(playerX - hX);
              const dz = Math.abs(playerZ - hZ);
              if (this.invulnerableTimer <= 0 && dx < 1.6 && dz < 2.2 && !isAutopilot) {
                collisionOccurred = true;
              }
            }

            // 3. Sugarcane Tractor-Trolley Hazard (Slow moving or lumbering)
            if (item.userData.isHazard && item.userData.isTractor) {
              item.position.z -= (item.userData.speedUnits || 6.0) * delta;
              const tX = item.position.x;
              const tZ = item.position.z;
              const dx = Math.abs(playerX - tX);
              const dz = Math.abs(playerZ - tZ);
              const minX = (playerWidth + (item.userData.width || 2.2)) * 0.5 * 0.85;
              const minZ = (playerLength + (item.userData.length || 6.5)) * 0.5 * 0.85;
              if (this.invulnerableTimer <= 0 && dx < minX && dz < minZ && !isAutopilot) {
                collisionOccurred = true;
              }
            }

            // 4. FASTag Toll Plaza Squeeze & Lane Clearance
            if (item.userData.isTollPlaza) {
              const dz = Math.abs(playerZ - item.position.z);
              if (dz < 2.5) {
                const pLat = this.playerLateralOffset;
                // Check toll island concrete pillar collisions
                const tollIslands = [-7.2, -3.6, 0.0, 3.6, 7.2];
                const hitIsland = tollIslands.some(x => Math.abs(pLat - x) < 0.55);
                if (hitIsland && this.invulnerableTimer <= 0 && !isAutopilot) {
                  collisionOccurred = true;
                }

                // Check lane clearance
                const openLanes = item.userData.openLanes || [-1.8, 1.8];
                const inOpenLane = openLanes.some(l => Math.abs(pLat - l) < 1.35);

                if (inOpenLane) {
                  if (!item.userData.passed) {
                    item.userData.passed = true;
                    fastagPassed = true;
                    this.score += 1500;
                    window.soundEngine.playChaiPickup();
                  }
                } else if (!hitIsland) {
                  // In closed lane with lowered boom barrier
                  const inClosedLane = [-5.4, -1.8, 1.8, 5.4].some(l => Math.abs(pLat - l) < 1.35);
                  if (inClosedLane && this.invulnerableTimer <= 0 && !isAutopilot) {
                    collisionOccurred = true;
                  }
                }
              }
            }
          });
        }
      });
    }

    return {
      crashed: collisionOccurred,
      nearMiss: nearMissOccurred,
      nearMissPoints: nearMissPoints,
      chaiPickup: pickedUpChai,
      fastagCleared: fastagPassed,
      overtake: overtakeOccurred,
      chaiTimeBonus: window.Progress.scaledChaiBonus(this.chaiTimeBonus || 8, this.difficulty),
      difficultyLevel: this.difficulty.level,
      speedKmh: speedKmh,
      distanceKm: (this.distanceCovered / 1000).toFixed(1),
      score: this.score,
      flowStreak: this.flowStreak,
      gear: this.currentGear,
      isBoosting: this.boostTimer > 0
    };
  }

  // Dramatic crash tumble animation
  doCrashTumble(delta) {
    if (!this.player) return;
    this.player.position.y += delta * 6;
    this.player.rotation.x += delta * 12;
    this.player.rotation.z += delta * 8;
  }
}

window.TrafficManager = TrafficManager;

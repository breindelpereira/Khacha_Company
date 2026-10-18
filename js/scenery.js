// Procedural Scenery & Living World Assets for NH Odyssey
// Built with compound Three.js primitives for authentic Indian highway charm

class SceneryBuilder {
  constructor() {
    this.matWood = new THREE.MeshLambertMaterial({ color: 0x78350f });
    this.matRoof = new THREE.MeshLambertMaterial({ color: 0x9a3412 });
    this.matThatch = new THREE.MeshLambertMaterial({ color: 0xd97706 });
    this.matTrunk = new THREE.MeshLambertMaterial({ color: 0x573926 });
    this.matFoliage = new THREE.MeshLambertMaterial({ color: 0x2e6f40 });
    this.matPalmLeaf = new THREE.MeshLambertMaterial({ color: 0x15803d });
    this.matDog = new THREE.MeshLambertMaterial({ color: 0xc27838 }); // Golden-caramel Indie coat
    this.matMilestoneTop = new THREE.MeshLambertMaterial({ color: 0xfacc15 }); // Yellow top
    this.matMilestoneBase = new THREE.MeshLambertMaterial({ color: 0xffffff }); // White base
    this.matGulmohar = new THREE.MeshLambertMaterial({ color: 0xe11d48 }); // Fiery red Gulmohar flowers
    this.matMetal = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.85 }); // Guardrails
    this.matCoconut = new THREE.MeshLambertMaterial({ color: 0x65a30d }); // Fresh green tender coconuts
    this.matClay = new THREE.MeshLambertMaterial({ color: 0xb45309 }); // Terracotta chai cup
    this.matGlow = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.85 });
  }

  // 1. THE DESI INDIE DOG (Authentic Roadside Mascot)
  createIndieDog(pose = 'sitting') {
    const group = new THREE.Group();

    if (pose === 'sleeping') {
      // Curled up sleeping pose
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 0.2, 10), this.matDog);
      body.position.y = 0.1;
      group.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), this.matDog);
      head.position.set(0.2, 0.12, 0.1);
      group.add(head);

      // Cute curled tail
      const tail = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 6, 12, Math.PI), this.matDog);
      tail.rotation.x = Math.PI / 2;
      tail.position.set(-0.2, 0.1, -0.05);
      group.add(tail);
    } else {
      // Sitting alert pose
      // Body
      const bodyGeo = new THREE.BoxGeometry(0.3, 0.5, 0.6);
      const body = new THREE.Mesh(bodyGeo, this.matDog);
      body.rotation.x = 0.4;
      body.position.set(0, 0.4, 0);
      group.add(body);

      // Head with snout
      const headGeo = new THREE.BoxGeometry(0.24, 0.24, 0.28);
      const head = new THREE.Mesh(headGeo, this.matDog);
      head.position.set(0, 0.68, 0.28);
      group.add(head);

      const snoutGeo = new THREE.BoxGeometry(0.14, 0.12, 0.18);
      const snout = new THREE.Mesh(snoutGeo, this.matDog);
      snout.position.set(0, 0.63, 0.45);
      group.add(snout);

      // Perky pointed ears
      const earGeo = new THREE.ConeGeometry(0.06, 0.14, 4);
      const earL = new THREE.Mesh(earGeo, this.matDog);
      earL.position.set(0.09, 0.82, 0.24);
      earL.rotation.z = -0.2;
      const earR = earL.clone();
      earR.position.x = -0.09;
      earR.rotation.z = 0.2;
      group.add(earL, earR);

      // Front Legs
      const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45);
      const legL = new THREE.Mesh(legGeo, this.matDog);
      legL.position.set(0.1, 0.225, 0.25);
      const legR = legL.clone();
      legR.position.x = -0.1;
      group.add(legL, legR);

      // Curved tail
      const tailGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.35);
      const tail = new THREE.Mesh(tailGeo, this.matDog);
      tail.rotation.x = -0.8;
      tail.position.set(0, 0.35, -0.32);
      group.add(tail);
    }

    group.scale.set(1.2, 1.2, 1.2);
    return group;
  }

  // 2. ROADSIDE DHABA & CHAI TAPRI
  createDhaba() {
    const group = new THREE.Group();

    // Wooden Shack Structure
    const pillarGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.6);
    const pillars = [
      [-2.4, 1.3, -1.8],
      [2.4, 1.3, -1.8],
      [-2.4, 1.3, 1.8],
      [2.4, 1.3, 1.8]
    ];
    pillars.forEach(p => {
      const pil = new THREE.Mesh(pillarGeo, this.matWood);
      pil.position.set(p[0], p[1], p[2]);
      group.add(pil);
    });

    // Sloped Corrugated Tin / Thatch Roof
    const roofGeo = new THREE.BoxGeometry(5.4, 0.15, 4.2);
    const roof = new THREE.Mesh(roofGeo, this.matRoof);
    roof.position.set(0, 2.7, 0);
    roof.rotation.x = 0.1;
    group.add(roof);

    // Raised Mud Platform
    const floorGeo = new THREE.BoxGeometry(5.2, 0.3, 4.0);
    const floor = new THREE.Mesh(floorGeo, new THREE.MeshLambertMaterial({ color: 0xa16207 }));
    floor.position.set(0, 0.15, 0);
    group.add(floor);

    // Charpai (Indian Woven Cot) outside
    const charpai = this.createCharpai();
    charpai.position.set(1.2, 0.3, 0.2);
    group.add(charpai);

    // Chai Kettle & Brick Stove
    const stoveGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const stove = new THREE.Mesh(stoveGeo, new THREE.MeshLambertMaterial({ color: 0x7f1d1d }));
    stove.position.set(-1.4, 0.45, 0.5);
    group.add(stove);

    // Metal Chai Kettle
    const kettleGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.3, 10);
    const kettle = new THREE.Mesh(kettleGeo, new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.7 }));
    kettle.position.set(-1.4, 0.85, 0.5);
    group.add(kettle);

    // Hand-painted Dhaba Banner
    const banner = this.createDhabaBanner();
    banner.position.set(0, 2.45, 2.05);
    group.add(banner);

    // Add a sleeping dog by the charpai!
    const dog = this.createIndieDog('sleeping');
    dog.position.set(1.2, 0.3, -1.0);
    group.add(dog);

    return group;
  }

  // Charpai (Woven rope cot)
  createCharpai() {
    const group = new THREE.Group();
    // Wooden Frame
    const frameGeo = new THREE.BoxGeometry(1.6, 0.08, 0.9);
    const frame = new THREE.Mesh(frameGeo, this.matWood);
    frame.position.y = 0.35;
    group.add(frame);

    // 4 Wooden Turned Legs
    const legGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.35);
    const legCoords = [[0.7, 0.175, 0.38], [-0.7, 0.175, 0.38], [0.7, 0.175, -0.38], [-0.7, 0.175, -0.38]];
    legCoords.forEach(c => {
      const l = new THREE.Mesh(legGeo, this.matWood);
      l.position.set(c[0], c[1], c[2]);
      group.add(l);
    });

    return group;
  }

  // Dhaba Banner Canvas Texture
  createDhabaBanner() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('SHER-E-PUNJAB DHABA', 256, 55);

    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.fillText('★ PURE DESI GHEE CHAI & PARATHA ★', 256, 95);

    const texture = new THREE.CanvasTexture(canvas);
    const bannerGeo = new THREE.PlaneGeometry(3.6, 0.9);
    const bannerMat = new THREE.MeshBasicMaterial({ map: texture });
    return new THREE.Mesh(bannerGeo, bannerMat);
  }

  // 4. HIGHWAY MILESTONE MARKER (Yellow top, white base)
  createMilestone(text = 'NH 44') {
    const group = new THREE.Group();

    // White base cylinder/box
    const baseGeo = new THREE.BoxGeometry(0.6, 0.8, 0.3);
    const base = new THREE.Mesh(baseGeo, this.matMilestoneBase);
    base.position.y = 0.4;
    group.add(base);

    // Rounded Yellow Top
    const topGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.3, 16, 1, false, 0, Math.PI);
    topGeo.rotateZ(Math.PI / 2);
    const top = new THREE.Mesh(topGeo, this.matMilestoneTop);
    top.position.set(0, 0.8, 0);
    group.add(top);

    return group;
  }

  // 5. BANYAN TREE (Broad canopy with prop aerial roots)
  createBanyanTree() {
    const group = new THREE.Group();

    // Main Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.8, 1.2, 5.0, 8);
    const trunk = new THREE.Mesh(trunkGeo, this.matTrunk);
    trunk.position.y = 2.5;
    group.add(trunk);

    // Prop roots
    const rootGeo = new THREE.CylinderGeometry(0.12, 0.16, 4.5, 6);
    const r1 = new THREE.Mesh(rootGeo, this.matTrunk);
    r1.position.set(1.8, 2.25, 0.8);
    const r2 = new THREE.Mesh(rootGeo, this.matTrunk);
    r2.position.set(-1.6, 2.25, -1.2);
    group.add(r1, r2);

    // Massive Foliage Dome
    const f1 = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2, 1), this.matFoliage);
    f1.position.set(0, 5.8, 0);
    const f2 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.5, 1), this.matFoliage);
    f2.position.set(2.0, 5.2, 0.8);
    const f3 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.6, 1), this.matFoliage);
    f3.position.set(-1.8, 5.4, -0.6);
    group.add(f1, f2, f3);

    return group;
  }

  // 6. POLICE CHECKPOST BARRICADE (Slalom hazard)
  createBarricade() {
    const group = new THREE.Group();

    // Canvas for yellow/black hazard stripes
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#0f172a';
    for (let x = -64; x < 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 20, 0);
      ctx.lineTo(x - 12, 64);
      ctx.lineTo(x - 32, 64);
      ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);

    // Main Crossbar
    const barGeo = new THREE.BoxGeometry(2.8, 0.5, 0.1);
    const barMat = new THREE.MeshLambertMaterial({ map: texture });
    const bar = new THREE.Mesh(barGeo, barMat);
    bar.position.y = 0.75;
    group.add(bar);

    // A-frame Legs
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.0);
    const matLeg = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
    const l1 = new THREE.Mesh(legGeo, matLeg);
    l1.position.set(1.2, 0.5, 0.2);
    l1.rotation.x = 0.2;
    const l2 = new THREE.Mesh(legGeo, matLeg);
    l2.position.set(1.2, 0.5, -0.2);
    l2.rotation.x = -0.2;

    const l3 = l1.clone();
    l3.position.x = -1.2;
    const l4 = l2.clone();
    l4.position.x = -1.2;

    group.add(l1, l2, l3, l4);
    group.userData = { isObstacle: true, radius: 1.6 };

    return group;
  }

  createStingLabelTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Deep black label background with neon red border
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 256, 128);

    ctx.strokeStyle = '#ff0038';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 248, 120);

    // Iconic STING Lightning Bolt (Electric Red)
    ctx.fillStyle = '#ff0038';
    ctx.beginPath();
    ctx.moveTo(35, 18);
    ctx.lineTo(60, 58);
    ctx.lineTo(48, 58);
    ctx.lineTo(72, 110);
    ctx.lineTo(45, 65);
    ctx.lineTo(58, 65);
    ctx.closePath();
    ctx.fill();

    // Bold STING typography
    ctx.font = '900 48px Impact, Arial Black, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText('STING', 76, 82);

    // Red sub-text
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.fillStyle = '#ff0038';
    ctx.fillText('ENERGY RED', 78, 105);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    return texture;
  }

  // Authentic Saffron & Gold Vimal Pan Masala Texture ("BOLO ZUBAAN KESARI ✌️")
  createVimalLabelTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Rich metallic golden saffron gradient
    const grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(0.5, '#d97706');
    grad.addColorStop(1, '#9a3412');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Gold diamond lattice watermark pattern
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.5;
    for (let x = -256; x < 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 256, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 256, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }

    // Outer royal red and gold border
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 10;
    ctx.strokeRect(6, 6, 244, 244);

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 4;
    ctx.strokeRect(14, 14, 228, 228);

    // Top Brand Crest
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('★ KHACHA TRUCK SPECIAL ★', 128, 48);

    // Iconic Red Victory Seal with "✌️"
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(128, 105, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.font = '36px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('✌️', 128, 118);

    // Bold BOLO ZUBAAN KESARI typography
    ctx.font = '900 24px Impact, Arial Black, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('BOLO ZUBAAN', 128, 175);
    ctx.fillStyle = '#fef08a';
    ctx.fillText('KESARI', 128, 205);

    // Subtitle
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('100% HIGHWAY STAMINA', 128, 235);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // 1. STING ENERGY RED MESH (For Maruti Swift / Khacha Company)
  createStingMesh() {
    const group = new THREE.Group();

    if (!this.stingLabelTexture) {
      this.stingLabelTexture = this.createStingLabelTexture();
    }

    // Radiant Glowing Ruby-Red Liquid Bottle
    const bottleGeo = new THREE.CylinderGeometry(0.22, 0.20, 0.65, 16);
    const bottleMat = new THREE.MeshLambertMaterial({
      color: 0xff0038,
      emissive: 0xcc0029,
      emissiveIntensity: 0.85,
      transparent: true,
      opacity: 0.94
    });
    const bottle = new THREE.Mesh(bottleGeo, bottleMat);
    bottle.position.y = 0.8;
    group.add(bottle);

    const shoulderGeo = new THREE.CylinderGeometry(0.12, 0.22, 0.24, 16);
    const shoulder = new THREE.Mesh(shoulderGeo, bottleMat);
    shoulder.position.y = 1.18;
    group.add(shoulder);

    const neckGeo = new THREE.CylinderGeometry(0.10, 0.12, 0.16, 16);
    const neck = new THREE.Mesh(neckGeo, bottleMat);
    neck.position.y = 1.34;
    group.add(neck);

    const capGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.10, 16);
    const capMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 1.45;
    group.add(cap);

    const labelGeo = new THREE.CylinderGeometry(0.225, 0.225, 0.28, 16);
    const labelMat = new THREE.MeshBasicMaterial({ map: this.stingLabelTexture });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.y = 0.82;
    group.add(label);

    // Glowing Neon Electric Red Energy Rings
    const ringGeo = new THREE.TorusGeometry(0.68, 0.065, 8, 24);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff0038, transparent: true, opacity: 0.92 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.85;
    group.add(ring);

    const outerRingGeo = new THREE.TorusGeometry(0.92, 0.035, 6, 20);
    outerRingGeo.rotateX(Math.PI / 2);
    const outerRingMat = new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.8 });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.position.y = 0.85;
    group.add(outerRing);

    return group;
  }

  // 2. VIMAL "BOLO ZUBAAN KESARI" SAFFRON POUCH (For Tata Freight Truck)
  createVimalMesh() {
    const group = new THREE.Group();

    if (!this.vimalTexture) {
      this.vimalTexture = this.createVimalLabelTexture();
    }

    const matPouch = new THREE.MeshStandardMaterial({
      map: this.vimalTexture,
      roughness: 0.35,
      metalness: 0.65
    });

    const matGold = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.85
    });

    // Pouch body
    const bodyGeo = new THREE.BoxGeometry(0.55, 0.72, 0.14);
    const body = new THREE.Mesh(bodyGeo, matPouch);
    body.position.y = 0.85;
    group.add(body);

    // Top & Bottom crimped metallic foil seals
    const sealTopGeo = new THREE.BoxGeometry(0.58, 0.08, 0.06);
    const sealTop = new THREE.Mesh(sealTopGeo, matGold);
    sealTop.position.set(0, 1.24, 0);
    const sealBot = sealTop.clone();
    sealBot.position.y = 0.46;
    group.add(sealTop, sealBot);

    // Radiant Saffron Golden Energy Ring (Inner)
    const ringGeo = new THREE.TorusGeometry(0.72, 0.065, 8, 24);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.95 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.85;
    group.add(ring);

    // Outer Pulsing Gold Aura Ring
    const outerRingGeo = new THREE.TorusGeometry(0.96, 0.035, 6, 20);
    outerRingGeo.rotateX(Math.PI / 2);
    const outerRingMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.85 });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.position.y = 0.85;
    group.add(outerRing);

    return group;
  }

  // 3. KADAK CUTTING CHAI GLASS (For Auto-Rickshaw)
  createCuttingChaiMesh() {
    const group = new THREE.Group();

    const matGlass = new THREE.MeshLambertMaterial({
      color: 0xa5f3fc,
      transparent: true,
      opacity: 0.55
    });
    const matChai = new THREE.MeshLambertMaterial({
      color: 0xb45309 // Rich caramel masala chai
    });
    const matFroth = new THREE.MeshLambertMaterial({
      color: 0xfef08a // Creamy tea froth
    });
    const matClay = new THREE.MeshLambertMaterial({
      color: 0xc2410c // Terracotta saucer
    });

    // Glass cutting tumbler
    const glassGeo = new THREE.CylinderGeometry(0.24, 0.17, 0.54, 16);
    const glass = new THREE.Mesh(glassGeo, matGlass);
    glass.position.y = 0.85;
    group.add(glass);

    // Masala tea liquid
    const chaiGeo = new THREE.CylinderGeometry(0.22, 0.16, 0.44, 16);
    const chai = new THREE.Mesh(chaiGeo, matChai);
    chai.position.y = 0.82;
    group.add(chai);

    // Tea froth top layer
    const frothGeo = new THREE.CylinderGeometry(0.225, 0.225, 0.03, 16);
    const froth = new THREE.Mesh(frothGeo, matFroth);
    froth.position.y = 1.05;
    group.add(froth);

    // Terracotta Saucer
    const saucerGeo = new THREE.CylinderGeometry(0.38, 0.28, 0.08, 16);
    const saucer = new THREE.Mesh(saucerGeo, matClay);
    saucer.position.y = 0.54;
    group.add(saucer);

    // Warm Amber Steam Ring (Inner)
    const ringGeo = new THREE.TorusGeometry(0.68, 0.06, 8, 24);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.92 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.85;
    group.add(ring);

    // Outer Pulsing Gold Aura Ring
    const outerRingGeo = new THREE.TorusGeometry(0.92, 0.035, 6, 20);
    outerRingGeo.rotateX(Math.PI / 2);
    const outerRingMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.8 });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.position.y = 0.85;
    group.add(outerRing);

    return group;
  }

  // 4. DYNAMIC COMPOUND POWERUP (Meme-accurate per vehicle: Auto, Swift, Truck)
  createChaiPickup(vehicleType = 'auto') {
    const group = new THREE.Group();

    const stingMesh = this.createStingMesh();
    const vimalMesh = this.createVimalMesh();
    const chaiMesh = this.createCuttingChaiMesh();

    group.add(stingMesh);
    group.add(vimalMesh);
    group.add(chaiMesh);

    group.stingMesh = stingMesh;
    group.vimalMesh = vimalMesh;
    group.chaiMesh = chaiMesh;

    group.updateVehicleType = function(vType) {
      if (stingMesh) stingMesh.visible = (vType === 'car');
      if (vimalMesh) vimalMesh.visible = (vType === 'truck');
      if (chaiMesh) chaiMesh.visible = (vType === 'auto');
    };

    group.updateVehicleType(vehicleType);

    group.userData = {
      isPickup: true,
      radius: 2.0
    };

    return group;
  }

  // 8. TENDER COCONUT WATER CART (Nariyal Pani)
  createCoconutCart() {
    const group = new THREE.Group();

    // Wooden Cart Bed
    const bedGeo = new THREE.BoxGeometry(2.0, 0.2, 1.2);
    const bed = new THREE.Mesh(bedGeo, this.matWood);
    bed.position.y = 0.7;
    group.add(bed);

    // 4 Wooden Cart Wheels
    const wGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 12);
    wGeo.rotateZ(Math.PI / 2);
    const coords = [[0.95, 0.35, 0.5], [-0.95, 0.35, 0.5], [0.95, 0.35, -0.5], [-0.95, 0.35, -0.5]];
    coords.forEach(c => {
      const w = new THREE.Mesh(wGeo, this.matWood);
      w.position.set(c[0], c[1], c[2]);
      group.add(w);
    });

    // Piles of green tender coconuts
    const cocoGeo = new THREE.SphereGeometry(0.16, 6, 6);
    for (let i = 0; i < 10; i++) {
      const coco = new THREE.Mesh(cocoGeo, this.matCoconut);
      coco.position.set(
        (Math.random() - 0.5) * 1.4,
        0.9 + Math.random() * 0.25,
        (Math.random() - 0.5) * 0.8
      );
      group.add(coco);
    }

    // Straw Umbrella
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.0);
    const pole = new THREE.Mesh(poleGeo, this.matWood);
    pole.position.set(0.7, 1.6, 0);
    group.add(pole);

    const umbrellaGeo = new THREE.ConeGeometry(1.1, 0.5, 8);
    const umbrella = new THREE.Mesh(umbrellaGeo, this.matThatch);
    umbrella.position.set(0.7, 2.5, 0);
    group.add(umbrella);

    return group;
  }

  // 9. HIGHWAY BILLBOARD HOARDING
  createHighwayBillboard(variant = 0) {
    const group = new THREE.Group();

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const slogans = [
      { bg: '#991b1b', border: '#facc15', title: 'KHACHA COMPANY', sub: 'HIGHWAY BOOST ENERGY DRINK', pill: '⚡ FEEL THE KHACHA ⚡' },
      { bg: '#0f172a', border: '#ef4444', title: 'STING ENERGY', sub: 'POWER CHARGE YOUR DRIVE', pill: '20 RS MEIN FULL POWER' },
      { bg: '#1e3a8a', border: '#fbbf24', title: 'KHACHA EXPRESS', sub: 'NH-44 OFFICIAL SPEEDWAY', pill: 'HORN OK PLEASE' }
    ];
    const item = slogans[variant % slogans.length];

    ctx.fillStyle = item.bg;
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = item.border;
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 492, 236);

    ctx.font = 'bold 44px Impact, Arial Black, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(item.title, 256, 90);

    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.fillText(item.sub, 256, 145);

    ctx.fillStyle = item.border;
    ctx.fillRect(130, 175, 252, 45);
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(item.pill, 256, 206);

    const texture = new THREE.CanvasTexture(canvas);
    const boardGeo = new THREE.PlaneGeometry(6.4, 3.2);
    const boardMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.y = 5.2;
    group.add(board);

    // Two steel support pillars
    const pilGeo = new THREE.CylinderGeometry(0.12, 0.14, 5.2);
    const pil1 = new THREE.Mesh(pilGeo, this.matMetal);
    pil1.position.set(-2.2, 2.6, 0);
    const pil2 = pil1.clone();
    pil2.position.x = 2.2;
    group.add(pil1, pil2);

    return group;
  }

  // 10. GULMOHAR TREE (Flamboyant Red Canopy)
  createGulmoharTree() {
    const group = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.4, 0.65, 4.2, 8);
    const trunk = new THREE.Mesh(trunkGeo, this.matTrunk);
    trunk.position.y = 2.1;
    group.add(trunk);

    // Wide Umbrella Scarlet Canopy
    const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4, 1), this.matGulmohar);
    c1.scale.set(1.4, 0.7, 1.4);
    c1.position.set(0, 4.4, 0);

    const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), this.matGulmohar);
    c2.scale.set(1.3, 0.6, 1.3);
    c2.position.set(1.2, 4.1, 0.8);

    const c3 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.9, 1), this.matGulmohar);
    c3.scale.set(1.3, 0.6, 1.3);
    c3.position.set(-1.1, 4.2, -0.6);

    group.add(c1, c2, c3);
    return group;
  }
}

window.sceneryBuilder = new SceneryBuilder();

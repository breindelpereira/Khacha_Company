// Procedural 3D Indian Vehicle Generator for NH Odyssey
// Built using compound Three.js primitives and canvas-generated decals

class VehicleBuilder {
  constructor() {
    this.truckTailgateTexture = this.createTruckTailgateTexture();
    this.autoRearTexture = this.createAutoRearTexture();
    this.busSideTexture = this.createBusSideTexture();
    this.busRearTexture = this.createBusRearTexture();
    this.plateTextures = {};
  }

  // Shared lamp colours: dim when cruising, bright when braking
  static get TAIL_DIM() { return 0x7f1d1d; }
  static get TAIL_BRIGHT() { return 0xff3b3b; }

  // Every vehicle gets its own tail-lamp material so brake lights can be toggled per vehicle
  makeTailMaterial() {
    return new THREE.MeshBasicMaterial({ color: VehicleBuilder.TAIL_DIM });
  }

  // Toggle brake lamps on any vehicle built by this class
  setBrakeLights(vehicle, on) {
    const mats = vehicle && vehicle.userData && vehicle.userData.brakeMats;
    if (!mats || vehicle.userData.brakeOn === on) return;
    vehicle.userData.brakeOn = on;
    const hex = on ? VehicleBuilder.TAIL_BRIGHT : VehicleBuilder.TAIL_DIM;
    mats.forEach(m => m.color.setHex(hex));
  }

  // Indian number plate (white background, black lettering)
  getPlateTexture(text) {
    if (this.plateTextures[text]) return this.plateTextures[text];
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, 250, 58);
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(6, 6, 26, 52);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('IND', 19, 38);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 34px Arial Black, Arial, sans-serif';
    ctx.fillText(text, 144, 45);
    const tex = new THREE.CanvasTexture(canvas);
    this.plateTextures[text] = tex;
    return tex;
  }

  createPlate(text, w = 0.52, h = 0.13) {
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: this.getPlateTexture(text) })
    );
    return plate;
  }

  randomPlate() {
    const states = ['MH', 'KA', 'GJ', 'DL', 'TN', 'RJ', 'UP', 'GA'];
    const s = states[Math.floor(Math.random() * states.length)];
    const n = String(Math.floor(Math.random() * 90) + 10);
    const l = String.fromCharCode(65 + Math.floor(Math.random() * 26), 65 + Math.floor(Math.random() * 26));
    const d = String(Math.floor(Math.random() * 9000) + 1000);
    return `${s}${n} ${l} ${d}`;
  }

  // Classic painted auto-rickshaw rear canvas: "OK TATA" + "Khacha Company"
  createAutoRearTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, 256, 256);
    // Checkered trim
    for (let x = 0; x < 256; x += 16) {
      ctx.fillStyle = (x / 16) % 2 === 0 ? '#facc15' : '#111827';
      ctx.fillRect(x, 0, 16, 14);
      ctx.fillStyle = (x / 16) % 2 === 0 ? '#111827' : '#facc15';
      ctx.fillRect(x, 242, 16, 14);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 34px Impact, Arial Black, sans-serif';
    ctx.fillText('OK TATA', 128, 68);
    ctx.fillStyle = '#f472b6';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillText('Bura Mat Dekho', 128, 110);
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText('KHACHA COMPANY', 128, 150);
    // Evil-eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(128, 200, 34, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.arc(128, 200, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(128, 200, 6, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
  }

  // State transport bus livery with windows
  createBusSideTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(0, 78, 512, 14);
    // Windows
    ctx.fillStyle = '#1e293b';
    for (let x = 16; x < 500; x += 54) {
      ctx.fillRect(x, 12, 44, 52);
    }
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MSRTC  •  NH-44 EXPRESS  •  यात्री सेवा', 256, 118);
    return new THREE.CanvasTexture(canvas);
  }

  // Bus rear: route board, slogan and "Keep Distance" warning
  createBusRearTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(28, 18, 200, 70); // rear window
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(0, 100, 256, 16);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 30px Impact, Arial Black, sans-serif';
    ctx.fillText('LAL PARI', 128, 152);
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('PUNE ⇄ MUMBAI', 128, 180);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(18, 200, 220, 34);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText('KEEP DISTANCE', 128, 223);
    return new THREE.CanvasTexture(canvas);
  }

  // Colourful hanging tassels (jhalar) for trucks
  createJhalar(width, y, z) {
    const group = new THREE.Group();
    const colors = [0xef4444, 0xfacc15, 0x22c55e, 0x3b82f6, 0xec4899];
    const geo = new THREE.ConeGeometry(0.06, 0.22, 4);
    geo.rotateX(Math.PI);
    const mats = colors.map(c => new THREE.MeshBasicMaterial({ color: c }));
    const count = Math.round(width / 0.16);
    for (let i = 0; i < count; i++) {
      const t = new THREE.Mesh(geo, mats[i % mats.length]);
      t.position.set(-width / 2 + (i + 0.5) * (width / count), y, z);
      group.add(t);
    }
    return group;
  }

  // Simple seated driver (used in auto and bike)
  createDriver(shirtColor = 0xf1f5f9) {
    const g = new THREE.Group();
    const skin = new THREE.MeshLambertMaterial({ color: 0x8d5524 });
    const shirt = new THREE.MeshLambertMaterial({ color: shirtColor });
    const hair = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.26), shirt);
    torso.position.y = 0.25;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), skin);
    head.position.y = 0.66;
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.145, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), hair);
    hairCap.position.y = 0.68;
    const armGeo = new THREE.BoxGeometry(0.1, 0.1, 0.42);
    const armL = new THREE.Mesh(armGeo, shirt);
    armL.position.set(0.22, 0.38, 0.2);
    const armR = armL.clone();
    armR.position.x = -0.22;
    g.add(torso, head, hairCap, armL, armR);
    return g;
  }

  // Generates authentic "HORN OK PLEASE" painted canvas texture
  createTruckTailgateTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Wooden slat background
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 0, 512, 256);

    // Darker horizontal wood lines
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 4;
    for (let y = 30; y < 256; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Outer decorative border
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 12;
    ctx.strokeRect(10, 10, 492, 236);

    // Decorative inner green border
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 6;
    ctx.strokeRect(22, 22, 468, 212);

    // "HORN OK PLEASE" in iconic painted style
    ctx.font = 'bold 54px Impact, Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText('HORN   OK   PLEASE', 256, 110);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeText('HORN   OK   PLEASE', 256, 110);

    // Subtitle slogans
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillStyle = '#b91c1c';
    ctx.fillText('⚡ KHACHA COMPANY EXPRESS ⚡', 256, 160);

    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillStyle = '#065f46';
    ctx.fillText('STOP  ★  SPEED 40 KM/H  ★  WAIT FOR SIGNAL', 256, 205);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    return texture;
  }

  // 1. AUTO-RICKSHAW (Tuk-Tuk) - Signature Indian Ride
  createAutoRickshaw(options = {}) {
    const group = new THREE.Group();
    const primaryColor = options.primaryColor || 0x15803d; // Green or Black
    const canopyColor = options.canopyColor || 0xfacc15;   // Yellow Roof

    const matCanopy = new THREE.MeshLambertMaterial({ color: canopyColor });
    const matChassis = new THREE.MeshLambertMaterial({ color: primaryColor });
    const matDark = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const matChrome = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.3, metalness: 0.8 });
    const matGlass = new THREE.MeshLambertMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.5 });
    const matTire = new THREE.MeshLambertMaterial({ color: 0x111827 });
    const matLight = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const matTail = this.makeTailMaterial();

    // Lower Cabin Body
    const bodyGeo = new THREE.BoxGeometry(1.4, 0.7, 2.2);
    const body = new THREE.Mesh(bodyGeo, matChassis);
    body.position.y = 0.65;
    group.add(body);

    // Front Nose / Engine Cover (Tapered)
    const noseGeo = new THREE.CylinderGeometry(0.4, 0.7, 0.9, 8);
    const nose = new THREE.Mesh(noseGeo, matChassis);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.6, 1.35);
    group.add(nose);

    // Canopy / Roof
    const roofGeo = new THREE.BoxGeometry(1.36, 0.15, 1.9);
    const roof = new THREE.Mesh(roofGeo, matCanopy);
    roof.position.set(0, 1.6, -0.1);
    group.add(roof);

    // Curved Canopy Front Overhang
    const canopyFrontGeo = new THREE.CylinderGeometry(0.68, 0.68, 1.36, 12, 1, false, 0, Math.PI);
    const canopyFront = new THREE.Mesh(canopyFrontGeo, matCanopy);
    canopyFront.rotation.z = Math.PI / 2;
    canopyFront.position.set(0, 1.55, 0.85);
    group.add(canopyFront);

    // Pillars / Frames (Black metal)
    const pillarGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.9);
    const p1 = new THREE.Mesh(pillarGeo, matDark);
    p1.position.set(0.62, 1.15, -0.9);
    const p2 = p1.clone();
    p2.position.x = -0.62;
    const p3 = p1.clone();
    p3.position.set(0.62, 1.15, 0.8);
    const p4 = p1.clone();
    p4.position.set(-0.62, 1.15, 0.8);
    group.add(p1, p2, p3, p4);

    // Front Windshield
    const glassGeo = new THREE.BoxGeometry(1.2, 0.5, 0.04);
    const glass = new THREE.Mesh(glassGeo, matGlass);
    glass.position.set(0, 1.25, 0.85);
    glass.rotation.x = -0.15;
    group.add(glass);

    // Headlight (Round)
    const lightGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16);
    const light = new THREE.Mesh(lightGeo, matLight);
    light.rotation.x = Math.PI / 2;
    light.position.set(0, 0.7, 1.8);
    group.add(light);

    // Taillights
    const tailGeo = new THREE.BoxGeometry(0.22, 0.12, 0.05);
    const tailL = new THREE.Mesh(tailGeo, matTail);
    tailL.position.set(0.5, 0.65, -1.12);
    const tailR = tailL.clone();
    tailR.position.x = -0.5;
    group.add(tailL, tailR);

    // Painted rear canvas ("OK TATA" + evil eye) - the view players stare at all race long
    const rearPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 0.62),
      new THREE.MeshBasicMaterial({ map: this.autoRearTexture })
    );
    rearPanel.rotation.y = Math.PI;
    rearPanel.position.set(0, 1.28, -1.11);
    group.add(rearPanel);

    // Rear number plate
    const plate = this.createPlate(options.plate || this.randomPlate(), 0.46, 0.12);
    plate.rotation.y = Math.PI;
    plate.position.set(0, 0.48, -1.13);
    group.add(plate);

    // Black side stripe & chrome rear bumper bar
    const stripeGeo = new THREE.BoxGeometry(1.42, 0.08, 2.0);
    const stripe = new THREE.Mesh(stripeGeo, matDark);
    stripe.position.set(0, 0.85, 0);
    group.add(stripe);
    const rearBar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8), matChrome);
    rearBar.rotation.z = Math.PI / 2;
    rearBar.position.set(0, 0.36, -1.2);
    group.add(rearBar);

    // Front mudguard over the single wheel & handlebar
    const mudguard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.22, 12, 1, true, 0, Math.PI),
      matChassis
    );
    mudguard.rotation.z = Math.PI / 2;
    mudguard.position.set(0, 0.3, 1.35);
    group.add(mudguard);
    const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), matChrome);
    handlebar.rotation.z = Math.PI / 2;
    handlebar.position.set(0, 1.12, 0.62);
    group.add(handlebar);

    // Driver in khaki uniform
    const driver = this.createDriver(0xc2a36b);
    driver.position.set(0, 0.95, 0.25);
    group.add(driver);

    // Wheels (3 Wheels: 1 Front, 2 Rear)
    const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 16);
    wheelGeo.rotateZ(Math.PI / 2);

    const frontWheel = new THREE.Mesh(wheelGeo, matTire);
    frontWheel.position.set(0, 0.28, 1.35);
    const rearWheelL = new THREE.Mesh(wheelGeo, matTire);
    rearWheelL.position.set(0.72, 0.28, -0.7);
    const rearWheelR = rearWheelL.clone();
    rearWheelR.position.x = -0.72;
    group.add(frontWheel, rearWheelL, rearWheelR);

    // Store references for animation
    group.userData = {
      type: 'auto',
      wheels: [frontWheel, rearWheelL, rearWheelR],
      brakeMats: [matTail],
      length: 3.2,
      width: 1.6
    };

    // Rotate 180 degrees so front faces forward (-Z direction of travel)
    const root = new THREE.Group();
    group.rotation.y = Math.PI;
    root.add(group);
    root.userData = group.userData;

    return root;
  }

  // 2. TATA FREIGHT TRUCK ("Horn OK Please")
  createTataTruck(options = {}) {
    const group = new THREE.Group();
    const cabColor = options.cabColor || 0x2563eb; // Royal blue or orange
    const bodyColor = options.bodyColor || 0xd97706; // Wooden yellow/orange

    const matCab = new THREE.MeshLambertMaterial({ color: cabColor });
    const matBody = new THREE.MeshLambertMaterial({ color: bodyColor });
    const matTailgate = new THREE.MeshBasicMaterial({ map: this.truckTailgateTexture });
    const matDark = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const matTire = new THREE.MeshLambertMaterial({ color: 0x111827 });
    const matLight = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const matGlass = new THREE.MeshLambertMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.5 });

    // Chassis Frame (Steel beam)
    const chassisGeo = new THREE.BoxGeometry(1.8, 0.4, 7.2);
    const chassis = new THREE.Mesh(chassisGeo, matDark);
    chassis.position.y = 0.7;
    group.add(chassis);

    // Driver Cabin
    const cabGeo = new THREE.BoxGeometry(2.3, 2.0, 2.2);
    const cab = new THREE.Mesh(cabGeo, matCab);
    cab.position.set(0, 1.8, 2.3);
    group.add(cab);

    // Ornate Wooden Sunvisor Overhang
    const visorGeo = new THREE.BoxGeometry(2.4, 0.2, 0.4);
    const visor = new THREE.Mesh(visorGeo, new THREE.MeshLambertMaterial({ color: 0xdc2626 }));
    visor.position.set(0, 2.8, 3.3);
    group.add(visor);

    // Cabin Windshield
    const glassGeo = new THREE.BoxGeometry(2.0, 0.7, 0.05);
    const glass = new THREE.Mesh(glassGeo, matGlass);
    glass.position.set(0, 2.1, 3.42);
    group.add(glass);

    // Front Chrome Grill & Bumpers
    const bumperGeo = new THREE.BoxGeometry(2.4, 0.4, 0.3);
    const bumper = new THREE.Mesh(bumperGeo, new THREE.MeshLambertMaterial({ color: 0xf1f5f9 }));
    bumper.position.set(0, 0.65, 3.5);
    group.add(bumper);

    // Twin Round Headlights
    const lightGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.1, 16);
    lightGeo.rotateX(Math.PI / 2);
    const headL = new THREE.Mesh(lightGeo, matLight);
    headL.position.set(0.85, 0.7, 3.65);
    const headR = headL.clone();
    headR.position.x = -0.85;
    group.add(headL, headR);

    // Huge Cargo Wooden Body
    const cargoGeo = new THREE.BoxGeometry(2.4, 2.2, 4.6);
    const cargo = new THREE.Mesh(cargoGeo, matBody);
    cargo.position.set(0, 2.0, -1.2);
    group.add(cargo);

    // Rear Tailgate with "HORN OK PLEASE"
    const tailgateGeo = new THREE.PlaneGeometry(2.38, 2.18);
    const tailgate = new THREE.Mesh(tailgateGeo, matTailgate);
    tailgate.rotation.y = Math.PI;
    tailgate.position.set(0, 2.0, -3.51);
    group.add(tailgate);

    // Tail lamps (brake-reactive), reflector bar & number plate
    const matTail = this.makeTailMaterial();
    const truckTailGeo = new THREE.BoxGeometry(0.34, 0.2, 0.06);
    const tTailL = new THREE.Mesh(truckTailGeo, matTail);
    tTailL.position.set(0.95, 0.72, -3.63);
    const tTailR = tTailL.clone();
    tTailR.position.x = -0.95;
    group.add(tTailL, tTailR);

    const truckPlate = this.createPlate(options.plate || this.randomPlate(), 0.6, 0.15);
    truckPlate.rotation.y = Math.PI;
    truckPlate.position.set(0, 0.72, -3.64);
    group.add(truckPlate);

    // Rubber mud flaps with painted slogans' colours
    const flapMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
    const flapGeo = new THREE.BoxGeometry(0.5, 0.55, 0.03);
    const flapL = new THREE.Mesh(flapGeo, flapMat);
    flapL.position.set(1.15, 0.32, -3.0);
    const flapR = flapL.clone();
    flapR.position.x = -1.15;
    group.add(flapL, flapR);

    // Jhalar tassels on front visor and along the tailgate
    group.add(this.createJhalar(2.3, 2.6, 3.52));
    group.add(this.createJhalar(2.3, 0.86, -3.56));

    // Nazar battu: black tassel hanging from the rear
    const nazar = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 6), flapMat);
    nazar.rotation.x = Math.PI;
    nazar.position.set(0, 0.35, -3.62);
    group.add(nazar);

    // Heavy Truck Wheels (6 Wheels: 2 Front, 4 Dual Rear)
    const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.32, 16);
    wheelGeo.rotateZ(Math.PI / 2);

    const wheels = [];
    const positions = [
      [1.15, 0.48, 2.3],   // Front Right
      [-1.15, 0.48, 2.3],  // Front Left
      [1.15, 0.48, -1.2],  // Mid Right
      [-1.15, 0.48, -1.2], // Mid Left
      [1.15, 0.48, -2.5],  // Rear Right
      [-1.15, 0.48, -2.5]  // Rear Left
    ];

    positions.forEach(pos => {
      const w = new THREE.Mesh(wheelGeo, matTire);
      w.position.set(pos[0], pos[1], pos[2]);
      group.add(w);
      wheels.push(w);
    });

    group.userData = {
      type: 'truck',
      wheels: wheels,
      brakeMats: [matTail],
      length: 7.5,
      width: 2.6
    };

    // Rotate 180 degrees so front faces forward (-Z direction of travel)
    const root = new THREE.Group();
    group.rotation.y = Math.PI;
    root.add(group);
    root.userData = group.userData;

    return root;
  }

  // 3. MARUTI SUZUKI SWIFT (Modern Hot Hatchback)
  createMarutiSwift(options = {}) {
    const group = new THREE.Group();
    const bodyColor = options.bodyColor || 0xdc2626; // Sporty Firecracker Red
    const hasBlackRoof = options.hasBlackRoof !== undefined ? options.hasBlackRoof : true;
    const roofColor = options.roofColor || (hasBlackRoof ? 0x111827 : bodyColor);

    const matBody = new THREE.MeshLambertMaterial({ color: bodyColor });
    const matRoof = new THREE.MeshLambertMaterial({ color: roofColor });
    const matPillar = new THREE.MeshLambertMaterial({ color: 0x0f172a }); // Gloss Black Pillars
    const matGrille = new THREE.MeshLambertMaterial({ color: 0x1f2937 }); // Honeycomb dark grille
    const matChrome = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.25, metalness: 0.85 });
    const matGlass = new THREE.MeshLambertMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.55 });
    const matTire = new THREE.MeshLambertMaterial({ color: 0x18181b });
    const matRim = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.75 });
    const matHeadlight = new THREE.MeshBasicMaterial({ color: 0xffffff }); // Bright LED Projector
    const matDRL = new THREE.MeshBasicMaterial({ color: 0xa5f3fc }); // Signature Ice-White DRL
    const matTail = this.makeTailMaterial(); // C-shaped LED Tail (brake-reactive)
    const matReflector = new THREE.MeshBasicMaterial({ color: 0x991b1b });

    // Lower Main Body Tub (Aerodynamic Hatchback Profile)
    const lowerGeo = new THREE.BoxGeometry(1.72, 0.46, 3.65);
    const lower = new THREE.Mesh(lowerGeo, matBody);
    lower.position.y = 0.52;
    group.add(lower);

    // Sculpted Wheel Arch Fenders
    const fenderGeo = new THREE.BoxGeometry(1.76, 0.40, 2.5);
    const fender = new THREE.Mesh(fenderGeo, matBody);
    fender.position.y = 0.52;
    group.add(fender);

    // Aerodynamic Sloping Hood
    const hoodGeo = new THREE.BoxGeometry(1.64, 0.16, 1.15);
    const hood = new THREE.Mesh(hoodGeo, matBody);
    hood.position.set(0, 0.73, 1.25);
    hood.rotation.x = 0.08;
    group.add(hood);

    // Front Bumper / Nose Assembly
    const frontBumperGeo = new THREE.BoxGeometry(1.70, 0.36, 0.35);
    const frontBumper = new THREE.Mesh(frontBumperGeo, matBody);
    frontBumper.position.set(0, 0.42, 1.82);
    group.add(frontBumper);

    // Iconic Hexagonal Honeycomb Lower Grille
    const grilleGeo = new THREE.BoxGeometry(1.22, 0.22, 0.08);
    const grille = new THREE.Mesh(grilleGeo, matGrille);
    grille.position.set(0, 0.38, 1.98);
    group.add(grille);

    // Upper Grille Chrome Wing with Suzuki 'S' Emblem
    const chromeWingGeo = new THREE.BoxGeometry(0.82, 0.04, 0.06);
    const chromeWing = new THREE.Mesh(chromeWingGeo, matChrome);
    chromeWing.position.set(0, 0.62, 1.95);
    group.add(chromeWing);

    const suzukiBadgeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.04);
    const suzukiBadge = new THREE.Mesh(suzukiBadgeGeo, matChrome);
    suzukiBadge.position.set(0, 0.62, 1.98);
    group.add(suzukiBadge);

    // Swept-Back Angular Headlights (L & R)
    const headGeo = new THREE.BoxGeometry(0.32, 0.15, 0.45);
    const headL = new THREE.Mesh(headGeo, matHeadlight);
    headL.position.set(0.64, 0.65, 1.62);
    headL.rotation.y = 0.22;
    headL.rotation.z = -0.08;

    const drlL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.42), matDRL);
    drlL.position.set(0.65, 0.61, 1.63);
    drlL.rotation.y = 0.22;
    drlL.rotation.z = -0.08;

    const headR = new THREE.Mesh(headGeo, matHeadlight);
    headR.position.set(-0.64, 0.65, 1.62);
    headR.rotation.y = -0.22;
    headR.rotation.z = 0.08;

    const drlR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.42), matDRL);
    drlR.position.set(-0.65, 0.61, 1.63);
    drlR.rotation.y = -0.22;
    drlR.rotation.z = 0.08;

    group.add(headL, drlL, headR, drlR);

    // Lower Bumper Fog Light Recesses
    const fogGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12);
    fogGeo.rotateX(Math.PI / 2);
    const fogL = new THREE.Mesh(fogGeo, matHeadlight);
    fogL.position.set(0.62, 0.32, 1.96);
    const fogR = fogL.clone();
    fogR.position.x = -0.62;
    group.add(fogL, fogR);

    // Greenhouse Cabin Core (Cabin sides & interior frame)
    const cabinGeo = new THREE.BoxGeometry(1.48, 0.48, 1.85);
    const cabin = new THREE.Mesh(cabinGeo, matPillar);
    cabin.position.set(0, 1.02, -0.25);
    group.add(cabin);

    // Raked Front Windshield
    const frontWindshieldGeo = new THREE.BoxGeometry(1.42, 0.56, 0.05);
    const frontWindshield = new THREE.Mesh(frontWindshieldGeo, matGlass);
    frontWindshield.rotation.x = -0.58;
    frontWindshield.position.set(0, 1.04, 0.65);
    group.add(frontWindshield);

    // Blacked-Out A-Pillars (Swift's signature wrap-around visor look)
    const aPillarGeo = new THREE.BoxGeometry(0.08, 0.58, 0.08);
    const aPillarL = new THREE.Mesh(aPillarGeo, matPillar);
    aPillarL.rotation.x = -0.58;
    aPillarL.rotation.z = 0.12;
    aPillarL.position.set(0.70, 1.04, 0.65);

    const aPillarR = new THREE.Mesh(aPillarGeo, matPillar);
    aPillarR.rotation.x = -0.58;
    aPillarR.rotation.z = -0.12;
    aPillarR.position.set(-0.70, 1.04, 0.65);
    group.add(aPillarL, aPillarR);

    // Side Windows (Glass)
    const sideGlassGeo = new THREE.BoxGeometry(0.04, 0.42, 1.65);
    const sideGlassL = new THREE.Mesh(sideGlassGeo, matGlass);
    sideGlassL.position.set(0.73, 1.03, -0.25);
    const sideGlassR = new THREE.Mesh(sideGlassGeo, matGlass);
    sideGlassR.position.set(-0.73, 1.03, -0.25);
    group.add(sideGlassL, sideGlassR);

    // Blacked-Out B-Pillars
    const bPillarGeo = new THREE.BoxGeometry(0.06, 0.44, 0.10);
    const bPillarL = new THREE.Mesh(bPillarGeo, matPillar);
    bPillarL.position.set(0.74, 1.03, -0.22);
    const bPillarR = new THREE.Mesh(bPillarGeo, matPillar);
    bPillarR.position.set(-0.74, 1.03, -0.22);
    group.add(bPillarL, bPillarR);

    // Sloped Rear Hatchback Glass
    const rearGlassGeo = new THREE.BoxGeometry(1.36, 0.50, 0.05);
    const rearGlass = new THREE.Mesh(rearGlassGeo, matGlass);
    rearGlass.rotation.x = 0.60;
    rearGlass.position.set(0, 1.03, -1.18);
    group.add(rearGlass);

    // Signature Floating Roof Panel
    const roofGeo = new THREE.BoxGeometry(1.46, 0.07, 1.92);
    const roof = new THREE.Mesh(roofGeo, matRoof);
    roof.position.set(0, 1.30, -0.26);
    group.add(roof);

    // Sporty Integrated Rear Roof Spoiler Lip
    const spoilerGeo = new THREE.BoxGeometry(1.48, 0.07, 0.32);
    const spoiler = new THREE.Mesh(spoilerGeo, matRoof);
    spoiler.position.set(0, 1.32, -1.28);
    spoiler.rotation.x = -0.06;
    group.add(spoiler);

    // High Mount LED Stop Lamp inside Spoiler Lip
    const stopLampGeo = new THREE.BoxGeometry(0.36, 0.03, 0.04);
    const stopLamp = new THREE.Mesh(stopLampGeo, matTail);
    stopLamp.position.set(0, 1.32, -1.43);
    group.add(stopLamp);

    // Rear Hatch Door & Bumper
    const rearHatchGeo = new THREE.BoxGeometry(1.68, 0.52, 0.38);
    const rearHatch = new THREE.Mesh(rearHatchGeo, matBody);
    rearHatch.position.set(0, 0.66, -1.65);
    group.add(rearHatch);

    const rearBumperGeo = new THREE.BoxGeometry(1.70, 0.35, 0.26);
    const rearBumper = new THREE.Mesh(rearBumperGeo, matBody);
    rearBumper.position.set(0, 0.40, -1.80);
    group.add(rearBumper);

    // Rear Lower Diffuser (Sporty Dark Grey)
    const diffuserGeo = new THREE.BoxGeometry(1.32, 0.14, 0.08);
    const diffuser = new THREE.Mesh(diffuserGeo, matGrille);
    diffuser.position.set(0, 0.26, -1.91);
    group.add(diffuser);

    // Wraparound C-Shaped LED Taillights (L & R)
    const tailGeo = new THREE.BoxGeometry(0.24, 0.20, 0.14);
    const tailL = new THREE.Mesh(tailGeo, matTail);
    tailL.position.set(0.66, 0.74, -1.76);
    const tailR = tailL.clone();
    tailR.position.x = -0.66;
    group.add(tailL, tailR);

    // Lower Bumper Reflectors
    const reflGeo = new THREE.BoxGeometry(0.18, 0.04, 0.04);
    const reflL = new THREE.Mesh(reflGeo, matReflector);
    reflL.position.set(0.62, 0.36, -1.93);
    const reflR = reflL.clone();
    reflR.position.x = -0.62;
    group.add(reflL, reflR);

    // Rear Suzuki Chrome 'S' Emblem
    const rearBadge = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.03), matChrome);
    rearBadge.position.set(0, 0.76, -1.85);
    group.add(rearBadge);

    const swiftPlate = this.createPlate(options.plate || this.randomPlate(), 0.5, 0.12);
    swiftPlate.rotation.y = Math.PI;
    swiftPlate.position.set(0, 0.52, -1.87);
    group.add(swiftPlate);

    // Twin Sporty Chrome Exhaust Tips
    const pipeGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.16, 12);
    pipeGeo.rotateX(Math.PI / 2);
    const pipe1 = new THREE.Mesh(pipeGeo, matChrome);
    pipe1.position.set(0.46, 0.24, -1.95);
    const pipe2 = new THREE.Mesh(pipeGeo, matChrome);
    pipe2.position.set(0.56, 0.24, -1.95);
    group.add(pipe1, pipe2);

    // Aerodynamic Wing Mirrors
    const mirrorGeo = new THREE.BoxGeometry(0.16, 0.10, 0.12);
    const mirrorL = new THREE.Mesh(mirrorGeo, matRoof);
    mirrorL.position.set(0.82, 0.94, 0.52);
    const mirrorR = mirrorL.clone();
    mirrorR.position.x = -0.82;
    group.add(mirrorL, mirrorR);

    // 4 Sporty Alloy Wheels with 5-Spoke Silver Rim Design
    const wheelPositions = [
      [0.82, 0.31, 1.15],   // Front Left
      [-0.82, 0.31, 1.15],  // Front Right
      [0.82, 0.31, -1.15],  // Rear Left
      [-0.82, 0.31, -1.15]  // Rear Right
    ];

    const wheels = [];
    const tireGeo = new THREE.CylinderGeometry(0.31, 0.31, 0.22, 16);
    tireGeo.rotateZ(Math.PI / 2);

    const rimGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.225, 16);
    rimGeo.rotateZ(Math.PI / 2);

    const spokeGeo = new THREE.BoxGeometry(0.04, 0.36, 0.23);

    wheelPositions.forEach(pos => {
      const wheelAssembly = new THREE.Group();

      const tire = new THREE.Mesh(tireGeo, matTire);
      wheelAssembly.add(tire);

      const rim = new THREE.Mesh(rimGeo, matRim);
      wheelAssembly.add(rim);

      // 5-Spoke Alloy Star pattern
      for (let s = 0; s < 5; s++) {
        const spoke = new THREE.Mesh(spokeGeo, matChrome);
        spoke.rotation.x = (s * Math.PI * 2) / 5;
        wheelAssembly.add(spoke);
      }

      wheelAssembly.position.set(pos[0], pos[1], pos[2]);
      group.add(wheelAssembly);
      wheels.push(wheelAssembly);
    });

    group.userData = {
      type: 'swift',
      wheels: wheels,
      brakeMats: [matTail],
      length: 3.85,
      width: 1.74
    };

    // Rotate 180 degrees so front faces forward (-Z direction of travel)
    const root = new THREE.Group();
    group.rotation.y = Math.PI;
    root.add(group);
    root.userData = group.userData;

    return root;
  }

  // Wrap a +Z-facing group so it faces the direction of travel (-Z)
  finish(group, userData) {
    group.userData = userData;
    const root = new THREE.Group();
    group.rotation.y = Math.PI;
    root.add(group);
    root.userData = group.userData;
    return root;
  }

  // 4. HINDUSTAN AMBASSADOR TAXI (Black & yellow Kaali-Peeli)
  createAmbassador(options = {}) {
    const group = new THREE.Group();
    const matYellow = new THREE.MeshLambertMaterial({ color: options.roofColor || 0xfacc15 });
    const matBlack = new THREE.MeshLambertMaterial({ color: options.bodyColor || 0x111111 });
    const matChrome = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.3, metalness: 0.8 });
    const matGlass = new THREE.MeshLambertMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.55 });
    const matTire = new THREE.MeshLambertMaterial({ color: 0x111827 });
    const matHead = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
    const matTail = this.makeTailMaterial();

    // Rounded classic body: lower box + bulbous fenders
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 4.1), matBlack);
    lower.position.y = 0.6;
    group.add(lower);
    const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 1.2, 14, 1, false, 0, Math.PI), matBlack);
    hood.rotation.x = Math.PI / 2;
    hood.rotation.z = Math.PI / 2;
    hood.scale.set(1, 1, 0.35);
    hood.position.set(0, 0.86, 1.4);
    group.add(hood);
    const boot = hood.clone();
    boot.position.z = -1.45;
    boot.scale.set(1, 0.8, 0.3);
    group.add(boot);

    // Yellow cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 1.9), matYellow);
    cabin.position.set(0, 1.15, -0.1);
    group.add(cabin);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.12, 1.7), matYellow);
    roof.position.set(0, 1.47, -0.1);
    group.add(roof);
    const glassF = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.42, 0.05), matGlass);
    glassF.position.set(0, 1.17, 0.86);
    glassF.rotation.x = -0.35;
    const glassB = glassF.clone();
    glassB.position.z = -1.06;
    glassB.rotation.x = 0.35;
    group.add(glassF, glassB);
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.36, 1.6), matGlass);
    sideGlass.position.set(0, 1.18, -0.1);
    group.add(sideGlass);

    // Roof TAXI sign
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.2), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    sign.position.set(0, 1.62, 0.1);
    group.add(sign);

    // Chrome grille, bumpers, round headlights
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.05), matChrome);
    grille.position.set(0, 0.72, 2.06);
    const bumperF = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 0.14), matChrome);
    bumperF.position.set(0, 0.42, 2.1);
    const bumperR = bumperF.clone();
    bumperR.position.z = -2.1;
    group.add(grille, bumperF, bumperR);
    const hlGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.06, 14);
    hlGeo.rotateX(Math.PI / 2);
    const hlL = new THREE.Mesh(hlGeo, matHead);
    hlL.position.set(0.62, 0.78, 2.07);
    const hlR = hlL.clone();
    hlR.position.x = -0.62;
    group.add(hlL, hlR);
    const tGeo = new THREE.BoxGeometry(0.16, 0.22, 0.05);
    const tL = new THREE.Mesh(tGeo, matTail);
    tL.position.set(0.68, 0.72, -2.07);
    const tR = tL.clone();
    tR.position.x = -0.68;
    group.add(tL, tR);
    const plate = this.createPlate(options.plate || this.randomPlate(), 0.5, 0.12);
    plate.rotation.y = Math.PI;
    plate.position.set(0, 0.62, -2.06);
    group.add(plate);

    const wheels = [];
    const wGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.22, 14);
    wGeo.rotateZ(Math.PI / 2);
    [[0.8, 1.35], [-0.8, 1.35], [0.8, -1.35], [-0.8, -1.35]].forEach(([x, z]) => {
      const w = new THREE.Mesh(wGeo, matTire);
      w.position.set(x, 0.33, z);
      group.add(w);
      wheels.push(w);
    });

    return this.finish(group, { type: 'taxi', wheels, brakeMats: [matTail], length: 4.3, width: 1.75 });
  }

  // 5. ROYAL ENFIELD BULLET (thump-thump highway cruiser)
  createBullet(options = {}) {
    const group = new THREE.Group();
    const tankColor = options.tankColor || [0x111111, 0x7f1d1d, 0x14532d, 0x1e3a8a][Math.floor(Math.random() * 4)];
    const matTank = new THREE.MeshStandardMaterial({ color: tankColor, roughness: 0.35, metalness: 0.5 });
    const matChrome = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.25, metalness: 0.9 });
    const matDark = new THREE.MeshLambertMaterial({ color: 0x1f2937 });
    const matTire = new THREE.MeshLambertMaterial({ color: 0x111827 });
    const matHead = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
    const matTail = this.makeTailMaterial();

    const wGeo = new THREE.TorusGeometry(0.32, 0.08, 8, 18);
    wGeo.rotateY(Math.PI / 2);
    const front = new THREE.Mesh(wGeo, matTire);
    front.position.set(0, 0.4, 0.75);
    const rear = new THREE.Mesh(wGeo, matTire);
    rear.position.set(0, 0.4, -0.72);
    group.add(front, rear);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 1.3), matDark);
    frame.position.set(0, 0.62, 0);
    frame.rotation.x = -0.08;
    group.add(frame);
    const engine = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.4), matChrome);
    engine.position.set(0, 0.52, 0.08);
    group.add(engine);
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), matTank);
    tank.scale.set(0.9, 0.75, 1.6);
    tank.position.set(0, 0.92, 0.22);
    group.add(tank);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.62), matDark);
    seat.position.set(0, 0.92, -0.28);
    group.add(seat);
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.9, 8), matChrome);
    exhaust.rotation.x = Math.PI / 2 - 0.1;
    exhaust.position.set(0.2, 0.42, -0.35);
    group.add(exhaust);
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 6), matChrome);
    fork.rotation.x = -0.4;
    fork.position.set(0, 0.78, 0.62);
    group.add(fork);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), matChrome);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.12, 0.48);
    group.add(bar);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12), matHead);
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(0, 1.0, 0.72);
    group.add(lamp);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.05), matTail);
    tail.position.set(0, 0.86, -0.72);
    group.add(tail);
    const plate = this.createPlate(options.plate || this.randomPlate(), 0.28, 0.08);
    plate.rotation.y = Math.PI;
    plate.position.set(0, 0.72, -0.78);
    group.add(plate);

    // Rider with helmet
    const rider = this.createDriver([0x1e3a8a, 0x334155, 0x7c2d12, 0xf1f5f9][Math.floor(Math.random() * 4)]);
    rider.position.set(0, 0.95, -0.12);
    rider.rotation.x = 0.18;
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshLambertMaterial({ color: 0xdc2626 }));
    helmet.position.set(0, 0.68, 0);
    rider.add(helmet);
    group.add(rider);

    return this.finish(group, { type: 'bike', wheels: [front, rear], brakeMats: [matTail], length: 2.1, width: 0.8 });
  }

  // 6. STATE TRANSPORT BUS (lumbering MSRTC "Lal Pari")
  createBus(options = {}) {
    const group = new THREE.Group();
    const matRed = new THREE.MeshLambertMaterial({ color: 0xb91c1c });
    const matCream = new THREE.MeshLambertMaterial({ color: 0xfef3c7 });
    const matSide = new THREE.MeshBasicMaterial({ map: this.busSideTexture });
    const matGlass = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const matTire = new THREE.MeshLambertMaterial({ color: 0x111827 });
    const matHead = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
    const matTail = this.makeTailMaterial();

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.4, 10.5), matRed);
    body.position.y = 1.85;
    group.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 10.2), matCream);
    roof.position.y = 3.12;
    group.add(roof);
    // Roof carrier with luggage bundles
    const luggageCols = [0x1d4ed8, 0x15803d, 0xa16207, 0x9d174d];
    for (let i = 0; i < 5; i++) {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.7 + Math.random() * 0.5, 0.35 + Math.random() * 0.3, 0.8),
        new THREE.MeshLambertMaterial({ color: luggageCols[i % luggageCols.length] }));
      bag.position.set((Math.random() - 0.5) * 1.2, 3.35, -3 + i * 1.4);
      group.add(bag);
    }
    // Livery side panels
    const sideGeo = new THREE.PlaneGeometry(10.2, 2.0);
    const sideL = new THREE.Mesh(sideGeo, matSide);
    sideL.rotation.y = Math.PI / 2;
    sideL.position.set(1.26, 2.0, 0);
    const sideR = new THREE.Mesh(sideGeo, matSide);
    sideR.rotation.y = -Math.PI / 2;
    sideR.position.set(-1.26, 2.0, 0);
    group.add(sideL, sideR);
    // Windscreen & rear window
    const wind = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.0, 0.05), matGlass);
    wind.position.set(0, 2.3, 5.26);
    group.add(wind);
    const rearPanel = new THREE.Mesh(new THREE.PlaneGeometry(2.48, 2.38), new THREE.MeshBasicMaterial({ map: this.busRearTexture }));
    rearPanel.rotation.y = Math.PI;
    rearPanel.position.set(0, 1.85, -5.26);
    group.add(rearPanel);
    // Destination board
    const dest = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 0.05), new THREE.MeshBasicMaterial({ color: 0xfb923c }));
    dest.position.set(0, 2.95, 5.27);
    group.add(dest);
    const hlGeo = new THREE.BoxGeometry(0.3, 0.2, 0.05);
    const hlL = new THREE.Mesh(hlGeo, matHead);
    hlL.position.set(0.9, 0.95, 5.27);
    const hlR = hlL.clone();
    hlR.position.x = -0.9;
    group.add(hlL, hlR);
    const tGeo = new THREE.BoxGeometry(0.3, 0.3, 0.05);
    const tL = new THREE.Mesh(tGeo, matTail);
    tL.position.set(0.95, 0.85, -5.28);
    const tR = tL.clone();
    tR.position.x = -0.95;
    group.add(tL, tR);
    const plate = this.createPlate(options.plate || this.randomPlate(), 0.6, 0.15);
    plate.rotation.y = Math.PI;
    plate.position.set(0, 0.85, -5.28);
    group.add(plate);
    group.add(this.createJhalar(2.3, 2.85, 5.3));

    const wheels = [];
    const wGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.34, 14);
    wGeo.rotateZ(Math.PI / 2);
    [[1.15, 3.4], [-1.15, 3.4], [1.15, -3.2], [-1.15, -3.2]].forEach(([x, z]) => {
      const w = new THREE.Mesh(wGeo, matTire);
      w.position.set(x, 0.52, z);
      group.add(w);
      wheels.push(w);
    });

    return this.finish(group, { type: 'bus', wheels, brakeMats: [matTail], length: 10.6, width: 2.6 });
  }
}

window.vehicleBuilder = new VehicleBuilder();

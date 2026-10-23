// Procedural 3D Indian Vehicle Generator for NH Odyssey
// Built using compound Three.js primitives and canvas-generated decals

class VehicleBuilder {
  constructor() {
    this.truckTailgateTexture = this.createTruckTailgateTexture();
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
    const matTail = new THREE.MeshBasicMaterial({ color: 0xef4444 });

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
    const tailGeo = new THREE.BoxGeometry(0.2, 0.1, 0.05);
    const tailL = new THREE.Mesh(tailGeo, matTail);
    tailL.position.set(0.5, 0.65, -1.12);
    const tailR = tailL.clone();
    tailR.position.x = -0.5;
    group.add(tailL, tailR);

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
      length: 3.2,
      width: 1.6
    };

    // Rotate 180 degrees so front faces forward (-Z direction of travel)
    const root = new THREE.Group();
    group.rotation.y = Math.PI;
    root.add(group);
    root.userData = group.userData;

    return window.detailBuilder.decorateVehicle(root, 'auto');
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
      length: 7.5,
      width: 2.6
    };

    // Rotate 180 degrees so front faces forward (-Z direction of travel)
    const root = new THREE.Group();
    group.rotation.y = Math.PI;
    root.add(group);
    root.userData = group.userData;

    return window.detailBuilder.decorateVehicle(root, 'truck');
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
    const matTail = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // C-shaped LED Tail
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
      length: 3.85,
      width: 1.74
    };

    // Rotate 180 degrees so front faces forward (-Z direction of travel)
    const root = new THREE.Group();
    group.rotation.y = Math.PI;
    root.add(group);
    root.userData = group.userData;

    return window.detailBuilder.decorateVehicle(root, 'car');
  }

  // Alias for backward compatibility
  createAmbassador(options = {}) {
    return this.createMarutiSwift(options);
  }
}

window.vehicleBuilder = new VehicleBuilder();

// Detail layer for NH Odyssey: procedural textures, vehicle detailing, roadside dressing and sky.
// Everything is generated at load time (canvas textures) and per chunk (instanced meshes),
// so no external assets are needed.

class DetailBuilder {
  constructor() {
    this.seed = 20241;
    this.dummy = new THREE.Object3D();
    this.tmpColor = new THREE.Color();
    this.initMaterials();
    this.initTextures();
    this.initGeometries();
  }

  // Deterministic random for textures so the look is stable between loads
  rand() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  canvasTex(w, h, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    draw(canvas.getContext('2d'), w, h);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }

  // ---------------------------------------------------------------- materials
  initMaterials() {
    const lam = (color) => new THREE.MeshLambertMaterial({ color });
    this.m = {
      dark: lam(0x1b2330),
      black: lam(0x0b0d12),
      rubber: lam(0x16181d),
      // Phong, not Standard: with no environment map, metallic Standard materials render near-black
      chrome: new THREE.MeshPhongMaterial({ color: 0xdfe3e8, specular: 0xffffff, shininess: 90 }),
      steel: lam(0x9aa6b2),
      seat: lam(0x5b1a14),
      skin: lam(0xb9855a),
      rust: lam(0x7c3f1d),
      red: lam(0xdc2626),
      yellow: lam(0xfacc15),
      green: lam(0x15803d),
      white: lam(0xf1f5f9),
      tailLamp: new THREE.MeshBasicMaterial({ color: 0xff3b3b }),
      amberLamp: new THREE.MeshBasicMaterial({ color: 0xffb020 }),
      bulb: new THREE.MeshBasicMaterial({ color: 0xfff1a8 }),
      mirrorGlass: new THREE.MeshPhongMaterial({ color: 0xbfd7ea, specular: 0xffffff, shininess: 120 }),
      glassDark: new THREE.MeshLambertMaterial({ color: 0x5b8db8, transparent: true, opacity: 0.55 })
    };
  }

  // ---------------------------------------------------------------- textures
  initTextures() {
    const t = (this.tex = {});

    // Asphalt with worn wheel tracks per lane, patches and cracks (tiles every 10 m along the road)
    t.asphalt = this.canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#2b2f38';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) {
        const v = 20 + Math.floor(this.rand() * 55);
        g.fillStyle = `rgba(${v},${v},${v + 6},0.35)`;
        g.fillRect(this.rand() * w, this.rand() * h, 1 + this.rand() * 2, 1 + this.rand() * 2);
      }
      [-5.4, -1.8, 1.8, 5.4].forEach(lx => {
        [-0.9, 0.9].forEach(o => {
          const u = ((lx + o + 8) / 16) * w;
          const grad = g.createLinearGradient(u - 14, 0, u + 14, 0);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = grad;
          g.fillRect(u - 14, 0, 28, h);
        });
      });
      for (let i = 0; i < 7; i++) {
        const pw = 20 + this.rand() * 40, ph = 30 + this.rand() * 60;
        g.fillStyle = 'rgba(14,16,21,0.38)';
        g.fillRect(this.rand() * (w - pw), this.rand() * (h - ph), pw, ph);
      }
      g.strokeStyle = 'rgba(8,8,10,0.55)';
      g.lineWidth = 1;
      for (let i = 0; i < 9; i++) {
        let x = this.rand() * w, y = 20 + this.rand() * (h - 140);
        g.beginPath();
        g.moveTo(x, y);
        for (let s = 0; s < 8; s++) {
          x += (this.rand() - 0.5) * 18;
          y += 6 + this.rand() * 12;
          g.lineTo(x, y);
        }
        g.stroke();
      }
    });
    t.asphalt.wrapS = THREE.ClampToEdgeWrapping;
    t.asphalt.repeat.set(1, 6);

    t.groundRural = this.makeGround('#8a724d', ['#9b8057', '#75603f', '#a08a5b', '#6f7a3d'], true);
    t.groundExpress = this.makeGround('#2f5226', ['#3b6830', '#264420', '#4a7a38', '#5b7f3a'], true);
    t.groundUrban = this.makeGround('#242c3a', ['#2e3748', '#1c2330', '#33404f'], false);
    t.shoulderGravel = this.makeGround('#926c45', ['#a98150', '#7a5836', '#9aa0a6', '#6b6258'], false);
    t.shoulderPaved = this.makeGround('#475569', ['#556377', '#3a4556', '#4f5d70'], false);

    t.crops = [
      this.makeField('#3f7a2c', '#2f6422', '#5a9a3a'),
      this.makeField('#c4a13a', '#a98628', '#dcbd55'),
      this.makeField('#6b4a2c', '#553a22', '#7e5a37')
    ];

    t.windows = this.canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#10151f';
      g.fillRect(0, 0, w, h);
      const cols = 8, rows = 8, cw = w / cols, rh = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const roll = this.rand();
          g.fillStyle = roll < 0.55 ? '#ffd27a' : (roll < 0.7 ? '#7fd8ff' : '#1d2635');
          g.fillRect(c * cw + 5, r * rh + 5, cw - 10, rh - 9);
        }
      }
    });

    t.plates = [];
    const states = ['MH 04', 'KA 03', 'DL 8C', 'GJ 01', 'TN 09', 'UP 32'];
    states.forEach((st, i) => {
      const yellow = i % 2 === 0;
      t.plates.push(this.canvasTex(128, 32, (g, w, h) => {
        g.fillStyle = yellow ? '#f7c531' : '#f4f4f0';
        g.fillRect(0, 0, w, h);
        g.strokeStyle = '#111';
        g.lineWidth = 2;
        g.strokeRect(1, 1, w - 2, h - 2);
        g.fillStyle = '#111';
        g.font = 'bold 20px Arial, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(`${st} KC ${1000 + Math.floor(this.rand() * 8999)}`, w / 2, h / 2 + 1);
      }));
    });

    t.shadow = this.canvasTex(128, 128, (g, w, h) => {
      const grad = g.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, w / 2);
      grad.addColorStop(0, 'rgba(0,0,0,0.75)');
      grad.addColorStop(0.55, 'rgba(0,0,0,0.38)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    });
    t.shadow.wrapS = t.shadow.wrapT = THREE.ClampToEdgeWrapping;

    t.glow = this.canvasTex(64, 64, (g, w, h) => {
      const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.3, 'rgba(255,255,255,0.45)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    });
    t.glow.wrapS = t.glow.wrapT = THREE.ClampToEdgeWrapping;

    // Painted truck-art side panel
    t.truckSide = this.canvasTex(512, 256, (g, w, h) => {
      g.fillStyle = '#f2a516';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(150,80,0,0.55)';
      g.lineWidth = 3;
      for (let y = 28; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.strokeStyle = '#c81e1e'; g.lineWidth = 12; g.strokeRect(8, 8, w - 16, h - 16);
      g.strokeStyle = '#146c3a'; g.lineWidth = 5; g.strokeRect(22, 22, w - 44, h - 44);
      g.fillStyle = '#1e3a8a';
      g.font = 'bold 46px Impact, Arial Black, sans-serif';
      g.textAlign = 'center';
      g.fillText('JAI MATA DI', w / 2, 92);
      g.fillStyle = '#b91c1c';
      g.font = 'bold 20px Arial, sans-serif';
      g.fillText('KHACHA COMPANY • ALL INDIA PERMIT', w / 2, 132);
      // painted flowers
      [[90, 190], [180, 200], [332, 200], [422, 190]].forEach(([x, y], i) => {
        g.fillStyle = i % 2 ? '#dc2626' : '#2563eb';
        for (let p = 0; p < 6; p++) {
          g.beginPath();
          g.arc(x + Math.cos(p * 1.047) * 14, y + Math.sin(p * 1.047) * 14, 9, 0, 6.3);
          g.fill();
        }
        g.fillStyle = '#facc15';
        g.beginPath(); g.arc(x, y, 8, 0, 6.3); g.fill();
        g.strokeStyle = '#146c3a'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(x + 24, y + 2); g.quadraticCurveTo(x + 50, y - 16, x + 74, y + 4); g.stroke();
      });
    });
  }

  // Seamless-ish ground texture: large blotches wrapped around the edges, speckle and grass strokes
  makeGround(base, tones, grass) {
    return this.canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        const x = this.rand() * w, y = this.rand() * h;
        const rx = 20 + this.rand() * 60, ry = rx * (0.5 + this.rand() * 0.5), rot = this.rand() * 3;
        g.fillStyle = tones[Math.floor(this.rand() * tones.length)];
        g.globalAlpha = 0.18 + this.rand() * 0.2;
        for (const ox of [-w, 0, w]) {
          for (const oy of [-h, 0, h]) {
            g.beginPath();
            g.ellipse(x + ox, y + oy, rx, ry, rot, 0, Math.PI * 2);
            g.fill();
          }
        }
      }
      g.globalAlpha = 1;
      for (let i = 0; i < 5000; i++) {
        const v = this.rand() < 0.5 ? 0 : 255;
        g.fillStyle = `rgba(${v},${v},${v},${0.04 + this.rand() * 0.08})`;
        g.fillRect(this.rand() * w, this.rand() * h, 1 + this.rand() * 2, 1 + this.rand() * 2);
      }
      if (grass) {
        g.lineWidth = 1;
        for (let i = 0; i < 1400; i++) {
          g.strokeStyle = tones[Math.floor(this.rand() * tones.length)];
          g.globalAlpha = 0.55;
          const x = this.rand() * w, y = this.rand() * h;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + (this.rand() - 0.5) * 4, y - 3 - this.rand() * 5);
          g.stroke();
        }
        g.globalAlpha = 1;
      }
    });
  }

  // Crop rows: stripes run along texture v so they run along the road
  makeField(base, dark, light) {
    return this.canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 16) {
        g.fillStyle = dark;
        g.fillRect(x, 0, 5, h);
        g.fillStyle = light;
        g.fillRect(x + 8, 0, 3, h);
      }
      for (let i = 0; i < 900; i++) {
        g.fillStyle = `rgba(0,0,0,${0.05 + this.rand() * 0.1})`;
        g.fillRect(this.rand() * w, this.rand() * h, 1, 2);
      }
    });
  }

  // ---------------------------------------------------------------- shared geometry
  initGeometries() {
    const g = (this.geo = {});
    g.post = new THREE.BoxGeometry(0.1, 0.9, 0.1);
    g.cap = new THREE.BoxGeometry(0.13, 0.16, 0.13);
    g.rail = new THREE.BoxGeometry(5.05, 0.3, 0.07);
    g.railPost = new THREE.BoxGeometry(0.1, 0.75, 0.1);
    g.stone = new THREE.BoxGeometry(0.3, 0.38, 0.3);
    g.pole = new THREE.CylinderGeometry(0.09, 0.14, 8.5, 6);
    g.arm = new THREE.BoxGeometry(2.3, 0.12, 0.12);
    g.shrub = new THREE.IcosahedronGeometry(0.7, 0);
    g.rock = new THREE.DodecahedronGeometry(0.55, 0);
    g.tuft = new THREE.ConeGeometry(0.14, 0.55, 5);
    g.tuft.translate(0, 0.27, 0);
    g.plane = new THREE.PlaneGeometry(1, 1);
    g.plane.rotateX(-Math.PI / 2);

    this.mat = {
      poleWood: new THREE.MeshLambertMaterial({ color: 0x6b5238 }),
      delineator: new THREE.MeshLambertMaterial({ color: 0xf1f5f9 }),
      cap: new THREE.MeshLambertMaterial({ color: 0xffffff }),
      rail: new THREE.MeshLambertMaterial({ color: 0x9aa6b2 }),
      vegetation: new THREE.MeshLambertMaterial({ color: 0xffffff }),
      rock: new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true, specular: 0x000000 }),
      wire: new THREE.LineBasicMaterial({ color: 0x14161b }),
      mud: new THREE.MeshLambertMaterial({ color: 0xb08a5c }),
      thatch: new THREE.MeshPhongMaterial({ color: 0xb7893a, flatShading: true, specular: 0x000000 }),
      shed: new THREE.MeshLambertMaterial({ color: 0xbcc2ca }),
      shedBand: new THREE.MeshLambertMaterial({ color: 0x1d4ed8 }),
      shedRoof: new THREE.MeshLambertMaterial({ color: 0x64748b }),
      chimney: new THREE.MeshLambertMaterial({ color: 0xb45309 }),
      building: new THREE.MeshLambertMaterial({
        color: 0xb8c0d0,
        map: this.tex.windows,
        emissive: 0xffffff,
        emissiveMap: this.tex.windows,
        emissiveIntensity: 0.55
      }),
      shadow: new THREE.MeshBasicMaterial({
        map: this.tex.shadow,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4
      })
    };
    this.cropMats = this.tex.crops.map(map => new THREE.MeshLambertMaterial({
      map, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
    }));
    this.glowMats = {
      white: this.makeGlow(0xfff1c8, 0.5),
      red: this.makeGlow(0xff2a2a, 0.55)
    };
  }

  makeGlow(color, opacity) {
    return new THREE.SpriteMaterial({
      map: this.tex.glow, color, opacity, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  // Wire textures onto the road's biome materials
  applyBiomeMaterials(road) {
    const set = (mat, map, uvScale) => { mat.map = map; mat.color.setHex(0xffffff); mat.needsUpdate = true; };
    set(road.matAsphalt, this.tex.asphalt);
    set(road.matTerrainRural, this.tex.groundRural);
    set(road.matTerrainExpress, this.tex.groundExpress);
    set(road.matTerrainUrban, this.tex.groundUrban);
    set(road.matShoulderRural, this.tex.shoulderGravel);
    set(road.matShoulderExpress, this.tex.shoulderPaved);
    set(road.matShoulderUrban, this.tex.shoulderPaved);
  }

  // ---------------------------------------------------------------- vehicle detailing
  mesh(parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    parent.add(m);
    return m;
  }

  box(parent, w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
    return this.mesh(parent, new THREE.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz);
  }

  cyl(parent, rt, rb, h, seg, mat, x, y, z, axis = 'y') {
    const geo = new THREE.CylinderGeometry(rt, rb, h, seg);
    if (axis === 'x') geo.rotateZ(Math.PI / 2);
    else if (axis === 'z') geo.rotateX(Math.PI / 2);
    return this.mesh(parent, geo, mat, x, y, z);
  }

  plate(parent, x, y, z, facing, w = 0.36) {
    const tex = this.tex.plates[Math.floor(Math.random() * this.tex.plates.length)];
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, w * 0.25),
      new THREE.MeshLambertMaterial({ map: tex })
    );
    mesh.position.set(x, y, z);
    if (facing < 0) mesh.rotation.y = Math.PI;
    parent.add(mesh);
  }

  glow(parent, x, y, z, kind, size = 0.85) {
    const s = new THREE.Sprite(this.glowMats[kind]);
    s.position.set(x, y, z);
    s.scale.set(size, size, 1);
    parent.add(s);
  }

  // Merge already-transformed indexed geometries (position/normal/uv) into one
  mergeGeos(geos) {
    const pos = [], nor = [], uv = [], idx = [];
    let offset = 0;
    geos.forEach(geo => {
      const p = geo.attributes.position, n = geo.attributes.normal, u = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        pos.push(p.getX(i), p.getY(i), p.getZ(i));
        nor.push(n.getX(i), n.getY(i), n.getZ(i));
        uv.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0);
      }
      if (geo.index) for (let i = 0; i < geo.index.count; i++) idx.push(geo.index.getX(i) + offset);
      else for (let i = 0; i < p.count; i++) idx.push(i + offset);
      offset += p.count;
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    out.setIndex(idx);
    return out;
  }

  // Spinning hub cap + lug nuts on one side of a wheel, as two merged meshes
  hubDetail(wheel, outerSign, radius, boltCount = 6) {
    const x = outerSign * (wheel.userData.halfWidth || 0.09);
    const hub = new THREE.CylinderGeometry(radius, radius, 0.02, 14);
    hub.rotateZ(Math.PI / 2);
    hub.translate(x, 0, 0);
    const bolts = [];
    for (let b = 0; b < boltCount; b++) {
      const a = (b / boltCount) * Math.PI * 2;
      const bolt = new THREE.CylinderGeometry(0.022, 0.022, 0.03, 6);
      bolt.rotateZ(Math.PI / 2);
      bolt.translate(x + outerSign * 0.01, Math.sin(a) * radius * 0.6, Math.cos(a) * radius * 0.6);
      bolts.push(bolt);
    }
    wheel.add(new THREE.Mesh(hub, this.m.chrome));
    wheel.add(new THREE.Mesh(this.mergeGeos(bolts), this.m.dark));
  }

  // Bake every mesh under `root` (except those inside `skip`) into one mesh per material.
  // `root` must sit at the origin with no transform of its own.
  bakeByMaterial(root, skip = []) {
    root.updateMatrixWorld(true);
    const skipSet = new Set(skip);
    const inSkip = (o) => { for (let p = o; p; p = p.parent) if (skipSet.has(p)) return true; return false; };
    const buckets = new Map();
    const meshes = [];
    root.traverse(o => { if (o.isMesh && !inSkip(o)) meshes.push(o); });
    meshes.forEach(o => {
      const geo = o.geometry.clone();
      geo.applyMatrix4(o.matrixWorld);
      if (!buckets.has(o.material)) buckets.set(o.material, []);
      buckets.get(o.material).push(geo);
      o.parent.remove(o);
    });
    buckets.forEach((geos, material) => root.add(new THREE.Mesh(this.mergeGeos(geos), material)));
  }

  // Wheels stay separate so they can spin
  mergeStatic(root) {
    this.bakeByMaterial(root, root.userData.wheels || []);
  }

  decorateVehicle(root, type) {
    const g = root.children[0];
    if (!g) return root;
    if (type === 'auto') this.decorateAuto(g);
    else if (type === 'truck') this.decorateTruck(g);
    else this.decorateSwift(g);
    root.traverse(o => {
      if (o.isMesh && o.material.isMeshStandardMaterial) o.material = this.m.chrome;
    });
    this.mergeStatic(root);
    this.addBlobShadow(root);
    return root;
  }

  addBlobShadow(root) {
    const ud = root.userData || {};
    const shadow = new THREE.Mesh(this.geo.plane, this.mat.shadow);
    shadow.scale.set((ud.width || 2) * 1.55, 1, (ud.length || 4) * 1.18);
    shadow.position.y = 0.04;
    shadow.renderOrder = -1;
    root.add(shadow);
  }

  decorateAuto(g) {
    const m = this.m;
    const bodyMat = g.children[0].material;
    const canopyMat = g.children[2].material;

    // Two-tone kali-peeli band and canopy trim
    this.box(g, 1.43, 0.07, 2.23, canopyMat, 0, 0.97, 0);
    this.box(g, 1.4, 0.05, 1.94, m.black, 0, 1.52, -0.1);

    // Mudguards over all three wheels
    [[0, 0.28, 1.35, 0.34], [0.72, 0.28, -0.7, 0.34], [-0.72, 0.28, -0.7, 0.34]].forEach(([x, y, z, r]) => {
      const fg = new THREE.TorusGeometry(r, 0.045, 6, 14, Math.PI);
      fg.rotateY(Math.PI / 2);
      fg.scale(3.2, 1, 1);
      this.mesh(g, fg, bodyMat, x, y, z);
    });

    // Rear engine louvres
    [1, -1].forEach(side => {
      for (let i = 0; i < 4; i++) this.box(g, 0.012, 0.03, 0.55, m.dark, side * 0.706, 0.5 + i * 0.09, -0.55);
    });

    // Bench seat, backrest and driver seat
    this.box(g, 1.15, 0.14, 0.62, m.seat, 0, 1.08, -0.5);
    this.box(g, 1.2, 0.55, 0.1, m.seat, 0, 1.4, -0.92);
    this.box(g, 0.5, 0.12, 0.42, m.seat, 0, 1.07, 0.32);

    // Steering column, handlebar and grips
    this.cyl(g, 0.02, 0.02, 0.6, 6, m.dark, 0, 1.15, 0.72);
    this.cyl(g, 0.018, 0.018, 0.72, 6, m.dark, 0, 1.4, 0.72, 'x');
    this.cyl(g, 0.03, 0.03, 0.12, 8, m.black, 0.38, 1.4, 0.72, 'x');
    this.cyl(g, 0.03, 0.03, 0.12, 8, m.black, -0.38, 1.4, 0.72, 'x');

    // Wing mirrors on stalks
    [1, -1].forEach(side => {
      this.cyl(g, 0.012, 0.012, 0.22, 5, m.dark, side * 0.72, 1.18, 0.82, 'x');
      this.box(g, 0.1, 0.14, 0.02, m.mirrorGlass, side * 0.83, 1.2, 0.82);
    });

    // Headlight chrome rim, rear bumper and plate
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.02, 8, 16), m.chrome);
    rim.position.set(0, 0.7, 1.86);
    g.add(rim);
    this.box(g, 0.95, 0.06, 0.07, m.chrome, 0, 0.42, -1.15);
    this.plate(g, 0, 0.64, -1.115, -1, 0.34);

    // Wheel hubs (front wheel is visible on both sides)
    const wheels = g.parent.userData.wheels || [];
    wheels.forEach((w, i) => {
      w.userData.halfWidth = 0.1;
      if (i === 0) {
        this.hubDetail(w, 1, 0.16, 5);
        this.hubDetail(w, -1, 0.16, 5);
      } else {
        this.hubDetail(w, i === 1 ? 1 : -1, 0.16, 5);
      }
    });

    this.glow(g, 0, 0.7, 1.95, 'white', 0.9);
    this.glow(g, 0.5, 0.65, -1.16, 'red', 0.6);
    this.glow(g, -0.5, 0.65, -1.16, 'red', 0.6);
  }

  decorateTruck(g) {
    const m = this.m;

    // Painted side panels on the cargo body
    const sideMat = new THREE.MeshLambertMaterial({ map: this.tex.truckSide });
    [1, -1].forEach(side => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(4.58, 2.18), sideMat);
      p.position.set(side * 1.205, 2.0, -1.2);
      p.rotation.y = side * Math.PI / 2;
      g.add(p);
    });

    // Canvas tarp tied over the cargo
    const tarpColors = [0x1f4e8c, 0x3f6212, 0x7c2d12, 0x374151];
    const tarpMat = new THREE.MeshLambertMaterial({ color: tarpColors[Math.floor(Math.random() * tarpColors.length)] });
    const tarpGeo = new THREE.CylinderGeometry(1.22, 1.22, 4.5, 14, 1, false, 0, Math.PI);
    tarpGeo.rotateX(Math.PI / 2);
    tarpGeo.rotateZ(Math.PI / 2);
    tarpGeo.scale(1, 0.38, 1);
    this.mesh(g, tarpGeo, tarpMat, 0, 3.1, -1.2);
    for (let i = 0; i < 4; i++) {
      const rope = new THREE.TorusGeometry(1.24, 0.025, 4, 14, Math.PI);
      rope.scale(1, 0.38, 1);
      this.mesh(g, rope, m.black, 0, 3.1, -2.9 + i * 1.15);
    }

    // Cab: door seams, handles and side windows
    [1, -1].forEach(side => {
      const x = side * 1.16;
      this.box(g, 0.02, 1.5, 0.025, m.black, x, 1.75, 1.72);
      this.box(g, 0.02, 1.5, 0.025, m.black, x, 1.75, 3.0);
      this.box(g, 0.025, 0.05, 0.2, m.chrome, x, 1.7, 2.9);
      this.box(g, 0.02, 0.75, 0.95, m.glassDark, x, 2.25, 2.4);
      this.box(g, 0.03, 0.06, 1.0, m.dark, x, 2.65, 2.4);
      // Wing mirror
      this.cyl(g, 0.015, 0.015, 0.28, 5, m.dark, side * 1.28, 2.45, 3.05, 'x');
      this.box(g, 0.08, 0.34, 0.16, m.mirrorGlass, side * 1.45, 2.45, 3.05);
      // Painted cab stripe
      this.box(g, 0.022, 0.12, 2.18, m.yellow, x, 1.25, 2.3);
      this.box(g, 0.022, 0.07, 2.18, m.red, x, 1.1, 2.3);
    });

    // Radiator grille: dark backing with chrome slats
    this.box(g, 1.7, 1.05, 0.03, m.black, 0, 1.4, 3.415);
    for (let i = 0; i < 5; i++) this.box(g, 1.5, 0.07, 0.05, m.chrome, 0, 1.0 + i * 0.2, 3.44);

    // Truck-art visor lights, tassels and marker lamps
    for (let i = 0; i < 7; i++) this.mesh(g, new THREE.SphereGeometry(0.05, 6, 6), m.bulb, -1.0 + i * 0.333, 2.93, 3.45);
    for (let i = 0; i < 11; i++) {
      const c = [m.red, m.yellow, m.green][i % 3];
      this.box(g, 0.06, 0.15, 0.02, c, -1.1 + i * 0.22, 2.6, 3.5);
    }
    [-0.5, 0, 0.5].forEach(x => this.box(g, 0.14, 0.08, 0.06, m.amberLamp, x, 2.86, 3.3));

    // Exhaust stack, fuel tank, leaf springs
    this.cyl(g, 0.07, 0.07, 1.9, 8, m.chrome, -1.0, 2.55, 1.1);
    this.cyl(g, 0.11, 0.07, 0.12, 8, m.dark, -1.0, 3.55, 1.1);
    this.cyl(g, 0.3, 0.3, 1.2, 12, m.steel, 1.1, 0.78, 0.5, 'z');
    [[2.3], [-1.85]].forEach(([z]) => [1, -1].forEach(s => this.box(g, 0.12, 0.1, 1.5, m.dark, s * 0.8, 0.5, z)));

    // Rear: tail lamps, plate, bumper beam, mud flaps
    [1, -1].forEach(s => {
      this.box(g, 0.26, 0.16, 0.05, m.tailLamp, s * 1.0, 0.95, -3.63);
      this.box(g, 0.5, 0.5, 0.04, m.black, s * 1.1, 0.4, -3.1);
      this.box(g, 0.34, 0.04, 0.045, m.yellow, s * 1.1, 0.62, -3.09);
    });
    this.box(g, 2.4, 0.2, 0.15, m.white, 0, 0.5, -3.68);
    this.plate(g, 0, 0.78, -3.65, -1, 0.5);
    this.plate(g, 0, 0.42, 3.69, 1, 0.5);

    // Chrome hubcaps with lug nuts on every wheel
    const wheels = g.parent.userData.wheels || [];
    wheels.forEach((w, i) => {
      w.userData.halfWidth = 0.17;
      this.hubDetail(w, i % 2 === 0 ? 1 : -1, 0.27, 8);
    });

    this.glow(g, 0.85, 0.72, 3.72, 'white', 1.1);
    this.glow(g, -0.85, 0.72, 3.72, 'white', 1.1);
    this.glow(g, 1.0, 0.95, -3.68, 'red', 0.8);
    this.glow(g, -1.0, 0.95, -3.68, 'red', 0.8);
  }

  decorateSwift(g) {
    const m = this.m;

    [1, -1].forEach(side => {
      const x = side * 0.865;
      // Door seams, belt line, handles and side skirt
      this.box(g, 0.012, 0.3, 0.014, m.black, x, 0.6, 0.38);
      this.box(g, 0.012, 0.3, 0.014, m.black, x, 0.6, -0.58);
      this.box(g, 0.012, 0.3, 0.014, m.black, x, 0.6, -1.05);
      this.box(g, 0.014, 0.025, 0.14, m.chrome, x, 0.68, 0.22);
      this.box(g, 0.014, 0.025, 0.14, m.chrome, x, 0.68, -0.74);
      this.box(g, 0.05, 0.08, 2.1, m.dark, side * 0.87, 0.3, 0.0);
      this.box(g, 0.012, 0.025, 2.4, m.chrome, x, 0.74, 0.0);
      // Wheel arch shadow rings behind each wheel
      [1.15, -1.15].forEach(z => {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.02, 18).rotateZ(Math.PI / 2), m.black);
        ring.position.set(side * 0.87, 0.31, z);
        g.add(ring);
      });
    });

    // Plates, shark-fin antenna, wipers
    this.plate(g, 0, 0.5, 2.03, 1, 0.42);
    this.plate(g, 0, 0.47, -1.955, -1, 0.42);
    this.box(g, 0.05, 0.1, 0.17, m.black, 0, 1.38, -0.95);
    this.box(g, 0.5, 0.012, 0.02, m.black, 0.3, 0.9, 0.7, -0.58, 0, 0.1);
    this.box(g, 0.5, 0.012, 0.02, m.black, -0.3, 0.9, 0.7, -0.58, 0, -0.1);

    this.glow(g, 0.64, 0.65, 2.0, 'white', 0.9);
    this.glow(g, -0.64, 0.65, 2.0, 'white', 0.9);
    this.glow(g, 0.66, 0.74, -1.9, 'red', 0.7);
    this.glow(g, -0.66, 0.74, -1.9, 'red', 0.7);
  }

  // ---------------------------------------------------------------- chunk dressing
  // Height of the terrain mesh at lateral distance d (>0) from the road centre, matching road.js
  terrainY(road, side, d, z) {
    const yc = road.getRoadElevation(z);
    if (d <= 12) return yc - 0.08;
    const wave = side < 0 ? Math.sin(z * 0.01) : Math.cos(z * 0.01);
    const far = yc - 2.5 + wave * 3;
    return (yc - 0.1) + (far - (yc - 0.1)) * Math.min((d - 12) / 140, 1);
  }

  instanced(parent, geo, mat, count, fill, colored = false) {
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.frustumCulled = false;
    for (let i = 0; i < count; i++) {
      fill(i, this.dummy);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (colored && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    parent.add(mesh);
    return mesh;
  }

  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  dressChunk(road, group, zPos, biome) {
    const detail = new THREE.Group();
    const hw = road.roadWidth * 0.5;
    const L = road.chunkLength;
    const d = this.dummy;
    const sides = [-1, 1];
    const rural = biome === 'rural';
    const urban = biome === 'urban';

    // --- Delineator posts every 10 m with red (left) / amber (right) reflector caps
    const nPost = 6;
    const posts = this.instanced(detail, this.geo.post, this.mat.delineator, nPost * 2, (i, o) => {
      const side = sides[i % 2], z = zPos - 5 - Math.floor(i / 2) * 10;
      o.position.set(road.getRoadCurve(z) + side * (hw + 0.9), road.getRoadElevation(z) - 0.05 + 0.45, z);
      o.rotation.set(0, road.getRoadAngle(z), 0);
      o.scale.set(1, 1, 1);
    });
    const caps = this.instanced(detail, this.geo.cap, this.mat.cap, nPost * 2, (i, o) => {
      const side = sides[i % 2], z = zPos - 5 - Math.floor(i / 2) * 10;
      o.position.set(road.getRoadCurve(z) + side * (hw + 0.9), road.getRoadElevation(z) - 0.05 + 0.86, z);
      o.rotation.set(0, road.getRoadAngle(z), 0);
      o.scale.set(1, 1, 1);
    }, true);
    for (let i = 0; i < nPost * 2; i++) caps.setColorAt(i, this.tmpColor.setHex(i % 2 === 0 ? 0xdc2626 : 0xfbbf24));
    caps.instanceColor.needsUpdate = true;
    void posts;

    // --- Guardrails on expressway / urban stretches, painted kerb stones on rural roads
    if (!rural) {
      const nRail = Math.round(L / 5);
      this.instanced(detail, this.geo.rail, this.mat.rail, nRail * 2, (i, o) => {
        const side = sides[i % 2], z = zPos - 2.5 - Math.floor(i / 2) * 5;
        o.position.set(road.getRoadCurve(z) + side * (hw + 3.5), road.getRoadElevation(z) + 0.1 + 0.62, z);
        o.rotation.set(0, road.getRoadAngle(z), 0);
        o.scale.set(1, 1, 1);
      });
      this.instanced(detail, this.geo.railPost, this.mat.rail, nRail * 2, (i, o) => {
        const side = sides[i % 2], z = zPos - Math.floor(i / 2) * 5;
        o.position.set(road.getRoadCurve(z) + side * (hw + 3.5), road.getRoadElevation(z) + 0.1 + 0.3, z);
        o.rotation.set(0, road.getRoadAngle(z), 0);
        o.scale.set(1, 1, 1);
      });
    } else {
      const nStone = 20;
      const stones = this.instanced(detail, this.geo.stone, this.mat.cap, nStone * 2, (i, o) => {
        const side = sides[i % 2], z = zPos - 1.5 - Math.floor(i / 2) * 3;
        o.position.set(road.getRoadCurve(z) + side * (hw + 3.7), road.getRoadElevation(z) - 0.1 + 0.19, z);
        o.rotation.set(0, road.getRoadAngle(z), 0);
        o.scale.set(1, 1, 1);
      }, true);
      for (let i = 0; i < nStone * 2; i++) stones.setColorAt(i, this.tmpColor.setHex(Math.floor(i / 2) % 2 ? 0x111111 : 0xf3f3ee));
      stones.instanceColor.needsUpdate = true;
    }

    // --- Rural electric poles with sagging wires along the left side
    if (rural) {
      const poleZ = [zPos - 10, zPos - 40];
      const off = -(hw + 6.5);
      this.instanced(detail, this.geo.pole, this.mat.poleWood, 2, (i, o) => {
        const z = poleZ[i];
        o.position.set(road.getRoadCurve(z) + off, this.terrainY(road, -1, hw + 6.5, z) + 4.2, z);
        o.rotation.set(0, 0, 0);
        o.scale.set(1, 1, 1);
      });
      this.instanced(detail, this.geo.arm, this.mat.poleWood, 2, (i, o) => {
        const z = poleZ[i];
        o.position.set(road.getRoadCurve(z) + off, this.terrainY(road, -1, hw + 6.5, z) + 7.9, z);
        o.rotation.set(0, Math.PI / 2 + road.getRoadAngle(z), 0);
        o.scale.set(1, 1, 1);
      });
      const pts = [];
      poleZ.forEach(z0 => {
        const z1 = z0 - 30;
        [-0.9, 0, 0.9].forEach(lat => {
          const x0 = road.getRoadCurve(z0) + off, x1 = road.getRoadCurve(z1) + off;
          const y0 = this.terrainY(road, -1, hw + 6.5, z0) + 7.95, y1 = this.terrainY(road, -1, hw + 6.5, z1) + 7.95;
          let prev = null;
          for (let s = 0; s <= 6; s++) {
            const t = s / 6;
            const p = [x0 + (x1 - x0) * t + lat * 0.4, y0 + (y1 - y0) * t - 0.7 * 4 * t * (1 - t), z0 + (z1 - z0) * t + lat];
            if (prev) pts.push(...prev, ...p);
            prev = p;
          }
        });
      });
      const wireGeo = new THREE.BufferGeometry();
      wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const wires = new THREE.LineSegments(wireGeo, this.mat.wire);
      wires.frustumCulled = false;
      detail.add(wires);
    }

    // --- Ground cover: grass tufts near the shoulder, shrubs and rocks further out
    const greens = rural ? [0x6f7a3d, 0x8a8a45, 0x9a7f45, 0x5d7a35] : (urban ? [0x2f4a3a, 0x3b5b44] : [0x2f6a2a, 0x3d7d33, 0x56873a]);
    const tuftN = urban ? 14 : 60;
    const tuftSides = [], tuftD = [], tuftZ = [];
    for (let i = 0; i < tuftN; i++) {
      tuftSides.push(Math.random() < 0.5 ? -1 : 1);
      tuftD.push(hw + 4.4 + Math.random() * 12);
      tuftZ.push(zPos - Math.random() * L);
    }
    const tufts = this.instanced(detail, this.geo.tuft, this.mat.vegetation, tuftN, (i, o) => {
      const z = tuftZ[i];
      o.position.set(road.getRoadCurve(z) + tuftSides[i] * tuftD[i], this.terrainY(road, tuftSides[i], tuftD[i], z), z);
      o.rotation.set((Math.random() - 0.5) * 0.3, Math.random() * 6, (Math.random() - 0.5) * 0.3);
      const s = 0.8 + Math.random() * 1.2;
      o.scale.set(s, s, s);
    }, true);
    for (let i = 0; i < tuftN; i++) tufts.setColorAt(i, this.tmpColor.setHex(this.pick(greens)));
    tufts.instanceColor.needsUpdate = true;

    const shrubN = rural ? 14 : (urban ? 4 : 10);
    const shS = [], shD = [], shZ = [];
    for (let i = 0; i < shrubN; i++) {
      shS.push(Math.random() < 0.5 ? -1 : 1);
      shD.push(hw + 5 + Math.random() * 34);
      shZ.push(zPos - Math.random() * L);
    }
    const shrubs = this.instanced(detail, this.geo.shrub, this.mat.vegetation, shrubN, (i, o) => {
      const z = shZ[i], s = 0.7 + Math.random() * 1.3;
      o.position.set(road.getRoadCurve(z) + shS[i] * shD[i], this.terrainY(road, shS[i], shD[i], z) + 0.3 * s, z);
      o.rotation.set(0, Math.random() * 6, 0);
      o.scale.set(s * 1.2, s * 0.8, s * 1.2);
    }, true);
    for (let i = 0; i < shrubN; i++) shrubs.setColorAt(i, this.tmpColor.setHex(this.pick(greens)).offsetHSL(0, 0, (Math.random() - 0.5) * 0.06));
    shrubs.instanceColor.needsUpdate = true;

    if (rural) {
      const rockN = 6;
      const rS = [], rD = [], rZ = [];
      for (let i = 0; i < rockN; i++) {
        rS.push(Math.random() < 0.5 ? -1 : 1);
        rD.push(hw + 6 + Math.random() * 36);
        rZ.push(zPos - Math.random() * L);
      }
      const rocks = this.instanced(detail, this.geo.rock, this.mat.rock, rockN, (i, o) => {
        const z = rZ[i], s = 0.5 + Math.random() * 1.4;
        o.position.set(road.getRoadCurve(z) + rS[i] * rD[i], this.terrainY(road, rS[i], rD[i], z) + 0.2 * s, z);
        o.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        o.scale.set(s * 1.3, s * 0.8, s);
      }, true);
      for (let i = 0; i < rockN; i++) rocks.setColorAt(i, this.tmpColor.setHex(this.pick([0x8c8478, 0x9b8c78, 0x6f6a62, 0xa59a86])));
      rocks.instanceColor.needsUpdate = true;
    }

    // --- Crop fields as terrain-following quads (rural)
    if (rural) {
      for (let f = 0; f < 2; f++) {
        const side = f === 0 ? -1 : 1;
        const d0 = hw + 14 + Math.random() * 6, d1 = d0 + 16 + Math.random() * 8;
        const z0 = zPos - 4 - Math.random() * 6, z1 = z0 - 26 - Math.random() * 16;
        const corners = [[d0, z0], [d1, z0], [d1, z1], [d0, z1]];
        const verts = [], uvs = [];
        corners.forEach(([dd, zz], i) => {
          verts.push(road.getRoadCurve(zz) + side * dd, this.terrainY(road, side, dd, zz) + 0.07, zz);
          uvs.push(i === 1 || i === 2 ? (d1 - d0) / 8 : 0, i >= 2 ? (z0 - z1) / 8 : 0);
        });
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(side < 0 ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]);
        geo.computeVertexNormals();
        const field = new THREE.Mesh(geo, this.pick(this.cropMats));
        field.receiveShadow = true;
        detail.add(field);
      }
    }

    // --- Structures set back from the road
    const rnd = Math.random();
    if (rural && rnd < 0.6) {
      const side = Math.random() < 0.5 ? -1 : 1, dd = hw + 24 + Math.random() * 18, z = zPos - 8 - Math.random() * 44;
      detail.add(this.createHut(road.getRoadCurve(z) + side * dd, this.terrainY(road, side, dd, z), z, side));
    } else if (biome === 'expressway') {
      const side = Math.random() < 0.5 ? -1 : 1, dd = hw + 26 + Math.random() * 18, z = zPos - 10 - Math.random() * 40;
      if (rnd < 0.5) detail.add(this.createShed(road.getRoadCurve(z) + side * dd, this.terrainY(road, side, dd, z), z, road.getRoadAngle(z)));
      else if (rnd < 0.75) detail.add(this.createWaterTower(road.getRoadCurve(z) + side * dd, this.terrainY(road, side, dd, z), z));
    } else if (urban) {
      for (let b = 0; b < 2; b++) {
        const side = b === 0 ? -1 : 1, dd = hw + 22 + Math.random() * 30, z = zPos - 6 - Math.random() * 48;
        detail.add(this.createBlock(road.getRoadCurve(z) + side * dd, this.terrainY(road, side, dd, z), z, road.getRoadAngle(z)));
      }
    }

    group.add(detail);
    return detail;
  }

  createHut(x, y, z, side) {
    const hut = new THREE.Group();
    const w = 3 + Math.random() * 1.2;
    this.box(hut, w, 2.2, 3, this.mat.mud, 0, 1.1, 0);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.95, 1.7, 4), this.mat.thatch);
    roof.position.y = 3.0;
    roof.rotation.y = Math.PI / 4;
    hut.add(roof);
    this.box(hut, 0.9, 1.6, 0.06, this.m.dark, 0, 0.8, 1.52);
    this.box(hut, 0.6, 0.5, 0.06, this.m.dark, w * 0.3, 1.4, 1.52);
    hut.position.set(x, y, z);
    hut.rotation.y = side > 0 ? -Math.PI / 2 + (Math.random() - 0.5) * 0.4 : Math.PI / 2 + (Math.random() - 0.5) * 0.4;
    return hut;
  }

  createShed(x, y, z, angle) {
    const shed = new THREE.Group();
    this.box(shed, 14, 5, 10, this.mat.shed, 0, 2.5, 0);
    this.box(shed, 14.04, 1.1, 10.04, this.mat.shedBand, 0, 3.9, 0);
    const roof = this.box(shed, 14.6, 0.3, 11, this.mat.shedRoof, 0, 5.15, 0);
    roof.rotation.z = 0.05;
    this.box(shed, 4, 3.4, 0.1, this.m.dark, 0, 1.7, 5.03);
    const stack = this.cyl(shed, 0.6, 0.8, 14, 10, this.mat.chimney, 5, 7, -3);
    void stack;
    for (let i = 0; i < 3; i++) this.cyl(shed, 0.63, 0.63, 1.2, 10, this.m.white, 5, 3.5 + i * 4.5, -3);
    shed.position.set(x, y, z);
    shed.rotation.y = angle + (Math.random() - 0.5) * 0.5;
    return shed;
  }

  createWaterTower(x, y, z) {
    const tower = new THREE.Group();
    [[1.4, 1.4], [-1.4, 1.4], [1.4, -1.4], [-1.4, -1.4]].forEach(([lx, lz]) => this.cyl(tower, 0.12, 0.12, 12, 6, this.m.steel, lx, 6, lz));
    this.cyl(tower, 2.4, 2.4, 3.2, 14, this.m.white, 0, 13.4, 0);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.2, 14), this.m.steel);
    cap.position.y = 15.6;
    tower.add(cap);
    this.cyl(tower, 2.42, 2.42, 0.5, 14, this.m.red, 0, 13.4, 0);
    tower.position.set(x, y, z);
    return tower;
  }

  createBlock(x, y, z, angle) {
    const w = 8 + Math.random() * 8, h = 8 + Math.random() * 18, dpt = 8 + Math.random() * 6;
    const geo = new THREE.BoxGeometry(w, h, dpt);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / 9), uv.getY(i) * (h / 9));
    const block = new THREE.Mesh(geo, this.mat.building);
    block.position.set(x, y + h / 2, z);
    block.rotation.y = angle;
    const roofTank = this.cyl(block, 0.9, 0.9, 1.6, 8, this.m.steel, w * 0.2, h / 2 + 0.8, 0);
    void roofTank;
    return block;
  }

  // ---------------------------------------------------------------- sky
  createSky() {
    const group = new THREE.Group();

    const sun = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.tex.glow, color: 0xffd9a0, transparent: true, depthWrite: false, fog: false,
      blending: THREE.AdditiveBlending
    }));
    sun.position.set(288, 150, -432);
    sun.scale.set(130, 130, 1);
    group.add(sun);

    // Soft clouds
    const cloudTex = this.canvasTex(256, 128, (g, w, h) => {
      for (let i = 0; i < 14; i++) {
        const x = 50 + this.rand() * (w - 100), y = 40 + this.rand() * 50, r = 24 + this.rand() * 30;
        const grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, 'rgba(255,255,255,0.55)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
      }
    });
    cloudTex.wrapS = cloudTex.wrapT = THREE.ClampToEdgeWrapping;
    const clouds = [];
    for (let i = 0; i < 9; i++) {
      const mat = new THREE.SpriteMaterial({ map: cloudTex, color: 0xffe3c4, transparent: true, opacity: 0.7, depthWrite: false, fog: false });
      const c = new THREE.Sprite(mat);
      const ang = (i / 9) * Math.PI * 1.1 - Math.PI * 0.55;
      c.position.set(Math.sin(ang) * 420, 120 + Math.random() * 60, -Math.cos(ang) * 420);
      c.scale.set(170 + Math.random() * 90, 60 + Math.random() * 25, 1);
      group.add(c);
      clouds.push(c);
    }

    // Stars fade in at night
    const starPos = [];
    for (let i = 0; i < 450; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(0.08 + Math.random() * 0.92);
      starPos.push(Math.sin(ph) * Math.cos(th) * 600, Math.cos(ph) * 600, Math.sin(ph) * Math.sin(th) * 600);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false
    }));
    stars.frustumCulled = false;
    group.add(stars);

    return { group, sun, clouds, stars };
  }
}

window.detailBuilder = new DetailBuilder();

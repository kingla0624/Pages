import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

/**
 * Aqura Aquarium Aquascaping & Dynamic Decorations
 * Creates animated swaying aquatic plants, corals, bubbling air stone, and animated treasure chest.
 */

export class DecorationManager {
  constructor(scene, tankBounds, audioManager) {
    this.scene = scene;
    this.bounds = tankBounds;
    this.audio = audioManager;
    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.animatedDecorations = [];
    this.bubbleEmitters = [];
  }

  clear() {
    while (this.rootGroup.children.length > 0) {
      const obj = this.rootGroup.children[0];
      this.rootGroup.remove(obj);
    }
    this.animatedDecorations = [];
    this.bubbleEmitters = [];
  }

  loadFromState(decorationsList) {
    this.clear();
    for (const dec of decorationsList) {
      this.addDecoration(dec);
    }
  }

  addDecoration(dec) {
    const y = this.bounds.minY;
    let obj = null;

    switch (dec.type) {
      case "seaweed_cluster":
        obj = this.createSeaweedCluster();
        break;
      case "coral_reef":
        obj = this.createCoralReef();
        break;
      case "air_stone":
        obj = this.createAirStone();
        break;
      case "treasure_chest":
        obj = this.createTreasureChest();
        break;
      case "roman_column":
        obj = this.createRomanColumn();
        break;
      case "amphora":
        obj = this.createAmphora();
        break;
      case "seastar":
        obj = this.createSeaStar();
        break;
      default:
        obj = this.createSeaweedCluster();
    }

    if (obj) {
      obj.position.set(dec.x, y + (dec.yOffset || 0), dec.z);
      if (dec.rotY !== undefined) obj.rotation.y = dec.rotY;
      if (dec.scale !== undefined) obj.scale.setScalar(dec.scale);
      this.rootGroup.add(obj);
    }
  }

  createLeafTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    // Natural kelp gradient (dark emerald base to translucent golden-lime tip)
    const grad = ctx.createLinearGradient(0, 256, 0, 0);
    grad.addColorStop(0.0, "#1b5e20");
    grad.addColorStop(0.4, "#2e7d32");
    grad.addColorStop(0.8, "#43a047");
    grad.addColorStop(1.0, "#7cb342");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 256);

    // Central dark leaf vein
    ctx.strokeStyle = "rgba(10, 50, 15, 0.45)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(32, 256);
    ctx.lineTo(32, 0);
    ctx.stroke();

    // Subtle diagonal secondary veins
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.0;
    for (let y = 16; y < 240; y += 18) {
      ctx.beginPath();
      ctx.moveTo(32, y);
      ctx.lineTo(12, y - 10);
      ctx.moveTo(32, y);
      ctx.lineTo(52, y - 10);
      ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
  }

  createRockTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // Weathered volcanic basalt base
    ctx.fillStyle = "#332f2b";
    ctx.fillRect(0, 0, 512, 512);

    // Deep mineral sediment layers
    for (let i = 0; i < 6000; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      const r = Math.random();
      if (r > 0.65) ctx.fillStyle = "rgba(20, 18, 16, 0.35)"; // dark crevices
      else if (r > 0.35) ctx.fillStyle = "rgba(90, 85, 78, 0.25)"; // light mineral flakes
      else ctx.fillStyle = "rgba(42, 65, 38, 0.25)"; // deep marine biofilm
      ctx.fillRect(rx, ry, 2.5, 2.5);
    }

    // Natural crustose coralline algae (calcified pink/purple patches)
    const algaeColors = ["#db2777", "#c026d3", "#9333ea", "#e879f9"];
    for (let p = 0; p < 18; p++) {
      const px = Math.random() * 512;
      const py = Math.random() * 512;
      const rad = 15 + Math.random() * 45;
      const grad = ctx.createRadialGradient(px, py, 2, px, py, rad);
      const col = algaeColors[p % algaeColors.length];
      grad.addColorStop(0.0, col);
      grad.addColorStop(0.7, col);
      grad.addColorStop(1.0, "rgba(51, 47, 43, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  createSeaweedCluster() {
    const group = new THREE.Group();
    const blades = [];
    const bladeCount = 7 + Math.floor(Math.random() * 4);

    if (!this.sharedLeafTex) {
      this.sharedLeafTex = this.createLeafTexture();
    }

    const leafMat = new THREE.MeshStandardMaterial({
      map: this.sharedLeafTex,
      roughness: 0.42,
      metalness: 0.05,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.90
    });

    for (let i = 0; i < bladeCount; i++) {
      const height = 2.2 + Math.random() * 1.8;
      const width = 0.16 + Math.random() * 0.08;
      const segments = 12;
      const geom = new THREE.PlaneGeometry(width, height, 1, segments);
      
      // Shift origin to root
      geom.translate(0, height / 2, 0);

      // Taper blade towards tip and base
      const pos = geom.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        const y = pos.getY(j);
        const t = Math.max(0, Math.min(1, y / height));
        // Leaf width profile: slender at root, widest at 40%, tapering to fine tip
        const wProfile = Math.sin(Math.pow(t, 0.6) * Math.PI) * 1.15 + 0.15;
        pos.setX(j, pos.getX(j) * wProfile);
      }
      geom.computeVertexNormals();

      const mesh = new THREE.Mesh(geom, leafMat);
      const angle = (i / bladeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const rad = 0.12 + Math.random() * 0.28;

      mesh.position.set(Math.cos(angle) * rad, 0, Math.sin(angle) * rad);
      mesh.rotation.y = angle + Math.PI / 2;

      group.add(mesh);

      blades.push({
        mesh,
        geom,
        posAttr: geom.attributes.position,
        origX: Array.from(geom.attributes.position.array),
        height,
        phase: Math.random() * Math.PI * 2,
        speed: 1.1 + Math.random() * 0.6
      });
    }

    this.animatedDecorations.push({
      type: "seaweed",
      blades
    });

    return group;
  }

  createCoralReef() {
    const group = new THREE.Group();

    if (!this.sharedRockTex) {
      this.sharedRockTex = this.createRockTexture();
    }

    // 1. Organic Clustered Live Rock Formation (multi-boulder basalt)
    const rockMat = new THREE.MeshStandardMaterial({
      map: this.sharedRockTex,
      roughness: 0.90,
      metalness: 0.05
    });

    const createSculptedBoulder = (radius, scaleX, scaleY, scaleZ, posX, posZ, rotY) => {
      const geom = new THREE.DodecahedronGeometry(radius, 2);
      const pos = geom.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const vz = pos.getZ(i);
        const noise = Math.sin(vx * 3.8) * Math.cos(vz * 3.8) * 0.12;
        pos.setXYZ(i, vx * scaleX + noise, Math.max(0, vy * scaleY + 0.2), vz * scaleZ + noise);
      }
      geom.computeVertexNormals();
      const mesh = new THREE.Mesh(geom, rockMat);
      mesh.position.set(posX, 0, posZ);
      mesh.rotation.y = rotY;
      return mesh;
    };

    // Primary central boulder
    group.add(createSculptedBoulder(0.95, 1.6, 0.65, 1.3, 0, 0, 0.4));
    // Secondary clustered side boulder
    group.add(createSculptedBoulder(0.65, 1.3, 0.55, 1.1, -0.65, -0.3, -0.5));
    // Small foreground rock
    group.add(createSculptedBoulder(0.45, 1.1, 0.45, 0.9, 0.60, 0.4, 1.2));

    // 2. Smooth Tumbled Seafloor Pebbles around base
    const pebbleColors = [0x546e7a, 0x78909c, 0xb0bec5, 0x4e342e, 0x8d6e63];
    for (let p = 0; p < 9; p++) {
      const pAngle = (p / 9) * Math.PI * 2 + Math.random() * 0.3;
      const pDist = 1.0 + Math.random() * 0.6;
      const pScale = 0.08 + Math.random() * 0.09;
      const pGeom = new THREE.DodecahedronGeometry(pScale, 1);
      pGeom.scale(1.2, 0.55, 0.85);
      const pMat = new THREE.MeshStandardMaterial({
        color: pebbleColors[p % pebbleColors.length],
        roughness: 0.65
      });
      const pebble = new THREE.Mesh(pGeom, pMat);
      pebble.position.set(Math.cos(pAngle) * pDist, 0.04, Math.sin(pAngle) * pDist);
      pebble.rotation.set(Math.random(), Math.random(), Math.random());
      group.add(pebble);
    }

    // 3. Multi-Species Natural Reef Colony
    // A. Tiered Plate / Shelf Corals (Acropora hyacinthus)
    const plateCoralMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      roughness: 0.65,
      metalness: 0.05,
      side: THREE.DoubleSide
    });
    const plateRimMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x059669,
      emissiveIntensity: 0.45,
      roughness: 0.35
    });

    const createTablePlate = (radius, posX, posY, posZ, tiltX, tiltZ) => {
      const plateGroup = new THREE.Group();
      plateGroup.position.set(posX, posY, posZ);
      plateGroup.rotation.set(tiltX, 0, tiltZ);

      // Scalloped tiered plate disc
      const plateGeom = new THREE.CylinderGeometry(radius, radius * 0.85, 0.035, 20);
      const pos = plateGeom.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const r = Math.sqrt(x * x + z * z);
        if (r > 0.05) {
          const ruffle = Math.sin(Math.atan2(z, x) * 7) * 0.015;
          pos.setY(i, pos.getY(i) + ruffle);
        }
      }
      plateGeom.computeVertexNormals();
      const plate = new THREE.Mesh(plateGeom, plateCoralMat);
      plateGroup.add(plate);

      // Fluorescent growing margin rim
      const rimGeom = new THREE.TorusGeometry(radius * 0.98, 0.012, 8, 24);
      rimGeom.rotateX(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeom, plateRimMat);
      rim.position.y = 0.012;
      plateGroup.add(rim);

      // Plate pedestal stalk
      const stalkGeom = new THREE.CylinderGeometry(radius * 0.22, radius * 0.35, posY * 0.8, 8);
      const stalk = new THREE.Mesh(stalkGeom, rockMat);
      stalk.position.y = -posY * 0.4;
      plateGroup.add(stalk);

      return plateGroup;
    };

    group.add(createTablePlate(0.42, -0.48, 0.55, 0.12, 0.12, 0.15));
    group.add(createTablePlate(0.32, -0.68, 0.72, -0.15, -0.10, 0.22));

    // B. Brain Coral / Mound Coral (Porites / Diploria)
    const brainGeom = new THREE.SphereGeometry(0.24, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const bPos = brainGeom.attributes.position;
    for (let i = 0; i < bPos.count; i++) {
      const x = bPos.getX(i);
      const y = bPos.getY(i);
      const z = bPos.getZ(i);
      const theta = Math.atan2(z, x);
      const r = Math.sqrt(x * x + z * z);
      const groove = Math.sin(r * 32 + Math.sin(theta * 6) * 3) * 0.012;
      bPos.setXYZ(i, x + groove * x, Math.max(0, y + groove * y), z + groove * z);
    }
    brainGeom.computeVertexNormals();
    const brainMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.60,
      metalness: 0.05
    });
    const brainCoral = new THREE.Mesh(brainGeom, brainMat);
    brainCoral.position.set(0.48, 0.38, 0.18);
    group.add(brainCoral);

    // C. Branching Staghorn Acropora Coral
    const staghornMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.55,
      emissive: 0xb45309,
      emissiveIntensity: 0.22
    });
    const staghornTipMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
      roughness: 0.25
    });

    const createStaghornBranch = (scale, posX, posZ, rotZ) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(posX, 0.42, posZ);
      bGroup.rotation.z = rotZ;
      bGroup.scale.setScalar(scale);

      // Main trunk
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.09, 0.95, 8), staghornMat);
      trunk.position.y = 0.48;
      bGroup.add(trunk);

      const tipMain = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), staghornTipMat);
      tipMain.position.y = 0.96;
      bGroup.add(tipMain);

      // Sub-branches with curved angles
      const angles = [-0.55, 0.48, -0.32];
      const heights = [0.45, 0.65, 0.72];
      angles.forEach((ang, idx) => {
        const subLen = 0.42 - idx * 0.06;
        const sub = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.045, subLen, 6), staghornMat);
        sub.position.set(Math.sin(ang) * 0.14, heights[idx], Math.cos(ang) * 0.06);
        sub.rotation.z = ang;
        bGroup.add(sub);

        const subTip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), staghornTipMat);
        subTip.position.set(
          Math.sin(ang) * (0.14 + subLen * 0.85),
          heights[idx] + Math.cos(ang) * (subLen * 0.85),
          Math.cos(ang) * 0.06
        );
        bGroup.add(subTip);
      });

      return bGroup;
    };

    group.add(createStaghornBranch(0.95, 0.18, -0.28, -0.15));

    // 4. Soft Sea Anemone with 44 undulating flexible tentacles
    const anemoneBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, 0.22, 16),
      new THREE.MeshStandardMaterial({ color: 0x9d174d, roughness: 0.75 })
    );
    anemoneBase.position.set(-0.02, 0.55, 0.22);
    group.add(anemoneBase);

    const tentacleMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      roughness: 0.25,
      emissive: 0xdb2777,
      emissiveIntensity: 0.28,
      transparent: true,
      opacity: 0.92
    });

    const tentacles = [];
    const tCount = 44;
    for (let t = 0; t < tCount; t++) {
      const ring = t < 24 ? 0 : 1;
      const tAngle = (t / (ring === 0 ? 24 : 20)) * Math.PI * 2;
      const tDist = ring === 0 ? 0.12 : 0.06;
      const tLen = 0.45 + Math.random() * 0.25;

      const tGeom = new THREE.CylinderGeometry(0.008, 0.024, tLen, 6);
      tGeom.translate(0, tLen / 2, 0);
      const tMesh = new THREE.Mesh(tGeom, tentacleMat);
      tMesh.position.set(
        -0.02 + Math.cos(tAngle) * tDist,
        0.65,
        0.22 + Math.sin(tAngle) * tDist
      );
      tMesh.rotation.z = Math.cos(tAngle) * (ring === 0 ? 0.42 : 0.22);
      tMesh.rotation.x = Math.sin(tAngle) * (ring === 0 ? 0.42 : 0.22);
      group.add(tMesh);

      tentacles.push({
        mesh: tMesh,
        baseRotZ: tMesh.rotation.z,
        baseRotX: tMesh.rotation.x,
        phase: tAngle + Math.random() * 0.5
      });
    }

    this.animatedDecorations.push({
      type: "anemone",
      tentacles
    });

    // 5. Scattered Calico Fan Seashells
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      roughness: 0.45,
      side: THREE.DoubleSide
    });
    for (let s = 0; s < 5; s++) {
      const shellGeom = new THREE.CircleGeometry(0.08, 12, 0, Math.PI);
      shellGeom.scale(1.0, 0.8, 1.0);
      const sMesh = new THREE.Mesh(shellGeom, shellMat);
      const sAngle = s * 1.3 + 0.4;
      const sDist = 1.3 + (s % 2) * 0.4;
      sMesh.position.set(Math.cos(sAngle) * sDist, 0.02, Math.sin(sAngle) * sDist);
      sMesh.rotation.x = -Math.PI / 2 + 0.12;
      sMesh.rotation.z = s * 1.5;
      group.add(sMesh);
    }

    return group;
  }

  createAirStone() {
    const group = new THREE.Group();

    // Porous stone geometry
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.95 });
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.2, 16), stoneMat);
    stone.position.y = 0.1;
    group.add(stone);

    // Aerator pipe connector
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.6 });
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), pipeMat);
    pipe.rotation.z = Math.PI / 3;
    pipe.position.set(-0.25, 0.1, 0);
    group.add(pipe);

    // Register active bubble emitter
    this.bubbleEmitters.push({
      parentGroup: group,
      rate: 10, // bubbles per second
      accum: 0,
      minRadius: 0.03,
      maxRadius: 0.08
    });

    return group;
  }

  createTreasureChest() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.75 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.75 });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.30,
      metalness: 0.85,
      emissive: 0x78350f,
      emissiveIntensity: 0.25
    });

    // Chest Base
    const baseGeom = new THREE.BoxGeometry(0.85, 0.45, 0.58);
    const baseMesh = new THREE.Mesh(baseGeom, woodMat);
    baseMesh.position.y = 0.225;
    group.add(baseMesh);

    // Brass edge bands & corner brackets
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.4, metalness: 0.7 });
    const band1 = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.47, 0.06), bandMat);
    band1.position.set(0, 0.225, 0.19);
    group.add(band1);
    const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.47, 0.06), bandMat);
    band2.position.set(0, 0.225, -0.19);
    group.add(band2);

    // Corner reinforcement plates
    [-0.43, 0.43].forEach(x => {
      [-0.29, 0.29].forEach(z => {
        const corner = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 0.06), brassMat);
        corner.position.set(x, 0.225, z);
        group.add(corner);
      });
    });

    // Lid pivot (Hinged at the rear top edge)
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.45, -0.29);
    group.add(lidPivot);

    const lidGeom = new THREE.CylinderGeometry(0.29, 0.29, 0.86, 16, 1, false, 0, Math.PI);
    lidGeom.rotateZ(Math.PI / 2);
    const lidMesh = new THREE.Mesh(lidGeom, woodMat);
    lidMesh.position.set(0, 0, 0.29);
    lidPivot.add(lidMesh);

    // Brass arch bands on lid
    [-0.20, 0.20].forEach(x => {
      const archGeom = new THREE.CylinderGeometry(0.30, 0.30, 0.06, 16, 1, false, 0, Math.PI);
      archGeom.rotateZ(Math.PI / 2);
      const arch = new THREE.Mesh(archGeom, brassMat);
      arch.position.set(x, 0, 0.29);
      lidPivot.add(arch);
    });

    // Gold Lock Clasp
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.08), brassMat);
    lock.position.set(0, 0, 0.59);
    lidPivot.add(lock);

    // Inside glittering gold treasure pile
    const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.36, 0.26, 12), goldMat);
    pile.position.set(0, 0.28, 0);
    group.add(pile);

    this.animatedDecorations.push({
      type: "chest",
      lidPivot,
      group,
      timer: 0,
      isOpen: false,
      cycleDuration: 10 // seconds
    });

    return group;
  }

  createRomanColumn() {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.9 });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x558b2f, roughness: 0.85 });

    // Plinth base
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.9), stoneMat);
    base.position.y = 0.125;
    group.add(base);

    // Fluted Column (Broken top)
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 2.2, 14), stoneMat);
    col.position.y = 1.3;
    col.rotation.z = 0.08;
    group.add(col);

    // Fallen capital lying on sand
    const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 0.5, 8), stoneMat);
    capital.rotation.x = Math.PI / 2.2;
    capital.position.set(0.65, 0.25, 0.3);
    group.add(capital);

    // Patch of underwater moss on base
    const moss = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), mossMat);
    moss.scale.set(1.2, 0.3, 1.0);
    moss.position.set(0.2, 0.26, 0.2);
    group.add(moss);

    return group;
  }

  createAmphora() {
    const group = new THREE.Group();
    // Warm terracotta ceramic material with subtle coralline and sediment roughness
    const clayMat = new THREE.MeshStandardMaterial({
      color: 0xb4533c,
      roughness: 0.82,
      metalness: 0.04
    });
    const crustMat = new THREE.MeshStandardMaterial({
      color: 0x9333ea,
      roughness: 0.9,
      emissive: 0x4c1d95,
      emissiveIntensity: 0.15
    });

    const potGroup = new THREE.Group();

    // 1. Terracotta amphora body
    const bodyGeom = new THREE.CylinderGeometry(0.12, 0.42, 0.95, 18, 5);
    const pos = bodyGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const bulge = Math.sin((y + 0.475) / 0.95 * Math.PI) * 0.22;
      pos.setX(i, pos.getX(i) * (1.0 + bulge));
      pos.setZ(i, pos.getZ(i) * (1.0 + bulge));
    }
    bodyGeom.computeVertexNormals();
    const bodyMesh = new THREE.Mesh(bodyGeom, clayMat);
    bodyMesh.position.y = 0.55;
    potGroup.add(bodyMesh);

    // 2. Narrow conical neck & flared lip rim
    const neckGeom = new THREE.CylinderGeometry(0.14, 0.11, 0.35, 16);
    const neckMesh = new THREE.Mesh(neckGeom, clayMat);
    neckMesh.position.y = 1.15;
    potGroup.add(neckMesh);

    const rimGeom = new THREE.TorusGeometry(0.15, 0.035, 8, 20);
    rimGeom.rotateX(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeom, clayMat);
    rimMesh.position.y = 1.32;
    potGroup.add(rimMesh);

    // 3. Two curved twin handles
    for (const side of [-1, 1]) {
      const handleGeom = new THREE.TorusGeometry(0.16, 0.03, 8, 16, Math.PI);
      handleGeom.rotateZ(side > 0 ? 0 : Math.PI);
      const handleMesh = new THREE.Mesh(handleGeom, clayMat);
      handleMesh.position.set(side * 0.22, 1.05, 0);
      handleMesh.rotation.y = Math.PI / 2;
      potGroup.add(handleMesh);
    }

    // 4. Crustose coralline algae & barnacle encrustations
    for (let b = 0; b < 6; b++) {
      const bGeom = new THREE.DodecahedronGeometry(0.06 + Math.random() * 0.05, 1);
      bGeom.scale(1.2, 0.4, 0.8);
      const bMesh = new THREE.Mesh(bGeom, crustMat);
      const bAngle = b * 1.1;
      const bY = 0.3 + (b % 4) * 0.22;
      bMesh.position.set(Math.cos(bAngle) * 0.36, bY, Math.sin(bAngle) * 0.36);
      bMesh.rotation.set(Math.random(), Math.random(), Math.random());
      potGroup.add(bMesh);
    }

    // Tilt the amphora naturally lying half-submerged in seabed sand
    potGroup.rotation.z = 0.55;
    potGroup.rotation.x = 0.2;
    potGroup.position.set(0, -0.22, 0);
    group.add(potGroup);

    return group;
  }

  createSeaStar() {
    const group = new THREE.Group();
    // Blue Sea Star (Linckia laevigata) - vivid marine cerulean blue
    const starMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.65,
      metalness: 0.08,
      emissive: 0x0369a1,
      emissiveIntensity: 0.2
    });

    const starGroup = new THREE.Group();

    // Central disc
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.07, 15), starMat);
    disc.position.y = 0.035;
    starGroup.add(disc);

    // 5 radiating tapered cylindrical arms
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const armLength = 0.62;
      const armGeom = new THREE.ConeGeometry(0.12, armLength, 12);
      armGeom.rotateX(Math.PI / 2);
      armGeom.translate(0, 0, armLength / 2);

      const pos = armGeom.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        const z = pos.getZ(j);
        if (z > 0.2) {
          pos.setY(j, pos.getY(j) - Math.pow((z - 0.2) / armLength, 2) * 0.05);
        }
      }
      armGeom.computeVertexNormals();

      const armMesh = new THREE.Mesh(armGeom, starMat);
      armMesh.position.set(Math.cos(angle) * 0.1, 0.03, Math.sin(angle) * 0.1);
      armMesh.rotation.y = -angle + Math.PI / 2;
      starGroup.add(armMesh);
    }

    // Small supporting rock base
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 1), rockMat);
    rock.scale.set(1.4, 0.35, 1.2);
    rock.position.set(0.05, 0.05, 0.05);
    group.add(rock);

    starGroup.position.set(0, 0.12, 0);
    starGroup.rotation.x = 0.08;
    group.add(starGroup);

    return group;
  }

  update(delta, time, bubbleSystem) {
    // 1. Update seaweed fluid travelling wave & anemone tentacles
    for (const item of this.animatedDecorations) {
      if (item.type === "seaweed") {
        for (const b of item.blades) {
          const pos = b.posAttr;
          const orig = b.origX;
          const count = pos.count;

          for (let i = 0; i < count; i++) {
            const y = orig[i * 3 + 1];
            const heightRatio = Math.max(0, Math.min(1, y / b.height));
            const factor = heightRatio * heightRatio;

            // Fluid drag travelling wave propagating from root upward
            const sway = Math.sin(time * b.speed + b.phase - heightRatio * 2.8) * 0.32 * factor;
            const twist = Math.cos(time * b.speed * 0.75 + b.phase - heightRatio * 2.0) * 0.16 * factor;

            pos.setX(i, orig[i * 3] + sway);
            pos.setZ(i, orig[i * 3 + 2] + twist);
          }
          pos.needsUpdate = true;
        }
      } else if (item.type === "anemone") {
        // Soft sea anemone tentacles swaying in water currents
        for (const t of item.tentacles) {
          t.mesh.rotation.z = t.baseRotZ + Math.sin(time * 1.4 + t.phase) * 0.16;
          t.mesh.rotation.x = t.baseRotX + Math.cos(time * 1.2 + t.phase) * 0.16;
        }
      } else if (item.type === "chest") {
        // 2. Animate treasure chest lid
        item.timer += delta;
        const cycleProgress = (item.timer % item.cycleDuration) / item.cycleDuration;
        
        // Open between 0.7 and 0.9 of cycle
        if (cycleProgress > 0.75 && cycleProgress < 0.95) {
          // Opening
          item.lidPivot.rotation.x = THREE.MathUtils.lerp(item.lidPivot.rotation.x, -Math.PI * 0.45, delta * 4);
          // Release bubbles while open
          if (bubbleSystem && Math.random() < 0.35) {
            const chestWorldPos = new THREE.Vector3();
            item.group.getWorldPosition(chestWorldPos);
            bubbleSystem.spawnBubble(
              chestWorldPos.x + (Math.random() - 0.5) * 0.4,
              chestWorldPos.y + 0.45,
              chestWorldPos.z + (Math.random() - 0.5) * 0.3,
              0.05 + Math.random() * 0.05
            );
          }
        } else {
          // Closed
          item.lidPivot.rotation.x = THREE.MathUtils.lerp(item.lidPivot.rotation.x, 0, delta * 3);
        }
      }
    }

    // 3. Update air stone continuous bubbler
    if (bubbleSystem) {
      for (const emitter of this.bubbleEmitters) {
        emitter.accum += delta * emitter.rate;
        while (emitter.accum >= 1) {
          emitter.accum -= 1;
          const stoneWorld = new THREE.Vector3();
          emitter.parentGroup.getWorldPosition(stoneWorld);
          
          const rx = stoneWorld.x + (Math.random() - 0.5) * 0.3;
          const rz = stoneWorld.z + (Math.random() - 0.5) * 0.3;
          const rad = emitter.minRadius + Math.random() * (emitter.maxRadius - emitter.minRadius);
          bubbleSystem.spawnBubble(rx, stoneWorld.y + 0.25, rz, rad);
        }
      }
    }
  }
}

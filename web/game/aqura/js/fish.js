import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";
import { FISH_CATALOG } from "./state.js";

/**
 * Aqura Fish AI & Procedural 3D Creature Engine
 * Features species-specific procedural meshes, undulating spine swimming bones,
 * Boids flocking, hunger navigation, feeding, and fleeing reactions.
 */

export class FishManager {
  constructor(scene, tankBounds, audioManager, foodManager, gameState) {
    this.scene = scene;
    this.bounds = tankBounds;
    this.audio = audioManager;
    this.foodManager = foodManager;
    this.gameState = gameState;

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.fishList = []; // Active 3D fish instances
    this.selectedFish = null;

    // Distant schooling reef fish boids (Chromis viridis)
    this.initDistantSchool();

    // Majestic wild oceanic giant: Ambient Manta Ray patrolling deep sea
    this.initAmbientMantaRay();
  }

  createMiniFishGeom() {
    const geom = new THREE.BufferGeometry();
    // Streamlined fish mesh with pointed snout, arched dorsal fin and forked tail (forward = +Z)
    const vertices = new Float32Array([
      // 0: Snout (leading tip)
      0.0, 0.0, 0.28,
      // 1: Dorsal crest
      0.0, 0.16, 0.02,
      // 2: Ventral keel
      0.0, -0.10, 0.04,
      // 3: Left flank
      -0.08, 0.02, 0.06,
      // 4: Right flank
      0.08, 0.02, 0.06,
      // 5: Caudal peduncle
      0.0, 0.01, -0.22,
      // 6: Upper caudal lobe tip
      0.0, 0.18, -0.42,
      // 7: Caudal notch
      0.0, 0.01, -0.32,
      // 8: Lower caudal lobe tip
      0.0, -0.16, -0.42
    ]);

    const indices = [
      // Forebody cones
      0, 1, 3,
      0, 4, 1,
      0, 3, 2,
      0, 2, 4,
      // Aftbody tapers to peduncle
      1, 5, 3,
      1, 4, 5,
      2, 3, 5,
      2, 5, 4,
      // Forked caudal fin (two triangular lobes, double-sided)
      5, 6, 7,
      5, 7, 6,
      5, 7, 8,
      5, 8, 7
    ];

    geom.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  initDistantSchool() {
    // 56 Shimmering Blue-Green Chromis / Anthias reef fish schooling in deep ocean
    const count = 56;
    this.schoolCount = count;

    const geom = this.createMiniFishGeom();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.40,
      roughness: 0.15,
      metalness: 0.85
    });

    this.schoolMesh = new THREE.InstancedMesh(geom, mat, count);
    this.schoolMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.schoolMesh);

    this.schoolDummy = new THREE.Object3D();
    this.schoolMembers = [];

    for (let i = 0; i < count; i++) {
      this.schoolMembers.push({
        offsetX: (Math.random() - 0.5) * 5.5,
        offsetY: (Math.random() - 0.5) * 2.5,
        offsetZ: (Math.random() - 0.5) * 5.5,
        phase: Math.random() * Math.PI * 2,
        speedScale: 0.9 + Math.random() * 0.25
      });
    }
  }

  initAmbientMantaRay() {
    const config = FISH_CATALOG.manta_ray;
    const meshData = this.buildCreatureMesh("manta_ray", config);
    const startY = this.bounds.minY + 2.8;
    meshData.group.position.set(0, startY, -14.0);
    this.rootGroup.add(meshData.group);

    this.ambientManta = {
      id: "ambient_manta",
      type: "manta_ray",
      data: {
        id: "ambient_manta",
        type: "manta_ray",
        name: "深海巨翼 (Ocean Manta)",
        hunger: 100,
        happiness: 100,
        size: config.size
      },
      group: meshData.group,
      parts: meshData.parts,
      velocity: new THREE.Vector3(0.6, 0.05, -0.3),
      maxSpeed: config.speed,
      targetPos: new THREE.Vector3(0, startY, -14.0),
      wanderTimer: 0,
      scaredTimer: 0,
      phaseOffset: 0,
      isMantaRay: true,
      isAmbient: true
    };
    this.fishList.push(this.ambientManta);
  }

  updateDistantSchool(delta, time) {
    if (!this.schoolMesh) return;
    const dummy = this.schoolDummy;
    const count = this.schoolCount;

    // School center follows an organic patrol circuit through deep coral reef waters
    const loopT = time * 0.18;
    const centerX = Math.sin(loopT) * 16.0;
    const centerZ = -14.0 + Math.sin(loopT * 2) * 6.5;
    const centerY = 1.2 + Math.sin(loopT * 1.5) * 1.4;

    const nextT = loopT + 0.05;
    const nextX = Math.sin(nextT) * 16.0;
    const nextZ = -14.0 + Math.sin(nextT * 2) * 6.5;
    const nextY = 1.2 + Math.sin(nextT * 1.5) * 1.4;

    const heading = new THREE.Vector3(nextX - centerX, nextY - centerY, nextZ - centerZ).normalize();

    for (let i = 0; i < count; i++) {
      const m = this.schoolMembers[i];
      const wave = Math.sin(time * 3.8 + m.phase) * 0.38;
      const px = centerX + m.offsetX + wave * heading.z;
      const py = centerY + m.offsetY + Math.sin(time * 2.2 + m.phase) * 0.18;
      const pz = centerZ + m.offsetZ - wave * heading.x;

      dummy.position.set(px, py, pz);
      dummy.lookAt(px + heading.x * 2, py + heading.y * 2, pz + heading.z * 2);
      dummy.updateMatrix();
      this.schoolMesh.setMatrixAt(i, dummy.matrix);
    }
    this.schoolMesh.instanceMatrix.needsUpdate = true;
  }

  syncWithState(stateFishes) {
    // Keep existing fish that are still in state, add newly bought, remove absent
    const stateIds = new Set(stateFishes.map(f => f.id));

    for (let i = this.fishList.length - 1; i >= 0; i--) {
      const f = this.fishList[i];
      if (f.isAmbient) continue; // Always preserve ambient ocean wildlife
      if (!stateIds.has(f.id)) {
        this.rootGroup.remove(f.group);
        this.disposeFishMesh(f.group);
        this.fishList.splice(i, 1);
      }
    }

    for (const sf of stateFishes) {
      const existing = this.fishList.find(f => f.id === sf.id);
      if (!existing) {
        this.spawnFish(sf);
      }
    }
  }

  disposeFishMesh(group) {
    group.traverse(child => {
      if (child.isMesh) {
        child.geometry?.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => {
              m.map?.dispose();
              m.bumpMap?.dispose();
              m.dispose();
            });
          } else {
            child.material.map?.dispose();
            child.material.bumpMap?.dispose();
            child.material.dispose();
          }
        }
      }
    });
  }

  spawnFish(fishData) {
    const config = FISH_CATALOG[fishData.type] || FISH_CATALOG.clownfish;
    const meshData = this.buildCreatureMesh(fishData.type, config);

    // Initial random position inside open ocean
    let x, y, z;
    if (fishData.type === "manta_ray") {
      x = (Math.random() - 0.5) * 22.0;
      y = this.bounds.minY + 2.0 + Math.random() * 2.2;
      z = -14.0 + (Math.random() - 0.5) * 8.0;
    } else if (fishData.type === "clownfish") {
      x = -2.5 + (Math.random() - 0.5) * 6.0;
      y = this.bounds.minY + 0.8 + Math.random() * 2.2;
      z = -2.5 + (Math.random() - 0.5) * 4.0;
    } else {
      x = (Math.random() - 0.5) * 16.0;
      y = this.bounds.minY + 1.0 + Math.random() * 3.5;
      z = -4.0 + (Math.random() - 0.5) * 10.0;
    }

    meshData.group.position.set(x, y, z);

    // Enable soft underwater shadow casting for fish
    meshData.group.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
      }
    });

    this.rootGroup.add(meshData.group);

    const fishInstance = {
      id: fishData.id,
      type: fishData.type,
      data: fishData,
      group: meshData.group,
      parts: meshData.parts,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * config.speed * 0.8,
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * config.speed * 0.8
      ),
      maxSpeed: config.speed,
      targetPos: new THREE.Vector3(x, y, z),
      wanderTimer: Math.random() * 3,
      scaredTimer: 0,
      phaseOffset: Math.random() * Math.PI * 2,
      isJellyfish: fishData.type === "jellyfish",
      isMantaRay: fishData.type === "manta_ray",
      isAmbient: !!fishData.isAmbient
    };

    this.fishList.push(fishInstance);
    return fishInstance;
  }

  applyIridescentSheen(mat, sheenHex = 0x38bdf8) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uSheenCol = { value: new THREE.Color(sheenHex) };
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `#include <common>
         uniform vec3 uSheenCol;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
         vec3 vDir = normalize(vViewPosition);
         float fres = 1.0 - max(dot(normal, vDir), 0.0);
         float rimGlow = pow(fres, 2.8);
         gl_FragColor.rgb += uSheenCol * rimGlow * 0.45;`
      );
    };
  }

  buildCreatureMesh(type, config) {
    if (type === "manta_ray") {
      return this.buildMantaRayMesh(config);
    }
    if (type === "jellyfish") {
      return this.buildJellyfishMesh(config);
    }
    return this.buildFishMesh(type, config);
  }

  evaluateSpline(stations, t) {
    t = Math.max(0, Math.min(1, t));
    let i = 0;
    while (i < stations.length - 2 && stations[i + 1].t < t) {
      i++;
    }
    const p1 = stations[i];
    const p2 = stations[i + 1];
    const p0 = i > 0 ? stations[i - 1] : { t: p1.t - (p2.t - p1.t), h: p1.h, w: p1.w, y: p1.y };
    const p3 = i + 2 < stations.length ? stations[i + 2] : { t: p2.t + (p2.t - p1.t), h: p2.h, w: p2.w, y: p2.y };

    const span = Math.max(1e-5, p2.t - p1.t);
    const u = (t - p1.t) / span;
    const u2 = u * u;
    const u3 = u2 * u;

    const interp = (v0, v1, v2, v3) => {
      return 0.5 * (
        (2 * v1) +
        (-v0 + v2) * u +
        (2 * v0 - 5 * v1 + 4 * v2 - v3) * u2 +
        (-v0 + 3 * v1 - 3 * v2 + v3) * u3
      );
    };

    return {
      h: Math.max(0.001, interp(p0.h, p1.h, p2.h, p3.h)),
      w: Math.max(0.001, interp(p0.w, p1.w, p2.w, p3.w)),
      y: interp(p0.y, p1.y, p2.y, p3.y)
    };
  }

  getSpeciesStations(type) {
    if (type === "blue_tang") {
      return {
        length: 1.32,
        xOffset: 0.36,
        stations: [
          { t: 0.00, h: 0.09, w: 0.030, y: 0.00 },
          { t: 0.16, h: 0.18, w: 0.060, y: 0.01 },
          { t: 0.38, h: 0.34, w: 0.095, y: 0.02 },
          { t: 0.60, h: 0.38, w: 0.110, y: 0.02 },
          { t: 0.78, h: 0.30, w: 0.090, y: 0.00 },
          { t: 0.92, h: 0.15, w: 0.055, y: -0.01 },
          { t: 1.00, h: 0.005, w: 0.005, y: -0.01 }
        ]
      };
    } else if (type === "angelfish") {
      return {
        length: 1.15,
        xOffset: 0.35,
        stations: [
          { t: 0.00, h: 0.08, w: 0.020, y: 0.00 },
          { t: 0.16, h: 0.22, w: 0.032, y: 0.01 },
          { t: 0.40, h: 0.48, w: 0.048, y: 0.03 },
          { t: 0.62, h: 0.54, w: 0.058, y: 0.03 },
          { t: 0.80, h: 0.36, w: 0.045, y: 0.00 },
          { t: 0.92, h: 0.15, w: 0.026, y: -0.02 },
          { t: 1.00, h: 0.005, w: 0.005, y: -0.02 }
        ]
      };
    } else if (type === "betta") {
      return {
        length: 1.35,
        xOffset: 0.35,
        stations: [
          { t: 0.00, h: 0.06, w: 0.030, y: 0.00 },
          { t: 0.20, h: 0.12, w: 0.055, y: 0.00 },
          { t: 0.45, h: 0.17, w: 0.080, y: 0.01 },
          { t: 0.68, h: 0.18, w: 0.090, y: 0.01 },
          { t: 0.84, h: 0.13, w: 0.075, y: 0.00 },
          { t: 0.94, h: 0.08, w: 0.045, y: -0.01 },
          { t: 1.00, h: 0.005, w: 0.005, y: -0.01 }
        ]
      };
    } else if (type === "koi") {
      return {
        length: 1.45,
        xOffset: 0.38,
        stations: [
          { t: 0.00, h: 0.08, w: 0.040, y: 0.00 },
          { t: 0.20, h: 0.16, w: 0.085, y: 0.01 },
          { t: 0.45, h: 0.25, w: 0.150, y: 0.01 },
          { t: 0.68, h: 0.27, w: 0.170, y: 0.00 },
          { t: 0.85, h: 0.20, w: 0.140, y: -0.01 },
          { t: 0.95, h: 0.11, w: 0.080, y: -0.02 },
          { t: 1.00, h: 0.005, w: 0.005, y: -0.02 }
        ]
      };
    }
    // Default: Clownfish (Amphiprion ocellaris)
    return {
      length: 1.30,
      xOffset: 0.38,
      stations: [
        { t: 0.00, h: 0.09, w: 0.035, y: 0.00 },
        { t: 0.18, h: 0.15, w: 0.075, y: 0.01 },
        { t: 0.38, h: 0.25, w: 0.135, y: 0.02 },
        { t: 0.58, h: 0.28, w: 0.155, y: 0.01 },
        { t: 0.76, h: 0.23, w: 0.135, y: -0.01 },
        { t: 0.90, h: 0.14, w: 0.095, y: -0.02 },
        { t: 1.00, h: 0.005, w: 0.005, y: -0.02 }
      ]
    };
  }

  createFishBodyGeom(type, scale) {
    const spec = this.getSpeciesStations(type);
    const numRings = 36;
    const numSegments = 32;
    const geom = new THREE.BufferGeometry();

    const vertices = [];
    const uvs = [];
    const indices = [];

    const totalLength = spec.length * scale;
    const xOffset = spec.xOffset;
    const xTail = -xOffset * totalLength;
    const xHead = (1 - xOffset) * totalLength;

    for (let r = 0; r < numRings; r++) {
      const t = r / (numRings - 1);
      const prof = this.evaluateSpline(spec.stations, t);
      const x = (t - xOffset) * totalLength;
      const h = prof.h * scale;
      const w = prof.w * scale;
      const yCenter = prof.y * scale;

      for (let s = 0; s <= numSegments; s++) {
        const theta = (s / numSegments) * Math.PI * 2;
        const y = yCenter + h * Math.cos(theta);
        const z = w * Math.sin(theta);

        vertices.push(x, y, z);
        const vCoord = Math.abs(theta / Math.PI - 1.0);
        uvs.push(t, vCoord);
      }
    }

    for (let r = 0; r < numRings - 1; r++) {
      for (let s = 0; s < numSegments; s++) {
        const i0 = r * (numSegments + 1) + s;
        const i1 = (r + 1) * (numSegments + 1) + s;
        const i2 = (r + 1) * (numSegments + 1) + (s + 1);
        const i3 = r * (numSegments + 1) + (s + 1);

        indices.push(i0, i1, i2);
        indices.push(i0, i2, i3);
      }
    }

    // Peduncle end-cap (r = 0)
    const pedCenterIdx = vertices.length / 3;
    vertices.push(xTail, 0, 0);
    uvs.push(0, 0.5);
    for (let s = 0; s < numSegments; s++) {
      indices.push(pedCenterIdx, s + 1, s);
    }

    geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    return { geom, spec, totalLength, xOffset, xTail, xHead };
  }

  createFinMaterial(type, finColor) {
    const w = 256;
    const h = 256;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, w, h);

    // Subtle translucent radial fan base
    const grad = ctx.createRadialGradient(20, 128, 5, 128, 128, 140);
    if (type === "clownfish") {
      grad.addColorStop(0.0, "rgba(235, 60, 15, 0.96)");
      grad.addColorStop(0.65, "rgba(244, 81, 30, 0.92)");
      grad.addColorStop(0.90, "rgba(255, 112, 67, 0.88)");
      grad.addColorStop(1.0, "rgba(255, 138, 101, 0.75)");
    } else if (type === "blue_tang") {
      grad.addColorStop(0.0, "rgba(37, 99, 235, 0.85)");
      grad.addColorStop(0.60, "rgba(59, 130, 246, 0.60)");
      grad.addColorStop(0.85, "rgba(250, 204, 21, 0.80)");
      grad.addColorStop(1.0, "rgba(253, 224, 71, 0.35)");
    } else if (type === "angelfish") {
      grad.addColorStop(0.0, "rgba(241, 245, 249, 0.85)");
      grad.addColorStop(0.65, "rgba(226, 232, 240, 0.55)");
      grad.addColorStop(1.0, "rgba(203, 213, 225, 0.25)");
    } else {
      grad.addColorStop(0.0, "rgba(244, 63, 94, 0.85)");
      grad.addColorStop(0.70, "rgba(251, 113, 133, 0.50)");
      grad.addColorStop(1.0, "rgba(254, 205, 211, 0.20)");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Fine radial skeletal rays (Lepidotrichia)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 1.6;
    for (let a = -0.55; a <= 0.55; a += 0.07) {
      ctx.beginPath();
      ctx.moveTo(10, 128);
      ctx.lineTo(245, 128 + Math.tan(a) * 210);
      ctx.stroke();
    }

    // Outer edge margin
    if (type === "clownfish") {
      // Bold jet-black margin along trailing edge
      ctx.strokeStyle = "rgba(17, 17, 17, 0.95)";
      ctx.lineWidth = 7.0;
      ctx.beginPath();
      ctx.arc(0, 128, 246, -Math.PI / 3.2, Math.PI / 3.2);
      ctx.stroke();

      // Outer pure white tip rim
      ctx.strokeStyle = "rgba(255, 255, 255, 0.90)";
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(0, 128, 251, -Math.PI / 3.2, Math.PI / 3.2);
      ctx.stroke();
    } else if (type === "blue_tang") {
      ctx.strokeStyle = "rgba(15, 23, 42, 0.90)";
      ctx.lineWidth = 5.0;
      ctx.beginPath();
      ctx.arc(0, 128, 248, -Math.PI / 3.2, Math.PI / 3.2);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    return new THREE.MeshStandardMaterial({
      map: tex,
      color: 0xffffff,
      transparent: true,
      opacity: 0.90,
      roughness: 0.18,
      metalness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }

  buildFishMesh(type, config) {
    const group = new THREE.Group();
    const model = new THREE.Group();
    model.rotation.y = -Math.PI / 2;
    group.add(model);
    const parts = { model };

    const scale = config.size || 1.0;
    const finColor = config.colors.fin;

    // 1. Procedural PBR Textures (Skin with micro-scales & countershading)
    const { map, bumpMap } = this.createFishTexture(type, config);
    const bodyMat = new THREE.MeshStandardMaterial({
      map,
      bumpMap,
      bumpScale: 0.006,
      roughness: 0.16,
      metalness: 0.04
    });
    this.applyIridescentSheen(bodyMat, type === "clownfish" ? 0x38bdf8 : (type === "blue_tang" ? 0x67e8f9 : 0x93c5fd));

    const finMat = this.createFinMaterial(type, finColor);
    this.applyIridescentSheen(finMat, 0x67e8f9);

    // 2. Anatomically contoured organic body
    const bodyData = this.createFishBodyGeom(type, scale);
    const bodyGeom = bodyData.geom;
    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    model.add(bodyMesh);

    parts.body = bodyMesh;
    parts.bodyGeom = bodyGeom;
    parts.basePositions = bodyGeom.attributes.position.array.slice();
    parts.totalLength = bodyData.totalLength;
    parts.xOffset = bodyData.xOffset;
    parts.xTail = bodyData.xTail;
    parts.xHead = bodyData.xHead;

    // 3. Multi-layer realistic 3D eyes
    const addRealisticEye = (zSign) => {
      const eyePivot = new THREE.Group();
      let eyeX = 0.54 * scale;
      let eyeY = 0.04 * scale;
      let eyeZ = zSign * 0.13 * scale;

      if (type === "clownfish") {
        eyeX = 0.55 * scale;
        eyeY = 0.03 * scale;
        eyeZ = zSign * 0.135 * scale;
      } else if (type === "blue_tang") {
        eyeX = 0.46 * scale;
        eyeY = 0.12 * scale;
        eyeZ = zSign * 0.10 * scale;
      } else if (type === "angelfish") {
        eyeX = 0.34 * scale;
        eyeY = 0.16 * scale;
        eyeZ = zSign * 0.055 * scale;
      }

      eyePivot.position.set(eyeX, eyeY, eyeZ);

      // Sclera
      const scleraGeom = new THREE.SphereGeometry(0.055 * scale, 20, 16);
      scleraGeom.scale(1.0, 1.0, 0.65);
      const scleraMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.10,
        metalness: 0.05
      });
      const sclera = new THREE.Mesh(scleraGeom, scleraMat);
      eyePivot.add(sclera);

      // Iris ring with species-accurate color
      const irisColor = type === "clownfish" ? 0xd9530f : (type === "blue_tang" ? 0x0284c7 : (type === "betta" ? 0x6366f1 : 0xf59e0b));
      const irisGeom = new THREE.CircleGeometry(0.038 * scale, 24);
      if (zSign > 0) {
        irisGeom.rotateY(0.18);
      } else {
        irisGeom.rotateY(Math.PI - 0.18);
      }
      const irisMat = new THREE.MeshStandardMaterial({
        color: irisColor,
        roughness: 0.15,
        metalness: 0.15,
        side: THREE.DoubleSide
      });
      const iris = new THREE.Mesh(irisGeom, irisMat);
      iris.position.set(0.005 * scale, 0, zSign * 0.036 * scale);
      eyePivot.add(iris);

      // Deep obsidian pupil
      const pupilGeom = new THREE.CircleGeometry(0.024 * scale, 20);
      if (zSign > 0) {
        pupilGeom.rotateY(0.18);
      } else {
        pupilGeom.rotateY(Math.PI - 0.18);
      }
      const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.DoubleSide });
      const pupil = new THREE.Mesh(pupilGeom, pupilMat);
      pupil.position.set(0.006 * scale, 0, zSign * 0.037 * scale);
      eyePivot.add(pupil);

      // Specular glints (dual glints giving lifelike moist cornea sparkle)
      const glint1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.007 * scale, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      glint1.position.set(0.014 * scale, 0.012 * scale, zSign * 0.039 * scale);
      eyePivot.add(glint1);

      const glint2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.0035 * scale, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      glint2.position.set(0.004 * scale, -0.010 * scale, zSign * 0.039 * scale);
      eyePivot.add(glint2);

      model.add(eyePivot);
    };
    addRealisticEye(1);
    addRealisticEye(-1);

    // 4. Pectoral Fins (Petal curved shape)
    const pecShape = new THREE.Shape();
    pecShape.moveTo(0, 0);
    pecShape.bezierCurveTo(0.06 * scale, 0.12 * scale, 0.22 * scale, 0.14 * scale, 0.26 * scale, 0.02 * scale);
    pecShape.bezierCurveTo(0.28 * scale, -0.06 * scale, 0.20 * scale, -0.14 * scale, 0.10 * scale, -0.10 * scale);
    pecShape.closePath();
    const pecGeom = new THREE.ShapeGeometry(pecShape);

    let pecX = 0.28 * scale;
    let pecY = -0.06 * scale;
    let pecZ = 0.14 * scale;
    if (type === "angelfish") {
      pecX = 0.12 * scale;
      pecY = -0.08 * scale;
      pecZ = 0.06 * scale;
    } else if (type === "blue_tang") {
      pecX = 0.22 * scale;
      pecZ = 0.11 * scale;
    }

    const pecLeftPivot = new THREE.Group();
    pecLeftPivot.position.set(pecX, pecY, pecZ);
    pecLeftPivot.rotation.set(0, 0.45, 0.1);
    const pecLeft = new THREE.Mesh(pecGeom, finMat);
    pecLeftPivot.add(pecLeft);
    model.add(pecLeftPivot);
    parts.pecLeft = pecLeftPivot;

    const pecRightPivot = new THREE.Group();
    pecRightPivot.position.set(pecX, pecY, -pecZ);
    pecRightPivot.rotation.set(0, -0.45, -0.1);
    const pecRight = new THREE.Mesh(pecGeom, finMat);
    pecRightPivot.add(pecRight);
    model.add(pecRightPivot);
    parts.pecRight = pecRightPivot;

    // 5. Dorsal Fin
    let dorsalGeom;
    if (type === "angelfish") {
      // Magnificent high sail
      const shape = new THREE.Shape();
      shape.moveTo(0.12 * scale, 0.35 * scale);
      shape.lineTo(-0.10 * scale, 1.45 * scale);
      shape.lineTo(-0.35 * scale, 1.15 * scale);
      shape.lineTo(-0.38 * scale, 0.20 * scale);
      shape.closePath();
      dorsalGeom = new THREE.ShapeGeometry(shape);
    } else if (type === "clownfish") {
      // Iconic 2-lobed clownfish dorsal fin (stands proud above dorsal ridge)
      const shape = new THREE.Shape();
      shape.moveTo(0.24 * scale, 0.26 * scale);
      // Anterior spiny dorsal lobe
      shape.quadraticCurveTo(0.14 * scale, 0.44 * scale, 0.02 * scale, 0.40 * scale);
      // Notch between spiny and soft dorsal
      shape.quadraticCurveTo(-0.06 * scale, 0.32 * scale, -0.14 * scale, 0.38 * scale);
      // Posterior rounded soft dorsal lobe
      shape.quadraticCurveTo(-0.25 * scale, 0.40 * scale, -0.34 * scale, 0.18 * scale);
      shape.lineTo(-0.36 * scale, 0.10 * scale);
      // Base attachment returning along dorsal ridge
      shape.lineTo(-0.16 * scale, 0.20 * scale);
      shape.lineTo(0.06 * scale, 0.27 * scale);
      shape.closePath();
      dorsalGeom = new THREE.ShapeGeometry(shape);
    } else if (type === "blue_tang") {
      const shape = new THREE.Shape();
      shape.moveTo(0.22 * scale, 0.26 * scale);
      shape.quadraticCurveTo(-0.06 * scale, 0.45 * scale, -0.36 * scale, 0.20 * scale);
      shape.lineTo(-0.38 * scale, 0.08 * scale);
      shape.closePath();
      dorsalGeom = new THREE.ShapeGeometry(shape);
    } else {
      const shape = new THREE.Shape();
      shape.moveTo(0.24 * scale, 0.15 * scale);
      shape.quadraticCurveTo(0, 0.35 * scale, -0.35 * scale, 0.18 * scale);
      shape.lineTo(-0.38 * scale, 0.08 * scale);
      shape.closePath();
      dorsalGeom = new THREE.ShapeGeometry(shape);
    }
    const dorsalMesh = new THREE.Mesh(dorsalGeom, finMat);
    model.add(dorsalMesh);

    // 6. Pelvic / Anal Fins
    if (type === "angelfish") {
      const feelerMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.20,
        transparent: true,
        opacity: 0.90
      });
      [-1, 1].forEach(zSign => {
        const feelerGeom = new THREE.CylinderGeometry(0.010 * scale, 0.002 * scale, 1.45 * scale, 6);
        feelerGeom.translate(0, -0.72 * scale, 0);
        const feeler = new THREE.Mesh(feelerGeom, feelerMat);
        feeler.position.set(0.08 * scale, -0.42 * scale, zSign * 0.04 * scale);
        feeler.rotation.z = -0.22;
        feeler.rotation.x = zSign * 0.12;
        model.add(feeler);
      });

      const analShape = new THREE.Shape();
      analShape.moveTo(0.05 * scale, -0.38 * scale);
      analShape.lineTo(-0.25 * scale, -1.35 * scale);
      analShape.lineTo(-0.46 * scale, -0.90 * scale);
      analShape.lineTo(-0.35 * scale, -0.20 * scale);
      analShape.closePath();
      const analMesh = new THREE.Mesh(new THREE.ShapeGeometry(analShape), finMat);
      model.add(analMesh);
    } else if (type === "clownfish") {
      [-1, 1].forEach(zSign => {
        const pelvShape = new THREE.Shape();
        pelvShape.moveTo(0, 0);
        pelvShape.lineTo(-0.06 * scale, -0.15 * scale);
        pelvShape.lineTo(-0.14 * scale, -0.11 * scale);
        pelvShape.lineTo(-0.05 * scale, 0);
        pelvShape.closePath();
        const pelvMesh = new THREE.Mesh(new THREE.ShapeGeometry(pelvShape), finMat);
        pelvMesh.position.set(0.18 * scale, -0.22 * scale, zSign * 0.05 * scale);
        pelvMesh.rotation.z = 0.15;
        pelvMesh.rotation.x = zSign * 0.10;
        model.add(pelvMesh);
      });

      // Ventral anal fin
      const analShape = new THREE.Shape();
      analShape.moveTo(-0.06 * scale, -0.20 * scale);
      analShape.quadraticCurveTo(-0.18 * scale, -0.28 * scale, -0.32 * scale, -0.14 * scale);
      analShape.lineTo(-0.35 * scale, -0.08 * scale);
      analShape.closePath();
      const analMesh = new THREE.Mesh(new THREE.ShapeGeometry(analShape), finMat);
      model.add(analMesh);
    } else {
      const analShape = new THREE.Shape();
      analShape.moveTo(-0.05 * scale, -0.20 * scale);
      analShape.quadraticCurveTo(-0.18 * scale, -0.28 * scale, -0.34 * scale, -0.12 * scale);
      analShape.lineTo(-0.36 * scale, -0.06 * scale);
      analShape.closePath();
      const analMesh = new THREE.Mesh(new THREE.ShapeGeometry(analShape), finMat);
      model.add(analMesh);
    }

    // 7. Caudal Fin attached at exact peduncle end
    const caudalFinPivot = new THREE.Group();
    caudalFinPivot.position.set(bodyData.xTail, 0, 0);
    model.add(caudalFinPivot);
    parts.caudalFinPivot = caudalFinPivot;

    const tailShape = new THREE.Shape();
    const hTail = bodyData.spec.stations[0].h * scale;
    tailShape.moveTo(0, hTail);
    if (type === "clownfish" || type === "blue_tang") {
      tailShape.quadraticCurveTo(-0.14 * scale, 0.24 * scale, -0.36 * scale, 0.18 * scale);
      tailShape.quadraticCurveTo(-0.42 * scale, 0, -0.36 * scale, -0.18 * scale);
      tailShape.quadraticCurveTo(-0.14 * scale, -0.24 * scale, 0, -hTail);
    } else if (type === "angelfish") {
      tailShape.lineTo(-0.44 * scale, 0.36 * scale);
      tailShape.quadraticCurveTo(-0.26 * scale, 0, -0.44 * scale, -0.36 * scale);
      tailShape.lineTo(0, -hTail);
    } else if (type === "betta") {
      tailShape.bezierCurveTo(-0.25 * scale, 0.55 * scale, -0.70 * scale, 0.60 * scale, -0.95 * scale, 0.30 * scale);
      tailShape.bezierCurveTo(-1.10 * scale, 0, -0.95 * scale, -0.30 * scale, -0.70 * scale, -0.60 * scale);
      tailShape.bezierCurveTo(-0.25 * scale, -0.55 * scale, 0, -hTail, 0, -hTail);
    } else {
      tailShape.quadraticCurveTo(-0.20 * scale, 0.30 * scale, -0.44 * scale, 0.22 * scale);
      tailShape.quadraticCurveTo(-0.35 * scale, 0, -0.44 * scale, -0.22 * scale);
      tailShape.quadraticCurveTo(-0.20 * scale, -0.30 * scale, 0, -hTail);
    }
    tailShape.closePath();

    const tailMesh = new THREE.Mesh(new THREE.ShapeGeometry(tailShape), finMat);
    caudalFinPivot.add(tailMesh);
    parts.tailMesh = tailMesh;

    return { group, parts };
  }

  createFishTexture(type, config) {
    const w = 1024;
    const h = 512;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    // Silky organic micro-scale bump map
    const bCanvas = document.createElement("canvas");
    bCanvas.width = 512;
    bCanvas.height = 256;
    const bCtx = bCanvas.getContext("2d");
    bCtx.fillStyle = "#808080";
    bCtx.fillRect(0, 0, 512, 256);

    bCtx.fillStyle = "rgba(255, 255, 255, 0.12)";
    for (let r = 8; r < 248; r += 8) {
      const rowOffset = (r / 8) % 2 === 0 ? 0 : 4;
      for (let c = 8 + rowOffset; c < 504; c += 8) {
        bCtx.beginPath();
        bCtx.arc(c, r, 3.2, 0, Math.PI * 2);
        bCtx.fill();
      }
    }

    if (type === "clownfish") {
      // Radiant tropical clownfish cadmium-scarlet orange countershading
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0.0, "#d83800");
      grad.addColorStop(0.20, "#e64a19");
      grad.addColorStop(0.55, "#f4511e");
      grad.addColorStop(0.80, "#ff5722");
      grad.addColorStop(0.95, "#ff7043");
      grad.addColorStop(1.0, "#fff3e0");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Pearlescent organic scale luster
      ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
      for (let y = 14; y < h - 14; y += 12) {
        for (let x = 20; x < w - 20; x += 14) {
          ctx.beginPath();
          ctx.arc(x + ((y / 12) % 2 ? 7 : 0), y, 5, 0, Math.PI);
          ctx.fill();
        }
      }

      // 3 Iconic Clownfish White Bars with crisp jet-black margins & soft icy glow
      const drawClownBar = (centerX, widthTop, widthMid, widthBot, bulgeX) => {
        // Outer jet-black boundary (5px margin)
        ctx.fillStyle = "#0f0f0f";
        ctx.beginPath();
        ctx.moveTo(centerX - widthTop / 2 - 6, 0);
        ctx.bezierCurveTo(
          centerX - widthMid / 2 - 6 + bulgeX, h * 0.45,
          centerX - widthBot / 2 - 6, h * 0.85,
          centerX - widthBot / 2 - 6, h
        );
        ctx.lineTo(centerX + widthBot / 2 + 6, h);
        ctx.bezierCurveTo(
          centerX + widthBot / 2 + 6, h * 0.85,
          centerX + widthMid / 2 + 6 + bulgeX, h * 0.45,
          centerX + widthTop / 2 + 6, 0
        );
        ctx.closePath();
        ctx.fill();

        // Inner pure porcelain white bar
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(centerX - widthTop / 2, 0);
        ctx.bezierCurveTo(
          centerX - widthMid / 2 + bulgeX, h * 0.45,
          centerX - widthBot / 2, h * 0.85,
          centerX - widthBot / 2, h
        );
        ctx.lineTo(centerX + widthBot / 2, h);
        ctx.bezierCurveTo(
          centerX + widthBot / 2, h * 0.85,
          centerX + widthMid / 2 + bulgeX, h * 0.45,
          centerX + widthTop / 2, 0
        );
        ctx.closePath();
        ctx.fill();

        // Subtle icy cyan glow edge highlight
        ctx.strokeStyle = "rgba(186, 230, 253, 0.45)";
        ctx.lineWidth = 2.0;
        ctx.stroke();
      };

      // Bar 1: Head bar behind eye and gill operculum (x = w * 0.73)
      drawClownBar(w * 0.73, 56, 68, 48, -4);
      // Bar 2: Mid-body saddle bar with forward-pointing triangular peak (x = w * 0.46)
      drawClownBar(w * 0.46, 60, 78, 50, 24);
      // Bar 3: Peduncle ring bar before caudal fin (x = w * 0.12)
      drawClownBar(w * 0.12, 34, 38, 30, 0);

    } else if (type === "blue_tang") {
      // Saturated royal blue gradient
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0.0, "#1e3a8a");
      grad.addColorStop(0.4, "#1d4ed8");
      grad.addColorStop(0.8, "#2563eb");
      grad.addColorStop(1.0, "#3b82f6");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Vivid canary-yellow caudal wedge
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w * 0.25, h * 0.5);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Black palette loop pattern
      ctx.fillStyle = "#090d16";
      ctx.beginPath();
      ctx.moveTo(w * 0.76, h * 0.35);
      ctx.bezierCurveTo(w * 0.76, h * 0.08, w * 0.34, h * 0.06, w * 0.22, h * 0.22);
      ctx.bezierCurveTo(w * 0.12, h * 0.35, w * 0.14, h * 0.65, w * 0.28, h * 0.75);
      ctx.bezierCurveTo(w * 0.44, h * 0.85, w * 0.66, h * 0.80, w * 0.72, h * 0.64);
      ctx.bezierCurveTo(w * 0.54, h * 0.72, w * 0.38, h * 0.65, w * 0.34, h * 0.50);
      ctx.bezierCurveTo(w * 0.34, h * 0.35, w * 0.50, h * 0.28, w * 0.66, h * 0.42);
      ctx.closePath();
      ctx.fill();

    } else if (type === "angelfish") {
      // Shimmering pearl silver body
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0.0, "#cbd5e1");
      grad.addColorStop(0.35, "#e2e8f0");
      grad.addColorStop(0.75, "#f1f5f9");
      grad.addColorStop(1.0, "#ffffff");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Golden dorsal wash
      const goldGrad = ctx.createRadialGradient(w * 0.80, h * 0.2, 5, w * 0.80, h * 0.2, 120);
      goldGrad.addColorStop(0.0, "rgba(245, 158, 11, 0.55)");
      goldGrad.addColorStop(1.0, "rgba(245, 158, 11, 0.0)");
      ctx.fillStyle = goldGrad;
      ctx.fillRect(w * 0.60, 0, w * 0.40, h * 0.65);

      // 4 vertical charcoal-slate stripes
      const drawTigerStripe = (x, wTop, wBot) => {
        ctx.fillStyle = "rgba(30, 41, 59, 0.88)";
        ctx.beginPath();
        ctx.moveTo(x - wTop / 2, 0);
        ctx.bezierCurveTo(x - 4, h * 0.5, x - 3, h * 0.8, x - wBot / 2, h);
        ctx.lineTo(x + wBot / 2, h);
        ctx.bezierCurveTo(x + 3, h * 0.8, x + 4, h * 0.5, x + wTop / 2, 0);
        ctx.closePath();
        ctx.fill();
      };

      drawTigerStripe(w * 0.78, 24, 18);
      drawTigerStripe(w * 0.58, 32, 26);
      drawTigerStripe(w * 0.38, 28, 22);
      drawTigerStripe(w * 0.16, 18, 14);

    } else if (type === "betta") {
      // Deep velvet magenta & royal violet with electric cyan sheen
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0.0, "#9d174d");
      grad.addColorStop(0.5, "#6b21a8");
      grad.addColorStop(1.0, "#0891b2");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "rgba(6, 182, 212, 0.75)";
      for (let y = 10; y < h; y += 14) {
        for (let x = 10; x < w; x += 16) {
          ctx.beginPath();
          ctx.arc(x + ((y / 14) % 2 ? 8 : 0), y, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      // Kohaku Koi pattern
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.ellipse(w * 0.72, h * 0.42, 68, 42, 0.15, 0, Math.PI * 2);
      ctx.ellipse(w * 0.42, h * 0.52, 85, 50, -0.25, 0, Math.PI * 2);
      ctx.ellipse(w * 0.18, h * 0.48, 45, 28, 0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ea580c";
      ctx.beginPath();
      ctx.ellipse(w * 0.40, h * 0.50, 58, 35, -0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    const bumpTex = new THREE.CanvasTexture(bCanvas);
    return { map: tex, bumpMap: bumpTex };
  }

  buildJellyfishMesh(config) {
    const group = new THREE.Group();
    const parts = {};
    const scale = config.size || 1.1;

    // 1. Contoured Aurelia Saucer Umbrella Bell with 8 Scalloped Lappets
    const radialSegs = 48;
    const heightSegs = 20;
    const bellGeom = new THREE.BufferGeometry();
    const bellPositions = [];
    const bellUvs = [];
    const bellIndices = [];

    const R0 = 0.56 * scale;
    const H0 = 0.26 * scale;

    for (let j = 0; j <= heightSegs; j++) {
      const v = j / heightSegs; // 0 at apex, 1 at margin
      // Saucer profile curve: shallow convex apex, flaring down to margin
      const r = Math.sin(v * Math.PI * 0.5) * R0;
      const y = Math.cos(v * Math.PI * 0.5) * H0;

      for (let i = 0; i <= radialSegs; i++) {
        const u = i / radialSegs;
        const theta = u * Math.PI * 2;

        // 8 delicate marginal lobes (lappets) near rim
        const lappet = 1.0 + (v > 0.55 ? Math.cos(theta * 8) * 0.038 * ((v - 0.55) / 0.45) : 0);
        const px = Math.cos(theta) * r * lappet;
        const pz = Math.sin(theta) * r * lappet;
        const py = y;

        bellPositions.push(px, py, pz);
        bellUvs.push(u, v);
      }
    }

    for (let j = 0; j < heightSegs; j++) {
      for (let i = 0; i < radialSegs; i++) {
        const a = j * (radialSegs + 1) + i;
        const b = (j + 1) * (radialSegs + 1) + i;
        const c = (j + 1) * (radialSegs + 1) + (i + 1);
        const d = j * (radialSegs + 1) + (i + 1);

        bellIndices.push(a, b, d);
        bellIndices.push(b, c, d);
      }
    }

    bellGeom.setAttribute("position", new THREE.Float32BufferAttribute(bellPositions, 3));
    bellGeom.setAttribute("uv", new THREE.Float32BufferAttribute(bellUvs, 2));
    bellGeom.setIndex(bellIndices);
    bellGeom.computeVertexNormals();

    const bellMat = new THREE.MeshPhysicalMaterial({
      color: 0xecfeff,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.32,
      roughness: 0.08,
      metalness: 0.02,
      transmission: 0.88,
      thickness: 0.30,
      ior: 1.34,
      specularColor: 0x67e8f9,
      transparent: true,
      opacity: 0.90,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const bellMesh = new THREE.Mesh(bellGeom, bellMat);
    group.add(bellMesh);
    parts.bell = bellMesh;

    // Glowing Subumbrella Margin Rim (Velum ring)
    const rimGeom = new THREE.TorusGeometry(R0 * 0.99, 0.006 * scale, 8, 36);
    rimGeom.rotateX(Math.PI / 2);
    const rimMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    const rimMesh = new THREE.Mesh(rimGeom, rimMat);
    group.add(rimMesh);
    parts.rim = rimMesh;

    // 2. 4 Slender Horseshoe / Cloverleaf Gonads (Translucent Lavender-Pink)
    const gonadGroup = new THREE.Group();
    gonadGroup.position.y = 0.12 * scale;
    const gonadMat = new THREE.MeshPhysicalMaterial({
      color: 0xf472b6,
      emissive: 0xd946ef,
      emissiveIntensity: 0.60,
      roughness: 0.15,
      transmission: 0.45,
      thickness: 0.1,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide
    });

    for (let g = 0; g < 4; g++) {
      const angle = (g * Math.PI) / 2;
      const gonadGeom = new THREE.TorusGeometry(0.10 * scale, 0.012 * scale, 12, 24, Math.PI * 1.55);
      const gonadMesh = new THREE.Mesh(gonadGeom, gonadMat);
      gonadMesh.rotation.x = Math.PI / 2;
      gonadMesh.rotation.z = angle + Math.PI * 0.22;
      const rad = 0.14 * scale;
      gonadMesh.position.set(Math.cos(angle) * rad, 0, Math.sin(angle) * rad);
      gonadGroup.add(gonadMesh);
    }
    group.add(gonadGroup);
    parts.gonads = gonadGroup;

    // 3. Central Manubrium & 4 Ruffled Ribbon Oral Arms (Chiffon frills with soft feathered edge)
    const oralArms = [];
    if (!this.oralArmTexture) {
      this.oralArmTexture = this.createOralArmTexture();
    }
    const armMat = new THREE.MeshStandardMaterial({
      map: this.oralArmTexture,
      color: 0xffffff,
      emissive: 0x9333ea,
      emissiveIntensity: 0.28,
      roughness: 0.22,
      metalness: 0.04,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const armLength = 1.35 * scale;
    for (let a = 0; a < 4; a++) {
      const armAngle = (a * Math.PI) / 2 + Math.PI / 4;
      const vSegments = 26;
      const uSegments = 4;
      const armGeom = new THREE.PlaneGeometry(0.15 * scale, armLength, uSegments, vSegments);
      armGeom.translate(0, -armLength / 2, 0); // anchor at top

      // Sculpt initial gentle ruffles into the chiffon ribbon
      const armPos = armGeom.attributes.position;
      const baseArmPos = new Float32Array(armPos.array);

      for (let i = 0; i < armPos.count; i++) {
        const py = armPos.getY(i);
        const vNorm = THREE.MathUtils.clamp(-py / armLength, 0, 1);
        const widthFactor = 1.0 - vNorm * 0.65;
        armPos.setX(i, armPos.getX(i) * widthFactor);
        const ruffle = Math.sin(vNorm * 16.0 + a * 2.0) * (0.024 * scale * (0.2 + 0.8 * vNorm));
        armPos.setZ(i, ruffle);
      }
      armGeom.computeVertexNormals();

      const armMesh = new THREE.Mesh(armGeom, armMat);
      armMesh.rotation.y = armAngle;
      const rAnchor = 0.06 * scale;
      armMesh.position.set(Math.cos(armAngle) * rAnchor, 0.02 * scale, Math.sin(armAngle) * rAnchor);

      group.add(armMesh);
      oralArms.push({
        mesh: armMesh,
        geom: armGeom,
        basePos: baseArmPos,
        phase: armAngle,
        armLength
      });
    }
    parts.oralArms = oralArms;

    // 4. Marginal Translucent Filaments / Tentacles (24 delicate rim threads)
    const tentacleCount = 24;
    const tentacles = [];
    const tentacleMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });

    for (let i = 0; i < tentacleCount; i++) {
      const angle = (i / tentacleCount) * Math.PI * 2;
      const rad = R0 * 0.98;
      const tGeom = new THREE.CylinderGeometry(0.003 * scale, 0.001 * scale, 1.10 * scale, 3);
      tGeom.translate(0, -0.55 * scale, 0);

      const tMesh = new THREE.Mesh(tGeom, tentacleMat);
      tMesh.position.set(Math.cos(angle) * rad, 0, Math.sin(angle) * rad);
      group.add(tMesh);
      tentacles.push({ mesh: tMesh, phase: angle });
    }
    parts.tentacles = tentacles;

    return { group, parts };
  }

  createOralArmTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    const imgData = ctx.createImageData(128, 256);
    const data = imgData.data;

    for (let y = 0; y < 256; y++) {
      const v = y / 256;
      const vertFade = Math.pow(1 - v * 0.75, 1.1);

      for (let x = 0; x < 128; x++) {
        const u = x / 128;
        const horizEdge = Math.sin(u * Math.PI);
        const alpha = Math.floor(255 * Math.pow(horizEdge, 0.75) * vertFade * 0.70);

        const idx = (y * 128 + x) * 4;
        data[idx] = 252;
        data[idx + 1] = 244;
        data[idx + 2] = 255;
        data[idx + 3] = alpha;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  createMantaRayTexture() {
    const w = 1024;
    const h = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    // 1. Top half (0..512): Dorsal skin (Midnight slate-navy with white chevron mantles)
    const dGrad = ctx.createLinearGradient(0, 0, 0, 512);
    dGrad.addColorStop(0.0, "#080c14");
    dGrad.addColorStop(0.5, "#0d1524");
    dGrad.addColorStop(1.0, "#090d16");
    ctx.fillStyle = dGrad;
    ctx.fillRect(0, 0, w, 512);

    // Micro-denticle organic speckles
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    for (let i = 0; i < 4000; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * 512, 1.5, 1.5);
    }

    // Iconic Manta Shoulder Mantle markings (Symmetrical bright white chevrons)
    // Left shoulder
    ctx.fillStyle = "rgba(241, 245, 249, 0.92)";
    ctx.beginPath();
    ctx.moveTo(380, 110);
    ctx.bezierCurveTo(310, 160, 200, 240, 140, 310);
    ctx.bezierCurveTo(180, 300, 290, 220, 370, 190);
    ctx.closePath();
    ctx.fill();

    // Right shoulder
    ctx.beginPath();
    ctx.moveTo(644, 110);
    ctx.bezierCurveTo(714, 160, 824, 240, 884, 310);
    ctx.bezierCurveTo(844, 300, 734, 220, 654, 190);
    ctx.closePath();
    ctx.fill();

    // White trailing wingtip borders
    ctx.strokeStyle = "rgba(248, 250, 252, 0.85)";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(80, 290);
    ctx.quadraticCurveTo(50, 330, 120, 360);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(944, 290);
    ctx.quadraticCurveTo(974, 330, 904, 360);
    ctx.stroke();

    // Caudal base pale spots
    ctx.fillStyle = "rgba(226, 232, 240, 0.65)";
    for (let i = 0; i < 28; i++) {
      const sx = 512 + (Math.random() - 0.5) * 80;
      const sy = 420 + Math.random() * 70;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5 + Math.random() * 3.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Bottom half (512..1024): Ventral skin (Creamy porcelain white with gills & unique spot cluster)
    const vGrad = ctx.createLinearGradient(0, 512, 0, 1024);
    vGrad.addColorStop(0.0, "#f8fafc");
    vGrad.addColorStop(0.6, "#f1f5f9");
    vGrad.addColorStop(1.0, "#e2e8f0");
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 512, w, 512);

    // Mouth slit (terminal transverse opening at front)
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.ellipse(512, 580, 110, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5 pairs of dark branchial gill slits along pectoral girdle
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 5.0;
    ctx.lineCap = "round";
    for (let g = 0; g < 5; g++) {
      const gy = 670 + g * 26;
      const spread = 70 + g * 12;
      const slitLen = 42 - g * 4;

      // Left gill slit
      ctx.beginPath();
      ctx.moveTo(512 - spread, gy - slitLen / 2);
      ctx.quadraticCurveTo(512 - spread + 8, gy, 512 - spread, gy + slitLen / 2);
      ctx.stroke();

      // Right gill slit
      ctx.beginPath();
      ctx.moveTo(512 + spread, gy - slitLen / 2);
      ctx.quadraticCurveTo(512 + spread - 8, gy, 512 + spread, gy + slitLen / 2);
      ctx.stroke();
    }

    // Distinctive belly spot cluster ("fingerprint")
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    const spotSeeds = [
      [-35, 830, 7], [42, 845, 6], [-12, 860, 8], [24, 880, 7],
      [-55, 875, 5], [60, 865, 6], [-28, 910, 8], [15, 920, 6],
      [-6, 940, 7], [-45, 930, 5], [38, 935, 6]
    ];
    for (const [ox, oy, rad] of spotSeeds) {
      ctx.beginPath();
      ctx.arc(512 + ox, oy, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bump map
    const bCanvas = document.createElement("canvas");
    bCanvas.width = 512;
    bCanvas.height = 512;
    const bCtx = bCanvas.getContext("2d");
    bCtx.fillStyle = "#808080";
    bCtx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 8000; i++) {
      bCtx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
      bCtx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
    }

    const tex = new THREE.CanvasTexture(canvas);
    const bumpTex = new THREE.CanvasTexture(bCanvas);
    return { map: tex, bumpMap: bumpTex };
  }

  buildMantaRayMesh(config) {
    const group = new THREE.Group();
    const scale = config.size || 2.4;
    const parts = {};

    // 1. Disc Body Geometry (Watertight manifold batoid hydrofoil)
    const numRings = 40;     // along length (Z from tail to snout)
    const numSegments = 36;  // around circumference (theta from 0 to 2*PI)
    const geom = new THREE.BufferGeometry();
    const vertices = [];
    const uvs = [];
    const indices = [];

    // Longitudinal stations: v from 0 (tail notch) to 1 (snout)
    for (let r = 0; r <= numRings; r++) {
      const v = r / numRings;
      const z = (-1.3 + v * 2.7) * scale;

      // Planform half-width at station v:
      let wHalf;
      if (v < 0.65) {
        const uTrail = v / 0.65;
        wHalf = (0.25 + Math.sin(uTrail * Math.PI * 0.5) * 1.95) * scale;
      } else {
        const uLead = (v - 0.65) / 0.35;
        wHalf = (2.2 - Math.pow(uLead, 1.2) * 1.75) * scale;
      }

      // Disk thickness at station v:
      const tDisk = (0.32 * Math.sin(v * Math.PI * 0.9 + 0.15)) * scale;

      for (let s = 0; s <= numSegments; s++) {
        const theta = (s / numSegments) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        const x = sinT * wHalf;
        const edgeTaper = Math.max(0.035, 1.0 - Math.pow(Math.abs(sinT), 1.35) * 0.92);
        let y = cosT * tDisk * edgeTaper;
        if (cosT < 0) {
          y *= 0.65; // Ventral belly is flatter
        }

        vertices.push(x, y, z);

        // Separate UV mapping for dorsal and ventral halves
        let uTex, vTex;
        if (cosT >= 0) {
          // Dorsal (canvas top half, WebGL V in 0.52..0.98)
          uTex = sinT * 0.48 + 0.50;
          vTex = 0.52 + (1.0 - v) * 0.46;
        } else {
          // Ventral (canvas bottom half, WebGL V in 0.01..0.49)
          uTex = sinT * 0.48 + 0.50;
          vTex = (1.0 - v) * 0.48 + 0.01;
        }
        uvs.push(uTex, vTex);
      }
    }

    for (let r = 0; r < numRings; r++) {
      for (let s = 0; s < numSegments; s++) {
        const i0 = r * (numSegments + 1) + s;
        const i1 = (r + 1) * (numSegments + 1) + s;
        const i2 = (r + 1) * (numSegments + 1) + (s + 1);
        const i3 = r * (numSegments + 1) + (s + 1);

        indices.push(i0, i1, i2);
        indices.push(i0, i2, i3);
      }
    }

    geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const { map, bumpMap } = this.createMantaRayTexture();
    const mat = new THREE.MeshStandardMaterial({
      map,
      bumpMap,
      bumpScale: 0.005,
      roughness: 0.20,
      metalness: 0.05
    });

    this.applyIridescentSheen(mat, 0x38bdf8);

    const discMesh = new THREE.Mesh(geom, mat);
    discMesh.castShadow = true;
    group.add(discMesh);
    parts.discMesh = discMesh;
    parts.basePositions = vertices.slice();
    parts.scale = scale;

    // Shared dark dorsal material with iridescent sheen
    const darkDorsalMat = new THREE.MeshStandardMaterial({
      color: 0x090f1a,
      roughness: 0.22,
      metalness: 0.05
    });
    this.applyIridescentSheen(darkDorsalMat, 0x38bdf8);

    // 2. Cephalic Horns (Dual forward-curling flaps with dark dorsal mantle finish)
    [-1, 1].forEach(side => {
      const hornCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.40 * scale, -0.02 * scale, 1.35 * scale),
        new THREE.Vector3(side * 0.42 * scale, -0.01 * scale, 1.65 * scale),
        new THREE.Vector3(side * 0.35 * scale, -0.05 * scale, 1.88 * scale),
        new THREE.Vector3(side * 0.22 * scale, -0.08 * scale, 1.95 * scale)
      ]);
      const hornGeom = new THREE.TubeGeometry(hornCurve, 16, 0.055 * scale, 8, false);
      const hornMesh = new THREE.Mesh(hornGeom, darkDorsalMat);
      hornMesh.castShadow = true;
      group.add(hornMesh);
    });

    // 3. Slender Whip Tail with Dark Dorsal Sheen
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.02 * scale, -1.25 * scale),
      new THREE.Vector3(0, 0.01 * scale, -1.65 * scale),
      new THREE.Vector3(0, -0.04 * scale, -2.15 * scale),
      new THREE.Vector3(0, -0.10 * scale, -2.60 * scale)
    ]);
    const tailGeom = new THREE.TubeGeometry(tailCurve, 24, 0.026 * scale, 8, false);
    const tailMesh = new THREE.Mesh(tailGeom, darkDorsalMat);
    tailMesh.castShadow = true;
    group.add(tailMesh);
    parts.tailMesh = tailMesh;

    // 4. Tiny Dorsal Fin at Tail Base
    const dShape = new THREE.Shape();
    dShape.moveTo(0, 0);
    dShape.lineTo(0, 0.12 * scale);
    dShape.lineTo(-0.16 * scale, 0);
    dShape.closePath();
    const dMesh = new THREE.Mesh(new THREE.ShapeGeometry(dShape), darkDorsalMat);
    dMesh.position.set(0, 0.06 * scale, -1.25 * scale);
    dMesh.rotation.y = Math.PI / 2;
    group.add(dMesh);

    return { group, parts };
  }

  sendWavePulse(pulsePoint) {
    // Oceanic diver wave pulse shockwave
    if (this.audio && this.audio.playWaterPulse) {
      this.audio.playWaterPulse();
    } else if (this.audio) {
      this.audio.playTap();
    }

    for (const f of this.fishList) {
      const fishPos = f.group.position;
      const dist = fishPos.distanceTo(pulsePoint);
      if (dist < 6.0) {
        f.scaredTimer = 2.0; // Burst dash away from wave disturbance
        const awayVec = new THREE.Vector3().subVectors(fishPos, pulsePoint).normalize();
        f.velocity.add(awayVec.multiplyScalar(3.2));
      }
    }
  }

  tapGlass(tapPoint) {
    this.sendWavePulse(tapPoint);
  }

  update(delta, time) {
    // 1. Update distant background schooling reef fish
    this.updateDistantSchool(delta, time);

    const activeFoods = this.foodManager.foods;

    for (let i = 0; i < this.fishList.length; i++) {
      const f = this.fishList[i];
      const pos = f.group.position;

      // 1. Behavior Decision
      f.scaredTimer = Math.max(0, f.scaredTimer - delta);

      let targetPos = null;
      let targetSpeed = f.maxSpeed;

      if (f.scaredTimer > 0) {
        // High panic speed
        targetSpeed = f.maxSpeed * 2.2;
      } else {
        // Check for nearby falling food
        if (activeFoods.length > 0 && f.data.hunger < 95) {
          let closestFood = null;
          let minDist = 7.0; // Detection radius in open water
          for (const food of activeFoods) {
            const d = pos.distanceTo(food.mesh.position);
            if (d < minDist) {
              minDist = d;
              closestFood = food;
            }
          }

          if (closestFood) {
            targetPos = closestFood.mesh.position;
            targetSpeed = f.maxSpeed * 1.5;

            // Check if reached food
            if (minDist < 0.35) {
              this.foodManager.consume(closestFood, pos, f.id);
            }
          }
        }
      }

      // If no food or panic, idle wander across open ocean
      if (!targetPos && f.scaredTimer <= 0) {
        f.wanderTimer -= delta;
        if (f.wanderTimer <= 0) {
          if (f.isMantaRay) {
            f.wanderTimer = 7.0 + Math.random() * 5.0;
            const angle = Math.random() * Math.PI * 2;
            const rad = 14.0 + Math.random() * 8.0;
            f.targetPos.set(
              Math.cos(angle) * rad,
              this.bounds.minY + 2.0 + Math.random() * 2.2,
              -14.0 + Math.sin(angle) * 7.0
            );
          } else if (f.type === "clownfish") {
            f.wanderTimer = 3.5 + Math.random() * 5.0;
            // Clownfish stay primarily around reef knolls and sea anemones
            f.targetPos.set(
              -6.0 + Math.random() * 12.0,
              this.bounds.minY + 0.8 + Math.random() * 2.8,
              -5.5 + Math.random() * 6.5
            );
          } else {
            f.wanderTimer = 3.5 + Math.random() * 5.0;
            // Open ocean pelagic cruisers: wide oceanic patrol circuits across open seafloor
            f.targetPos.set(
              (Math.random() - 0.5) * 44.0,
              this.bounds.minY + 0.8 + Math.random() * 4.8,
              -22.0 + Math.random() * 24.5
            );
          }
        }
        targetPos = f.targetPos;
      }

      // 2. Steer towards target
      if (targetPos) {
        const desired = new THREE.Vector3().subVectors(targetPos, pos).normalize().multiplyScalar(targetSpeed);
        const steer = new THREE.Vector3().subVectors(desired, f.velocity);
        steer.clampLength(0, (f.isMantaRay ? 1.4 : 2.5) * delta);
        f.velocity.add(steer);
      }

      // 3. Flocking & Separation from other fish
      const sepForce = new THREE.Vector3();
      for (let j = 0; j < this.fishList.length; j++) {
        if (i === j) continue;
        const other = this.fishList[j];
        const d = pos.distanceTo(other.group.position);
        if (d < 0.6 && d > 0.001) {
          const diff = new THREE.Vector3().subVectors(pos, other.group.position).normalize();
          diff.divideScalar(d);
          sepForce.add(diff);
        }
      }
      f.velocity.add(sepForce.multiplyScalar(delta * 1.8));

      // 4. Open Ocean Soft Homing Guidance (No hard glass walls!)
      const maxDistX = 24.0;
      const maxDistZBack = -24.0;
      const maxDistZFront = 3.2; // Keep in front of camera view
      const minY = this.bounds.minY + 0.6;
      const maxY = this.bounds.maxY - 0.8;

      if (pos.x < -maxDistX) f.velocity.x += 1.6 * delta;
      if (pos.x > maxDistX) f.velocity.x -= 1.6 * delta;
      if (pos.z < maxDistZBack) f.velocity.z += 1.6 * delta;
      if (pos.z > maxDistZFront) f.velocity.z -= 2.0 * delta;
      if (pos.y < minY) f.velocity.y += 2.2 * delta;
      if (pos.y > maxY) f.velocity.y -= 1.8 * delta;

      // Speed limits
      const currentSpeed = f.velocity.length();
      if (currentSpeed > targetSpeed * 1.5) {
        f.velocity.clampLength(0, targetSpeed * 1.5);
      }

      // Update position
      pos.addScaledVector(f.velocity, delta);

      // Safe outer oceanic clamping (way beyond visible camera fog)
      pos.x = THREE.MathUtils.clamp(pos.x, -28.0, 28.0);
      pos.y = THREE.MathUtils.clamp(pos.y, this.bounds.minY + 0.3, this.bounds.maxY);
      pos.z = THREE.MathUtils.clamp(pos.z, -28.0, 4.5);

      // 5. Rotation & Heading
      if (f.isMantaRay) {
        // Manta Ray Heading, Banking Roll & Traveling Wing Wave Kinematics
        if (f.velocity.lengthSq() > 0.001) {
          const lookTarget = pos.clone().add(f.velocity);
          f.group.lookAt(lookTarget);
        }

        // Natural banking roll proportional to turn rate
        const bank = -f.velocity.x * 0.22;
        f.group.rotation.z = bank;
        const pitch = -Math.atan2(f.velocity.y, Math.max(0.1, Math.hypot(f.velocity.x, f.velocity.z)));
        f.group.rotation.x = pitch;

        // Batoid Traveling Pectoral Flap Kinematics
        const s = f.parts.scale || 2.4;
        const omega = 1.8;
        const tWave = time * omega + f.phaseOffset;

        if (f.parts.discMesh && f.parts.basePositions) {
          const posAttr = f.parts.discMesh.geometry.attributes.position;
          const basePos = f.parts.basePositions;
          const count = posAttr.count;
          const maxSpan = 2.2 * s;

          for (let k = 0; k < count; k++) {
            const origX = basePos[k * 3];
            const origY = basePos[k * 3 + 1];
            const origZ = basePos[k * 3 + 2];

            const spanRatio = Math.min(1.0, Math.abs(origX) / maxSpan);
            // Traveling wave flapped down trailing edge
            const wingFlap = Math.sin(tWave - origZ * 0.75) * Math.pow(spanRatio, 1.35) * (0.50 * s);
            const bodyHeave = Math.cos(tWave) * (0.035 * s);

            posAttr.setY(k, origY + wingFlap + bodyHeave);

            if (spanRatio > 0.45) {
              const curl = Math.cos(tWave - origZ * 0.75) * Math.pow(spanRatio, 1.8) * (0.07 * s);
              posAttr.setZ(k, origZ - curl);
            }
          }
          posAttr.needsUpdate = true;
          f.parts.discMesh.geometry.computeVertexNormals();
        }

        // Whip tail trailing undulation
        if (f.parts.tailMesh) {
          f.parts.tailMesh.rotation.x = Math.sin(tWave - 1.8) * 0.10;
          f.parts.tailMesh.rotation.y = Math.cos(tWave - 1.8) * 0.08;
        }
      } else if (f.isJellyfish) {
        // Asymmetric two-phase propulsion cycle (power stroke vs recovery glide)
        const cyclePeriod = 2.4;
        const tCycle = (time * 1.2 + f.phaseOffset) % cyclePeriod;
        let scaleBellXZ = 1.0;
        let scaleBellY = 1.0;

        if (tCycle < 0.65) {
          // Rapid contraction & downward jet thrust
          const tau = tCycle / 0.65;
          const power = Math.sin(tau * Math.PI);
          scaleBellXZ = 1.0 - power * 0.26;
          scaleBellY = 1.0 + power * 0.22;
          f.velocity.y += 0.8 * delta;
        } else {
          // Slow relaxed expansion glide
          const tau = (tCycle - 0.65) / (cyclePeriod - 0.65);
          const relax = Math.cos(tau * Math.PI * 0.5);
          scaleBellXZ = 1.0 - relax * 0.08;
          scaleBellY = 1.0 + relax * 0.06;
        }

        if (f.parts.bell) {
          f.parts.bell.scale.set(scaleBellXZ, scaleBellY, scaleBellXZ);
        }
        if (f.parts.rim) {
          f.parts.rim.scale.set(scaleBellXZ, 1.0, scaleBellXZ);
        }

        f.group.rotation.x = Math.sin(time * 1.2) * 0.08;
        f.group.rotation.z = Math.cos(time * 1.2) * 0.08;

        if (f.parts.tentacles) {
          for (const t of f.parts.tentacles) {
            t.mesh.rotation.x = Math.sin(time * 2.5 + t.phase) * 0.18;
            t.mesh.rotation.z = Math.cos(time * 2.5 + t.phase) * 0.18;
          }
        }
        if (f.parts.oralArms) {
          for (const arm of f.parts.oralArms) {
            arm.mesh.rotation.x = Math.sin(time * 1.5 + arm.phase) * 0.12;
            arm.mesh.rotation.z = Math.cos(time * 1.5 + arm.phase) * 0.12;

            if (arm.geom && arm.basePos) {
              const pos = arm.geom.attributes.position;
              const base = arm.basePos;
              const count = pos.count;
              const aLen = arm.armLength || (1.35 * (f.data.size || 1.1));
              for (let k = 0; k < count; k++) {
                const py = base[k * 3 + 1];
                const vNorm = THREE.MathUtils.clamp(-py / aLen, 0, 1);
                const waveX = Math.sin(time * 2.2 - vNorm * 4.5 + arm.phase) * (0.035 * (f.data.size || 1.1) * vNorm);
                const waveZ = Math.cos(time * 1.8 - vNorm * 4.0 + arm.phase) * (0.028 * (f.data.size || 1.1) * vNorm);
                pos.setX(k, base[k * 3] * (1 - vNorm * 0.65) + waveX);
                pos.setZ(k, base[k * 3 + 2] + waveZ);
              }
              pos.needsUpdate = true;
            }
          }
        }
      } else {
        // Fish heading lookAt
        if (f.velocity.lengthSq() > 0.001) {
          const lookTarget = pos.clone().add(f.velocity);
          f.group.lookAt(lookTarget);
        }

        // Biomechanical travelling sine wave undulation (Full-body spine & vertex wave kinematics)
        const waveFreq = (f.scaredTimer > 0 ? 14 : 7.2) * (currentSpeed / (f.maxSpeed || 1));
        const tWave = time * waveFreq + f.phaseOffset;

        if (f.parts.bodyGeom && f.parts.basePositions) {
          const posAttr = f.parts.bodyGeom.attributes.position;
          const basePos = f.parts.basePositions;
          const count = posAttr.count;
          const xTail = f.parts.xTail;
          const xHead = f.parts.xHead;
          const len = Math.max(0.1, xHead - xTail);
          const fishScale = f.data.size || 1.0;

          for (let k = 0; k < count; k++) {
            const origX = basePos[k * 3];
            const origZ = basePos[k * 3 + 2];
            const u = THREE.MathUtils.clamp((origX - xTail) / len, 0, 1);
            const tailFactor = Math.pow(1 - u, 1.5);
            const wave = Math.sin(tWave - (1 - u) * 3.2) * 0.14 * fishScale * tailFactor;
            posAttr.setZ(k, origZ + wave);
          }
          posAttr.needsUpdate = true;
        }

        if (f.parts.caudalFinPivot) {
          const fishScale = f.data.size || 1.0;
          const peduncleWave = Math.sin(tWave - 3.2) * 0.14 * fishScale;
          f.parts.caudalFinPivot.position.z = peduncleWave;
          f.parts.caudalFinPivot.rotation.y = Math.sin(tWave - 3.6) * 0.42;
        }

        // Head counter-yaw & gentle natural roll
        if (f.parts.model) {
          f.parts.model.rotation.y = -Math.PI / 2 - Math.sin(tWave) * 0.05;
          f.parts.model.rotation.z = Math.sin(tWave) * 0.06;
        }

        // Pectoral fin dynamic rowing motion
        if (f.parts.pecLeft && f.parts.pecRight) {
          const pecFlap = Math.sin(time * waveFreq * 1.25 + f.phaseOffset) * 0.35;
          f.parts.pecLeft.rotation.y = 0.45 + pecFlap;
          f.parts.pecLeft.rotation.z = Math.cos(time * waveFreq * 1.25 + f.phaseOffset) * 0.15;
          f.parts.pecRight.rotation.y = -0.45 - pecFlap;
          f.parts.pecRight.rotation.z = -Math.cos(time * waveFreq * 1.25 + f.phaseOffset) * 0.15;
        }
      }
    }
  }

  getFishByMesh(object) {
    let curr = object;
    while (curr && curr.parent) {
      const match = this.fishList.find(f => f.group === curr);
      if (match) return match;
      curr = curr.parent;
    }
    return null;
  }
}

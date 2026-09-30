import * as THREE from 'three';

/**
 * Creates procedural glowing glyphs canvas texture for the pyramid faces
 */
function createGlyphTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0a0505';
  ctx.fillRect(0, 0, 512, 512);

  // Draw ancient geometric trisolar circuitry
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 12;

  for (let i = 40; i < 480; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, 40);
    ctx.lineTo(i + 30, 120);
    ctx.lineTo(512 - i, 280);
    ctx.lineTo(256, 460);
    ctx.stroke();

    // Sacred triangular nodes
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(i + 30, 120, 5, 0, Math.PI * 2);
    ctx.arc(512 - i, 280, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

export class ChaoticPyramid {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.time = 0;
    this.rings = [];
    this.crystal = null;
    this.beaconBeam = null;
    this.glyphMaterial = null;

    this.buildPyramid();
    this.buildSummitApparatus();
    this.scene.add(this.group);
  }

  buildPyramid() {
    // Stepped Monolithic Pyramid structure (5 colossal tiers)
    const tiers = 6;
    const baseWidth = 140;
    const totalHeight = 85;
    const tierHeight = totalHeight / tiers;

    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x181014,
      roughness: 0.85,
      metalness: 0.25,
      flatShading: true
    });

    const glyphTex = createGlyphTexture();
    this.glyphMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a0f0d,
      emissive: 0xd97706,
      emissiveMap: glyphTex,
      emissiveIntensity: 0.75,
      roughness: 0.6,
      metalness: 0.4
    });

    for (let i = 0; i < tiers; i++) {
      const scale = 1.0 - (i / tiers) * 0.78;
      const w = baseWidth * scale;
      const d = baseWidth * scale;
      const h = tierHeight * 0.96;
      const y = i * tierHeight + h / 2;

      const geom = new THREE.BoxGeometry(w, h, d);
      // Alternate materials for glyph engraved tiers
      const mat = (i % 2 === 1) ? this.glyphMaterial : stoneMaterial;
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(0, y, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);

      // Monumental Central Processional Stairways on cardinal faces (+Z, -Z)
      const stairWidth = 16 * scale;
      const stairDepth = 6.0;
      const stairGeomZ = new THREE.BoxGeometry(stairWidth, h, stairDepth);
      const stairMat = new THREE.MeshStandardMaterial({
        color: 0x201416,
        roughness: 0.8,
        metalness: 0.35,
        flatShading: true
      });

      // Front Stair (+Z)
      const frontStair = new THREE.Mesh(stairGeomZ, stairMat);
      frontStair.position.set(0, y, d / 2 + stairDepth / 2 - 0.8);
      frontStair.castShadow = true;
      frontStair.receiveShadow = true;
      this.group.add(frontStair);

      // Back Stair (-Z)
      const backStair = new THREE.Mesh(stairGeomZ, stairMat);
      backStair.position.set(0, y, -d / 2 - stairDepth / 2 + 0.8);
      backStair.castShadow = true;
      backStair.receiveShadow = true;
      this.group.add(backStair);

      // Edge decorative parapets / monolithic steles
      if (i > 0 && i < tiers - 1) {
        this.addTierPerimeterPillars(w * 0.48, y + h / 2, stoneMaterial);
      }
    }

    this.addBaseGuardianObelisks();
  }

  addBaseGuardianObelisks() {
    const obeliskGeom = new THREE.CylinderGeometry(2.2, 3.8, 42, 4);
    const obeliskMat = new THREE.MeshStandardMaterial({
      color: 0x140a0c,
      roughness: 0.75,
      metalness: 0.45
    });

    const tipGeom = new THREE.OctahedronGeometry(2.4, 0);
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.8,
      metalness: 0.9,
      roughness: 0.1
    });

    const cornerCoords = [
      { x: 88, z: 88 },
      { x: -88, z: 88 },
      { x: 88, z: -88 },
      { x: -88, z: -88 }
    ];

    cornerCoords.forEach((c) => {
      const col = new THREE.Mesh(obeliskGeom, obeliskMat);
      col.position.set(c.x, 21, c.z);
      col.rotation.y = Math.PI / 4;
      col.castShadow = true;
      col.receiveShadow = true;
      this.group.add(col);

      const tip = new THREE.Mesh(tipGeom, tipMat);
      tip.position.set(c.x, 43.5, c.z);
      this.group.add(tip);
    });
  }

  addTierPerimeterPillars(radius, y, mat) {
    const count = 4;
    for (let j = 0; j < count; j++) {
      const angle = (j * Math.PI) / 2 + Math.PI / 4;
      const px = Math.cos(angle) * radius * 1.35;
      const pz = Math.sin(angle) * radius * 1.35;

      const pGeom = new THREE.CylinderGeometry(1.2, 1.8, 8, 4);
      const pillar = new THREE.Mesh(pGeom, mat);
      pillar.position.set(px, y + 4, pz);
      pillar.rotation.y = angle;
      pillar.castShadow = true;
      this.group.add(pillar);
    }
  }

  buildSummitApparatus() {
    const summitY = 88;

    // Levitation Platform
    const platformGeom = new THREE.CylinderGeometry(16, 18, 3, 8);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x221310,
      roughness: 0.5,
      metalness: 0.7
    });
    const platform = new THREE.Mesh(platformGeom, platformMat);
    platform.position.set(0, summitY, 0);
    platform.receiveShadow = true;
    this.group.add(platform);

    // Giant Trisolar Armillary Sphere (3 Concentric Rotating Rings)
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0x78350f,
      emissiveIntensity: 0.3
    });

    const ringRadii = [14, 11, 8];
    ringRadii.forEach((r, idx) => {
      const ringGeom = new THREE.TorusGeometry(r, 0.45, 16, 64);
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.position.set(0, summitY + 16, 0);
      this.group.add(ringMesh);
      this.rings.push({
        mesh: ringMesh,
        speedX: (idx + 1) * 0.32 * (idx % 2 === 0 ? 1 : -1),
        speedY: (idx + 1) * 0.45 * (idx % 2 === 0 ? -1 : 1),
        speedZ: (idx + 1) * 0.28
      });
    });

    // Central Floating Energy Singularity Crystal
    const crystalGeom = new THREE.OctahedronGeometry(4.2, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xf59e0b,
      emissiveIntensity: 3.0,
      roughness: 0.1,
      metalness: 0.9,
      wireframe: false
    });
    this.crystal = new THREE.Mesh(crystalGeom, crystalMat);
    this.crystal.position.set(0, summitY + 16, 0);
    this.group.add(this.crystal);

    // Volumetric Skyward Energy Beacon Beam
    const beamGeom = new THREE.CylinderGeometry(1.2, 3.8, 650, 32, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.beaconBeam = new THREE.Mesh(beamGeom, beamMat);
    this.beaconBeam.position.set(0, summitY + 16 + 325, 0);
    this.group.add(this.beaconBeam);
  }

  update(delta) {
    this.time += delta;

    // Rotate Armillary Gyroscopic Rings
    this.rings.forEach((ring) => {
      ring.mesh.rotation.x += ring.speedX * delta;
      ring.mesh.rotation.y += ring.speedY * delta;
      ring.mesh.rotation.z += ring.speedZ * delta;
    });

    // Floating Singularity Oscillation
    if (this.crystal) {
      this.crystal.rotation.y += 0.8 * delta;
      this.crystal.rotation.x += 0.5 * delta;
      this.crystal.position.y = 88 + 16 + Math.sin(this.time * 2.2) * 1.5;
    }

    // Beacon Pulse
    if (this.beaconBeam) {
      this.beaconBeam.rotation.y += 0.2 * delta;
      const pulse = 0.3 + Math.sin(this.time * 3.5) * 0.12;
      this.beaconBeam.material.opacity = pulse;
    }

    // Ancient Glyph Breathing Glow
    if (this.glyphMaterial) {
      const breath = 0.6 + Math.sin(this.time * 1.8) * 0.35;
      this.glyphMaterial.emissiveIntensity = breath;
    }
  }
}

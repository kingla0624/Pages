import * as THREE from 'three';

/**
 * Procedural Alien Wasteland Terrain with Crater Ridges and Canyons
 */
export class AlienTerrain {
  constructor(scene) {
    this.scene = scene;
    this.time = 0;
    this.embers = null;
    this.emberData = [];

    this.createGround();
    this.createMonolithForest();
    this.createDehydratedFigures();
    this.createRisingEmbers();
  }

  createGround() {
    const size = 1200;
    const segments = 140;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Distance from center pyramid to keep pyramid foundation flat
      const dist = Math.sqrt(x * x + z * z);
      const flattenFactor = Math.min(1.0, Math.max(0.0, (dist - 100) / 180));

      // Multi-frequency procedural alien dunes and rocky ridges
      const d1 = Math.sin(x * 0.012) * Math.cos(z * 0.012) * 22;
      const d2 = Math.sin(x * 0.035 + 1.2) * Math.sin(z * 0.031) * 8;
      const d3 = Math.cos(x * 0.08) * Math.sin(z * 0.075) * 2.5;

      const height = (d1 + d2 + d3) * flattenFactor;
      pos.setY(i, height);
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x221310,
      roughness: 0.95,
      metalness: 0.12,
      flatShading: true
    });

    const terrainMesh = new THREE.Mesh(geometry, material);
    terrainMesh.position.set(0, -1, 0);
    terrainMesh.receiveShadow = true;
    this.scene.add(terrainMesh);
  }

  createMonolithForest() {
    const count = 40;
    const monolithGeom = new THREE.BoxGeometry(4, 28, 4);
    const monolithMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
      metalness: 0.3
    });

    const monolithColors = [
      new THREE.Color(0x160c0c),
      new THREE.Color(0x1c1010),
      new THREE.Color(0x221312),
      new THREE.Color(0x130a0a)
    ];

    const instancedMesh = new THREE.InstancedMesh(monolithGeom, monolithMat, count);
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = 140 + Math.random() * 260;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const scaleY = 0.6 + Math.random() * 0.9;

      dummy.position.set(x, 14 * scaleY, z);
      dummy.scale.set(0.7 + Math.random() * 0.6, scaleY, 0.7 + Math.random() * 0.6);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.rotation.z = (Math.random() - 0.5) * 0.15;
      dummy.updateMatrix();

      instancedMesh.setMatrixAt(i, dummy.matrix);
      instancedMesh.setColorAt(i, monolithColors[i % monolithColors.length]);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
    this.scene.add(instancedMesh);
  }

  createDehydratedFigures() {
    // Stacked dehydrated human rolls (干皮卷垛)
    const count = 120;
    const figureGeom = new THREE.CylinderGeometry(0.7, 0.7, 4.2, 6);
    figureGeom.rotateZ(Math.PI / 2);

    const figureMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.05
    });

    const rollColors = [
      new THREE.Color(0x3d271d), // dark desiccated skin
      new THREE.Color(0x4a3328), // sun-baked ochre
      new THREE.Color(0x2d1a12), // charred dark leather
      new THREE.Color(0x563e32)  // pale weathered dry roll
    ];

    const instancedMesh = new THREE.InstancedMesh(figureGeom, figureMat, count);
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      // Cluster near pyramid corners and bases
      const side = i % 4;
      const offset = (Math.random() - 0.5) * 60;
      let x = 0, z = 0;

      if (side === 0) { x = 80 + Math.random() * 25; z = offset; }
      else if (side === 1) { x = -80 - Math.random() * 25; z = offset; }
      else if (side === 2) { z = 80 + Math.random() * 25; x = offset; }
      else { z = -80 - Math.random() * 25; x = offset; }

      const y = 0.5 + Math.random() * 1.5;
      dummy.position.set(x, y, z);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.scale.set(0.8 + Math.random() * 0.4, 1, 0.8 + Math.random() * 0.4);
      dummy.updateMatrix();

      instancedMesh.setMatrixAt(i, dummy.matrix);
      instancedMesh.setColorAt(i, rollColors[i % rollColors.length]);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
    this.scene.add(instancedMesh);
  }

  createRisingEmbers() {
    const count = 2800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const color1 = new THREE.Color(0xf59e0b); // Gold
    const color2 = new THREE.Color(0xef4444); // Scarlet
    const color3 = new THREE.Color(0xffedd5); // Incandescent white

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const x = (Math.random() - 0.5) * 800;
      const y = Math.random() * 260;
      const z = (Math.random() - 0.5) * 800;

      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;

      const pick = Math.random();
      const c = pick < 0.6 ? color1 : (pick < 0.85 ? color2 : color3);
      colors[idx] = c.r;
      colors[idx + 1] = c.g;
      colors[idx + 2] = c.b;

      this.emberData.push({
        baseX: x,
        baseZ: z,
        speedY: 6 + Math.random() * 14,
        driftFreq: 0.4 + Math.random() * 1.2,
        driftAmp: 2 + Math.random() * 5
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Create soft circular radial alpha texture for realistic embers
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.35, 'rgba(255, 200, 100, 0.8)');
    grad.addColorStop(0.7, 'rgba(230, 80, 20, 0.3)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const particleTex = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 1.8,
      map: particleTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.embers = new THREE.Points(geometry, material);
    this.scene.add(this.embers);
  }

  update(delta) {
    this.time += delta;

    if (this.embers) {
      const pos = this.embers.geometry.attributes.position;
      for (let i = 0; i < this.emberData.length; i++) {
        const idx = i * 3;
        const d = this.emberData[i];

        let y = pos.getY(i) + d.speedY * delta;
        if (y > 280) {
          y = 0;
        }
        pos.setY(i, y);

        // Natural swirling convection around base coordinate
        const offsetX = Math.sin(this.time * d.driftFreq + i) * d.driftAmp * 3.5;
        const offsetZ = Math.cos(this.time * d.driftFreq * 0.8 + i) * d.driftAmp * 3.5;
        pos.setX(i, d.baseX + offsetX);
        pos.setZ(i, d.baseZ + offsetZ);
      }
      pos.needsUpdate = true;
    }
  }
}

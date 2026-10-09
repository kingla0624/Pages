import * as THREE from 'three';
import { getChapterProgress, smoothstep } from '../core/Timeline.js';

/** A repeatable, connected filament network with several clusters and large voids. */
export class Scene05_CosmicWeb {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Scene05_CosmicWeb';
    this.particleCount = 45000;
    this.renderSize = new THREE.Vector2();
    this.focusRotation = new THREE.Euler();
    this.focusQuaternion = new THREE.Quaternion();
    this.focusViewPosition = new THREE.Vector3();
    this.initFilamentParticles();
  }

  initFilamentParticles() {
    // The same universe on replay, seek and reload, independent of other scenes.
    let seed = 0x5c05c1c;
    const random = () => {
      seed = (seed + 0x6d2b79f5) >>> 0;
      let value = Math.imul(seed ^ (seed >>> 15), seed | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    const gaussian = () => Math.sqrt(-2 * Math.log(Math.max(random(), 1e-7))) * Math.cos(2 * Math.PI * random());
    // Finite, tilted volumes leave room for fibres in front of and behind a void.
    const voids = [
      { center: new THREE.Vector3(-3.8, 1.5, 0.4), axes: new THREE.Vector3(2.15, 1.8, 2.7), rotation: new THREE.Euler(0.18, 0.32, -0.22) },
      { center: new THREE.Vector3(4.1, -2.2, -0.7), axes: new THREE.Vector3(2.2, 1.9, 2.5), rotation: new THREE.Euler(-0.24, -0.28, 0.3) }
    ];
    for (const volume of voids) {
      volume.inverseRotation = new THREE.Quaternion().setFromEuler(volume.rotation).invert();
      volume.worldRotation = volume.inverseRotation.clone().invert();
    }
    this.voids = voids;
    const voidLocal = new THREE.Vector3();
    // Smooth angular perturbations soften the outline without a hollow XY tube.
    const voidClearance = (point, volume) => {
      voidLocal.copy(point).sub(volume.center).applyQuaternion(volume.inverseRotation).divide(volume.axes);
      const radius = voidLocal.length();
      if (radius < 1e-7) return -Math.min(volume.axes.x, volume.axes.y, volume.axes.z);
      voidLocal.divideScalar(radius);
      const { x, y, z } = voidLocal;
      const boundary = 1 + 0.10 * (x * x * x - 3 * x * y * y) + 0.07 * (2 * z * z - 1) * y;
      return (radius - boundary) * Math.min(volume.axes.x, volume.axes.y, volume.axes.z);
    };
    const isOutsideVoids = (point, margin = 0) => voids.every(volume => voidClearance(point, volume) >= margin);
    const nodes = [new THREE.Vector3()];
    for (let attempt = 0; nodes.length < 36 && attempt < 6000; attempt++) {
      const node = new THREE.Vector3((random() - 0.5) * 21, (random() - 0.5) * 13.5, (random() - 0.5) * 9);
      if (node.x * node.x / 116 + node.y * node.y / 48 > 1) continue;
      if (!isOutsideVoids(node, 0.45)) continue;
      if (nodes.some(n => (n.x - node.x) ** 2 + (n.y - node.y) ** 2 + ((n.z - node.z) * 0.45) ** 2 < 5.8)) continue;
      nodes.push(node);
    }

    const edges = [];
    const edgeKeys = new Set();
    const degree = new Uint8Array(nodes.length);
    const addEdge = (a, b) => {
      const key = Math.min(a, b) + ':' + Math.max(a, b);
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      degree[a]++;
      degree[b]++;
      edges.push({ a, b });
    };
    // A spanning tree guarantees connectivity; short extra edges bound large voids.
    const connected = new Set([0]);
    while (connected.size < nodes.length) {
      let bestA = 0, bestB = 0, bestDistance = Infinity;
      for (const a of connected) {
        for (let b = 0; b < nodes.length; b++) {
          if (connected.has(b)) continue;
          const distance = nodes[a].distanceToSquared(nodes[b]);
          if (distance < bestDistance) { bestA = a; bestB = b; bestDistance = distance; }
        }
      }
      addEdge(bestA, bestB);
      connected.add(bestB);
    }
    for (let a = 0; a < nodes.length; a++) {
      const neighbours = nodes.map((n, b) => ({ b, distance: n.distanceToSquared(nodes[a]) }))
        .filter(n => n.b !== a && n.distance < 40).sort((x, y) => x.distance - y.distance);
      for (const neighbour of neighbours.slice(0, 2)) {
        if (degree[a] < 4 && degree[neighbour.b] < 4) addEdge(a, neighbour.b);
      }
    }
    const curvePoint = (edge, t, out) => {
      const inverse = 1 - t;
      return out.copy(nodes[edge.a]).multiplyScalar(inverse * inverse)
        .addScaledVector(edge.control, 2 * inverse * t).addScaledVector(nodes[edge.b], t * t);
    };
    const probe = new THREE.Vector3();
    const worstPoint = new THREE.Vector3();
    const outward = new THREE.Vector3();
    for (const edge of edges) {
      const start = nodes[edge.a], end = nodes[edge.b];
      const direction = new THREE.Vector3().subVectors(end, start).normalize();
      const sideways = new THREE.Vector3(-direction.y, direction.x, 0);
      if (sideways.lengthSq() < 0.001) sideways.set(1, 0, 0);
      sideways.normalize().multiplyScalar((random() - 0.5) * 2.3);
      edge.control = start.clone().lerp(end, 0.5).add(sideways);
      edge.control.z += (random() - 0.5) * 1.3;
      edge.width = 0.12 + random() * 0.14;
      edge.densityPhase = random() * Math.PI * 2;
      // Move the curve itself, before sampling, so a void never collects a ring
      // of particles projected onto its surface. The graph endpoints stay connected.
      for (let iteration = 0; iteration < 28; iteration++) {
        let worstClearance = 0.32, worstT = 0.5, worstVolume;
        for (let sample = 1; sample < 32; sample++) {
          const t = sample / 32;
          curvePoint(edge, t, probe);
          for (const volume of voids) {
            const clearance = voidClearance(probe, volume);
            if (clearance < worstClearance) {
              worstClearance = clearance;
              worstT = t;
              worstVolume = volume;
              worstPoint.copy(probe);
            }
          }
        }
        if (!worstVolume) break;
        outward.copy(worstPoint).sub(worstVolume.center).applyQuaternion(worstVolume.inverseRotation);
        outward.set(outward.x / (worstVolume.axes.x ** 2), outward.y / (worstVolume.axes.y ** 2), outward.z / (worstVolume.axes.z ** 2));
        outward.applyQuaternion(worstVolume.worldRotation).normalize();
        if (outward.lengthSq() < 0.001) outward.copy(sideways).normalize();
        const influence = Math.max(2 * worstT * (1 - worstT), 0.10);
        edge.control.addScaledVector(outward, Math.min((0.34 - worstClearance) / influence, 1.25));
      }
      // Weight edges and place galaxies by arc length rather than Bezier t.
      edge.arcLengths = new Float32Array(65);
      edge.length = 0;
      curvePoint(edge, 0, worstPoint);
      for (let sample = 1; sample <= 64; sample++) {
        curvePoint(edge, sample / 64, probe);
        edge.length += probe.distanceTo(worstPoint);
        edge.arcLengths[sample] = edge.length;
        worstPoint.copy(probe);
      }
    }
    this.networkNodes = nodes;
    this.networkEdges = edges;

    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);
    const clusterCount = 15000;
    const totalLength = edges.reduce((sum, edge) => sum + edge.length, 0);
    const point = new THREE.Vector3();
    const centerline = new THREE.Vector3();
    let closestFocusDistance = Infinity;
    for (let i = 0; i < this.particleCount; i++) {
      let brightness;
      if (i < clusterCount) {
        const node = nodes[i % nodes.length];
        // A dense nucleus and extended halo; the central cluster gets an ordinary share.
        const radius = random() < 0.35 ? 0.18 : 0.58;
        for (let attempt = 0; attempt < 8; attempt++) {
          point.set(node.x + gaussian() * radius, node.y + gaussian() * radius, node.z + gaussian() * radius);
          if (isOutsideVoids(point)) break;
          if (attempt === 7) point.copy(node);
        }
        brightness = 0.85 + random() * 0.60;
      } else {
        let choice = random() * totalLength;
        let edge = edges[edges.length - 1];
        for (const candidate of edges) {
          choice -= candidate.length;
          if (choice <= 0) { edge = candidate; break; }
        }
        const distance = random() * edge.length;
        let low = 0, high = 64;
        while (high - low > 1) {
          const middle = (low + high) >> 1;
          if (edge.arcLengths[middle] < distance) low = middle;
          else high = middle;
        }
        const fraction = (distance - edge.arcLengths[low]) / Math.max(edge.arcLengths[high] - edge.arcLengths[low], 1e-7);
        const t = (low + fraction) / 64;
        curvePoint(edge, t, centerline);
        // A diffuse envelope surrounds a denser spine, with no uniform tube wall.
        const width = edge.width * (0.65 + 0.55 * Math.sin(t * Math.PI))
          * (random() < 0.28 ? 1.9 : 0.75);
        for (let attempt = 0; attempt < 8; attempt++) {
          point.set(centerline.x + gaussian() * width, centerline.y + gaussian() * width, centerline.z + gaussian() * width);
          if (isOutsideVoids(point)) break;
          if (attempt === 7) point.copy(centerline);
        }
        brightness = (0.34 + random() * 0.34)
          * (0.72 + 0.28 * Math.sin(t * Math.PI * 5 + edge.densityPhase));
      }
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
      const warmth = i < clusterCount ? 0.10 + random() * 0.12 : random() * 0.08;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness * (0.94 - warmth);
      colors[i * 3 + 2] = brightness * (0.86 - warmth);
      sizes[i] = 0.65 + random() * 0.85;
      if (i < clusterCount && i % nodes.length === 0 && point.lengthSq() < closestFocusDistance) {
        closestFocusDistance = point.lengthSq();
        this.focusParticleIndex = i;
      }
    }
    this.focusLocalPosition = new THREE.Vector3().fromArray(positions, this.focusParticleIndex * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.computeBoundingSphere();
    this.pointsMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uOpacity: { value: 1 }, uPointScale: { value: 1 },
        uFocusDepth: { value: 15 }, uFocusBlend: { value: 0 }
      },
      vertexShader: `
        attribute vec3 color;
        attribute float size;
        varying vec3 vColor;
        varying float vDepthAlpha;
        uniform float uTime;
        uniform float uPointScale;
        uniform float uFocusDepth;
        uniform float uFocusBlend;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float twinkle = 0.94 + 0.06 * sin(position.x * 7.0 + position.y * 5.0 + uTime * 0.7);
          float projectionScale = projectionMatrix[1][1] / 1.9209821;
          float depth = max(-mvPosition.z, 0.8);
          float softness = uFocusBlend * smoothstep(0.6, 4.8, abs(depth - uFocusDepth));
          float spread = 1.0 + 1.8 * softness;
          float referenceSize = clamp(size * twinkle * 28.0 * projectionScale / depth, 1.0, 4.0);
          gl_PointSize = referenceSize * spread * uPointScale;
          // Wider out-of-focus sprites conserve light rather than brightening.
          vDepthAlpha = (0.58 + 0.42 / (1.0 + depth * 0.035)) / (spread * spread);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec3 vColor;
        varying float vDepthAlpha;
        void main() {
          float distance = length(gl_PointCoord - vec2(0.5));
          if (distance > 0.5) discard;
          float alpha = exp(-distance * distance * 12.0)
            * (1.0 - smoothstep(0.34, 0.5, distance));
          gl_FragColor = vec4(vColor, alpha * uOpacity * vDepthAlpha * 0.80);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.points = new THREE.Points(geometry, this.pointsMat);
    this.points.onBeforeRender = (renderer, scene, camera) => {
      this.focusViewPosition.copy(this.focusLocalPosition).applyMatrix4(this.group.matrixWorld)
        .applyMatrix4(camera.matrixWorldInverse);
      const depth = -this.focusViewPosition.z;
      this.pointsMat.uniforms.uFocusDepth.value = depth;
      this.galaxyMat.uniforms.uFocusDepth.value = depth;
    };
    this.group.add(this.points);
    this.initFocusGalaxy(random, gaussian);
  }

  initFocusGalaxy(random, gaussian) {
    // Resolve a warm, irregular stellar nucleus rather than a prescribed arm pattern.
    const count = 1600;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const radius = i < 200 ? 0.085 : 0.19 + random() * 0.22;
      const x = gaussian() * radius;
      const y = gaussian() * radius;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y * 0.85 + Math.sin(x * 5) * 0.045;
      positions[i * 3 + 2] = gaussian() * radius * 0.55;
      const brightness = 0.60 + random() * 0.45;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness * (0.58 + random() * 0.19);
      colors[i * 3 + 2] = brightness * (0.25 + random() * 0.18);
      sizes[i] = 0.7 + random() * 0.9;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.computeBoundingSphere();
    this.galaxyMat = this.pointsMat.clone();
    this.galaxyMat.uniforms.uOpacity.value = 0;
    this.galaxyDisc = new THREE.Points(geometry, this.galaxyMat);
    this.galaxyDisc.name = 'FocusedGalaxyNucleus';
    this.galaxyDisc.position.copy(this.focusLocalPosition);
    this.galaxyDisc.visible = false;
    this.galaxyDisc.onBeforeRender = this.points.onBeforeRender;
    this.group.add(this.galaxyDisc);

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 64;
    const context = glowCanvas.getContext('2d');
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 190, 100, 0.65)');
    gradient.addColorStop(0.28, 'rgba(255, 145, 65, 0.35)');
    gradient.addColorStop(1, 'rgba(255, 115, 45, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    glowTexture.colorSpace = THREE.SRGBColorSpace;
    this.focusGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0
    }));
    this.focusGlow.position.copy(this.focusLocalPosition);
    this.focusGlow.scale.set(2.8, 2.8, 1);
    this.focusGlow.visible = false;
    this.group.add(this.focusGlow);
  }

  beforeRender(renderer, target) {
    // gl_PointSize is measured in physical pixels, including capped offscreen RTs.
    const height = target ? target.height : renderer.getDrawingBufferSize(this.renderSize).y;
    const pointScale = height / 720;
    this.pointsMat.uniforms.uPointScale.value = pointScale;
    this.galaxyMat.uniforms.uPointScale.value = pointScale;
  }

  getFocusTarget(time, outVector) {
    const localTime = getChapterProgress(5, time) * 10;
    this.focusRotation.set(Math.sin(localTime * 0.12) * 0.035, localTime * 0.022, 0);
    this.focusQuaternion.setFromEuler(this.focusRotation);
    return outVector.copy(this.focusLocalPosition).multiply(this.group.scale)
      .applyQuaternion(this.focusQuaternion).add(this.group.position);
  }

  update(time, opacity) {
    const progress = getChapterProgress(5, time);
    const localTime = progress * 10;
    this.pointsMat.uniforms.uTime.value = localTime;
    const focusBlend = smoothstep(0.70, 0.96, progress);
    this.pointsMat.uniforms.uFocusBlend.value = focusBlend;
    // Resolve the selected galaxy from its surrounding large-scale structure.
    this.pointsMat.uniforms.uOpacity.value = opacity * (1 - 0.82 * smoothstep(0.8, 0.965, progress));
    this.group.rotation.y = localTime * 0.022;
    this.group.rotation.x = Math.sin(localTime * 0.12) * 0.035;
    const galaxyOpacity = opacity * smoothstep(0.76, 0.96, progress);
    this.galaxyMat.uniforms.uTime.value = localTime;
    this.galaxyMat.uniforms.uOpacity.value = galaxyOpacity;
    this.galaxyMat.uniforms.uFocusBlend.value = focusBlend;
    this.galaxyDisc.rotation.z = localTime * 0.075;
    this.galaxyDisc.visible = galaxyOpacity > 0.001;
    this.focusGlow.material.opacity = galaxyOpacity * 0.20;
    this.focusGlow.visible = galaxyOpacity > 0.001;
    this.group.visible = opacity > 0.001;
  }
}

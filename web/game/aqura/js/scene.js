import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";
import { LIGHTING_THEMES } from "./state.js";

/**
 * Aqura 3D Aquarium World Engine
 * Manages Three.js scene, glass tank, procedural water caustics, bubbles,
 * algae accumulation, volumetric god rays, and smooth camera navigation.
 */

export class AquariumScene {
  constructor(containerElement) {
    this.container = containerElement;
    this.width = containerElement.clientWidth || window.innerWidth;
    this.height = containerElement.clientHeight || window.innerHeight;

    // Vast Open Undersea World boundary volume (Unbounded Ocean Realm)
    this.bounds = {
      minX: -30.0, maxX: 30.0,
      minY: -2.5, maxY: 6.5,
      minZ: -30.0, maxZ: 5.0
    };

    // Camera control state - framed for full-screen edge-to-edge immersion
    this.cameraDistance = 6.8;
    this.cameraAngleY = 0.0;
    this.cameraAngleX = 0.08;
    this.targetCameraAngleY = 0.0;
    this.targetCameraAngleX = 0.08;
    this.targetCameraDistance = 6.8;
    this.isDragging = false;
    this.lastPointer = { x: 0, y: 0 };
    this.followTarget = null; // Target fish to follow

    this.initScene();
    this.initLighting();
    this.initTank();
    this.initWaterSurface();
    this.initBackdrop();
    this.initCaustics();
    this.initBubbleSystem();
    this.initGodRays();
    this.initMarineSnow();
    this.initAlgaeOverlay();
    this.bindEvents();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x034a74);
    this.scene.fog = new THREE.FogExp2(0x034a74, 0.016);

    this.camera = new THREE.PerspectiveCamera(46, this.width / this.height, 0.1, 100);
    this.camera.position.set(0, 0.8, this.cameraDistance);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
    this.raycaster = new THREE.Raycaster();
  }

  initLighting() {
    // Balanced oceanic ambient skylight (true deep-ocean blue skylight)
    this.ambientLight = new THREE.AmbientLight(0x0284c7, 0.55);
    this.scene.add(this.ambientLight);

    // Warm piercing tropical sunlight from above casting realistic soft underwater shadows
    this.sunLight = new THREE.DirectionalLight(0xfff8ee, 1.45);
    this.sunLight.position.set(4.5, 12.0, 3.5);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 1.0;
    this.sunLight.shadow.camera.far = 36.0;
    this.sunLight.shadow.bias = -0.0006;
    this.sunLight.shadow.radius = 2.0;

    // Shadow bounds covering entire reef interaction zone
    const d = 15;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    // Soft neutral oceanic daylight fill
    this.fillLight = new THREE.PointLight(0x38bdf8, 0.40, 35);
    this.fillLight.position.set(0, 1.2, 3.5);
    this.scene.add(this.fillLight);

    // Seafloor sand reflection bounce light (soft deep marine blue bounce)
    this.bounceLight = new THREE.DirectionalLight(0x0284c7, 0.22);
    this.bounceLight.position.set(0, -4.5, 1.0);
    this.scene.add(this.bounceLight);
  }

  initTank() {
    // 1. High-Detail PBR Coral Sand Texture
    const sandCanvas = document.createElement("canvas");
    sandCanvas.width = 1024;
    sandCanvas.height = 1024;
    const sCtx = sandCanvas.getContext("2d");

    // Warm organic marine coral sand base
    const baseGrad = sCtx.createLinearGradient(0, 0, 1024, 1024);
    baseGrad.addColorStop(0.0, "#c4ad82");
    baseGrad.addColorStop(0.5, "#bfa679");
    baseGrad.addColorStop(1.0, "#b89e70");
    sCtx.fillStyle = baseGrad;
    sCtx.fillRect(0, 0, 1024, 1024);

    // Multi-octave natural sand grain sediment & micro-contrast
    for (let i = 0; i < 45000; i++) {
      const gx = Math.random() * 1024;
      const gy = Math.random() * 1024;
      const r = Math.random();
      if (r > 0.70) {
        sCtx.fillStyle = "rgba(255, 255, 255, 0.28)"; // sparkling calcite crystal
      } else if (r > 0.45) {
        sCtx.fillStyle = "rgba(105, 80, 48, 0.22)"; // darker mineral grain
      } else if (r > 0.25) {
        sCtx.fillStyle = "rgba(180, 145, 95, 0.20)"; // medium amber silt
      } else {
        sCtx.fillStyle = "rgba(215, 120, 90, 0.15)"; // crushed coral pink speck
      }
      sCtx.fillRect(gx, gy, 1.5, 1.5);
    }
    const sandTex = new THREE.CanvasTexture(sandCanvas);
    sandTex.wrapS = THREE.RepeatWrapping;
    sandTex.wrapT = THREE.RepeatWrapping;
    sandTex.repeat.set(18, 14);

    // High-Resolution Tidal Current Ripple Bump Map
    const bumpCanvas = document.createElement("canvas");
    bumpCanvas.width = 512;
    bumpCanvas.height = 512;
    const bCtx = bumpCanvas.getContext("2d");
    bCtx.fillStyle = "#808080";
    bCtx.fillRect(0, 0, 512, 512);

    // Harmonic tidal ripples
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 512; x += 2) {
        const u = x / 512;
        const v = y / 512;
        const wave = Math.sin(u * Math.PI * 12 + Math.cos(v * Math.PI * 4) * 0.8) * 0.5 + 0.5;
        const val = Math.floor(120 + wave * 35);
        bCtx.fillStyle = `rgb(${val},${val},${val})`;
        bCtx.fillRect(x, y, 2, 1);
      }
    }

    // Granular micro-bumps
    for (let i = 0; i < 28000; i++) {
      const bx = Math.random() * 512;
      const by = Math.random() * 512;
      bCtx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)";
      bCtx.fillRect(bx, by, 1.5, 1.5);
    }
    const bumpTex = new THREE.CanvasTexture(bumpCanvas);
    bumpTex.wrapS = THREE.RepeatWrapping;
    bumpTex.wrapT = THREE.RepeatWrapping;
    bumpTex.repeat.set(24, 18);

    // Expansive 120m x 100m Continental Shelf Seabed with Abyssal Drop-off
    const sandGeom = new THREE.PlaneGeometry(120.0, 100.0, 120, 100);
    sandGeom.rotateX(-Math.PI / 2);

    // Multi-octave undulating sand dunes with tidal current ripple marks and deep-sea shelf drop
    const pos = sandGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const trenchSlope = z < -8 ? (z + 8) * 0.055 : 0;
      const dune = Math.sin(x * 0.16) * 0.32 
                 + Math.cos(z * 0.20) * 0.25 
                 + Math.sin((x * 0.5 + z) * 0.22) * 0.14
                 + Math.sin(x * 1.8 + z * 0.7) * 0.038
                 + trenchSlope;
      pos.setY(i, dune);
    }
    sandGeom.computeVertexNormals();

    this.sandMaterial = new THREE.MeshStandardMaterial({
      map: sandTex,
      bumpMap: bumpTex,
      bumpScale: 0.045,
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.02
    });

    this.sandMesh = new THREE.Mesh(sandGeom, this.sandMaterial);
    this.sandMesh.position.set(0, this.bounds.minY, -20.0);
    this.sandMesh.receiveShadow = true;
    this.scene.add(this.sandMesh);
  }

  initWaterSurface() {
    // Open ocean has no ceiling plane; infinite volumetric depth is created by the 360° sky dome & deep fog
  }

  initCaustics() {
    // Dual-frequency caustics canvas with chromatic dispersion
    this.causticsCanvas = document.createElement("canvas");
    this.causticsCanvas.width = 256;
    this.causticsCanvas.height = 256;
    this.causticsCtx = this.causticsCanvas.getContext("2d");

    this.causticsTexture = new THREE.CanvasTexture(this.causticsCanvas);
    this.causticsTexture.wrapS = THREE.RepeatWrapping;
    this.causticsTexture.wrapT = THREE.RepeatWrapping;
    this.causticsTexture.repeat.set(8, 6);

    this.causticsImageData = this.causticsCtx.createImageData(256, 256);

    // Apply directly to sand material with natural underwater irradiance
    this.sandMaterial.emissiveMap = this.causticsTexture;
    this.sandMaterial.emissive = new THREE.Color(0x0284c7);
    this.sandMaterial.emissiveIntensity = 0.22;
  }

  updateCaustics(time) {
    const ctx = this.causticsCtx;
    const w = 256;
    const h = 256;
    const imgData = this.causticsImageData;
    const data = imgData.data;

    const t = time * 1.5;

    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const u = x / w;
        const v = y / h;

        // Guaranteed mathematically periodic at u=0/1 and v=0/1 (100% seamless tileable)
        const a1 = u * Math.PI * 4 + t * 0.7;
        const a2 = v * Math.PI * 4 + t * 0.5;
        const a3 = (u + v) * Math.PI * 4 + t * 0.6;
        const a4 = (u - v + 1.0) * Math.PI * 4 - t * 0.4;

        const v1 = Math.sin(a1 + Math.cos(a2));
        const v2 = Math.cos(a2 + Math.sin(a1));
        const v3 = Math.sin(a3) * 0.5 + Math.cos(a4) * 0.5;

        // Core intensity
        const base = (v1 + v2 + v3 + 3) / 6;
        const bright = Math.pow(base, 3.8);

        const rVal = Math.min(255, Math.floor(bright * 180));
        const gVal = Math.min(255, Math.floor(bright * 240));
        const bVal = Math.min(255, Math.floor(bright * 255));

        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const pixelIdx = ((y + dy) * w + (x + dx)) * 4;
            data[pixelIdx] = rVal;
            data[pixelIdx + 1] = gVal;
            data[pixelIdx + 2] = bVal;
            data[pixelIdx + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    this.causticsTexture.needsUpdate = true;
  }

  initBubbleSystem() {
    this.bubbles = [];
    this.bubblePool = [];
    this.bubbleGeom = new THREE.SphereGeometry(1, 8, 8);
    this.bubbleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
      metalness: 0.2
    });
  }

  spawnBubble(x, y, z, radius = 0.05) {
    let mesh;
    if (this.bubblePool.length > 0) {
      mesh = this.bubblePool.pop();
      mesh.visible = true;
    } else {
      mesh = new THREE.Mesh(this.bubbleGeom, this.bubbleMat);
      this.scene.add(mesh);
    }

    mesh.scale.setScalar(radius);
    mesh.position.set(x, y, z);

    this.bubbles.push({
      mesh,
      x, y, z,
      radius,
      vy: 1.2 + Math.random() * 0.8,
      wobbleSpeed: 4.0 + Math.random() * 3.0,
      phase: Math.random() * Math.PI * 2
    });
  }

  spawnBubbleBurst(centerX = 0, centerY = -2, centerZ = -4, count = 25) {
    for (let i = 0; i < count; i++) {
      const bx = centerX + (Math.random() - 0.5) * 8.0;
      const by = centerY + Math.random() * 2.0;
      const bz = centerZ + (Math.random() - 0.5) * 8.0;
      const r = 0.03 + Math.random() * 0.06;
      this.spawnBubble(bx, by, bz, r);
    }
  }

  updateBubbles(delta, time) {
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.y += b.vy * delta;
      b.x += Math.sin(time * b.wobbleSpeed + b.phase) * 0.015;
      b.z += Math.cos(time * b.wobbleSpeed + b.phase) * 0.015;

      b.mesh.position.set(b.x, b.y, b.z);

      // Pop when reaching water surface
      if (b.y >= this.bounds.maxY - 0.1) {
        b.mesh.visible = false;
        this.bubblePool.push(b.mesh);
        this.bubbles.splice(i, 1);
      }
    }
  }

  initBackdrop() {
    // 360° Seamless Infinite Ocean Skydome / Atmosphere (R = 75m, H = 85m)
    // Completely surrounds the world with zero flat edges or tank box corners
    const domeGeom = new THREE.CylinderGeometry(75.0, 75.0, 85.0, 48, 1, true);
    domeGeom.scale(-1, 1, 1); // Render inside faces

    this.backCanvas = document.createElement("canvas");
    this.backCanvas.width = 128;
    this.backCanvas.height = 512;
    this.backCtx = this.backCanvas.getContext("2d");
    this.backTexture = new THREE.CanvasTexture(this.backCanvas);

    this.backDropMat = new THREE.MeshBasicMaterial({
      map: this.backTexture,
      depthWrite: false,
      side: THREE.BackSide,
      fog: false
    });
    this.backDropMesh = new THREE.Mesh(domeGeom, this.backDropMat);
    this.backDropMesh.position.set(0, 10.0, -10.0);
    this.scene.add(this.backDropMesh);

    this.updateBackdropGradient(["#38bdf8", "#0284c7", "#034a74", "#011936"]);
  }

  updateBackdropGradient(colorStops) {
    if (!this.backCtx) return;
    const ctx = this.backCtx;
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, colorStops[0] || "#38bdf8");
    grad.addColorStop(0.30, colorStops[1] || "#0284c7");
    grad.addColorStop(0.62, colorStops[2] || "#034a74");
    grad.addColorStop(1.0, colorStops[3] || colorStops[2] || "#011936");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 512);
    this.backTexture.needsUpdate = true;
  }

  initGodRays() {
    this.godRaysGroup = new THREE.Group();

    // Soft feathered sun shaft texture with seamless cosine horizontal falloff
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    const imgData = ctx.createImageData(256, 512);
    const data = imgData.data;

    for (let y = 0; y < 512; y++) {
      const v = y / 512;
      // Fade in softly from surface, peak in upper third, smoothly fade out towards bottom
      const vertFalloff = Math.pow(1 - v, 1.4) * Math.min(1, v * 12);

      for (let x = 0; x < 256; x++) {
        const u = x / 256;
        // Cosine horizontal falloff: zero alpha at edges, peak in center
        const horizFalloff = Math.pow(Math.sin(u * Math.PI), 2.2);

        // Natural sunlight wave streaks
        const streak = 0.88 + 0.12 * Math.sin(u * 14 + v * 3) * Math.sin(u * 7 - v * 2);
        const alpha = Math.floor(255 * horizFalloff * vertFalloff * streak);

        const idx = (y * 256 + x) * 4;
        data[idx] = 232;     // Warm soft sunlight
        data[idx + 1] = 248; // Cyan-white tint
        data[idx + 2] = 255;
        data[idx + 3] = alpha;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const rayTexture = new THREE.CanvasTexture(canvas);

    // Staggered light beams with gentle trapezoidal spreading across open ocean
    const beamCount = 8;
    this.godRayMeshes = [];

    for (let i = 0; i < beamCount; i++) {
      const widthTop = 2.0 + (i % 2) * 0.6;
      const widthBottom = 6.0 + (i % 3) * 0.8;
      const height = 18.0;

      // Custom tapered quad geometry
      const geom = new THREE.BufferGeometry();
      const hwTop = widthTop / 2;
      const hwBot = widthBottom / 2;
      const vertices = new Float32Array([
        -hwTop, 0, 0,
        hwTop, 0, 0,
        -hwBot, -height, 0,

        hwTop, 0, 0,
        hwBot, -height, 0,
        -hwBot, -height, 0
      ]);
      const uvs = new Float32Array([
        0, 0,
        1, 0,
        0, 1,

        1, 0,
        1, 1,
        0, 1
      ]);
      geom.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
      geom.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

      // Delicate, ethereal opacity (never obscures or discolors fish behind it)
      const baseOpacity = 0.10 + (i % 3) * 0.03;
      const beamMat = new THREE.MeshBasicMaterial({
        map: rayTexture,
        color: 0xffffff,
        transparent: true,
        opacity: baseOpacity,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false
      });

      const beam = new THREE.Mesh(geom, beamMat);
      const posX = -16.0 + i * 4.4;
      const posZ = -12.0 + (i % 3) * 4.0;
      beam.position.set(posX, 8.5, posZ);

      // Angled naturally along downward sunlight vector
      const baseRotZ = -0.22 + (i % 2) * 0.04;
      beam.rotation.z = baseRotZ;
      beam.rotation.y = (i % 2 === 0 ? 0.1 : -0.1);

      this.godRaysGroup.add(beam);
      this.godRayMeshes.push({
        mesh: beam,
        mat: beamMat,
        baseOpacity,
        baseRotZ,
        phase: i * 0.95
      });
    }

    this.scene.add(this.godRaysGroup);
  }

  initMarineSnow() {
    // 750+ floating marine snow plankton particulates catching the light across open ocean
    const count = 750;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count * 3);

    // Soft radial glint particle texture
    const pCanvas = document.createElement("canvas");
    pCanvas.width = 64;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext("2d");
    const pGrad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    pGrad.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
    pGrad.addColorStop(0.25, "rgba(200, 245, 255, 0.8)");
    pGrad.addColorStop(0.65, "rgba(120, 220, 255, 0.22)");
    pGrad.addColorStop(1.0, "rgba(0, 0, 0, 0)");
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 64, 64);
    const particleTex = new THREE.CanvasTexture(pCanvas);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = this.bounds.minY + Math.random() * (this.bounds.maxY - this.bounds.minY);
      positions[i * 3 + 2] = -28.0 + Math.random() * 34.0;

      speeds[i * 3] = (Math.random() - 0.5) * 0.12;
      speeds[i * 3 + 1] = 0.035 + Math.random() * 0.07; // subtle buoyant upward drift
      speeds[i * 3 + 2] = (Math.random() - 0.5) * 0.12;
    }

    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    this.marineSnowMat = new THREE.PointsMaterial({
      map: particleTex,
      size: 0.16,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xd0f4ff
    });

    this.marineSnow = new THREE.Points(geom, this.marineSnowMat);
    this.marineSnowSpeeds = speeds;
    this.scene.add(this.marineSnow);
  }

  updateMarineSnow(delta, time) {
    if (!this.marineSnow) return;
    const pos = this.marineSnow.geometry.attributes.position;
    const arr = pos.array;
    const speeds = this.marineSnowSpeeds;
    const count = arr.length / 3;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      arr[idx] += (speeds[idx] + Math.sin(time * 0.6 + i * 0.1) * 0.035) * delta;
      arr[idx + 1] += speeds[idx + 1] * delta;
      arr[idx + 2] += (speeds[idx + 2] + Math.cos(time * 0.5 + i * 0.1) * 0.035) * delta;

      // Wrap around bounds seamlessly
      if (arr[idx + 1] > this.bounds.maxY) {
        arr[idx + 1] = this.bounds.minY;
        arr[idx] = (Math.random() - 0.5) * 60;
        arr[idx + 2] = -28.0 + Math.random() * 34.0;
      }
      if (arr[idx] < -30) arr[idx] = 30;
      if (arr[idx] > 30) arr[idx] = -30;
    }
    pos.needsUpdate = true;
  }

  initAlgaeOverlay() {
    // Open ocean has no aquarium glass grime attached to the camera.
    // Water turbidity is handled via delicate optical fog density modulation.
  }

  setCleanliness(cleanliness) {
    // 100 = crystal clear oceanic visibility (fog density 0.016)
    // 0 = slightly plankton-rich turbid ocean water (fog density 0.024)
    if (this.scene && this.scene.fog) {
      const purity = Math.max(0, Math.min(100, cleanliness)) / 100;
      this.scene.fog.density = 0.024 - purity * 0.008;
    }
  }

  applyTheme(themeId) {
    const theme = LIGHTING_THEMES[themeId] || LIGHTING_THEMES.tropical;

    let deepColor = 0x034a74;
    let stops = ["#38bdf8", "#0284c7", "#034a74", "#011936"];

    if (themeId === "deepsea") {
      deepColor = 0x02244a;
      stops = ["#0284c7", "#034674", "#02244a", "#010d1e"];
    } else if (themeId === "sunset") {
      deepColor = 0x7c2d12;
      stops = ["#fdba74", "#ea580c", "#7c2d12", "#270802"];
    } else if (themeId === "neon") {
      deepColor = 0x4c1d95;
      stops = ["#f472b6", "#9333ea", "#4c1d95", "#17042b"];
    }

    this.scene.background.setHex(deepColor);
    this.scene.fog.color.setHex(deepColor);
    this.scene.fog.density = theme.fogDensity || 0.016;

    this.ambientLight.color.setHex(theme.ambientColor);
    this.ambientLight.intensity = theme.ambientIntensity;

    this.sunLight.color.setHex(theme.sunColor);
    this.sunLight.intensity = theme.sunIntensity;

    this.sandMaterial.emissiveIntensity = theme.causticsIntensity;

    this.updateBackdropGradient(stops);
  }

  bindEvents() {
    const el = this.renderer.domElement;

    el.addEventListener("pointerdown", (e) => {
      this.isDragging = true;
      this.lastPointer.x = e.clientX;
      this.lastPointer.y = e.clientY;
    });

    window.addEventListener("pointermove", (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastPointer.x;
      const dy = e.clientY - this.lastPointer.y;
      this.lastPointer.x = e.clientX;
      this.lastPointer.y = e.clientY;

      // Orbit rotation with 360-degree panoramic ocean freedom
      this.targetCameraAngleY = THREE.MathUtils.clamp(
        this.targetCameraAngleY - dx * 0.0035,
        -Math.PI * 0.98,
        Math.PI * 0.98
      );
      this.targetCameraAngleX = THREE.MathUtils.clamp(
        this.targetCameraAngleX + dy * 0.003,
        -0.18,
        0.55
      );

      // Any manual orbit releases lock-on camera
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        this.followTarget = null;
      }
    });

    window.addEventListener("pointerup", () => {
      this.isDragging = false;
    });

    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.targetCameraDistance = THREE.MathUtils.clamp(
        this.targetCameraDistance + e.deltaY * 0.004,
        4.2,
        12.0
      );
    }, { passive: false });

    window.addEventListener("resize", () => this.onResize());
  }

  onResize() {
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;
    const aspect = this.width / this.height;
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1.0 ? 58 : 46;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  setFollowTarget(targetMesh, targetFish = null) {
    this.followTarget = targetMesh;
    this.followTargetFish = targetFish;
  }

  getRaycastPoint(clientX, clientY, targetY = 0) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    
    // Intersect plane at targetY
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -targetY);
    const targetPoint = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(plane, targetPoint);
    return hit ? targetPoint : null;
  }

  getRaycastObjects(clientX, clientY, objects) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    return this.raycaster.intersectObjects(objects, true);
  }

  update(delta, time) {
    // 1. Camera interpolation
    this.cameraAngleY = THREE.MathUtils.lerp(this.cameraAngleY, this.targetCameraAngleY, delta * 5);
    this.cameraAngleX = THREE.MathUtils.lerp(this.cameraAngleX, this.targetCameraAngleX, delta * 5);
    this.cameraDistance = THREE.MathUtils.lerp(this.cameraDistance, this.targetCameraDistance, delta * 5);

    let lookTarget = new THREE.Vector3(0, 0.2, 0);

    if (this.followTarget) {
      lookTarget = this.followTarget.position.clone();
      const isManta = this.followTargetFish && this.followTargetFish.isMantaRay;
      const followDist = isManta ? 10.5 : 2.5;
      const followHeight = isManta ? 2.8 : 0.40;

      // Smooth chase camera that smoothly orbits near the target
      const cx = lookTarget.x + Math.sin(this.cameraAngleY) * followDist;
      const cy = lookTarget.y + followHeight + Math.sin(this.cameraAngleX) * (followDist * 0.45);
      const cz = lookTarget.z + Math.cos(this.cameraAngleY) * followDist;

      this.camera.position.lerp(new THREE.Vector3(cx, cy, cz), delta * 4.5);
    } else {
      const cx = Math.sin(this.cameraAngleY) * Math.cos(this.cameraAngleX) * this.cameraDistance;
      const cy = Math.sin(this.cameraAngleX) * this.cameraDistance + 0.4;
      const cz = Math.cos(this.cameraAngleY) * Math.cos(this.cameraAngleX) * this.cameraDistance;

      // Diver Float Cam (multi-frequency neutral buoyancy drift simulating human diver breathing & currents)
      const driftX = Math.sin(time * 0.35) * 0.22 + Math.cos(time * 0.15) * 0.10;
      const driftY = Math.sin(time * 0.48) * 0.12 + Math.sin(time * 0.24) * 0.08;
      const driftZ = Math.cos(time * 0.28) * 0.18;

      this.camera.position.set(cx + driftX, cy + driftY, cz + driftZ);
      lookTarget.add(new THREE.Vector3(driftX * 0.25, driftY * 0.25, 0));
    }

    this.camera.lookAt(lookTarget);

    // 2. Procedural Caustics animation
    this.updateCaustics(time);

    // 3. Bubbles, marine snow & subtle god ray wave modulation
    this.updateBubbles(delta, time);
    this.updateMarineSnow(delta, time);
    if (this.godRayMeshes) {
      this.godRayMeshes.forEach((ray) => {
        ray.mat.opacity = ray.baseOpacity * (0.85 + 0.15 * Math.sin(time * 0.8 + ray.phase));
        ray.mesh.rotation.z = ray.baseRotZ + Math.sin(time * 0.4 + ray.phase) * 0.018;
      });
    }

    // 4. Render Scene
    this.renderer.render(this.scene, this.camera);
  }
}

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

    // Panoramic Aquarium Environment boundary volume (Full-screen borderless ocean)
    this.bounds = {
      minX: -8.8, maxX: 8.8,
      minY: -2.5, maxY: 3.4,
      minZ: -5.0, maxZ: 2.2
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
    this.initBackdrop();
    this.initCaustics();
    this.initBubbleSystem();
    this.initGodRays();
    this.initAlgaeOverlay();
    this.bindEvents();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x04162a);
    this.scene.fog = new THREE.FogExp2(0x04162a, 0.02);

    this.camera = new THREE.PerspectiveCamera(46, this.width / this.height, 0.1, 100);
    this.camera.position.set(0, 0.8, this.cameraDistance);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);
    this.raycaster = new THREE.Raycaster();
  }

  initLighting() {
    this.ambientLight = new THREE.AmbientLight(0x88ccff, 0.9);
    this.scene.add(this.ambientLight);

    // Main downward sunlight piercing through water
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.6);
    this.sunLight.position.set(3, 8, 3);
    this.scene.add(this.sunLight);

    // Secondary underwater fill lights
    this.fillLight = new THREE.PointLight(0x00e5ff, 1.4, 16);
    this.fillLight.position.set(0, -0.5, 2);
    this.scene.add(this.fillLight);

    // Bottom bounce light
    this.bounceLight = new THREE.DirectionalLight(0x388e3c, 0.4);
    this.bounceLight.position.set(0, -5, 0);
    this.scene.add(this.bounceLight);
  }

  initTank() {
    // 1. Expansive Sandy Seafloor stretching seamlessly across the entire bottom
    const sandCanvas = document.createElement("canvas");
    sandCanvas.width = 256;
    sandCanvas.height = 256;
    const sCtx = sandCanvas.getContext("2d");
    sCtx.fillStyle = "#dfcb9e";
    sCtx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 6000; i++) {
      const gx = Math.random() * 256;
      const gy = Math.random() * 256;
      sCtx.fillStyle = Math.random() > 0.5 ? "rgba(255, 255, 255, 0.18)" : "rgba(135, 105, 65, 0.18)";
      sCtx.fillRect(gx, gy, 1.2, 1.2);
    }
    const sandTex = new THREE.CanvasTexture(sandCanvas);
    sandTex.wrapS = THREE.RepeatWrapping;
    sandTex.wrapT = THREE.RepeatWrapping;
    sandTex.repeat.set(16, 12);

    // Expansive 48m x 32m sandbed
    const sandGeom = new THREE.PlaneGeometry(48.0, 32.0, 72, 48);
    sandGeom.rotateX(-Math.PI / 2);

    // Natural gently undulating sand dunes
    const pos = sandGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dune = Math.sin(x * 0.35) * 0.14 + Math.cos(z * 0.45) * 0.12 + Math.sin((x + z) * 0.25) * 0.08;
      pos.setY(i, dune);
    }
    sandGeom.computeVertexNormals();

    this.sandMaterial = new THREE.MeshStandardMaterial({
      map: sandTex,
      color: 0xffffff,
      roughness: 0.88,
      metalness: 0.04
    });

    this.sandMesh = new THREE.Mesh(sandGeom, this.sandMaterial);
    this.sandMesh.position.y = this.bounds.minY;
    this.scene.add(this.sandMesh);

    // 2. Invisible Front Interactive Screen Plane (for raycasting & glass tap interactions)
    const frontGeom = new THREE.PlaneGeometry(40.0, 24.0);
    this.frontGlass = new THREE.Mesh(
      frontGeom,
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.frontGlass.position.set(0, 0, this.bounds.maxZ);
    this.frontGlass.name = "front_glass";
    this.scene.add(this.frontGlass);
  }

  initCaustics() {
    // High performance procedural caustics canvas projected onto the bottom sand dunes
    this.causticsCanvas = document.createElement("canvas");
    this.causticsCanvas.width = 256;
    this.causticsCanvas.height = 256;
    this.causticsCtx = this.causticsCanvas.getContext("2d");

    this.causticsTexture = new THREE.CanvasTexture(this.causticsCanvas);
    this.causticsTexture.wrapS = THREE.RepeatWrapping;
    this.causticsTexture.wrapT = THREE.RepeatWrapping;
    this.causticsTexture.repeat.set(10, 8);

    // Apply directly to sand material
    this.sandMaterial.emissiveMap = this.causticsTexture;
    this.sandMaterial.emissive = new THREE.Color(0x38bdf8);
    this.sandMaterial.emissiveIntensity = 0.68;
  }

  updateCaustics(time) {
    const ctx = this.causticsCtx;
    const w = 256;
    const h = 256;
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    const t = time * 1.5;

    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const nx = x / 30;
        const ny = y / 30;
        const v1 = Math.sin(nx + t * 0.7 + Math.cos(ny * 0.8 + t * 0.5));
        const v2 = Math.cos(ny * 1.1 - t * 0.8 + Math.sin(nx * 0.9 - t * 0.4));
        const v3 = Math.sin((nx + ny) * 0.85 + t);
        
        let c = Math.pow((v1 + v2 + v3 + 3) / 6, 3.2) * 255;
        c = Math.min(255, Math.max(0, Math.floor(c)));

        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const pixelIdx = ((y + dy) * w + (x + dx)) * 4;
            data[pixelIdx] = c;     // R
            data[pixelIdx + 1] = Math.min(255, Math.floor(c * 1.1)); // G
            data[pixelIdx + 2] = Math.min(255, Math.floor(c * 1.25)); // B
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
    // Panoramic Backlit Ocean Gradient Backdrop
    const backGeom = new THREE.PlaneGeometry(64.0, 36.0);
    this.backCanvas = document.createElement("canvas");
    this.backCanvas.width = 128;
    this.backCanvas.height = 256;
    this.backCtx = this.backCanvas.getContext("2d");
    this.backTexture = new THREE.CanvasTexture(this.backCanvas);

    this.backDropMat = new THREE.MeshBasicMaterial({ map: this.backTexture, depthWrite: false });
    this.backDropMesh = new THREE.Mesh(backGeom, this.backDropMat);
    this.backDropMesh.position.set(0, 1.5, this.bounds.minZ - 5.0);
    this.scene.add(this.backDropMesh);

    this.updateBackdropGradient(["#38bdf8", "#0284c7", "#04162a"]);
  }

  updateBackdropGradient(colorStops) {
    if (!this.backCtx) return;
    const ctx = this.backCtx;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, colorStops[0]);
    grad.addColorStop(0.5, colorStops[1]);
    grad.addColorStop(1.0, colorStops[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 256);
    this.backTexture.needsUpdate = true;
  }

  initGodRays() {
    this.godRaysGroup = new THREE.Group();

    // Create a smooth vertical and radial falloff gradient texture
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, "rgba(255, 255, 255, 0.32)");
    grad.addColorStop(0.25, "rgba(200, 245, 255, 0.18)");
    grad.addColorStop(0.65, "rgba(140, 230, 255, 0.07)");
    grad.addColorStop(1.0, "rgba(80, 200, 255, 0.0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 256);

    const rayTexture = new THREE.CanvasTexture(canvas);

    const beamCount = 6;
    const beamMat = new THREE.MeshBasicMaterial({
      map: rayTexture,
      color: 0x80deea,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    for (let i = 0; i < beamCount; i++) {
      // 32 radial segments for smooth round volumetric beams
      const beamGeom = new THREE.CylinderGeometry(0.22, 2.2, 8.0, 32, 1, true);
      beamGeom.translate(0, -4.0, 0);
      const beam = new THREE.Mesh(beamGeom, beamMat);
      beam.position.set(-7.5 + i * 3.0, this.bounds.maxY + 0.6, -1.2 + (i % 3) * 0.9);
      beam.rotation.z = -0.16 + (i % 2) * 0.05;
      beam.rotation.x = 0.12;
      this.godRaysGroup.add(beam);
    }
    this.scene.add(this.godRaysGroup);
  }

  initAlgaeOverlay() {
    // Translucent green tint layer attached directly to camera to represent algae buildup across full viewport
    const geom = new THREE.PlaneGeometry(10.0, 10.0);
    this.algaeMat = new THREE.MeshBasicMaterial({
      color: 0x1b5e20,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      depthTest: false
    });
    this.algaeMesh = new THREE.Mesh(geom, this.algaeMat);
    this.algaeMesh.position.set(0, 0, -1.0);
    this.algaeMesh.renderOrder = 999;
    this.algaeMesh.raycast = () => {}; // Never intercept raycasting
    this.camera.add(this.algaeMesh);
  }

  setCleanliness(cleanliness) {
    // 100 = 0% opacity (crystal clear), 0 = 38% green algae opacity
    const dirtiness = (100 - cleanliness) / 100;
    this.algaeMat.opacity = dirtiness * 0.38;
  }

  applyTheme(themeId) {
    const theme = LIGHTING_THEMES[themeId] || LIGHTING_THEMES.tropical;

    let deepColor = 0x04162a;
    let stops = ["#38bdf8", "#0284c7", "#04162a"];

    if (themeId === "deepsea") {
      deepColor = 0x010c1c;
      stops = ["#0284c7", "#03284f", "#010c1c"];
    } else if (themeId === "sunset") {
      deepColor = 0x1a0802;
      stops = ["#fb923c", "#ea580c", "#1a0802"];
    } else if (themeId === "neon") {
      deepColor = 0x0c021c;
      stops = ["#c084fc", "#7e22ce", "#0c021c"];
    }

    this.scene.background.setHex(deepColor);
    this.scene.fog.color.setHex(deepColor);
    this.scene.fog.density = 0.02;

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

      // Orbit rotation with comfortable panoramic bounds
      this.targetCameraAngleY = THREE.MathUtils.clamp(
        this.targetCameraAngleY - dx * 0.0035,
        -0.85,
        0.85
      );
      this.targetCameraAngleX = THREE.MathUtils.clamp(
        this.targetCameraAngleX + dy * 0.003,
        -0.12,
        0.42
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
        4.8,
        9.0
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

  setFollowTarget(targetMesh) {
    this.followTarget = targetMesh;
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
    this.cameraAngleY = THREE.MathUtils.lerp(this.cameraAngleY, this.targetCameraAngleY, delta * 6);
    this.cameraAngleX = THREE.MathUtils.lerp(this.cameraAngleX, this.targetCameraAngleX, delta * 6);
    this.cameraDistance = THREE.MathUtils.lerp(this.cameraDistance, this.targetCameraDistance, delta * 6);

    let lookTarget = new THREE.Vector3(0, 0.2, 0);

    if (this.followTarget) {
      lookTarget = this.followTarget.position.clone();
      // Smoothly orbit near the target
      const cx = lookTarget.x + Math.sin(this.cameraAngleY) * 3.6;
      const cy = lookTarget.y + 0.4 + Math.sin(this.cameraAngleX) * 1.6;
      const cz = lookTarget.z + Math.cos(this.cameraAngleY) * 3.6;
      this.camera.position.set(cx, cy, cz);
    } else {
      const cx = Math.sin(this.cameraAngleY) * Math.cos(this.cameraAngleX) * this.cameraDistance;
      const cy = Math.sin(this.cameraAngleX) * this.cameraDistance + 0.4;
      const cz = Math.cos(this.cameraAngleY) * Math.cos(this.cameraAngleX) * this.cameraDistance;
      this.camera.position.set(cx, cy, cz);
    }

    this.camera.lookAt(lookTarget);

    // 2. Procedural Caustics animation
    this.updateCaustics(time);

    // 3. Bubbles & god rays sway
    this.updateBubbles(delta, time);
    this.godRaysGroup.children.forEach((beam, idx) => {
      beam.rotation.z = -0.15 + Math.sin(time * 0.8 + idx) * 0.04;
    });

    // 4. Render Scene
    this.renderer.render(this.scene, this.camera);
  }
}

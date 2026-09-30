import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { TriSolarSystem } from './suns.js';
import { ChaoticPyramid } from './pyramid.js';
import { AlienTerrain } from './terrain.js';
import { ProceduralCosmicAudio } from './audio.js';
import { CelestialRadar } from './radar.js';
import { AtmosphericOpticsShader } from './effects.js';

class ThreeBodyExperience {
  constructor() {
    this.container = document.getElementById('webgl-container');
    this.clock = new THREE.Clock();
    this.isCinematic = true;
    this.camProgress = 0;
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    this.initScene();
    this.initLightsAndFog();
    this.initComponents();
    this.initPostProcessing();
    this.initCameraPath();
    this.initEventListeners();
    this.initUI();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0507);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(52, aspect, 0.5, 4000);
    this.camera.position.set(0, 75, 260);
    this.camera.lookAt(0, 150, -320);

    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: false, // Bloom handles AA smoothly
      stencil: false,
      depth: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);

    // Free camera controls (disabled while in cinematic mode)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't go below ground
    this.controls.minDistance = 20;
    this.controls.maxDistance = 1200;
    this.controls.enabled = false;
  }

  initLightsAndFog() {
    // Ambient cosmic radiation
    const ambientLight = new THREE.AmbientLight(0x2d1715, 1.2);
    this.scene.add(ambientLight);

    // Volumetric Alien Atmosphere Fog
    this.scene.fog = new THREE.FogExp2(0x1a0c0a, 0.0015);
  }

  initComponents() {
    // 1. Chaotic Tri-Solar System
    this.solarSystem = new TriSolarSystem(this.scene);

    // 2. Stepped Monolith Pyramid with Armillary Apparatus
    this.pyramid = new ChaoticPyramid(this.scene);

    // 3. Procedural Wasteland Terrain & Ascending Embers
    this.terrain = new AlienTerrain(this.scene);

    // 4. Cosmic Deep Sky Starfield
    this.createStarfield();

    // 5. Procedural Ambient Web Audio
    this.audio = new ProceduralCosmicAudio();

    // 6. Real-time Tri-Solar Ephemeris Gravitational Radar
    this.radar = new CelestialRadar('radar-canvas');
  }

  createStarfield() {
    const count = 1800;
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const c1 = new THREE.Color(0xffeedd);
    const c2 = new THREE.Color(0x93c5fd);
    const c3 = new THREE.Color(0xfca5a5);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0) * 0.48;
      const r = 1600 + Math.random() * 600;

      pos[idx] = r * Math.sin(phi) * Math.cos(theta);
      pos[idx + 1] = Math.abs(r * Math.cos(phi)) + 80;
      pos[idx + 2] = r * Math.sin(phi) * Math.sin(theta);

      const pick = Math.random();
      const c = pick < 0.6 ? c1 : (pick < 0.85 ? c2 : c3);
      colors[idx] = c.r;
      colors[idx + 1] = c.g;
      colors[idx + 2] = c.b;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });

    const starfield = new THREE.Points(geom, mat);
    this.scene.add(starfield);
  }

  initPostProcessing() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const renderPass = new RenderPass(this.scene, this.camera);

    // Unreal Bloom for blinding 3-sun corona and summit beacon
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.35, // strength
      0.65, // radius
      0.35  // threshold
    );

    // Atmospheric Heat Shimmer, Chromatic Aberration & 35mm Film Grain
    this.opticsPass = new ShaderPass(AtmosphericOpticsShader);
    this.opticsPass.uniforms.uResolution.value.set(width, height);

    const outputPass = new OutputPass();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.opticsPass);
    this.composer.addPass(outputPass);
  }

  initCameraPath() {
    // 5-Stage Catmull-Rom Cinematic Spline
    const points = [
      new THREE.Vector3(0, 75, 260),     // Phase 1: Majestic grand vista framing pyramid & the 3 suns in the sky
      new THREE.Vector3(220, 68, 160),   // Phase 2: Skimming past desert monoliths & dynamic triple shadows
      new THREE.Vector3(75, 115, -60),   // Phase 3: Intimate close-up on the summit gyroscopic rings
      new THREE.Vector3(-140, 200, -220),// Phase 4: Ascending into high stratosphere framing skyward beacon
      new THREE.Vector3(-240, 260, 150), // Phase 5: Stratospheric panoramic vista of the burning world
      new THREE.Vector3(0, 75, 260)      // Loop seamlessly
    ];

    this.cameraSpline = new THREE.CatmullRomCurve3(points);
    this.cameraSpline.curveType = 'catmullrom';
    this.cameraSpline.tension = 0.5;

    // Look-at target track
    const targets = [
      new THREE.Vector3(0, 150, -320),   // Perfectly centers pyramid base & the three suns above
      new THREE.Vector3(0, 100, -80),    // Sideways gaze onto pyramid face and solar rays
      new THREE.Vector3(0, 104, 0),      // Direct focus on rotating armillary sphere
      new THREE.Vector3(20, 150, 50),    // Looking back over the pyramid toward the heavens
      new THREE.Vector3(0, 80, -60),     // Grand panoramic framing of the whole civilization cradle
      new THREE.Vector3(0, 150, -320)
    ];
    this.targetSpline = new THREE.CatmullRomCurve3(targets);
  }

  initEventListeners() {
    window.addEventListener('resize', () => this.onResize());

    // Gentle mouse parallax
    window.addEventListener('mousemove', (e) => {
      this.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    // Hotkeys: Space (Pause/Resume tour), C (Toggle Camera), M (Toggle Sound)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.isPaused = !this.isPaused;
        const btnMode = document.getElementById('btn-camera-mode');
        if (btnMode && this.isCinematic) {
          btnMode.querySelector('.btn-label').textContent = this.isPaused ? '运镜已暂停' : '电影运镜 (ON)';
        }
      } else if (e.code === 'KeyC') {
        this.toggleCameraMode();
      } else if (e.code === 'KeyM') {
        this.toggleSound();
      }
    });

    // Pause rendering loop when document is not visible
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.clock.stop();
      } else {
        this.clock.start();
      }
    });

    // ResizeObserver catches container box changes without relying on window events alone
    new ResizeObserver(() => this.onResize()).observe(document.documentElement);
  }

  toggleCameraMode() {
    this.isCinematic = !this.isCinematic;
    this.controls.enabled = !this.isCinematic;

    if (!this.isCinematic) {
      // Sync orbit control target with where camera is currently aiming to prevent visual snaps
      const currentLook = this.targetSpline.getPointAt(this.camProgress);
      this.controls.target.copy(currentLook);
      this.controls.update();
    } else {
      this.isPaused = false;
    }

    const btnMode = document.getElementById('btn-camera-mode');
    if (btnMode) {
      btnMode.querySelector('.btn-label').textContent = this.isCinematic ? '电影运镜 (ON)' : '自由视角 (ON)';
    }
  }

  toggleSound() {
    const isPlaying = this.audio.toggle();
    const btnAudio = document.getElementById('btn-toggle-sound');
    if (btnAudio) {
      btnAudio.querySelector('.btn-label').textContent = isPlaying ? '空间音频 (ON)' : '空间音频 (OFF)';
    }
  }

  initUI() {
    const btnMode = document.getElementById('btn-camera-mode');
    const btnAudio = document.getElementById('btn-toggle-sound');
    const tempVal = document.getElementById('telemetry-temp');
    const tideVal = document.getElementById('telemetry-tide');

    if (btnMode) {
      btnMode.addEventListener('click', () => this.toggleCameraMode());
    }

    if (btnAudio) {
      btnAudio.addEventListener('click', () => this.toggleSound());
    }

    // Dynamic Telemetry Readout loop with authentic stochastic variation
    setInterval(() => {
      const now = Date.now();
      if (tempVal) {
        const baseTemp = 3280 + Math.sin(now * 0.001) * 240 + (Math.random() - 0.5) * 40;
        tempVal.textContent = `${Math.round(baseTemp)} K`;
      }
      if (tideVal) {
        const baseTide = (14.2 + Math.sin(now * 0.0007) * 1.5 + (Math.random() - 0.5) * 0.25).toFixed(2);
        tideVal.textContent = `${baseTide} G (撕裂预警)`;
      }
    }, 1200);

    // Lore Quotes Cyclic Rotation
    const quotes = [
      '“这是漫长的严寒和酷热，是生命在烈火与坚冰间的漫长跋涉。”',
      '“三日凌空，行星在烈焰中成为熔炉，第 137 号文明在三日凌空中毁灭。”',
      '“脱水！脱水！浸泡！浸泡！在群星的混乱舞步中苟延残喘。”',
      '“恒星的运动是无法预测的混沌。三体问题在数学上是不可解的。”',
      '“飞星！又是飞星！在永夜之后，毁灭的黎明终将来临。”',
      '“他们向太阳飞去，在三日的光芒中被蒸发为宇宙的尘埃。”'
    ];
    const quoteEl = document.querySelector('.lore-quote');
    let quoteIdx = 0;
    if (quoteEl) {
      setInterval(() => {
        quoteEl.classList.add('fade-out');
        setTimeout(() => {
          quoteIdx = (quoteIdx + 1) % quotes.length;
          quoteEl.textContent = quotes[quoteIdx];
          quoteEl.classList.remove('fade-out');
        }, 850);
      }, 11000);
    }
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);

    if (this.bloomPass) {
      this.bloomPass.resolution.set(width, height);
    }
    if (this.opticsPass) {
      this.opticsPass.uniforms.uResolution.value.set(width, height);
    }
  }

  updateCamera(delta) {
    if (this.isCinematic) {
      if (!this.isPaused) {
        // Complete tour every 48 seconds
        this.camProgress = (this.camProgress + delta * 0.0208) % 1.0;
      }

      const camPos = this.cameraSpline.getPointAt(this.camProgress);
      const lookPos = this.targetSpline.getPointAt(this.camProgress);

      // Smooth mouse parallax damping
      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

      this.camera.position.copy(camPos);
      this.camera.position.x += this.mouse.x * 12;
      this.camera.position.y += this.mouse.y * -8;

      this.camera.lookAt(lookPos);
    } else {
      this.controls.update();
    }
  }

  animate() {
    requestAnimationFrame(this.animate);

    if (document.hidden) return;

    // Guard against large time steps after tab backgrounding
    const rawDelta = this.clock.getDelta();
    const delta = Math.min(rawDelta, 0.1);

    this.solarSystem.update(delta);
    this.pyramid.update(delta);
    this.terrain.update(delta);
    this.updateCamera(delta);

    // Update Atmospheric Optics (heat shimmer & grain)
    if (this.opticsPass) {
      this.opticsPass.uniforms.uTime.value += delta;
    }

    // Update Celestial Gravitational Radar
    if (this.radar && this.solarSystem) {
      this.radar.update(this.solarSystem.suns, delta);
    }

    // Directional Audio Filtering: modulate noise resonance based on camera view direction towards primary sun
    if (this.audio && this.solarSystem && this.camera) {
      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);
      const alphaSun = this.solarSystem.suns[0];
      if (alphaSun) {
        const sunDir = new THREE.Vector3().subVectors(alphaSun.group.position, this.camera.position).normalize();
        this.audio.updateModulation(camDir.dot(sunDir));
      }
    }

    this.composer.render();
  }
}

// Instantiate upon DOM readiness
window.addEventListener('DOMContentLoaded', () => {
  window.experience = new ThreeBodyExperience();
});

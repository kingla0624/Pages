import * as THREE from 'three';
import { GW_MODEL, GRAVITATIONAL_WAVE_GLSL, getGravitationalWaveState } from '../core/Timeline.js';

/**
 * 引力波的示意画面：双体旋进、并合闪光与向外传播的衰减波纹。
 * 网格表示形变的直观类比，并非广义相对论度规或观测数据。
 */
export class Scene03_GravitationalWaves {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Scene03_GravitationalWaves';

    this.initSpacetimeGrid();
    this.initBlackHoleMarkers();
    this.initMergerGlow();
  }

  /**
   * 1. 形变示意网格与顶点扰动着色器
   */
  initSpacetimeGrid() {
    const size = 26;
    const segments = 180;
    const gridGeo = new THREE.PlaneGeometry(size, size, segments, segments);
    gridGeo.rotateX(-Math.PI / 2);

    this.gridMat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 1.0 },
        uBh1Pos: { value: new THREE.Vector2(-1.5, 0.0) },
        uBh2Pos: { value: new THREE.Vector2(1.5, 0.0) },
        uMergerFactor: { value: 0.0 },
        uTime: { value: GW_MODEL.startTime },
        uFlash: { value: 0 }
      },
      vertexShader: `
        uniform vec2 uBh1Pos;
        uniform vec2 uBh2Pos;
        uniform float uMergerFactor;
        uniform float uTime;

        varying vec3 vWorldPos;
        varying float vWave;
        varying float vWell;
        varying vec2 vUv;

        ${GRAVITATIONAL_WAVE_GLSL}

        void main() {
          vUv = uv;
          vec3 pos = position;
          vec2 p = pos.xz;

          // 计算相对于两颗黑洞的距离
          float d1 = length(p - uBh1Pos);
          float d2 = length(p - uBh2Pos);

          // 有限深度的势阱避免尖细漏斗遮住标记和波纹。
          float binaryWell = -1.25 / sqrt(d1 * d1 + 0.81)
                           - 1.25 / sqrt(d2 * d2 + 0.81);

          // 2. 同一双极源信号在 t-r/c 的延迟时刻向外传播。
          float r = length(p);
          float phi = atan(p.y, p.x);
          float mergedWell = -2.45 / sqrt(r * r + 1.0);
          float well = mix(binaryWell, mergedWell, uMergerFactor);
          vec2 source = gravitationalWaveState(uTime - r / ${GW_MODEL.propagationSpeed.toFixed(1)});
          float wave = sin(source.x - 2.0 * phi) * source.y
                     * exp(-r * 0.12) * smoothstep(0.8, 2.0, r);

          pos.y = well + wave;
          vWell = well;
          vWave = wave;
          vWorldPos = pos;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform float uFlash;
        varying vec3 vWorldPos;
        varying float vWave;
        varying float vWell;
        varying vec2 vUv;

        void main() {
          // 网格线渲染 (Wireframe Grid Lines via derivatives)
          vec2 cell = vUv * 58.0;
          vec2 grid = abs(fract(cell - 0.5) - 0.5) / max(fwidth(cell), vec2(0.0001));
          float line = 1.0 - min(min(grid.x, grid.y), 1.0);

          vec3 wireColor = vec3(0.55, 0.58, 0.62);
          float accent = smoothstep(0.12, 0.62, abs(vWave)) * 0.38
                       + smoothstep(1.6, 2.8, -vWell) * 0.15;
          wireColor = mix(wireColor, vec3(0.85, 0.22, 0.10), accent);
          // 波峰单独用波幅判定，避免总深度为负时亮白永不出现。
          wireColor += vec3(0.30, 0.27, 0.23) * smoothstep(0.18, 0.62, vWave);

          // 边缘平滑衰减
          float dist = length(vWorldPos.xz);
          float falloff = 1.0 - smoothstep(8.5, 13.0, dist);
          wireColor += vec3(0.70, 0.50, 0.32) * uFlash * exp(-dist * 0.25);

          gl_FragColor = vec4(wireColor, uOpacity * line * falloff * (0.68 + 0.20 * uFlash));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      wireframe: false,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.gridMesh = new THREE.Mesh(gridGeo, this.gridMat);
    this.gridMesh.position.set(0, 0.2, 0);
    this.group.add(this.gridMesh);
  }

  /**
   * 2. 正在绕转的双黑洞几何标记
   */
  initBlackHoleMarkers() {
    this.bhRingMat = new THREE.MeshBasicMaterial({
      color: 0xfff5e8, transparent: true, depthTest: false, depthWrite: false
    });
    this.bhDiscMat = new THREE.MeshBasicMaterial({
      color: 0x020202, transparent: true, depthTest: false, depthWrite: false
    });
    this.mergedRingMat = this.bhRingMat.clone();
    this.mergedDiscMat = this.bhDiscMat.clone();

    const ringGeo = new THREE.RingGeometry(0.30, 0.33, 64);
    const discGeo = new THREE.CircleGeometry(0.30, 64);
    const createMarker = (ringMat, discMat) => {
      const marker = new THREE.Group();
      const disc = new THREE.Mesh(discGeo, discMat);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      disc.renderOrder = 4;
      ring.renderOrder = 5;
      // 摄影机面向的圆形阴影，避免俯视角下变成狭窄椭圆。
      for (const mesh of [disc, ring]) {
        mesh.onBeforeRender = (_renderer, _scene, camera) => {
          mesh.quaternion.copy(camera.quaternion);
          mesh.updateMatrixWorld();
        };
      }
      marker.add(disc, ring);
      this.group.add(marker);
      return marker;
    };

    this.bh1 = createMarker(this.bhRingMat, this.bhDiscMat);
    this.bh2 = createMarker(this.bhRingMat, this.bhDiscMat);
    this.mergedBh = createMarker(this.mergedRingMat, this.mergedDiscMat);
    this.mergedBh.scale.setScalar(1.45);
    this.mergedBh.position.y = -2.22;
  }

  initMergerGlow() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const glow = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    glow.addColorStop(0, 'rgba(255,245,225,1)');
    glow.addColorStop(0.12, 'rgba(255,214,170,0.8)');
    glow.addColorStop(0.35, 'rgba(255,173,116,0.28)');
    glow.addColorStop(1, 'rgba(255,173,116,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 256, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.glowMat = new THREE.SpriteMaterial({
      map: texture, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false, opacity: 0
    });
    this.mergerGlow = new THREE.Sprite(this.glowMat);
    this.mergerGlow.position.set(0, -1.9, 0);
    this.mergerGlow.renderOrder = 6;
    this.group.add(this.mergerGlow);
  }

  update(time, opacity) {
    const state = getGravitationalWaveState(time);
    const p = state.orbitProgress;
    const merger = state.mergerProgress;
    const ringdownTime = Math.max(0, state.elapsed);
    // omega(t) = 2.5 + 9.5*p^3，角速度上限 12 rad/s。
    const orbitAngle = state.orbitPhase;
    const orbitR = (2.25 * (1 - p) * (1 + 0.8 * p) + 0.30) * (1 - merger);
    const x = Math.cos(orbitAngle) * orbitR;
    const z = Math.sin(orbitAngle) * orbitR;
    const flash = state.flash;

    const uniforms = this.gridMat.uniforms;
    uniforms.uOpacity.value = opacity;
    uniforms.uBh1Pos.value.set(x, z);
    uniforms.uBh2Pos.value.set(-x, -z);
    uniforms.uMergerFactor.value = merger;
    uniforms.uTime.value = time;
    uniforms.uFlash.value = flash;

    const markerDepth = 0.2 - 1.25 / 0.9 - 1.25 / Math.sqrt(4 * orbitR * orbitR + 0.81);
    this.bh1.position.set(x, markerDepth, z);
    this.bh2.position.set(-x, markerDepth, -z);
    this.bhRingMat.opacity = opacity * (1 - merger);
    this.bhDiscMat.opacity = opacity * (1 - merger);
    this.bh1.visible = this.bh2.visible = merger < 0.999;
    this.mergedBh.visible = merger > 0.001;
    this.mergedRingMat.opacity = opacity * merger;
    this.mergedDiscMat.opacity = opacity * merger;

    this.glowMat.opacity = opacity * (0.95 * flash + 0.12 * merger * Math.exp(-ringdownTime * 1.6));
    this.mergerGlow.scale.setScalar(9 + ringdownTime * 2);

    this.group.visible = opacity > 0.001;
  }
}

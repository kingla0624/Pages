import * as THREE from 'three';

/**
 * Scene03_GravitationalWaves.js - 引力波：双黑洞并合与时空度规涟漪
 * 3D 弹性时空格点网格顶点着色器变形，实时呈现双黑洞引力势阱、旋进并合及 LIGO 应变啁啾信号
 */
export class Scene03_GravitationalWaves {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Scene03_GravitationalWaves';

    this.initSpacetimeGrid();
    this.initBlackHoleMarkers();
  }

  /**
   * 1. 3D 时空度规网格与顶点扰动着色器
   */
  initSpacetimeGrid() {
    const size = 24;
    const segments = 120;
    const gridGeo = new THREE.PlaneGeometry(size, size, segments, segments);
    gridGeo.rotateX(-Math.PI / 2);

    this.gridMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 1.0 },
        uBh1Pos: { value: new THREE.Vector2(-1.5, 0.0) },
        uBh2Pos: { value: new THREE.Vector2(1.5, 0.0) },
        uMergerFactor: { value: 0.0 }, // 0.0 旋进, 1.0 并合
        uWaveFreq: { value: 2.0 },
        uWaveAmp: { value: 0.45 }
      },
      vertexShader: `
        uniform float uTime;
        uniform vec2 uBh1Pos;
        uniform vec2 uBh2Pos;
        uniform float uMergerFactor;
        uniform float uWaveFreq;
        uniform float uWaveAmp;

        varying vec3 vWorldPos;
        varying float vDepth;
        varying vec2 vUv;

        void main() {
          vUv = uv;
          vec3 pos = position;
          vec2 p = pos.xz;

          // 计算相对于两颗黑洞的距离
          float d1 = length(p - uBh1Pos);
          float d2 = length(p - uBh2Pos);

          // 1. 引力势阱漏斗下沉 (Gravitational Potential Wells)
          float well1 = -2.2 / (pow(d1, 0.85) + 0.35);
          float well2 = -2.2 / (pow(d2, 0.85) + 0.35);

          // 2. 旋进向外辐射的螺旋引力波 (Spiral Gravitational Waves)
          float r = length(p);
          float phi = atan(p.y, p.x);
          float spiralPhase = 2.0 * phi - uTime * uWaveFreq - r * 1.8;
          float wave = sin(spiralPhase) * uWaveAmp * exp(-r * 0.15) * smoothstep(1.0, 3.5, r);

          pos.y = well1 + well2 + wave;
          vDepth = pos.y;
          vWorldPos = pos;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec3 vWorldPos;
        varying float vDepth;
        varying vec2 vUv;

        void main() {
          // 网格线渲染 (Wireframe Grid Lines via derivatives)
          vec2 grid = abs(fract(vUv * 60.0 - 0.5) - 0.5) / fwidth(vUv * 60.0);
          float line = 1.0 - min(min(grid.x, grid.y), 1.0);

          // 色彩：高清晰明亮白灰网格线 + 势阱深渊暗红 + 涟漪亮白
          vec3 baseGrid = vec3(0.62, 0.65, 0.72);
          vec3 depthColor = vec3(0.92, 0.25, 0.12);
          vec3 crestColor = vec3(1.0, 1.0, 1.0);

          float depthFactor = clamp((-vDepth - 0.3) / 2.5, 0.0, 1.0);
          vec3 wireColor = mix(baseGrid, depthColor, depthFactor);
          wireColor += crestColor * smoothstep(0.12, 0.40, vDepth) * 0.9;

          // 边缘平滑衰减
          float dist = length(vWorldPos.xz);
          float falloff = 1.0 - smoothstep(7.0, 12.0, dist);

          gl_FragColor = vec4(wireColor * line * falloff, uOpacity * line * falloff);
        }
      `,
      transparent: true,
      wireframe: false,
      depthWrite: false
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
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true
    });

    const ringGeo = new THREE.RingGeometry(0.3, 0.36, 32);
    ringGeo.rotateX(-Math.PI / 2);

    this.bh1 = new THREE.Mesh(ringGeo, this.bhRingMat);
    this.bh2 = new THREE.Mesh(ringGeo, this.bhRingMat);

    this.group.add(this.bh1, this.bh2);
  }

  update(time, opacity) {
    const sceneStart = 25.5;
    const progress = Math.min(Math.max((time - sceneStart) / 10.0, 0.0), 1.0);

    // 双黑洞旋进与加速轨道模型
    // 旋转半径从 2.2 收缩至 0.15 (并合)，角速度从 2.5 飙升至 16.0
    const mergerTime = 0.85; // 85% 进度时发生碰撞
    let orbitR = 0.1;
    let orbitAngle = 0;
    let waveFreq = 2.0;

    if (progress < mergerTime) {
      const pNorm = progress / mergerTime;
      orbitR = 2.2 * Math.pow(1.0 - pNorm, 0.5) + 0.15;
      const speed = 2.5 + Math.pow(pNorm, 3.0) * 14.0;
      orbitAngle = time * speed;
      waveFreq = 2.0 + pNorm * 10.0;
    } else {
      orbitR = 0.1;
      orbitAngle = time * 2.0;
      waveFreq = 1.0;
    }

    const x1 = Math.cos(orbitAngle) * orbitR;
    const z1 = Math.sin(orbitAngle) * orbitR;
    const x2 = -x1;
    const z2 = -z1;

    // 更新着色器参数
    this.gridMat.uniforms.uTime.value = time;
    this.gridMat.uniforms.uOpacity.value = opacity;
    this.gridMat.uniforms.uBh1Pos.value.set(x1, z1);
    this.gridMat.uniforms.uBh2Pos.value.set(x2, z2);
    this.gridMat.uniforms.uWaveFreq.value = waveFreq;

    // 更新黑洞标记小环
    const yDepth = -1.8;
    this.bh1.position.set(x1, yDepth, z1);
    this.bh2.position.set(x2, yDepth, z2);
    this.bhRingMat.opacity = opacity;

    this.group.visible = opacity > 0.001;
  }
}

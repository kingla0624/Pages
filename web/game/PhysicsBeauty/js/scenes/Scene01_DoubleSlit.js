import * as THREE from 'three';

/**
 * Scene01_DoubleSlit.js - 量子双缝干涉实验
 * 精确模拟波动光学相干干涉条纹、蒙特卡洛随机单个粒子感光屏轰击与理论概率波曲线
 */
export class Scene01_DoubleSlit {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Scene01_DoubleSlit';

    this.slitDistance = 1.6; // 双缝间距 d
    this.wavelength = 0.55;  // 波长 lambda
    this.screenDistance = 9.0; // 双缝到探测屏距离 L

    this.initWaveFloor();
    this.initSlitBarrier();
    this.initDetectorScreen();
    this.initProbabilityCurve();
  }

  /**
   * 1. 地面干涉波纹网格着色器
   */
  initWaveFloor() {
    const floorGeo = new THREE.PlaneGeometry(16, 12, 180, 140);
    floorGeo.rotateX(-Math.PI / 2);

    this.floorMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 1.0 },
        uSlitDist: { value: this.slitDistance },
        uWavelength: { value: this.wavelength }
      },
      vertexShader: `
        varying vec2 vWorldPos;
        void main() {
          vWorldPos = vec2(position.x, position.z);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        uniform float uSlitDist;
        uniform float uWavelength;
        varying vec2 vWorldPos;

        void main() {
          // 双缝坐标在 z = 0 处
          float x = vWorldPos.x;
          float z = vWorldPos.y; // 对应三维世界中的 z 轴深度

          if (z < 0.0) {
            // 双缝前方的入射平行波
            float incWave = cos(z * 6.0 - uTime * 6.0) * 0.5 + 0.5;
            float falloff = smoothstep(-6.0, 0.0, z);
            gl_FragColor = vec4(vec3(0.9, 0.4, 0.2) * incWave * falloff * 0.4, uOpacity);
            return;
          }

          // 双缝后方的相干干涉球面波
          vec2 s1 = vec2(-uSlitDist * 0.5, 0.0);
          vec2 s2 = vec2(uSlitDist * 0.5, 0.0);
          vec2 p = vec2(x, z);

          float r1 = length(p - s1);
          float r2 = length(p - s2);

          float k = 6.2831853 / uWavelength;
          float phase1 = k * r1 - uTime * 6.0;
          float phase2 = k * r2 - uTime * 6.0;

          // 叠加波场 psi = (cos(phase1) + cos(phase2)) / sqrt(r)
          float psi = cos(phase1) / sqrt(max(r1, 0.4)) + cos(phase2) / sqrt(max(r2, 0.4));
          float intensity = psi * psi * 0.25;

          // 几何干涉条纹发光
          vec3 warmColor = vec3(0.9, 0.35, 0.15);
          vec3 crestColor = vec3(1.0, 0.85, 0.7);
          vec3 col = mix(warmColor * intensity, crestColor * pow(intensity, 1.5), 0.5);

          // 边缘平滑淡出
          float distFalloff = 1.0 - smoothstep(4.0, 10.0, z);
          col *= distFalloff;

          gl_FragColor = vec4(col, uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false
    });

    this.floorMesh = new THREE.Mesh(floorGeo, this.floorMat);
    this.floorMesh.position.set(0, -0.05, 3.5);
    this.group.add(this.floorMesh);
  }

  /**
   * 2. 前置双缝挡板与发光狭缝
   */
  initSlitBarrier() {
    const barrierGeo = new THREE.PlaneGeometry(16, 2.5);
    const barrierMat = new THREE.MeshBasicMaterial({
      color: 0x0a0a0e,
      side: THREE.DoubleSide
    });
    this.barrier = new THREE.Mesh(barrierGeo, barrierMat);
    this.barrier.position.set(0, 1.25, 0);
    this.group.add(this.barrier);

    // 细窄双缝高亮发光线
    const slitGeo = new THREE.PlaneGeometry(0.08, 2.2);
    const slitMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    this.slitLeft = new THREE.Mesh(slitGeo, slitMat);
    this.slitLeft.position.set(-this.slitDistance * 0.5, 1.1, 0.02);
    this.group.add(this.slitLeft);

    this.slitRight = new THREE.Mesh(slitGeo, slitMat);
    this.slitRight.position.set(this.slitDistance * 0.5, 1.1, 0.02);
    this.group.add(this.slitRight);

    // 入射导引光束
    const beamGeo = new THREE.PlaneGeometry(0.12, 6.0);
    beamGeo.rotateX(Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85
    });
    this.beam = new THREE.Mesh(beamGeo, beamMat);
    this.beam.position.set(0, 0.01, -3.0);
    this.group.add(this.beam);
  }

  /**
   * 3. 后方探测感光屏与单个粒子累积落点
   */
  initDetectorScreen() {
    // 感光背板
    const screenGeo = new THREE.PlaneGeometry(12, 3.2);
    const screenMat = new THREE.MeshBasicMaterial({
      color: 0x0c0c12,
      side: THREE.DoubleSide
    });
    this.screenMesh = new THREE.Mesh(screenGeo, screenMat);
    this.screenMesh.position.set(0, 1.6, this.screenDistance);
    this.group.add(this.screenMesh);

    // 荧光粒子轰击点 (采用 InstancedMesh 高性能渲染)
    this.maxParticles = 3000;
    this.currentParticleCount = 0;
    const dotGeo = new THREE.CircleGeometry(0.038, 6);
    this.dotMat = new THREE.MeshBasicMaterial({
      color: 0xffe2cc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });

    this.instancedDots = new THREE.InstancedMesh(dotGeo, this.dotMat, this.maxParticles);
    this.instancedDots.frustumCulled = false;
    this.instancedDots.count = 0;
    this.group.add(this.instancedDots);

    // 预计算符合量子概率密度的粒子落点并一次性填充至 InstancedMesh
    const dummy = new THREE.Object3D();
    const d = this.slitDistance;
    const L = this.screenDistance;
    const lambda = this.wavelength;

    for (let i = 0; i < this.maxParticles; i++) {
      // 拒绝采样获得干涉条纹横坐标 x
      let x = (Math.random() - 0.5) * 10;
      let prob = 0;
      while (true) {
        x = (Math.random() - 0.5) * 10;
        const beta = (Math.PI * 0.15 * x) / (lambda * L);
        const alpha = (Math.PI * d * x) / (lambda * L);
        const diffraction = beta === 0 ? 1 : Math.sin(beta) / beta;
        prob = Math.cos(alpha) * Math.cos(alpha) * diffraction * diffraction;
        if (Math.random() < prob) break;
      }
      const y = 0.3 + Math.random() * 2.5;
      const z = this.screenDistance - 0.01;

      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      this.instancedDots.setMatrixAt(i, dummy.matrix);
    }
    this.instancedDots.instanceMatrix.needsUpdate = true;
  }

  /**
   * 4. 屏幕上方理论干涉概率包络红线 (Probability Curve)
   */
  initProbabilityCurve() {
    const points = [];
    const d = this.slitDistance;
    const L = this.screenDistance;
    const lambda = this.wavelength;

    for (let x = -5.0; x <= 5.0; x += 0.05) {
      const beta = (Math.PI * 0.15 * x) / (lambda * L);
      const alpha = (Math.PI * d * x) / (lambda * L);
      const diff = beta === 0 ? 1 : Math.sin(beta) / beta;
      const intensity = Math.cos(alpha) * Math.cos(alpha) * diff * diff;
      const y = 2.8 + intensity * 0.5; // 在屏幕上部弯曲
      points.push(new THREE.Vector3(x, y, this.screenDistance - 0.02));
    }

    const curveGeo = new THREE.BufferGeometry().setFromPoints(points);
    this.curveMat = new THREE.LineBasicMaterial({
      color: 0xe63926,
      linewidth: 2,
      transparent: true,
      opacity: 0.9
    });
    this.curveLine = new THREE.Line(curveGeo, this.curveMat);
    this.group.add(this.curveLine);
  }

  update(time, opacity) {
    this.floorMat.uniforms.uTime.value = time;
    this.floorMat.uniforms.uOpacity.value = opacity;
    this.curveMat.opacity = opacity * 0.9;
    this.dotMat.opacity = opacity * 0.85;

    // 粒子累积发射逻辑 (在 5.5s ~ 15.5s 时间段内逐渐填满)
    const sceneStart = 5.5;
    const sceneDuration = 10.0;
    const progress = Math.min(Math.max((time - sceneStart) / sceneDuration, 0), 1);
    const targetCount = Math.floor(progress * this.maxParticles);

    // 零 CPU 重传，直接控制 GPU 实例渲染数量
    this.instancedDots.count = targetCount;

    this.group.visible = opacity > 0.001;
  }
}

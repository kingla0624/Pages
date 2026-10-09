import * as THREE from 'three';
import { getChapterProgress, smoothstep } from '../core/Timeline.js';

/**
 * Scene01_DoubleSlit.js - 量子双缝干涉实验
 * 相干波前、按干涉概率采样的逐粒子积累与后段揭示的概率曲线
 */
export class Scene01_DoubleSlit {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Scene01_DoubleSlit';

    this.slitDistance = 2.4; // 双缝间距 d（示意单位）
    this.slitWidth = 0.18; // 缝宽 a：挡板、波场与探测概率共用
    this.wavelength = 0.38;  // 波长 lambda
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
    const floorGeo = new THREE.PlaneGeometry(16, 16);
    floorGeo.rotateX(-Math.PI / 2);

    this.floorMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 1.0 },
        uRevealRadius: { value: 0 },
        uSlitDist: { value: this.slitDistance },
        uSlitWidth: { value: this.slitWidth },
        uWavelength: { value: this.wavelength }
      },
      vertexShader: `
        varying vec2 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        uniform float uRevealRadius;
        uniform float uSlitDist;
        uniform float uSlitWidth;
        uniform float uWavelength;
        varying vec2 vWorldPos;

        void main() {
          // 双缝坐标在 z = 0 处
          float x = vWorldPos.x;
          float z = vWorldPos.y; // 对应三维世界中的 z 轴深度

          float k = 6.2831853 / uWavelength;
          vec3 col = vec3(0.007, 0.008, 0.010);
          if (z < 0.0) {
            // 法线朝上的入射区：相位沿 +z 传播，清楚展示平行波前。
            float crest = pow(0.5 + 0.5 * cos(k * z - uTime * 5.2), 6.0);
            float edge = smoothstep(-6.5, -5.4, z) * (1.0 - smoothstep(6.0, 8.0, abs(x)));
            col += vec3(0.52, 0.53, 0.56) * crest * edge;
          } else {
            vec2 p = vec2(x, z);
            float r1 = length(p - vec2(-uSlitDist * 0.5, 0.0));
            float r2 = length(p - vec2(uSlitDist * 0.5, 0.0));
            float phase1 = k * r1 - uTime * 5.2;
            float phase2 = k * r2 - uTime * 5.2;
            // Separate the shared interference envelope from the moving carrier.
            // This is the time-averaged intensity of the same two coherent sources.
            float intensity = 0.5 + 0.5 * cos(phase1 - phase2);
            float sinTheta = x / max(length(p), 0.00001);
            float beta = 3.14159265 * uSlitWidth * sinTheta / uWavelength;
            float diffraction = abs(beta) < 0.00001 ? 1.0 : sin(beta) / beta;
            float carrier = 0.5 + 0.5 * cos(0.5 * (phase1 + phase2));
            float crests = pow(carrier, 5.0);
            float crestHalo = pow(carrier, 1.5);
            float radius = min(r1, r2);
            float reveal = 1.0 - smoothstep(uRevealRadius - 0.55, uRevealRadius, radius);
            float edge = (1.0 - smoothstep(7.5, 9.5, z)) * (1.0 - smoothstep(6.3, 8.0, abs(x)));
            float attenuation = 1.0 / (1.0 + radius * 0.10);
            // Wide white wavefronts sit over warm interference fans, rather than
            // drawing two hard crossing contour sets at every phase maximum.
            vec3 wavefront = vec3(0.36, 0.37, 0.39) * crests
              * (0.26 + 0.74 * sqrt(intensity)) + vec3(0.07) * crestHalo;
            vec3 warmFan = vec3(0.82, 0.23, 0.075) * intensity
              * diffraction * diffraction * (0.42 + 0.58 * crests);
            col += (wavefront + warmFan) * reveal * edge * attenuation;
          }
          gl_FragColor = vec4(col, uOpacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthWrite: false
    });

    this.floorMesh = new THREE.Mesh(floorGeo, this.floorMat);
    this.floorMesh.position.set(0, -0.05, 1.5);
    this.group.add(this.floorMesh);
  }

  /**
   * 2. 前置双缝挡板与发光狭缝
   */
  initSlitBarrier() {
    this.barrierMat = new THREE.MeshBasicMaterial({
      color: 0x14151b,
      transparent: true
    });
    this.barrier = new THREE.Group();
    const slitWidth = this.slitWidth;
    const halfWidth = 7.5;
    const slitX = this.slitDistance * 0.5;
    const spans = [[-halfWidth, -slitX - slitWidth / 2], [-slitX + slitWidth / 2, slitX - slitWidth / 2], [slitX + slitWidth / 2, halfWidth]];
    const edgePoints = [];
    for (const [left, right] of spans) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(right - left, 0.22, 0.09), this.barrierMat);
      slab.position.set((left + right) / 2, 0.11, 0);
      this.barrier.add(slab);
      edgePoints.push(new THREE.Vector3(left, 0.225, -0.047), new THREE.Vector3(right, 0.225, -0.047));
    }
    this.edgeMat = new THREE.LineBasicMaterial({ color: 0xe0e4e8, transparent: true });
    this.barrier.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(edgePoints), this.edgeMat));
    this.group.add(this.barrier);

    // 缝隙位于真实挡板间隙，双面可见，低挡板不会遮住后方传播区域。
    const slitGeo = new THREE.PlaneGeometry(slitWidth * 0.8, 0.24);
    this.slitMat = new THREE.MeshBasicMaterial({ color: 0xfff0da, side: THREE.DoubleSide, transparent: true });

    this.slitLeft = new THREE.Mesh(slitGeo, this.slitMat);
    this.slitLeft.position.set(-slitX, 0.12, -0.05);
    this.group.add(this.slitLeft);

    this.slitRight = new THREE.Mesh(slitGeo, this.slitMat);
    this.slitRight.position.set(slitX, 0.12, -0.05);
    this.group.add(this.slitRight);

    // 入射导引光束
    const beamGeo = new THREE.PlaneGeometry(0.045, 6.0);
    beamGeo.rotateX(-Math.PI / 2);
    this.beamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.14,
      depthWrite: false
    });
    this.beam = new THREE.Mesh(beamGeo, this.beamMat);
    this.beam.position.set(0, 0.01, -3.0);
    this.group.add(this.beam);
  }

  /**
   * 3. 后方探测感光屏与单个粒子累积落点
   */
  initDetectorScreen() {
    // 感光背板
    const screenGeo = new THREE.PlaneGeometry(12, 3.2);
    this.screenMat = new THREE.MeshBasicMaterial({
      color: 0x05060a,
      side: THREE.DoubleSide,
      transparent: true
    });
    this.screenMesh = new THREE.Mesh(screenGeo, this.screenMat);
    this.screenMesh.position.set(0, 1.6, this.screenDistance);
    // 先绘制背板，避免透明排序让背板覆盖不写深度的电子粒子
    this.screenMesh.renderOrder = -1;
    this.group.add(this.screenMesh);
    const framePoints = [new THREE.Vector3(-6, 0, this.screenDistance - 0.005), new THREE.Vector3(6, 0, this.screenDistance - 0.005), new THREE.Vector3(6, 3.2, this.screenDistance - 0.005), new THREE.Vector3(-6, 3.2, this.screenDistance - 0.005)];
    this.screenEdgeMat = new THREE.LineBasicMaterial({ color: 0x55555e, transparent: true, opacity: 0.7 });
    this.group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(framePoints), this.screenEdgeMat));

    // 荧光粒子轰击点 (采用 InstancedMesh 高性能渲染)
    this.maxParticles = 4800;
    this.currentParticleCount = 0;
    const dotGeo = new THREE.CircleGeometry(0.016, 6);
    this.dotMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });

    this.instancedDots = new THREE.InstancedMesh(dotGeo, this.dotMat, this.maxParticles);
    this.instancedDots.frustumCulled = false;
    this.instancedDots.count = 0;
    this.group.add(this.instancedDots);

    // 预计算符合量子概率密度的粒子落点并一次性填充至 InstancedMesh
    const dummy = new THREE.Object3D();
    // 场景本地固定种子：暂停、拖动及重新载入保持同一组实验落点。
    let seed = 0x51f17;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    for (let i = 0; i < this.maxParticles; i++) {
      // 拒绝采样获得干涉条纹横坐标 x
      let x;
      while (true) {
        x = (random() - 0.5) * 10;
        if (random() < this.getDetectorProbability(x)) break;
      }
      const y = 0.18 + random() * 2.62;
      const z = this.screenDistance - 0.01;
      // Appearance uses an independent index hash so it cannot perturb sampling.
      const appearance = (Math.imul(i + 1, 1597334677) >>> 0) / 4294967296;
      const warmth = (Math.imul(i + 1, 3812015801) >>> 0) / 4294967296;
      const color = new THREE.Color(0xfffcf4).lerp(new THREE.Color(0xff7c3d), warmth ** 3);
      color.multiplyScalar(0.38 + appearance * 1.1);

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(0.7 + appearance * 0.9);
      dummy.updateMatrix();
      this.instancedDots.setMatrixAt(i, dummy.matrix);
      this.instancedDots.setColorAt(i, color);
    }
    this.instancedDots.instanceMatrix.needsUpdate = true;
    this.instancedDots.instanceColor.needsUpdate = true;
  }

  /**
   * 4. 屏幕上方理论干涉概率包络红线 (Probability Curve)
   */
  initProbabilityCurve() {
    const points = [];
    for (let x = -5.0; x <= 5.0; x += 0.05) {
      const intensity = this.getDetectorProbability(x);
      const y = 3.32 + intensity * 0.55;
      points.push(new THREE.Vector3(x, y, this.screenDistance - 0.02));
    }

    const curveGeo = new THREE.BufferGeometry().setFromPoints(points);
    this.curveMat = new THREE.LineBasicMaterial({
      color: 0xc95746,
      linewidth: 2,
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    });
    this.curveLine = new THREE.Line(curveGeo, this.curveMat);
    this.group.add(this.curveLine);

    // A world-space ribbon supplies the soft halo; WebGL ignores Line linewidth.
    const positions = [];
    const offsets = [];
    const indices = [];
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      positions.push(point.x, point.y - 0.055, point.z, point.x, point.y + 0.055, point.z);
      offsets.push(-1, 1);
      if (i > 0) {
        const base = i * 2;
        indices.push(base - 2, base - 1, base, base - 1, base + 1, base);
      }
    }
    const glowGeo = new THREE.BufferGeometry();
    glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    glowGeo.setAttribute('aOffset', new THREE.Float32BufferAttribute(offsets, 1));
    glowGeo.setIndex(indices);
    this.curveGlowMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 } },
      vertexShader: `
        attribute float aOffset;
        varying float vOffset;
        void main() {
          vOffset = aOffset;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying float vOffset;
        void main() {
          float glow = exp(-vOffset * vOffset * 6.0);
          gl_FragColor = vec4(vec3(0.80, 0.15, 0.055), glow * uOpacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.group.add(new THREE.Mesh(glowGeo, this.curveGlowMat));
  }

  getDetectorProbability(x) {
    const L = this.screenDistance;
    const d = this.slitDistance;
    const lambda = this.wavelength;
    // 与地面两源波场使用相同的精确光程差，远离轴线时也保持条纹一致。
    const pathDifference = Math.hypot(x - d / 2, L) - Math.hypot(x + d / 2, L);
    const sinTheta = x / Math.hypot(x, L);
    const beta = Math.PI * this.slitWidth * sinTheta / lambda;
    const diffraction = beta === 0 ? 1 : Math.sin(beta) / beta;
    return Math.cos(Math.PI * pathDifference / lambda) ** 2 * diffraction ** 2;
  }

  update(time, opacity) {
    const progress = getChapterProgress(1, time);
    this.floorMat.uniforms.uTime.value = time;
    this.floorMat.uniforms.uOpacity.value = opacity;
    this.floorMat.uniforms.uRevealRadius.value = smoothstep(0.08, 0.90, progress) * 14;
    this.barrierMat.opacity = opacity;
    this.slitMat.opacity = opacity;
    this.edgeMat.opacity = opacity * 0.9;
    this.screenMat.opacity = opacity;
    this.screenEdgeMat.opacity = opacity * 0.7;
    this.beamMat.opacity = opacity * 0.14;
    this.curveMat.opacity = opacity * 0.75 * smoothstep(0.64, 0.91, progress);
    this.curveGlowMat.uniforms.uOpacity.value = opacity * 0.48 * smoothstep(0.64, 0.91, progress);
    this.dotMat.opacity = opacity * 0.9;

    // 前半幕逐粒子落下，后半幕才显出统计条纹；不依赖前一次更新时间。
    const targetCount = Math.floor(smoothstep(0.12, 1, progress) ** 4 * this.maxParticles);

    // 零 CPU 重传，直接控制 GPU 实例渲染数量
    this.instancedDots.count = targetCount;

    this.group.visible = opacity > 0.001;
  }
}

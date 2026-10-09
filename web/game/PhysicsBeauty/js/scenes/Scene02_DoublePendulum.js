import * as THREE from 'three';
import { CHAPTERS, getTransitionState } from '../core/Timeline.js';

/**
 * Scene02_DoublePendulum.js - 混沌理论：双摆对初始条件的极端敏感性
 * 采用四阶龙格-库塔 (RK4) 高精度数值积分，仿真初角差 0.001° 的两组双摆急剧发散过程
 */
export class Scene02_DoublePendulum {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Scene02_DoublePendulum';

    this.l1 = 1.5; // 第一摆长
    this.l2 = 1.3; // 第二摆长
    this.m1 = 1.0; // 第一摆质点质量
    this.m2 = 1.0; // 第二摆质点质量
    this.g = 9.81;

    // 预计算轨迹数据，保证时间轴随意拖动 (Seek) 时完全确定一致
    this.simulationTimeScale = 2.5; // 将 25 秒物理演化压缩至 10 秒章节，保留可读的分叉过程
    // 退出画框内仍继续演化，直到共享转场结束；章节内的数值轨迹保持不变。
    const chapter = CHAPTERS[2];
    const visibleEnd = getTransitionState(chapter.end)?.end ?? chapter.end;
    this.maxSimulationTime = (visibleEnd - chapter.start) * this.simulationTimeScale;
    this.dt = 0.002; // 历史采样间隔，保持 1200 点尾迹覆盖 2.4 秒
    this.integrationDt = 0.0005; // 更小的 RK4 内部步长，抑制混沌放大的积分误差
    this.history1 = [];
    this.history2 = [];

    this.precomputeTrajectories();
    this.initVisuals();
  }

  /**
   * 导数计算：拉格朗日双摆非线性微分方程组
   */
  derivatives(state) {
    const { theta1, theta2, omega1, omega2 } = state;
    const delta = theta1 - theta2;
    const m1 = this.m1, m2 = this.m2, l1 = this.l1, l2 = this.l2, g = this.g;

    const den1 = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * delta));
    const num1 = -g * (2 * m1 + m2) * Math.sin(theta1) -
                 m2 * g * Math.sin(theta1 - 2 * theta2) -
                 2 * Math.sin(delta) * m2 * (omega2 * omega2 * l2 + omega1 * omega1 * l1 * Math.cos(delta));
    const alpha1 = num1 / den1;

    const den2 = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * delta));
    const num2 = 2 * Math.sin(delta) * (
                 omega1 * omega1 * l1 * (m1 + m2) +
                 g * (m1 + m2) * Math.cos(theta1) +
                 omega2 * omega2 * l2 * m2 * Math.cos(delta));
    const alpha2 = num2 / den2;

    return {
      dTheta1: omega1,
      dTheta2: omega2,
      dOmega1: alpha1,
      dOmega2: alpha2
    };
  }

  rk4Step(state, dt) {
    const k1 = this.derivatives(state);

    const s2 = {
      theta1: state.theta1 + 0.5 * dt * k1.dTheta1,
      theta2: state.theta2 + 0.5 * dt * k1.dTheta2,
      omega1: state.omega1 + 0.5 * dt * k1.dOmega1,
      omega2: state.omega2 + 0.5 * dt * k1.dOmega2
    };
    const k2 = this.derivatives(s2);

    const s3 = {
      theta1: state.theta1 + 0.5 * dt * k2.dTheta1,
      theta2: state.theta2 + 0.5 * dt * k2.dTheta2,
      omega1: state.omega1 + 0.5 * dt * k2.dOmega1,
      omega2: state.omega2 + 0.5 * dt * k2.dOmega2
    };
    const k3 = this.derivatives(s3);

    const s4 = {
      theta1: state.theta1 + dt * k3.dTheta1,
      theta2: state.theta2 + dt * k3.dTheta2,
      omega1: state.omega1 + dt * k3.dOmega1,
      omega2: state.omega2 + dt * k3.dOmega2
    };
    const k4 = this.derivatives(s4);

    return {
      theta1: state.theta1 + (dt / 6) * (k1.dTheta1 + 2 * k2.dTheta1 + 2 * k3.dTheta1 + k4.dTheta1),
      theta2: state.theta2 + (dt / 6) * (k1.dTheta2 + 2 * k2.dTheta2 + 2 * k3.dTheta2 + k4.dTheta2),
      omega1: state.omega1 + (dt / 6) * (k1.dOmega1 + 2 * k2.dOmega1 + 2 * k3.dOmega1 + k4.dOmega1),
      omega2: state.omega2 + (dt / 6) * (k1.dOmega2 + 2 * k2.dOmega2 + 2 * k3.dOmega2 + k4.dOmega2)
    };
  }

  precomputeTrajectories() {
    // 摆 1 (白)
    let s1 = { theta1: Math.PI / 2, theta2: Math.PI / 2, omega1: 0, omega2: 0 };
    // 摆 2 (红)：初始角仅相差 0.001°
    const diffRad = (0.001 * Math.PI) / 180.0;
    let s2 = { theta1: Math.PI / 2 + diffRad, theta2: Math.PI / 2, omega1: 0, omega2: 0 };

    const steps = Math.ceil(this.maxSimulationTime / this.dt);
    const integrationSubsteps = Math.round(this.dt / this.integrationDt);
    for (let i = 0; i <= steps; i++) {
      const t = i * this.dt;

      const p1_x1 = this.l1 * Math.sin(s1.theta1);
      const p1_y1 = -this.l1 * Math.cos(s1.theta1);
      const p1_x2 = p1_x1 + this.l2 * Math.sin(s1.theta2);
      const p1_y2 = p1_y1 - this.l2 * Math.cos(s1.theta2);

      const p2_x1 = this.l1 * Math.sin(s2.theta1);
      const p2_y1 = -this.l1 * Math.cos(s2.theta1);
      const p2_x2 = p2_x1 + this.l2 * Math.sin(s2.theta2);
      const p2_y2 = p2_y1 - this.l2 * Math.cos(s2.theta2);

      this.history1.push({ t, p1: [p1_x1, p1_y1], p2: [p1_x2, p1_y2] });
      this.history2.push({ t, p1: [p2_x1, p2_y1], p2: [p2_x2, p2_y2] });

      for (let substep = 0; substep < integrationSubsteps; substep++) {
        s1 = this.rk4Step(s1, this.integrationDt);
        s2 = this.rk4Step(s2, this.integrationDt);
      }
    }
  }

  initVisuals() {
    this.pivot = new THREE.Vector3(0, 1.3, 0);

    // 背景 CHAOS 极暗水印字样
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.font = '900 180px "JetBrains Mono", sans-serif';
    ctx.strokeStyle = 'rgba(210, 218, 228, 0.065)';
    ctx.lineWidth = 1.2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('CHAOS', 512, 256);
    const bgTex = new THREE.CanvasTexture(canvas);
    bgTex.colorSpace = THREE.SRGBColorSpace;
    this.bgMat = new THREE.MeshBasicMaterial({ map: bgTex, transparent: true, opacity: 0.8, depthWrite: false });
    const bgPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 8),
      this.bgMat
    );
    bgPlane.position.set(0, 0.5, -2.0);
    this.group.add(bgPlane);

    // 用带解析柔边的屏幕空间 ribbon，避免 WebGL 原生线宽固定为一个设备像素。
    this.rodPos1 = new Float32Array(3 * 3);
    this.rodPos2 = new Float32Array(3 * 3);
    this.rod1 = this.createRibbon(3, 0xe8edf1, 2.6);
    this.rod2 = this.createRibbon(3, 0xd95740, 2.6);
    this.rodMat1 = this.rod1.material;
    this.rodMat2 = this.rod2.material;
    this.group.add(this.rod1, this.rod2);

    // 关节小球
    const jointGeo = new THREE.SphereGeometry(0.035, 16, 16);
    this.ballPivot = new THREE.Mesh(jointGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
    this.ballPivot.position.copy(this.pivot);
    this.ballPivot.scale.setScalar(0.7);
    this.group.add(this.ballPivot);

    this.ball1_1 = new THREE.Mesh(jointGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
    this.ball1_2 = new THREE.Mesh(jointGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
    this.group.add(this.ball1_1, this.ball1_2);

    this.ball2_1 = new THREE.Mesh(jointGeo, new THREE.MeshBasicMaterial({ color: 0xd95740, transparent: true }));
    this.ball2_2 = new THREE.Mesh(jointGeo, new THREE.MeshBasicMaterial({ color: 0xd95740, transparent: true }));
    this.group.add(this.ball2_1, this.ball2_2);

    // 尾迹仍使用完整 2.4 秒物理历史；仅改变栅格化和柔光，不平滑或改写轨迹。
    this.maxTrailPoints = 1200;
    this.trailPos1 = new Float32Array(this.maxTrailPoints * 3);
    this.trailPos2 = new Float32Array(this.maxTrailPoints * 3);
    this.trail1 = this.createRibbon(this.maxTrailPoints, 0xdde4eb, 3.0);
    this.trail2 = this.createRibbon(this.maxTrailPoints, 0xd95740, 3.0);
    this.trailGeo1 = this.trail1.geometry;
    this.trailGeo2 = this.trail2.geometry;
    this.trailMat1 = this.trail1.material;
    this.trailMat2 = this.trail2.material;
    this.group.add(this.trail1, this.trail2);
  }

  createRibbon(pointCount, color, halfWidth) {
    const geometry = new THREE.BufferGeometry();
    for (const name of ['position', 'previous', 'next']) {
      geometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array(pointCount * 6), 3).setUsage(THREE.DynamicDrawUsage));
    }
    geometry.setAttribute('brightness', new THREE.BufferAttribute(new Float32Array(pointCount * 2), 1).setUsage(THREE.DynamicDrawUsage));
    const sides = new Float32Array(pointCount * 2);
    const indices = [];
    for (let i = 0; i < pointCount; i++) {
      sides[i * 2] = -1; sides[i * 2 + 1] = 1;
      if (i < pointCount - 1) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 2, i * 2 + 1, i * 2 + 3);
    }
    geometry.setAttribute('side', new THREE.BufferAttribute(sides, 1));
    geometry.setIndex(indices);
    geometry.setDrawRange(0, 0);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uResolution: { value: new THREE.Vector2(1, 1) },
        uHalfWidth: { value: halfWidth },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: 1 }
      },
      vertexShader: `
        attribute vec3 previous;
        attribute vec3 next;
        attribute float side;
        attribute float brightness;
        uniform vec2 uResolution;
        uniform float uHalfWidth;
        varying float vSide;
        varying float vBrightness;
        void main() {
          vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vec4 prev = projectionMatrix * modelViewMatrix * vec4(previous, 1.0);
          vec4 after = projectionMatrix * modelViewMatrix * vec4(next, 1.0);
          vec2 incoming = (clip.xy / clip.w - prev.xy / prev.w) * uResolution;
          vec2 outgoing = (after.xy / after.w - clip.xy / clip.w) * uResolution;
          if (length(incoming) < 0.00001) incoming = outgoing;
          if (length(outgoing) < 0.00001) outgoing = incoming;
          vec2 beforeDir = incoming / max(length(incoming), 0.00001);
          vec2 afterDir = outgoing / max(length(outgoing), 0.00001);
          vec2 tangent = beforeDir + afterDir;
          if (length(tangent) < 0.00001) tangent = beforeDir;
          tangent /= max(length(tangent), 0.00001);
          vec2 normal = vec2(-tangent.y, tangent.x);
          // 有限 miter 保持转角处杆宽，防止平均切线使折返摆杆逐渐收成点。
          float miter = max(abs(dot(normal, vec2(-beforeDir.y, beforeDir.x))), 0.25);
          clip.xy += normal * side * uHalfWidth * 2.0 / (uResolution * miter) * clip.w;
          gl_Position = clip;
          vSide = side;
          vBrightness = brightness;
        }`,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vSide;
        varying float vBrightness;
        void main() {
          float d = abs(vSide);
          float profile = (0.90 * exp(-14.0 * d * d) + 0.065 * exp(-3.0 * d * d)) * (1.0 - smoothstep(0.82, 1.0, d));
          gl_FragColor = vec4(uColor, profile * vBrightness * uOpacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.onBeforeRender = (renderer, scene, camera) => {
      const resolution = material.uniforms.uResolution.value;
      renderer.getSize(resolution);
      resolution.set(camera.userData.displayWidth ?? resolution.x, camera.userData.displayHeight ?? resolution.y);
    };
    return mesh;
  }

  updateRibbon(mesh, points, count, fade = false) {
    const attributes = mesh.geometry.attributes;
    for (let i = 0; i < count; i++) {
      const previous = Math.max(0, i - 1) * 3;
      const next = Math.min(count - 1, i + 1) * 3;
      const age = i / Math.max(count - 1, 1);
      const brightness = fade ? 0.10 + 0.90 * age * age : 1;
      for (let side = 0; side < 2; side++) {
        const offset = (i * 2 + side) * 3;
        for (let axis = 0; axis < 3; axis++) {
          attributes.position.array[offset + axis] = points[i * 3 + axis];
          attributes.previous.array[offset + axis] = points[previous + axis];
          attributes.next.array[offset + axis] = points[next + axis];
        }
        attributes.brightness.array[i * 2 + side] = brightness;
      }
    }
    for (const name of ['position', 'previous', 'next', 'brightness']) attributes[name].needsUpdate = true;
    mesh.geometry.setDrawRange(0, Math.max(0, count - 1) * 6);
  }

  update(time, opacity) {
    const sceneStart = CHAPTERS[2].start;
    const simTime = Math.min(Math.max(time - sceneStart, 0.0) * this.simulationTimeScale, this.maxSimulationTime);
    const stepIdx = Math.min(Math.floor(simTime / this.dt), this.history1.length - 1);

    const h1 = this.history1[stepIdx];
    const h2 = this.history2[stepIdx];

    const p1_jX = this.pivot.x + h1.p1[0];
    const p1_jY = this.pivot.y + h1.p1[1];
    const p1_tX = this.pivot.x + h1.p2[0];
    const p1_tY = this.pivot.y + h1.p2[1];

    const p2_jX = this.pivot.x + h2.p1[0];
    const p2_jY = this.pivot.y + h2.p1[1];
    const p2_tX = this.pivot.x + h2.p2[0];
    const p2_tY = this.pivot.y + h2.p2[1];

    // 更新连杆 1 顶点缓冲 (零内存分配)
    this.rodPos1[0] = this.pivot.x; this.rodPos1[1] = this.pivot.y; this.rodPos1[2] = this.pivot.z;
    this.rodPos1[3] = p1_jX;        this.rodPos1[4] = p1_jY;        this.rodPos1[5] = 0;
    this.rodPos1[6] = p1_tX;        this.rodPos1[7] = p1_tY;        this.rodPos1[8] = 0;
    this.updateRibbon(this.rod1, this.rodPos1, 3);

    // 更新连杆 2 顶点缓冲 (零内存分配)
    this.rodPos2[0] = this.pivot.x; this.rodPos2[1] = this.pivot.y; this.rodPos2[2] = this.pivot.z;
    this.rodPos2[3] = p2_jX;        this.rodPos2[4] = p2_jY;        this.rodPos2[5] = -0.01;
    this.rodPos2[6] = p2_tX;        this.rodPos2[7] = p2_tY;        this.rodPos2[8] = -0.01;
    this.updateRibbon(this.rod2, this.rodPos2, 3);

    // 更新小球
    this.ball1_1.position.set(p1_jX, p1_jY, 0);
    this.ball1_2.position.set(p1_tX, p1_tY, 0);
    this.ball2_1.position.set(p2_jX, p2_jY, -0.01);
    this.ball2_2.position.set(p2_tX, p2_tY, -0.01);

    // 动态渲染历史尾迹
    const trailSpan = Math.min(stepIdx, this.maxTrailPoints);
    const startStep = Math.max(0, stepIdx - trailSpan);

    for (let i = 0; i < trailSpan; i++) {
      const idx = startStep + i;
      const pt1 = this.history1[idx].p2;
      const pt2 = this.history2[idx].p2;

      this.trailPos1[i * 3 + 0] = this.pivot.x + pt1[0];
      this.trailPos1[i * 3 + 1] = this.pivot.y + pt1[1];
      this.trailPos1[i * 3 + 2] = 0.005;

      this.trailPos2[i * 3 + 0] = this.pivot.x + pt2[0];
      this.trailPos2[i * 3 + 1] = this.pivot.y + pt2[1];
      this.trailPos2[i * 3 + 2] = -0.005;
    }

    this.updateRibbon(this.trail1, this.trailPos1, trailSpan, true);
    this.updateRibbon(this.trail2, this.trailPos2, trailSpan, true);

    // 设置整体透明度
    this.rodMat1.uniforms.uOpacity.value = opacity * 0.95;
    this.rodMat2.uniforms.uOpacity.value = opacity * 0.88;
    this.trailMat1.uniforms.uOpacity.value = opacity * 0.72;
    this.trailMat2.uniforms.uOpacity.value = opacity * 0.65;
    this.bgMat.opacity = opacity * 0.8;
    this.ballPivot.material.opacity = opacity;
    this.ball1_1.material.opacity = opacity;
    this.ball1_2.material.opacity = opacity;
    this.ball2_1.material.opacity = opacity;
    this.ball2_2.material.opacity = opacity;

    this.group.visible = opacity > 0.001;
  }
}

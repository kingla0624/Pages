import * as THREE from 'three';

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
    this.maxSimulationTime = 12.0; // 涵盖 15.5s ~ 25.5s
    this.dt = 0.002; // 高精度积分步长
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

    const steps = Math.floor(this.maxSimulationTime / this.dt);
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

      s1 = this.rk4Step(s1, this.dt);
      s2 = this.rk4Step(s2, this.dt);
    }
  }

  initVisuals() {
    this.pivot = new THREE.Vector3(0, 1.3, 0);

    // 背景 CHAOS 极暗水印字样
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1024, 512);
    ctx.font = '900 180px "JetBrains Mono", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CHAOS', 512, 256);
    const bgTex = new THREE.CanvasTexture(canvas);
    const bgPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 8),
      new THREE.MeshBasicMaterial({ map: bgTex, transparent: true, opacity: 0.8 })
    );
    bgPlane.position.set(0, 0.5, -2.0);
    this.group.add(bgPlane);

    // 摆杆连线与关节
    this.rodMat1 = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2, transparent: true });
    this.rodPos1 = new Float32Array(3 * 3); // 3 个顶点 (pivot, joint, tip) * 3 分量
    this.rodGeo1 = new THREE.BufferGeometry();
    this.rodGeo1.setAttribute('position', new THREE.BufferAttribute(this.rodPos1, 3));
    this.rod1 = new THREE.Line(this.rodGeo1, this.rodMat1);
    this.group.add(this.rod1);

    this.rodMat2 = new THREE.LineBasicMaterial({ color: 0xe63926, linewidth: 2, transparent: true });
    this.rodPos2 = new Float32Array(3 * 3);
    this.rodGeo2 = new THREE.BufferGeometry();
    this.rodGeo2.setAttribute('position', new THREE.BufferAttribute(this.rodPos2, 3));
    this.rod2 = new THREE.Line(this.rodGeo2, this.rodMat2);
    this.group.add(this.rod2);

    // 关节小球
    const jointGeo = new THREE.SphereGeometry(0.06, 16, 16);
    this.ballPivot = new THREE.Mesh(jointGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.ballPivot.position.copy(this.pivot);
    this.group.add(this.ballPivot);

    this.ball1_1 = new THREE.Mesh(jointGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.ball1_2 = new THREE.Mesh(jointGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.group.add(this.ball1_1, this.ball1_2);

    this.ball2_1 = new THREE.Mesh(jointGeo, new THREE.MeshBasicMaterial({ color: 0xe63926 }));
    this.ball2_2 = new THREE.Mesh(jointGeo, new THREE.MeshBasicMaterial({ color: 0xe63926 }));
    this.group.add(this.ball2_1, this.ball2_2);

    // 尾迹轨迹线
    this.maxTrailPoints = 1200;
    this.trailPos1 = new Float32Array(this.maxTrailPoints * 3);
    this.trailGeo1 = new THREE.BufferGeometry();
    this.trailGeo1.setAttribute('position', new THREE.BufferAttribute(this.trailPos1, 3));
    this.trailMat1 = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    this.trail1 = new THREE.Line(this.trailGeo1, this.trailMat1);
    this.group.add(this.trail1);

    this.trailPos2 = new Float32Array(this.maxTrailPoints * 3);
    this.trailGeo2 = new THREE.BufferGeometry();
    this.trailGeo2.setAttribute('position', new THREE.BufferAttribute(this.trailPos2, 3));
    this.trailMat2 = new THREE.LineBasicMaterial({ color: 0xe63926, transparent: true, opacity: 0.85 });
    this.trail2 = new THREE.Line(this.trailGeo2, this.trailMat2);
    this.group.add(this.trail2);
  }

  update(time, opacity) {
    const sceneStart = 15.5;
    const simTime = Math.max(time - sceneStart, 0.0);
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
    this.rodGeo1.attributes.position.needsUpdate = true;

    // 更新连杆 2 顶点缓冲 (零内存分配)
    this.rodPos2[0] = this.pivot.x; this.rodPos2[1] = this.pivot.y; this.rodPos2[2] = this.pivot.z;
    this.rodPos2[3] = p2_jX;        this.rodPos2[4] = p2_jY;        this.rodPos2[5] = -0.01;
    this.rodPos2[6] = p2_tX;        this.rodPos2[7] = p2_tY;        this.rodPos2[8] = -0.01;
    this.rodGeo2.attributes.position.needsUpdate = true;

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

    this.trailGeo1.attributes.position.needsUpdate = true;
    this.trailGeo1.setDrawRange(0, trailSpan);

    this.trailGeo2.attributes.position.needsUpdate = true;
    this.trailGeo2.setDrawRange(0, trailSpan);

    // 设置整体透明度
    this.rodMat1.opacity = opacity;
    this.rodMat2.opacity = opacity;
    this.trailMat1.opacity = opacity * 0.85;
    this.trailMat2.opacity = opacity * 0.85;

    this.group.visible = opacity > 0.001;
  }
}

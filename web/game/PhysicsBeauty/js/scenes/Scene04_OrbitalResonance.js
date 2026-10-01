import * as THREE from 'three';

/**
 * Scene04_OrbitalResonance.js - 天体轨道共振：地金 8:13 周期与五瓣玫瑰线
 * 精确计算开普勒轨道周期比，动态累加地金连线，在空间中绘制五角对称几何花朵
 */
export class Scene04_OrbitalResonance {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Scene04_OrbitalResonance';

    this.rVenus = 2.3;  // 金星轨道半径 (0.723 AU 对应比例)
    this.rEarth = 3.2;  // 地球轨道半径 (1.000 AU 对应比例)

    // 8:13 共振角速度比
    this.omegaEarth = (8.0 / 8.0) * (Math.PI * 2.0); // 8 年 8 圈
    this.omegaVenus = (13.0 / 8.0) * (Math.PI * 2.0); // 8 年 13 圈

    this.maxLines = 1800; // 连线总条数
    this.linesPositions = new Float32Array(this.maxLines * 2 * 3);

    this.initSun();
    this.initOrbits();
    this.initPlanets();
    this.initConnectingLines();
  }

  /**
   * 1. 太阳与日冕柔光
   */
  initSun() {
    // 太阳核心
    const sunGeo = new THREE.SphereGeometry(0.18, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff6ea });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.group.add(this.sun);

    // 日冕平滑径向光晕 (避免方块边缘)
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 5, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255, 240, 200, 0.95)');
    grad.addColorStop(0.2, 'rgba(255, 150, 60, 0.55)');
    grad.addColorStop(0.5, 'rgba(230, 80, 20, 0.15)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const glowTex = new THREE.CanvasTexture(canvas);
    const glowGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const glowMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.sunGlow = new THREE.Mesh(glowGeo, glowMat);
    this.group.add(this.sunGlow);

    // 背景 ORBITS 极暗水印
    const canvasBg = document.createElement('canvas');
    canvasBg.width = 1024;
    canvasBg.height = 512;
    const ctxBg = canvasBg.getContext('2d');
    ctxBg.fillStyle = '#000000';
    ctxBg.fillRect(0, 0, 1024, 512);
    ctxBg.font = '900 160px "JetBrains Mono", sans-serif';
    ctxBg.fillStyle = 'rgba(255, 255, 255, 0.025)';
    ctxBg.textAlign = 'center';
    ctxBg.textBaseline = 'middle';
    ctxBg.fillText('ORBITS', 512, 256);
    const bgTex = new THREE.CanvasTexture(canvasBg);
    const bgPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 8),
      new THREE.MeshBasicMaterial({ map: bgTex, transparent: true, opacity: 0.8, depthWrite: false })
    );
    bgPlane.position.set(0, 0, -0.2);
    this.group.add(bgPlane);
  }

  /**
   * 2. 金星与地球轨道圆环
   */
  initOrbits() {
    const orbitMat = new THREE.LineBasicMaterial({
      color: 0x444450,
      transparent: true,
      opacity: 0.5
    });

    const createCircle = (r) => {
      const pts = [];
      for (let i = 0; i <= 96; i++) {
        const theta = (i / 96) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(theta) * r, Math.sin(theta) * r, 0));
      }
      return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), orbitMat);
    };

    this.orbitVenus = createCircle(this.rVenus);
    this.orbitEarth = createCircle(this.rEarth);
    this.group.add(this.orbitVenus, this.orbitEarth);
  }

  /**
   * 3. 行星小球与引线文字标牌
   */
  initPlanets() {
    const planetGeo = new THREE.SphereGeometry(0.07, 16, 16);

    // 金星
    this.venus = new THREE.Mesh(planetGeo, new THREE.MeshBasicMaterial({ color: 0xffd29d }));
    // 地球
    this.earth = new THREE.Mesh(planetGeo, new THREE.MeshBasicMaterial({ color: 0x88ccff }));

    this.group.add(this.venus, this.earth);

    // 行星文字标牌 Sprite
    const createLabel = (text) => {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 64;
      const x = c.getContext('2d');
      x.font = 'bold 28px "Noto Sans SC", sans-serif';
      x.fillStyle = 'rgba(255, 255, 255, 0.9)';
      x.fillText(text, 10, 42);
      const tex = new THREE.CanvasTexture(c);
      const spMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
      const sp = new THREE.Sprite(spMat);
      sp.scale.set(0.6, 0.3, 1.0);
      return sp;
    };

    this.labelVenus = createLabel('金星');
    this.labelEarth = createLabel('地球');
    this.group.add(this.labelVenus, this.labelEarth);
  }

  /**
   * 4. 动态连线几何体
   */
  initConnectingLines() {
    this.lineGeo = new THREE.BufferGeometry();
    this.lineGeo.setAttribute('position', new THREE.BufferAttribute(this.linesPositions, 3));

    this.lineMat = new THREE.LineBasicMaterial({
      color: 0xdd6644,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });

    this.lines = new THREE.LineSegments(this.lineGeo, this.lineMat);
    this.group.add(this.lines);

    // 一次性预填充满全部连线数据，避免逐帧重复遍历拷贝
    const totalSimYears = 8.0;
    for (let i = 0; i < this.maxLines; i++) {
      const year = (i / this.maxLines) * totalSimYears;
      const angleE = year * this.omegaEarth;
      const angleV = year * this.omegaVenus;

      const baseIdx = i * 6;
      this.linesPositions[baseIdx + 0] = Math.cos(angleE) * this.rEarth;
      this.linesPositions[baseIdx + 1] = Math.sin(angleE) * this.rEarth;
      this.linesPositions[baseIdx + 2] = 0;

      this.linesPositions[baseIdx + 3] = Math.cos(angleV) * this.rVenus;
      this.linesPositions[baseIdx + 4] = Math.sin(angleV) * this.rVenus;
      this.linesPositions[baseIdx + 5] = 0;
    }
    this.lineGeo.attributes.position.needsUpdate = true;
    this.lineGeo.setDrawRange(0, 0);
  }

  update(time, opacity) {
    const sceneStart = 35.5;
    const sceneDuration = 10.0;
    const progress = Math.min(Math.max((time - sceneStart) / sceneDuration, 0.0), 1.0);

    // 对应 8 年时间进展
    const totalYears = 8.0;
    const currentYear = progress * totalYears;

    const angleE = currentYear * this.omegaEarth;
    const angleV = currentYear * this.omegaVenus;

    // 更新行星位置
    const ex = Math.cos(angleE) * this.rEarth;
    const ey = Math.sin(angleE) * this.rEarth;
    this.earth.position.set(ex, ey, 0.01);

    const vx = Math.cos(angleV) * this.rVenus;
    const vy = Math.sin(angleV) * this.rVenus;
    this.venus.position.set(vx, vy, 0.01);

    // 零开销更新连线渲染范围
    const targetLineCount = Math.floor(progress * this.maxLines);
    this.lineGeo.setDrawRange(0, targetLineCount * 2);

    // 更新行星标牌位置与透明度
    this.labelEarth.position.set(ex + 0.35, ey + 0.15, 0.05);
    this.labelVenus.position.set(vx + 0.35, vy + 0.15, 0.05);
    this.labelEarth.material.opacity = opacity * 0.88;
    this.labelVenus.material.opacity = opacity * 0.88;

    // 透明度同步
    this.lineMat.opacity = opacity * 0.38;
    this.sunGlow.material.opacity = opacity * 0.55;

    this.group.visible = opacity > 0.001;
  }
}

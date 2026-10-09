import * as THREE from 'three';
import { getOrbitYears } from '../core/Timeline.js';

/**
 * Scene04_OrbitalResonance.js - 天体轨道共振：地金 8:13 周期与五瓣玫瑰线
 * 用接近地金周期的理想 8:13 比值，动态累加连线，展示五瓣近共振几何
 */
export class Scene04_OrbitalResonance {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Scene04_OrbitalResonance';

    this.rEarth = 3.2;  // 地球轨道半径 (1.000 AU 对应比例)
    this.rVenus = this.rEarth * Math.pow(8 / 13, 2 / 3); // 理想 8:13 周期对应的 Kepler 半径

    // 8:13 共振角速度比
    this.omegaEarth = (8.0 / 8.0) * (Math.PI * 2.0); // 8 年 8 圈
    this.omegaVenus = (13.0 / 8.0) * (Math.PI * 2.0); // 8 年 13 圈

    this.maxLines = 600; // 保留五瓣细节，让单条连线与暗部空隙仍可辨认
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
    const sunGeo = new THREE.SphereGeometry(0.045, 24, 24);
    this.sunMat = new THREE.MeshBasicMaterial({ color: 0xfff6ea, transparent: true });
    this.sun = new THREE.Mesh(sunGeo, this.sunMat);
    this.group.add(this.sun);

    // 日冕平滑径向光晕 (避免方块边缘)
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 5, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255, 245, 224, 0.95)');
    grad.addColorStop(0.12, 'rgba(255, 193, 135, 0.65)');
    grad.addColorStop(0.35, 'rgba(206, 115, 65, 0.19)');
    grad.addColorStop(0.65, 'rgba(116, 60, 36, 0.035)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const glowTex = new THREE.CanvasTexture(canvas);
    glowTex.colorSpace = THREE.SRGBColorSpace;
    const glowGeo = new THREE.PlaneGeometry(2.6, 2.6);
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
    ctxBg.font = '900 160px "JetBrains Mono", sans-serif';
    ctxBg.strokeStyle = 'rgba(210, 218, 228, 0.065)';
    ctxBg.lineWidth = 1.2;
    ctxBg.textAlign = 'center';
    ctxBg.textBaseline = 'middle';
    ctxBg.strokeText('ORBITS', 512, 256);
    const bgTex = new THREE.CanvasTexture(canvasBg);
    bgTex.colorSpace = THREE.SRGBColorSpace;
    this.bgMat = new THREE.MeshBasicMaterial({ map: bgTex, transparent: true, opacity: 0.8, depthWrite: false });
    const bgPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 8),
      this.bgMat
    );
    bgPlane.position.set(0, 0, -0.2);
    this.group.add(bgPlane);
  }

  /**
   * 2. 金星与地球轨道圆环
   */
  initOrbits() {
    this.orbitMat = new THREE.LineBasicMaterial({
      color: 0x767880,
      transparent: true,
      opacity: 0.5
    });

    const createCircle = (r) => {
      const pts = [];
      for (let i = 0; i <= 96; i++) {
        const theta = (i / 96) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(theta) * r, Math.sin(theta) * r, 0));
      }
      return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), this.orbitMat);
    };

    this.orbitVenus = createCircle(this.rVenus);
    this.orbitEarth = createCircle(this.rEarth);
    this.group.add(this.orbitVenus, this.orbitEarth);
  }

  /**
   * 3. 行星小球与引线文字标牌
   */
  initPlanets() {
    const planetGeo = new THREE.SphereGeometry(0.035, 16, 16);

    // 金星
    this.venusMat = new THREE.MeshBasicMaterial({ color: 0xffeee2, transparent: true });
    this.venus = new THREE.Mesh(planetGeo, this.venusMat);
    // 地球
    this.earthMat = new THREE.MeshBasicMaterial({ color: 0xe2edf3, transparent: true });
    this.earth = new THREE.Mesh(planetGeo, this.earthMat);

    this.group.add(this.venus, this.earth);

    // 行星文字标牌 Sprite
    const createLabel = (text) => {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 64;
      const x = c.getContext('2d');
      x.font = '500 24px "Noto Sans SC", sans-serif';
      x.fillStyle = 'rgba(255, 255, 255, 0.9)';
      x.fillText(text, 10, 42);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
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
    const colors = new Float32Array(this.maxLines * 2 * 3);
    this.lineGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.25,
      depthWrite: false
    });

    this.lines = new THREE.LineSegments(this.lineGeo, this.lineMat);
    this.group.add(this.lines);

    // 一次性预填充满全部连线数据，避免逐帧重复遍历拷贝
    const totalSimYears = 8.0;
    const coolColor = new THREE.Color(0x999da7);
    const warmColor = new THREE.Color(0xb87558);
    const lineColor = new THREE.Color();
    for (let i = 0; i < this.maxLines; i++) {
      const year = (i / (this.maxLines - 1)) * totalSimYears;
      const angleE = year * this.omegaEarth;
      const angleV = year * this.omegaVenus;

      const baseIdx = i * 6;
      this.linesPositions[baseIdx + 0] = Math.cos(angleE) * this.rEarth;
      this.linesPositions[baseIdx + 1] = Math.sin(angleE) * this.rEarth;
      this.linesPositions[baseIdx + 2] = 0;

      this.linesPositions[baseIdx + 3] = Math.cos(angleV) * this.rVenus;
      this.linesPositions[baseIdx + 4] = Math.sin(angleV) * this.rVenus;
      this.linesPositions[baseIdx + 5] = 0;

      // 以低饱和暖色点缀冷灰连线，避免多次叠加变成实心橙盘。
      const warmth = 0.5 + 0.5 * Math.sin(i * 0.63);
      lineColor.copy(coolColor).lerp(warmColor, warmth * warmth);
      colors[baseIdx + 0] = colors[baseIdx + 3] = lineColor.r;
      colors[baseIdx + 1] = colors[baseIdx + 4] = lineColor.g;
      colors[baseIdx + 2] = colors[baseIdx + 5] = lineColor.b;
    }
    this.lineGeo.attributes.position.needsUpdate = true;
    this.lineGeo.setDrawRange(0, 0);
  }

  update(time, opacity) {
    // 对应 8 年时间进展
    const currentYear = getOrbitYears(time);
    const progress = currentYear / 8;
    this.currentYear = currentYear;

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
    this.labelEarth.position.set(ex + 0.28, ey + 0.14, 0.05);
    this.labelVenus.position.set(vx + 0.28, vy + 0.14, 0.05);
    this.labelEarth.material.opacity = opacity * 0.88;
    this.labelVenus.material.opacity = opacity * 0.88;

    // 透明度同步
    this.sunMat.opacity = opacity;
    this.venusMat.opacity = opacity;
    this.earthMat.opacity = opacity;
    this.orbitMat.opacity = opacity * 0.28;
    this.bgMat.opacity = opacity * 0.8;
    this.lineMat.opacity = opacity * 0.25;
    this.sunGlow.material.opacity = opacity * 0.75;

    this.group.visible = opacity > 0.001;
  }
}

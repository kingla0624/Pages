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

    this.maxLines = 320; // 保留完整八年五瓣结构，同时给历史连线留下可辨认的暗部空隙
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

    // 标签字号按最终电影画幅的 CSS 像素保持 20px，不随镜头退远而缩成线网噪点。
    const createLabel = (text, avoidLabel = null) => {
      const c = document.createElement('canvas');
      c.width = 192;
      c.height = 96;
      const x = c.getContext('2d');
      x.font = '600 40px "Noto Sans SC", sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.lineJoin = 'round';
      x.strokeStyle = 'rgba(0, 0, 0, 0.95)';
      x.lineWidth = 7;
      x.shadowColor = 'rgba(0, 0, 0, 0.9)';
      x.shadowBlur = 9;
      x.strokeText(text, 96, 48);
      x.shadowBlur = 0;
      x.fillStyle = 'rgba(255, 255, 255, 0.95)';
      x.fillText(text, 96, 48);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const spMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false });
      const sp = new THREE.Sprite(spMat);
      sp.userData.anchor = new THREE.Vector3();
      sp.renderOrder = 10;
      sp.frustumCulled = false;
      const size = new THREE.Vector2();
      const viewPosition = new THREE.Vector3();
      const projectedAnchor = new THREE.Vector3();
      const otherAnchor = new THREE.Vector3();
      sp.onBeforeRender = (renderer, scene, camera) => {
        renderer.getSize(size);
        const height = camera.userData.displayHeight ?? size.y;
        const width = camera.userData.displayWidth ?? size.x;
        viewPosition.copy(sp.userData.anchor).applyMatrix4(camera.matrixWorldInverse);
        const unitsPerPixel = 2 * Math.abs(viewPosition.z) / (camera.projectionMatrix.elements[5] * height);
        const scale = 20 / 40 * unitsPerPixel;
        sp.scale.set(c.width * scale, c.height * scale, 1);
        sp.position.copy(sp.userData.anchor);
        const direction = sp.userData.anchor.x >= 0 ? 1 : -1;
        const cameraAxes = camera.matrixWorld.elements;
        let verticalOffset = 15;
        if (avoidLabel) {
          projectedAnchor.copy(sp.userData.anchor).project(camera);
          otherAnchor.copy(avoidLabel.userData.anchor).project(camera);
          if (Math.abs(projectedAnchor.x - otherAnchor.x) * width / 2 < 80 &&
              Math.abs(projectedAnchor.y - otherAnchor.y) * height / 2 < 40) verticalOffset = -18;
        }
        for (let axis = 0; axis < 3; axis++) {
          sp.position.setComponent(axis, sp.position.getComponent(axis) + unitsPerPixel *
            (direction * 36 * cameraAxes[axis] + verticalOffset * cameraAxes[axis + 4]));
        }
        // 保持字形在画幅内；窄屏中邻近标签分置上下，不牺牲固定字号。
        projectedAnchor.copy(sp.position).project(camera);
        const safeX = Math.max(0, 1 - 60 / width);
        const safeY = Math.max(0, 1 - 50 / height);
        const offsetX = (THREE.MathUtils.clamp(projectedAnchor.x, -safeX, safeX) - projectedAnchor.x) * width / 2;
        const offsetY = (THREE.MathUtils.clamp(projectedAnchor.y, -safeY, safeY) - projectedAnchor.y) * height / 2;
        for (let axis = 0; axis < 3; axis++) {
          sp.position.setComponent(axis, sp.position.getComponent(axis) + unitsPerPixel *
            (offsetX * cameraAxes[axis] + offsetY * cameraAxes[axis + 4]));
        }
        sp.updateMatrixWorld();
      };
      return sp;
    };

    this.labelVenus = createLabel('金星');
    this.labelEarth = createLabel('地球', this.labelVenus);
    this.group.add(this.labelVenus, this.labelEarth);
  }

  /**
   * 4. 动态连线几何体
   */
  initConnectingLines() {
    // 每根连线用四顶点 ribbon，解析柔边提供可控的 CSS 线宽和微弱光晕。
    this.lineGeo = new THREE.BufferGeometry();
    const starts = new Float32Array(this.maxLines * 4 * 3);
    const ends = new Float32Array(this.maxLines * 4 * 3);
    const positions = new Float32Array(this.maxLines * 4 * 3);
    const colors = new Float32Array(this.maxLines * 4 * 3);
    const sides = new Float32Array(this.maxLines * 4);
    const lineIndices = new Float32Array(this.maxLines * 4);
    const indices = [];
    this.lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.lineGeo.setAttribute('segmentStart', new THREE.BufferAttribute(starts, 3));
    this.lineGeo.setAttribute('segmentEnd', new THREE.BufferAttribute(ends, 3));
    this.lineGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.lineGeo.setAttribute('side', new THREE.BufferAttribute(sides, 1));
    this.lineGeo.setAttribute('lineIndex', new THREE.BufferAttribute(lineIndices, 1));
    this.lineMat = new THREE.ShaderMaterial({
      uniforms: {
        uResolution: { value: new THREE.Vector2(1, 1) },
        uHalfWidth: { value: 1.8 },
        uOpacity: { value: 0.20 },
        uLineCount: { value: 0 }
      },
      vertexShader: `
        attribute vec3 segmentStart;
        attribute vec3 segmentEnd;
        attribute vec3 color;
        attribute float side;
        attribute float lineIndex;
        uniform vec2 uResolution;
        uniform float uHalfWidth;
        varying vec3 vColor;
        varying float vSide;
        varying float vLineIndex;
        void main() {
          vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vec4 start = projectionMatrix * modelViewMatrix * vec4(segmentStart, 1.0);
          vec4 end = projectionMatrix * modelViewMatrix * vec4(segmentEnd, 1.0);
          vec2 delta = (end.xy / end.w - start.xy / start.w) * uResolution;
          vec2 normal = vec2(-delta.y, delta.x) / max(length(delta), 0.00001);
          clip.xy += normal * side * uHalfWidth * 2.0 / uResolution * clip.w;
          gl_Position = clip;
          vColor = color;
          vSide = side;
          vLineIndex = lineIndex;
        }`,
      fragmentShader: `
        uniform float uOpacity;
        uniform float uLineCount;
        varying vec3 vColor;
        varying float vSide;
        varying float vLineIndex;
        void main() {
          float d = abs(vSide);
          float profile = (0.90 * exp(-14.0 * d * d) + 0.055 * exp(-3.0 * d * d)) * (1.0 - smoothstep(0.82, 1.0, d));
          float age = max(0.0, uLineCount - 1.0 - vLineIndex);
          // 历史保持暗灰，刚画出的连线轻微提亮；全八年的五瓣几何仍完整保留。
          float emphasis = 0.52 + 0.75 * exp(-age / 4.0);
          gl_FragColor = vec4(vColor, profile * emphasis * uOpacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide
    });
    this.lines = new THREE.Mesh(this.lineGeo, this.lineMat);
    this.lines.frustumCulled = false;
    this.lines.onBeforeRender = (renderer, scene, camera) => {
      const resolution = this.lineMat.uniforms.uResolution.value;
      renderer.getSize(resolution);
      resolution.set(camera.userData.displayWidth ?? resolution.x, camera.userData.displayHeight ?? resolution.y);
    };
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
      for (let vertex = 0; vertex < 4; vertex++) {
        const offset = (i * 4 + vertex) * 3;
        starts.set(this.linesPositions.subarray(baseIdx, baseIdx + 3), offset);
        ends.set(this.linesPositions.subarray(baseIdx + 3, baseIdx + 6), offset);
        positions.set(vertex < 2 ? this.linesPositions.subarray(baseIdx, baseIdx + 3) : this.linesPositions.subarray(baseIdx + 3, baseIdx + 6), offset);
        colors.set([lineColor.r, lineColor.g, lineColor.b], offset);
        sides[i * 4 + vertex] = vertex % 2 === 0 ? -1 : 1;
        lineIndices[i * 4 + vertex] = i;
      }
      const vertex = i * 4;
      indices.push(vertex, vertex + 1, vertex + 2, vertex + 2, vertex + 1, vertex + 3);
    }
    this.lineGeo.setIndex(indices);
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
    this.lineGeo.setDrawRange(0, targetLineCount * 6);
    this.lineMat.uniforms.uLineCount.value = targetLineCount;

    // 更新行星标牌位置与透明度
    this.labelEarth.userData.anchor.set(ex, ey, 0.05);
    this.labelVenus.userData.anchor.set(vx, vy, 0.05);
    this.labelEarth.material.opacity = opacity * 0.88;
    this.labelVenus.material.opacity = opacity * 0.88;

    // 透明度同步
    this.sunMat.opacity = opacity;
    this.venusMat.opacity = opacity;
    this.earthMat.opacity = opacity;
    this.orbitMat.opacity = opacity * 0.28;
    this.bgMat.opacity = opacity * 0.8;
    this.lineMat.uniforms.uOpacity.value = opacity * 0.20;
    this.sunGlow.material.opacity = opacity * 0.75;

    this.group.visible = opacity > 0.001;
  }
}

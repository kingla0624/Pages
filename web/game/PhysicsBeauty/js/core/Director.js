import * as THREE from 'three';
import { Scene00_Planck } from '../scenes/Scene00_Planck.js';
import { Scene01_DoubleSlit } from '../scenes/Scene01_DoubleSlit.js';
import { Scene02_DoublePendulum } from '../scenes/Scene02_DoublePendulum.js';
import { Scene03_GravitationalWaves } from '../scenes/Scene03_GravitationalWaves.js';
import { Scene04_OrbitalResonance } from '../scenes/Scene04_OrbitalResonance.js';
import { Scene05_CosmicWeb } from '../scenes/Scene05_CosmicWeb.js';
import { Scene06_EventHorizon } from '../scenes/Scene06_EventHorizon.js';
import { CHAPTERS, getChapterProgress, getTransitionState, smoothstep } from './Timeline.js';
import { SceneTransition } from './SceneTransition.js';

/**
 * Director.js - 共享时间轴的场景机位与画框转场
 */
export class Director {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    // 实例化各子场景
    this.s0_planck = new Scene00_Planck();
    this.s1_doubleSlit = new Scene01_DoubleSlit();
    this.s2_doublePendulum = new Scene02_DoublePendulum();
    this.s3_gravitationalWaves = new Scene03_GravitationalWaves();
    this.s4_orbits = new Scene04_OrbitalResonance();
    this.s5_cosmicWeb = new Scene05_CosmicWeb();
    this.s6_blackHole = new Scene06_EventHorizon();

    // 挂载到主 Three.js Scene
    this.scene.add(
      this.s0_planck.group,
      this.s1_doubleSlit.group,
      this.s2_doublePendulum.group,
      this.s3_gravitationalWaves.group,
      this.s4_orbits.group,
      this.s5_cosmicWeb.group,
      this.s6_blackHole.group
    );

    this.uniqueScenes = [this.s0_planck, this.s1_doubleSlit, this.s2_doublePendulum,
      this.s3_gravitationalWaves, this.s4_orbits, this.s5_cosmicWeb, this.s6_blackHole];
    this.allScenes = CHAPTERS.map(chapter => ({ ...chapter, inst: this.uniqueScenes[chapter.id === 7 ? 0 : chapter.id] }));
    this.transition = new SceneTransition();
    this.drawTransitionChapter = (id, time, target) => this.renderChapter(this.renderer, id, time, target);

    this.camPos = new THREE.Vector3(0, 0, 5);
    this.lookTarget = new THREE.Vector3();
    this.cosmicFocusTarget = new THREE.Vector3();

    // 漫游终点与切线，按随后 3 秒俯冲的归一化时间换算
    const sinAngle = Math.sin(0.5);
    const cosAngle = Math.cos(0.5);
    const rushAngleRate = 0.5 * 3.0 / 7.0;
    this.cosmicRushStart = new THREE.Vector3(12 * sinAngle, 4.0, 14 * cosAngle);
    this.cosmicRushTangent = new THREE.Vector3(12 * cosAngle * rushAngleRate, 0, -14 * sinAngle * rushAngleRate);
  }

  /**
   * 更新当前章节的场景与机位，转场由合成器单独渲染
   */
  update(time) {
    this.updateCameraPath(time);
    this.updateSceneOpacities(time);
  }

  /** Keep one focal scene active; the compositor draws transition passes separately. */
  updateSceneOpacities(time) {
    this.activateChapter(time, this.getChapterId(time));
  }

  getChapterId(time) {
    return CHAPTERS.find(chapter => time < chapter.end)?.id ?? 7;
  }

  activateChapter(time, id) {
    const active = this.allScenes[id].inst;
    for (const inst of this.uniqueScenes) {
      if (inst !== active && inst.group.visible) inst.update(time, 0);
    }
    active.update(time, 1);
  }

  renderChapter(renderer, id, time, target) {
    this.activateChapter(time, id);
    this.updateCameraPath(time, id);
    renderer.setRenderTarget(target);
    this.allScenes[id].inst.beforeRender?.(renderer, target);
    renderer.render(this.scene, this.camera);
  }

  render(renderer, time) {
    const state = getTransitionState(time);
    this.renderer = renderer;
    try {
      this.transition.render(renderer, state, time, this.drawTransitionChapter, this.getChapterId(time));
    } finally {
      // Retain the clock's scene and camera after both offscreen passes, including seek.
      if (state) this.update(time);
    }
  }

  /**
   * 按章节计算支持重复跳转的相机路径
   */
  updateCameraPath(time, chapterId = this.getChapterId(time)) {
    const camPos = this.camPos;
    const target = this.lookTarget;
    camPos.set(0, 0, 5);
    target.set(0, 0, 0);
    let fov = 45;

    // ==========================================
    // 00 普朗克尺度
    // ==========================================
    if (chapterId === 0) {
      const p = getChapterProgress(0, time);
      camPos.set(0, 0, 4.0 - p * 0.8);
      target.set(0, 0, 0);
      fov = 42;
    }
    // ==========================================
    // 01 双缝干涉
    // ==========================================
    else if (chapterId === 1) {
      const p = getChapterProgress(1, time);
      // 电影感等轴透视俯拍：左前向右后延伸观察地面波纹与探测屏粒子积累
      const camX = -10.4 + p * 0.6;
      const camY = 7.3 - p * 0.5;
      const camZ = -6.4 + p * 0.6;
      camPos.set(camX, camY, camZ);
      target.set(0, 0.35, 3);
      fov = 44;
    }
    // ==========================================
    // 02 混沌双摆
    // ==========================================
    else if (chapterId === 2) {
      const p = getChapterProgress(2, time);
      // 正面观察混沌轨迹，略微慢速呼吸微移
      const distance = 8.3 - p * 0.2;
      const framingX = -1.9;
      camPos.set(framingX + Math.sin(p * 0.8) * 0.14, 0.5, distance);
      target.set(framingX, 0.5, 0);
      fov = 46;
    }
    // ==========================================
    // 03 引力波
    // ==========================================
    else if (chapterId === 3) {
      const p = getChapterProgress(3, time);
      // 电影感倾斜鸟瞰观察三维时空格点与双黑洞俯冲
      const angle = 0.35 + p * 0.45;
      const dist = 9.5 - p * 1.5;
      camPos.set(Math.cos(angle) * dist, 4.5 - p * 0.8, Math.sin(angle) * dist);
      target.set(-0.5, -1.1, 0);
      fov = 50;
    }
    // ==========================================
    // 04 天体轨道
    // ==========================================
    else if (chapterId === 4) {
      const p = getChapterProgress(4, time);
      // 正俯视角稍作三维倾角，俯瞰太阳系金星玫瑰花绽放
      camPos.set(-2.4, 0, 9.2 - p * 0.2);
      target.set(-2.4, 0, 0);
      fov = 52;
    }
    // ==========================================
    // 05 宇宙网
    // ==========================================
    else if (chapterId === 5) {
      const p = getChapterProgress(5, time);
      if (p < 0.7) {
        // 大尺度纤维网漫游
        const slowP = p / 0.7;
        camPos.set(Math.sin(slowP * 0.5) * 12, 4.0, Math.cos(slowP * 0.5) * 14);
        target.set(0, 0, 0);
        fov = 55;
      } else {
        // 向纤维网上的一个真实星系粒子俯冲
        const rushP = (p - 0.7) / 0.3;
        const r2 = rushP * rushP;
        const r3 = r2 * rushP;
        const h00 = 2 * r3 - 3 * r2 + 1;
        const h10 = r3 - 2 * r2 + rushP;
        const h01 = -2 * r3 + 3 * r2;
        const start = this.cosmicRushStart;
        const tangent = this.cosmicRushTangent;
        const focus = this.s5_cosmicWeb.getFocusTarget(time, this.cosmicFocusTarget);
        // Hermite 保持入口位置、速度连续，终点跟随该星系的绝对时间位置。
        camPos.set(
          h00 * start.x + h10 * tangent.x + h01 * focus.x,
          h00 * start.y + h01 * focus.y,
          h00 * start.z + h10 * tangent.z + h01 * (focus.z + 1.2)
        );
        target.copy(focus).multiplyScalar(h01);
        fov = 55 + h01 * 15;
      }
    }
    // ==========================================
    // 06 黑洞视界
    // ==========================================
    else if (chapterId === 6) {
      camPos.set(0, 0, 3.2);
      target.set(0, 0, 0);
      fov = 45;
    }
    // ==========================================
    // 07 尾声
    // ==========================================
    else {
      camPos.set(0, 0, 4.0);
      target.set(0, 0, 0);
      fov = 45;
    }

    // 竖屏把主体完整放在上半画幅，给下方字幕留下独立空间。
    if (this.camera.aspect < 1) {
      const aspect = Math.max(this.camera.aspect, 0.1);
      const halfFovTangent = Math.tan(THREE.MathUtils.degToRad(fov * 0.5));
      if (chapterId === 2 || chapterId === 4) {
        const width = chapterId === 2 ? Math.max(6.6, 11 * aspect) : Math.max(8.4, 14 * aspect);
        const distance = width / (2 * halfFovTangent * aspect);
        const framingY = chapterId === 2 ? -1.25 : -2.4;
        camPos.set(0, framingY, distance);
        target.set(0, framingY, 0);
      } else if (chapterId === 1 || chapterId === 3 || chapterId === 5) {
        // 保留桌面观察角度，让装置和纤维网完整入镜。
        const overview = chapterId === 5 ? 1 - smoothstep(0.7, 1, getChapterProgress(5, time)) : 1;
        const framingAspect = chapterId === 1 ? 2.3 : 16 / 9;
        const fit = 1 + (framingAspect / aspect - 1) * overview;
        camPos.sub(target).multiplyScalar(fit).add(target);
        const waveformRoom = chapterId === 3 && window.innerWidth <= 600
          ? smoothstep(0.48, 0.58, aspect) : 0;
        const upperFraming = chapterId === 3 ? 0.18 + 0.12 * waveformRoom : 0.14;
        const framingY = -2 * camPos.distanceTo(target) * halfFovTangent * upperFraming * overview;
        camPos.y += framingY;
        target.y += framingY;
      }
    }

    this.camera.position.copy(camPos);
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(target);
  }

  onResize(width, height) {
    this.s0_planck.onResize(width, height);
    this.s6_blackHole.onResize(width, height);
    this.transition.drawTitle();
  }
}

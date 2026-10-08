import * as THREE from 'three';
import { Scene00_Planck } from '../scenes/Scene00_Planck.js';
import { Scene01_DoubleSlit } from '../scenes/Scene01_DoubleSlit.js';
import { Scene02_DoublePendulum } from '../scenes/Scene02_DoublePendulum.js';
import { Scene03_GravitationalWaves } from '../scenes/Scene03_GravitationalWaves.js';
import { Scene04_OrbitalResonance } from '../scenes/Scene04_OrbitalResonance.js';
import { Scene05_CosmicWeb } from '../scenes/Scene05_CosmicWeb.js';
import { Scene06_EventHorizon } from '../scenes/Scene06_EventHorizon.js';

/**
 * Director.js - 一镜到底导演系统 (Director & Camera Controller)
 * 编排全片 76 秒相机无缝飞行路径、视场角 (FOV)、场景交叉淡入淡出与生命周期调度
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

    this.allScenes = [
      { id: 0, inst: this.s0_planck, start: 0.0, end: 5.5 },
      { id: 1, inst: this.s1_doubleSlit, start: 5.5, end: 15.5 },
      { id: 2, inst: this.s2_doublePendulum, start: 15.5, end: 25.5 },
      { id: 3, inst: this.s3_gravitationalWaves, start: 25.5, end: 35.5 },
      { id: 4, inst: this.s4_orbits, start: 35.5, end: 45.5 },
      { id: 5, inst: this.s5_cosmicWeb, start: 45.5, end: 55.5 },
      { id: 6, inst: this.s6_blackHole, start: 55.5, end: 67.5 },
      { id: 7, inst: this.s0_planck, start: 67.5, end: 76.0 } // 尾声复用普朗克泡沫
    ];

    this.camPos = new THREE.Vector3(0, 0, 5);
    this.lookTarget = new THREE.Vector3();
  }

  /**
   * 逐帧更新一镜到底相机轨迹与场景透明度
   */
  update(time) {
    this.updateCameraPath(time);
    this.updateSceneOpacities(time);
  }

  /**
   * 计算各场景平滑过渡透明度（采用电影级暗场切镜，避免不同相机视角下的几何体交叉穿透）
   */
  updateSceneOpacities(time) {
    const fadeDuration = 0.35; // 电影级过渡淡入淡出时长

    // 普朗克场景 (含开头与结尾)
    let s0_op = 0;
    if (time <= 5.5) {
      s0_op = time > 5.5 - fadeDuration ? Math.max((5.5 - time) / fadeDuration, 0) : 1.0;
    } else if (time >= 67.5) {
      s0_op = time < 67.5 + fadeDuration ? Math.min((time - 67.5) / fadeDuration, 1) : 1.0;
    }
    this.s0_planck.update(time, s0_op);

    // 01 双缝干涉
    const s1_op = this.calcOpacity(time, 5.5, 15.5, fadeDuration);
    this.s1_doubleSlit.update(time, s1_op);

    // 02 混沌双摆
    const s2_op = this.calcOpacity(time, 15.5, 25.5, fadeDuration);
    this.s2_doublePendulum.update(time, s2_op);

    // 03 引力波
    const s3_op = this.calcOpacity(time, 25.5, 35.5, fadeDuration);
    this.s3_gravitationalWaves.update(time, s3_op);

    // 04 天体轨道
    const s4_op = this.calcOpacity(time, 35.5, 45.5, fadeDuration);
    this.s4_orbits.update(time, s4_op);

    // 05 宇宙网
    const s5_op = this.calcOpacity(time, 45.5, 55.5, fadeDuration);
    this.s5_cosmicWeb.update(time, s5_op);

    // 06 黑洞
    const s6_op = this.calcOpacity(time, 55.5, 67.5, fadeDuration);
    this.s6_blackHole.update(time, s6_op);
  }

  calcOpacity(t, start, end, fade = 0.35) {
    if (t < start || t > end) return 0;
    if (t < start + fade) return (t - start) / fade;
    if (t > end - fade) return (end - t) / fade;
    return 1.0;
  }

  /**
   * 一镜到底相机连续三维运动路径
   */
  updateCameraPath(time) {
    const camPos = this.camPos;
    const target = this.lookTarget;
    camPos.set(0, 0, 5);
    target.set(0, 0, 0);
    let fov = 45;

    // ==========================================
    // 00 普朗克尺度 (0.0s - 5.5s)
    // ==========================================
    if (time < 5.5) {
      const p = time / 5.5;
      camPos.set(0, 0, 4.0 - p * 0.8);
      target.set(0, 0, 0);
      fov = 42;
    }
    // ==========================================
    // 01 双缝干涉 (5.5s - 15.5s)
    // ==========================================
    else if (time >= 5.5 && time < 15.5) {
      const p = (time - 5.5) / 10.0;
      // 电影感等轴透视俯拍：左前向右后延伸观察地面波纹与探测屏粒子积累
      const camX = -3.8 + p * 0.6;
      const camY = 3.8 - p * 0.4;
      const camZ = -1.6 + p * 1.8;
      camPos.set(camX, camY, camZ);
      target.set(0.6, 1.0, 5.2);
      fov = 46;
    }
    // ==========================================
    // 02 混沌双摆 (15.5s - 25.5s)
    // ==========================================
    else if (time >= 15.5 && time < 25.5) {
      const p = (time - 15.5) / 10.0;
      // 正面观察混沌轨迹，略微慢速呼吸微移
      camPos.set(Math.sin(p * 0.8) * 0.6, 0.4, 4.8 - p * 0.3);
      target.set(0, 0.2, 0);
      fov = 45;
    }
    // ==========================================
    // 03 引力波 (25.5s - 35.5s)
    // ==========================================
    else if (time >= 25.5 && time < 35.5) {
      const p = (time - 25.5) / 10.0;
      // 电影感倾斜鸟瞰观察三维时空格点与双黑洞俯冲
      const angle = 0.35 + p * 0.45;
      const dist = 9.5 - p * 1.5;
      camPos.set(Math.cos(angle) * dist, 4.5 - p * 0.8, Math.sin(angle) * dist);
      target.set(0, -0.6, 0);
      fov = 50;
    }
    // ==========================================
    // 04 天体轨道 (35.5s - 45.5s)
    // ==========================================
    else if (time >= 35.5 && time < 45.5) {
      const p = (time - 35.5) / 10.0;
      // 正俯视角稍作三维倾角，俯瞰太阳系金星玫瑰花绽放
      camPos.set(0, -0.2, 7.8 - p * 0.6);
      target.set(0, 0, 0);
      fov = 52;
    }
    // ==========================================
    // 05 宇宙网 (45.5s - 55.5s)
    // ==========================================
    else if (time >= 45.5 && time < 55.5) {
      const p = (time - 45.5) / 10.0;
      if (p < 0.7) {
        // 大尺度纤维网漫游
        const slowP = p / 0.7;
        camPos.set(Math.sin(slowP * 0.5) * 12, 4.0, Math.cos(slowP * 0.5) * 14);
        target.set(0, 0, 0);
        fov = 55;
      } else {
        // 向核心急剧俯冲
        const rushP = (p - 0.7) / 0.3;
        const dist = 14 * Math.pow(1.0 - rushP, 2.0) + 1.2;
        camPos.set(0, 0, dist);
        target.set(0, 0, 0);
        fov = 55 + rushP * 15;
      }
    }
    // ==========================================
    // 06 黑洞视界 (55.5s - 67.5s)
    // ==========================================
    else if (time >= 55.5 && time < 67.5) {
      camPos.set(0, 0, 3.2);
      target.set(0, 0, 0);
      fov = 45;
    }
    // ==========================================
    // 07 尾声 (67.5s - 76.0s)
    // ==========================================
    else {
      camPos.set(0, 0, 4.0);
      target.set(0, 0, 0);
      fov = 45;
    }

    this.camera.position.copy(camPos);
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(target);
  }

  onResize(width, height) {
    this.s0_planck.onResize(width, height);
    this.s6_blackHole.onResize(width, height);
  }
}

import * as THREE from 'three';
import { GlobalClock, CHAPTERS } from './core/Clock.js';
import { HUDController } from './core/HUD.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { Director } from './core/Director.js';

/**
 * main.js - 《物理之美》像素级复刻核心主入口
 * 初始化 WebGL 渲染管线、时间轴、HUD 遥测系统、程序化音效与一镜到底运镜系统
 */

class App {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // 1. 初始化 Three.js 核心三要素
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // 2. 初始化核心子系统
    this.clock = new GlobalClock(76.0);
    this.hud = new HUDController(this.clock);
    this.audio = new AudioEngine();
    this.director = new Director(this.scene, this.camera);

    // 3. 绑定 UI 交互事件
    this.bindEvents();

    // 4. 启动主渲染循环
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  bindEvents() {
    // 窗口尺寸自适应
    window.addEventListener('resize', () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.director.onResize(this.width, this.height);
    });

    // 首次交互解锁 Web Audio 上下文
    const unlockAudio = () => {
      this.audio.init();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    // 播放 / 暂停
    const btnPlayPause = document.getElementById('btn-play-pause');
    btnPlayPause.addEventListener('click', () => {
      this.clock.togglePlay();
      this.syncPlayStateUI();
    });

    // 重播整片
    const btnRestart = document.getElementById('btn-restart');
    btnRestart.addEventListener('click', () => {
      this.clock.seek(0);
      this.clock.play();
      this.syncPlayStateUI();
    });

    // 拖动进度条
    const slider = document.getElementById('timeline-slider');
    slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.clock.seek(val);
    });

    // 声音切换
    const btnAudio = document.getElementById('btn-audio');
    btnAudio.addEventListener('click', () => {
      const isMuted = this.audio.toggleMute();
      btnAudio.classList.toggle('muted', isMuted);
    });

    // 全屏切换按钮
    const toggleFullscreen = () => {
      this.audio.init();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    };

    const btnFullscreen = document.getElementById('btn-fullscreen');
    btnFullscreen.addEventListener('click', toggleFullscreen);

    const btnIntroFs = document.getElementById('btn-intro-fullscreen');
    if (btnIntroFs) {
      btnIntroFs.addEventListener('click', toggleFullscreen);
    }

    document.addEventListener('fullscreenchange', () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.director.onResize(this.width, this.height);
    });

    // 章节快速跳转按钮
    const pills = document.querySelectorAll('.pill-btn');
    pills.forEach((btn) => {
      btn.addEventListener('click', () => {
        const cId = parseInt(btn.getAttribute('data-chapter'), 10);
        this.clock.seekToChapter(cId);
        this.syncPlayStateUI();
      });
    });

    // 键盘快捷键支持 (空格暂停，左右箭头跳进 5 秒，M 静音，F 全屏)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.clock.togglePlay();
        this.syncPlayStateUI();
      } else if (e.code === 'ArrowRight') {
        this.clock.seek(this.clock.currentTime + 5.0);
      } else if (e.code === 'ArrowLeft') {
        this.clock.seek(this.clock.currentTime - 5.0);
      } else if (e.code === 'KeyM') {
        const isMuted = this.audio.toggleMute();
        btnAudio.classList.toggle('muted', isMuted);
      } else if (e.code === 'KeyF') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    });
  }

  syncPlayStateUI() {
    const btnPlayPause = document.getElementById('btn-play-pause');
    btnPlayPause.classList.toggle('playing', this.clock.isPlaying);
  }

  animate() {
    requestAnimationFrame(this.animate);

    // 计算实时渲染帧率
    this.frameCount = (this.frameCount || 0) + 1;
    this.lastFpsUpdate = this.lastFpsUpdate || performance.now();
    const elapsed = performance.now() - this.lastFpsUpdate;
    if (elapsed >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsUpdate = performance.now();
    }

    // 1. 更新主时钟时间
    const time = this.clock.update();

    // 2. 更新 HUD 状态
    this.hud.update(time);

    // 3. 更新音频引擎
    this.audio.update(time, this.clock.currentChapterIndex, this.clock.isPlaying);

    // 4. 更新导演运镜与 3D 物理场景
    this.director.update(time);

    // 5. 渲染输出
    this.renderer.render(this.scene, this.camera);
  }
}

// 页面加载完成后实例化主应用
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

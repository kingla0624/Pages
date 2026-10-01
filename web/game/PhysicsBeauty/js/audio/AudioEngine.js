/**
 * AudioEngine.js - Web Audio 程序化实时音效合成器
 * 零外部音频文件依赖，实时生成电影级低频沉浸音垫 (Sub-bass Drone)、
 * 引力波啁啾声 (LIGO Chirp)、天体共振和弦、双摆破风声与机械 HUD 交互音
 */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.droneGain = null;
    this.droneOsc = null;
    this.chirpPlayed = false;
    this.lastChapterId = -1;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    this.ctx = new AudioContext();

    // 总音量与安全压限器 (Compressor) 防止削波破音
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
    compressor.knee.setValueAtTime(12, this.ctx.currentTime);
    compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

    this.masterGain.connect(compressor);
    compressor.connect(this.ctx.destination);

    // 启动基础环境低音垫 (Cinematic Space Drone)
    this.startDrone();
  }

  startDrone() {
    if (!this.ctx) return;

    // 低音振荡器 48Hz (深沉宇宙嗡鸣)
    this.droneOsc = this.ctx.createOscillator();
    this.droneOsc.type = 'sawtooth';
    this.droneOsc.frequency.setValueAtTime(48, this.ctx.currentTime);

    // 低通滤波器滤除刺耳高频，仅保留温润低频
    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(140, this.ctx.currentTime);
    lpf.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

    this.droneOsc.connect(lpf);
    lpf.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);

    this.droneOsc.start();
  }

  /**
   * 逐帧根据时间轴与场景触发动态音频
   */
  update(time, chapterId, isPlaying = true) {
    if (!this.ctx || this.isMuted) return;

    // 平滑调节背景低音垫增益：播放时维持沉浸 0.25，暂停时柔和衰减至 0.05
    if (this.droneGain) {
      const targetGain = isPlaying ? 0.25 : 0.05;
      this.droneGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.15);
    }

    // 暂停状态下不触发新的离散音效
    if (!isPlaying) return;

    // 章节切换时发出清脆机械 HUD 滴答声
    if (chapterId !== this.lastChapterId) {
      this.playMechanicalClick();
      this.lastChapterId = chapterId;
    }

    // 引力波章节 (25.5s - 35.5s)：在 33.5s ~ 34.5s 触发著名的 LIGO 啁啾扫频 (Chirp)
    if (time >= 33.2 && time <= 34.8) {
      if (!this.chirpPlayed) {
        this.playGravitationalChirp();
        this.chirpPlayed = true;
      }
    } else {
      this.chirpPlayed = false;
    }

    // 轨道共振章节 (35.5s - 45.5s)：轻灵的天体八音盒晶莹脉冲
    if (chapterId === 4 && Math.random() < 0.04) {
      this.playResonanceChime();
    }
  }

  /**
   * 机械 UI 滴答声
   */
  playMechanicalClick() {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  /**
   * 引力波啁啾升频声 (Chirp Waveform: 45Hz -> 360Hz)
   */
  playGravitationalChirp() {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    const duration = 0.9;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(45, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + duration * 0.85);
    osc.frequency.linearRampToValueAtTime(150, now + duration);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.4, now + duration * 0.85);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * 地金共振清脆和弦音 (Pentatonic notes)
   */
  playResonanceChime() {
    if (!this.ctx || this.isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
    const freq = notes[Math.floor(Math.random() * notes.length)];
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.55);
  }

  toggleMute() {
    if (!this.ctx) this.init();
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}

import { CHAPTERS, GW_MODEL, getGravitationalWaveState, smoothstep } from '../core/Timeline.js';

/**
 * AudioEngine.js - Web Audio 程序化实时音效合成器
 * 零外部音频文件依赖，实时生成电影级低频沉浸音垫 (Sub-bass Drone)、
 * 示意啁啾声、天体共振和弦与机械 HUD 交互音
 */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.droneGain = null;
    this.droneOsc = null;
    this.chirpPlayed = false;
    this.chirp = null;
    this.chirpBuffer = null;
    this.lastChapterId = -1;
    this.lastChimeBeat = -1;
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
  update(time, chapterId, isPlaying = true, playbackRate = 1) {
    if (!this.ctx) return;
    if (this.isMuted) {
      this.stopChirp();
      this.chirpPlayed = false;
      return;
    }

    // 平滑调节背景低音垫增益：播放时维持沉浸 0.25，暂停时柔和衰减至 0.05
    if (this.droneGain) {
      const targetGain = (isPlaying ? 0.25 : 0.05) * (1 - smoothstep(74.5, 76, time));
      this.droneGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.15);
    }

    // 暂停状态下不触发新的离散音效
    if (!isPlaying || playbackRate <= 0) {
      this.stopChirp();
      this.chirpPlayed = false;
      return;
    }

    // 章节切换时发出清脆机械 HUD 滴答声
    if (chapterId !== this.lastChapterId) {
      this.playMechanicalClick();
      this.lastChapterId = chapterId;
    }

    // Sonify the shared signal, including its continuous merger and ringdown.
    if (time >= GW_MODEL.startTime && time < CHAPTERS[3].end) {
      const active = this.chirp;
      const expectedTime = active ? active.filmTime
        + (this.ctx.currentTime - active.contextTime) * active.playbackRate : time;
      if (!active || active.playbackRate !== playbackRate || Math.abs(expectedTime - time) > 0.12) {
        this.playGravitationalChirp(time - GW_MODEL.startTime, playbackRate);
        this.chirpPlayed = true;
      }
    } else {
      this.stopChirp();
      this.chirpPlayed = false;
    }

    // A film-time beat has the same cadence at 30, 60, and 120 rendered FPS.
    if (chapterId === 4) {
      const beat = Math.floor((time - CHAPTERS[4].start) / 0.7);
      if (beat !== this.lastChimeBeat) this.playResonanceChime(beat);
      this.lastChimeBeat = beat;
    } else {
      this.lastChimeBeat = -1;
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

  resetTransport() {
    this.stopChirp();
    this.chirpPlayed = false;
    this.lastChimeBeat = -1;
  }

  stopChirp() {
    const active = this.chirp;
    if (!active) return;
    this.chirp = null;
    const now = this.ctx.currentTime;
    active.gain.gain.cancelScheduledValues(now);
    active.gain.gain.setTargetAtTime(0, now, 0.008);
    active.source.stop(now + 0.025);
  }

  /** A 100x frequency sonification, not a detector recording. */
  createChirpBuffer() {
    const duration = CHAPTERS[3].end - GW_MODEL.startTime;
    const buffer = this.ctx.createBuffer(1, Math.ceil(duration * this.ctx.sampleRate), this.ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) {
      const time = GW_MODEL.startTime + i / buffer.sampleRate;
      const state = getGravitationalWaveState(time);
      // A short transport fade prevents a click when this chapter's audio ends.
      const fade = 1 - smoothstep(CHAPTERS[3].end - 0.04, CHAPTERS[3].end, time);
      samples[i] = Math.sin(state.phase * GW_MODEL.audioFrequencyScale)
        * state.amplitude * GW_MODEL.audioGainScale * fade;
    }
    this.chirpBuffer = buffer;
  }

  playGravitationalChirp(elapsed = 0, playbackRate = 1) {
    if (!this.ctx || this.isMuted) return;
    const duration = CHAPTERS[3].end - GW_MODEL.startTime;
    const offset = Math.min(Math.max(elapsed, 0), duration);
    if (offset >= duration || playbackRate <= 0) return;
    this.stopChirp();
    if (!this.chirpBuffer) this.createChirpBuffer();
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    source.buffer = this.chirpBuffer;
    source.playbackRate.setValueAtTime(playbackRate, now);
    gain.gain.setValueAtTime(1, now);

    source.connect(gain);
    gain.connect(this.masterGain);
    this.chirp = { source, gain, filmTime: GW_MODEL.startTime + offset, contextTime: now, playbackRate };
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      if (this.chirp?.source === source) this.chirp = null;
    };

    source.start(now, offset);
    source.stop(now + (duration - offset) / playbackRate);
  }

  /**
   * 地金共振清脆和弦音 (Pentatonic notes)
   */
  playResonanceChime(beat = 0) {
    if (!this.ctx || this.isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
    const freq = notes[((beat % notes.length) + notes.length) % notes.length];
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
    if (this.isMuted) {
      this.stopChirp();
      this.chirpPlayed = false;
    }
    return this.isMuted;
  }
}

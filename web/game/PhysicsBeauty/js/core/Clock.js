/**
 * Clock.js - 核心时间控制器
 * 管理精准 60FPS 帧时间、时码生成 (00:00:SS:FF)、章节阶段状态与对数标尺连续插值
 */

export const CHAPTERS = [
  { id: 0, key: '00', en: 'PLANCK SCALE', cn: '普朗克尺度', start: 0.0, end: 5.5, expStart: -35, expEnd: -35 },
  { id: 1, key: '01', en: 'QUANTUM', cn: '量子', start: 5.5, end: 15.5, expStart: -6, expEnd: -6 },
  { id: 2, key: '02', en: 'CHAOS', cn: '混沌', start: 15.5, end: 25.5, expStart: 0, expEnd: 0 },
  { id: 3, key: '03', en: 'GRAVITATIONAL WAVES', cn: '引力波', start: 25.5, end: 35.5, expStart: 5, expEnd: 5 },
  { id: 4, key: '04', en: 'ORBITS', cn: '轨道', start: 35.5, end: 45.5, expStart: 11, expEnd: 12 },
  { id: 5, key: '05', en: 'COSMIC WEB', cn: '宇宙网', start: 45.5, end: 55.5, expStart: 22, expEnd: 26 },
  { id: 6, key: '06', en: 'EVENT HORIZON', cn: '事件视界', start: 55.5, end: 67.5, expStart: 13, expEnd: 13 },
  { id: 7, key: '00', en: 'PLANCK SCALE', cn: '普朗克尺度', start: 67.5, end: 76.0, expStart: -35, expEnd: -35 }
];

export class GlobalClock {
  constructor(totalDuration = 76.0) {
    this.totalDuration = totalDuration;
    this.currentTime = 0.0;
    this.isPlaying = true;
    this.playbackRate = 1.0;
    this.lastRealTimestamp = performance.now();
    this.currentChapterIndex = 0;
    this.listeners = new Set();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.lastRealTimestamp = performance.now();
        }
      });
    }
  }

  update() {
    const now = performance.now();
    let dt = (now - this.lastRealTimestamp) / 1000.0;
    this.lastRealTimestamp = now;

    // 限制单帧最大步长，防止后台切换或极度卡顿引发数值发散
    if (dt > 0.3) dt = 0.3;

    if (this.isPlaying) {
      this.currentTime += dt * this.playbackRate;
      if (this.currentTime >= this.totalDuration) {
        this.currentTime = this.totalDuration;
        this.isPlaying = false; // 播放完毕停止或循环
      }
    }

    this.updateChapterIndex();
    this.notify();
    return this.currentTime;
  }

  updateChapterIndex() {
    for (let i = 0; i < CHAPTERS.length; i++) {
      const c = CHAPTERS[i];
      const isFinalEnd = i === CHAPTERS.length - 1 && this.currentTime === c.end;
      if (this.currentTime >= c.start && (this.currentTime < c.end || isFinalEnd)) {
        if (this.currentChapterIndex !== i) {
          this.currentChapterIndex = i;
          this.onChapterChange?.(CHAPTERS[i]);
        }
        break;
      }
    }
  }

  getCurrentChapter() {
    return CHAPTERS[this.currentChapterIndex] || CHAPTERS[0];
  }

  /**
   * 计算当前时间点对应的平滑空间尺度对数值 (Exponent in 10^x meters)
   */
  getCurrentScaleExponent() {
    const c = this.getCurrentChapter();
    const progress = Math.min(Math.max((this.currentTime - c.start) / (c.end - c.start), 0.0), 1.0);
    // 平滑插值
    const smoothT = progress * progress * (3 - 2 * progress);
    return c.expStart + (c.expEnd - c.expStart) * smoothT;
  }

  /**
   * 格式化输出电影级时码 00:00:SS:FF (以 60FPS 计)
   */
  getTimecodeString() {
    const totalFrames = Math.floor(this.currentTime * 60);
    const frames = totalFrames % 60;
    const totalSeconds = Math.floor(this.currentTime);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600);

    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
  }

  seek(time) {
    this.currentTime = Math.min(Math.max(time, 0.0), this.totalDuration);
    this.lastRealTimestamp = performance.now();
    this.updateChapterIndex();
    this.notify();
  }

  seekToChapter(chapterId) {
    const target = CHAPTERS.find((c) => c.id === chapterId);
    if (target) {
      this.seek(target.start + 0.05);
    }
  }

  play() {
    this.isPlaying = true;
    this.lastRealTimestamp = performance.now();
  }

  pause() {
    this.isPlaying = false;
  }

  togglePlay() {
    if (this.currentTime >= this.totalDuration) {
      this.seek(0);
      this.play();
    } else {
      this.isPlaying ? this.pause() : this.play();
    }
  }

  addListener(fn) {
    this.listeners.add(fn);
  }

  removeListener(fn) {
    this.listeners.delete(fn);
  }

  notify() {
    for (const fn of this.listeners) {
      fn(this.currentTime, this.currentChapterIndex);
    }
  }
}

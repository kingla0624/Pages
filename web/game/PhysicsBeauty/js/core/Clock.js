/**
 * Clock.js - 核心时间控制器
 * 管理实际播放时间、60 FPS 格式时码、章节阶段与参考尺度连续插值
 */

import { CHAPTERS, getChapterProgress, getTransitionState, smoothstep } from './Timeline.js';
export { CHAPTERS } from './Timeline.js';

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
   * 计算主题参考尺度的平滑对数值 (10^x meters)，不是相机视域测量。
   */
  getCurrentScaleExponent() {
    const c = this.getCurrentChapter();
    const transition = getTransitionState(this.currentTime);
    if (transition) {
      const previous = CHAPTERS[transition.from];
      const next = CHAPTERS[transition.to];
      return previous.expEnd + (next.expStart - previous.expEnd) * smoothstep(0, 1, transition.progress);
    }
    const progress = getChapterProgress(c.id, this.currentTime);
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
    this.onSeek?.(this.currentTime);
    this.notify();
  }

  seekToChapter(chapterId) {
    const target = CHAPTERS.find((c) => c.id === chapterId);
    if (target) {
      // A direct chapter jump should show the new scene after its transition.
      const transition = getTransitionState(target.start);
      this.seek((transition?.end ?? target.start) + 0.05);
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

import { CHAPTERS, MERGER_TIME, getChapterProgress, getGravitationalWaveState, getOrbitYears, smoothstep } from './Timeline.js';

/** Film captions, telemetry and reveal timing, all derived from the playback clock. */
export class HUDController {
  constructor(clock) {
    this.clock = clock;
    const byId = id => document.getElementById(id);
    this.elTimecode = byId('hud-timecode');
    this.elChapterNum = byId('chapter-num');
    this.elChapterEn = byId('chapter-en');
    this.elChapterCn = byId('chapter-cn');
    this.elRulerTrack = byId('ruler-track');
    this.elRulerIndicator = byId('ruler-indicator');
    this.elScaleExp = byId('scale-exp');
    this.elReadoutFormula = byId('readout-formula');
    this.elStrainCanvas = byId('strain-hud-canvas');
    this.strainCtx = this.elStrainCanvas?.getContext('2d');
    this.elTitleCard = byId('title-card');
    this.elIntroEyebrow = byId('intro-eyebrow');
    this.elIntroTitleGroup = byId('intro-title-group');
    this.elIntroSubtitle = byId('intro-subtitle');
    this.elIntroFullscreen = byId('btn-intro-fullscreen');
    this.elSceneCaption = byId('scene-caption');
    this.elCaptionTag = byId('caption-tag');
    this.elCaptionMain = byId('caption-main');
    this.elCaptionSub = byId('caption-sub');
    this.elOrbitCounter = byId('orbit-counter');
    this.elOrbitYearVal = byId('orbit-year-val');
    this.elQuoteCard = byId('quote-card');
    this.elEndCard = byId('end-card');
    this.elTimelineSlider = byId('timeline-slider');
    this.elTimelineProgress = byId('timeline-progress');
    this.elTop = document.querySelector('.hud-top');
    this.elBottom = document.querySelector('.hud-bottom');
    this.elRecDot = document.querySelector('.rec-dot');
    this.filmOverlays = document.querySelectorAll('.film-vignette, .anamorphic-flare');
    this.pillButtons = document.querySelectorAll('.pill-btn');
    this.lastActiveChapterId = -1;
    this.lastRulerExponent = null;
    this.rulerTicks = [];
    this.initRulerTicks();
  }

  initRulerTicks() {
    this.elRulerTrack.innerHTML = '';
    // A local thirty-order window moves continuously with the scale readout.
    for (let exp = -50; exp <= 45; exp++) {
      const major = exp % 5 === 0;
      const tick = document.createElement('div');
      tick.className = `ruler-tick ${major ? 'major' : 'minor'}`;
      this.elRulerTrack.appendChild(tick);
      let label = null;
      if (major) {
        label = document.createElement('span');
        label.className = 'ruler-label';
        label.textContent = exp;
        this.elRulerTrack.appendChild(label);
      }
      this.rulerTicks.push({ exp, tick, label });
    }
    this.elRulerIndicator.style.left = '50%';
  }

  setVisibility(element, opacity) {
    const value = Math.min(Math.max(opacity, 0), 1);
    element.style.opacity = value;
    element.classList.toggle('visible', value > 0.001);
    element.setAttribute('aria-hidden', value > 0.001 ? 'false' : 'true');
  }

  reveal(element, opacity) {
    element.style.opacity = opacity;
    element.style.transform = `translateY(${(1 - opacity) * 7}px)`;
  }

  update(time) {
    this.elTimecode.textContent = this.clock.getTimecodeString();
    const chapter = this.clock.getCurrentChapter();
    this.elChapterNum.textContent = chapter.key;
    this.elChapterEn.textContent = chapter.en;
    this.elChapterCn.textContent = chapter.cn;

    const currentExp = this.clock.getCurrentScaleExponent();
    if (currentExp !== this.lastRulerExponent) {
      for (const { exp, tick, label } of this.rulerTicks) {
        const pct = ((exp - currentExp + 15) / 30) * 100;
        tick.style.display = pct >= 0 && pct <= 100 ? '' : 'none';
        tick.style.left = `${pct}%`;
        if (label) {
          label.style.display = pct > 2 && pct < 98 ? '' : 'none';
          label.style.left = `${pct}%`;
        }
      }
      this.lastRulerExponent = currentExp;
    }
    this.elScaleExp.textContent = Math.round(currentExp);
    this.elTimelineProgress.style.width = `${(time / this.clock.totalDuration) * 100}%`;
    this.elTimelineSlider.value = time;

    if (this.lastActiveChapterId !== chapter.id) {
      this.pillButtons.forEach(btn => btn.classList.toggle('active', Number(btn.dataset.chapter) === chapter.id));
      this.lastActiveChapterId = chapter.id;
    }

    const telemetryOpacity = 1 - smoothstep(67.6, 68.25, time);
    this.elTop.style.opacity = telemetryOpacity;
    this.elBottom.style.opacity = telemetryOpacity;
    this.elRecDot.style.opacity = 0.55 + 0.45 * Math.pow(Math.cos(time * Math.PI / 1.6), 2);
    const endFade = 1 - smoothstep(75, 76, time);
    this.filmOverlays.forEach(element => { element.style.opacity = endFade; });
    this.updateCaptions(time, chapter, endFade);
  }

  updateCaptions(time, chapter, endFade = 1 - smoothstep(75, 76, time)) {
    for (const element of [this.elTitleCard, this.elSceneCaption, this.elOrbitCounter, this.elQuoteCard, this.elEndCard]) {
      this.setVisibility(element, 0);
    }
    this.elReadoutFormula.textContent = '';
    this.elStrainCanvas.style.display = 'none';
    this.elIntroFullscreen.style.pointerEvents = 'none';

    if (chapter.id === 0) {
      // The frame compositor takes over this title at 5.65s without a fade/reappearance.
      const card = time < 5.65 ? smoothstep(0, 0.4, time) : 0;
      this.setVisibility(this.elTitleCard, card);
      this.elIntroEyebrow.style.opacity = 1 - smoothstep(1.45, 1.85, time);
      this.elIntroTitleGroup.style.opacity = smoothstep(1.8, 2.4, time);
      this.elIntroSubtitle.style.opacity = smoothstep(2.4, 3.0, time);
      const prompt = smoothstep(3.4, 4.0, time);
      this.elIntroFullscreen.style.opacity = prompt;
      this.elIntroFullscreen.style.pointerEvents = card * prompt > 0.5 ? 'auto' : 'none';
      return;
    }

    if (chapter.id === 7) {
      const quote = smoothstep(68.3, 69.0, time) * (1 - smoothstep(72.55, 73.0, time));
      const title = smoothstep(73.0, 73.6, time) * endFade;
      this.setVisibility(this.elQuoteCard, quote);
      this.setVisibility(this.elEndCard, title);
      return;
    }

    const elapsed = getChapterProgress(chapter.id, time) * (chapter.end - chapter.start);
    const chapterFade = 1 - smoothstep(chapter.end - 0.7, chapter.end - 0.2, time);
    const tagOpacity = smoothstep(0.8, 1.3, elapsed);
    let mainOpacity = smoothstep(1.5, 2.3, elapsed);
    let subOpacity = smoothstep(7.2, 7.9, elapsed);
    let tag = '';
    let main = '';
    let sub = '';

    if (chapter.id === 1) {
      tag = '01 · DOUBLE SLIT';
      main = '每一个电子，\n都留下一个落点';
      sub = '单个落点不可预测；许多电子，显出波的干涉条纹';
    } else if (chapter.id === 2) {
      tag = '02 · DOUBLE PENDULUM';
      main = '初始角度只差 0.001°，\n轨迹却分道扬镳';
      sub = '确定的方程，对初始条件极度敏感 · 模拟时间 ×2.5';
      subOpacity = smoothstep(6.6, 7.3, elapsed);
    } else if (chapter.id === 3) {
      tag = '03 · GRAVITATIONAL WAVES';
      main = '两个黑洞相撞，\n时空泛起涟漪';
      sub = '2015 年，人类首次直接探测到引力波';
      subOpacity = smoothstep(MERGER_TIME - 0.2, MERGER_TIME + 0.6, time);
      this.elStrainCanvas.style.display = 'block';
      this.elStrainCanvas.style.opacity = chapterFade * tagOpacity;
      this.drawStrainWave(time);
    } else if (chapter.id === 4) {
      tag = '04 · ORBITAL RESONANCE';
      main = '地球 8 圈，金星约 13 圈，\n连线开出一朵五瓣花';
      sub = '接近整数比的周期，留下太阳系的数学几何';
      this.setVisibility(this.elOrbitCounter, tagOpacity * chapterFade);
      this.elOrbitYearVal.textContent = getOrbitYears(time).toFixed(1);
    } else if (chapter.id === 5) {
      tag = '05 · COSMIC WEB';
      if (elapsed < 7.1) {
        main = '每一个光点，\n都是一个星系';
        sub = '可观测宇宙，直径约 930 亿光年';
        mainOpacity *= 1 - smoothstep(6.6, 7.1, elapsed);
        subOpacity = smoothstep(4.8, 5.5, elapsed) * (1 - smoothstep(6.6, 7.1, elapsed));
      } else {
        main = '走近一个星系……';
        sub = '星系中心，可能藏着超大质量黑洞';
        mainOpacity = smoothstep(7.1, 7.7, elapsed);
        subOpacity = smoothstep(8.1, 8.7, elapsed);
      }
    } else if (chapter.id === 6) {
      tag = '06 · EVENT HORIZON';
      if (elapsed < 6.3) {
        main = '连光，\n也无法逃脱';
        sub = '吸积盘的光，在弯曲时空中绕行 · 艺术示意';
        mainOpacity *= 1 - smoothstep(5.8, 6.3, elapsed);
        subOpacity = smoothstep(4.0, 4.7, elapsed) * (1 - smoothstep(5.8, 6.3, elapsed));
      } else {
        main = '2019 年，\n我们看见黑洞的影子';
        sub = 'M87* · 首张图像由毫米波观测重建';
        mainOpacity = smoothstep(6.3, 6.9, elapsed);
        subOpacity = smoothstep(7.4, 8.0, elapsed);
      }
      this.elReadoutFormula.textContent = 'rₛ = 2GM / c²';
    }

    this.setVisibility(this.elSceneCaption, chapterFade * tagOpacity);
    this.elCaptionTag.textContent = tag;
    this.elCaptionMain.textContent = main;
    this.elCaptionSub.textContent = sub;
    this.reveal(this.elCaptionTag, tagOpacity);
    this.reveal(this.elCaptionMain, mainOpacity);
    this.reveal(this.elCaptionSub, subOpacity);
  }

  drawStrainWave(time) {
    if (!this.strainCtx) return;
    const ctx = this.strainCtx;
    const w = this.elStrainCanvas.width;
    const h = this.elStrainCanvas.height;
    const chapter = CHAPTERS[3];
    const duration = chapter.end - chapter.start;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2 + 5);
    ctx.lineTo(w, h / 2 + 5);
    ctx.stroke();
    ctx.fillStyle = '#a66c54';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('STRAIN h(t) · SCHEMATIC', 4, 11);

    ctx.strokeStyle = '#dc8c66';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    const currentX = Math.floor(getChapterProgress(3, time) * (w - 1));
    for (let x = 0; x <= currentX; x++) {
      const sampleTime = chapter.start + (x / (w - 1)) * duration;
      const signal = getGravitationalWaveState(sampleTime);
      const y = h / 2 + 5 - signal.wave * h * 0.32;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

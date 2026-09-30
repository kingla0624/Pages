/**
 * HUD.js - 电影级科幻仪表界面联动控制器
 * 负责时码更新、对数刻度尺滑动定位、字幕状态机以及公式与参数的实时渲染
 */

export class HUDController {
  constructor(clock) {
    this.clock = clock;

    // DOM 元素缓存
    this.elTimecode = document.getElementById('hud-timecode');
    this.elChapterNum = document.getElementById('chapter-num');
    this.elChapterEn = document.getElementById('chapter-en');
    this.elChapterCn = document.getElementById('chapter-cn');
    this.elRulerTrack = document.getElementById('ruler-track');
    this.elRulerIndicator = document.getElementById('ruler-indicator');
    this.elScaleExp = document.getElementById('scale-exp');
    this.elReadoutFormula = document.getElementById('readout-formula');
    this.elStrainCanvas = document.getElementById('strain-hud-canvas');
    this.strainCtx = this.elStrainCanvas ? this.elStrainCanvas.getContext('2d') : null;

    // 卡片与字幕
    this.elTitleCard = document.getElementById('title-card');
    this.elIntroEyebrow = document.getElementById('intro-eyebrow');
    this.elSceneCaption = document.getElementById('scene-caption');
    this.elCaptionTag = document.getElementById('caption-tag');
    this.elCaptionMain = document.getElementById('caption-main');
    this.elCaptionSub = document.getElementById('caption-sub');
    this.elOrbitCounter = document.getElementById('orbit-counter');
    this.elOrbitYearVal = document.getElementById('orbit-year-val');
    this.elQuoteCard = document.getElementById('quote-card');
    this.elEndCard = document.getElementById('end-card');

    // 交互控件
    this.elTimelineSlider = document.getElementById('timeline-slider');
    this.elTimelineProgress = document.getElementById('timeline-progress');
    this.pillButtons = document.querySelectorAll('.pill-btn');

    this.minScaleExp = -35;
    this.maxScaleExp = 26;

    this.initRulerTicks();
  }

  /**
   * 初始化刻度尺的物理刻度与数字标识
   */
  initRulerTicks() {
    this.elRulerTrack.innerHTML = '';
    const majorTicks = [-35, -20, -10, 0, 10, 20, 26];

    // 每 5 个数量级绘制一个刻度
    for (let exp = this.minScaleExp; exp <= this.maxScaleExp; exp += 5) {
      const pct = ((exp - this.minScaleExp) / (this.maxScaleExp - this.minScaleExp)) * 100;
      const tick = document.createElement('div');
      const isMajor = majorTicks.includes(exp);
      tick.className = `ruler-tick ${isMajor ? 'major' : 'minor'}`;
      tick.style.left = `${pct}%`;
      this.elRulerTrack.appendChild(tick);

      if (isMajor) {
        const label = document.createElement('span');
        label.className = 'ruler-label';
        label.style.left = `${pct}%`;
        label.innerText = exp;
        this.elRulerTrack.appendChild(label);
      }
    }
  }

  /**
   * 逐帧同步刷新 HUD
   */
  update(time) {
    // 1. 刷新时码
    this.elTimecode.innerText = this.clock.getTimecodeString();

    // 2. 刷新章节与对数尺度标尺
    const chapter = this.clock.getCurrentChapter();
    this.elChapterNum.innerText = chapter.key;
    this.elChapterEn.innerText = chapter.en;
    this.elChapterCn.innerText = chapter.cn;

    // 3. 计算对数游标位置
    const currentExp = this.clock.getCurrentScaleExponent();
    const clampedExp = Math.min(Math.max(currentExp, this.minScaleExp), this.maxScaleExp);
    const rulerPct = ((clampedExp - this.minScaleExp) / (this.maxScaleExp - this.minScaleExp)) * 100;
    this.elRulerIndicator.style.left = `${rulerPct}%`;

    // 4. 右侧空间尺度读数
    this.elScaleExp.innerText = Math.round(currentExp);

    // 5. 进度条联动
    const progressPct = (time / this.clock.totalDuration) * 100;
    this.elTimelineProgress.style.width = `${progressPct}%`;
    this.elTimelineSlider.value = time;

    // 6. 更新高亮章节按钮
    this.pillButtons.forEach((btn) => {
      const cId = parseInt(btn.getAttribute('data-chapter'), 10);
      btn.classList.toggle('active', cId === chapter.id);
    });

    // 7. 更新各场景动态字幕与特殊指示器
    this.updateCaptions(time, chapter);
  }

  updateCaptions(time, chapter) {
    // 默认关闭所有卡片
    this.elTitleCard.classList.remove('visible');
    this.elSceneCaption.classList.remove('visible');
    this.elOrbitCounter.classList.remove('visible');
    this.elQuoteCard.classList.remove('visible');
    this.elEndCard.classList.remove('visible');
    this.elReadoutFormula.innerText = '';

    // ==========================================
    // 00 PLANCK SCALE (0.0s - 5.5s)
    // ==========================================
    if (time < 5.5) {
      this.elTitleCard.classList.add('visible');
      if (time < 2.0) {
        this.elIntroEyebrow.style.opacity = '1';
      } else {
        this.elIntroEyebrow.style.opacity = '0.3';
      }
      return;
    }

    // ==========================================
    // 01 QUANTUM (5.5s - 15.5s)
    // ==========================================
    if (time >= 5.5 && time < 15.5) {
      this.elSceneCaption.classList.add('visible');
      this.elCaptionTag.innerText = '01 - DOUBLE SLIT';
      this.elCaptionMain.innerText = '每一个电子，都同时穿过了两条缝';
      this.elCaptionSub.innerText = '单个电子随机落下，千万个电子显现出波的条纹';
      return;
    }

    // ==========================================
    // 02 CHAOS (15.5s - 25.5s)
    // ==========================================
    if (time >= 15.5 && time < 25.5) {
      this.elSceneCaption.classList.add('visible');
      this.elCaptionTag.innerText = '02 - DOUBLE PENDULUM';
      this.elCaptionMain.innerText = '初始角度只差 0.001°，几秒后，命运完全不同';
      this.elCaptionSub.innerText = '确定的方程，不可预测的未来——这就是混沌';
      return;
    }

    // ==========================================
    // 03 GRAVITATIONAL WAVES (25.5s - 35.5s)
    // ==========================================
    if (time >= 25.5 && time < 35.5) {
      this.elSceneCaption.classList.add('visible');
      this.elCaptionTag.innerText = '03 - GRAVITATIONAL WAVES';
      this.elCaptionMain.innerText = '13 亿年前，两个黑洞相撞。2015 年，人类听见了时空的涟漪';
      this.elCaptionSub.innerText = '时空度规产生拉伸与压缩，携带引力辐射横跨宇宙';
      if (this.elStrainCanvas) {
        this.elStrainCanvas.style.display = 'block';
        this.drawStrainWave(time);
      }
      return;
    } else {
      if (this.elStrainCanvas) this.elStrainCanvas.style.display = 'none';
    }

    // ==========================================
    // 04 ORBITS (35.5s - 45.5s)
    // ==========================================
    if (time >= 35.5 && time < 45.5) {
      this.elSceneCaption.classList.add('visible');
      this.elOrbitCounter.classList.add('visible');
      this.elCaptionTag.innerText = '04 - ORBITAL RESONANCE';
      this.elCaptionMain.innerText = '地球绕太阳 8 圈，金星恰好 13 圈。它们的连线，开出一朵五瓣花';
      this.elCaptionSub.innerText = '引力与公转周期的近共振，谱写太阳系最浪漫的数学几何';

      // 动态计算年数递增 (1.1 年 ~ 8.7 年)
      const orbitProgress = (time - 35.5) / 10.0;
      const currentYear = (1.1 + orbitProgress * (8.7 - 1.1)).toFixed(1);
      this.elOrbitYearVal.innerText = currentYear;
      return;
    }

    // ==========================================
    // 05 COSMIC WEB (45.5s - 55.5s)
    // ==========================================
    if (time >= 45.5 && time < 55.5) {
      this.elSceneCaption.classList.add('visible');
      this.elCaptionTag.innerText = '05 - COSMIC WEB';
      if (time < 52.5) {
        this.elCaptionMain.innerText = '每一个光点，都是一个星系';
        this.elCaptionSub.innerText = '可观测宇宙：直径约 930 亿光年';
      } else {
        this.elCaptionMain.innerText = '而在每个星系的中心……';
        this.elCaptionSub.innerText = '超大质量引力奇点正在扭曲一切';
      }
      return;
    }

    // ==========================================
    // 06 EVENT HORIZON (55.5s - 67.5s)
    // ==========================================
    if (time >= 55.5 && time < 67.5) {
      this.elSceneCaption.classList.add('visible');
      this.elCaptionTag.innerText = '06 - EVENT HORIZON';
      if (time < 61.5) {
        this.elCaptionMain.innerText = '连光，也无法逃脱';
        this.elCaptionSub.innerText = '引力将光路扭曲成环，形成璀璨的相对论吸积盘';
      } else {
        this.elCaptionMain.innerText = '2019 年·M87* 人类第一次看见了黑洞的影子';
        this.elCaptionSub.innerText = '穿破光子球层与事件视界，走向物理学的极度终局';
      }
      this.elReadoutFormula.innerText = 'rs = 2GM / c²';
      return;
    }

    // ==========================================
    // 07 EPILOGUE (67.5s - 76.0s)
    // ==========================================
    if (time >= 67.5) {
      if (time < 72.0) {
        this.elQuoteCard.classList.add('visible');
      } else {
        this.elEndCard.classList.add('visible');
      }
    }
  }

  drawStrainWave(time) {
    if (!this.strainCtx) return;
    const ctx = this.strainCtx;
    const w = this.elStrainCanvas.width;
    const h = this.elStrainCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // 细浅基线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // 标签 STRAIN h(t)
    ctx.fillStyle = '#e63926';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('STRAIN h(t)', 6, 12);

    // 绘制随时间前进的啁啾动态波形
    const p = Math.min(Math.max((time - 25.5) / 10.0, 0.0), 1.0);
    ctx.strokeStyle = '#e63926';
    ctx.lineWidth = 1.8;
    ctx.beginPath();

    const mergerX = w * 0.82;
    const currentX = p * w;

    for (let x = 0; x < w; x++) {
      if (x > currentX) break;
      let val = 0;
      if (x < mergerX) {
        const tToMerger = Math.max((mergerX - x) / mergerX, 0.02);
        const amp = (1.0 - tToMerger * 0.8) * (h * 0.38);
        const freq = 0.12 / Math.pow(tToMerger, 0.42);
        val = Math.sin(x * freq + time * 12.0) * amp;
      } else {
        const dt = (x - mergerX) / (w - mergerX);
        val = Math.sin(x * 0.4 + time * 6.0) * (h * 0.4) * Math.exp(-dt * 5.0);
      }
      const y = h / 2 - val;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

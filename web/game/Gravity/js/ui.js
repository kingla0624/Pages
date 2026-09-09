/* ======================================
   ui.js - UI Management & Screen Navigation
   ====================================== */

const UI = (() => {
  // DOM references
  const screens = {
    menu: document.getElementById('menu-screen'),
    level: document.getElementById('level-screen'),
    game: document.getElementById('game-screen')
  };

  const overlays = {
    complete: document.getElementById('complete-overlay'),
    fail: document.getElementById('fail-overlay'),
    pause: document.getElementById('pause-overlay')
  };

  const els = {
    btnStart: document.getElementById('btn-start'),
    btnLevels: document.getElementById('btn-levels'),
    btnBackMenu: document.getElementById('btn-back-menu'),
    btnPause: document.getElementById('btn-pause'),
    btnLaunch: document.getElementById('btn-launch'),
    btnReset: document.getElementById('btn-reset'),
    btnNext: document.getElementById('btn-next'),
    btnRetry: document.getElementById('btn-retry'),
    btnToLevels: document.getElementById('btn-to-levels'),
    btnFailRetry: document.getElementById('btn-fail-retry'),
    btnFailLevels: document.getElementById('btn-fail-levels'),
    btnResume: document.getElementById('btn-resume'),
    btnPauseRestart: document.getElementById('btn-pause-restart'),
    btnPauseMenu: document.getElementById('btn-pause-menu'),
    btnTutorialOk: document.getElementById('btn-tutorial-ok'),
    levelGrid: document.getElementById('level-grid'),
    hudLevel: document.getElementById('hud-level'),
    hudWells: document.getElementById('hud-wells'),
    starsDisplay: document.getElementById('stars-display'),
    scoreDetails: document.getElementById('score-details'),
    failReason: document.getElementById('fail-reason'),
    wellStrengthPanel: document.getElementById('well-strength-panel'),
    wellStrength: document.getElementById('well-strength'),
    strengthValue: document.getElementById('strength-value'),
    tutorialTooltip: document.getElementById('tutorial-tooltip'),
    tutorialText: document.getElementById('tutorial-text')
  };

  let onLevelSelect = null;
  let onLaunch = null;
  let onReset = null;
  let onPause = null;
  let onResume = null;
  let onNextLevel = null;
  let onBackToMenu = null;
  let onTutorialDismiss = null;

  function init(callbacks) {
    onLevelSelect = callbacks.onLevelSelect;
    onLaunch = callbacks.onLaunch;
    onReset = callbacks.onReset;
    onPause = callbacks.onPause;
    onResume = callbacks.onResume;
    onNextLevel = callbacks.onNextLevel;
    onBackToMenu = callbacks.onBackToMenu;
    onTutorialDismiss = callbacks.onTutorialDismiss;

    bindEvents();
  }

  function bindEvents() {
    // Menu
    els.btnStart.addEventListener('click', () => {
      AudioManager.click();
      if (onLevelSelect) onLevelSelect(0);
    });

    els.btnLevels.addEventListener('click', () => {
      AudioManager.click();
      showScreen('level');
    });

    els.btnBackMenu.addEventListener('click', () => {
      AudioManager.click();
      showScreen('menu');
    });

    // Game HUD
    els.btnPause.addEventListener('click', () => {
      AudioManager.click();
      if (onPause) onPause();
    });

    els.btnLaunch.addEventListener('click', () => {
      AudioManager.click();
      if (onLaunch) onLaunch();
    });

    els.btnReset.addEventListener('click', () => {
      AudioManager.click();
      if (onReset) onReset();
    });

    // Complete overlay
    els.btnNext.addEventListener('click', () => {
      AudioManager.click();
      hideOverlay('complete');
      if (onNextLevel) onNextLevel();
    });

    els.btnRetry.addEventListener('click', () => {
      AudioManager.click();
      hideOverlay('complete');
      if (onReset) onReset();
    });

    els.btnToLevels.addEventListener('click', () => {
      AudioManager.click();
      hideOverlay('complete');
      showScreen('level');
    });

    // Fail overlay
    els.btnFailRetry.addEventListener('click', () => {
      AudioManager.click();
      hideOverlay('fail');
      if (onReset) onReset();
    });

    els.btnFailLevels.addEventListener('click', () => {
      AudioManager.click();
      hideOverlay('fail');
      showScreen('level');
    });

    // Pause overlay
    els.btnResume.addEventListener('click', () => {
      AudioManager.click();
      hideOverlay('pause');
      if (onResume) onResume();
    });

    els.btnPauseRestart.addEventListener('click', () => {
      AudioManager.click();
      hideOverlay('pause');
      if (onReset) onReset();
    });

    els.btnPauseMenu.addEventListener('click', () => {
      AudioManager.click();
      hideOverlay('pause');
      if (onBackToMenu) onBackToMenu();
      showScreen('menu');
    });

    // Tutorial
    els.btnTutorialOk.addEventListener('click', () => {
      AudioManager.click();
      hideTutorial();
      if (onTutorialDismiss) onTutorialDismiss();
    });

    // Strength slider
    els.wellStrength.addEventListener('input', () => {
      els.strengthValue.textContent = els.wellStrength.value;
    });
  }

  // ===== Screen Management =====
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if (screens[name]) {
      screens[name].classList.add('active');
    }

    // Rebuild level grid when showing level screen
    if (name === 'level') {
      buildLevelGrid();
    }
  }

  // ===== Level Grid =====
  function buildLevelGrid() {
    const progress = LevelManager.loadProgress();
    const levels = LevelManager.getLevels(window.innerWidth, window.innerHeight);
    els.levelGrid.innerHTML = '';

    levels.forEach((level, i) => {
      const card = document.createElement('div');
      card.className = 'level-card';
      const num = i + 1;

      if (num > progress.unlocked) {
        card.classList.add('locked');
      }

      const starCount = progress.stars[i] || 0;
      const starStr = '★'.repeat(starCount) + '☆'.repeat(Math.max(0, 3 - starCount));

      card.innerHTML = `
        <span class="level-number">${num}</span>
        <span class="level-stars">${starStr}</span>
      `;

      if (num <= progress.unlocked) {
        card.addEventListener('click', () => {
          AudioManager.click();
          if (onLevelSelect) onLevelSelect(i);
        });
      }

      els.levelGrid.appendChild(card);
    });
  }

  // ===== Overlays =====
  function showOverlay(name) {
    if (overlays[name]) {
      overlays[name].classList.remove('hidden');
    }
  }

  function hideOverlay(name) {
    if (overlays[name]) {
      overlays[name].classList.add('hidden');
    }
  }

  function hideAllOverlays() {
    Object.values(overlays).forEach(o => o.classList.add('hidden'));
  }

  // ===== HUD Updates =====
  function updateHUD(levelIndex, maxWells, usedWells) {
    els.hudLevel.textContent = `关卡 ${levelIndex + 1}`;

    // Well indicators
    els.hudWells.innerHTML = '';
    for (let i = 0; i < maxWells; i++) {
      const dot = document.createElement('div');
      dot.className = 'well-indicator' + (i < usedWells ? ' used' : '');
      els.hudWells.appendChild(dot);
    }
  }

  // ===== Complete Screen =====
  function showComplete(starCount, details) {
    const stars = els.starsDisplay.querySelectorAll('.star');
    stars.forEach((s, i) => {
      s.textContent = '☆';
      s.classList.remove('earned');
    });

    // Animate stars earning
    for (let i = 0; i < starCount; i++) {
      setTimeout(() => {
        stars[i].textContent = '★';
        stars[i].classList.add('earned');
      }, 300 + i * 400);
    }

    els.scoreDetails.innerHTML = details || '';
    showOverlay('complete');
  }

  // ===== Fail Screen =====
  function showFail(reason) {
    els.failReason.textContent = reason || '星光消散在宇宙中...';
    showOverlay('fail');
  }

  // ===== Pause =====
  function showPause() {
    showOverlay('pause');
  }

  // ===== Tutorial =====
  function showTutorial(text) {
    els.tutorialText.textContent = text;
    els.tutorialTooltip.classList.remove('hidden');
  }

  function hideTutorial() {
    els.tutorialTooltip.classList.add('hidden');
  }

  // ===== Strength Panel =====
  function showStrengthPanel() {
    els.wellStrengthPanel.classList.remove('hidden');
  }

  function hideStrengthPanel() {
    els.wellStrengthPanel.classList.add('hidden');
  }

  function getStrengthValue() {
    return parseInt(els.wellStrength.value, 10);
  }

  function setStrengthValue(val) {
    els.wellStrength.value = val;
    els.strengthValue.textContent = val;
  }

  // ===== Launch Button State =====
  function setLaunchEnabled(enabled) {
    els.btnLaunch.disabled = !enabled;
    els.btnLaunch.style.opacity = enabled ? '1' : '0.4';
    els.btnLaunch.style.pointerEvents = enabled ? 'auto' : 'none';
  }

  return {
    init,
    showScreen,
    buildLevelGrid,
    showOverlay,
    hideOverlay,
    hideAllOverlays,
    updateHUD,
    showComplete,
    showFail,
    showPause,
    showTutorial,
    hideTutorial,
    showStrengthPanel,
    hideStrengthPanel,
    getStrengthValue,
    setStrengthValue,
    setLaunchEnabled
  };
})();

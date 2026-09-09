/* ======================================
   main.js - Game Loop & Core Logic
   ====================================== */

const Game = (() => {
  let canvas;
  let currentLevelIndex = 0;
  let levels = [];
  let level = null;
  let progress = null;
  let wells = [];
  let star = null;
  let phase = 'placing'; // 'placing' | 'flying' | 'complete' | 'fail'
  let paused = false;
  let animFrameId = null;
  let lastTime = 0;

  function init() {
    canvas = document.getElementById('game-canvas');
    Renderer.init(canvas);
    progress = LevelManager.loadProgress();

    UI.init({
      onLevelSelect: startLevel,
      onLaunch: launchStar,
      onReset: resetLevel,
      onPause: pauseGame,
      onResume: resumeGame,
      onNextLevel: nextLevel,
      onBackToMenu: stopGameLoop,
      onTutorialDismiss: () => {}
    });

    // Canvas click to place gravity wells
    canvas.addEventListener('click', handleCanvasClick);

    // Scroll to adjust well strength
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // Window resize
    window.addEventListener('resize', handleResize);

    // Start on menu
    UI.showScreen('menu');
  }

  // ===== Level Management =====
  function startLevel(index) {
    currentLevelIndex = index;
    levels = LevelManager.getLevels(window.innerWidth, window.innerHeight);

    if (index >= levels.length) {
      // No more levels
      UI.showScreen('menu');
      return;
    }

    level = LevelManager.cloneLevel(levels[index]);
    wells = [];
    star = null;
    phase = 'placing';
    paused = false;

    Renderer.clearParticles();
    UI.hideAllOverlays();
    UI.hideTutorial();
    UI.hideStrengthPanel();
    UI.showScreen('game');
    UI.updateHUD(index, level.maxWells, 0);
    UI.setLaunchEnabled(false);

    // Show tutorial if applicable
    if (level.tutorial) {
      UI.showTutorial(level.tutorial);
    }

    startGameLoop();
  }

  function resetLevel() {
    startLevel(currentLevelIndex);
  }

  function nextLevel() {
    startLevel(currentLevelIndex + 1);
  }

  // ===== Interaction =====
  function handleCanvasClick(e) {
    if (phase !== 'placing') return;
    if (paused) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on an existing well to remove it
    for (let i = wells.length - 1; i >= 0; i--) {
      const w = wells[i];
      const dx = x - w.x;
      const dy = y - w.y;
      if (dx * dx + dy * dy < 20 * 20) {
        wells.splice(i, 1);
        UI.updateHUD(currentLevelIndex, level.maxWells, wells.length);
        UI.setLaunchEnabled(wells.length > 0);
        AudioManager.click();
        if (wells.length === 0) {
          UI.hideStrengthPanel();
        }
        return;
      }
    }

    // Place new well if allowed
    if (wells.length < level.maxWells) {
      const strength = UI.getStrengthValue();
      wells.push({ x, y, strength });
      AudioManager.placeWell();
      UI.updateHUD(currentLevelIndex, level.maxWells, wells.length);
      UI.setLaunchEnabled(true);
      UI.showStrengthPanel();
    }
  }

  function handleWheel(e) {
    if (phase !== 'placing') return;
    if (wells.length === 0) return;
    e.preventDefault();

    // Adjust the last placed well's strength
    const lastWell = wells[wells.length - 1];
    const delta = e.deltaY > 0 ? -1 : 1;
    lastWell.strength = Math.max(1, Math.min(10, lastWell.strength + delta));
    UI.setStrengthValue(lastWell.strength);
  }

  function handleResize() {
    Renderer.resize();
    // Regenerate levels for new size (positions depend on canvas size)
    levels = LevelManager.getLevels(window.innerWidth, window.innerHeight);
  }

  // ===== Game Actions =====
  function launchStar() {
    if (phase !== 'placing') return;
    if (wells.length === 0) return;

    phase = 'flying';
    star = {
      x: level.star.x,
      y: level.star.y,
      vx: level.star.vx,
      vy: level.star.vy
    };

    UI.hideStrengthPanel();
    UI.hideTutorial();
    UI.setLaunchEnabled(false);
    AudioManager.launch();
  }

  function pauseGame() {
    if (phase === 'complete' || phase === 'fail') return;
    paused = true;
    UI.showPause();
  }

  function resumeGame() {
    paused = false;
    UI.hideOverlay('pause');
  }

  function stopGameLoop() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  // ===== Game Loop =====
  function startGameLoop() {
    stopGameLoop();
    lastTime = performance.now();
    animFrameId = requestAnimationFrame(gameLoop);
  }

  function gameLoop(timestamp) {
    const rawDt = (timestamp - lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05); // Clamp to avoid spiral of death
    lastTime = timestamp;

    if (!paused && phase === 'flying' && star) {
      updateFlying(dt);
    }

    // Render
    const state = {
      level,
      wells,
      star,
      phase,
    };
    Renderer.render(state, timestamp);

    animFrameId = requestAnimationFrame(gameLoop);
  }

  function updateFlying(dt) {
    // Sub-stepping for accuracy
    const steps = 4;
    const subDt = dt / steps;

    for (let s = 0; s < steps; s++) {
      const prevStar = { ...star };
      const updated = Physics.updateStar(star, wells, subDt);
      star.x = updated.x;
      star.y = updated.y;
      star.vx = updated.vx;
      star.vy = updated.vy;

      // Add trail
      Renderer.addTrailPoint(star.x, star.y);

      // Check collisions
      const event = Physics.checkCollisions(
        star, prevStar, level,
        window.innerWidth, window.innerHeight
      );

      if (event) {
        handleCollisionEvent(event);
        break;
      }
    }
  }

  function handleCollisionEvent(event) {
    switch (event.type) {
      case 'nebula': {
        level.nebulae[event.index].collected = true;
        AudioManager.collectNebula();
        Renderer.burstAt(
          level.nebulae[event.index].x,
          level.nebulae[event.index].y,
          'hsl(190, 90%, 70%)',
          25
        );
        break;
      }

      case 'stardust': {
        level.stardust[event.index].collected = true;
        AudioManager.collectStardust();
        Renderer.burstAt(
          level.stardust[event.index].x,
          level.stardust[event.index].y,
          'hsl(45, 100%, 80%)',
          8
        );
        break;
      }

      case 'blackhole': {
        phase = 'fail';
        AudioManager.blackHole();
        Renderer.burstAt(star.x, star.y, 'hsl(0, 70%, 40%)', 30);
        setTimeout(() => {
          UI.showFail('星光被黑洞吞噬了！');
        }, 800);
        break;
      }

      case 'gate': {
        phase = 'complete';
        AudioManager.enterGate();
        Renderer.burstAt(star.x, star.y, 'hsl(150, 90%, 60%)', 40);

        // Calculate stars
        const stardustTotal = level.stardust.length;
        const stardustCollected = level.stardust.filter(s => s.collected).length;
        const wellsUsed = wells.length;
        const maxWells = level.maxWells;

        let earnedStars = 1; // base: completed
        if (stardustTotal > 0 && stardustCollected >= stardustTotal * 0.5) {
          earnedStars = 2;
        }
        if (wellsUsed <= Math.ceil(maxWells * 0.5) &&
            (stardustTotal === 0 || stardustCollected >= stardustTotal * 0.8)) {
          earnedStars = 3;
        }

        // Save progress
        progress = LevelManager.loadProgress();
        const prevStars = progress.stars[currentLevelIndex] || 0;
        if (earnedStars > prevStars) {
          progress.stars[currentLevelIndex] = earnedStars;
        }
        if (currentLevelIndex + 1 >= progress.unlocked) {
          progress.unlocked = Math.min(currentLevelIndex + 2, levels.length);
        }
        LevelManager.saveProgress(progress);

        const details = `
          <div>星尘: ${stardustCollected} / ${stardustTotal}</div>
          <div>引力井: ${wellsUsed} / ${maxWells}</div>
        `;

        setTimeout(() => {
          UI.showComplete(earnedStars, details);
        }, 600);
        break;
      }

      case 'outofbounds': {
        phase = 'fail';
        AudioManager.fail();
        setTimeout(() => {
          UI.showFail('星光飞出了边界...');
        }, 300);
        break;
      }
    }
  }

  return { init };
})();

// ===== Start everything when DOM is ready =====
document.addEventListener('DOMContentLoaded', () => {
  Game.init();
});

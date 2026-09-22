import { GameState } from "./state.js";
import { AudioManager } from "./audio.js";
import { AquariumScene } from "./scene.js";
import { FoodManager } from "./food.js";
import { DecorationManager } from "./decorations.js";
import { FishManager } from "./fish.js";
import { UIManager } from "./ui.js";

/**
 * Aqura Main Entry Point & Game Loop
 * Features resilient lifecycle handling, background-tab throttling,
 * and unified tick orchestrations across physics, boids, and rendering.
 */

class AquraGame {
  constructor() {
    this.container = document.querySelector("#canvasContainer");
    this.state = new GameState();
    this.audio = new AudioManager();

    this.scene = new AquariumScene(this.container);
    this.food = new FoodManager(this.scene.scene, this.scene.bounds, this.audio, this.state);
    this.decorations = new DecorationManager(this.scene.scene, this.scene.bounds, this.audio);
    this.fish = new FishManager(this.scene.scene, this.scene.bounds, this.audio, this.food, this.state);
    this.ui = new UIManager(this.state, this.audio, this.scene, this.fish, this.food, this.decorations);

    this.lastTime = performance.now();
    this.totalTime = 0;
    this.isRunning = true;
    this.isTabActive = true;

    this.initLifecycle();
    this.initAudioUnlock();
    this.startLoop();
  }

  initLifecycle() {
    // 1. Efficient background processing via Page Visibility
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.isTabActive = false;
        this.audio.suspend();
      } else {
        this.isTabActive = true;
        this.audio.resume();
        this.lastTime = performance.now(); // Avoid giant delta spike upon re-focus
      }
    });

    // 2. Modern Web Guidance: content-visibility auto state change if container is offscreen
    if (this.container) {
      this.container.addEventListener("contentvisibilityautostatechange", (event) => {
        if (event.skipped) {
          this.isRunning = false;
        } else {
          this.isRunning = true;
          this.lastTime = performance.now();
          this.startLoop();
        }
      });
    }

    // 3. Periodic natural ambient bubble emission from bottom sand
    setInterval(() => {
      if (!this.isRunning || !this.isTabActive) return;
      const x = (Math.random() - 0.5) * 14.0;
      const z = (Math.random() - 0.5) * 5.0;
      this.scene.spawnBubble(x, this.scene.bounds.minY + 0.1, z, 0.04 + Math.random() * 0.04);
    }, 400);

    // 4. State auto-save and regular cleanliness & hunger tick
    setInterval(() => {
      if (!this.isRunning || !this.isTabActive) return;
      this.state.tick(1.0);
      this.scene.setCleanliness(this.state.data.cleanliness);
      this.ui.updateStatsDisplay();
    }, 1000);
  }

  initAudioUnlock() {
    // Browsers require a user interaction to unlock Web Audio API
    const unlockAudio = () => {
      this.audio.init();
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
  }

  startLoop() {
    const loop = (now) => {
      if (!this.isRunning) return;

      requestAnimationFrame(loop);

      // If tab is in background, skip rendering to save GPU/CPU
      if (!this.isTabActive) return;

      let delta = (now - this.lastTime) / 1000;
      this.lastTime = now;

      // Cap delta to prevent physics glitches if browser stutters or clock skews
      if (delta <= 0 || isNaN(delta)) {
        delta = 0.016;
      } else if (delta > 0.1) {
        delta = 0.1;
      }

      this.totalTime += delta;

      // Update Subsystems
      this.food.update(delta);
      this.fish.update(delta, this.totalTime);
      this.decorations.update(delta, this.totalTime, this.scene);
      this.scene.update(delta, this.totalTime);
    };

    requestAnimationFrame(loop);
  }
}

// Boot game when DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  window.aquraGame = new AquraGame();
});

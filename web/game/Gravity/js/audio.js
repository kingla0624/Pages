/* ======================================
   audio.js - Web Audio API Sound Effects
   ====================================== */

const AudioManager = (() => {
  let ctx = null;
  let masterGain = null;
  let enabled = true;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(ctx.destination);
  }

  function ensureCtx() {
    if (!ctx) init();
    if (ctx.state === 'suspended') ctx.resume();
  }

  function playTone(freq, duration, type = 'sine', detune = 0, gainVal = 0.3) {
    if (!enabled) return;
    ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  function placeWell() {
    playTone(120, 0.5, 'sine', 0, 0.25);
    playTone(180, 0.4, 'sine', 5, 0.15);
  }

  function launch() {
    playTone(440, 0.15, 'triangle');
    setTimeout(() => playTone(660, 0.2, 'triangle', 0, 0.2), 80);
    setTimeout(() => playTone(880, 0.3, 'triangle', 0, 0.15), 160);
  }

  function collectNebula() {
    playTone(800, 0.3, 'sine', 0, 0.2);
    setTimeout(() => playTone(1200, 0.25, 'sine', 0, 0.15), 50);
  }

  function collectStardust() {
    const freq = 600 + Math.random() * 600;
    playTone(freq, 0.15, 'sine', 0, 0.12);
  }

  function blackHole() {
    playTone(80, 1.0, 'sawtooth', 0, 0.25);
    playTone(60, 1.2, 'sine', -10, 0.2);
  }

  function enterGate() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.5, 'sine', 0, 0.2), i * 120);
    });
  }

  function fail() {
    playTone(300, 0.3, 'sawtooth', 0, 0.15);
    setTimeout(() => playTone(200, 0.5, 'sawtooth', 0, 0.12), 150);
  }

  function click() {
    playTone(500, 0.06, 'square', 0, 0.08);
  }

  function toggle() {
    enabled = !enabled;
    return enabled;
  }

  return {
    init, placeWell, launch, collectNebula, collectStardust,
    blackHole, enterGate, fail, click, toggle,
    get enabled() { return enabled; }
  };
})();

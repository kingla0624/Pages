/**
 * Procedural Space Drone & Solar Wind Soundscape via Web Audio API
 * Generates continuous, immersive cosmic ambience without external audio assets.
 */
export class ProceduralCosmicAudio {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.masterGain = null;
    this.oscillators = [];
    this.noiseNode = null;
  }

  initAudio() {
    if (this.ctx) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // 1. Deep Sub-bass Cosmic Drone (43.65 Hz / F1)
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(43.65, this.ctx.currentTime);

    const subFilter = this.ctx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.setValueAtTime(110, this.ctx.currentTime);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    subOsc.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start();
    this.oscillators.push(subOsc);

    // 2. Harmonic Eerie Fifth (65.41 Hz / C2)
    const fifthOsc = this.ctx.createOscillator();
    fifthOsc.type = 'sine';
    fifthOsc.frequency.setValueAtTime(65.41, this.ctx.currentTime);

    const fifthGain = this.ctx.createGain();
    fifthGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    fifthOsc.connect(fifthGain);
    fifthGain.connect(this.masterGain);
    fifthOsc.start();
    this.oscillators.push(fifthOsc);

    // 3. Solar Wind Wind-Noise generator (Filtered White/Pink Noise)
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(320, this.ctx.currentTime);
    bandpass.Q.setValueAtTime(1.5, this.ctx.currentTime);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    this.noiseBandpass = bandpass;
    whiteNoise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    whiteNoise.start();
    this.noiseNode = whiteNoise;
  }

  updateModulation(sunAlignment) {
    if (!this.ctx || !this.isPlaying || !this.noiseBandpass) return;
    const now = this.ctx.currentTime;
    // Map alignment (-1 to 1) to bandpass frequency (220 Hz to 780 Hz)
    const normalized = Math.max(0, Math.min(1, (sunAlignment + 1) * 0.5));
    const targetFreq = 220 + normalized * 560;
    this.noiseBandpass.frequency.setTargetAtTime(targetFreq, now, 0.12);
  }

  toggle() {
    if (!this.ctx) {
      this.initAudio();
    }

    if (!this.ctx || !this.masterGain) {
      return false;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isPlaying = !this.isPlaying;
    const now = this.ctx.currentTime;

    if (this.isPlaying) {
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0.45, now + 2.5);
    } else {
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0, now + 1.2);
    }

    return this.isPlaying;
  }
}

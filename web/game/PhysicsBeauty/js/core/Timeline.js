/** Shared film time, in seconds. Scene animation and HUD use this same clock. */
export const CHAPTERS = [
  { id: 0, key: '00', en: 'PLANCK SCALE', cn: '普朗克尺度', start: 0, end: 6, expStart: -35, expEnd: -35 },
  { id: 1, key: '01', en: 'QUANTUM', cn: '量子', start: 6, end: 16, expStart: -6, expEnd: -6 },
  { id: 2, key: '02', en: 'CHAOS', cn: '混沌', start: 16, end: 26, expStart: 0, expEnd: 0 },
  { id: 3, key: '03', en: 'GRAVITATIONAL WAVES', cn: '引力波', start: 26, end: 36, expStart: 5, expEnd: 5 },
  { id: 4, key: '04', en: 'ORBITS', cn: '轨道', start: 36, end: 46, expStart: 11, expEnd: 11 },
  { id: 5, key: '05', en: 'COSMIC WEB', cn: '宇宙网', start: 46, end: 56, expStart: 24, expEnd: 21 },
  { id: 6, key: '06', en: 'EVENT HORIZON', cn: '事件视界', start: 56, end: 68, expStart: 13, expEnd: 13 },
  { id: 7, key: '00', en: 'PLANCK SCALE', cn: '普朗克尺度', start: 68, end: 76, expStart: -35, expEnd: -35 }
];

export const clamp01 = value => Math.min(Math.max(value, 0), 1);

export function smoothstep(edge0, edge1, value) {
  const p = clamp01((value - edge0) / (edge1 - edge0));
  return p * p * (3 - 2 * p);
}

export function getChapterProgress(id, time) {
  const chapter = CHAPTERS[id];
  return clamp01((time - chapter.start) / (chapter.end - chapter.start));
}

export const ORBIT_COMPLETION_TIME = CHAPTERS[4].end - 1.2;

export function getOrbitYears(time) {
  return clamp01((time - CHAPTERS[4].start) / (ORBIT_COMPLETION_TIME - CHAPTERS[4].start)) * 8;
}

export const MERGER_TIME = 33.5;

/** One illustrative source model, shared by the markers, grid, HUD and sonification.
 * Scene units and compressed film seconds are not a GR metric or measured strain.
 */
export const GW_MODEL = Object.freeze({
  startTime: CHAPTERS[3].start,
  mergerTime: MERGER_TIME,
  orbitOmegaStart: 2.5,
  orbitOmegaRise: 9.5,
  amplitudeStart: 0.18,
  amplitudeRise: 0.65,
  onsetDuration: 0.6,
  ringdownOmega: 14,
  ringdownFrequencyTime: 0.35,
  ringdownDecay: 0.6,
  propagationSpeed: 5,
  mergerBlendDuration: 0.18,
  flashWidth: 0.23,
  audioFrequencyScale: 100,
  audioGainScale: 0.48
});

const inspiralDuration = GW_MODEL.mergerTime - GW_MODEL.startTime;
const mergerOrbitPhase = inspiralDuration * (GW_MODEL.orbitOmegaStart + GW_MODEL.orbitOmegaRise / 4);
const mergerOmega = 2 * (GW_MODEL.orbitOmegaStart + GW_MODEL.orbitOmegaRise);
const mergerAmplitude = GW_MODEL.amplitudeStart + GW_MODEL.amplitudeRise;

export function getMergerState(time) {
  const elapsed = time - MERGER_TIME;
  return {
    progress: smoothstep(MERGER_TIME - GW_MODEL.mergerBlendDuration, MERGER_TIME, time),
    orbitProgress: clamp01((time - CHAPTERS[3].start) / (MERGER_TIME - CHAPTERS[3].start)),
    merged: elapsed >= 0,
    elapsed,
    flash: Math.exp(-Math.pow(elapsed / GW_MODEL.flashWidth, 2))
  };
}

export function getGravitationalWaveState(time) {
  const merger = getMergerState(time);
  const p = merger.orbitProgress;
  const inspiralElapsed = p * inspiralDuration;
  let phase = 2 * (GW_MODEL.orbitOmegaStart * inspiralElapsed
    + GW_MODEL.orbitOmegaRise * inspiralDuration * p ** 4 / 4);
  let angularFrequency = 2 * (GW_MODEL.orbitOmegaStart + GW_MODEL.orbitOmegaRise * p ** 3);
  let amplitude = (GW_MODEL.amplitudeStart + GW_MODEL.amplitudeRise * p ** 2)
    * smoothstep(GW_MODEL.startTime, GW_MODEL.startTime + GW_MODEL.onsetDuration, time);

  if (merger.merged) {
    const elapsed = merger.elapsed;
    const relaxation = Math.exp(-elapsed / GW_MODEL.ringdownFrequencyTime);
    angularFrequency = GW_MODEL.ringdownOmega + (mergerOmega - GW_MODEL.ringdownOmega) * relaxation;
    // Analytic integral of the relaxing frequency keeps phase continuous at merger.
    phase = 2 * mergerOrbitPhase + GW_MODEL.ringdownOmega * elapsed
      + (mergerOmega - GW_MODEL.ringdownOmega) * GW_MODEL.ringdownFrequencyTime * (1 - relaxation);
    amplitude = mergerAmplitude * Math.exp(-elapsed * GW_MODEL.ringdownDecay);
  }

  if (time < GW_MODEL.startTime) angularFrequency = 0;
  return {
    // The binary uses this phase before merger; afterwards the markers are hidden.
    orbitPhase: phase / 2,
    phase,
    angularFrequency,
    frequency: angularFrequency / (2 * Math.PI),
    amplitude,
    wave: amplitude * Math.sin(phase),
    merged: merger.merged,
    mergerProgress: merger.progress,
    orbitProgress: p,
    elapsed: merger.elapsed,
    flash: merger.flash
  };
}

// GLSL equations are generated from the same constants as the CPU source model.
// Return (phase, amplitude); the grid evaluates this at time - radius / speed.
const glslFloat = value => Number.isInteger(value) ? `${value}.0` : String(value);
export const GRAVITATIONAL_WAVE_GLSL = `
  vec2 gravitationalWaveState(float time) {
    float elapsed = time - ${glslFloat(GW_MODEL.startTime)};
    if (elapsed < 0.0) return vec2(0.0);
    float p = clamp(elapsed / ${glslFloat(inspiralDuration)}, 0.0, 1.0);
    float phase = 2.0 * (${glslFloat(GW_MODEL.orbitOmegaStart)} * p * ${glslFloat(inspiralDuration)}
      + ${glslFloat(GW_MODEL.orbitOmegaRise * inspiralDuration / 4)} * p * p * p * p);
    float amplitude = (${glslFloat(GW_MODEL.amplitudeStart)} + ${glslFloat(GW_MODEL.amplitudeRise)} * p * p)
      * smoothstep(0.0, ${glslFloat(GW_MODEL.onsetDuration)}, elapsed);
    float ringdownTime = time - ${glslFloat(GW_MODEL.mergerTime)};
    if (ringdownTime >= 0.0) {
      float relaxation = exp(-ringdownTime / ${glslFloat(GW_MODEL.ringdownFrequencyTime)});
      phase = ${glslFloat(2 * mergerOrbitPhase)} + ${glslFloat(GW_MODEL.ringdownOmega)} * ringdownTime
        + ${glslFloat((mergerOmega - GW_MODEL.ringdownOmega) * GW_MODEL.ringdownFrequencyTime)} * (1.0 - relaxation);
      amplitude = ${glslFloat(mergerAmplitude)} * exp(-ringdownTime * ${glslFloat(GW_MODEL.ringdownDecay)});
    }
    return vec2(phase, amplitude);
  }
`;

/** Five nested-frame transitions, followed by two dark passages. */
export function getTransitionState(time) {
  for (let to = 1; to < CHAPTERS.length; to++) {
    const boundary = CHAPTERS[to].start;
    const start = boundary - 0.35;
    const end = boundary + 0.45;
    if (time >= start && time < end) {
      return { from: to - 1, to, start, end, progress: clamp01((time - start) / (end - start)), type: to <= 5 ? 'portal' : 'fade' };
    }
  }
  return null;
}

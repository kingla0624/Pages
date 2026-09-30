import { ShaderMaterial, Vector2 } from 'three';

/**
 * Atmospheric Heat Shimmer, Chromatic Aberration & 35mm Film Grain Shader
 */
export const AtmosphericOpticsShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new Vector2() },
    uAberration: { value: 0.0035 },
    uGrainIntensity: { value: 0.045 },
    uHeatWaveStrength: { value: 0.0018 }
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uAberration;
    uniform float uGrainIntensity;
    uniform float uHeatWaveStrength;

    varying vec2 vUv;

    // Pseudo-random noise for 35mm film grain
    float random(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233) + uTime * 0.05)) * 43758.5453);
    }

    void main() {
      // 1. Heat Shimmer Wave Distortion (Horizontally undulating near bottom/horizon)
      float heatWave = sin(vUv.y * 45.0 + uTime * 3.5) * cos(vUv.x * 30.0 + uTime * 2.0);
      vec2 distortedUv = vUv + vec2(heatWave * uHeatWaveStrength * (1.0 - vUv.y), 0.0);

      // 2. Radial Chromatic Aberration (RGB split increasing towards screen borders)
      vec2 center = vec2(0.5, 0.5);
      vec2 dir = distortedUv - center;
      float dist = length(dir);
      vec2 offset = dir * dist * uAberration;

      vec2 sampleUvR = clamp(distortedUv + offset, 0.0005, 0.9995);
      vec2 sampleUvG = clamp(distortedUv, 0.0005, 0.9995);
      vec2 sampleUvB = clamp(distortedUv - offset, 0.0005, 0.9995);

      float r = texture2D(tDiffuse, sampleUvR).r;
      float g = texture2D(tDiffuse, sampleUvG).g;
      float b = texture2D(tDiffuse, sampleUvB).b;

      vec3 color = vec3(r, g, b);

      // 3. Film Grain
      float grain = (random(distortedUv * uResolution) - 0.5) * uGrainIntensity;
      color += grain;

      // 4. Subtle Solar Warmth Tonemap
      color *= vec3(1.02, 0.99, 0.97);

      gl_FragColor = vec4(color, 1.0);
    }
  `
};

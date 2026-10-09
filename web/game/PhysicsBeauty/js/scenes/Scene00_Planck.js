import * as THREE from 'three';
import { smoothstep } from '../core/Timeline.js';

/**
 * Scene00_Planck.js - 普朗克尺度：量子泡沫与时空度规微观涨落
 * 基于 GLSL 全屏着色器计算分形噪声等高线场，呈现如山峦拓扑般的能量起伏发光纹路
 */
export class Scene00_Planck {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Scene00_Planck';

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 1.0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        uniform vec2 uResolution;
        varying vec2 vUv;

        // 简易 2D 噪声函数
        vec2 hash(vec2 p) {
          p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
          return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
        }

        float noise(in vec2 p) {
          const float K1 = 0.366025404; // (sqrt(3)-1)/2
          const float K2 = 0.211324865; // (3-sqrt(3))/6
          vec2 i = floor(p + (p.x + p.y) * K1);
          vec2 a = p - i + (i.x + i.y) * K2;
          vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec2 b = a - o + K2;
          vec2 c = a - 1.0 + 2.0 * K2;
          vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
          vec3 n = h * h * h * h * vec3(dot(a, hash(i)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
          return dot(n, vec3(70.0));
        }

        float fbm(vec2 p) {
          float v = 0.0;
          v += 0.5000 * noise(p); p *= 2.01;
          v += 0.2500 * noise(p); p *= 2.02;
          v += 0.0500 * noise(p); p *= 2.03;
          v += 0.0150 * noise(p);
          return v;
        }

        void main() {
          vec2 uv = (vUv - 0.5) * 4.5;
          uv.x *= uResolution.x / uResolution.y;

          // Multiscale deformation breaks up the contours without filling the voids.
          float t = uTime * 0.16;
          vec2 q = vec2(fbm(uv * 0.7 + vec2(t, 0.0)),
                        fbm(uv * 0.7 + vec2(5.2, 1.3 - t)));
          float f = fbm(uv * 0.82 + 0.78 * q + vec2(t * 0.2, -t * 0.16));
          float isoline = abs(fract(f * 2.0 + 0.5) - 0.5);
          float aa = max(fwidth(isoline), 0.001);
          float grain = noise(uv * 5.5 + q + vec2(t * 0.45, -t * 0.35));
          float width = mix(0.004, 0.011, smoothstep(-0.5, 0.5, grain));
          float line = 1.0 - smoothstep(width, width + aa * 1.5, isoline);
          float halo = exp(-isoline * 38.0);
          float mist = exp(-isoline * 12.0)
            * smoothstep(0.06, 0.5, noise(uv * 2.3 + q + vec2(t * 0.3)));
          // Warm areas have their own field; they need not coincide with a contour.
          float warmth = smoothstep(0.20, 0.43,
            fbm(uv * 0.62 + vec2(2.7 - t * 0.25, -1.8 + t * 0.18)));
          warmth *= 0.35 + 0.65 * exp(-abs(f) * 4.0);
          vec3 finalColor = vec3(0.0005) + vec3(0.22, 0.24, 0.26) * line;
          finalColor += vec3(0.19, 0.20, 0.21) * halo + vec3(0.09) * mist;
          finalColor += vec3(0.075, 0.020, 0.008) * warmth;
          gl_FragColor = vec4(finalColor, uOpacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.group.add(this.mesh);
  }

  update(time, opacity) {
    const reveal = time < 6 ? smoothstep(1.35, 2.5, time) : 1;
    const ending = 1 - smoothstep(74.8, 76, time);
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uOpacity.value = opacity * reveal * ending;
    this.group.visible = this.material.uniforms.uOpacity.value > 0.001;
  }

  onResize(width, height) {
    this.material.uniforms.uResolution.value.set(width, height);
  }
}

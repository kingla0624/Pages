import * as THREE from 'three';

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
          v += 0.1250 * noise(p); p *= 2.03;
          return v;
        }

        void main() {
          vec2 uv = (vUv - 0.5) * 1.5;
          uv.x *= uResolution.x / uResolution.y;

          float t = uTime * 0.18;
          // 扭曲坐标计算多重拓扑场
          vec2 q = vec2(fbm(uv * 0.75), fbm(uv * 0.75 + vec2(5.2, 1.3)));
          vec2 r = vec2(fbm(uv * 0.75 + 2.4 * q + vec2(1.7 - t * 0.08, 9.2 + t * 0.1)),
                        fbm(uv * 0.75 + 2.4 * q + vec2(8.3 - t * 0.09, 2.8 + t * 0.06)));
          float f = fbm(uv * 0.75 + 2.4 * r);

          // 提取等高线发光锐边
          float isoline = abs(fract(f * 3.5) - 0.5) * 2.0;
          float lineGlow = 1.0 - smoothstep(0.015, 0.12, isoline);

          // 色彩渐变：深邃暗黑基底 + 炽白等高线 + 暗红外发光
          vec3 baseColor = vec3(0.015, 0.008, 0.008);
          vec3 glowColor = vec3(0.85, 0.25, 0.12);
          vec3 whiteLine = vec3(0.95, 0.95, 0.98);

          vec3 finalColor = baseColor;
          finalColor += glowColor * lineGlow * 1.4;
          finalColor += whiteLine * pow(lineGlow, 3.5) * 1.8;

          // 中心柔和光芒
          float centerLight = 1.0 - length(vUv - 0.5) * 1.4;
          finalColor += vec3(0.9, 0.35, 0.15) * max(centerLight, 0.0) * 0.35;

          gl_FragColor = vec4(finalColor, uOpacity);
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
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uOpacity.value = opacity;
    this.group.visible = opacity > 0.001;
  }

  onResize(width, height) {
    this.material.uniforms.uResolution.value.set(width, height);
  }
}

import * as THREE from 'three';

/**
 * Scene06_EventHorizon.js - 广义相对论黑洞与事件视界
 * 采用全屏光线步进 (Raymarching) 着色器实现史瓦西引力透镜弯曲、吸积盘背向折射、
 * 相对论多普勒集束效应 (Doppler Beaming) 与冲入视界穿透转场
 */
export class Scene06_EventHorizon {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Scene06_EventHorizon';

    const quadGeo = new THREE.PlaneGeometry(2, 2);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 1.0 },
        uZoom: { value: 1.0 }, // 随着时间推进冲入黑洞 (1.0 -> 8.0)
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
        uniform float uZoom;
        uniform vec2 uResolution;
        varying vec2 vUv;

        // 简易哈希与旋转
        mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
        }

        // 简易伪随机噪声
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }

        void main() {
          vec2 uv = (vUv - 0.5) * 2.0;
          uv.x *= uResolution.x / uResolution.y;

          // 应用相机向前冲刺放大倍率
          uv /= uZoom;

          float r = length(uv);
          float phi = atan(uv.y, uv.x);

          // 黑洞史瓦西视界半径与光子球半径
          float rs = 0.42;        // 物理视界
          float rShadow = 0.58;   // 广义相对论光线阴影边界 (2.6 rs)
          float rPhoton = 0.65;   // 光子球发光锐环

          // 1. 黑洞中央纯黑阴影 (Event Horizon Shadow)
          if (r < rShadow) {
            // 视界内部纯黑
            float shadowEdge = smoothstep(rShadow - 0.015, rShadow, r);
            vec3 edgeGlow = vec3(0.9, 0.35, 0.1) * shadowEdge * 0.4;
            gl_FragColor = vec4(edgeGlow, uOpacity);
            return;
          }

          // 2. 引力透镜光线弯折吸积盘模型
          // 倾斜吸积盘投影映射 (模拟 Gargantua 几何双环)
          vec2 diskUV = uv;
          diskUV.y /= 0.28; // 倾角压扁椭圆

          // 极坐标变换模拟高速旋转与引力偏折
          float diskR = length(diskUV);
          float diskPhi = atan(diskUV.y, diskUV.x);

          // 相对论多普勒集束效应 (Doppler Beaming):
          // 气体从左向右旋转，左侧吸积物质迎向观测者，呈现蓝移与显著增亮；右侧远离而昏暗
          float doppler = 1.0 - 0.55 * sin(phi);

          // 上下透镜光环 (Gravitational Lensing Ring: 背面被弯折到上方和下方的像)
          float topLensedRing = abs(r - 0.88);
          float bottomLensedRing = abs(r - 0.64);
          float lensGlow = exp(-topLensedRing * 12.0) + exp(-bottomLensedRing * 16.0);

          // 吸积盘主径向分布 (半径 0.65 到 2.4)
          float diskMask = smoothstep(0.62, 0.85, diskR) * (1.0 - smoothstep(1.2, 2.5, diskR));

          // 吸积盘动态湍流与螺旋丝状纹理
          float flowTime = uTime * 1.5;
          float diskNoise = noise(vec2(diskR * 14.0 - flowTime * 2.0, diskPhi * 4.0 + flowTime));
          diskNoise += 0.5 * noise(vec2(diskR * 28.0, diskPhi * 8.0 - flowTime * 3.0));

          float diskBrightness = diskMask * (0.35 + 0.65 * diskNoise) * doppler;
          diskBrightness += lensGlow * 0.55 * doppler;

          // 光子球极薄金环 (Photon Sphere Ring)
          float photonRing = exp(-abs(r - rPhoton) * 40.0) * 1.4;
          diskBrightness += photonRing;

          // 3. 颜色梯度：纯白高热内圈 -> 炽烈金橙 -> 深红外围
          vec3 colWhite = vec3(1.0, 0.96, 0.90);
          vec3 colGold = vec3(0.98, 0.55, 0.15);
          vec3 colRed = vec3(0.75, 0.12, 0.02);

          vec3 finalColor = vec3(0.0);
          finalColor += colWhite * pow(diskBrightness, 3.4) * 1.1;
          finalColor += colGold * pow(diskBrightness, 1.8) * 1.0;
          finalColor += colRed * diskBrightness * 0.7;

          // 4. 背景暗星云与引力畸变微光
          float outerGlow = exp(-r * 1.2) * 0.15;
          finalColor += vec3(0.2, 0.08, 0.04) * outerGlow;

          // 冲入视界时光爆纯白过渡 (uZoom 很大时)
          if (uZoom > 4.5) {
            float flash = smoothstep(4.5, 7.5, uZoom);
            finalColor = mix(finalColor, vec3(1.0), flash);
          }

          gl_FragColor = vec4(finalColor, uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });

    this.mesh = new THREE.Mesh(quadGeo, this.material);
    this.group.add(this.mesh);
  }

  update(time, opacity) {
    const sceneStart = 55.5;
    const progress = Math.min(Math.max((time - sceneStart) / 12.0, 0.0), 1.0);

    // 镜头逐渐推进，最后 2 秒加速冲破视界
    let zoom = 1.0;
    if (progress < 0.75) {
      zoom = 1.0 + progress * 0.8;
    } else {
      const rushP = (progress - 0.75) / 0.25;
      zoom = 1.8 + Math.pow(rushP, 3.0) * 6.5;
    }

    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uOpacity.value = opacity;
    this.material.uniforms.uZoom.value = zoom;

    this.group.visible = opacity > 0.001;
  }

  onResize(width, height) {
    this.material.uniforms.uResolution.value.set(width, height);
  }
}

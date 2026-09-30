import * as THREE from 'three';

/**
 * Scene05_CosmicWeb.js - 宇宙大尺度结构：宇宙网与暗物质纤维
 * 3D 空间中聚类生成的数万星系微粒，呈现如生物神经网络般的纤维、巨洞与星系团节点
 */
export class Scene05_CosmicWeb {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Scene05_CosmicWeb';

    this.particleCount = 45000;
    this.initFilamentParticles();
  }

  initFilamentParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    // 构建 48 条立体交织的宇宙大尺度暗物质主纤维
    const numFilaments = 48;
    const filamentNodes = [];

    for (let f = 0; f < numFilaments; f++) {
      const p1 = new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 20
      );
      const p2 = new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 20
      );
      filamentNodes.push({ p1, p2 });
    }

    // 沿纤维丝线与节点进行概率聚类分布
    for (let i = 0; i < this.particleCount; i++) {
      const filament = filamentNodes[Math.floor(Math.random() * filamentNodes.length)];
      const t = Math.random();

      // 沿线段插值
      const basePos = new THREE.Vector3().lerpVectors(filament.p1, filament.p2, t);

      // 高斯径向扰动
      const radius = Math.pow(Math.random(), 2.2) * 1.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const offset = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );

      // 中央高密度星系团
      if (i < 5000) {
        offset.multiplyScalar(0.25);
        basePos.set(0, 0, 0);
      }

      const finalPos = basePos.add(offset);
      positions[i * 3 + 0] = finalPos.x;
      positions[i * 3 + 1] = finalPos.y;
      positions[i * 3 + 2] = finalPos.z;

      // 颜色微调：清冷星尘白、微暗金星光
      colors[i * 3 + 0] = 0.95 + Math.random() * 0.05;
      colors[i * 3 + 1] = 0.88 + Math.random() * 0.08;
      colors[i * 3 + 2] = 0.78 + Math.random() * 0.12;
      sizes[i] = 0.8 + Math.random() * 1.2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // 点云着色器材质
    this.pointsMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 1.0 }
      },
      vertexShader: `
        attribute vec3 color;
        attribute float size;
        varying vec3 vColor;
        varying float vDist;
        uniform float uTime;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vDist = -mvPosition.z;

          // 微弱的宇宙星系光芒闪烁，保持极细星尘尺寸
          float twinkle = sin(position.x * 12.0 + uTime * 2.5) * 0.2 + 0.8;
          float pSize = size * twinkle * (28.0 / max(vDist, 0.8));
          gl_PointSize = clamp(pSize, 1.0, 3.2);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec3 vColor;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = smoothstep(0.5, 0.02, dist);
          gl_FragColor = vec4(vColor, alpha * uOpacity * 0.75);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(geometry, this.pointsMat);
    this.group.add(this.points);
  }

  update(time, opacity) {
    this.pointsMat.uniforms.uTime.value = time;
    this.pointsMat.uniforms.uOpacity.value = opacity;

    // 宇宙网极其缓慢的暗能量膨胀旋转
    this.group.rotation.y = time * 0.025;
    this.group.rotation.x = Math.sin(time * 0.015) * 0.08;

    this.group.visible = opacity > 0.001;
  }
}

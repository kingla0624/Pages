import * as THREE from 'three';

/**
 * GLSL Vertex Shader for Solar Plasma & Atmospheric Corona
 */
const sunVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * GLSL Fragment Shader for Solar Plasma with 3D Simplex Turbulence
 */
const sunFragmentShader = `
uniform float uTime;
uniform vec3 uColorCore;
uniform vec3 uColorRim;
uniform float uNoiseScale;
uniform float uBrightness;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

// 3D Simplex Noise generator
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  i = mod(i, 289.0 );
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = vec3(0.0, 0.0, 1.0); // local camera view approximation
  float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 2.5);

  // Multi-frequency noise for convective plasma granulation
  vec3 noisePos = vPosition * uNoiseScale + vec3(uTime * 0.12);
  float n1 = snoise(noisePos);
  float n2 = snoise(noisePos * 2.2 - vec3(uTime * 0.2));
  float noiseCombined = n1 * 0.65 + n2 * 0.35;

  // Color gradient interpolation
  vec3 plasmaColor = mix(uColorCore, uColorRim, noiseCombined * 0.5 + 0.5);
  vec3 finalColor = mix(plasmaColor, uColorRim * 1.5, fresnel);

  gl_FragColor = vec4(finalColor * uBrightness, 1.0);
}
`;

/**
 * Creates radial corona glow texture programmatically with custom gradient stops
 */
function createCoronaTexture(innerHex, midHex, outerHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0.0, innerHex);
  gradient.addColorStop(0.2, innerHex);
  gradient.addColorStop(0.55, midHex);
  gradient.addColorStop(0.85, outerHex);
  gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates dynamic multi-ray solar prominence flare spikes
 */
function createFlareRayTexture(colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const cx = 256, cy = 256;

  ctx.translate(cx, cy);
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI) / 8;
    ctx.rotate(angle);

    const grad = ctx.createLinearGradient(0, 0, 0, 240);
    grad.addColorStop(0, colorHex);
    grad.addColorStop(0.3, colorHex);
    grad.addColorStop(0.7, 'rgba(0,0,0,0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(0, 200 + (i % 4) * 30);
    ctx.lineTo(14, 0);
    ctx.closePath();
    ctx.fill();

    ctx.rotate(-angle);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export class TriSolarSystem {
  constructor(scene) {
    this.scene = scene;
    this.suns = [];
    this.time = 0;

    this.initSuns();
  }

  initSuns() {
    // 1. Alpha Sun: Golden Supergiant (High luminosity, warm amber/yellow)
    this.sunAlpha = this.createSun({
      name: 'Sun Alpha (恒星·金黄主序星)',
      radius: 32,
      coreColor: new THREE.Color(0xfff388),
      rimColor: new THREE.Color(0xf59e0b),
      innerHex: 'rgba(255, 245, 180, 0.95)',
      midHex: 'rgba(245, 158, 11, 0.45)',
      outerHex: 'rgba(217, 119, 6, 0.12)',
      flareHex: 'rgba(255, 220, 120, 0.75)',
      lightColor: 0xffedd5,
      lightIntensity: 3.2,
      baseX: -190,
      baseY: 175,
      baseZ: -360,
      orbitSpeed: 0.12,
      phaseOffset: 0.0,
      shadowResolution: 1024
    });

    // 2. Beta Sun: Scarlet Red Giant (Colossal, ominous, deep crimson)
    this.sunBeta = this.createSun({
      name: 'Sun Beta (恒星·红巨星)',
      radius: 54,
      coreColor: new THREE.Color(0xff4422),
      rimColor: new THREE.Color(0xb91c1c),
      innerHex: 'rgba(255, 80, 50, 0.95)',
      midHex: 'rgba(220, 38, 38, 0.48)',
      outerHex: 'rgba(153, 27, 27, 0.15)',
      flareHex: 'rgba(239, 68, 68, 0.7)',
      lightColor: 0xff6b6b,
      lightIntensity: 3.6,
      baseX: 190,
      baseY: 210,
      baseZ: -410,
      orbitSpeed: 0.08,
      phaseOffset: 2.1,
      shadowResolution: 1024
    });

    // 3. Gamma Sun: Azure Dwarf (Compact, blinding cyan/white, ultra-dense)
    this.sunGamma = this.createSun({
      name: 'Sun Gamma (恒星·蓝白矮星)',
      radius: 20,
      coreColor: new THREE.Color(0xf0fdf4),
      rimColor: new THREE.Color(0x38bdf8),
      innerHex: 'rgba(240, 249, 255, 0.98)',
      midHex: 'rgba(56, 189, 248, 0.52)',
      outerHex: 'rgba(14, 165, 233, 0.16)',
      flareHex: 'rgba(125, 211, 252, 0.8)',
      lightColor: 0xbae6fd,
      lightIntensity: 3.0,
      baseX: -45,
      baseY: 280,
      baseZ: -330,
      orbitSpeed: 0.18,
      phaseOffset: 4.3,
      shadowResolution: 512
    });

    this.suns = [this.sunAlpha, this.sunBeta, this.sunGamma];
  }

  createSun(config) {
    const group = new THREE.Group();

    // Plasma Sphere Shader Material (fog: false ensures unmitigated cosmic brilliance)
    const material = new THREE.ShaderMaterial({
      vertexShader: sunVertexShader,
      fragmentShader: sunFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColorCore: { value: config.coreColor },
        uColorRim: { value: config.rimColor },
        uNoiseScale: { value: 0.06 },
        uBrightness: { value: 2.4 }
      },
      toneMapped: false,
      fog: false
    });

    const geometry = new THREE.SphereGeometry(config.radius, 48, 48);
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    // Billboarding Outer Corona Sprite
    const coronaMat = new THREE.SpriteMaterial({
      map: createCoronaTexture(config.innerHex, config.midHex, config.outerHex),
      blending: THREE.AdditiveBlending,
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      fog: false
    });
    const coronaSprite = new THREE.Sprite(coronaMat);
    const coronaScale = config.radius * 3.8;
    coronaSprite.scale.set(coronaScale, coronaScale, 1);
    group.add(coronaSprite);

    // Rotating Coronal Prominence Flare Rays Sprite
    const flareRaysMat = new THREE.SpriteMaterial({
      map: createFlareRayTexture(config.flareHex),
      blending: THREE.AdditiveBlending,
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      fog: false
    });
    const flareRaysSprite = new THREE.Sprite(flareRaysMat);
    const rayScale = config.radius * 5.2;
    flareRaysSprite.scale.set(rayScale, rayScale, 1);
    group.add(flareRaysSprite);

    // Directional Light & Shadow casting
    const res = config.shadowResolution || 1024;
    const light = new THREE.DirectionalLight(config.lightColor, config.lightIntensity);
    light.castShadow = true;
    light.shadow.mapSize.width = res;
    light.shadow.mapSize.height = res;
    light.shadow.camera.near = 50;
    light.shadow.camera.far = 1200;
    light.shadow.camera.left = -300;
    light.shadow.camera.right = 300;
    light.shadow.camera.top = 300;
    light.shadow.camera.bottom = -300;
    light.shadow.bias = -0.0004;

    this.scene.add(group);
    this.scene.add(light);
    this.scene.add(light.target);

    return {
      group,
      mesh,
      material,
      coronaSprite,
      flareRaysSprite,
      light,
      config
    };
  }

  update(delta) {
    this.time += delta;

    this.suns.forEach((sun) => {
      const cfg = sun.config;
      sun.material.uniforms.uTime.value = this.time;

      // Chaotic 3-body simulated orbit with harmonic perturbations around dramatic sky locus
      const t = this.time * cfg.orbitSpeed + cfg.phaseOffset;
      const pertX = Math.sin(t * 1.5) * 55 + Math.cos(t * 0.7) * 20;
      const pertY = Math.cos(t * 1.8) * 35 + Math.sin(t * 1.1) * 15;
      const pertZ = Math.sin(t * 1.2) * 45;

      const x = cfg.baseX + pertX;
      const y = cfg.baseY + pertY;
      const z = cfg.baseZ + pertZ;

      sun.group.position.set(x, y, z);
      sun.light.position.set(x, y, z);
      sun.light.target.position.set(0, 45, 0);

      // Micro pulse corona
      const pulse = 1.0 + Math.sin(this.time * 2.2 + cfg.phaseOffset) * 0.06;
      const baseScale = cfg.radius * 3.8;
      sun.coronaSprite.scale.set(baseScale * pulse, baseScale * pulse, 1);

      // Rotate solar prominence flare rays
      sun.flareRaysSprite.material.rotation += 0.08 * cfg.orbitSpeed;
      const rayPulse = 1.0 + Math.cos(this.time * 1.8 + cfg.phaseOffset) * 0.08;
      const rayScale = cfg.radius * 5.2;
      sun.flareRaysSprite.scale.set(rayScale * rayPulse, rayScale * rayPulse, 1);
    });
  }

  getSolarPositions() {
    return this.suns.map(s => ({
      name: s.config.name,
      pos: s.group.position
    }));
  }
}

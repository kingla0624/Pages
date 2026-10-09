import * as THREE from 'three';
import { getChapterProgress, smoothstep } from '../core/Timeline.js';

/**
 * An analytic screen-space illustration of a lensed accretion disk.
 * Separate rear, shadow and foreground layers preserve the characteristic
 * silhouette. This is an artistic projection, not a relativistic ray tracer.
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
        uZoom: { value: 1.0 },
        uEndFade: { value: 1.0 },
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
        uniform float uEndFade;
        uniform vec2 uResolution;
        varying vec2 vUv;

        mat2 rotate(float angle) {
          float s = sin(angle), c = cos(angle);
          return mat2(c, -s, s, c);
        }

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 cell = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), f.x),
                     mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0)), f.x), f.y);
        }

        float fbm(vec2 p) {
          float result = 0.0;
          float weight = 0.5;
          for (int i = 0; i < 3; i++) {
            result += weight * noise(p);
            p = rotate(0.53) * p * 2.03 + vec2(3.7, 8.2);
            weight *= 0.5;
          }
          return result;
        }

        float gaussian(float distance, float width) {
          float d = distance / width;
          return exp(-d * d);
        }

        float orbitalRate(float radius) {
          // Illustrative Kepler flow, bounded outside the visible annulus.
          return clamp(0.26 * pow(0.37 / max(radius, 0.28), 1.5), 0.045, 0.41);
        }

        float transientKnots(vec2 p, float radius, float time) {
          float knots = 0.0;
          for (int i = 0; i < 3; i++) {
            float slot = float(i);
            float cycle = (time + slot * 1.47) / 4.8;
            float generation = floor(cycle);
            float age = fract(cycle);
            float envelope = smoothstep(0.0, 0.18, age)
              * (1.0 - smoothstep(0.62, 1.0, age));
            float knotRadius = 0.36 + 0.40 * hash(vec2(slot + 2.1, generation));
            float phase = 6.2831853 * hash(vec2(slot + 8.7, generation + 3.4));
            vec2 radial = vec2(cos(phase), sin(phase));
            vec2 tangent = vec2(-radial.y, radial.x);
            // Each radial sample advects at its own rate after the knot's
            // birth, stretching a compact source into a short trailing arc.
            vec2 source = rotate(orbitalRate(radius) * age * 4.8) * p;
            vec2 delta = source - radial * knotRadius;
            vec2 local = vec2(dot(delta, radial) / 0.024,
                              dot(delta, tangent) / 0.070);
            knots += envelope * exp(-dot(local, local));
          }
          return knots;
        }

        // Inverse advection uses continuous Cartesian samples throughout
        // the disk, including lensed images. No atan/noise branch seam.
        float flowingTexture(vec2 p, float radius) {
          // Chapter-relative phase keeps accumulated shear moderate on entry.
          float time = max(uTime - 56.0, 0.0);
          vec2 flow = rotate(time * orbitalRate(radius)
            + 0.55 / max(radius, 0.28)) * p;
          float filaments = 0.5 + 0.5 * sin(radius * 175.0
            + noise(flow * 17.0) * 3.5 - time * 0.35);
          return 0.58 + 0.23 * noise(flow * 63.0) + 0.15 * filaments
            + 0.14 * transientKnots(p, radius, time);
        }

        float orbitalBeaming(vec2 p, float radius) {
          vec2 radial = p / max(radius, 0.001);
          vec3 velocityDirection = vec3(-radial.y, radial.x, 0.0);
          // Front of this inclined disk has negative disk-y. Its local
          // tangent approaches the viewer on the left and recedes on the right.
          vec3 toViewer = normalize(vec3(0.0, -0.993, 0.12));
          float approach = dot(velocityDirection, toViewer);
          float beta = clamp(0.31 * sqrt(0.34 / max(radius, 0.28)), 0.13, 0.36);
          float doppler = sqrt(1.0 - beta * beta) / (1.0 - beta * approach);
          return doppler * doppler * doppler;
        }

        vec3 thermalLight(float intensity) {
          // Linear HDR color: narrow hot strands become white after ACES,
          // while their weaker surroundings retain an amber tint.
          vec3 amber = vec3(1.0, 0.23, 0.045) * intensity * 0.42;
          vec3 hot = vec3(1.0, 0.73, 0.40) * intensity * intensity * 0.40;
          // The hot contribution grows gently so broad disk regions stay warm.
          vec3 white = vec3(1.0, 0.95, 0.84)
            * pow(max(intensity - 0.65, 0.0), 2.0) * 0.10;
          return amber + hot + white;
        }

        float stars(vec2 p, float radius) {
          // A sparse static field is stretched tangentially near the lens.
          vec2 ray = p * (1.0 + 0.025 / (dot(p, p) + 0.08));
          vec2 cell = floor(ray * 22.0);
          vec2 offset = vec2(hash(cell + 8.3), hash(cell + 19.7));
          vec2 d = fract(ray * 22.0) - (0.15 + offset * 0.7);
          vec2 direction = normalize(p + vec2(0.0001));
          vec2 tangent = vec2(-direction.y, direction.x);
          float stretch = mix(1.0, 4.0, 1.0 - smoothstep(0.35, 1.2, radius));
          vec2 spot = vec2(dot(d, tangent) / stretch, dot(d, direction));
          float visible = step(0.986, hash(cell + 31.4));
          return visible * exp(-dot(spot, spot) * 2600.0)
            * (0.16 + 0.11 * hash(cell + 41.0));
        }

        void main() {
          vec2 screen = (vUv - 0.5) * 2.0;
          screen.x *= uResolution.x / uResolution.y;
          vec2 p = screen / uZoom;
          float radius = length(p);
          vec2 direction = p / max(radius, 0.001);

          // Gray-blue clouds and sparse warped stars add depth without
          // competing with the silhouette or chapter caption.
          vec2 bentSky = p + direction * 0.035 / (radius + 0.12);
          float cloud = fbm(bentSky * 1.8 + vec2(7.1, 3.8));
          float wisps = fbm(rotate(0.6) * bentSky * 3.6 + vec2(12.0, 4.0));
          float haze = pow(max(cloud * 1.4 + wisps * 0.5 - 0.50, 0.0), 2.0);
          float cloudRing = gaussian(radius - 0.68, 0.40);
          vec3 color = vec3(0.085, 0.095, 0.112) * haze
            * (0.35 + cloudRing * 1.4);
          color += vec3(stars(p, radius));
          color *= 1.0 - smoothstep(1.2, 2.2, length(screen));

          // The central shadow occludes sky and the rear half of the disk.
          const float shadowRadius = 0.25;
          float outsideShadow = smoothstep(shadowRadius - 0.003,
                                           shadowRadius + 0.003, radius);
          color *= outsideShadow;

          // Flattened orbital annulus. Its lower/front half is composited
          // after the shadow so that hot matter crosses the black silhouette.
          float planeCurve = -0.025 + 0.036
            * (1.0 - exp(-p.x * p.x / 0.20));
          vec2 disk = vec2(p.x, (p.y - planeCurve) / 0.12);
          float diskRadius = length(disk);
          float annulus = smoothstep(0.28, 0.335, diskRadius)
            * (1.0 - smoothstep(0.65, 1.28, diskRadius));
          float diskTexture = flowingTexture(disk, diskRadius);
          float beaming = orbitalBeaming(disk, diskRadius);
          float radialHeat = 0.18 + 0.82 * exp(-(diskRadius - 0.32) * 2.9);
          float diskLight = annulus * radialHeat * diskTexture * beaming;
          float front = 1.0 - smoothstep(-0.003, 0.003, p.y - planeCurve);
          color += thermalLight(diskLight * 1.55)
            * mix(outsideShadow, 1.0, front);

          // Rear-disk images: a broad upper arch and a thinner lower image.
          // Both rear images sample the same rear-disk flow. The source radius
          // is an analytic lens mapping, not a relativistic geodesic solution.
          float lensRadius = length(vec2(p.x, p.y * 1.04));
          float sourceRadius = 0.35 + abs(lensRadius - 0.332) * 2.8;
          vec2 sourceDirection = normalize(vec2(p.x, abs(p.y) * 1.04) + vec2(0.00001));
          vec2 rearDisk = sourceDirection * sourceRadius;
          float archTexture = flowingTexture(rearDisk, sourceRadius);
          float archBeaming = orbitalBeaming(rearDisk, sourceRadius);
          float upper = smoothstep(-0.025, 0.025, p.y);
          float upperArch = gaussian(lensRadius - 0.345, 0.033) * upper;
          float lowerArch = gaussian(lensRadius - 0.300, 0.016) * (1.0 - upper);
          float archCore = gaussian(lensRadius - 0.332, 0.011) * upper;
          float lensLight = (upperArch * 0.9 + lowerArch * 0.52
            + archCore * 0.32) * archTexture * archBeaming;
          color += thermalLight(lensLight * 1.5) * outsideShadow;
          color += vec3(0.50, 0.16, 0.055)
            * gaussian(lensRadius - 0.35, 0.078) * archBeaming * 0.12;

          // A delicate photon-ring cue remains distinct from the disk.
          float photonRing = gaussian(radius - 0.257, 0.0017);
          color += vec3(0.8, 0.63, 0.44) * photonRing * 0.34;
          color *= uEndFade;

          gl_FragColor = vec4(color, uOpacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });

    this.mesh = new THREE.Mesh(quadGeo, this.material);
    this.mesh.frustumCulled = false;
    this.group.add(this.mesh);
  }

  update(time, opacity) {
    const progress = getChapterProgress(6, time);
    // Gentle approach first; the silhouette stays readable at 66.5 seconds.
    const zoom = 1 + progress * 0.3 + 1.25 * smoothstep(0.65, 0.93, progress);

    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uOpacity.value = opacity;
    this.material.uniforms.uZoom.value = zoom;
    this.material.uniforms.uEndFade.value = 1 - smoothstep(0.96, 1, progress);

    this.group.visible = opacity > 0.001;
  }

  onResize(width, height) {
    this.material.uniforms.uResolution.value.set(width, height);
  }
}

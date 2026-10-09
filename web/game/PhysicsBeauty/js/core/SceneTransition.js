import * as THREE from 'three';

/** Accumulate every chapter in linear HDR, then apply one display conversion. */
export class SceneTransition {
  constructor() {
    this.size = new THREE.Vector2();
    this.fromTarget = null;
    this.toTarget = null;
    this.blurXTarget = null;
    this.blurYTarget = null;
    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.titleCanvas = document.createElement('canvas');
    this.titleBounds = new THREE.Vector4();
    this.titleTexture = new THREE.CanvasTexture(this.titleCanvas);
    this.titleTexture.colorSpace = THREE.SRGBColorSpace;
    this.titleTexture.generateMipmaps = false;
    this.titleTexture.minFilter = THREE.LinearFilter;
    this.overlayCanvas = document.createElement('canvas');
    this.overlayTexture = new THREE.CanvasTexture(this.overlayCanvas);
    this.overlayTexture.colorSpace = THREE.SRGBColorSpace;
    this.overlayTexture.generateMipmaps = false;
    this.overlayTexture.minFilter = THREE.LinearFilter;
    this.drawTitle();
    document.fonts.ready.then(() => this.drawTitle());
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uFrom: { value: null },
        uTo: { value: null },
        uBlurred: { value: null },
        uBlurMix: { value: 0 },
        uTitle: { value: this.titleTexture },
        uTitleBounds: { value: this.titleBounds },
        uChapterOverlay: { value: this.overlayTexture },
        uShowChapterOverlay: { value: 0 },
        uFilmHeight: { value: 1 },
        uTransition: { value: 0 },
        uShowTitle: { value: 0 },
        uProgress: { value: 0 },
        uFadeMode: { value: 0 },
        uTexel: { value: new THREE.Vector2() },
        uAntialias: { value: 0 },
        uFromAntialias: { value: 0 },
        uToAntialias: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uFrom;
        uniform sampler2D uTo;
        uniform sampler2D uBlurred;
        uniform float uBlurMix;
        uniform sampler2D uTitle;
        uniform vec4 uTitleBounds;
        uniform sampler2D uChapterOverlay;
        uniform float uShowChapterOverlay;
        uniform float uFilmHeight;
        uniform float uTransition;
        uniform float uShowTitle;
        uniform float uProgress;
        uniform float uFadeMode;
        uniform vec2 uTexel;
        uniform float uAntialias;
        uniform float uFromAntialias;
        uniform float uToAntialias;
        varying vec2 vUv;

        float fxaaLuminance(vec3 color) {
          return sqrt(max(dot(color, vec3(0.299, 0.587, 0.114)), 0.0));
        }

        vec3 chapterColor(sampler2D source, vec2 uv, float antialias) {
          vec3 center = texture2D(source, uv).rgb;
          if (uAntialias < 0.5 || antialias < 0.5) return center;
          float nw = fxaaLuminance(texture2D(source, uv + vec2(-1.0, -1.0) * uTexel).rgb);
          float ne = fxaaLuminance(texture2D(source, uv + vec2(1.0, -1.0) * uTexel).rgb);
          float sw = fxaaLuminance(texture2D(source, uv + vec2(-1.0, 1.0) * uTexel).rgb);
          float se = fxaaLuminance(texture2D(source, uv + vec2(1.0, 1.0) * uTexel).rgb);
          float middle = fxaaLuminance(center);
          float low = min(middle, min(min(nw, ne), min(sw, se)));
          float high = max(middle, max(max(nw, ne), max(sw, se)));
          if (high - low < max(0.0312, high * 0.125)) return center;
          vec2 direction = vec2(-((nw + ne) - (sw + se)), (nw + sw) - (ne + se));
          float reduction = max((nw + ne + sw + se) * 0.03125, 0.0078125);
          direction = clamp(direction / (min(abs(direction.x), abs(direction.y)) + reduction),
            vec2(-8.0), vec2(8.0)) * uTexel;
          vec3 a = 0.5 * (texture2D(source, uv - direction / 6.0).rgb
                        + texture2D(source, uv + direction / 6.0).rgb);
          vec3 b = a * 0.5 + 0.25 * (texture2D(source, uv - direction * 0.5).rgb
                                  + texture2D(source, uv + direction * 0.5).rgb);
          float result = fxaaLuminance(b);
          return result < low || result > high ? a : b;
        }

        vec2 filmUv(vec2 uv) {
          return vec2(uv.x, (uv.y - 0.5) / uFilmHeight + 0.5);
        }

        vec3 framedColor(sampler2D source, vec2 uv, float antialias) {
          vec2 inner = filmUv(uv);
          float mask = step(0.0, inner.y) * step(inner.y, 1.0);
          return chapterColor(source, clamp(inner, 0.0, 1.0), antialias) * mask;
        }

        void main() {
          float p = uProgress;
          vec3 color;
          vec4 titleOverlay = vec4(0.0);
          vec4 chapterOverlay = vec4(0.0);
          vec2 innerUv = filmUv(vUv);
          if (innerUv.y < 0.0 || innerUv.y > 1.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
          }
          if (uTransition < 0.5) {
            color = chapterColor(uTo, innerUv, uToAntialias);
          } else if (uFadeMode > 0.5) {
            float outgoingGain = 1.0 - smoothstep(0.0, 0.5, p);
            float incomingGain = smoothstep(0.5, 1.0, p);
            color = chapterColor(uFrom, innerUv, uFromAntialias) * outgoingGain
                  + chapterColor(uTo, innerUv, uToAntialias) * incomingGain;
          } else {
            float reveal = smoothstep(0.0, 0.5, p);
            float scale = 1.0 - 0.94 * smoothstep(0.0, 1.0, p);
            vec3 incoming = mix(chapterColor(uTo, innerUv, uToAntialias),
              texture2D(uBlurred, innerUv).rgb, uBlurMix);
            color = incoming * reveal;
            vec2 cardUv = (vUv - 0.5) / scale + 0.5;
            vec2 edge = abs(cardUv - 0.5);
            float distanceToEdge = max(edge.x, edge.y);
            float aa = max(fwidth(distanceToEdge), 0.001);
            float mask = 1.0 - smoothstep(0.5 - aa, 0.5 + aa, distanceToEdge);
            float fade = 1.0 - smoothstep(0.48, 0.94, p);
            vec3 outgoing = framedColor(uFrom, clamp(cardUv, 0.0, 1.0), uFromAntialias);
            vec2 titleUv = (cardUv - uTitleBounds.xy) / uTitleBounds.zw;
            titleOverlay = texture2D(uTitle, clamp(titleUv, 0.0, 1.0));
            float titleMask = step(0.0, titleUv.x) * step(titleUv.x, 1.0)
                            * step(0.0, titleUv.y) * step(titleUv.y, 1.0);
            titleOverlay.a *= uShowTitle * titleMask * mask * fade;
            chapterOverlay = texture2D(uChapterOverlay, clamp(cardUv, 0.0, 1.0));
            chapterOverlay.a *= uShowChapterOverlay * mask * fade;
            float border = smoothstep(0.5 - aa * 3.0, 0.5 - aa, distanceToEdge) * mask;
            outgoing += vec3(0.18) * border * smoothstep(0.0, 0.2, p);
            color = mix(color, outgoing, mask * fade);
          }
          gl_FragColor = vec4(color, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          // DOM titles are display colors. Match their brightness during the handoff.
          gl_FragColor.rgb = mix(gl_FragColor.rgb,
            linearToOutputTexel(vec4(titleOverlay.rgb, 1.0)).rgb, titleOverlay.a);
          gl_FragColor.rgb = mix(gl_FragColor.rgb,
            linearToOutputTexel(vec4(chapterOverlay.rgb, 1.0)).rgb, chapterOverlay.a);
        }
      `,
      depthTest: false,
      depthWrite: false
    });
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));
    this.blurScene = new THREE.Scene();
    this.blurMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uSource: { value: null },
        uDirection: { value: new THREE.Vector2() }
      },
      vertexShader: this.material.vertexShader,
      fragmentShader: `
        uniform sampler2D uSource;
        uniform vec2 uDirection;
        varying vec2 vUv;
        void main() {
          // Bilinear pairs implement a continuous nine-weight Gaussian in five fetches.
          vec3 color = texture2D(uSource, vUv).rgb * 0.227027;
          color += texture2D(uSource, vUv + uDirection * 1.384615).rgb * 0.316216;
          color += texture2D(uSource, vUv - uDirection * 1.384615).rgb * 0.316216;
          color += texture2D(uSource, vUv + uDirection * 3.230769).rgb * 0.0702705;
          color += texture2D(uSource, vUv - uDirection * 3.230769).rgb * 0.0702705;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      toneMapped: false,
      depthTest: false,
      depthWrite: false
    });
    this.blurScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.blurMaterial));
  }

  drawTitle() {
    const ratio = Math.min(window.devicePixelRatio, 2);
    const lines = ['.main-title', '.english-title', '#intro-subtitle'].map(selector => {
      const element = document.querySelector(selector);
      const style = getComputedStyle(element);
      // A zero-height inline box sits on the actual DOM alphabetic baseline.
      const probe = document.createElement('span');
      probe.style.cssText = 'display:inline-block;width:0;height:0;padding:0;margin:0;vertical-align:baseline';
      element.appendChild(probe);
      const baseline = probe.getBoundingClientRect().top;
      probe.remove();
      return { element, style, rect: element.getBoundingClientRect(), baseline };
    });
    const left = Math.max(0, Math.min(...lines.map(line => line.rect.left)) - 24);
    const top = Math.max(0, Math.min(...lines.map(line => line.rect.top)) - 24);
    const right = Math.min(window.innerWidth, Math.max(...lines.map(line => line.rect.right)) + 24);
    const bottom = Math.min(window.innerHeight, Math.max(...lines.map(line => line.rect.bottom)) + 24);
    const width = Math.max(1, right - left);
    const height = Math.max(1, bottom - top);
    const canvasWidth = Math.ceil(width * ratio);
    const canvasHeight = Math.ceil(height * ratio);
    if (this.titleCanvas.width !== canvasWidth || this.titleCanvas.height !== canvasHeight) {
      this.titleTexture.dispose();
      this.titleCanvas.width = canvasWidth;
      this.titleCanvas.height = canvasHeight;
    }
    this.titleBounds.set(left / window.innerWidth, 1 - bottom / window.innerHeight,
      width / window.innerWidth, height / window.innerHeight);
    const ctx = this.titleCanvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.titleCanvas.width, this.titleCanvas.height);
    ctx.setTransform(this.titleCanvas.width / width, 0, 0, this.titleCanvas.height / height, 0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (const { element, style, rect, baseline } of lines) {
      ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      ctx.fillStyle = style.color;
      ctx.letterSpacing = style.letterSpacing;
      ctx.fillText(element.textContent, rect.left + rect.width / 2 - left, baseline - top);
    }
    this.titleTexture.needsUpdate = true;
  }

  ensureTargets(renderer, transition, blurRadius) {
    renderer.getDrawingBufferSize(this.size);
    // Use the same quality during and outside transitions; bound peak HDR memory.
    const limit = Math.min(4096, renderer.capabilities.maxTextureSize);
    const ratio = Math.min(1, Math.sqrt(4194304 / (this.size.x * this.size.y)),
      limit / this.size.x, limit / this.size.y);
    const width = Math.max(1, Math.floor(this.size.x * ratio));
    const height = Math.max(1, Math.floor(this.size.y * ratio));
    const type = renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType;
    const ensure = (key, w, h, depthBuffer) => {
      if (!this[key]) {
        this[key] = new THREE.WebGLRenderTarget(w, h, {
          type, depthBuffer, colorSpace: THREE.LinearSRGBColorSpace
        });
      } else if (this[key].width !== w || this[key].height !== h) {
        this[key].setSize(w, h);
      }
    };
    const release = key => {
      this[key]?.dispose();
      this[key] = null;
    };
    ensure('toTarget', width, height, true);
    this.material.uniforms.uTexel.value.set(1 / width, 1 / height);
    // Low-DPR line geometry needs edge filtering; retain high-DPR fine detail.
    this.material.uniforms.uAntialias.value = renderer.getPixelRatio() < 1.5 ? 1 : 0;
    if (transition) ensure('fromTarget', width, height, true);
    else release('fromTarget');
    if (blurRadius > 0) {
      ensure('blurXTarget', Math.max(1, Math.floor(width / 2)), Math.max(1, Math.floor(height / 2)), false);
      ensure('blurYTarget', Math.max(1, Math.floor(width / 2)), Math.max(1, Math.floor(height / 2)), false);
    } else {
      release('blurXTarget');
      release('blurYTarget');
    }
  }

  render(renderer, transition, time, drawChapter, chapterId) {
    const p = transition?.progress ?? 1;
    const blurRadius = transition?.type === 'portal'
      ? (1 - THREE.MathUtils.smoothstep(p, 0.25, 1)) * 7 : 0;
    this.ensureTargets(renderer, transition, blurRadius);
    const previousTarget = renderer.getRenderTarget();
    try {
      if (transition) {
        drawChapter(transition.from, time, this.fromTarget);
        drawChapter(transition.to, Math.max(time, transition.start), this.toTarget);
      } else {
        drawChapter(chapterId, time, this.toTarget);
      }
      this.material.uniforms.uFrom.value = this.fromTarget?.texture ?? this.toTarget.texture;
      this.material.uniforms.uTo.value = this.toTarget.texture;
      if (blurRadius > 0) {
        // Radius is measured in CSS pixels, independent of DPR and target caps.
        const step = blurRadius / 3.230769;
        this.blurMaterial.uniforms.uSource.value = this.toTarget.texture;
        this.blurMaterial.uniforms.uDirection.value.set(step / window.innerWidth, 0);
        renderer.setRenderTarget(this.blurXTarget);
        renderer.render(this.blurScene, this.camera);
        this.blurMaterial.uniforms.uSource.value = this.blurXTarget.texture;
        this.blurMaterial.uniforms.uDirection.value.set(0, step / window.innerHeight);
        renderer.setRenderTarget(this.blurYTarget);
        renderer.render(this.blurScene, this.camera);
      }
      this.material.uniforms.uBlurred.value = this.blurYTarget?.texture ?? this.toTarget.texture;
      // Return continuously to the full-resolution source before the portal ends.
      this.material.uniforms.uBlurMix.value = THREE.MathUtils.smoothstep(blurRadius, 0, 1.5);
      this.material.uniforms.uTransition.value = transition ? 1 : 0;
      this.material.uniforms.uShowTitle.value = transition?.from === 0 ? 1 : 0;
      const showCounter = transition?.from === 4 && transition.type === 'portal';
      if (showCounter) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const ratio = Math.min(1, 2048 / width, 1152 / height);
        const w = Math.max(1, Math.ceil(width * ratio));
        const h = Math.max(1, Math.ceil(height * ratio));
        if (this.overlayCanvas.width !== w || this.overlayCanvas.height !== h) {
          this.overlayTexture.dispose();
          this.overlayCanvas.width = w;
          this.overlayCanvas.height = h;
        }
        const ctx = this.overlayCanvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.setTransform(w / width, 0, 0, h / height, 0, 0);
        this.drawOrbitCounter?.(ctx, time, width, height);
        this.overlayTexture.needsUpdate = true;
      }
      this.material.uniforms.uShowChapterOverlay.value = showCounter ? 1 : 0;
      this.material.uniforms.uProgress.value = p;
      this.material.uniforms.uFadeMode.value = transition?.type === 'fade' ? 1 : 0;
      // Geometry chapters need line filtering; procedural fields and galaxy points retain their detail.
      const geometryChapter = id => id >= 1 && id <= 4 ? 1 : 0;
      this.material.uniforms.uFromAntialias.value = geometryChapter(transition?.from);
      this.material.uniforms.uToAntialias.value = geometryChapter(transition?.to ?? chapterId);
      renderer.setRenderTarget(previousTarget);
      renderer.render(this.scene, this.camera);
    } finally {
      renderer.setRenderTarget(previousTarget);
    }
  }
}

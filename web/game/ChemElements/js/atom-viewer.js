/* ====================================
   atom-viewer.js - Three.js 3D Atom Model
   ==================================== */
const AtomViewer = (() => {
  let scene, camera, renderer, controls;
  let canvas;
  let atomGroup = null;
  let animId = null;
  let electrons = [];
  let initialized = false;

  function init(canvasEl) {
    canvas = canvasEl;
  }

  function ensureRenderer() {
    if (initialized) return true;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    console.log('[AtomViewer] ensureRenderer: canvas', w, 'x', h);
    if (w === 0 || h === 0) return false;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 1000);
    camera.position.set(0, 5, 15);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x080c18, 1);

    // Strong lighting so objects are clearly visible
    scene.add(new THREE.AmbientLight(0x606080, 2.0));
    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(10, 15, 12);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0x8888ff, 0.6);
    dir2.position.set(-8, -5, -10);
    scene.add(dir2);

    controls = new THREE.OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 100;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.5;

    initialized = true;
    animate();
    return true;
  }

  function resize(w, h) {
    if (!renderer || w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function animate() {
    animId = requestAnimationFrame(animate);
    for (const e of electrons) {
      e.angle += e.speed * 0.016;
      e.mesh.position.x = Math.cos(e.angle) * e.radius;
      e.mesh.position.y = Math.sin(e.angle) * e.radius;
    }
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  function showElement(el) {
    if (!ensureRenderer()) {
      setTimeout(() => showElement(el), 100);
      return;
    }

    // Cleanup previous
    if (atomGroup) {
      scene.remove(atomGroup);
      atomGroup.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
          else c.material.dispose();
        }
      });
    }
    electrons = [];
    atomGroup = new THREE.Group();

    const protons = el.n;
    const neutrons = Math.max(0, Math.round(el.mass) - protons);
    const shells = el.shells;

    // === NUCLEUS ===
    const total = protons + neutrons;
    const capN = Math.min(total, 50);
    const nRadius = Math.pow(capN, 1/3) * 0.5;

    const pMat = new THREE.MeshStandardMaterial({ color: 0xff3333, roughness: 0.4, metalness: 0.3 });
    const nMat = new THREE.MeshStandardMaterial({ color: 0x7799bb, roughness: 0.5, metalness: 0.2 });
    const ballGeo = new THREE.SphereGeometry(0.32, 10, 8);

    for (let i = 0; i < capN; i++) {
      const mesh = new THREE.Mesh(ballGeo, i < protons ? pMat : nMat);
      const phi = Math.acos(1 - 2 * (i + 0.5) / capN);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = nRadius * (0.6 + Math.random() * 0.4);
      mesh.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      atomGroup.add(mesh);
    }

    // Nucleus glow
    const gGeo = new THREE.SphereGeometry(nRadius * 1.8, 16, 12);
    const gMat = new THREE.MeshBasicMaterial({ color: 0xff4422, transparent: true, opacity: 0.08 });
    atomGroup.add(new THREE.Mesh(gGeo, gMat));

    // === ELECTRON SHELLS ===
    const baseR = nRadius + 1.8;
    const spacing = Math.max(1.2, 2.5 - shells.length * 0.12);
    const eMat = new THREE.MeshStandardMaterial({ color: 0x33ccff, emissive: 0x1188aa, roughness: 0.3, metalness: 0.5 });
    const eGeo = new THREE.SphereGeometry(0.18, 8, 6);

    for (let si = 0; si < shells.length; si++) {
      const sR = baseR + si * spacing;
      const count = shells[si];

      // Orbit ring lines
      const orbits = Math.min(Math.ceil(count / 3), 3);
      for (let oi = 0; oi < orbits; oi++) {
        const pts = [];
        for (let a = 0; a <= 128; a++) {
          const t = (a / 128) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(t) * sR, Math.sin(t) * sR, 0));
        }
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(lineGeo,
          new THREE.LineBasicMaterial({ color: 0x3366aa, transparent: true, opacity: 0.15 })
        );
        line.rotation.x = (oi * Math.PI) / orbits + si * 0.25;
        line.rotation.y = oi * 0.6 + si * 0.15;
        atomGroup.add(line);
      }

      // Electron meshes
      for (let ei = 0; ei < count; ei++) {
        const em = new THREE.Mesh(eGeo, eMat);
        // Glow child
        const gl = new THREE.Mesh(
          new THREE.SphereGeometry(0.4, 6, 4),
          new THREE.MeshBasicMaterial({ color: 0x33ccff, transparent: true, opacity: 0.15 })
        );
        em.add(gl);

        const plane = new THREE.Group();
        const pi_ = ei % Math.max(orbits, 1);
        plane.rotation.x = (pi_ * Math.PI) / Math.max(orbits, 1) + si * 0.25;
        plane.rotation.y = pi_ * 0.6 + si * 0.15;
        plane.add(em);
        atomGroup.add(plane);

        electrons.push({
          mesh: em,
          angle: (ei / count) * Math.PI * 2 + Math.random() * 0.3,
          speed: (1.8 - si * 0.1) * (0.9 + Math.random() * 0.3),
          radius: sR
        });
      }
    }

    scene.add(atomGroup);

    // Camera: frame the whole atom
    const outerR = shells.length > 0 ? baseR + (shells.length - 1) * spacing : nRadius;
    const camDist = outerR * 3.0 + 3;
    camera.position.set(camDist * 0.3, camDist * 0.35, camDist);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  function dispose() {
    if (animId) cancelAnimationFrame(animId);
  }

  return { init, resize, showElement, dispose };
})();

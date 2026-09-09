import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

function createRoundedLeg(color) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const group = new THREE.Group();
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.7, 12), material);
  upper.position.y = -0.36;
  group.add(upper);

  const paw = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), material);
  paw.scale.set(1, 0.65, 1.2);
  paw.position.y = -0.77;
  group.add(paw);
  return group;
}

function createDog() {
  const fur = new THREE.MeshStandardMaterial({ color: 0xc98a49, roughness: 0.95 });
  const softFur = new THREE.MeshStandardMaterial({ color: 0xe0b074, roughness: 0.92 });
  const darkFur = new THREE.MeshStandardMaterial({ color: 0x8e5627, roughness: 0.9 });
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x20140c, roughness: 0.5 });
  const noseMaterial = new THREE.MeshStandardMaterial({ color: 0x2b1b10, roughness: 0.4 });

  const root = new THREE.Group();
  root.position.set(0, 0.95, 0);

  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.56, 1.9, 10, 24), fur);
  torso.rotation.z = Math.PI / 2;
  torso.position.set(0, 0.22, 0);
  torso.scale.set(1.25, 1.02, 1);
  bodyPivot.add(torso);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.56, 18, 18), softFur);
  chest.scale.set(1.08, 1.05, 1.06);
  chest.position.set(0.92, 0.26, 0);
  bodyPivot.add(chest);

  const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 18), darkFur);
  haunch.scale.set(1.14, 1.08, 1.02);
  haunch.position.set(-0.96, 0.2, 0);
  bodyPivot.add(haunch);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.42, 14), softFur);
  neck.rotation.z = -0.34;
  neck.position.set(1.45, 0.66, 0);
  bodyPivot.add(neck);

  const headPivot = new THREE.Group();
  headPivot.position.set(1.76, 0.92, 0);
  bodyPivot.add(headPivot);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.47, 18, 18), softFur);
  head.scale.set(1.08, 0.95, 1);
  headPivot.add(head);

  const muzzle = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.5, 8, 12), softFur);
  muzzle.rotation.z = Math.PI / 2;
  muzzle.position.set(0.46, -0.02, 0);
  headPivot.add(muzzle);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), noseMaterial);
  nose.scale.set(1.1, 0.9, 1);
  nose.position.set(0.8, -0.02, 0);
  headPivot.add(nose);

  const jawPivot = new THREE.Group();
  jawPivot.position.set(0.42, -0.13, 0);
  headPivot.add(jawPivot);
  const jaw = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.36, 8, 12), softFur);
  jaw.rotation.z = Math.PI / 2;
  jaw.position.set(0.14, -0.03, 0);
  jawPivot.add(jaw);

  const leftEar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.44, 0.08), darkFur);
  leftEar.position.set(-0.08, 0.28, 0.28);
  leftEar.rotation.set(0.2, 0.2, 0.35);
  headPivot.add(leftEar);
  const rightEar = leftEar.clone();
  rightEar.position.z = -0.28;
  rightEar.rotation.set(-0.2, -0.2, -0.35);
  headPivot.add(rightEar);

  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), eyeMaterial);
  leftEye.position.set(0.18, 0.08, 0.17);
  headPivot.add(leftEye);
  const rightEye = leftEye.clone();
  rightEye.position.z = -0.17;
  headPivot.add(rightEye);

  const tailPivot = new THREE.Group();
  tailPivot.position.set(-1.48, 0.55, 0);
  bodyPivot.add(tailPivot);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.95, 10), darkFur);
  tail.rotation.z = -Math.PI / 4;
  tail.position.set(-0.34, 0.26, 0);
  tailPivot.add(tail);

  const frontLeft = createRoundedLeg(0xd49e64);
  frontLeft.position.set(0.96, -0.06, 0.34);
  bodyPivot.add(frontLeft);
  const frontRight = createRoundedLeg(0xd49e64);
  frontRight.position.set(0.96, -0.06, -0.34);
  bodyPivot.add(frontRight);
  const backLeft = createRoundedLeg(0xb06d35);
  backLeft.position.set(-0.85, -0.08, 0.34);
  bodyPivot.add(backLeft);
  const backRight = createRoundedLeg(0xb06d35);
  backRight.position.set(-0.85, -0.08, -0.34);
  bodyPivot.add(backRight);

  return {
    root,
    bodyPivot,
    headPivot,
    jawPivot,
    tailPivot,
    frontLeft,
    frontRight,
    backLeft,
    backRight,
  };
}

function createEnvironment(scene) {
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(8.5, 64),
    new THREE.MeshStandardMaterial({ color: 0x7ea864, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.15, 1.8),
    new THREE.MeshStandardMaterial({ color: 0xcba86c, roughness: 0.95 })
  );
  deck.position.set(0, 0.08, 3);
  scene.add(deck);

  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.42, 0.22, 24),
    new THREE.MeshStandardMaterial({ color: 0x4f6472, metalness: 0.3, roughness: 0.55 })
  );
  bowl.position.set(-2.5, 0.12, 2.1);
  scene.add(bowl);

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 18, 18),
    new THREE.MeshStandardMaterial({ color: 0xd06f2b, roughness: 0.7 })
  );
  ball.position.set(2.8, 0.26, -1.6);
  scene.add(ball);

  const fenceMaterial = new THREE.MeshStandardMaterial({ color: 0x8b5b33, roughness: 1 });
  const fence = new THREE.Group();
  const length = 10.5;
  const width = 7.8;

  for (let i = -5; i <= 5; i += 1) {
    const postA = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), fenceMaterial);
    postA.position.set(i, 0.55, width / 2);
    fence.add(postA);
    const postB = postA.clone();
    postB.position.z = -width / 2;
    fence.add(postB);
  }

  for (let i = -3; i <= 3; i += 1) {
    const postA = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), fenceMaterial);
    postA.position.set(length / 2, 0.55, i);
    fence.add(postA);
    const postB = postA.clone();
    postB.position.x = -length / 2;
    fence.add(postB);
  }

  const railGeometry = new THREE.BoxGeometry(length + 0.4, 0.08, 0.08);
  const frontRail = new THREE.Mesh(railGeometry, fenceMaterial);
  frontRail.position.set(0, 0.9, width / 2);
  fence.add(frontRail);
  const backRail = frontRail.clone();
  backRail.position.z = -width / 2;
  fence.add(backRail);

  const sideRailGeometry = new THREE.BoxGeometry(0.08, 0.08, width + 0.4);
  const leftRail = new THREE.Mesh(sideRailGeometry, fenceMaterial);
  leftRail.position.set(-length / 2, 0.9, 0);
  fence.add(leftRail);
  const rightRail = leftRail.clone();
  rightRail.position.x = length / 2;
  fence.add(rightRail);
  scene.add(fence);

  const treeTrunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.24, 1.5, 12),
    new THREE.MeshStandardMaterial({ color: 0x6b4f2c, roughness: 1 })
  );
  treeTrunk.position.set(-4.8, 0.75, -2.4);
  scene.add(treeTrunk);
  const treeLeaves = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 20, 20),
    new THREE.MeshStandardMaterial({ color: 0x6a8f4e, roughness: 0.95 })
  );
  treeLeaves.position.set(-4.8, 2, -2.4);
  scene.add(treeLeaves);

  return {
    bowl,
    ball,
    user: new THREE.Vector3(0, 0.9, 3.6),
  };
}

export class GoldenScene {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xf9f0df, 8, 18);

    this.camera = new THREE.PerspectiveCamera(44, container.clientWidth / container.clientHeight, 0.1, 60);
    this.camera.position.set(4.2, 3.4, 7.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.cameraTarget = new THREE.Vector3(0, 1.1, 0.4);
    this.cameraOffset = new THREE.Vector3();

    const hemi = new THREE.HemisphereLight(0xfff4de, 0x617f4b, 2.4);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff4e8, 2.5);
    sun.position.set(5, 9, 4);
    this.scene.add(sun);

    this.worldTargets = createEnvironment(this.scene);
    const dog = createDog();
    this.dog = dog;
    this.scene.add(dog.root);

    this.clock = new THREE.Clock();
    this.currentPose = "idle";
    this.focusTarget = this.worldTargets.user.clone();
    this.travelTarget = dog.root.position.clone();
    this.moodIntensity = 0.65;
    this.actionQueue = [];
    this.pointerTarget = new THREE.Vector3(0.5, 1.4, 1.8);

    this.renderer.domElement.addEventListener("pointermove", (event) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.pointerTarget.set(x * 2.4, 1.2 + y * 0.7, 1.8);
    });

    window.addEventListener("resize", () => this.onResize());
    this.animate();
  }

  onResize() {
    const { clientWidth, clientHeight } = this.container;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  }

  setMood(snapshot) {
    this.moodIntensity = THREE.MathUtils.clamp((snapshot.joy + snapshot.bond) / 180, 0.25, 1.1);
  }

  focus(name) {
    if (name === "ball") {
      this.focusTarget.copy(this.worldTargets.ball.position).setY(0.5);
      this.travelTarget.set(1.6, 0.95, -0.6);
      return;
    }
    if (name === "bowl") {
      this.focusTarget.copy(this.worldTargets.bowl.position).setY(0.4);
      this.travelTarget.set(-1.8, 0.95, 1.6);
      return;
    }
    this.focusTarget.copy(this.worldTargets.user);
    this.travelTarget.set(0, 0.95, 1.9);
  }

  runActions(actions = [], focusTarget = "user") {
    this.focus(focusTarget);
    this.actionQueue = [...actions];
    this.currentPose = this.actionQueue.shift() ?? "idle";
  }

  animate() {
    const delta = this.clock.getDelta();
    const time = this.clock.elapsedTime;
    this.updateCamera(delta, time);
    this.updateDog(delta, time);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.animate());
  }

  updateCamera(delta, time) {
    const idleOrbit = new THREE.Vector3(
      Math.sin(time * 0.16) * 0.28,
      Math.sin(time * 0.11) * 0.08,
      Math.cos(time * 0.14) * 0.18
    );
    const desiredOffset = this.pointerTarget.clone().multiplyScalar(0.08).add(idleOrbit);
    this.cameraOffset.lerp(desiredOffset, delta * 1.6);
    this.camera.position.set(
      4.2 + this.cameraOffset.x,
      3.4 + this.cameraOffset.y,
      7.5 + this.cameraOffset.z
    );
    this.camera.lookAt(this.cameraTarget);
  }

  updateDog(delta, time) {
    const root = this.dog.root;
    const body = this.dog.bodyPivot;
    const head = this.dog.headPivot;
    const jaw = this.dog.jawPivot;
    const tail = this.dog.tailPivot;
    const bob = Math.sin(time * 2.2) * 0.02;
    const wag = Math.sin(time * 10 * this.moodIntensity) * (0.2 + this.moodIntensity * 0.45);
    const pointer = this.pointerTarget.clone().multiplyScalar(0.15).add(this.focusTarget.clone().multiplyScalar(0.85));
    head.lookAt(pointer);
    tail.rotation.z = -0.45 + wag;
    jaw.rotation.z = this.currentPose === "bark" ? Math.sin(time * 18) * 0.4 : 0;

    body.position.y = bob;
    body.rotation.z = 0;
    body.rotation.x = 0;
    root.position.lerp(this.travelTarget, delta * 1.4);
    root.lookAt(this.focusTarget.x, root.position.y, this.focusTarget.z);

    const walkSwing = Math.sin(time * 8) * 0.55;
    const bounce = Math.abs(Math.sin(time * 8)) * 0.05;
    this.dog.frontLeft.rotation.z = 0;
    this.dog.frontRight.rotation.z = 0;
    this.dog.backLeft.rotation.z = 0;
    this.dog.backRight.rotation.z = 0;

    if (this.currentPose === "comeUser" || this.currentPose === "walkBowl") {
      this.currentPose = "walk";
    }

    if (this.currentPose === "walk" || this.currentPose === "fetch" || this.currentPose === "bringBack") {
      body.position.y += bounce;
      this.dog.frontLeft.rotation.z = walkSwing;
      this.dog.frontRight.rotation.z = -walkSwing;
      this.dog.backLeft.rotation.z = -walkSwing;
      this.dog.backRight.rotation.z = walkSwing;
    }

    if (this.currentPose === "sit") {
      root.position.y = 0.84;
      body.rotation.z = -0.12;
      this.dog.backLeft.rotation.z = -0.95;
      this.dog.backRight.rotation.z = -0.95;
      this.dog.frontLeft.rotation.z = 0.18;
      this.dog.frontRight.rotation.z = -0.18;
    } else {
      root.position.y = THREE.MathUtils.lerp(root.position.y, 0.95, delta * 5);
    }

    if (this.currentPose === "playBow") {
      body.rotation.z = 0.32;
      body.rotation.x = 0.08;
      head.rotation.y = Math.sin(time * 6) * 0.22;
    }

    if (this.currentPose === "rest") {
      root.position.y = 0.72;
      body.rotation.z = -0.24;
      tail.rotation.z = -0.75 + wag * 0.25;
      this.dog.frontLeft.rotation.z = 0.65;
      this.dog.frontRight.rotation.z = 0.4;
      this.dog.backLeft.rotation.z = -0.4;
      this.dog.backRight.rotation.z = -0.1;
    }

    if (this.currentPose === "scan") {
      head.rotation.y += Math.sin(time * 2) * 0.08;
    }

    if (this.currentPose === "guard") {
      body.rotation.x = -0.08;
      tail.rotation.z = -0.18;
      head.rotation.x -= 0.08;
    }

    if (this.currentPose === "eat") {
      this.focusTarget.copy(this.worldTargets.bowl.position).setY(0.22);
      jaw.rotation.z = Math.sin(time * 10) * 0.1;
      body.rotation.z = 0.18;
    }

    if (this.currentPose === "fetch") {
      this.focusTarget.copy(this.worldTargets.ball.position).setY(0.4);
      this.travelTarget.set(2.1, 0.95, -1.2);
    }

    if (this.currentPose === "bringBack") {
      this.focusTarget.copy(this.worldTargets.user);
      this.travelTarget.set(0.2, 0.95, 1.6);
    }

    if (this.actionQueue.length > 0 && Math.random() < delta * 0.45) {
      this.currentPose = this.actionQueue.shift();
      if (this.currentPose === "lookUser") {
        this.focus("user");
      }
      if (this.currentPose === "walkBowl") {
        this.focus("bowl");
      }
      if (this.currentPose === "comeUser") {
        this.focus("user");
      }
    }
  }
}

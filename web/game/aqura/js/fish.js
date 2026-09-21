import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";
import { FISH_CATALOG } from "./state.js";

/**
 * Aqura Fish AI & Procedural 3D Creature Engine
 * Features species-specific procedural meshes, undulating spine swimming bones,
 * Boids flocking, hunger navigation, feeding, and fleeing reactions.
 */

export class FishManager {
  constructor(scene, tankBounds, audioManager, foodManager, gameState) {
    this.scene = scene;
    this.bounds = tankBounds;
    this.audio = audioManager;
    this.foodManager = foodManager;
    this.gameState = gameState;

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.fishList = []; // Active 3D fish instances
    this.selectedFish = null;
  }

  syncWithState(stateFishes) {
    // Keep existing fish that are still in state, add newly bought, remove absent
    const stateIds = new Set(stateFishes.map(f => f.id));

    for (let i = this.fishList.length - 1; i >= 0; i--) {
      const f = this.fishList[i];
      if (!stateIds.has(f.id)) {
        this.rootGroup.remove(f.group);
        this.fishList.splice(i, 1);
      }
    }

    for (const sf of stateFishes) {
      const existing = this.fishList.find(f => f.id === sf.id);
      if (!existing) {
        this.spawnFish(sf);
      }
    }
  }

  spawnFish(fishData) {
    const config = FISH_CATALOG[fishData.type] || FISH_CATALOG.clownfish;
    const meshData = this.buildCreatureMesh(fishData.type, config);

    // Initial random position inside tank
    const margin = 0.8;
    const x = this.bounds.minX + margin + Math.random() * (this.bounds.maxX - this.bounds.minX - 2 * margin);
    const y = this.bounds.minY + 0.8 + Math.random() * (this.bounds.maxY - this.bounds.minY - 1.6);
    const z = this.bounds.minZ + margin + Math.random() * (this.bounds.maxZ - this.bounds.minZ - 2 * margin);

    meshData.group.position.set(x, y, z);
    this.rootGroup.add(meshData.group);

    const fishInstance = {
      id: fishData.id,
      type: fishData.type,
      data: fishData,
      group: meshData.group,
      parts: meshData.parts,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * config.speed * 0.8,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * config.speed * 0.8
      ),
      maxSpeed: config.speed,
      targetPos: new THREE.Vector3(x, y, z),
      wanderTimer: Math.random() * 3,
      scaredTimer: 0,
      phaseOffset: Math.random() * Math.PI * 2,
      isJellyfish: fishData.type === "jellyfish"
    };

    this.fishList.push(fishInstance);
    return fishInstance;
  }

  buildCreatureMesh(type, config) {
    if (type === "jellyfish") {
      return this.buildJellyfishMesh(config);
    }
    return this.buildFishMesh(type, config);
  }

  buildFishMesh(type, config) {
    const group = new THREE.Group();
    const model = new THREE.Group();
    model.rotation.y = -Math.PI / 2;
    group.add(model);
    const parts = { model };

    const baseColor = config.colors.body;
    const stripeColor = config.colors.stripe;
    const finColor = config.colors.fin;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.4,
      metalness: 0.1
    });

    const stripeMat = new THREE.MeshStandardMaterial({
      color: stripeColor,
      roughness: 0.5,
      metalness: 0.05
    });

    const finMat = new THREE.MeshStandardMaterial({
      color: finColor,
      roughness: 0.3,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });

    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const eyeBlackMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    // 1. Torso Geometry
    let bodyGeom;
    const scale = config.size || 1.0;

    if (type === "angelfish") {
      // Elegant disc-like diamond body
      bodyGeom = new THREE.CylinderGeometry(0.44 * scale, 0.44 * scale, 0.12 * scale, 24);
      bodyGeom.rotateZ(Math.PI / 2);
      bodyGeom.scale(0.85, 1.45, 1.0);
    } else if (type === "betta") {
      // Slender flowing body
      bodyGeom = new THREE.SphereGeometry(0.32 * scale, 20, 16);
      bodyGeom.scale(1.4, 0.85, 0.4);
    } else if (type === "koi") {
      // Torpedo streamlined body
      bodyGeom = new THREE.SphereGeometry(0.42 * scale, 24, 18);
      bodyGeom.scale(1.5, 0.95, 0.65);
    } else {
      // Standard oval body (clownfish, blue tang)
      bodyGeom = new THREE.SphereGeometry(0.38 * scale, 24, 18);
      bodyGeom.scale(1.28, 0.95, 0.48);
    }

    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    model.add(bodyMesh);
    parts.body = bodyMesh;

    // 2. Distinct stripes / patterns & species specifics
    if (type === "clownfish") {
      // White vertical stripes with dark borders
      const makeStripe = (xPos, ringScale) => {
        const stripeGeom = new THREE.TorusGeometry(0.37 * scale * ringScale, 0.038 * scale, 8, 24);
        stripeGeom.scale(1.0, 0.88, 0.46);
        const stripe = new THREE.Mesh(stripeGeom, stripeMat);
        stripe.position.x = xPos * scale;
        model.add(stripe);
      };
      makeStripe(0.12, 1.0);   // Head band
      makeStripe(-0.08, 0.95); // Middle band
      makeStripe(-0.28, 0.68); // Tail band
    } else if (type === "blue_tang") {
      // Signature dark palette swirl pattern
      const badge = new THREE.Mesh(new THREE.SphereGeometry(0.22 * scale, 12, 12), stripeMat);
      badge.scale.set(1.3, 0.75, 0.52);
      badge.position.set(-0.04 * scale, 0.08 * scale, 0);
      model.add(badge);
    } else if (type === "angelfish") {
      // Long graceful ventral feelers (pelvic filaments)
      const feelerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      [-1, 1].forEach(zSign => {
        const feelerGeom = new THREE.CylinderGeometry(0.012 * scale, 0.004 * scale, 1.2 * scale, 6);
        feelerGeom.translate(0, -0.6 * scale, 0);
        const feeler = new THREE.Mesh(feelerGeom, feelerMat);
        feeler.position.set(0.08 * scale, -0.45 * scale, zSign * 0.06 * scale);
        feeler.rotation.z = -0.25;
        feeler.rotation.x = zSign * 0.15;
        model.add(feeler);
      });

      // Bottom anal crest fin
      const analGeom = new THREE.ConeGeometry(0.18 * scale, 1.1 * scale, 4);
      analGeom.rotateZ(0.65);
      const analMesh = new THREE.Mesh(analGeom, finMat);
      analMesh.position.set(-0.1 * scale, -0.55 * scale, 0);
      model.add(analMesh);
    }

    // 3. Lively Eyes with pupils and catchlight glints
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const addEye = (zSign) => {
      const eyePivot = new THREE.Group();
      eyePivot.position.set(0.3 * scale, 0.08 * scale, zSign * 0.16 * scale);

      // Sclera
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.062 * scale, 12, 12), eyeWhiteMat);
      white.scale.set(1.0, 1.0, 0.6);
      eyePivot.add(white);

      // Pupil facing outwards and slightly forward
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.038 * scale, 10, 10), eyeBlackMat);
      pupil.position.set(0.015 * scale, 0, zSign * 0.035 * scale);
      pupil.scale.set(1.0, 1.0, 0.5);
      eyePivot.add(pupil);

      // Cute white catchlight reflection dot
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.012 * scale, 6, 6), glintMat);
      glint.position.set(0.03 * scale, 0.018 * scale, zSign * 0.05 * scale);
      eyePivot.add(glint);

      model.add(eyePivot);
    };
    addEye(1);
    addEye(-1);

    // 4. Pectoral Fins (Left & Right)
    const pecGeom = new THREE.CircleGeometry(0.18 * scale, 12, 0, Math.PI);
    pecGeom.rotateZ(-Math.PI / 2);

    const pecLeftPivot = new THREE.Group();
    pecLeftPivot.position.set(0.12 * scale, -0.06 * scale, 0.19 * scale);
    pecLeftPivot.rotation.y = 0.5;
    const pecLeft = new THREE.Mesh(pecGeom, finMat);
    pecLeftPivot.add(pecLeft);
    model.add(pecLeftPivot);
    parts.pecLeft = pecLeftPivot;

    const pecRightPivot = new THREE.Group();
    pecRightPivot.position.set(0.12 * scale, -0.06 * scale, -0.19 * scale);
    pecRightPivot.rotation.y = -0.5;
    const pecRight = new THREE.Mesh(pecGeom, finMat);
    pecRightPivot.add(pecRight);
    model.add(pecRightPivot);
    parts.pecRight = pecRightPivot;

    // 5. Dorsal Fin (Top)
    let dorsalGeom;
    if (type === "angelfish") {
      dorsalGeom = new THREE.ConeGeometry(0.22 * scale, 1.35 * scale, 4);
      dorsalGeom.rotateZ(-0.55);
    } else if (type === "betta") {
      dorsalGeom = new THREE.CircleGeometry(0.45 * scale, 12, 0, Math.PI);
      dorsalGeom.rotateZ(Math.PI / 6);
    } else {
      dorsalGeom = new THREE.CircleGeometry(0.35 * scale, 12, 0, Math.PI);
      dorsalGeom.scale(1.2, 0.6, 1.0);
    }
    const dorsalMesh = new THREE.Mesh(dorsalGeom, finMat);
    dorsalMesh.position.set(-0.08 * scale, 0.42 * scale, 0);
    model.add(dorsalMesh);

    // 6. Tail Stem Pivot (First joint for spine undulation)
    const tailPivot = new THREE.Group();
    tailPivot.position.set(-0.38 * scale, 0, 0);
    model.add(tailPivot);
    parts.tailPivot = tailPivot;

    // 7. Caudal / Tail Fin (Connected to tail stem)
    let tailGeom;
    if (type === "betta") {
      tailGeom = new THREE.CircleGeometry(0.65 * scale, 16, -Math.PI / 2, Math.PI);
      tailGeom.rotateZ(Math.PI);
      tailGeom.translate(-0.35 * scale, 0, 0);
    } else if (type === "angelfish") {
      tailGeom = new THREE.ConeGeometry(0.35 * scale, 0.55 * scale, 3);
      tailGeom.rotateZ(Math.PI / 2);
      tailGeom.translate(-0.28 * scale, 0, 0);
    } else if (type === "koi") {
      tailGeom = new THREE.ConeGeometry(0.4 * scale, 0.6 * scale, 3);
      tailGeom.rotateZ(Math.PI / 2);
      tailGeom.translate(-0.3 * scale, 0, 0);
    } else {
      // Rounded paddle tail (Clownfish & Blue Tang)
      tailGeom = new THREE.CircleGeometry(0.32 * scale, 16, -Math.PI / 2.5, (2 * Math.PI) / 2.5);
      tailGeom.rotateZ(Math.PI);
      tailGeom.translate(-0.28 * scale, 0, 0);
    }

    const tailMesh = new THREE.Mesh(tailGeom, finMat);
    tailPivot.add(tailMesh);
    parts.tailMesh = tailMesh;

    return { group, parts };
  }

  buildJellyfishMesh(config) {
    const group = new THREE.Group();
    const parts = {};
    const scale = config.size || 1.1;

    // Translucent glowing bell dome
    const bellGeom = new THREE.SphereGeometry(0.45 * scale, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const bellMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x007799,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide
    });
    const bellMesh = new THREE.Mesh(bellGeom, bellMat);
    group.add(bellMesh);
    parts.bell = bellMesh;

    // Inner glowing core
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.16 * scale, 8, 8), coreMat);
    core.position.y = 0.1;
    group.add(core);

    // Trailing tentacles
    const tentacleCount = 8;
    const tentacles = [];
    const tentacleMat = new THREE.MeshBasicMaterial({
      color: 0x80d8ff,
      transparent: true,
      opacity: 0.65
    });

    for (let i = 0; i < tentacleCount; i++) {
      const angle = (i / tentacleCount) * Math.PI * 2;
      const rad = 0.35 * scale;
      const tGeom = new THREE.CylinderGeometry(0.015 * scale, 0.005 * scale, 1.2 * scale, 4);
      tGeom.translate(0, -0.6 * scale, 0);

      const tMesh = new THREE.Mesh(tGeom, tentacleMat);
      tMesh.position.set(Math.cos(angle) * rad, 0, Math.sin(angle) * rad);
      group.add(tMesh);
      tentacles.push({ mesh: tMesh, phase: angle });
    }
    parts.tentacles = tentacles;

    return { group, parts };
  }

  tapGlass(tapPoint) {
    // Scare nearby fish away from tap point with shockwave effect
    this.audio.playTap();

    for (const f of this.fishList) {
      const fishPos = f.group.position;
      const dist = fishPos.distanceTo(tapPoint);
      if (dist < 4.0) {
        f.scaredTimer = 2.0; // Scared for 2 seconds
        const awayVec = new THREE.Vector3().subVectors(fishPos, tapPoint).normalize();
        // Give sudden burst of speed away
        f.velocity.add(awayVec.multiplyScalar(2.8));
      }
    }
  }

  update(delta, time) {
    const activeFoods = this.foodManager.foods;

    for (let i = 0; i < this.fishList.length; i++) {
      const f = this.fishList[i];
      const pos = f.group.position;

      // 1. Behavior Decision
      f.scaredTimer = Math.max(0, f.scaredTimer - delta);

      let targetPos = null;
      let targetSpeed = f.maxSpeed;

      if (f.scaredTimer > 0) {
        // High panic speed
        targetSpeed = f.maxSpeed * 2.2;
      } else {
        // Check for nearby falling food
        if (activeFoods.length > 0 && f.data.hunger < 95) {
          let closestFood = null;
          let minDist = 5.0; // Detection radius
          for (const food of activeFoods) {
            const d = pos.distanceTo(food.mesh.position);
            if (d < minDist) {
              minDist = d;
              closestFood = food;
            }
          }

          if (closestFood) {
            targetPos = closestFood.mesh.position;
            targetSpeed = f.maxSpeed * 1.5;

            // Check if reached food
            if (minDist < 0.35) {
              this.foodManager.consume(closestFood, pos, f.id);
            }
          }
        }
      }

      // If no food or panic, idle wander + Boids
      if (!targetPos && f.scaredTimer <= 0) {
        f.wanderTimer -= delta;
        if (f.wanderTimer <= 0) {
          f.wanderTimer = 3 + Math.random() * 4;
          const margin = 1.0;
          f.targetPos.set(
            this.bounds.minX + margin + Math.random() * (this.bounds.maxX - this.bounds.minX - 2 * margin),
            this.bounds.minY + 0.6 + Math.random() * (this.bounds.maxY - this.bounds.minY - 1.2),
            this.bounds.minZ + margin + Math.random() * (this.bounds.maxZ - this.bounds.minZ - 2 * margin)
          );
        }
        targetPos = f.targetPos;
      }

      // 2. Steer towards target
      if (targetPos) {
        const desired = new THREE.Vector3().subVectors(targetPos, pos).normalize().multiplyScalar(targetSpeed);
        const steer = new THREE.Vector3().subVectors(desired, f.velocity);
        steer.clampLength(0, 2.5 * delta);
        f.velocity.add(steer);
      }

      // 3. Flocking & Separation from other fish
      const sepForce = new THREE.Vector3();
      for (let j = 0; j < this.fishList.length; j++) {
        if (i === j) continue;
        const other = this.fishList[j];
        const d = pos.distanceTo(other.group.position);
        if (d < 0.6 && d > 0.001) {
          const diff = new THREE.Vector3().subVectors(pos, other.group.position).normalize();
          diff.divideScalar(d);
          sepForce.add(diff);
        }
      }
      f.velocity.add(sepForce.multiplyScalar(delta * 1.8));

      // 4. Tank Boundary Repulsion (Soft borders)
      const boundMargin = 0.6;
      const turnForce = 4.0 * delta;

      if (pos.x < this.bounds.minX + boundMargin) f.velocity.x += turnForce;
      if (pos.x > this.bounds.maxX - boundMargin) f.velocity.x -= turnForce;
      if (pos.y < this.bounds.minY + boundMargin) f.velocity.y += turnForce;
      if (pos.y > this.bounds.maxY - boundMargin) f.velocity.y -= turnForce;
      if (pos.z < this.bounds.minZ + boundMargin) f.velocity.z += turnForce;
      if (pos.z > this.bounds.maxZ - boundMargin) f.velocity.z -= turnForce;

      // Speed limits
      const currentSpeed = f.velocity.length();
      if (currentSpeed > targetSpeed * 1.5) {
        f.velocity.clampLength(0, targetSpeed * 1.5);
      }

      // Update position
      pos.addScaledVector(f.velocity, delta);

      // Clamp strictly within tank
      pos.x = THREE.MathUtils.clamp(pos.x, this.bounds.minX + 0.2, this.bounds.maxX - 0.2);
      pos.y = THREE.MathUtils.clamp(pos.y, this.bounds.minY + 0.3, this.bounds.maxY - 0.2);
      pos.z = THREE.MathUtils.clamp(pos.z, this.bounds.minZ + 0.2, this.bounds.maxZ - 0.2);

      // 5. Rotation & Heading
      if (f.isJellyfish) {
        // Jellyfish pulse upwards and bob gently
        const pulse = Math.sin(time * 3 + f.phaseOffset);
        const scaleBell = 1.0 + Math.max(0, pulse) * 0.25;
        f.parts.bell.scale.set(scaleBell, 1.0 - pulse * 0.15, scaleBell);
        
        // Tilt slightly towards travel direction
        f.group.rotation.x = Math.sin(time * 1.2) * 0.1;
        f.group.rotation.z = Math.cos(time * 1.2) * 0.1;

        // Animate trailing tentacles
        for (const t of f.parts.tentacles) {
          t.mesh.rotation.x = Math.sin(time * 2 + t.phase) * 0.2;
          t.mesh.rotation.z = Math.cos(time * 2 + t.phase) * 0.2;
        }
      } else {
        // Fish heading lookAt
        if (f.velocity.lengthSq() > 0.001) {
          const lookTarget = pos.clone().add(f.velocity);
          f.group.lookAt(lookTarget);
        }

        // Spine swimming undulation animation
        const freq = (f.scaredTimer > 0 ? 14 : 7) * (currentSpeed / (f.maxSpeed || 1));
        const tailAngle = Math.sin(time * freq + f.phaseOffset) * 0.38;
        if (f.parts.tailPivot) {
          f.parts.tailPivot.rotation.y = tailAngle;
        }

        // Pectoral fin fluttering
        if (f.parts.pecLeft && f.parts.pecRight) {
          const pecFlap = Math.sin(time * freq * 1.2 + f.phaseOffset) * 0.25;
          f.parts.pecLeft.rotation.y = 0.5 + pecFlap;
          f.parts.pecRight.rotation.y = -0.5 - pecFlap;
        }
      }
    }
  }

  getFishByMesh(object) {
    let curr = object;
    while (curr && curr.parent) {
      const match = this.fishList.find(f => f.group === curr);
      if (match) return match;
      curr = curr.parent;
    }
    return null;
  }
}

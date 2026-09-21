import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

/**
 * Aqura Aquarium Aquascaping & Dynamic Decorations
 * Creates animated swaying aquatic plants, corals, bubbling air stone, and animated treasure chest.
 */

export class DecorationManager {
  constructor(scene, tankBounds, audioManager) {
    this.scene = scene;
    this.bounds = tankBounds;
    this.audio = audioManager;
    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.animatedDecorations = [];
    this.bubbleEmitters = [];
  }

  clear() {
    while (this.rootGroup.children.length > 0) {
      const obj = this.rootGroup.children[0];
      this.rootGroup.remove(obj);
    }
    this.animatedDecorations = [];
    this.bubbleEmitters = [];
  }

  loadFromState(decorationsList) {
    this.clear();
    for (const dec of decorationsList) {
      this.addDecoration(dec);
    }
  }

  addDecoration(dec) {
    const y = this.bounds.minY;
    let obj = null;

    switch (dec.type) {
      case "seaweed_cluster":
        obj = this.createSeaweedCluster();
        break;
      case "coral_reef":
        obj = this.createCoralReef();
        break;
      case "air_stone":
        obj = this.createAirStone();
        break;
      case "treasure_chest":
        obj = this.createTreasureChest();
        break;
      case "roman_column":
        obj = this.createRomanColumn();
        break;
      default:
        obj = this.createSeaweedCluster();
    }

    if (obj) {
      obj.position.set(dec.x, y, dec.z);
      this.rootGroup.add(obj);
    }
  }

  createSeaweedCluster() {
    const group = new THREE.Group();
    const blades = [];
    const bladeCount = 6 + Math.floor(Math.random() * 4);

    const greenShades = [0x2e7d32, 0x388e3c, 0x43a047, 0x1b5e20, 0x66bb6a];

    for (let i = 0; i < bladeCount; i++) {
      const height = 1.8 + Math.random() * 1.6;
      const width = 0.12 + Math.random() * 0.08;
      const segments = 8;
      const geom = new THREE.PlaneGeometry(width, height, 1, segments);
      
      // Shift origin to bottom
      geom.translate(0, height / 2, 0);

      const mat = new THREE.MeshStandardMaterial({
        color: greenShades[i % greenShades.length],
        roughness: 0.7,
        metalness: 0.1,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geom, mat);
      const angle = (i / bladeCount) * Math.PI * 2 + Math.random() * 0.3;
      const rad = 0.15 + Math.random() * 0.25;

      mesh.position.set(Math.cos(angle) * rad, 0, Math.sin(angle) * rad);
      mesh.rotation.y = Math.random() * Math.PI;

      group.add(mesh);

      blades.push({
        mesh,
        geom,
        posAttr: geom.attributes.position,
        origX: Array.from(geom.attributes.position.array),
        height,
        phase: Math.random() * Math.PI * 2,
        speed: 1.2 + Math.random() * 0.8
      });
    }

    this.animatedDecorations.push({
      type: "seaweed",
      blades
    });

    return group;
  }

  createCoralReef() {
    const group = new THREE.Group();

    // Rock base
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a544d, roughness: 0.95 });
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 1), rockMat);
    rock.scale.set(1.4, 0.6, 1.2);
    rock.position.y = 0.3;
    group.add(rock);

    // Branching corals
    const coralMat1 = new THREE.MeshStandardMaterial({ color: 0xff4081, roughness: 0.75 }); // hot pink
    const coralMat2 = new THREE.MeshStandardMaterial({ color: 0xff9100, roughness: 0.8 }); // neon orange
    const coralMat3 = new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.7 }); // cyan

    // Create organic coral branches
    const createBranch = (mat, scale, posX, posZ, rotZ) => {
      const branchGroup = new THREE.Group();
      branchGroup.position.set(posX, 0.4, posZ);
      branchGroup.rotation.z = rotZ;
      branchGroup.scale.setScalar(scale);

      const mainStem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.2, 8), mat);
      mainStem.position.y = 0.6;
      branchGroup.add(mainStem);

      const tip1 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), mat);
      tip1.position.y = 1.2;
      branchGroup.add(tip1);

      const sideStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.6, 6), mat);
      sideStem.position.set(0.15, 0.7, 0);
      sideStem.rotation.z = -0.5;
      branchGroup.add(sideStem);

      return branchGroup;
    };

    group.add(createBranch(coralMat1, 0.9, -0.3, 0.1, 0.15));
    group.add(createBranch(coralMat2, 1.1, 0.2, -0.2, -0.2));
    group.add(createBranch(coralMat3, 0.75, 0.4, 0.3, 0.3));

    // Brain coral mound
    const brainMat = new THREE.MeshStandardMaterial({ color: 0xba68c8, roughness: 0.9 });
    const brainCoral = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), brainMat);
    brainCoral.scale.set(1.2, 0.7, 1.1);
    brainCoral.position.set(-0.4, 0.3, -0.3);
    group.add(brainCoral);

    return group;
  }

  createAirStone() {
    const group = new THREE.Group();

    // Porous stone geometry
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.95 });
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.2, 16), stoneMat);
    stone.position.y = 0.1;
    group.add(stone);

    // Aerator pipe connector
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.6 });
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), pipeMat);
    pipe.rotation.z = Math.PI / 3;
    pipe.position.set(-0.25, 0.1, 0);
    group.add(pipe);

    // Register active bubble emitter
    this.bubbleEmitters.push({
      parentGroup: group,
      rate: 10, // bubbles per second
      accum: 0,
      minRadius: 0.03,
      maxRadius: 0.08
    });

    return group;
  }

  createTreasureChest() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.85 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffb300, roughness: 0.4, metalness: 0.8 });

    // Chest Base
    const baseGeom = new THREE.BoxGeometry(0.8, 0.45, 0.55);
    const baseMesh = new THREE.Mesh(baseGeom, woodMat);
    baseMesh.position.y = 0.225;
    group.add(baseMesh);

    // Metal edge bands
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.5, metalness: 0.7 });
    const band1 = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.47, 0.06), bandMat);
    band1.position.set(0, 0.225, 0.18);
    group.add(band1);
    const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.47, 0.06), bandMat);
    band2.position.set(0, 0.225, -0.18);
    group.add(band2);

    // Lid pivot (Hinged at the rear top edge)
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.45, -0.275);
    group.add(lidPivot);

    const lidGeom = new THREE.CylinderGeometry(0.28, 0.28, 0.8, 12, 1, false, 0, Math.PI);
    lidGeom.rotateZ(Math.PI / 2);
    const lidMesh = new THREE.Mesh(lidGeom, woodMat);
    lidMesh.position.set(0, 0, 0.275);
    lidPivot.add(lidMesh);

    // Gold Lock
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.08), goldMat);
    lock.position.set(0, 0, 0.56);
    lidPivot.add(lock);

    // Inside gold pile (glows when opened)
    const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.25, 8), goldMat);
    pile.position.set(0, 0.28, 0);
    group.add(pile);

    this.animatedDecorations.push({
      type: "chest",
      lidPivot,
      group,
      timer: 0,
      isOpen: false,
      cycleDuration: 10 // seconds
    });

    return group;
  }

  createRomanColumn() {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.9 });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x558b2f, roughness: 0.85 });

    // Plinth base
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.9), stoneMat);
    base.position.y = 0.125;
    group.add(base);

    // Fluted Column (Broken top)
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 2.2, 14), stoneMat);
    col.position.y = 1.3;
    col.rotation.z = 0.08;
    group.add(col);

    // Fallen capital lying on sand
    const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 0.5, 8), stoneMat);
    capital.rotation.x = Math.PI / 2.2;
    capital.position.set(0.65, 0.25, 0.3);
    group.add(capital);

    // Patch of underwater moss on base
    const moss = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), mossMat);
    moss.scale.set(1.2, 0.3, 1.0);
    moss.position.set(0.2, 0.26, 0.2);
    group.add(moss);

    return group;
  }

  update(delta, time, bubbleSystem) {
    // 1. Update seaweed sinusoidal flow
    for (const item of this.animatedDecorations) {
      if (item.type === "seaweed") {
        for (const b of item.blades) {
          const pos = b.posAttr;
          const orig = b.origX;
          const count = pos.count;
          const sway = Math.sin(time * b.speed + b.phase) * 0.18;

          for (let i = 0; i < count; i++) {
            const y = orig[i * 3 + 1];
            // Stronger sway towards blade tip (quadratic displacement)
            const heightRatio = y / b.height;
            const factor = heightRatio * heightRatio;
            pos.setX(i, orig[i * 3] + sway * factor);
            pos.setZ(i, orig[i * 3 + 2] + Math.cos(time * b.speed * 0.7 + b.phase) * 0.1 * factor);
          }
          pos.needsUpdate = true;
        }
      } else if (item.type === "chest") {
        // 2. Animate treasure chest lid
        item.timer += delta;
        const cycleProgress = (item.timer % item.cycleDuration) / item.cycleDuration;
        
        // Open between 0.7 and 0.9 of cycle
        if (cycleProgress > 0.75 && cycleProgress < 0.95) {
          // Opening
          item.lidPivot.rotation.x = THREE.MathUtils.lerp(item.lidPivot.rotation.x, -Math.PI * 0.45, delta * 4);
          // Release bubbles while open
          if (bubbleSystem && Math.random() < 0.35) {
            const chestWorldPos = new THREE.Vector3();
            item.group.getWorldPosition(chestWorldPos);
            bubbleSystem.spawnBubble(
              chestWorldPos.x + (Math.random() - 0.5) * 0.4,
              chestWorldPos.y + 0.45,
              chestWorldPos.z + (Math.random() - 0.5) * 0.3,
              0.05 + Math.random() * 0.05
            );
          }
        } else {
          // Closed
          item.lidPivot.rotation.x = THREE.MathUtils.lerp(item.lidPivot.rotation.x, 0, delta * 3);
        }
      }
    }

    // 3. Update air stone continuous bubbler
    if (bubbleSystem) {
      for (const emitter of this.bubbleEmitters) {
        emitter.accum += delta * emitter.rate;
        while (emitter.accum >= 1) {
          emitter.accum -= 1;
          const stoneWorld = new THREE.Vector3();
          emitter.parentGroup.getWorldPosition(stoneWorld);
          
          const rx = stoneWorld.x + (Math.random() - 0.5) * 0.3;
          const rz = stoneWorld.z + (Math.random() - 0.5) * 0.3;
          const rad = emitter.minRadius + Math.random() * (emitter.maxRadius - emitter.minRadius);
          bubbleSystem.spawnBubble(rx, stoneWorld.y + 0.25, rz, rad);
        }
      }
    }
  }
}

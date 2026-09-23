import * as THREE from "three";

/**
 * Aqura Food Pellets & Floating Particles Engine
 * Simulates buoyant food sinking, dispersion, and consumption by fish.
 */

export class FoodManager {
  constructor(scene, tankBounds, audioManager, gameState) {
    this.scene = scene;
    this.bounds = tankBounds;
    this.audio = audioManager;
    this.gameState = gameState;
    this.foods = []; // active food items
    this.floatingEffects = []; // heart / coin 3D sprites

    // Reusable geometry and materials for performance
    this.pelletGeom = new THREE.DodecahedronGeometry(0.08, 0);
    this.flakeGeom = new THREE.CylinderGeometry(0.09, 0.09, 0.02, 6);
    this.foodMat1 = new THREE.MeshStandardMaterial({
      color: 0xcd6133,
      roughness: 0.8,
      metalness: 0.1
    });
    this.foodMat2 = new THREE.MeshStandardMaterial({
      color: 0x27ae60,
      roughness: 0.9,
      metalness: 0.05
    });

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);
  }

  spawnFood(originX, originZ) {
    // Clamp within tank top surface
    const x = Math.max(this.bounds.minX + 0.5, Math.min(this.bounds.maxX - 0.5, originX));
    const z = Math.max(this.bounds.minZ + 0.5, Math.min(this.bounds.maxZ - 0.5, originZ));
    const y = this.bounds.maxY - 0.2;

    // Spawn 2 to 4 small flakes/pellets with slight dispersion
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const isFlake = Math.random() > 0.5;
      const mesh = new THREE.Mesh(
        isFlake ? this.flakeGeom : this.pelletGeom,
        Math.random() > 0.3 ? this.foodMat1 : this.foodMat2
      );
      
      const px = x + (Math.random() - 0.5) * 0.4;
      const pz = z + (Math.random() - 0.5) * 0.4;
      mesh.position.set(px, y, pz);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

      this.rootGroup.add(mesh);

      this.foods.push({
        mesh,
        x: px,
        y,
        z: pz,
        vy: -0.4 - Math.random() * 0.3, // Sinking speed
        driftPhase: Math.random() * Math.PI * 2,
        driftSpeed: 1.5 + Math.random() * 1.5,
        rotSpeedX: (Math.random() - 0.5) * 2,
        rotSpeedY: (Math.random() - 0.5) * 2,
        life: 25, // stays for max 25s before dissolving if uneaten
        bitesLeft: 2
      });
    }

    this.audio.playFeed();
  }

  createEatEffect(pos, type = "heart") {
    // Small billboard particle that floats upward and fades
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.font = "40px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(type === "heart" ? "❤️" : "🪙+1", 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 1 });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(pos);
    sprite.position.y += 0.3;
    sprite.scale.set(0.6, 0.6, 0.6);

    this.scene.add(sprite);
    this.floatingEffects.push({
      sprite,
      vy: 0.8,
      opacity: 1,
      life: 1.0
    });
  }

  update(delta) {
    // 1. Update food falling
    for (let i = this.foods.length - 1; i >= 0; i--) {
      const f = this.foods[i];
      f.life -= delta;

      // Check if settled on sandy floor
      if (f.y > this.bounds.minY + 0.15) {
        f.y += f.vy * delta;
        f.driftPhase += f.driftSpeed * delta;
        f.x += Math.sin(f.driftPhase) * 0.12 * delta;
        f.z += Math.cos(f.driftPhase) * 0.08 * delta;

        f.mesh.rotation.x += f.rotSpeedX * delta;
        f.mesh.rotation.y += f.rotSpeedY * delta;
      } else {
        // Resting on the bottom
        f.y = this.bounds.minY + 0.15;
      }

      f.mesh.position.set(f.x, f.y, f.z);

      // Despawn expired food
      if (f.life <= 0 || f.bitesLeft <= 0) {
        this.rootGroup.remove(f.mesh);
        this.foods.splice(i, 1);
      }
    }

    // 2. Update floating heart/coin effects
    for (let i = this.floatingEffects.length - 1; i >= 0; i--) {
      const eff = this.floatingEffects[i];
      eff.life -= delta;
      eff.sprite.position.y += eff.vy * delta;
      eff.opacity = Math.max(0, eff.life);
      eff.sprite.material.opacity = eff.opacity;

      if (eff.life <= 0) {
        this.scene.remove(eff.sprite);
        eff.sprite.material.map.dispose();
        eff.sprite.material.dispose();
        this.floatingEffects.splice(i, 1);
      }
    }
  }

  getFoodAt(x, y, z, maxDist = 0.5) {
    for (let i = 0; i < this.foods.length; i++) {
      const f = this.foods[i];
      const dx = f.x - x;
      const dy = f.y - y;
      const dz = f.z - z;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < maxDist * maxDist) {
        return f;
      }
    }
    return null;
  }

  consume(foodItem, fishPos, fishId) {
    foodItem.bitesLeft--;
    this.createEatEffect(fishPos, "heart");
    this.audio.playEat();
    this.gameState.feedFish(fishId);

    if (foodItem.bitesLeft <= 0) {
      foodItem.life = 0; // Trigger cleanup
    } else {
      // Shrink remaining flake
      foodItem.mesh.scale.multiplyScalar(0.7);
    }
  }

  destroy() {
    for (const f of this.foods) {
      this.rootGroup.remove(f.mesh);
    }
    this.foods = [];
    this.pelletGeom?.dispose();
    this.flakeGeom?.dispose();
    this.foodMat1?.dispose();
    this.foodMat2?.dispose();
  }
}

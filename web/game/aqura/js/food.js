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
    this.foodPool = []; // reusable food object pool
    this.floatingEffects = []; // heart / coin 3D sprites
    this.effectPool = []; // reusable effect wrapper pool (zero GC allocations)

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

    // Pre-rendered billboard textures and reusable materials for eat effects
    this.heartTexture = this.createEmojiTexture("❤️");
    this.coinTexture = this.createEmojiTexture("🪙+1");
    this.heartMaterial = new THREE.SpriteMaterial({ map: this.heartTexture, transparent: true, opacity: 1, depthWrite: false });
    this.coinMaterial = new THREE.SpriteMaterial({ map: this.coinTexture, transparent: true, opacity: 1, depthWrite: false });

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    // Pre-warm effectPool for zero runtime GC allocations
    const EFFECT_POOL_SIZE = 16;
    for (let i = 0; i < EFFECT_POOL_SIZE; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.heartTexture,
        transparent: true,
        opacity: 1.0,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this.scene.add(sprite);
      this.effectPool.push({
        sprite,
        vy: 0.8,
        opacity: 1.0,
        life: 0
      });
    }
  }

  createEmojiTexture(text) {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.font = "40px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
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
      const geom = isFlake ? this.flakeGeom : this.pelletGeom;
      const mat = Math.random() > 0.3 ? this.foodMat1 : this.foodMat2;
      let f;

      if (this.foodPool.length > 0) {
        f = this.foodPool.pop();
        f.mesh.geometry = geom;
        f.mesh.material = mat;
        f.mesh.scale.set(1, 1, 1);
        f.mesh.visible = true;
      } else {
        const mesh = new THREE.Mesh(geom, mat);
        f = {
          mesh,
          x: 0,
          y: 0,
          z: 0,
          vy: 0,
          driftPhase: 0,
          driftSpeed: 0,
          rotSpeedX: 0,
          rotSpeedY: 0,
          life: 25,
          bitesLeft: 2
        };
      }
      
      const px = x + (Math.random() - 0.5) * 0.4;
      const pz = z + (Math.random() - 0.5) * 0.4;
      f.mesh.position.set(px, y, pz);
      f.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

      this.rootGroup.add(f.mesh);

      f.x = px;
      f.y = y;
      f.z = pz;
      f.vy = -0.4 - Math.random() * 0.3; // Sinking speed
      f.driftPhase = Math.random() * Math.PI * 2;
      f.driftSpeed = 1.5 + Math.random() * 1.5;
      f.rotSpeedX = (Math.random() - 0.5) * 2;
      f.rotSpeedY = (Math.random() - 0.5) * 2;
      f.life = 25; // stays for max 25s before dissolving if uneaten
      f.bitesLeft = 2;

      this.foods.push(f);
    }

    this.audio.playFeed();
  }

  createEatEffect(pos, type = "heart") {
    const baseTex = type === "heart" ? this.heartTexture : this.coinTexture;
    let eff;

    if (this.effectPool.length > 0) {
      eff = this.effectPool.pop();
    } else if (this.floatingEffects.length > 0) {
      // Bounded pool: reclaim oldest active effect to guarantee zero runtime allocation
      eff = this.floatingEffects.shift();
    } else {
      const mat = new THREE.SpriteMaterial({
        map: baseTex,
        transparent: true,
        opacity: 1.0,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(mat);
      this.scene.add(sprite);
      eff = {
        sprite,
        vy: 0.8,
        opacity: 1.0,
        life: 1.0
      };
    }

    eff.sprite.material.map = baseTex;
    eff.sprite.material.opacity = 1.0;
    eff.sprite.material.needsUpdate = true;
    eff.sprite.visible = true;
    eff.vy = 0.8;
    eff.opacity = 1.0;
    eff.life = 1.0;

    eff.sprite.position.copy(pos);
    eff.sprite.position.y += 0.3;
    eff.sprite.scale.set(0.6, 0.6, 0.6);

    this.floatingEffects.push(eff);
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
        f.mesh.visible = false;
        this.foodPool.push(f);
        this.foods.splice(i, 1);
      }
    }

    // 2. Update floating heart/coin effects (recycled into pool)
    for (let i = this.floatingEffects.length - 1; i >= 0; i--) {
      const eff = this.floatingEffects[i];
      eff.life -= delta;
      eff.sprite.position.y += eff.vy * delta;
      eff.opacity = Math.max(0, eff.life);
      eff.sprite.material.opacity = eff.opacity;

      if (eff.life <= 0) {
        eff.sprite.visible = false;
        this.effectPool.push(eff);
        this.floatingEffects.splice(i, 1);
      }
    }
  }

  getFoodAt(x, y, z, maxDist = 0.5) {
    for (let i = 0; i < this.foods.length; i++) {
      const f = this.foods[i];
      if (f.life <= 0 || f.bitesLeft <= 0) continue;
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
    if (!foodItem || foodItem.bitesLeft <= 0 || foodItem.life <= 0) return false;
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
    return true;
  }

  destroy() {
    for (const f of this.foods) {
      this.rootGroup.remove(f.mesh);
    }
    this.foods = [];
    if (this.foodPool) {
      for (const f of this.foodPool) {
        this.rootGroup.remove(f.mesh);
      }
      this.foodPool = [];
    }
    for (const eff of this.floatingEffects) {
      this.scene.remove(eff.sprite);
    }
    this.floatingEffects = [];
    for (const eff of this.effectPool) {
      this.scene.remove(eff.sprite || eff);
    }
    this.effectPool = [];

    this.pelletGeom?.dispose();
    this.flakeGeom?.dispose();
    this.foodMat1?.dispose();
    this.foodMat2?.dispose();
    this.heartMaterial?.dispose();
    this.coinMaterial?.dispose();
    this.heartTexture?.dispose();
    this.coinTexture?.dispose();
  }
}

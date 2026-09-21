import { FISH_CATALOG, DECORATION_CATALOG, LIGHTING_THEMES } from "./state.js";

/**
 * Aqura UI & HUD Controller
 * Handles glassmorphism controls, tool switching, shop drawer, fish details card,
 * screenshot capture, and interactive cleaning sponge.
 */

export class UIManager {
  constructor(gameState, audioManager, scene, fishManager, foodManager, decManager) {
    this.state = gameState;
    this.audio = audioManager;
    this.scene = scene;
    this.fishManager = fishManager;
    this.foodManager = foodManager;
    this.decManager = decManager;

    this.spongeCursor = null;
    this.inspectModal = null;
    this.shopModal = null;
    this.isWiping = false;

    this.cacheDom();
    this.bindEvents();
    this.renderInitialUI();
  }

  cacheDom() {
    this.dom = {
      coinsBadge: document.querySelector("#coinsBadge"),
      cleanlinessVal: document.querySelector("#cleanlinessVal"),
      cleanlinessFill: document.querySelector("#cleanlinessFill"),
      fishCountBadge: document.querySelector("#fishCountBadge"),
      toolButtons: document.querySelectorAll("[data-tool]"),
      shopBtn: document.querySelector("#shopBtn"),
      soundBtn: document.querySelector("#soundBtn"),
      photoBtn: document.querySelector("#photoBtn"),
      shopModal: document.querySelector("#shopModal"),
      closeShopBtn: document.querySelector("#closeShopBtn"),
      shopTabs: document.querySelectorAll(".shop-tab"),
      shopContent: document.querySelector("#shopContent"),
      fishCard: document.querySelector("#fishCard"),
      closeFishCardBtn: document.querySelector("#closeFishCardBtn"),
      feedInspectBtn: document.querySelector("#feedInspectBtn"),
      themeSelect: document.querySelector("#themeSelect"),
      canvasContainer: document.querySelector("#canvasContainer"),
      hud: document.querySelector("#hudOverlay"),
      photoExitBtn: document.querySelector("#photoExitBtn"),
      toastContainer: document.querySelector("#toastContainer")
    };
  }

  bindEvents() {
    // 1. Tool Selection
    this.dom.toolButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const tool = btn.getAttribute("data-tool");
        this.state.setActiveTool(tool);
        this.updateToolButtons(tool);
      });
    });

    // 2. Sound Toggle
    this.dom.soundBtn.addEventListener("click", () => {
      const isMuted = this.audio.toggleMute();
      this.dom.soundBtn.textContent = isMuted ? "🔇 静音" : "🔊 声音";
      this.showToast(isMuted ? "已静音水下音效" : "已开启水下自然音效");
    });

    // 3. Shop Modal Open / Close
    this.dom.shopBtn.addEventListener("click", () => {
      this.openShop();
    });

    this.dom.closeShopBtn.addEventListener("click", () => {
      this.closeShop();
    });

    // Shop Tabs
    this.dom.shopTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        this.dom.shopTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        this.renderShopTab(tab.getAttribute("data-tab"));
      });
    });

    // 4. Fish Card Close & Action
    this.dom.closeFishCardBtn.addEventListener("click", () => {
      this.closeFishCard();
    });

    this.dom.feedInspectBtn.addEventListener("click", () => {
      if (this.selectedFishInstance) {
        const pos = this.selectedFishInstance.group.position;
        this.foodManager.spawnFood(pos.x, pos.z);
        this.showToast(`已投喂鱼食给 ${this.selectedFishInstance.data.name}!`);
      }
    });

    // 5. Photo Mode
    this.dom.photoBtn.addEventListener("click", () => {
      this.enterPhotoMode();
    });

    this.dom.photoExitBtn.addEventListener("click", () => {
      this.exitPhotoMode();
    });

    // 6. 3D Canvas Interactivity (Feed, Tap, Clean, Inspect)
    const canvasEl = this.dom.canvasContainer;

    canvasEl.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".interactive-ui")) return; // Don't trigger if clicked on UI
      this.handleCanvasInteraction(e);
    });

    canvasEl.addEventListener("pointermove", (e) => {
      if (this.state.data.activeTool === "clean" && e.buttons === 1) {
        this.handleWipeCleaning(e);
      }
    });

    // 7. Subscribe to GameState changes
    this.state.subscribe((type, payload, fullData) => {
      this.onStateChange(type, payload, fullData);
    });
  }

  renderInitialUI() {
    this.updateStatsDisplay();
    this.updateToolButtons(this.state.data.activeTool);
    this.scene.applyTheme(this.state.data.selectedTheme);
    this.scene.setCleanliness(this.state.data.cleanliness);
    this.fishManager.syncWithState(this.state.data.fishes);
    this.decManager.loadFromState(this.state.data.decorations);
  }

  updateStatsDisplay() {
    this.dom.coinsBadge.textContent = this.state.data.coins;
    this.dom.fishCountBadge.textContent = this.state.data.fishes.length;

    const clean = Math.round(this.state.data.cleanliness);
    this.dom.cleanlinessVal.textContent = clean + "%";
    this.dom.cleanlinessFill.style.width = clean + "%";
    if (clean < 35) {
      this.dom.cleanlinessFill.style.background = "#e74c3c";
    } else if (clean < 70) {
      this.dom.cleanlinessFill.style.background = "#f39c12";
    } else {
      this.dom.cleanlinessFill.style.background = "#2ecc71";
    }
  }

  updateToolButtons(activeTool) {
    this.dom.toolButtons.forEach(btn => {
      if (btn.getAttribute("data-tool") === activeTool) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Visual feedback for cursor
    if (activeTool === "clean") {
      this.dom.canvasContainer.style.cursor = "crosshair";
    } else if (activeTool === "feed") {
      this.dom.canvasContainer.style.cursor = "pointer";
    } else {
      this.dom.canvasContainer.style.cursor = "default";
    }
  }

  handleCanvasInteraction(e) {
    const tool = this.state.data.activeTool;

    if (tool === "feed") {
      // Raycast top surface of water to drop food
      const hit = this.scene.getRaycastPoint(e.clientX, e.clientY, this.scene.bounds.maxY);
      if (hit) {
        this.foodManager.spawnFood(hit.x, hit.z);
      }
    } else if (tool === "tap") {
      // Tap on glass
      const hit = this.scene.getRaycastPoint(e.clientX, e.clientY, 0);
      const tapPos = hit || new THREE.Vector3(0, 0, this.scene.bounds.maxZ);
      this.fishManager.tapGlass(tapPos);
      this.showTapRipple(e.clientX, e.clientY);
    } else if (tool === "clean") {
      this.handleWipeCleaning(e);
    } else if (tool === "inspect") {
      // Raycast fish meshes
      const fishMeshes = this.fishManager.fishList.map(f => f.group);
      const hits = this.scene.getRaycastObjects(e.clientX, e.clientY, fishMeshes);
      if (hits.length > 0) {
        const foundFish = this.fishManager.getFishByMesh(hits[0].object);
        if (foundFish) {
          this.inspectFish(foundFish);
        }
      }
    }
  }

  handleWipeCleaning(e) {
    this.audio.playClean();
    this.state.cleanTank(4);
    this.scene.setCleanliness(this.state.data.cleanliness);
    this.updateStatsDisplay();

    // Show sparkling clean particle
    this.showSpongeSparkle(e.clientX, e.clientY);
  }

  showTapRipple(x, y) {
    const ripple = document.createElement("div");
    ripple.className = "tap-ripple";
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  showSpongeSparkle(x, y) {
    const sparkle = document.createElement("div");
    sparkle.className = "clean-sparkle";
    sparkle.textContent = "✨";
    sparkle.style.left = `${x + (Math.random() - 0.5) * 20}px`;
    sparkle.style.top = `${y + (Math.random() - 0.5) * 20}px`;
    document.body.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 400);
  }

  inspectFish(fishInstance) {
    this.selectedFishInstance = fishInstance;
    this.scene.setFollowTarget(fishInstance.group);

    const f = fishInstance.data;
    const cat = FISH_CATALOG[fishInstance.type];

    document.querySelector("#fishName").textContent = f.name;
    document.querySelector("#fishSpecies").textContent = cat.name;
    document.querySelector("#fishRarity").textContent = cat.rarity;
    document.querySelector("#fishHunger").style.width = Math.round(f.hunger) + "%";
    document.querySelector("#fishHappiness").style.width = Math.round(f.happiness) + "%";
    document.querySelector("#fishDesc").textContent = cat.desc;

    this.dom.fishCard.classList.remove("is-hidden");
  }

  closeFishCard() {
    this.selectedFishInstance = null;
    this.scene.setFollowTarget(null);
    this.dom.fishCard.classList.add("is-hidden");
  }

  openShop() {
    this.dom.shopModal.classList.remove("is-hidden");
    this.renderShopTab("fish");
  }

  closeShop() {
    this.dom.shopModal.classList.add("is-hidden");
  }

  renderShopTab(tabName) {
    const container = this.dom.shopContent;
    container.innerHTML = "";

    if (tabName === "fish") {
      for (const [key, item] of Object.entries(FISH_CATALOG)) {
        const card = document.createElement("div");
        card.className = "shop-card";
        const canAfford = this.state.data.coins >= item.price;

        card.innerHTML = `
          <div class="shop-card-info">
            <h4>${item.name}</h4>
            <span class="rarity-badge ${item.rarity}">${item.rarity}</span>
            <p>${item.desc}</p>
          </div>
          <div class="shop-card-buy">
            <span class="price-tag"><svg class="coin-svg" viewBox="0 0 24 24" style="width:16px;height:16px;"><circle cx="12" cy="12" r="9.5" fill="#f59e0b"/><circle cx="12" cy="12" r="7.2" fill="#fbbf24" stroke="#d97706" stroke-width="1.2"/><text x="12" y="15.5" font-size="10" font-weight="900" fill="#78350f" text-anchor="middle">¢</text></svg>${item.price}</span>
            <button class="buy-btn ${canAfford ? '' : 'disabled'}" ${canAfford ? '' : 'disabled'}>
              购买并放入缸中
            </button>
          </div>
        `;

        const buyBtn = card.querySelector(".buy-btn");
        buyBtn.addEventListener("click", () => {
          const bought = this.state.buyFish(key);
          if (bought) {
            this.audio.playPurchase();
            this.showToast(`成功购买了新伙伴: ${bought.name}!`);
            this.renderShopTab("fish");
          }
        });

        container.appendChild(card);
      }
    } else if (tabName === "decorations") {
      for (const [key, item] of Object.entries(DECORATION_CATALOG)) {
        const card = document.createElement("div");
        card.className = "shop-card";
        const canAfford = this.state.data.coins >= item.price;

        card.innerHTML = `
          <div class="shop-card-info">
            <h4>${item.name}</h4>
            <p>${item.desc}</p>
          </div>
          <div class="shop-card-buy">
            <span class="price-tag"><svg class="coin-svg" viewBox="0 0 24 24" style="width:16px;height:16px;"><circle cx="12" cy="12" r="9.5" fill="#f59e0b"/><circle cx="12" cy="12" r="7.2" fill="#fbbf24" stroke="#d97706" stroke-width="1.2"/><text x="12" y="15.5" font-size="10" font-weight="900" fill="#78350f" text-anchor="middle">¢</text></svg>${item.price}</span>
            <button class="buy-btn ${canAfford ? '' : 'disabled'}" ${canAfford ? '' : 'disabled'}>
              购买并造景
            </button>
          </div>
        `;

        const buyBtn = card.querySelector(".buy-btn");
        buyBtn.addEventListener("click", () => {
          const bought = this.state.buyDecoration(key);
          if (bought) {
            this.audio.playPurchase();
            this.showToast(`已购置 ${item.name} 并布置到鱼缸底部!`);
            this.renderShopTab("decorations");
          }
        });

        container.appendChild(card);
      }
    } else if (tabName === "lighting") {
      for (const [key, theme] of Object.entries(LIGHTING_THEMES)) {
        const card = document.createElement("div");
        card.className = "shop-card theme-card";
        const isCurrent = this.state.data.selectedTheme === key;

        card.innerHTML = `
          <div class="shop-card-info">
            <h4>${theme.name} ${isCurrent ? '（当前使用）' : ''}</h4>
            <p>${theme.desc}</p>
          </div>
          <div class="shop-card-buy">
            <button class="buy-btn ${isCurrent ? 'active-theme' : ''}">
              ${isCurrent ? '使用中' : '切换为此灯效'}
            </button>
          </div>
        `;

        const buyBtn = card.querySelector(".buy-btn");
        buyBtn.addEventListener("click", () => {
          this.state.setTheme(key);
          this.scene.applyTheme(key);
          this.showToast(`水族箱灯效已切换为: ${theme.name}`);
          this.renderShopTab("lighting");
        });

        container.appendChild(card);
      }
    }
  }

  enterPhotoMode() {
    this.dom.hud.classList.add("photo-mode");
    this.dom.photoExitBtn.classList.remove("is-hidden");
    this.showToast("进入摄影模式：点击拍摄键可保存高清截屏");
  }

  exitPhotoMode() {
    this.dom.hud.classList.remove("photo-mode");
    this.dom.photoExitBtn.classList.add("is-hidden");
  }

  captureSnapshot() {
    // Render one frame then capture
    this.scene.renderer.render(this.scene.scene, this.scene.camera);
    const dataURL = this.scene.renderer.domElement.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = `Aqura_Aquarium_${Date.now()}.png`;
    a.click();
    this.showToast("📸 水族箱美照已保存至下载文件夹！");
  }

  showToast(msg) {
    const toast = document.createElement("div");
    toast.className = "toast-message";
    toast.textContent = msg;
    this.dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 400);
    }, 2800);
  }

  onStateChange(type, payload, fullData) {
    this.updateStatsDisplay();

    if (type === "fish_added") {
      this.fishManager.syncWithState(fullData.fishes);
    } else if (type === "decoration_added") {
      this.decManager.addDecoration(payload);
    } else if (type === "theme") {
      this.scene.applyTheme(payload);
    } else if (type === "cleanliness") {
      this.scene.setCleanliness(payload);
    }
  }
}

/**
 * Aqura State Store & Persistence
 * Manages player progression, fish roster, decoration catalog, cleanliness, and settings.
 */

const STORAGE_KEY = "aqura_ocean_savedata_v2";

export const FISH_CATALOG = {
  clownfish: {
    name: "小丑鱼 (Clownfish)",
    price: 20,
    desc: "经典橙白相间的海葵鱼，性情温和，游姿活泼。",
    speed: 1.4,
    size: 0.9,
    rarity: "常见",
    colors: { body: 0xff6600, stripe: 0xffffff, fin: 0xff7043 }
  },
  blue_tang: {
    name: "蓝唐王鱼 (Blue Tang)",
    price: 35,
    desc: "身披亮丽宝蓝色的拟刺尾鲷，尾鳍金黄，游动敏捷。",
    speed: 1.6,
    size: 1.0,
    rarity: "常见",
    colors: { body: 0x1a4fb0, stripe: 0x111122, fin: 0xffd700 }
  },
  angelfish: {
    name: "神仙鱼 (Angelfish)",
    price: 60,
    desc: "体态高耸的燕鱼，丝状鳍条舒展优雅，游速沉稳贵气。",
    speed: 1.1,
    size: 1.25,
    rarity: "稀有",
    colors: { body: 0xe0e8f0, stripe: 0x2c3437, fin: 0x88ccff }
  },
  betta: {
    name: "斗鱼 / 孔雀鱼 (Betta Guppy)",
    price: 80,
    desc: "拥有如丝绸般华丽舒展尾鳍的热带淡彩鱼，宛如水下舞者。",
    speed: 1.2,
    size: 1.0,
    rarity: "稀有",
    colors: { body: 0xe91e63, stripe: 0x9c27b0, fin: 0x00e5ff }
  },
  koi: {
    name: "锦鲤金鱼 (Golden Koi)",
    price: 120,
    desc: "祥瑞红金相间锦鲤，体型健硕饱满，带来祥和福气与丰厚金币。",
    speed: 1.3,
    size: 1.35,
    rarity: "珍奇",
    colors: { body: 0xf44336, stripe: 0xffffff, fin: 0xff9800 }
  },
  jellyfish: {
    name: "幻彩发光水母 (Jellyfish)",
    price: 160,
    desc: "半透明伞盖随水流节律脉动，散发梦幻水下荧光。",
    speed: 0.7,
    size: 1.1,
    rarity: "传说",
    colors: { body: 0x00ffff, stripe: 0xe040fb, fin: 0x76ff03 }
  },
  manta_ray: {
    name: "巨型蝠鲼 (Manta Ray)",
    price: 240,
    desc: "海洋中的优雅飞鸟，双翼如丝绸般随海流波浪状舒展，巡弋在辽阔蔚蓝深处。",
    speed: 0.95,
    size: 2.5,
    rarity: "传奇",
    colors: { body: 0x0f172a, stripe: 0xf8fafc, fin: 0x38bdf8 }
  }
};

export const DECORATION_CATALOG = {
  seaweed_cluster: {
    name: "摇曳巨藻林",
    price: 15,
    desc: "随深海洋流柔美波动的翠绿海藻丛，提供鱼儿捉迷藏乐园。",
    type: "plant"
  },
  coral_reef: {
    name: "多层珊瑚丘",
    price: 40,
    desc: "绚丽夺目的热带海葵与分支鹿角珊瑚群生礁体。",
    type: "coral"
  },
  amphora: {
    name: "古沉船双耳陶罐",
    price: 45,
    desc: "半埋于海沙中的古老陶罐遗迹，附着着斑驳的海生生物。",
    type: "relic"
  },
  seastar: {
    name: "蓝指海星石",
    price: 30,
    desc: "栖息在海底礁石上的深蓝指海星，点缀蔚蓝海底。",
    type: "creature"
  },
  air_stone: {
    name: "深海冷泉喷口",
    price: 50,
    desc: "安置在海床基岩，源源不断喷涌欢快向上的微细气泡流。",
    type: "bubbler"
  },
  treasure_chest: {
    name: "沉船藏宝箱",
    price: 90,
    desc: "神秘海盗遗落宝箱，定时缓缓开盖吐出金币泡泡。",
    type: "chest"
  },
  roman_column: {
    name: "亚特兰蒂斯断柱",
    price: 75,
    desc: "沉睡水底的古老断柱遗迹，长满苔藓与贝壳。",
    type: "ruin"
  }
};

export const LIGHTING_THEMES = {
  tropical: {
    id: "tropical",
    name: "日光热带浅滩",
    desc: "清透暖亮阳光，水草翠绿，充满生机与透亮焦散。",
    waterColor: 0x1ba3c6,
    ambientColor: 0x88ccff,
    ambientIntensity: 0.85,
    sunColor: 0xfffaf0,
    sunIntensity: 1.5,
    fogDensity: 0.015,
    causticsIntensity: 0.75
  },
  deepsea: {
    id: "deepsea",
    name: "神秘深海幽蓝",
    desc: "幽邃靛蓝深渊，静谧神秘，荧光生物格外醒目。",
    waterColor: 0x071e3d,
    ambientColor: 0x003366,
    ambientIntensity: 0.5,
    sunColor: 0x3388ff,
    sunIntensity: 0.9,
    fogDensity: 0.025,
    causticsIntensity: 0.4
  },
  sunset: {
    id: "sunset",
    name: "暮光余晖暖金",
    desc: "夕阳斜照穿透水体，波光粼粼泛着金红与琥珀光泽。",
    waterColor: 0xb55400,
    ambientColor: 0xffa07a,
    ambientIntensity: 0.8,
    sunColor: 0xff7b25,
    sunIntensity: 1.3,
    fogDensity: 0.018,
    causticsIntensity: 0.65
  },
  neon: {
    id: "neon",
    name: "幻夜赛博霓虹",
    desc: "暗黑水族夜视模式，紫粉与荧光蓝青交织的奇幻异界。",
    waterColor: 0x100028,
    ambientColor: 0x5e17eb,
    ambientIntensity: 0.7,
    sunColor: 0x00f2fe,
    sunIntensity: 1.2,
    fogDensity: 0.022,
    causticsIntensity: 0.8
  }
};

export class GameState {
  constructor() {
    this.listeners = new Set();
    this.data = this.loadInitialData();
  }

  loadInitialData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.fishes) && parsed.fishes.length > 0) {
          const defaults = this.getDefaultData();
          return {
            ...defaults,
            ...parsed,
            decorations: Array.isArray(parsed.decorations) ? parsed.decorations : defaults.decorations,
            stats: { ...defaults.stats, ...(parsed.stats || {}) }
          };
        }
      }
    } catch (e) {
      console.warn("Could not load save state, falling back to default.", e);
    }

    return this.getDefaultData();
  }

  getDefaultData() {
    return {
      coins: 80,
      cleanliness: 95, // 0 to 100
      selectedTheme: "tropical",
      activeTool: "feed", // 'feed' | 'tap' | 'clean' | 'inspect'
      stats: {
        totalFed: 0,
        totalCleaned: 0,
        playSeconds: 0
      },
      decorations: [
        { id: "dec_1", type: "coral_reef", x: -2.8, z: -1.6, scale: 1.05 },
        { id: "dec_2", type: "seaweed_cluster", x: 4.2, z: -1.0 },
        { id: "dec_3", type: "amphora", x: 1.2, z: -1.8, rotY: 0.6 },
        { id: "dec_4", type: "seastar", x: -1.4, z: -0.8 },
        { id: "dec_5", type: "coral_reef", x: 3.8, z: -4.8, scale: 1.25, rotY: 1.8 },
        { id: "dec_6", type: "seaweed_cluster", x: -6.5, z: -4.2 },
        { id: "dec_7", type: "air_stone", x: -1.5, z: -6.5 },
        { id: "dec_8", type: "coral_reef", x: -4.8, z: -11.5, scale: 1.6, rotY: 2.5 },
        { id: "dec_9", type: "roman_column", x: 6.0, z: -10.0, scale: 1.3 },
        { id: "dec_10", type: "treasure_chest", x: 0.5, z: -8.5, rotY: -0.4 }
      ],
      fishes: [
        {
          id: "fish_1",
          type: "clownfish",
          name: "尼莫 (Nemo)",
          hunger: 80, // 0 is starving, 100 is full
          happiness: 90,
          bornAt: Date.now() - 100000
        },
        {
          id: "fish_2",
          type: "blue_tang",
          name: "多莉 (Dory)",
          hunger: 75,
          happiness: 85,
          bornAt: Date.now() - 60000
        },
        {
          id: "fish_3",
          type: "angelfish",
          name: "银翼 (Sylph)",
          hunger: 85,
          happiness: 95,
          bornAt: Date.now() - 30000
        }
      ]
    };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn("Failed to persist save state.", e);
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(changeType, payload) {
    this.save();
    for (const listener of this.listeners) {
      listener(changeType, payload, this.data);
    }
  }

  addCoins(amount) {
    this.data.coins = Math.max(0, this.data.coins + amount);
    this.notify("coins", { delta: amount, total: this.data.coins });
  }

  spendCoins(amount) {
    if (this.data.coins >= amount) {
      this.data.coins -= amount;
      this.notify("coins", { delta: -amount, total: this.data.coins });
      return true;
    }
    return false;
  }

  buyFish(type, customName = null) {
    const info = FISH_CATALOG[type];
    if (!info) return null;
    if (!this.spendCoins(info.price)) return null;

    const newFish = {
      id: "fish_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      type,
      name: customName || info.name.split(" ")[0] + " #" + (this.data.fishes.length + 1),
      hunger: 90,
      happiness: 95,
      bornAt: Date.now()
    };

    this.data.fishes.push(newFish);
    this.notify("fish_added", newFish);
    return newFish;
  }

  buyDecoration(type) {
    const info = DECORATION_CATALOG[type];
    if (!info) return null;
    if (!this.spendCoins(info.price)) return null;

    const x = (Math.random() * 14 - 7);
    const z = (Math.random() * 4.5 - 2.25);
    const newDec = {
      id: "dec_" + Date.now(),
      type,
      x: Number(x.toFixed(2)),
      z: Number(z.toFixed(2))
    };

    this.data.decorations.push(newDec);
    this.notify("decoration_added", newDec);
    return newDec;
  }

  setTheme(themeId) {
    if (LIGHTING_THEMES[themeId]) {
      this.data.selectedTheme = themeId;
      this.notify("theme", themeId);
    }
  }

  setActiveTool(toolId) {
    this.data.activeTool = toolId;
    this.notify("tool", toolId);
  }

  cleanTank(amount = 8) {
    const prev = this.data.cleanliness;
    this.data.cleanliness = Math.min(100, this.data.cleanliness + amount);
    this.data.stats.totalCleaned++;
    if (Math.round(prev) !== Math.round(this.data.cleanliness)) {
      this.notify("cleanliness", this.data.cleanliness);
    }
  }

  tick(delta) {
    // Cleanliness slowly degrades (takes ~15 minutes to go from 100 to 0)
    const dirtyRate = 0.05 * delta;
    this.data.cleanliness = Math.max(0, this.data.cleanliness - dirtyRate);

    // Fish hunger slowly drops
    for (const f of this.data.fishes) {
      f.hunger = Math.max(0, f.hunger - 0.12 * delta);
      // If hungry or tank is dirty, happiness drops
      if (f.hunger < 30 || this.data.cleanliness < 40) {
        f.happiness = Math.max(10, f.happiness - 0.2 * delta);
      } else {
        f.happiness = Math.min(100, f.happiness + 0.08 * delta);
      }
    }

    this.data.stats.playSeconds += delta;
  }

  feedFish(fishId, foodNutrient = 20) {
    const fish = this.data.fishes.find(f => f.id === fishId);
    if (fish) {
      fish.hunger = Math.min(100, fish.hunger + foodNutrient);
      fish.happiness = Math.min(100, fish.happiness + 15);
      this.data.stats.totalFed++;
      this.addCoins(1); // Reward for nurturing
      this.notify("fish_fed", fish);
    }
  }
}

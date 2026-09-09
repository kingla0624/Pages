/* ======================================
   level.js - Level Data & Management
   ====================================== */

const LevelManager = (() => {

    /**
     * Level structure:
     * {
     *   name: string,
     *   maxWells: number,
     *   star: { x, y, vx, vy },   // start pos and initial velocity
     *   gate: { x, y, radius },    // goal
     *   nebulae: [{ x, y, radius, collected }],
     *   blackHoles: [{ x, y, radius }],
     *   stardust: [{ x, y, radius, collected }],
     *   tutorial: string | null
     * }
     */

    // Helper to generate stardust along a rough path
    function dustBetween(x1, y1, x2, y2, count, scatter = 30) {
        const arr = [];
        for (let i = 0; i < count; i++) {
            const t = (i + 1) / (count + 1);
            arr.push({
                x: x1 + (x2 - x1) * t + (Math.random() - 0.5) * scatter,
                y: y1 + (y2 - y1) * t + (Math.random() - 0.5) * scatter,
                radius: 8,
                collected: false
            });
        }
        return arr;
    }

    // All levels are defined as functions so they can adapt to canvas size.
    // w, h = canvas dimensions
    function getLevels(w, h) {
        const cx = w / 2, cy = h / 2;

        return [
            // ===== Level 1: First Steps =====
            {
                name: '初识引力',
                maxWells: 1,
                star: { x: w * 0.15, y: cy, vx: 80, vy: 0 },
                gate: { x: w * 0.85, y: cy - 50, radius: 35 },
                nebulae: [],
                blackHoles: [],
                stardust: dustBetween(w * 0.3, cy, w * 0.7, cy - 25, 5),
                tutorial: '点击屏幕放置引力井，吸引星光改变轨迹。\n将星光引导至绿色星门即可过关。'
            },

            // ===== Level 2: Aim Up =====
            {
                name: '向上偏转',
                maxWells: 1,
                star: { x: w * 0.1, y: h * 0.65, vx: 90, vy: 0 },
                gate: { x: w * 0.88, y: h * 0.3, radius: 32 },
                nebulae: [],
                blackHoles: [],
                stardust: dustBetween(w * 0.3, h * 0.55, w * 0.7, h * 0.38, 6),
                tutorial: '试试调整引力井的位置，让星光弯向星门。'
            },

            // ===== Level 3: Strength Matters =====
            {
                name: '力度掌控',
                maxWells: 1,
                star: { x: w * 0.1, y: cy, vx: 100, vy: 0 },
                gate: { x: w * 0.5, y: h * 0.2, radius: 30 },
                nebulae: [],
                blackHoles: [],
                stardust: dustBetween(w * 0.2, cy, w * 0.4, h * 0.35, 4),
                tutorial: '放置引力井后，用滚轮或滑块调整引力强度。'
            },

            // ===== Level 4: Two Wells =====
            {
                name: '双星协作',
                maxWells: 2,
                star: { x: w * 0.08, y: h * 0.75, vx: 90, vy: -15 },
                gate: { x: w * 0.92, y: h * 0.25, radius: 30 },
                nebulae: [],
                blackHoles: [],
                stardust: dustBetween(w * 0.25, h * 0.6, w * 0.75, h * 0.35, 8),
                tutorial: '现在你有两个引力井，合理搭配使用！'
            },

            // ===== Level 5: S-Curve =====
            {
                name: 'S 型弯道',
                maxWells: 2,
                star: { x: w * 0.1, y: h * 0.5, vx: 100, vy: 0 },
                gate: { x: w * 0.9, y: h * 0.5, radius: 30 },
                nebulae: [],
                blackHoles: [],
                stardust: [
                    ...dustBetween(w * 0.25, h * 0.5, w * 0.45, h * 0.25, 4),
                    ...dustBetween(w * 0.55, h * 0.25, w * 0.75, h * 0.5, 4)
                ],
                tutorial: null
            },

            // ===== Level 6: Three Wells =====
            {
                name: '三体引力',
                maxWells: 3,
                star: { x: w * 0.05, y: h * 0.85, vx: 80, vy: -30 },
                gate: { x: w * 0.95, y: h * 0.15, radius: 30 },
                nebulae: [],
                blackHoles: [],
                stardust: dustBetween(w * 0.2, h * 0.7, w * 0.8, h * 0.3, 10),
                tutorial: null
            },

            // ===== Level 7: First Black Hole =====
            {
                name: '黑洞初现',
                maxWells: 2,
                star: { x: w * 0.1, y: cy, vx: 100, vy: 0 },
                gate: { x: w * 0.9, y: cy, radius: 30 },
                nebulae: [],
                blackHoles: [
                    { x: cx, y: cy, radius: 35 }
                ],
                stardust: dustBetween(w * 0.3, cy - 80, w * 0.7, cy - 80, 5),
                tutorial: '⚠️ 红色区域是黑洞！碰到就会被吞噬。\n引导星光绕过它。'
            },

            // ===== Level 8: Narrow Passage =====
            {
                name: '夹缝求生',
                maxWells: 2,
                star: { x: w * 0.1, y: cy, vx: 100, vy: 0 },
                gate: { x: w * 0.9, y: cy, radius: 28 },
                nebulae: [],
                blackHoles: [
                    { x: cx, y: cy - 80, radius: 30 },
                    { x: cx, y: cy + 80, radius: 30 }
                ],
                stardust: dustBetween(w * 0.35, cy, w * 0.65, cy, 4),
                tutorial: null
            },

            // ===== Level 9: Triple Threat =====
            {
                name: '三重危机',
                maxWells: 3,
                star: { x: w * 0.08, y: h * 0.5, vx: 90, vy: 0 },
                gate: { x: w * 0.92, y: h * 0.3, radius: 28 },
                nebulae: [],
                blackHoles: [
                    { x: w * 0.35, y: h * 0.35, radius: 28 },
                    { x: w * 0.55, y: h * 0.65, radius: 28 },
                    { x: w * 0.75, y: h * 0.4, radius: 28 }
                ],
                stardust: dustBetween(w * 0.2, h * 0.5, w * 0.85, h * 0.35, 7),
                tutorial: null
            },

            // ===== Level 10: First Nebula =====
            {
                name: '星云采集',
                maxWells: 2,
                star: { x: w * 0.1, y: h * 0.7, vx: 100, vy: -10 },
                gate: { x: w * 0.9, y: h * 0.7, radius: 30 },
                nebulae: [
                    { x: cx, y: h * 0.3, radius: 40, collected: false }
                ],
                blackHoles: [],
                stardust: dustBetween(w * 0.3, h * 0.5, w * 0.7, h * 0.5, 6),
                tutorial: '🌀 青色星云必须全部穿越才能打开星门！\n规划路线收集所有星云。'
            },

            // ===== Level 11: Two Nebulae =====
            {
                name: '双云连珠',
                maxWells: 3,
                star: { x: w * 0.1, y: cy, vx: 90, vy: 0 },
                gate: { x: w * 0.9, y: cy, radius: 28 },
                nebulae: [
                    { x: w * 0.4, y: h * 0.25, radius: 35, collected: false },
                    { x: w * 0.65, y: h * 0.75, radius: 35, collected: false }
                ],
                blackHoles: [],
                stardust: dustBetween(w * 0.2, cy, w * 0.8, cy, 8),
                tutorial: null
            },

            // ===== Level 12: Nebula + Black Hole =====
            {
                name: '暗与光',
                maxWells: 3,
                star: { x: w * 0.1, y: h * 0.5, vx: 90, vy: 0 },
                gate: { x: w * 0.9, y: h * 0.3, radius: 28 },
                nebulae: [
                    { x: w * 0.5, y: h * 0.2, radius: 35, collected: false },
                    { x: w * 0.7, y: h * 0.7, radius: 35, collected: false }
                ],
                blackHoles: [
                    { x: w * 0.4, y: h * 0.55, radius: 30 },
                    { x: w * 0.75, y: h * 0.4, radius: 25 }
                ],
                stardust: dustBetween(w * 0.2, h * 0.4, w * 0.8, h * 0.4, 6),
                tutorial: null
            },

            // ===== Level 13: Expert - Slalom =====
            {
                name: '星际回旋',
                maxWells: 3,
                star: { x: w * 0.05, y: h * 0.5, vx: 85, vy: 0 },
                gate: { x: w * 0.95, y: h * 0.5, radius: 25 },
                nebulae: [
                    { x: w * 0.3, y: h * 0.3, radius: 30, collected: false },
                    { x: w * 0.5, y: h * 0.7, radius: 30, collected: false },
                    { x: w * 0.7, y: h * 0.3, radius: 30, collected: false }
                ],
                blackHoles: [
                    { x: w * 0.4, y: h * 0.5, radius: 25 },
                    { x: w * 0.6, y: h * 0.5, radius: 25 }
                ],
                stardust: dustBetween(w * 0.15, h * 0.5, w * 0.85, h * 0.5, 10),
                tutorial: null
            },

            // ===== Level 14: Precision =====
            {
                name: '精准穿针',
                maxWells: 2,
                star: { x: w * 0.1, y: h * 0.85, vx: 80, vy: -40 },
                gate: { x: w * 0.9, y: h * 0.15, radius: 22 },
                nebulae: [
                    { x: w * 0.35, y: h * 0.6, radius: 28, collected: false },
                    { x: w * 0.65, y: h * 0.35, radius: 28, collected: false }
                ],
                blackHoles: [
                    { x: w * 0.3, y: h * 0.35, radius: 22 },
                    { x: w * 0.5, y: h * 0.5, radius: 28 },
                    { x: w * 0.7, y: h * 0.65, radius: 22 }
                ],
                stardust: dustBetween(w * 0.2, h * 0.7, w * 0.8, h * 0.25, 8),
                tutorial: null
            },

            // ===== Level 15: Grand Finale =====
            {
                name: '终极星轨',
                maxWells: 4,
                star: { x: w * 0.05, y: h * 0.5, vx: 75, vy: 0 },
                gate: { x: w * 0.95, y: h * 0.5, radius: 25 },
                nebulae: [
                    { x: w * 0.25, y: h * 0.2, radius: 30, collected: false },
                    { x: w * 0.45, y: h * 0.8, radius: 30, collected: false },
                    { x: w * 0.65, y: h * 0.2, radius: 30, collected: false },
                    { x: w * 0.85, y: h * 0.7, radius: 30, collected: false }
                ],
                blackHoles: [
                    { x: w * 0.35, y: h * 0.5, radius: 25 },
                    { x: w * 0.55, y: h * 0.5, radius: 25 },
                    { x: w * 0.75, y: h * 0.45, radius: 25 }
                ],
                stardust: dustBetween(w * 0.1, h * 0.5, w * 0.9, h * 0.5, 15),
                tutorial: null
            }
        ];
    }

    // Deep clone a level so runtime mutations don't affect the template
    function cloneLevel(level) {
        return JSON.parse(JSON.stringify(level));
    }

    // Load progress from localStorage
    function loadProgress() {
        try {
            const data = localStorage.getItem('orbitweaver_progress');
            return data ? JSON.parse(data) : { unlocked: 1, stars: {} };
        } catch {
            return { unlocked: 1, stars: {} };
        }
    }

    function saveProgress(progress) {
        try {
            localStorage.setItem('orbitweaver_progress', JSON.stringify(progress));
        } catch { /* ignore */ }
    }

    return { getLevels, cloneLevel, loadProgress, saveProgress };
})();

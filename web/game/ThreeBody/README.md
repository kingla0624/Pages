# 《三体》三日凌空与乱纪元金字塔 (Three-Body: Trisolar Convergence)

基于 WebGL / Three.js 打造的《三体》小说经典场景复现，聚焦展现异星世界中极端“三日凌空”灾异与乱纪元神圣金字塔的宏大史诗场面。

---

## 🌌 场景原著设定

> “在天空中，三颗巨大的太阳并排悬挂，它们大小各异，颜色不同，像三只燃烧的巨眼凝视着大地……大地在燃烧，岩石在熔化，湖泊在沸腾。” —— 刘慈欣《三体》

* **纪元背景**：第 137 号三体文明，进入极度灼热的“乱纪元”。
* **天体现象**：三颗恒星（黄金主序星、猩红巨星、苍蓝矮星）在混沌引力下轨道交错，形成毁灭性的“三日凌空”。
* **神圣建筑**：地表矗立着墨子/牛顿神庙风格的黑色玄武岩阶梯金字塔，塔顶运转着汲取天体引力能的巨型浑天仪装置与通天光柱。
* **文明残骸**：金字塔基座的背阴处与山壑间，堆叠着成千上万在灾异来临前紧急脱水的“干皮人卷”。
* **大气微粒**：炽热干风卷起地表万千火星与浮尘粒子，在对流气流中缓缓向高空升腾。

---

## 🛠️ 技术亮点

1. **三体恒星着色器（Custom GLSL Solar Shader）**：
   - 采用 3D Simplex 噪声算法实时模拟对流等离子体日冕表面流动。
   - 结合菲涅尔边缘光晕与自发光材质，赋予三颗恒星不同的温度谱系。
2. **多重动态实时阴影与光线投射（Triple Cast Shadows）**：
   - 三颗太阳各自作为独立的高亮方向光源，随混沌公转在金字塔与荒漠上实时投射交错的三重动态柔和阴影（PCFSoftShadowMap）。
3. **电影级运镜导演管线（Cinematic Spline Camera）**：
   - 内置 5 阶段 Catmull-Rom 三维平滑导轨曲线，自动巡航：从地平线低空掠过荒漠与干皮石阵，仰视金字塔棱线，贴近塔顶自转浑天仪，最后上升至高空俯瞰三日凌空全貌。
   - 支持一键切换“电影运镜”与“自由观察模式（OrbitControls）”，切换时自动对齐相机靶点，消除视觉跳变。
4. **大气光学与全屏电影级后处理（Atmospheric Optics & Post-Processing）**：
   - UnrealBloomPass 渲染烈日刺目的高动态光晕、通天能量光柱与古代符文呼吸辉光。
   - 自定义 `AtmosphericOpticsShader`：模拟地表高温热浪扰动折射（Heat Shimmer Wave Distortion）、径向边缘色散畸变（Chromatic Aberration）与 35mm 胶片动态颗粒（Film Grain）。
5. **实时天体引力雷达摄动仪（Celestial Gravitational Radar）**：
   - 2D Canvas 独立视网膜雷达，实时投影三体星系相对三体主星的轨道坐标、动态引力质心与净潮汐引力撕裂矢量箭头。
6. **程序化原生空间音频与方向调制（Procedural Web Audio API）**：
   - 无需下载任何外部音频文件，实时合成深空次声共振（Sub-bass Drone）与太阳风啸叫白噪。
   - 具备方向声学滤波：当相机直接面向主恒星时动态提升带通滤波器共振频率。

---

## 📁 目录结构

```
web/game/ThreeBody/
├── index.html       # 场景入口与 HUD 界面
├── server.js        # 轻量级本地 HTTP 测试服务
├── README.md        # 场景背景与技术说明
├── css/
│   └── style.css    # 电影黑边、科幻遥测 HUD 界面样式
└── js/
    ├── main.js      # Three.js 核心循环与镜头编排
    ├── suns.js      # 三日恒星 Shader、日冕耀斑与混沌引力运动
    ├── pyramid.js   # 阶梯金字塔、顶端浑天仪与能量光柱
    ├── terrain.js   # 程序化荒漠地表、脱水人卷与炽热火尘
    ├── radar.js     # 三体引力摄动雷达仪（2D Canvas 实时天体图）
    ├── effects.js   # 大气热浪折射、色散与胶片质感 ShaderPass
    └── audio.js     # Web Audio 纯代码合成深空氛围音效与方向调制
```

---

## 🚀 启动与体验

通过任意静态 Web 服务器（如 VS Code Live Server、Python http.server、Node.js http-server 等）启动并在浏览器中访问 `web/game/ThreeBody/index.html`。

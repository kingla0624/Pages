# 官方来源、版本和研究边界

主要来源核验日期：**2026-09-14**；体系整理与验证：**2026-09-15**。本文件作为按主题查证的入口，各专题在实际规则旁保留具体来源与版本信息，不要求 agent 每次任务读取全部来源。

## 证据层级

1. **当前 HIG**：设计原则与建议，重视适用情境和页面更新日期。
2. **对应平台的当前官方 API 文档、SDK 声明**：确认类型、成员、重载、可用版本与实现行为。
3. **与该代系统相关的 WWDC 官方课程**：解释背景、变化和具体平台行为；不能把某届演示推广为永久 API 合同。
4. **指定版本 Design Resources**：实际读取后才能报告组件、状态与测量结果；资源名称不是行为验证。
5. **当前项目运行证据**：证明具体 SDK/OS、窗口、数据和辅助功能设置下的实际效果。

这些证据各有用途，并非单一从高到低覆盖一切的顺序。HIG 表达设计意图，SDK决定实现可用性；运行结果还需要对照设计意图审查。

## 按主题研究索引

| 主题 | 主要官方资料 | 在本体系中的用途 |
|---|---|---|
| 设计原则 | [HIG Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)、[WWDC26 Principles of great design](https://developer.apple.com/videos/play/wwdc2026/250/) | 设计意图、取舍与判断标准 |
| 从需求到页面 | [Design foundations from idea to interface](https://developer.apple.com/videos/play/wwdc2025/359/) | 结构、导航、内容与表达的关联 |
| 设计资源 | [Apple Design Resources](https://developer.apple.com/design/resources/) | iOS/iPadOS 27 UI Kit 与图标模板入口，详见资源文件的访问边界 |
| 品牌与文案 | [Branding](https://developer.apple.com/design/human-interface-guidelines/branding)、[品牌设计课程](https://developer.apple.com/videos/play/wwdc2026/251/)、[命名课程](https://developer.apple.com/videos/play/wwdc2026/290/) | 品牌表达与熟悉交互、名称和预期 |
| 排版与布局 | [Typography](https://developer.apple.com/design/human-interface-guidelines/typography)、[Layout](https://developer.apple.com/design/human-interface-guidelines/layout)、[Color](https://developer.apple.com/design/human-interface-guidelines/color) | 语义层级、适配与动态颜色 |
| 导航和呈现 | [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)、[Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars)、[Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)、[Modality](https://developer.apple.com/design/human-interface-guidelines/modality) | 组件决策树；具体容器与控件来源见该专题 |
| iOS 27 自适应 | [Modernize your UIKit app](https://developer.apple.com/videos/play/wwdc2026/278/)、[What’s new in SwiftUI](https://developer.apple.com/videos/play/wwdc2026/269/) | 可调整窗口、系统新行为与版本条件 |
| 搜索 | [Searching](https://developer.apple.com/design/human-interface-guidelines/searching)、[Design intuitive search experiences](https://developer.apple.com/videos/play/wwdc2026/292/) | 搜索范围、位置、建议、结果状态 |
| Liquid Glass | [Materials](https://developer.apple.com/design/human-interface-guidelines/materials)、[Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass)、[Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/) | 控制与内容层、材质选择、系统组件与定制边界 |
| 自定义玻璃 | [Applying Liquid Glass to custom views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views) | 修饰器、容器、身份与交互语义；详见材质文件 |
| 图标 | [SF Symbols](https://developer.apple.com/sf-symbols/)、[HIG SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols) | 名称、语义、变体、渲染、版本与使用边界 |
| 图表体验 | [Charting data](https://developer.apple.com/design/human-interface-guidelines/charting-data)、[Charts](https://developer.apple.com/design/human-interface-guidelines/charts) | 用户问题、视觉编码、数据与可访问性 |
| Swift Charts | [Chart](https://developer.apple.com/documentation/charts/chart)、[Explore pie charts and interactivity in Swift Charts](https://developer.apple.com/videos/play/wwdc2023/10037/) | marks、选择、滚动；具体 API 和基线见 charts.md |
| 图表辅助功能 | [Representing chart data as an audio graph](https://developer.apple.com/documentation/accessibility/representing-chart-data-as-an-audio-graph) | 默认框架能力和自定义描述责任 |
| UI 验收 | [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)、[Performing accessibility testing](https://developer.apple.com/documentation/accessibility/performing-accessibility-testing-for-your-app)、[自定义控制辅助功能课程](https://developer.apple.com/videos/play/wwdc2026/220/) | Checklist、运行与辅助技术证据 |

这些是导航索引，不宣称已穷尽整个 Apple 网站。导航、输入、权限、触觉、性能和精确 API 的补充已查来源位于各参考文件内。

## 已确认的时效边界

- 官方设计资源目录已列 iOS 27 / iPadOS 27 UI Kit；官方 SF Symbols 页面提供 SF Symbols 8 beta，并说明新增符号针对 27 系列系统。**资源/工具已发布不等于所有目标系统已经正式发行**；实际任务应检查 SDK、OS build 与 release/beta 状态。
- Liquid Glass 自定义核心 API 的 iOS 26 基线与 iOS 27 外观、偏好和系统行为变化分开维护。
- `TabView` 和新 `Tab` 语法、`Chart` 和 `SectorMark`、`Chart3D` 和 iOS 27 设计资源都不是同一个版本事件。精确基线见 [SwiftUI 映射](swiftui-mapping.md) 与 [图表](charts.md)。
- 同一 HIG 组件页可能覆盖多个平台；iPhone/iPad 的特定行为仍需结合平台课程和 API。旧 HIG 泛述若与当前 API 的精确说明不同，记录差异，不能静默把旧限制搬进新代码。

## 如何重新核验

1. 只查影响当前决策的资料。先读当前项目与 SDK；新版本、新组件、未知参数、链接失效或文档冲突时查官方资料。
2. HTML 只有 JavaScript 提示不视为正文。可以用官方可索引文本、浏览器渲染，或 Apple 文档使用的 DocC JSON 补充。
3. 当前许多文档的 JSON 可从 `https://developer.apple.com/tutorials/data/documentation/<path>.json` 取得。`metadata.platforms` 可帮助查 `introducedAt` / `deprecatedAt` 等；先确认该响应对应的确切 symbol/重载，不能只凭标题。
4. DocC JSON 路由是文档交付方式，不是本 skill 依赖的稳定公共 API。请求失败时改查官方文档/本地 SDK，不伪造结果，也不让整个工作被抓取方式阻塞。
5. 对变化更新对应主题的规则、例外、最低版本和回退，再运行与变化有关的 [skill 评估](skill-evaluation.md)。不只改核验日期。

需要精确记录时使用：

```text
规则 / 设计问题：
官方 URL / 页面或具体 API：
读到的正文或声明范围：
平台 / 引入及弃用版本 / SDK 条件：
结论：HIG建议 / API约束 / Skill判断
已知例外、冲突与未核验部分：
核验日期 / 所需运行验证：
```

## 已知限制

- iOS 27 Figma UI Kit 的官方入口已查；本次 Figma 页面读取失败，未下载并检查内部变量、组件全部状态或精确测量。没有制造“Apple 官方 token 表”。[资源边界](resources-and-symbols.md)
- API 基线通过官方文档与部分 DocC 元数据核验；本次未在 Apple SDK 中编译示例，未用原生 App 执行 UI、VoiceOver、Audio Graph 或触觉验证。未来具体项目必须按 [UI Review Checklist](ui-review-checklist.md) 取证。
- 本 skill 的流程、决策树、anti-patterns、优先级与测试矩阵是工程提炼，不是 Apple 官方发布或认证的 skill，也不构成 App Store 审核结论。
- 地图、相机、绘图、音视频、游戏、Widget、Live Activities 等专项体验只给出路由原则。任务需要时查对应 HIG 和框架；不把普通页面模式强套到所有专业界面。

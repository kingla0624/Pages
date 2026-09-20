# iOS 27 Design Resources 与 SF Symbols

适用：使用官方模板做设计对照、选择/配置界面图标、规划图标与品牌资源。与 [视觉基础](visual-foundations.md)、[材质与动效](materials-and-motion.md) 配合，按需读取。

## 资源的三种证据层级

| 层级 | 能支持什么结论 | 不能推出什么 |
|---|---|---|
| 官方资源目录与链接已核验 | Apple 提供该版本 UI Kit/图标模板；知道官方入口 | 所有组件的精确尺寸、变量、状态都已检查 |
| 指定模板及组件已实际读取 | 该组件/变体/画布的测量值和视觉关系 | 同名运行时控件在所有 OS/窗口都完全相同 |
| 在目标 SDK/OS 原生运行 | 实际外观、适配与状态行为 | 未执行的其他设置和输入方式也一定正常 |

这是 **Skill** 的证据规则，避免把“链接到模板”误报为“已完成 iOS 27 像素级核验”。

## iOS 27 资源使用流程

**官方目录已核验，2026-09-14：** [Apple Design Resources](https://developer.apple.com/design/resources/) 列有 iOS 27 / iPadOS 27 UI Kit 的 Figma、Sketch，以及 App Icon Template。

- [官方目录链接的 iOS and iPadOS 27 Figma 文件](https://www.figma.com/community/file/1651309003795292092/ios-and-ipados-27)
- [官方目录链接的 App Icon Template](https://www.figma.com/community/file/1645923469870515372/app-icon-template-ios-ipados-and-watchos-27)

本次研究核验了官方目录与上述链接目标；Figma 页面读取失败，未下载或检查模板内部的 variants、variables 和尺寸。以下是使用该资源时应执行的方法，不声称本次已经完成：

1. 从官方目录进入；记录资源名称、版本、检查日期与目标组件。
2. 优先检查本任务的导航、工具栏、Sheet、列表或控件实例；只加载与任务有关的组件。
3. 对照状态/外观/尺寸相关变体；确认文字样式、组件尺寸、容器关系和命中区域分别是什么。
4. 标注测量值属于哪一个组件和环境。对与系统行为关联的部分，使用原生预览复核。
5. 将模板用于设计推导与对照；实现时优先系统组件和语义 API，不将整个画面切图或固定坐标转换成 UI。
6. 无法读取模板时继续完成 HIG/原生组件方案，明确未核验的模板细节；不要编造“官方 token”。涉及外部文件导入、发布或安装时遵循当前任务已有授权。

若用户要求与特定模板精确对应，而资源内容不可访问，该对应关系仍是未解决项，不能以自行猜测代替。

## SF Symbols：先语义，再外观

**HIG**：图标及特性的可用性随系统版本变化，系统组件也会选择合适的 outline/fill 变体。**Skill**：每个图标选择应保留一个可理解的动作或对象标签，先看语义是否正确，再比较形状风格。[HIG SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols)

```text
图标表达系统熟悉的动作/对象？
├─ 是：在 SF Symbols 中寻找语义匹配项
│  ├─ 目标 OS 可用且系统变体合适 → 使用 symbol + 原生 Label/控件
│  └─ 不可用 → 已核验旧符号 / 文字 / 合适的自定义资源回退
└─ 否：优先明确文字；确需独特图像时设计自定义资源
   └─ 同样落实可访问名称、大小/字重关系与状态

图标是唯一入口？
├─ 通用且上下文明确 → 可用图标按钮，仍提供可访问名称
└─ 语义模糊或首次接触 → 保留可见文字，或提供清晰可发现的说明
```

不要只因为两个符号长得像，就把“分享”“上传”“导出”互换；动作名称必须与实际结果一致。

## 变体、渲染和大小的选择

| 选择 | 合理起点 | 检查 |
|---|---|---|
| Outline / fill / slash / enclosed | 优先让系统容器选择；自定义状态才显式配置合适变体 | 变体真实存在；选中/不可用/动作的含义没有歧义 |
| Monochrome | 标准导航、工具栏，或背景已经丰富 | 图标/文字与材质上实际对比清楚 |
| Hierarchical | 同一语义颜色内需要突出层次 | 次级层仍能辨认，非所有图标都值得增加层级 |
| Palette | 多个颜色有明确语义或品牌理由 | 区分不只依靠色彩，顺序/数量匹配符号实际图层 |
| Multicolor | 图标内在色彩帮助识别对象 | 未把所有操作变成杂色，浅深色都可读 |
| Weight / scale | 与相邻文字和控件的视觉重量协调 | 避免随意拉伸宽高；图形大小和点击范围分别处理 |
| Variable value | 符号本身支持且值确实表达强度/进度 | 值域、缺失/未知和更新节奏正确，另有可读状态 |

四种渲染模式与当前动画功能可见 [SF Symbols 官方介绍](https://developer.apple.com/sf-symbols/)。本表的使用选择属于 Skill 判断，不规定全 App 只能使用一种模式。

## SwiftUI 映射与行为

| 意图 | API 起点 | 注意 |
|---|---|---|
| 图文一起表达对象/动作 | `Label("…", systemImage: "…")` | 标签本地化，系统容器可调整呈现方式 |
| 单独符号 | `Image(systemName: "…")` | 名称不是可访问文案；不确定的符号要核验 |
| 显式渲染 | `.symbolRenderingMode(...)`、`.foregroundStyle(...)` | 根据图层与材质对比选择，不随意覆盖系统角色 |
| 符号变体 | `.symbolVariant(...)` | 优先保留容器行为，不强制每处使用 `.fill` |
| 大小与重量 | `.font(...)`、`.imageScale(...)` | 随正文语义大小适配；`resizable()` 不作为普通图标的默认缩放方案 |
| 状态变化 | `.symbolEffect(...)` 或适当内容转场 | 具体 effect 与重载分别查可用性；动效表达真实事件 |

具体最低版本见 [SwiftUI 映射](swiftui-mapping.md) 和 Apple 符号/SDK 检查结果。不要假设任意字符串组合都是合法 symbol 名称，也不要假设较新的效果适用于每个符号。

**Skill 无障碍检查**：

- 图标按钮优先带语义标签的 `Button` / `Label`，需要时设置正确的 accessibility label/value；不要把 filename、symbol 名称或“按钮”字样堆入标签。
- 图标与相邻文字一起表达同一对象时，确认 VoiceOver 不重复播报；装饰性图像不应成为多余焦点。
- 状态含义同时能通过文字、值或 trait 理解；选中状态不能只改变填充颜色。
- 检查大字、Bold Text、RTL 和系统自动本地化；不是所有图标都应手工水平翻转。
- 确认按下状态和命中区域；放大点击范围时不要制造相互重叠的目标。

## 动画与版本

截至核验日官方 SF Symbols 页面提供 **SF Symbols 8 beta**，并说明新增符号适用于 27 系列系统。这个事实不说明每种 Draw/Replace/Variable 特性都在 iOS 27 首次引入；旧系统兼容性须按具体符号与具体 API 查证。

仅在反馈、进度或状态转换需要时选动画。重复运行的装饰性图标会与内容竞争；Reduce Motion、离屏/后台行为和能耗也需要考虑。详见 [materials-and-motion.md](materials-and-motion.md)。

## App icon 与界面符号分开处理

HIG 对 SF Symbols 在 app icon、logo 等用途有明确边界，并有部分符号的特殊使用限制；在 SF Symbols inspector 中核对具体条目。App icon 工作使用专门的 Apple 图标模板与 Icon Composer 流程，不把界面 SF Symbol 直接当作 App 品牌图标。[HIG SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols)

本 skill 不附带字体、官方 UI Kit 或图标二进制资源，也不要求为了常规系统字体/系统图标安装设计工具。

## 来源与核验

核验：2026-09-14。

- [Apple Design Resources](https://developer.apple.com/design/resources/)：目录与官方链接已查；模板内部未查。
- [SF Symbols](https://developer.apple.com/sf-symbols/)：当前工具页面、渲染/动画功能、新增符号的系统边界。
- [HIG SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols)：语义、变体、语言、可用性与特定使用限制；正文由官方可索引内容读取。
- [HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography)：符号随文字大小的可读性。
- [HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)：标签与非颜色信息表达，具体运行审查见清单。

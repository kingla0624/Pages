# 设计意图 → SwiftUI 映射

核验日期：2026-09-14。设计方案确定后，或审查现有 UI 是否保留原生行为时加载。此表用于选择 API，不替代产品信息架构，也不授权重构整个项目。

表内“行为契约/陷阱”是本 skill 的 `[工程判断]`；类型用途与版本来自 Apple `[API]` 文档。HIG 设计选择应同时依据主流程和组件决策资料。优先使用现有 SwiftUI/UIKit 架构；UIKit 项目可以映射相同设计语义，不为采用 skill 强制迁移。

## 1. 使用顺序与版本纪律

1. 读取目标页面、状态所有者、导航宿主、相邻调用点、部署目标、编译 SDK 与已有设计约束。
2. 写出设计意图和行为契约：入口、退出、状态变化、失败恢复、可访问性，然后在表中选最小可行 API。
3. 核对**具体类型、初始化器、modifier 重载、样式和 symbol**的 availability。类型存在不代表所有成员都存在；SF Symbols 名称有独立版本。
4. 同时满足编译 SDK 与运行系统条件。`if #available` 解决运行分支，不能让旧 SDK 识别尚未包含的符号；必要时沿用既有 API 或隔离实现。
5. 验证原生行为是否仍然成立，再调色彩、材质和细节。iOS 27 Design Resources 用于设计参考，不构成 API 版本或代码可编译的证据。

以下基线由 Apple DocC JSON `metadata.platforms` 核验；链接对应已核验入口。一个 API 家族可能有不同版本重载，例如 `alert` 的 `LocalizedStringKey` 重载是 iOS 15，而文档无后缀入口可能指向 iOS 16 的其他重载。遇到变化重新核验，不能按网页标题猜版本。

## 2. 导航、呈现与操作层

| 设计意图 | 原生 API | 行为契约与常见陷阱 | 已证实基线 / 核验入口 |
| --- | --- | --- | --- |
| 在层级中查看详情 | `NavigationStack`、`NavigationLink(value:)`、`navigationDestination` | 系统返回按钮/手势、深链与状态路径一致；仅有需要时才引入可编程 path；不能用透明覆盖层替代系统导航 | 新导航架构 iOS 16：[NavigationStack](https://developer.apple.com/documentation/swiftui/navigationstack)；Link 类型本身 iOS 13，不代表 value 重载也是 13 |
| 并列顶层目的地 | `TabView`；新语法 `Tab` | 每项是真正目的地；稳定标签/身份，明确每个 tab 的导航状态；不能让 Tab 按钮执行保存/创建等瞬时动作 | [TabView](https://developer.apple.com/documentation/swiftui/tabview) iOS 13；[Tab](https://developer.apple.com/documentation/swiftui/tab) iOS 18 |
| 宽屏主从内容、侧栏 | `NavigationSplitView` | 选择状态驱动后续列；检查窄宽转换、折叠后的返回顺序和空选择；不用机型名推导栏数 | iOS 16：[NavigationSplitView](https://developer.apple.com/documentation/swiftui/navigationsplitview)；preferred compact column 等额外重载另核验 |
| 当前上下文中的独立短任务 | `.sheet(item:onDismiss:content:)` | 记录任务身份、取消、保存、草稿和关闭语义；onDismiss 不是保存成功回调；避免多个布尔值互相竞争呈现 | iOS 13：[sheet(item:)](https://developer.apple.com/documentation/swiftui/view/sheet(item:ondismiss:content:)) |
| 可展开的 sheet | `.presentationDetents(_:)` | 依据内容与任务选高度；大字号、键盘、横屏时仍可完成；detent 是呈现选择，不是页面任意固定高度 | iOS 16：[presentationDetents](https://developer.apple.com/documentation/swiftui/view/presentationdetents(_:)) |
| 全屏、需要持续注意的任务 | `.fullScreenCover(item:onDismiss:content:)` | 明确退出/取消入口及恢复状态；只有任务需要才打断当前环境 | iOS 14：[fullScreenCover](https://developer.apple.com/documentation/swiftui/view/fullscreencover(item:ondismiss:content:)) |
| 关闭当前呈现 | `@Environment(\.dismiss)` | 从被呈现视图的 environment 读取；先完成必要保存/状态处理；外层 dismiss 可能作用于不同上下文 | iOS 15：[DismissAction](https://developer.apple.com/documentation/swiftui/dismissaction) |
| 防止丢失未保存输入 | `.interactiveDismissDisabled(_:)` | 条件由真实未保存状态决定；仍提供可发现的取消/保存；该 modifier 本身不生成丢弃确认，也不替代持久化 | iOS 15：[interactiveDismissDisabled](https://developer.apple.com/documentation/swiftui/view/interactivedismissdisabled(_:)) |
| 当前页面操作 | `.toolbar`、`ToolbarItem`、语义 placement | 操作作用域清楚；大字号和横屏可达；保留系统工具栏分组与布局，避免自绘顶部栏遮挡安全区 | 类型/基础 toolbar iOS 14：[ToolbarItem](https://developer.apple.com/documentation/swiftui/toolbaritem)；具体 placement 另核验 |
| Liquid Glass 工具栏分组 | `ToolbarSpacer` | 按任务关系分组，防止给系统控件重复叠背景；不把固定 spacer 像素当跨设备规范 | iOS 26：[ToolbarSpacer](https://developer.apple.com/documentation/swiftui/toolbarspacer) |
| 次级操作集合 | `Menu` / 适当的 context menu | 菜单承载操作；重要且不易发现的操作另有明显入口，长按不能是唯一通路 | [Menu](https://developer.apple.com/documentation/swiftui/menu) iOS 14；contextMenu 具体重载需另核验 |
| 需要立即了解的错误/决策 | `.alert`、`Button(role:)` | 写清发生什么、后果与下一步；不把普通成功提示做成强制弹窗 | LocalizedStringKey actions/message 重载 iOS 15：[alert](https://developer.apple.com/documentation/swiftui/view/alert(_:ispresented:actions:message:)-6awwp)、[ButtonRole](https://developer.apple.com/documentation/swiftui/buttonrole) |
| 对动作作进一步选择/确认 | `.confirmationDialog` | 使用明确动作词和 cancel/destructive 语义；危险程度由实际后果决定，不给一切操作加确认 | LocalizedStringKey 重载 iOS 15：[confirmationDialog](https://developer.apple.com/documentation/swiftui/view/confirmationdialog(_:ispresented:titlevisibility:actions:)-87n66) |

`[API]` NavigationStack 自带平台适配的返回控件与手势；NavigationSplitView 在窄空间可折叠为栈。定制外观后应重新验证这些行为，不把“用了原生类型”当作自动合格证。[NavigationStack](https://developer.apple.com/documentation/swiftui/navigationstack)、[NavigationSplitView](https://developer.apple.com/documentation/swiftui/navigationsplitview)

## 3. 内容容器与自适应布局

| 设计意图 | 原生 API | 行为契约与常见陷阱 | 已证实基线 / 核验入口 |
| --- | --- | --- | --- |
| 同类内容列表 | `List`、`Section` | 每行结构稳定；选择/编辑/滑动动作保持明确；不要只为去分隔线就重写整个列表 | iOS 13：[List](https://developer.apple.com/documentation/swiftui/list)、[Section](https://developer.apple.com/documentation/swiftui/section) |
| 设置、录入与检查参数 | `Form`、`Section` | 按用户概念分组，解释文字靠近相关控件；设置的立即生效与提交式表单不能混淆 | iOS 13：[Form](https://developer.apple.com/documentation/swiftui/form) |
| 名称和值的稳定配对 | `LabeledContent` | 允许长标签、长数值、右到左布局；比手动在两端推开 Text 更有语义 | iOS 16：[LabeledContent](https://developer.apple.com/documentation/swiftui/labeledcontent) |
| 杂志式内容、自定义详情 | `ScrollView` + 适量 stack | 保留安全区和滚动行为；大集合采用合适惰性容器，不给整屏固定高度 | iOS 13：[ScrollView](https://developer.apple.com/documentation/swiftui/scrollview)；惰性类型另见下一行 |
| 图片/卡片集合 | `LazyVGrid` | 格数由可用宽度和内容最小需求决定；卡片内容不能靠强制截字维持整齐 | iOS 14：[LazyVGrid](https://developer.apple.com/documentation/swiftui/lazyvgrid) |
| 小规模二维对齐 | `Grid` | 适合同时布局的行列；不把非惰性 Grid 用作未评估的大数据容器 | iOS 16：[Grid](https://developer.apple.com/documentation/swiftui/grid) |
| 横向空间不足时重排 | `ViewThatFits` | 按优先级提供真实等价布局；它选择首个能容纳的候选，不自动设计新布局 | iOS 16：[ViewThatFits](https://developer.apple.com/documentation/swiftui/viewthatfits) |
| 固定底部操作且内容可滚动 | `.safeAreaInset` | 插入操作同时为内容留出空间；检查 home indicator、键盘与横屏，不用覆盖层遮住最后一行 | iOS 15：[safeAreaInset](https://developer.apple.com/documentation/swiftui/view/safeareainset(edge:alignment:spacing:content:)-6gwby) |
| 分页/对齐式滚动 | `.scrollTargetBehavior` | 确认分页确实帮助任务；分页、普通滚动与图表横滑不要竞争同一手势 | iOS 17：[scrollTargetBehavior](https://developer.apple.com/documentation/swiftui/view/scrolltargetbehavior(_:)) |

## 4. 输入、搜索与反馈

| 设计意图 | 原生 API | 行为契约与常见陷阱 | 已证实基线 / 核验入口 |
| --- | --- | --- | --- |
| 单行文本、金额等输入 | `TextField` | 持久标签、输入格式、提交、错误就地说明；keyboard type 不等于验证；本地化解析与负数/小数需求一致 | 类型 iOS 13：[TextField](https://developer.apple.com/documentation/swiftui/textfield)；format/axis 等重载另核验 |
| 敏感文字输入 | `SecureField` | 正确标签与内容语义；隐藏字符不等于业务数据已加密 | iOS 13：[SecureField](https://developer.apple.com/documentation/swiftui/securefield) |
| 长文编辑 | `TextEditor` | 长文滚动、选择、撤销、键盘不遮挡；需要格式编辑时另研究专项 API | iOS 14：[TextEditor](https://developer.apple.com/documentation/swiftui/texteditor)；富文本能力与新增重载另核验 |
| 开/关状态 | `Toggle` | label 描述状态；禁用原因可理解；异步失败时回滚或明确 pending | iOS 13：[Toggle](https://developer.apple.com/documentation/swiftui/toggle) |
| 互斥选择 | `Picker` + 合适 style | 短且少的同级选项可评估 segmented；长选项/大量项改用更合适呈现；不可用 Toggle 组伪造单选 | 类型 iOS 13：[Picker](https://developer.apple.com/documentation/swiftui/picker)；style 各自核验 |
| 日期/时间选择 | `DatePicker` | 明确时间语义、允许范围、时区/日历；非任意手输假日期控件 | 类型 iOS 13：[DatePicker](https://developer.apple.com/documentation/swiftui/datepicker)；style 另核验 |
| 有界连续值 / 固定步长调节 | `Slider` / `Stepper` | Slider 显示含义、范围与当前值；需要精确输入时提供等价方式。Stepper 步长与上下限符合任务 | 类型 iOS 13：[Slider](https://developer.apple.com/documentation/swiftui/slider)、[Stepper](https://developer.apple.com/documentation/swiftui/stepper) |
| 输入焦点与键盘 | `FocusState`、`.scrollDismissesKeyboard` | 初始焦点有理由；Next/Done 与真实流程一致；关闭键盘不能丢输入，出错字段可定位 | [FocusState](https://developer.apple.com/documentation/swiftui/focusstate) iOS 15；[scrollDismissesKeyboard](https://developer.apple.com/documentation/swiftui/view/scrolldismisseskeyboard(_:)) iOS 16 |
| 在当前内容域中搜索 | `.searchable` | 明确搜索范围；处理空查询、查询中、无结果、取消和保留上下文；先用系统自动 placement，再验证目标系统具体位置 | 基础重载 iOS 15：[searchable](https://developer.apple.com/documentation/swiftui/view/searchable(text:placement:prompt:)-18a8f) |
| 搜索范围与建议 | `.searchScopes`、`.searchSuggestions` | 范围是对同一查询域的约束；建议与结果区分，选择后行为明确；异步搜索取消过期请求 | 对应重载 iOS 16：[searchScopes](https://developer.apple.com/documentation/swiftui/view/searchscopes(_:scopes:))、[searchSuggestions](https://developer.apple.com/documentation/swiftui/view/searchsuggestions(_:)) |
| 发起操作 | `Button` + 适当 style / role | 真实可点击语义、命中区、禁用/处理中状态、防重复提交；不以 Text.onTapGesture 代替标准按钮 | [Button](https://developer.apple.com/documentation/swiftui/button) iOS 13；role iOS 15，具体样式另核验 |
| 进行中与可测量进度 | `ProgressView` | 只有可计算时显示百分比；长任务提供状态、取消/恢复策略；不要无限 spinner 掩盖错误 | iOS 14：[ProgressView](https://developer.apple.com/documentation/swiftui/progressview) |
| 刷新既有内容 | `.refreshable` | 保留内容上下文，异步 handler 的寿命对应真实刷新；错误可恢复 | iOS 15：[refreshable](https://developer.apple.com/documentation/swiftui/view/refreshable(action:)) |
| 无内容、搜索无结果 | `ContentUnavailableView` | 区分初次使用、零结果、未授权和失败；提供相关下一步；旧系统用现有原生文字/图标/按钮组合 | iOS 17：[ContentUnavailableView](https://developer.apple.com/documentation/swiftui/contentunavailableview) |
| 系统共享内容 | `ShareLink` | 共享对象、标题、预览与隐私范围正确；先确认项目 Transferable 数据格式 | iOS 16：[ShareLink](https://developer.apple.com/documentation/swiftui/sharelink) |
| 合理的触觉/感官确认 | `.sensoryFeedback` | 由有意义状态变化触发；视觉/语义反馈同样存在；不能假定所有设备都会产生相同触觉 | iOS 17：[sensoryFeedback](https://developer.apple.com/documentation/swiftui/view/sensoryfeedback(_:trigger:)) |

## 5. 排版、图标、材质与无障碍

| 设计意图 | 原生 API | 行为契约与常见陷阱 | 已证实基线 / 核验入口 |
| --- | --- | --- | --- |
| 原生文字层级 | `Text` + 语义 font style；必要尺寸用 `@ScaledMetric` | 优先内容与层级，允许换行/重排；不要全局固定字号或限制 Dynamic Type 以修补布局 | Text/font 具体调用按 SDK 核验；[ScaledMetric](https://developer.apple.com/documentation/swiftui/scaledmetric) iOS 14 |
| 名称与系统图标共同表达 | `Label`、`Image(systemName:)` | 使用语义匹配的 symbol；可见标签与可访问名称一致；不要用陌生 icon 省去必要文字 | [Label](https://developer.apple.com/documentation/swiftui/label) iOS 14；[Image(systemName:)](https://developer.apple.com/documentation/swiftui/image/init(systemname:)) iOS 13；每个 symbol 另核验 |
| SF Symbols 层级/颜色模式 | `.symbolRenderingMode` | 依据语义与符号支持选择 monochrome/hierarchical/palette/multicolor；图标模式不能代替状态文字 | iOS 15：[symbolRenderingMode](https://developer.apple.com/documentation/swiftui/view/symbolrenderingmode(_:)) |
| 符号状态变化 | `.symbolEffect` | 动画指向真实动作或状态；支持 Reduce Motion，避免循环抢注意；不同 effect 与 symbol 支持各自核验 | 已核验 value 重载 iOS 17：[symbolEffect](https://developer.apple.com/documentation/swiftui/view/symboleffect(_:options:value:)) |
| 传统内容背景材质 | `Material` | 根据层级和对比选择；不是 Liquid Glass 的同义词，不能用普通 blur 自称完整 Liquid Glass | iOS 15：[Material](https://developer.apple.com/documentation/swiftui/material) |
| 自定义导航/控制层玻璃 | `.glassEffect`、`GlassEffectContainer` | 先复用系统控件外观；自定义玻璃需要明确作用与适配；不要给内容卡片逐个加玻璃 | iOS 26：[glassEffect](https://developer.apple.com/documentation/swiftui/view/glasseffect(_:in:))、[GlassEffectContainer](https://developer.apple.com/documentation/swiftui/glasseffectcontainer)；详见 [materials-and-motion.md](materials-and-motion.md) |
| 朗读名称与元素分组 | `.accessibilityLabel`、`.accessibilityElement(children:)` | 默认语义足够时不重复覆盖；合并后保留必要动作/数值，图标隐藏不得误隐藏操作 | label 已核验重载 iOS 14：[accessibilityLabel](https://developer.apple.com/documentation/swiftui/view/accessibilitylabel(_:)-1d7jv)；[accessibilityElement](https://developer.apple.com/documentation/swiftui/view/accessibilityelement(children:)) iOS 13 |
| 自定义控件的等价操作 | `.accessibilityAdjustableAction`、`.accessibilityRepresentation` | 提供可增减/操作/读取的真实语义；replacement 必须与可见控件功能一致，不只是添加一个名称 | [adjustable action](https://developer.apple.com/documentation/swiftui/view/accessibilityadjustableaction(_:)) iOS 13；[representation](https://developer.apple.com/documentation/swiftui/view/accessibilityrepresentation(representation:)) iOS 15 |
| 适应辅助功能偏好 | `accessibilityReduceMotion`、`accessibilityReduceTransparency`、`accessibilityDifferentiateWithoutColor` | 分别处理动态、背景可读性与非颜色编码；不要把它们合成一个“无障碍模式”隐藏功能 | 均 iOS 13：[reduce motion](https://developer.apple.com/documentation/swiftui/environmentvalues/accessibilityreducemotion)、[reduce transparency](https://developer.apple.com/documentation/swiftui/environmentvalues/accessibilityreducetransparency)、[differentiate without color](https://developer.apple.com/documentation/swiftui/environmentvalues/accessibilitydifferentiatewithoutcolor) |
| 数据可视化 | `Chart` + marks、selection、scrolling | 先定义用户问题/数据口径；默认可访问能力仍需审查；图表内容不应全面玻璃化 | Chart iOS 16；SectorMark/selection/scroll iOS 17；完整决策与核验见 [charts.md](charts.md) |

## 6. 防止错误映射的执行规则

- 不把 TabView、NavigationStack、sheet 当成三种可互换的页面切换动画；分别维护目的地、层级和临时任务语义。
- 不通过 `.navigationBarBackButtonHidden(true)`、全屏手势层或硬编码 top padding 获得相似截图，却破坏返回、焦点和可达性。
- 不在同时已有系统 sheet/toolbar/material 的位置再次叠同类背景；新 SDK 自动外观与自定义外观分别验证。
- 不把 `.disabled(true)` 当作完整错误解释；需要帮助时保持说明或恢复入口可访问。
- 不认为 Button 已使用 Label 就能免测 VoiceOver；无意义 symbol 名称、错误合并、overlay 都能破坏语义。
- 不为每个页面提取“万能原生卡片”或“统一玻璃组件”；先看真实重复点与行为差异，保持修改最小。
- 不编造 `.toast`、万能 `.nativeIOSStyle`、不存在的 Charts mark modifier 或 iOS 27 API。需要系统未提供的 UI 时先说明行为契约，再使用项目既有实现或最小自定义。

## 7. 从设计交付到验收证据

每个关键组件的实现说明保持简短，但必须可检查：

```text
设计意图 → 已选择原生组件 → 关键行为与状态 → 适用系统/回退 → 验证证据
例：编辑现有记录 → sheet(item:) + Form → 保存成功才关闭；取消保留/丢弃明确
    → 项目当前部署范围 → 键盘、大字号、滑动关闭、保存失败后的草稿已检查
```

运行前先核对 import、API availability、状态所有权与导航宿主；运行后检查真实交互、不同内容和可访问性。静态图仅能证明某个画面；编译仅能证明当前 SDK 接受代码。完整验收见 [ui-review-checklist.md](ui-review-checklist.md)。

尚未逐项核验：项目实际编译 SDK、所有初始化器与 modifier 重载、具体 SF Symbols 名称、iOS 27 独占变化、SDK 自动样式在各设备上的最终呈现。本表不能把这些待验项升级为“已支持”。

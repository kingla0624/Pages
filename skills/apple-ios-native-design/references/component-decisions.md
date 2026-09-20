# 组件决策树：从任务语义到原生容器

用于确定页面结构、组件和呈现方式；先完成 `SKILL.md` 的设计上下文，再按需要阅读。这里的树是本 skill 的决策工具，不是 Apple 的唯一标准答案。

- **[HIG]**：Apple 设计建议；结合适用平台和任务判断，偏离时说明理由。
- **[API]**：官方 API 的语义或行为；具体可用版本仍须以项目 SDK 核验。
- **[Skill]**：本体系制定的工程选择和验收要求，不冒称 Apple 强制规定。
- **[WWDC26]**：2026 官方技术说明；与旧教程冲突时，先核对目标平台、SDK 和系统版本。

## 1. 先确定导航，不先画容器

```text
用户准备到哪里，或对什么做什么？
├─ 切换相对独立的主要目的地 → TabView / Tab
│  ├─ 内容结构较复杂且有宽窗口 → 评估 sidebarAdaptable
│  └─ 某目的地暂时无内容 → 保留入口，在目的地解释状态
├─ 在内容层级里继续深入 → NavigationStack / NavigationLink
├─ 需要同时浏览集合与选中对象 → NavigationSplitView
│  ├─ 集合 → 对象 → 两列候选
│  └─ 分组 → 集合 → 对象 → 三列候选
├─ 只是切换当前内容的视图/条件 → Picker / 分段控件 / 筛选
└─ 新建、分享、删除、刷新等动作 → Button / toolbar / Menu
```

**[HIG] 决策理由。** Tab bar 表达顶层目的地，toolbar 提供与当前视图有关的操作、导航及搜索；不要把“新增”伪装成一个空目的地。按信息结构、使用频率和可见宽度选择 Tab 数量，避免导致内容难发现的 More 溢出。不能把“所有 App 必须 3–5 个 Tab”写成规则；当前 HIG 的“五个以内”建议针对允许用户自定义 Tab 的默认配置这一具体情境。[S1–S3]

**[Skill] 状态契约。** 为每个 Tab 确定独立路径、选中内容和必要的滚动位置；切换后应能回到原任务。搜索、深链和通知跳转需明确落在哪个目的地及返回到哪里。不要为视觉对称添加无独立价值的 Tab。

**[API] 宽窄转换。** `NavigationSplitView` 在窄尺寸下可以折叠为栈；列宽和可见性是系统参与协商的状态，不是固定像素网格。测试选中项、返回路径和未选择详情状态，不能只验证三列静态截图。[S4]

**[WWDC26] iOS 27 边界。** iPhone App 在 iPhone Mirroring 与 iPad 上可调整窗口尺寸；“iPhone 等于窄单列”不再是可靠前提。UIKit iPhone sidebar 在 iOS 27 由 App 选择启用，系统根据空间决定是否显示，并非直接复制 iPad 的用户切换按钮行为。SwiftUI 可评估 `.sidebarAdaptable`，但不能仅凭共用 HIG 文字推断每个平台都有相同切换 UI；在项目 SDK 和运行环境确认。[S2, S5]

**验证：** 连续收窄/放宽窗口、切换 Tab、打开深链、选中后返回；检查目的地没有丢失、未出现双重返回按钮、没有依赖设备型号硬编码布局。[Skill]

## 2. 呈现方式：层级、临时任务、信息与选择

```text
新内容与当前上下文是什么关系？
├─ 属于同一浏览层级 → push / 栈内目的地
├─ 当前上下文中的短任务 → sheet 候选
│  ├─ 必须先完成/取消才能继续父任务 → modal
│  └─ 需同时操作父内容，如地图与结果 → nonmodal sheet 候选
├─ 少量临时信息/控件，且需要指向来源 → popover（宽视图）
│  └─ 空间紧凑 → 接受系统适配，评估 sheet
├─ 持续编辑或沉浸媒体任务 → 全屏呈现/专用工作区候选
├─ 用户明确打开一组命令 → Menu / contextMenu
├─ 用户发起的动作需要进一步选择 → confirmationDialog
└─ 当前必须处理的重要问题或不可逆后果 → alert 候选
```

| 候选 | 采用条件与例外 | 必须验证 [Skill] |
|---|---|---|
| 栈内目的地 | 浏览关系可由返回路径说明；不要把普通详情全部改成 sheet | 系统返回手势、路径恢复、深链进入后的退路 |
| Sheet | 与父上下文紧密相关且范围清晰；iOS/iPadOS 可 modal 或 nonmodal，不能把 sheet 当作 modality 的同义词 [HIG] | 下拉关闭、取消、保存、键盘、各 detent；nonmodal 时父内容可操作范围明确 |
| Popover | 少量临时信息，锚点可说明来源；紧凑视图优先系统适配 [HIG] | 锚点不漂移，不遮住关键参照；点外关闭不默默丢失编辑 |
| 全屏工作区 | 相机、媒体、持续编辑等能从专注中获益；复杂并不自动等于必须全屏 [HIG/Skill] | 清晰退出、恢复原上下文、工作中断后可继续 |
| Menu | 用户主动查找相关命令；常用关键操作仍需容易发现 [Skill] | 长文本、禁用状态、辅助功能；重要操作不只藏在长按中 |
| Confirmation dialog | 已发起的动作有若干后续选择；不是任意设置项选择器 [HIG] | 取消无副作用；动作标题说明结果；使用原生 destructive/cancel 角色 |
| Alert | 紧急、重要且可行动的信息，或不常见且不可恢复的破坏后果 [HIG] | 不用通用“错误/确定”掩盖结果；提供安全退出和下一步 |

**[HIG] 关闭语义。** Back 返回层级或上一步，不代表关闭整张 sheet。Cancel、Done、Close、具体提交动作的含义应与实际保存策略一致。主界面避免连续堆叠 sheet 导致人不知返回哪里；多步短任务可在同一呈现内部组织步骤。[S6–S10]

**[Skill] 先定义数据策略。** 明确是立即生效、自动保存还是草稿后提交，再安排按钮。存在未保存输入时，所有退出路径都应符合策略；`.interactiveDismissDisabled` 只能作为实现手段，不能让用户被困。任何自绘底部抽屉都需承担焦点、手势、键盘、尺寸与无障碍成本，采用前说明标准 sheet 不足在哪里。

## 3. 内容容器：由数据阅读方式决定

```text
主要阅读/操作对象是什么？
├─ 同构、以文字为主、可扫描的项目 → List + Section
├─ 设置或输入控件 → Form + Section
├─ 图片/封面/视觉对象 → ScrollView + 合适的 Grid / lazy grid
├─ 文章、详情、编排内容 → ScrollView + stack / 自定义 Layout
├─ 需要按字段跨行比较 → 宽窗口 Table；窄窗口保留关键字段
└─ 数据关系/趋势/分布 → 先读 charts.md 决定是否需要 Chart
```

**[HIG/API] 默认选择。** 文字集合通常适合行列表，视觉集合通常适合网格；`List` 提供原生行交互并自行滚动，`Form` 对输入控件施加平台适合的样式。不要在外面再包同向 `ScrollView`，也不要仅为消除系统外观而重造整套列表。[S11–S13]

**[Skill] 定制门槛。** 品牌内容、画布或特殊信息密度可以需要自定义容器；先列出标准容器无法满足的具体需求，再保留对应系统交互语义。不要把所有内容拆成同权重卡片，也不要把相互独立的操作整块嵌入一个覆盖全行的点击区域。

**[API] 选择与编辑例外。** SwiftUI `List` 在 iOS 16 及以后允许在非编辑模式下单选；触摸多选通常使用 `editMode`，键鼠可以有不同路径。HIG 列表页的泛述不能覆盖当前 API 文档明确的版本行为。[S14]

**验证：** 内容从空到长列表、删除当前详情对象、长标题、重排、刷新后保留位置；宽窗口采用合适列数和文字宽度，大字号时减少列数或重排。[Skill]

## 4. 输入和选择：先考虑值域与精度

| 需要表达的值 | 默认候选 [Skill] | 选择依据与例外 |
|---|---|---|
| 开/关两个相反状态 | `Toggle` | 标签描述被控制的状态；使用 switch 样式时遵循 iOS 列表行语境；不只靠颜色区分状态 [HIG] |
| 少量互斥且需同时比较的选项 | `.segmented` 的 `Picker` | 文案、数量和宽度能保持清楚才用；不能挤压到截断，也不作多选控件 |
| 单选，选项不需持续可见 | `Picker`，评估 `.menu` 或独立选择页 | 显示当前值；复杂、长列表或需解释的选项不要强塞小菜单 |
| 多选 | 可选择列表或明确多选控件 | 表达每项选中状态与总量；不要使用互斥的 Picker 假装多选 |
| 有界连续值 | `Slider` | 需要精确输入时补数值输入或 Stepper；范围、单位明确。系统音量使用系统 volume view [HIG] |
| 有界步进值 | `Stepper` | 说明单位、上下界；禁用状态与实际约束一致 |
| 日期/时间 | `DatePicker` | 系统格式随地区变化；确认时区、范围和日期语义，不手写英文格式常量 |
| 单行/敏感/多行文字 | `TextField` / `SecureField` / `TextEditor` | 标签、键盘类型、提交行为匹配字段；敏感输入使用适合的安全入口 |
| 搜索条件 | `.searchable` + suggestions/scopes | 明确搜索范围、取消和清除差异；由数据逻辑完成真正过滤 [API] |

**[HIG] 减少输入。** 使用合理默认值和已有系统能力，能选择就少要求键入；必要权限由用户在相关上下文授予。及时给出字段问题并让人能修正，使用数值格式化，不预填密码。[S15–S19]

**[Skill] 输入契约。** 对每个字段写出必填性、默认值、格式、范围、错误提示、焦点顺序与提交时机。未输入、输入中、无效、服务端拒绝不能混为一个“错误”状态；避免在组合输入法尚未完成时破坏文字。除真正依赖此值的提交外，不应无故禁用整个界面。

**验证：** 中文/长文本/粘贴、区域小数分隔符、键盘遮挡、Next/Done、硬件键盘、VoiceOver、保存后再次打开；输入错误时已有数据保留。[Skill]

## 5. 操作层级、反馈和恢复

```text
操作需要哪种反馈？
├─ 即时改变可见状态 → 就地状态更新，必要时辅助反馈
├─ 需要等待，且能量化真实进度 → determinate ProgressView
├─ 需要等待，但进度未知 → indeterminate ProgressView + 必要上下文
├─ 可撤销的常见操作 → 执行后提供恢复路径，避免反复 alert
├─ 与局部内容有关的可恢复失败 → 就地错误 + 重试
└─ 关键、无法继续或不可逆后果 → 评估 alert / confirmationDialog
```

**[HIG] 操作层级。** 优先动作使用突出样式；不是每个按钮都使用品牌强调色。命令使用明确名称，熟悉符号可辅助识别。自定义按钮保留按下状态，一般按钮命中区域以至少 44×44 pt 为基准；这不是要求每个可见图标都画成 44 pt。[S20]

**[HIG] 反馈选择。** 进度应真实，已知时优先确定进度；在可行且无负面影响时提供取消。Alert 要克制，普通信息和可撤销的日常动作通常不值得中断流程。Context menu 只放与对象有关的命令，并保持破坏性操作易于辨认。[S8, S21–S22]

**[Skill] 验证：** 连点不重复提交；延迟、失败、重试、取消和成功都可辨识；“成功”只在业务实际成功后出现；反馈不会移动当前焦点或遮挡下一步操作；触觉、颜色和短暂动画不是唯一状态证据。

## 6. 选择完成后提交的决策记录 [Skill]

每个新页面或关键改动输出简短记录：`用户任务 → 候选 → 选择与理由 → 状态/退出契约 → 系统及宽度条件 → 需要运行验证的项目`。只记录会影响实现和验收的决策；不要为普通系统默认值编造取舍报告。

## 来源与核验

核验日期：**2026-09-14**。以下为实际查阅的 Apple 官方页面/官方索引文本；未据此运行 Xcode 或断言全部 API 的最低版本。此文件的树、组合模式和额外验收步骤属于 [Skill]；来源链接用于追溯具体 HIG/API 判断。

- [S1 · HIG Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)（2026-06-08 更新）
- [S2 · HIG Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars)（2026-06-08 更新）
- [S3 · HIG Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars)
- [S4 · SwiftUI NavigationSplitView](https://developer.apple.com/documentation/swiftui/navigationsplitview)
- [S5 · WWDC26 Modernize your UIKit app](https://developer.apple.com/videos/play/wwdc2026/278/)
- [S6 · HIG Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)（2026-03-24 更新按钮位置）
- [S7 · HIG Popovers](https://developer.apple.com/design/human-interface-guidelines/popovers)
- [S8 · HIG Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts)
- [S9 · HIG Action sheets](https://developer.apple.com/design/human-interface-guidelines/action-sheets)
- [S10 · HIG Modality](https://developer.apple.com/design/human-interface-guidelines/modality)
- [S11 · HIG Collections](https://developer.apple.com/design/human-interface-guidelines/collections)
- [S12 · HIG Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)
- [S13 · SwiftUI Picking container views for your content](https://developer.apple.com/documentation/swiftui/picking-container-views-for-your-content)
- [S14 · SwiftUI List](https://developer.apple.com/documentation/swiftui/list)
- [S15 · HIG Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data)
- [S16 · HIG Toggles](https://developer.apple.com/design/human-interface-guidelines/toggles)
- [S17 · HIG Pickers](https://developer.apple.com/design/human-interface-guidelines/pickers)
- [S18 · HIG Sliders](https://developer.apple.com/design/human-interface-guidelines/sliders)
- [S19 · SwiftUI Search](https://developer.apple.com/documentation/swiftui/search)
- [S20 · HIG Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
- [S21 · HIG Progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators)
- [S22 · HIG Context menus](https://developer.apple.com/design/human-interface-guidelines/context-menus)

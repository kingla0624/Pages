---
name: apple-ios-native-design
description: Design, implement, refine, or review native iPhone and iPad interfaces using Apple HIG, iOS 27 Design Resources, Liquid Glass, SF Symbols, SwiftUI, and Swift Charts. Use for screen structure, navigation, controls, visual hierarchy, motion, accessibility, and chart UX; not for backend-only work or web pages styled to resemble iOS.
---

# Apple iOS Native Design

将产品任务转化为符合 Apple 平台习惯、保留产品个性、可以验证的界面与交互。以当前 HIG 为设计依据，以目标项目的 SDK 和部署版本为实现依据。中文或用户所用语言交付，保留准确的 API 名称。

## 触发与任务边界

| 用户意图 | 工作模式 | 最小交付 |
|---|---|---|
| 设计新页面、导航或完整功能流程 | Design | 页面/流程方案、组件选择理由、必要状态、验收场景 |
| 用 SwiftUI/UIKit 实现设计 | Implement | 沿现有架构的实现、版本处理、实际执行的验证 |
| 界面不像原生、层级混乱、操作不顺 | Refine | 先定位问题，再做与任务匹配的局部修改 |
| 审查截图、原型或代码的 iOS 体验 | Review | 有证据的问题、影响、建议、未验证项；审查本身不授权修改 |

明确提及本 skill 时使用它。自动匹配原生 iOS/iPadOS UI 工作；不因项目使用 Swift 就把网络层、数据库或构建故障改成设计任务。不把用户的既定品牌、框架或部署目标替换成自己的偏好。纯设计请求不自动创建 App、安装工具或更改项目配置。

## 工作流程

1. **读取上下文。** 先看直接相关页面与调用处、现有组件、导航和样式。识别用户任务、内容、最低 OS、构建 SDK、目标运行 OS、可用窗口与输入方式。缺失信息先从项目调查；只有会改变任务结果且无法合理推断时才询问。
2. **建立简短设计契约。** 说明该页面让谁完成什么、主要内容与操作、进入/离开方式、需要保护的输入/状态。复杂或新流程使用 [设计推理](references/design-reasoning.md)；小改动只记录受影响决策，不重做全产品方案。
3. **选择组件与布局。** 用 [组件决策树](references/component-decisions.md) 和相关 [页面模式](references/screen-patterns.md) 推导结构。先解决信息层级、导航、输入与反馈，再选择视觉表达。
4. **落实设计语言。** 按需要读取下表的专题。系统组件是有理由的默认选择；定制必须解决具体用户需求，并保留可发现性、平台交互、适配与辅助功能。
5. **映射与实现。** 使用 [SwiftUI 映射](references/swiftui-mapping.md)，查阅当前 Apple API 文档或 SDK 声明确认签名和可用性。已有 UIKit 项目保留其架构；映射表不要求重写为 SwiftUI。
6. **验证并交付。** 用 [UI Review Checklist](references/ui-review-checklist.md) 检查相关场景。已授权的实现/修复任务优先解决妨碍任务完成的问题；Review 模式记录问题、建议和复测条件。说明实际测试范围；编译、截图、手势和真机证据不能互相替代。

## 按需加载

只读取当前任务涉及的参考。不要在每次任务开始时加载整个 references 目录。

| 需要解决的问题 | 读取 |
|---|---|
| 产品意图、设计取舍、设计说明/交付格式 | [design-reasoning.md](references/design-reasoning.md) |
| 导航、呈现、容器、控件、操作与反馈的选择 | [component-decisions.md](references/component-decisions.md) |
| 列表详情、表单、搜索、编辑、媒体、首页、引导 | [screen-patterns.md](references/screen-patterns.md) |
| 布局、排版、颜色、品牌与界面文案 | [visual-foundations.md](references/visual-foundations.md) |
| iOS 27 UI Kit 的使用、SF Symbols、图标资源 | [resources-and-symbols.md](references/resources-and-symbols.md) |
| Liquid Glass、动态效果、触觉反馈 | [materials-and-motion.md](references/materials-and-motion.md) |
| 趋势、比较、分布、比例等数据体验 | [charts.md](references/charts.md) |
| 设计意图到原生 API 的映射与版本边界 | [swiftui-mapping.md](references/swiftui-mapping.md) |
| 诊断常见错误及选择修复路径 | [anti-patterns.md](references/anti-patterns.md) |
| 无障碍、适配、运行流程与视觉验收 | [ui-review-checklist.md](references/ui-review-checklist.md) |
| 官方来源、时效、冲突与未核验边界 | [sources.md](references/sources.md) |
| 维护或评估本 skill 的实际行为 | [skill-evaluation.md](references/skill-evaluation.md) |

## 决策与证据纪律

- 文档中的 **HIG** 表示 Apple 设计建议；**API** 表示框架能力/约束；**Skill** 表示本体系的工程化决策或验收规则。默认是有条件的指导，不把例子、偏好或历史做法冒充 Apple 强制规范。
- 设计资源版本、工具版本、构建 SDK、最低部署版本与运行系统分别记录。iOS 27 是本体系研究的设计基准，**不是自动提高项目最低部署版本的指令**。SF Symbols App 的版本不代表所有图标能用于旧系统。
- 保留语义：Tab 是目的地，按钮是动作，Back 是返回层级，关闭是离开呈现；图表数值与编码不可为了装饰失真。具体例外按参考文件和当前 API 核验。
- 不把固定颜色、圆角、边距、动画时长或“必须若干个 Tab”作为全局 Apple 参数。先用系统默认、语义样式和内容驱动布局；自定义 token 属于该产品。
- 完整体验包含相关的失败与恢复、输入保护、大字、浅深色、辅助功能和本地化；按实际任务选择验证组合，不为不存在的功能制造额外需求。
- HIG/模板与具体 API 文档冲突时，分别判断设计意图和目标平台实现；优先核验更新日期与平台专门说明。网页只返回 JavaScript 壳不算读过正文。无法核验的新 API 标记待确认并采用已知可用的方案。
- 当前可用工具决定验证能力。遵循项目的 Xcode 工具优先顺序，使用前确认工具存在；没有 Apple 运行环境仍可完成设计与静态审查，但保留运行验证缺口。不要为使用本 skill 强制安装依赖或创建新架构。

## 交付

按任务规模给出：**结果 → 关键设计选择 → 实现/版本说明 → 验证证据与剩余问题**。重大取舍给来源；不要输出整份规则手册或将检查清单逐条抄给用户。Review 模式将“已观察的问题”和“需要运行确认的疑点”分开。没有实际证据，不宣称“符合全部 HIG”或“完整原生体验已验证”。

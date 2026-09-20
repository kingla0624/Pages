# Apple iOS Native Design：独立一致性审查

审查日期：2026-09-15。范围：`skills/apple-ios-native-design` 全部 13 个 Markdown 文件与 `agents/openai.yaml`。本报告保留首次审查时的原始发现；被审 skill 未由本审查者修改。未读取其他评估输出。

方法：完整静态阅读，检查入口、按需路由、相对链接、跨文档规则与证据边界；对容易误判的 HIG 条目和 iOS 27 声明抽查 Apple 官方正文或官方可索引文本。Windows 环境；未执行 SwiftUI 编译、原生 UI、VoiceOver、Audio Graph 或触觉测试。本报告属于文档质量审查，不是 App 验收。

结论：发现 **2 项 P2 文档一致性问题**，均可通过局部措辞修正；没有发现需要重构体系的架构性问题。P2 指可能诱发错误决策或扩大任务范围的规则问题，不意味着已观察到 agent 实际误执行。

## 发现 1：只读 Review 的完成条件与修复、验收条件混在一起

**位置与原始证据：**

- [SKILL.md:17](C:/Users/Kingla/Cowork/Pages/skills/apple-ios-native-design/SKILL.md:17) 明确 Review 最小交付为问题、影响、建议和未验证项，且“审查本身不授权修改”。
- [SKILL.md:28](C:/Users/Kingla/Cowork/Pages/skills/apple-ios-native-design/SKILL.md:28) 对所有工作模式的流程写“验证并修正”“先修复妨碍任务完成的问题”。
- [ui-review-checklist.md:122](C:/Users/Kingla/Cowork/Pages/skills/apple-ios-native-design/references/ui-review-checklist.md:122) 对 P1 写“本轮修复”；[第 128 行](C:/Users/Kingla/Cowork/Pages/skills/apple-ios-native-design/references/ui-review-checklist.md:128) 的统一退出条件要求“审查范围内无未解决 P0/P1”。

**触发条件：** 用户只要求审查截图或现有代码，并且审查发现一个真实 P1，如关键操作被遮挡。即使问题已经完整记录，Review 仍不能满足后面的统一退出条件。

**影响：** 入口正确保留了只读边界，但深入加载的执行规则与它冲突。遵守入口的 agent 可能误报任务被阻断；机械执行专题的 agent 可能继续改代码或索要本不需要的修复授权。实际审查任务完全可以完成，同时被审 UI 未通过验收。

**建议最小修复：** 在入口步骤 6、优先级“处理”列和退出条件中明确按模式处理：Review 完成要求发现有证据、影响与建议清楚、未验证项如实记录；可以保留未解决 P0/P1，并明确 UI 验收未通过。只有用户已授权实施或修复的任务，才把修复与复测作为相应交付条件。无需更改严重性等级定义。

**复核场景：** “只审查这张设置截图，不修改任何文件”，图中主按钮被遮挡。期望：报告该问题并完成只读审查，不尝试修复，不称 UI 验收通过，不因未修复而拒绝交付审查结果。

**确定性：高。** 这是同一 skill 内两种完成条件的文字冲突，无需原生运行即可确认；尚未把它升级为实际越权行为证据。

## 发现 2：图表专题把按任务决定的摘要与明细写成统一要求

**位置与原始证据：**

- [charts.md:81](C:/Users/Kingla/Cowork/Pages/skills/apple-ios-native-design/references/charts.md:81) 对小图写“不能把全部点合成一句无具体数值的话”。
- [charts.md:82](C:/Users/Kingla/Cowork/Pages/skills/apple-ios-native-design/references/charts.md:82) 无条件要求“提供可发现的文字摘要和数据明细入口”；后续验收也默认都有这些入口。
- 相比之下，[ui-review-checklist.md:92](C:/Users/Kingla/Cowork/Pages/skills/apple-ios-native-design/references/ui-review-checklist.md:92) 允许通过“可访问描述/数据浏览或合适的等价摘要”获取信息，只有精确取值是核心任务时才明确要求精确值。

**官方核对：** Apple HIG 的 *Enhancing the accessibility of a chart* 按图表目的、mark 范围和密度决定描述单点还是点组，并明确允许某些图表用简洁高层描述，例如按钮内用于进入详细版本的小图。HIG 还以 Maps 路线高程为例说明可以按一段路线概括变化，而不是逐个时点提供海拔。它并未要求每个图表都另建数据明细列表。[HIG Charts](https://developer.apple.com/design/human-interface-guidelines/charts)

**触发条件：** 已有完整详情页中的小型趋势入口，或用户只需理解变化方向、整体地形等关系的摘要图；当前可访问描述已能等价传达该用途。

**影响：** 专题的绝对措辞会覆盖总清单的条件规则，促使 agent 为小图添加不必要的数值播报、额外数据页或新交互，甚至把符合用途的高层摘要误报为无障碍缺陷。这不是反对数据可达性，而是要求按照同一阅读任务判断等价信息。

**建议最小修复：** 将“小图不能……”改为按目的决定单点、分组或高层摘要；对进入详细图的小型入口允许简洁说明。将摘要/数据明细表述为按用途选择并复用已有入口：精确取值是用户任务，或现有系统语义无法提供需要的信息时，确保可发现且可操作的精确值途径；不默认创建独立列表。同步将第 5 节后续验证、第 8 节清单改为“适用的描述、摘要、明细表达同一口径”。

**复核场景：** ① 一个可进入完整趋势页的 sparkline 按钮，只要求改其 VoiceOver 名称；期望不新增列表页。② 月度记账图要求查询每笔或每天准确金额；期望保留精确值的等价入口，不能以一句模糊趋势摘要代替。

**确定性：高。** 专题与总清单的条件不同，且官方正文包含其排除的例外。规则已标为工程判断，所以问题是过度收紧及文档冲突，不是伪造 Apple 原话。

## 已核对且没有问题的部分

| 主题 | 审查结论及依据 |
|---|---|
| 入口触发 | frontmatter 与正文一致覆盖原生 iPhone/iPad 的 Design、Implement、Refine、Review；明确排除后端-only、网页仿 iOS 和仅因 Swift 而误触发。默认提示引用的 skill 名称正确。 |
| 路由 | 入口的全部本地 Markdown 链接能解析；设计推理、组件、页面、视觉、资源、材质、图表、实现和验收均有明确入口。维护评估文件只在维护场景加载。未发现悬空文件或必须靠猜文件名才能进入的核心专题。 |
| HIG/API/工程判断 | 各专题使用不同缩写但都就地说明含义，未发现由命名差异产生的实质冲突。sources.md 的证据列表也明确不是单一高低优先级，避免用 HIG 覆盖 API 的实际行为。 |
| 版本纪律 | 设计资源、SF Symbols 工具、构建 SDK、最低部署版本、运行 OS 被明确区分；核心 Liquid Glass 26 基线与 27 行为也分开。反复提示具体重载和符号版本，避免只用类型版本推导成员可用性。此处为内部一致性结论，未逐个重新验证所有 availability。 |
| 模板证据 | resources-and-symbols.md 与 sources.md 都明确仅确认目录、未读取 Figma 内部变量与全部状态，没有把目录链接冒充完整 token 库或像素测量。当前官方目录确有 iOS/iPadOS 27 UI Kit 与 App Icon Template。[Apple Design Resources](https://developer.apple.com/design/resources/) |
| SF Symbols 时效 | 当前官方页面明确新增符号面向 27 系列系统，四种渲染模式也与 skill 一致。具体 SF Symbols 工具 beta 标签未在本次可读正文中独立确认，因此不对该标签增加通过或错误结论。[SF Symbols](https://developer.apple.com/sf-symbols/) |
| Tab 数量 | “五个以内”在当前 HIG 的可自定义 Tab 默认配置中有对应上下文；skill 没有据此制定全 App 的固定 Tab 数量，也保留避免 More 溢出的建议。[HIG Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) |
| 权限解释页 | 预授权解释页仅一个 Continue/Next、避免 Cancel/Close 的描述确实来自当前 HIG 对该特定页面的建议。skill 已将它与可跳过的一般 onboarding 区分，不应凭个人偏好把这条判成缺陷。[HIG Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy) |
| iOS 27 窗口与侧栏 | 官方 WWDC26 文稿确认 iPhone App 在 iPad 与 Mac 镜像中可调整窗口；UIKit iPhone 侧栏是 App 选择启用、系统按空间显示，且没有 iPad 式 UI 切换。skill 的平台边界表述相符。[Modernize your UIKit app](https://developer.apple.com/videos/play/wwdc2026/278/) |
| 设计原则 | 当前官方课程确实包含 Purpose、Agency、Responsibility、Familiarity、Flexibility、Simplicity、Craft、Delight；skill 明确综合方法不是 Apple 规定的统一流程。[Principles of great design](https://developer.apple.com/videos/play/wwdc2026/250/) |
| Liquid Glass 和定制 | 内部对内容/控制层、regular/clear、普通 Material 与 Glass、系统自动背景、glassEffectID 与 union、语义 Button 与 interactive 效果的区分一致；允许有理由的品牌定制，不把自定义卡片或自定义字体一概判错。本审查未重新执行全部 API 编译验证。 |
| 数据与状态 | 缺失、零、负值、部分周期、单位、分母、折线缺口和统计插值有明确边界；保存策略、退出、重试和草稿也以产品真实能力为前提，没有强制添加虚构离线/恢复功能。 |
| 证据诚实 | 截图、源码、Preview、build、模拟器、真机与 Instruments 的证明范围清楚；Windows 可交付静态审查而不能冒称原生通过的限制一致。 |

## 覆盖和上下文成本

入口为 62 行、3,493 个字符；全部 Markdown 合计 77,386 个字符。最大的单篇是 SwiftUI 映射表，12,826 个字符。若一次普通任务机械加载入口、组件、页面、映射和验收五篇，就会读约 36,935 个字符，因此“按需读取”和小改动仅记录相关决策非常重要。

现有入口已经明确禁止默认全量加载，并要求交付随任务规模缩减；不能仅凭总字数认定上下文效率失败。本次未运行独立 agent 行为采样，不宣称实际每次都能正确少读。维护时应保留现有模块边界，并通过一个小改动场景检查是否真的少读；没有证据支持为了节省上下文重写或拆散全部文档。

这套体系覆盖一般原生页面设计所需的主要决策，并对相机、地图、游戏、Widget、Live Activities 等专业领域明确要求进一步路由。未穷尽所有 HIG/API 不构成当前缺陷；同样，未读取的 Figma 模板内容仍是完整资源内省能力的真实限制，不能包装成已完成。是否需要专项扩展，应由用户具体任务决定。

## 核验范围与保留事项

- 本报告的两项发现基于修改前的具体文句；若主流程后续修正，应追加复核记录，保留这里的原始发现。
- Apple HIG 的普通 HTML 入口部分只返回 JavaScript 壳；本次使用官方可索引正文完成对应事实核对，没有把空壳当正文。
- PowerShell 对 DocC JSON 的读取因 TLS 认证失败而未取得内容；没有降低连接安全设置，也没有据此虚构 API 核验结果。部分 JSON 可被 web 读取，但本审查没有将其扩展成完整 API 基线审计。
- 未执行原生编译、实机或模拟器、辅助技术、Figma 模板内部读取；未比较有无 skill 的真实任务结果。因此本报告不能证明运行质量或稳定的 agent 行为提升幅度。

## 修订后复核（2026-09-15）

主流程修改了 skill，本审查者只复读并追加本报告，以上原始发现保留。

- **发现 1 的核心冲突已解除：** 清单第 9 节现在明确 Review 不授权修改，修复要求只作用于已授权实现；“审查完成”可包含未修复 P0/P1，“UI 验收通过”另设条件。因此只读审查可以正常交付问题报告。首次复核时入口 `SKILL.md:28` 尚保留无条件“先修复”，已建议同源措辞一并限定工作模式。
- **发现 2 的核心冲突已解除：** 图表第 5 节允许按用途、密度选择 mark、分组或高层摘要；明确不强制每张图附独立列表，精确取值任务仍须有等价信息；专项清单同步改为按任务需要的摘要/明细。首次复核时第 83 行仍默认“访问操作与明细”，已建议改为适用的操作与明细，使相邻验收句完全服从新条件。
- 此复核是文字与规则一致性验证，未据此声称两个复核场景已经由独立 agent 实跑或原生辅助技术通过。

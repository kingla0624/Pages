# Swift Charts：从用户问题到可信图表

核验日期：2026-09-14。仅在涉及指标、趋势、比较、分布或图表交互时加载。框架正式名称为 **Swift Charts**，模块为 `Charts`。

证据标签：`[HIG]` 是 Apple 设计建议，`[API]` 是已核验框架能力，`[工程判断]` 是本 skill 的实施与验收规则；后者不冒充 Apple 强制规定。本文未确认任何 iOS 27 独占 Charts 新 API。版本指具体 API 的 iOS 引入基线，不代表所有重载、设备和运行配置均已验证。

## 1. 先判断是否需要图表

- `[HIG]` 用户只需查找精确数据时，先考虑可浏览、搜索或排序的列表；需要理解数据关系时才用图表。总览与详情保持指标含义、颜色和系列身份连续。[Charting data](https://developer.apple.com/design/human-interface-guidelines/charting-data)
- `[工程判断]` 先写一句可回答的问题，例如“本月哪类支出最多”，再选 mark。拒绝以“这里需要一个漂亮的环形图”作为数据需求。
- `[工程判断]` 先交付下列简短数据契约，再写视图；未知字段明确标注，不填造假数据。

```text
用户问题 / 看完后可做的决定：
指标定义 / 计量单位 / 币种 / 分母：
时间范围 / 时区 / 日历 / 聚合粒度 / 聚合方式：
维度与系列 / 排序 / 筛选 / 比较条件：
数据来源 / 更新时间 / 缺失、估算、异常值语义：
主要结论 / 选择后详情 / 等价文字或列表入口：
```

## 2. 问题 → mark 决策树

以下是 `[工程判断]` 的默认选择；mark 能力来自各行的 `[API]` 链接。先选最容易读懂的形式，必要时解释例外。

| 用户真正要知道什么 | 默认表现与原生 mark | 使用条件和边界 |
| --- | --- | --- |
| 哪个类别更多、排名如何 | 横向或纵向 [BarMark](https://developer.apple.com/documentation/charts/barmark) | 长类别名优先横向；总量柱保持零基线；按任务排序，时间不可按数值重排 |
| 随时间如何变化 | [LineMark](https://developer.apple.com/documentation/charts/linemark)，必要时加 PointMark | 有序、可比较的连续序列；明确采样间隔。离散日累计量也可用柱图 |
| 每段时间产生多少量 | BarMark，时间作为真实 Date 值 | 展示区间累计量；明确“每天总量”与“时点余额”的差异 |
| 总体由哪些部分组成 | 堆叠 BarMark；少量非负、互斥分项也可用 [SectorMark](https://developer.apple.com/documentation/charts/sectormark) | 分母必须有意义；需要精确比较时选柱。饼图/环图适合粗略整体构成。[WWDC23](https://developer.apple.com/videos/play/wwdc2023/10037/) |
| 两个数值变量是否有关联 | [PointMark](https://developer.apple.com/documentation/charts/pointmark) 散点 | 两轴定义清楚；点重叠时考虑透明度、分组或分箱；相关不能写成因果 |
| 波动范围、区间、上下界 | [RuleMark](https://developer.apple.com/documentation/charts/rulemark) 区间；连续范围用 [AreaMark](https://developer.apple.com/documentation/charts/areamark) 的上下界 | 区分最小最大、置信区间和预测区间；不要把阴影装饰解释成统计结论 |
| 分布集中在哪里 | 先分箱，再用 BarMark 绘直方图；需要精确记录时附列表 | 分箱属于数据处理责任；标明箱宽，改变箱宽会改变读感 |
| 两个分类维度的强弱分布 | [RectangleMark](https://developer.apple.com/documentation/charts/rectanglemark) 热图 | 提供数值图例及精确值入口；缺失不能与最低值共用同一含义 |
| 与目标、平均值相差多少 | 原图叠加 RuleMark 与明确标签 | 目标来源、时间适用范围、平均计算方式可追溯；辅助线不要伪装成实测序列 |
| 只有一个当前值或进度 | `Text` / `LabeledContent` / `ProgressView` | 不为单个数字制造坐标系。环形进度不是任意多指标的默认模板 |

`[API]` `BarMark` 在同一位置出现多个值时可能自动堆叠；做并排比较时显式定义分组/位置，不能误以为每条柱都会独立显示。`LineMark` 按 series 或样式编码分线；源数据必须按序排列，并按业务语义分系列。[BarMark](https://developer.apple.com/documentation/charts/barmark)、[LineMark](https://developer.apple.com/documentation/charts/linemark)

## 3. 数据真实性与视觉编码

以下均为 `[工程判断]` 的数据审查规则；Swift Charts 会绘图，但不会替产品决定统计口径。

| 检查项 | agent 的具体动作 | 需要阻止的误导 |
| --- | --- | --- |
| 基线 | 编码总量的柱/面积默认从零起；范围条除外。线图若截断纵轴，保留清楚刻度并说明理由 | 截断柱轴夸大差异；线图被一律强制从零起而丢失有效细节 |
| 域与跨图比较 | 同屏同指标比较使用一致单位、定义和可解释的域；切换范围后检查自动缩放 | 相同高度表示不同数量却没有标注；滚动时纵轴跳变制造趋势错觉 |
| 对数尺度 | 仅在倍数关系有意义且目标用户能理解时使用；显示尺度说明，处理零和负值 | 将 log 图当线性图，静默丢弃无法绘制的数据 |
| 时间 | 使用 Date、Calendar、TimeZone 与本地化格式；日/月/年聚合用日历边界 | 把日期字符串当分类导致等距假象；以固定秒数代替自然月或夏令时日 |
| 聚合 | 明确 sum / mean / weighted mean / min-max / last 等；不同长度区间按任务决定是否标准化 | 用每日平均之平均替代整体加权平均；比较半个月与完整月而不提示 |
| 缺失 | 区分无记录、未授权、未同步、测量失败和真实零；折线缺口显式拆成连续片段或另作标识 | 用零填补缺失；过滤 nil 后一根线跨越长时间空档，伪造连续观测 |
| 单点/常量/全零 | 检查自动域与绘制结果，必要时加点、说明或稳定的显示域 | 单点折线看不见；常量显示成数据错误；零值饼图出现无意义圆环 |
| 单位与比例 | 概览、轴、选中值、摘要、朗读使用同一单位口径；百分比写清分母 | 元/万元混用、0–1 与 0–100 混用；“增加 5%”与“增加 5 个百分点”混淆 |
| 精度与异常 | 展示精度与测量能力一致；异常值标识并保持可发现，清洗需记录依据 | 静默裁剪峰值；无来源的小数精度；以美观为理由删除真实记录 |
| 插值与平滑 | 默认忠实于采样；改变插值、滑动平均或下采样时解释方法，保留重要峰值 | 平滑曲线越过真实上下界，产生未经观测的极值；把平滑线当原始值 |
| 部分与整体 | 分项应互斥且总和可解释；显示“其他”的构成入口；无有效总量时用空态 | 对负值、重叠集合、不同分母强行生成饼图 |
| 预测与置信范围 | 实测、估算、预测以标签及线型/形状共同区分，说明范围含义 | 用同样实线把预测接成事实；把区间画法当可靠性证明 |
| 系列与颜色 | 固定“系列身份→样式”映射，变化时保持图例同步；必要时加符号、线型、直接标签 | 排序/筛选后颜色换了含义；仅靠红绿、色深区分状态 |
| 3D | 只有真实三维关系且探索任务受益时再评估 Chart3D；提供二维或文字替代 | 为装饰给收入柱图加透视，导致遮挡和大小判断失真 |

`[HIG]` 数据要比网格和装饰更突出；重要信息不能必须拖动后才出现。标题/简短结论帮助先理解目的；关键描述同时进入可访问体验。[Charts](https://developer.apple.com/design/human-interface-guidelines/charts)

## 4. 交互契约：总览 → 探查 → 明细

1. `[工程判断]` 默认画面回答主要问题，显示范围、单位与当前口径；使用真实派生值生成摘要，无足够数据时不生成趋势断言。
2. `[API]` iOS 17 起优先评估 `chartXSelection(value:)`、`chartYSelection(value:)`、`chartAngleSelection(value:)`。selection 提供绑定值；业务层仍需把选择结果对应到数据点、时间桶或类别。[Selection API](https://developer.apple.com/documentation/swiftui/view/chartxselection(value:))
3. `[工程判断]` 定义取最近点还是所在时间桶、空档选择、边界、手指离开、数据刷新后选中项的行为。选中信息显示完整日期、系列、数值和单位，不只有高亮色。
4. `[API]` 长序列可用 `chartScrollableAxes`、`chartXVisibleDomain`、`chartScrollPosition`；范围切换与滚动位置是独立状态。版本与用法见 [WWDC23](https://developer.apple.com/videos/play/wwdc2023/10037/) 和下表。
5. `[工程判断]` 同时支持页面竖滑、图表横滑和点选时，先验证系统行为，再决定是否自定义 `chartGesture`。不要预先叠加零距离 `DragGesture` 抢走 ScrollView、系统返回或辅助功能手势；如冲突，提供明确模式或按钮式范围/明细入口。
6. `[工程判断]` 系统 range selection 的默认手势可能依平台/系统版本变化；核心操作必须有可发现的等价入口。真机验证 tap、拖动、惯性、长按、手指离开及边缘命中，而非把旧 WWDC 的手势细节当永久契约。
7. `[API]` 自定义覆盖层通过 `ChartProxy` 转换绘图区坐标，不用整张 Chart 的矩形直接计算。iOS 17+ `plotFrame` 为完整绘图区，`plotContainerFrame` 为可见部分；两者都是可选 anchor，需要处理不存在的情况。[ChartProxy](https://developer.apple.com/documentation/charts/chartproxy)
8. `[工程判断]` tooltip/annotation 在左右边缘、大字号、滚动和 sheet 内不能遮住主要数据或被裁切；不能靠关闭整屏裁剪掩盖布局问题。测试 chart 内坐标、可见区与手势局部坐标是否一致。

## 5. 无障碍：系统默认提供什么，产品还负责什么

- `[API]` Swift Charts 默认提供每个 mark 或 mark 组的可访问元素，以及 Audio Graphs；**不是必须从零重建**。先用 VoiceOver 检查当前图表是否表达了真实含义。[HIG：Enhancing the accessibility of a chart](https://developer.apple.com/design/human-interface-guidelines/charts)
- `[API]` Audio Graphs 由 VoiceOver 根据 chart descriptor 把数据呈现为声音。自定义 `Canvas`、图片或其他绘图不会仅因看起来像图表就拥有同等语义；SwiftUI 可通过 `accessibilityChartDescriptor(_:)` 与 `AXChartDescriptorRepresentable` 提供描述。[SwiftUI modifier](https://developer.apple.com/documentation/swiftui/view/accessibilitychartdescriptor(_:))
- `[API]` descriptor 可包含标题、摘要、轴、数据点和系列。需要自定义时用 `AXChartDescriptor`、`AXNumericDataAxisDescriptor` / `AXCategoricalDataAxisDescriptor`、`AXDataSeriesDescriptor`、`AXDataPoint`，并在数据或环境变化时更新。[Representing chart data as an audio graph](https://developer.apple.com/documentation/accessibility/representing-chart-data-as-an-audio-graph)
- `[工程判断]` Audio Graph 不负责验证统计口径、生成可信结论、自动解释缺失/预测，也不等于自动拥有产品需要的列表明细。只有默认语义不足时才覆盖 descriptor，并验证没有丢失原有信息。
- `[工程判断]` 可访问描述使用有意义的日期/类别、系列、值与单位，不只朗读“蓝色柱子”。依据任务与密度决定保留 mark、合理分组或采用高层摘要；密集长序列不必强迫人顺序听完所有点。若精确取值是核心任务，不能用缺少数值的摘要替代全部取值路径。
- `[工程判断]` 按任务提供等价信息：需要理解趋势的小型摘要图，可以由有意义的趋势摘要和相邻指标满足；不强制每张图附独立列表。需要精确读取、比较或下钻时，提供可发现的数据浏览/明细入口及非拖拽操作；iPhone 可用 `List`，宽屏按需要用表格，保持范围、顺序和口径与图表一致。
- `[工程判断]` 验证 VoiceOver 能找到图表、理解名称/摘要、读到任务所需数值、使用适用的 Audio Graph，并访问适用的操作与明细。装饰性手势 overlay 不得变成挡住 mark 的空白可访问元素。

## 6. 视觉、环境与状态

- `[工程判断]` 深浅色分别检查 mark、轴、网格、图例和 tooltip；语义颜色仍需验证重叠、透明度叠加后的对比。
- `[工程判断]` 大字号时先减少轴刻度/重排图例/增加可用高度/切换到明细，保留单位与关键数值；不要缩小全部文字或强行锁定 Dynamic Type。
- `[工程判断]` Respect `accessibilityDifferentiateWithoutColor` 与 `accessibilityReduceMotion`；减少动态时保持选择、范围变化和数据更新仍可理解。避免持续入场动画、跳动坐标轴、全屏联动动画。
- `[工程判断]` 加载、无记录、无权限、同步失败、过期数据分别表达；刷新保留旧数据时标记更新时间。没有数据时不以零图冒充结果。
- `[工程判断]` 图表是内容；不要给每个 mark 加 Liquid Glass，也不要让移动背景改变数据颜色含义。材质用法见 [materials-and-motion.md](materials-and-motion.md)。

## 7. 已核验 API 基线

以下来自 Apple DocC `metadata.platforms`，核验日期均为 2026-09-14；实施时再次核对**实际重载**和项目 SDK。JSON 可由文档路径对应的 `https://developer.apple.com/tutorials/data/documentation/<path>.json` 读取；页面未来变化时以当前官方文档/本地 SDK 为准。

| 能力 | 最低 iOS | 已核验官方入口 |
| --- | --- | --- |
| Chart；Bar/Line/Area/Point/Rule/RectangleMark；ChartProxy | 16.0 | [Chart](https://developer.apple.com/documentation/charts/chart)，各 mark 见决策表 |
| SectorMark | 17.0 | [SectorMark](https://developer.apple.com/documentation/charts/sectormark) |
| X/Y/Angle selection；chartGesture | 17.0 | [chartXSelection](https://developer.apple.com/documentation/swiftui/view/chartxselection(value:))、[chartAngleSelection](https://developer.apple.com/documentation/swiftui/view/chartangleselection(value:))、[chartGesture](https://developer.apple.com/documentation/swiftui/view/chartgesture(_:)) |
| 图表滚动、可见域、X 滚动位置绑定 | 17.0 | [chartScrollableAxes](https://developer.apple.com/documentation/swiftui/view/chartscrollableaxes(_:))、[chartXVisibleDomain](https://developer.apple.com/documentation/swiftui/view/chartxvisibledomain(length:))、[chartScrollPosition](https://developer.apple.com/documentation/swiftui/view/chartscrollposition(x:)) |
| plotFrame / plotContainerFrame | 17.0 | [完整绘图区](https://developer.apple.com/documentation/charts/chartproxy/plotframe)、[可见绘图区](https://developer.apple.com/documentation/charts/chartproxy/plotcontainerframe) |
| 旧 plotAreaFrame | 16.0；17.0 标记弃用并更名为 plotFrame | [旧 API](https://developer.apple.com/documentation/charts/chartproxy/plotareaframe)；不得原样复制旧截图代码用于新基线 |
| 自定义 Audio Graph descriptor 与 SwiftUI 接入 | 15.0 | [AXChartDescriptor](https://developer.apple.com/documentation/accessibility/axchartdescriptor)、[AXChartDescriptorRepresentable](https://developer.apple.com/documentation/swiftui/axchartdescriptorrepresentable) |
| Chart3D | 26.0 | [Chart3D](https://developer.apple.com/documentation/charts/chart3d)；不因可用而默认采用 |

低版本策略：iOS 16 保留核心 Chart；选择需求可在充分验证后使用 ChartProxy/overlay，或提供列表明细。iOS 16 以下先检查项目既有图表/列表方案，不能为本 skill 自动安装库或把 Chart 无保护写入目标。

## 8. 图表专项验收

- [ ] 主要问题可在默认视图回答；读者知道时间范围、单位、聚合方式和数据更新时间。
- [ ] 数值对照源数据正确，零、负值、缺失、单点、常量、异常值与局部周期均有明确处理。
- [ ] 轴/基线/排序/系列/图例/下采样未改变数据含义；跨图/跨期比较条件清晰。
- [ ] selection 与真实记录一致；滚动、返回、sheet、页面手势和非触摸入口均可用。
- [ ] 窄屏、横屏、深浅色、大字号、文字变长时，轴、图例与 annotation 不丢关键信息。
- [ ] VoiceOver、Audio Graph 与按任务需要提供的摘要/明细表达一致口径；精确取值需求可满足，缺失和预测不会被当成事实朗读。
- [ ] 初始加载、刷新、无记录、错误、未授权和数据过期已验证；频繁选择/大数据量未引起可见卡顿。
- [ ] 记录运行系统、设备/模拟器、证据和未验证项；编译成功不等于数据正确或无障碍通过。总验收见 [ui-review-checklist.md](ui-review-checklist.md)。

进一步研究只在相应任务需要时打开：[Design an effective chart](https://developer.apple.com/videos/play/wwdc2022/110340/)、[Design app experiences with charts](https://developer.apple.com/videos/play/wwdc2022/110342/)、[Audio graphs](https://developer.apple.com/documentation/accessibility/audio-graphs)。

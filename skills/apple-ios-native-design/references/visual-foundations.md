# 视觉基础、品牌与文案

适用：决定页面层级、布局、文字、颜色和产品表达。**HIG** 表示官方建议；下面将建议转成设计步骤和验收情境的部分属于 **Skill**。具体参数按组件、内容和目标系统核对，不建立所谓通用 Apple 数值表。

## 布局先表达信息关系

1. 将页面内容按用户任务排序：当前位置与对象、主要内容、核心操作、辅助信息。不是所有页面都需要营销标题、摘要卡和主按钮。
2. 通过共同对齐、邻近关系、分组及适当留白表达关系；容器边框和阴影只在确实需要区分层级时使用。
3. 优先使用系统容器的边距、安全区和栏位行为；在原生运行结果中判断密度，再调整产品专属布局。
4. 先按可用空间与内容选择单列/多列、水平/垂直排列；同时考虑文字缩放和键盘。设备名与屏幕物理尺寸不是布局约束的替代品。

上述是对 [HIG Layout](https://developer.apple.com/design/human-interface-guidelines/layout) 的执行化应用。iOS 27 的具体窗口适配限制见 [组件决策](component-decisions.md)。

| 视觉选择 | 使用条件 | 检查方式 |
|---|---|---|
| Edge-to-edge 背景或媒体 | 内容希望延展到边缘 | 控件、正文与滚动终点仍可访问；安全区没有硬编码 |
| 大标题 | 帮助识别当前层级且适合内容结构 | 滚动后标题/栏位过渡自然；避免重复导航标题和正文巨型标题 |
| 分组列表/表单 | 同类信息或关联设置 | 分组有语义，标题解释对象，不为凑视觉切碎任务 |
| 卡片 | 对象可独立理解/操作，确需形成组 | 卡片内部层级清楚；整卡是否可点与内部按钮无歧义 |
| 网格 | 图片/对象视觉识别重要 | 列数随空间和文字改变；选中状态及阅读次序清楚 |
| 密集布局 | 高频专业信息需要并排比较 | 仍可读、可操作、能放大；不能为了“简洁”隐去必要标签 |

这些条件是 Skill 的设计判断，卡片或自定义布局本身不是反模式。

## 排版：角色优先于像素

**HIG**：使用内建文字样式有助于层级与 Dynamic Type；自定义字体仍要满足可读性和辅助功能。系统字体通过系统 API 使用，不把下载的 SF 字体作为常规 App 运行时依赖。[Typography](https://developer.apple.com/design/human-interface-guidelines/typography)

| 内容角色 | SwiftUI 起点 | 设计检查 |
|---|---|---|
| 页面标题 | 原生 navigation title；内容标题视情境用 `.title` / `.title2` | 导航标题与内容标题是否重复 |
| 分组或重要对象名称 | `.headline` 或适当标题样式 | 不只靠颜色区分重要性 |
| 可阅读的正文/输入 | `.body` | 多行、大字和较长翻译保持完整含义 |
| 补充说明 | `.subheadline` / `.callout` / `.footnote` | 是辅助层级，不是通过极淡颜色隐藏必要信息 |
| 紧凑标注 | `.caption` / `.caption2`，视实际可读性选择 | 不承担唯一的关键操作或结论 |
| 会变化的数值 | 合适的语义字体；必要时 `.monospacedDigit()` | 数值宽度稳定、单位/精度/符号明确 |
| 品牌标题 | 合法可用的自定义字体，按对应语义样式缩放 | 字体缺失、Bold Text、中文/其他文字回退都可读 |

映射是设计起点，不是 Apple 对所有角色的唯一指定值。系统字体会按语言和环境选择合适字形；不要为了“Apple 感”强制给中文文本绑定拉丁字体文件。

**API**：自定义字体可使用 `Font.custom(_:size:relativeTo:)` 按语义样式缩放。`@ScaledMetric` 可用于需要随文字增长的尺寸；不要把整张画布按同一比例放大。代码和具体可用性见 [映射表](swiftui-mapping.md)。[Applying custom fonts](https://developer.apple.com/documentation/swiftui/applying-custom-fonts-to-text)

**Skill 验收**：文字增大时先允许多行与重排，必要时减少列数或改成垂直结构。不要用固定高度、全局缩小字体、普遍截断或限制 Dynamic Type 范围来掩盖布局问题。确实受空间约束的摘要可以截断，但完整内容应能被访问。

## 颜色：让功能语义稳定

**HIG**：语义系统色随外观与环境适配；避免硬编码系统色值或借用错误角色。自定义色要分别考虑浅色、深色和提高对比度，颜色不能成为唯一的信息载体。[Color](https://developer.apple.com/design/human-interface-guidelines/color)

| 角色 | 实现起点 | 避免 |
|---|---|---|
| 主/次要文本 | `.primary` / `.secondary` foreground style | 白底黑字固定配对，或极低透明度正文 |
| 分组内容背景 | 容器默认，或对应动态 `UIColor` 的 `Color` | 将 `Color.white` 宣称为系统分组背景 |
| 交互与重点 | 系统强调色或产品 `tint` | 所有控件都填同样的高饱和颜色 |
| 语义状态 | 明确文字/符号配合颜色 | 只有红绿表示失败/成功；忽视市场语义差异 |
| 图表序列 | 稳定的分类映射，必要时标记/线型/直接标签 | 筛选后同一序列换色，或颜色无法区分 |

不要从某张截图吸取一个 RGB 值就命名为“iOS 27 官方色”。透明材质上的实际对比取决于背后的内容与系统设置，需要运行验证。[材质与动效](materials-and-motion.md)

## 品牌表达与形状

**HIG** 允许有辨识度的颜色、字体与定制组件，同时要求可理解、熟悉的行为。当前品牌指导倾向克制使用控件强调色，并在内容中表达品牌。[Branding](https://developer.apple.com/design/human-interface-guidelines/branding)

**Skill**：先写出产品希望带来的感受与使用场景，再决定视觉表达。例如内容阅读强调长时间舒适，编辑工具强调精确与控制；不能给所有产品套同一套渐变、大圆角卡片与玻璃。

设计 token 的记录方式：

```text
角色：例如“内容分组间距”，而非“Apple标准间距”。
来源：系统默认 / 已检查的指定版本组件 / 本产品自定义。
适用：哪些页面、控件、内容密度与窗口范围。
行为：Dynamic Type / 外观 / 紧凑空间变化。
验证：原生预览、实际内容与交互证据。
```

优先使用控件自身的形状；自定义嵌套形状要检查边距与曲率的视觉关系，不能在不同大小容器上盲目复用相同圆角。iOS 27 设计模板的使用边界见 [资源与图标](resources-and-symbols.md)。

## 界面文案是交互的一部分

**HIG / 官方课程**：命名影响人们对目的地和操作结果的预期；文案应适合界面、语言和上下文。[Writing](https://developer.apple.com/design/human-interface-guidelines/writing)、[WWDC26 命名课程](https://developer.apple.com/videos/play/wwdc2026/290/)

**Skill 决策**：

- Tab 与分区名称表达目的地；动作名称表达会发生的事，明确“保存”“删除账目”等实际行为。
- Back、Cancel、Done、Save 的含义取决于流程与保存模型，不为了统一视觉把它们全部替换为“完成”。
- 错误说明应包含用户可理解的状态与恢复方法；不要显示内部异常作为唯一说明，也不要承诺系统并未提供的恢复能力。
- 空状态解释当前情境并给相关下一步；无搜索结果和首次没有内容是两个不同情境。
- 保留必要标签、单位和范围；placeholder 不应承担输入字段唯一且永久的名称。
- 日期、金额、数字和复数使用本地化格式；用真实长文本检查，避免拼接固定英文词序。

## 来源与核验

核验：2026-09-14；HIG 正文通过官方页面的可索引内容读取。未从设计模板内部提取字体/间距 token。

- [Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Color](https://developer.apple.com/design/human-interface-guidelines/color)
- [Branding](https://developer.apple.com/design/human-interface-guidelines/branding)（页面记录 2026-09-09 更新品牌色指导）
- [Writing](https://developer.apple.com/design/human-interface-guidelines/writing)
- [Applying custom fonts to text](https://developer.apple.com/documentation/swiftui/applying-custom-fonts-to-text)
- [Communicate your brand identity on iOS](https://developer.apple.com/videos/play/wwdc2026/251/)
- [Craft clear names for features and labels](https://developer.apple.com/videos/play/wwdc2026/290/)

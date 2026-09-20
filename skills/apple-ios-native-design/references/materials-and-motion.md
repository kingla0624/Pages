# 材质、Liquid Glass、动效与触觉

核验日期：2026-09-14。面向 iOS；iPadOS 行为按项目支持范围补充核验。

本文标记：**[A-API]** 官方 API 条件；**[A-HIG]** Apple 设计指导；**[S]** 本 skill 的工程决策与验收规则。HIG 指导不等同于 App Store 拒审规则。

## 1. 先划分层级，再选择材质

**[A-HIG]** Liquid Glass 用于浮于内容之上的导航与控制层；内容层采用系统背景、普通材质或产品自己的内容表达。系统 Slider、Toggle 等内容内控件在交互时出现玻璃效果属于官方说明的例外。[Materials](https://developer.apple.com/design/human-interface-guidelines/materials)

**[S]** 对计划加材质的每个区域填写：`用户任务 → 层级 → 是否系统组件 → 背景内容 → 可读性风险 → 材质选择`。

| 场景 | 先采用 | 需要额外论证的情况 |
|---|---|---|
| 顶部导航、Tab bar、Toolbar | 相应系统容器的默认外观 | 替换整个容器、盖上自定义背景 |
| 图片、视频、地图上持续可用的操作 | 系统控制；必要时自定义浮动控制 | 透明控制叠在高亮、变化剧烈的内容上 |
| 列表、设置、正文、图表绘图区 | 语义背景、分组、分隔或合适的标准 Material | 为每张内容卡片加玻璃、描边和多层阴影 |
| 临时自定义工具组 | 先确认系统 Toolbar/Menu 无法表达；再评估玻璃控制 | 仅为展示变形动画而拆散操作 |
| 品牌内容和插画 | 自由表达，同时保留信息层级 | 把装饰误画成可点击控制 |

普通 `.blur(...)` 或 `.background(.ultraThinMaterial)` 不等同于 Liquid Glass：标准 Material 仍有自己的用途；不要用相似截图声称实现了系统的折射、交互反馈和适配。[Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/liquid-glass)

## 2. 版本与系统自动外观

| 边界 | agent 必须记录的事实 |
|---|---|
| iOS 26 引入的设计/API | `Glass`、`glassEffect`、`GlassEffectContainer`、玻璃 ButtonStyle 等属于这一代能力；具体符号、重载和平台 availability 以当前 SDK 为准 |
| 现有 App 首次采用新设计 | 检查构建 SDK、运行 OS、系统组件使用方式、兼容设置及覆盖背景；不要只因为代码写了 SwiftUI 就声称已经采用 |
| iOS 27 外观细化 | WWDC26 说明：已采用 Liquid Glass 的 App 在新的 OS 上可获得材质细化，并响应系统 Liquid Glass 外观滑块；这不代表所有 27 新 API 自动可用 |
| 最低支持 OS 小于 API 要求 | 用可用性分支或保留既有系统样式；旧系统回退必须能完成同一任务，无需伪造相同光学效果 |
| 资源模板与运行系统 | iOS 27 Design Resources 用于设计参照；模板版本不是项目 deployment target，也不能证明当前 SDK 为正式版 |

来源：[Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)、[SwiftUI updates](https://developer.apple.com/documentation/updates/swiftui)、[WWDC26 Platforms State of the Union](https://developer.apple.com/videos/play/wwdc2026/102/)、[Design Resources](https://developer.apple.com/design/resources/)。

截至核验时，Apple 的 [What’s new](https://developer.apple.com/whats-new/) 仍展示 Xcode 27 beta；不要从日历推断正式发布状态。实施时重新检查安装的 Xcode/SDK、目标 OS build 和 [27 Release Notes](https://developer.apple.com/documentation/ios-ipados-release-notes/ios-ipados-27-release-notes)。

**[S]** 首次迁移顺序：先用当前 SDK 构建观察系统默认 → 定位与新外观冲突的自定义层 → 逐项移除或调整 → 再判断是否缺少真正需要自定义的控制。保留品牌所需内容；不要无理由重写整个页面。

## 3. `regular` / `clear` 决策

**[A-HIG]** `regular` 优先保障复杂背景上的文字与控制可读性；`clear` 用于需要让照片、视频等富媒体保持突出地位的控制。两者外观可能受系统及辅助功能设置影响。[Materials](https://developer.apple.com/design/human-interface-guidelines/materials)

```text
是系统组件已有的材质？
├─ 是 → 保留系统选择；先检查容器/自定义覆盖。
└─ 否 → 这个区域是否有导航/控制的明确职能？
         ├─ 否 → 选内容背景或标准 Material。
         └─ 是 → 控制是否浮在视觉丰富的照片/视频上？
                  ├─ 否 → 从 regular 开始。
                  └─ 是 → clear 是否能持续保证标签可读？
                           ├─ 尚无证据 → regular；记录 clear 待验证。
                           └─ 是 → 可评估 clear，检查明亮帧和动态背景。
```

**[S]** 选择 clear 不是“越透明越高级”。测试媒体的高亮帧、阴影帧、字幕和明暗快速切换；需要压暗时先确认播放器是否已经提供，避免重复压暗。HIG 给出的压暗示例是情境建议，不是全 App 必须写死的透明度参数。[clear](https://developer.apple.com/documentation/swiftui/glass/clear)

## 4. 自定义 SwiftUI 实现协议

下列是实现决策，不是一段应复制到所有 App 的组件模板。

1. **语义先行 [S]**：操作使用 `Button`，状态输入使用对应 Control；`.interactive()` 只配置玻璃响应，不会把 `Text` 或 `Image` 变成具有操作和辅助功能语义的按钮。
2. **优先系统样式 [A-API]**：需要玻璃按钮时评估 `.buttonStyle(.glass)` 或 `.glassProminent`；普通内容按钮无需全面改用玻璃样式。[SwiftUI updates](https://developer.apple.com/documentation/updates/swiftui)
3. **修饰器顺序 [A-API]**：先设置构成效果捕获内容的字体、尺寸、内边距等外观，再 `.glassEffect(...)`；如需身份与过渡，再接对应修饰器。不要把此规则误写成任何 modifier 都只能放在玻璃之前。[Applying Liquid Glass to custom views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views)
4. **局部协调 [A-API]**：多个相关玻璃视图用 `GlassEffectContainer` 协调渲染与融合。其 spacing 是效果融合的距离条件，不是替代 `HStack` / `VStack` 的布局间距；静止时无意粘连应检查两者关系。[GlassEffectContainer](https://developer.apple.com/documentation/swiftui/glasseffectcontainer)
5. **身份稳定 [A-API/S]**：`glassEffectID(_:in:)` 用于容器内效果的过渡身份；同一 namespace 内按逻辑效果使用稳定、唯一标识。不要每次 body 求值生成 UUID，或让无关的同时可见效果共享 ID。
6. **区分联合与身份 [A-API]**：`glassEffectUnion(id:namespace:)` 表达要组成同一个玻璃形体的效果组；这与过渡身份不是同一概念。只有真实工具分组需要联合，不为了动画给所有控件一个 ID。
7. **过渡有因果 [A-API/S]**：先记录展开前后操作关系，再决定 matched geometry 或 materialize 等效果；`glassEffectID` / transition 只在层级变化或动画时生效，不会凭空产生合理交互。[Applying Liquid Glass to custom views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views)
8. **避免双重装饰 [S]**：系统已提供背景的工具栏、Sheet、Popover 或按钮，不再外包同效果；发现玻璃叠玻璃时先检查父容器，而非用更多阴影补救。
9. **性能证据 [S]**：大量效果、容器碎片、频繁布局变化可能昂贵；先限制在有意义的可见控制，再以滚动和过渡记录验证，有问题时用 Instruments 定位，不臆测固定容器数量上限。

**[S]** 实现片段交付时注明：`适用 SDK / 最低 OS / 语义组件 / 修饰器顺序 / 状态和 ID / a11y 降级 / 已验证范围`。本资料不把文档示例视为已在当前项目编译通过的代码。

## 5. 品牌、颜色与形状的空间

**[A-HIG]** 品牌可以通过内容、配色、字体、图形与交互细节表达，同时保留系统导航的熟悉感。系统化不要求所有 App 都像“设置”。[WWDC26 Communicate your brand identity on iOS](https://developer.apple.com/videos/play/wwdc2026/251/)

**[S]** 给颜色分配含义：主操作、选择状态、破坏性操作、数据系列、品牌内容。先比较内容本身是否已经鲜艳，再选控制标签与 tint；不要把全部工具栏按钮染成同样醒目的玻璃底色，也不制定“品牌色只能出现一次”的虚构规则。

**[A-HIG]** 自定义颜色需考虑浅色、深色及增强对比度；信息不能只靠颜色表达。彩色背景上控制标签应保持可区分，控制的默认停留位置也需要可读。[Color](https://developer.apple.com/design/human-interface-guidelines/color)

**[S]** 圆角、内边距和形状先来自系统组件与容器关系；更大的自定义工具组不必硬套 Capsule。不要从设计资源截一处圆角，推广成所有设备、Sheet、卡片和按钮的常数。

## 6. 动效的设计推理

**[A-HIG]** 动效应表达状态、反馈或空间关系，保持简洁、允许继续操作；频繁操作已有的系统反馈通常足够。不要只用运动传递重要信息。[Motion](https://developer.apple.com/design/human-interface-guidelines/motion)

**[S]** 每个自定义动效填写一行：

`触发事件 | 用户要理解的变化 | 起点/终点 | 可否中断 | 重复触发策略 | Reduce Motion 替代 | 证据`。

| 变化 | 优先选择 | 避免 |
|---|---|---|
| 进入详情、关闭临时任务 | 系统导航/呈现过渡 | 与手势方向冲突的自定义飞入飞出 |
| 展开相关工具 | 有稳定身份和来源关系的局部过渡 | 大范围无关控件同时变形 |
| 保存、添加、选择完成 | 简短反馈并保留最终状态 | 强制等待庆祝动画结束 |
| 长任务 | 真实进度或明确的不确定进度 | 装饰动画假装接近完成 |
| SF Symbol 状态变化 | 语义合适、目标 OS 可用的符号效果 | 所有图标永久 bounce / pulse |

**[S]** 不预设所有动画必须相同时长或同一种 spring。系统组件由系统控制；自定义动画在真实任务频率下验证响应、中断和重入。性能验收来自实际轨迹，而不是任意“始终 120 fps”承诺。[Improving rendering efficiency](https://developer.apple.com/documentation/xcode/improving-your-app-s-rendering-efficiency)

## 7. 辅助功能与触觉

| 用户偏好 / 输入 | 实现与验收 |
|---|---|
| Reduce Motion | 读取 `accessibilityReduceMotion` 处理自定义运动；减少大幅缩放、视差、旋转，保留状态反馈，可采用简化过渡。不是一律清除所有动画 |
| Reduce Transparency | 系统材质先采用其自动适配；自定义半透明背景读取 `accessibilityReduceTransparency`，提供不透明或足够分离的背景 |
| Increase Contrast | 使用语义样式或资产变体；自定义逻辑读取 `colorSchemeContrast`，同时检查 `colorScheme`，不要硬编码假定玻璃永远浅色 |
| 仅触摸可操作的自定义控制 | 补充 VoiceOver 的目的、当前值、操作和结果反馈；需要时提供可访问的替代动作 |
| 用户关闭触觉 / 硬件不支持 | 同一任务和结果仍可感知；不通过触觉是否发出来决定保存成功 |

来源：[Reduced Motion evaluation criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria/)、[accessibilityReduceTransparency](https://developer.apple.com/documentation/swiftui/environmentvalues/accessibilityreducetransparency)、[colorSchemeContrast](https://developer.apple.com/documentation/swiftui/environmentvalues/colorschemecontrast)、[WWDC26 Refine accessibility for custom controls](https://developer.apple.com/videos/play/wwdc2026/220/)。

**[A-HIG]** 触觉应符合系统模式的语义、与动作保持因果关系、作为其他反馈的补充，避免滥用并允许关闭。系统控件可能已提供触觉，添加自定义反馈前先确认。[Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)

**[S]** `sensoryFeedback` 等只在 availability 和硬件适用范围内采用；在真实支持设备上评估时机、重复触发和与声音/画面的协调。模拟器或截图不能证明触觉效果良好。[Controls and indicators](https://developer.apple.com/documentation/swiftui/controls-and-indicators)

## 8. 交付前短检查

- [ ] 每处自定义玻璃都能说清楚控制职能，内容层有明确层级。
- [ ] 已记录 SDK / OS；26 回退与 27 外观偏好没有混为一谈。
- [ ] regular / clear 的选择有背景与可读性证据。
- [ ] 自定义控制有语义，效果 ID、联合 ID 和布局间距各司其职。
- [ ] 深色、文字放大、降低透明度和减少动态效果后仍可完成任务。
- [ ] 重复、取消、打断和快速返回时状态正确；真机触觉仍未测试则明说。

完整测试矩阵、优先级与证据模板见 [UI Review Checklist](ui-review-checklist.md)。

# DESIGN.md — 了然（Liaoran）APP 设计令牌

> 基于 Cal（Soft Warm 主调）+ Notion（Editorial Monocle 辅调）定制融合
> 覆盖场景：日常浏览、测评数据、AI 对话、危机预警

---

## 1. Visual Theme（视觉主题）

**Philosophy**: 先读懂再放过——像一本懂你的手账，温暖但不腻，专业但不冷
**Direction**: Soft Warm 主调 + Editorial Monocle 辅调（温暖底色 × 清晰骨架）
**Personality**: 安全、清晰、被理解、自驱、顿悟感
**Reference**: Cal（温暖生活感）× Notion（专业信息架构）× Headspace（心理领域参考）

### 品牌视觉语言

了然的视觉语言是温暖的、清晰的、有呼吸感的。它通过暖米色底色和圆角卡片传达"安全与被理解"，用克制的排版层级和精确的信息骨架建立"专业可信"，用珊瑚橘的渐变微光和薄荷绿的点睛营造"顿悟与释然"。最具辨识度的特征是"雾散光来"的视觉隐喻——从模糊灰蓝到清晰暖白的色彩叙事。生成时应避免医疗冷色调、过度可爱化的圆角、纯黑白的高对比数据展示，始终保持"生活化心理助手"的核心气质。

### 场景视觉策略

| 场景 | 视觉策略 | 主调来源 |
|------|---------|---------|
| 首页/树洞/我的 | Soft Warm 全开：暖底色、大圆角、柔和阴影 | Cal |
| 测评执行/报告 | Soft Warm 底 + Editorial 骨架：清晰层级、精确间距 | Notion |
| AI 对话 | Soft Warm + 微暖化编辑感：对话气泡圆角、温暖底色 | Cal + Notion 融合 |
| 危机预警 | 保留暖底色 + 升级信息层级：深琥珀色替代纯红 | 定制 |

---

## 2. Color Palette（调色板）

### 品牌主色

| Token | HEX | OKLCh | Usage |
|-------|-----|-------|-------|
| --color-primary | #E8835A | oklch(68% 0.12 40) | 主CTA、活跃Tab、品牌标识 |
| --color-primary-hover | #D4724B | oklch(62% 0.11 40) | 主色悬停态 |
| --color-primary-light | #FDF0EB | oklch(96% 0.02 40) | 主色浅底、选中态背景 |
| --color-primary-soft | #F5C4AD | oklch(82% 0.07 40) | 次级强调、标签背景 |

### 品牌辅色

| Token | HEX | OKLCh | Usage |
|-------|-----|-------|-------|
| --color-secondary | #6BAF9E | oklch(70% 0.08 170) | 辅助CTA、成功提示、积极情绪 |
| --color-secondary-hover | #5A9D8C | oklch(65% 0.07 170) | 辅色悬停态 |
| --color-secondary-light | #EDF7F4 | oklch(97% 0.01 170) | 辅色浅底、积极状态背景 |

### 中性色

| Token | HEX | Usage |
|-------|-----|-------|
| --color-bg | #FAF8F5 | 页面底色（暖米白） |
| --color-surface | #FFFFFF | 卡片/浮层背景 |
| --color-surface-warm | #F7F4F0 | 二级容器、分区背景 |
| --color-border | #E8E2DB | 分隔线、边框（暖灰） |
| --color-border-light | #F0EBE5 | 轻量分隔 |
| --color-text-primary | #2D2A26 | 标题、正文主色（暖黑） |
| --color-text-secondary | #7A746C | 副标题、说明文字 |
| --color-text-tertiary | #A69E94 | 占位符、禁用态 |
| --color-text-inverse | #FFFFFF | 深色背景上的文字 |

### 语义色

| Token | HEX | Usage |
|-------|-----|-------|
| --color-success | #5BA88D | 完成提示、积极结果 |
| --color-success-bg | #EDF7F4 | 成功状态背景 |
| --color-warning | #D4943A | 提醒、注意（温和非焦虑） |
| --color-warning-bg | #FDF5EC | 警告状态背景 |
| --color-danger | #C75C5C | 错误、破坏性操作（柔和不刺激） |
| --color-danger-bg | #FDF0F0 | 危险状态背景 |
| --color-info | #6B8EC7 | 信息提示、引导 |
| --color-info-bg | #EFF4FB | 信息状态背景 |

### 危机场景专用色

| Token | HEX | Usage |
|-------|-----|-------|
| --color-crisis | #B8652A | 危机预警强调色（深琥珀而非纯红，传递"需要关注"而非"恐惧"） |
| --color-crisis-bg | #FFF5EB | 危机场景背景 |
| --color-crisis-text | #6B3A15 | 危机场景文字 |
| --color-crisis-border | #E8A45C | 危机场景边框 |

### 测评场景专用色

| Token | HEX | Usage |
|-------|-----|-------|
| --color-assess-progress | #E8835A | 测评进度条（品牌主色） |
| --color-assess-complete | #6BAF9E | 测评完成（品牌辅色） |
| --color-chart-1 | #E8835A | 图表色1 |
| --color-chart-2 | #6BAF9E | 图表色2 |
| --color-chart-3 | #7AAED6 | 图表色3（柔和蓝） |
| --color-chart-4 | #D4943A | 图表色4（暖琥珀） |
| --color-chart-5 | #B08DB9 | 图表色5（柔薰衣草） |

### 对话场景专用色

| Token | HEX | Usage |
|-------|-----|-------|
| --color-chat-user-bg | #FDF0EB | 用户消息气泡背景 |
| --color-chat-user-text | #2D2A26 | 用户消息文字 |
| --color-chat-ai-bg | #FFFFFF | AI消息气泡背景 |
| --color-chat-ai-text | #2D2A26 | AI消息文字 |
| --color-chat-ai-border | #E8E2DB | AI消息气泡边框 |
| --color-chat-input-bg | #F7F4F0 | 输入框背景 |

### 渐变

| Token | CSS | Usage |
|-------|-----|-------|
| --gradient-hero | linear-gradient(165deg, #FAF8F5 0%, #FDF0EB 50%, #EDF7F4 100%) | 首页Hero区 |
| --gradient-warm | linear-gradient(135deg, #FDF0EB 0%, #F7F4F0 100%) | 温暖氛围卡片 |
| --gradient-crisis | linear-gradient(180deg, #FFF5EB 0%, #FAF8F5 100%) | 危机场景背景 |

---

## 3. Typography（排版）

### Font Stacks

- **Heading**: `"Noto Sans SC"`, `"PingFang SC"`, `"Hiragino Sans GB"`, `"Microsoft YaHei"`, `system-ui`, `-apple-system`, `sans-serif`
- **Body**: `"Noto Sans SC"`, `"PingFang SC"`, `"Hiragino Sans GB"`, `"Microsoft YaHei"`, `system-ui`, `-apple-system`, `sans-serif`
- **Mono/数据**: `"JetBrains Mono"`, `"SF Mono"`, `"Fira Code"`, `monospace`

> 字体策略：中文优先 Noto Sans SC（圆润友好），西文数字场景用系统字体，数据密集场景用等宽字体提升专业感

### 移动端字号层级

| Level | Size | Weight | Line-height | Letter-spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| H1 | 24px / 1.5rem | 700 | 1.3 | -0.01em | 页面主标题 |
| H2 | 20px / 1.25rem | 600 | 1.35 | 0 | 区块标题 |
| H3 | 17px / 1.0625rem | 600 | 1.4 | 0 | 子区块标题 |
| Body | 15px / 0.9375rem | 400 | 1.6 | 0 | 正文段落 |
| Body-sm | 14px / 0.875rem | 400 | 1.5 | 0 | 辅助说明、列表项 |
| Caption | 12px / 0.75rem | 400 | 1.5 | 0.01em | 标签、时间戳 |
| Micro | 11px / 0.6875rem | 500 | 1.4 | 0.02em | Badge、角标 |
| Data | 32px / 2rem | 700 | 1.1 | -0.02em | 大数字展示（测评分数等） |
| Data-sm | 20px / 1.25rem | 600 | 1.2 | -0.01em | 中等数据展示 |

### 字重规范

| Weight | Value | Usage |
|--------|-------|-------|
| Regular | 400 | 正文、说明文字 |
| Medium | 500 | 强调、按钮文字、Tab标签 |
| Semibold | 600 | 小标题、卡片标题 |
| Bold | 700 | 页面标题、数据展示 |

---

## 4. Component Styles（组件样式）

### Button

**Primary（主操作）**:
- Background: var(--color-primary)  →  #E8835A
- Text: #FFFFFF
- Border-radius: 12px
- Padding: 14px 24px（高48px）
- Font: 15px / 500
- Hover: background var(--color-primary-hover) → #D4724B，微上移 1px
- Active: background #C06140，微下移 1px
- Disabled: background #E8E2DB，text #A69E94

**Secondary（次操作）**:
- Background: transparent
- Text: var(--color-primary) → #E8835A
- Border: 1.5px solid var(--color-primary) → #E8835A
- Border-radius: 12px
- Padding: 13px 24px（高48px）
- Hover: background var(--color-primary-light) → #FDF0EB

**Ghost（轻操作）**:
- Background: transparent
- Text: var(--color-text-secondary) → #7A746C
- Border: none
- Padding: 8px 12px
- Hover: background var(--color-surface-warm) → #F7F4F0

**Small（标签/快捷）**:
- Height: 32px
- Padding: 6px 14px
- Border-radius: 8px
- Font: 13px / 500

### Card

**Standard Card（通用卡片）**:
- Background: var(--color-surface) → #FFFFFF
- Border: 1px solid var(--color-border) → #E8E2DB
- Border-radius: 16px
- Padding: 16px
- Shadow: 0 1px 3px rgba(45, 42, 38, 0.04)

**Warm Card（温暖卡片 - 首页/树洞）**:
- Background: var(--color-surface-warm) → #F7F4F0
- Border: none
- Border-radius: 20px
- Padding: 20px
- Shadow: none

**Assessment Card（测评卡片）**:
- Background: var(--color-surface) → #FFFFFF
- Border: 1px solid var(--color-border) → #E8E2DB
- Border-radius: 16px
- Padding: 16px
- Shadow: 0 2px 8px rgba(45, 42, 38, 0.06)
- 左侧色条: 3px solid var(--color-primary)

**Crisis Card（危机卡片 - 特殊）**:
- Background: var(--color-crisis-bg) → #FFF5EB
- Border: 1.5px solid var(--color-crisis-border) → #E8A45C
- Border-radius: 16px
- Padding: 16px
- 左侧色条: 4px solid var(--color-crisis) → #B8652A
- 注意：圆角保留温暖感，但左侧加粗色条传递"需要关注"

### Input

**Standard Input**:
- Height: 48px
- Background: var(--color-surface) → #FFFFFF
- Border: 1px solid var(--color-border) → #E8E2DB
- Border-radius: 12px
- Padding: 0 16px
- Font: 15px / 400
- Placeholder color: var(--color-text-tertiary) → #A69E94
- Focus: border-color var(--color-primary) → #E8835A，ring: 0 0 0 3px rgba(232, 131, 90, 0.15)

**Chat Input（对话输入框）**:
- Min-height: 44px，max-height: 120px（自适应）
- Background: var(--color-chat-input-bg) → #F7F4F0
- Border: 1px solid var(--color-border) → #E8E2DB
- Border-radius: 22px（药丸形）
- Padding: 10px 48px 10px 18px
- Focus: border-color var(--color-primary) → #E8835A

**Scale Input（量表选择项）**:
- Height: 48px
- Border-radius: 10px
- Selected: background var(--color-primary-light) → #FDF0EB，border 1.5px solid var(--color-primary) → #E8835A
- Unselected: background var(--color-surface) → #FFFFFF，border 1px solid var(--color-border) → #E8E2DB

### Navigation

**Bottom Tab Bar**:
- Type: 底部Tab栏（5个Tab）
- Height: 56px + 安全区（iOS: 34px，Android: 0px，HarmonyOS: 0px）
- Background: var(--color-surface) → #FFFFFF
- Border-top: 0.5px solid var(--color-border-light) → #F0EBE5
- Active indicator: 图标填充色 var(--color-primary) → #E8835A，标签 Medium 500
- Inactive: 图标 outline 色 var(--color-text-tertiary) → #A69E94，标签 Regular 400
- Font: 10px / Caption

**Top App Bar**:
- Height: 44px + 安全区
- Background: var(--color-bg) → #FAF8F5
- Title: H2 / 20px / 600
- Action icons: 24×24，color var(--color-text-secondary)

### Chat Bubble（对话气泡）

**User Bubble**:
- Background: var(--color-chat-user-bg) → #FDF0EB
- Text: var(--color-chat-user-text) → #2D2A26
- Border-radius: 18px 18px 4px 18px（右下角微收，暗示"我说的"）
- Padding: 12px 16px
- Max-width: 75%

**AI Bubble**:
- Background: var(--color-chat-ai-bg) → #FFFFFF
- Text: var(--color-chat-ai-text) → #2D2A26
- Border: 1px solid var(--color-chat-ai-border) → #E8E2DB
- Border-radius: 18px 18px 18px 4px（左下角微收，暗示"回应"）
- Padding: 12px 16px
- Max-width: 85%

### Progress Bar（测评进度条）

- Height: 6px
- Background: var(--color-border-light) → #F0EBE5
- Fill: var(--color-assess-progress) → #E8835A
- Border-radius: 3px（全圆角）
- 动画: fill 300ms ease-out

### Tag/Badge

**Tag**:
- Height: 28px
- Padding: 4px 12px
- Border-radius: 14px（药丸形）
- Font: 12px / 500 / Caption

**Badge**:
- Size: 18×18
- Border-radius: 9px（圆形）
- Font: 11px / 500 / Micro
- Background: var(--color-primary) → #E8835A

---

## 5. Layout（布局）

### 移动端栅格

- Container width: 100vw
- Content padding: 20px（左右内边距）
- Gutter: 12px（卡片间）
- Max content width: 428px（iPhone 14 Pro Max）

### Spacing Scale（间距体系）

| Token | Value | Usage |
|-------|-------|-------|
| --space-3xs | 2px | 图标与文字间距 |
| --space-2xs | 4px | 紧凑内间距 |
| --space-xs | 8px | 标签间距、列表项内间距 |
| --space-sm | 12px | 卡片内元素间距 |
| --space-md | 16px | 默认间距、卡片内padding |
| --space-lg | 20px | 区块间距、页面水平padding |
| --space-xl | 24px | 大区块间距 |
| --space-2xl | 32px | 区块间分隔 |
| --space-3xl | 48px | 页面级分隔 |
| --space-4xl | 64px | 特大分隔（极少使用） |

### 页面结构间距

| 区域 | Padding/Margin |
|------|---------------|
| 页面顶到内容 | 16px（有App Bar时） |
| 页面底到内容 | 24px（Tab Bar上方） |
| 区块标题到内容 | 12px |
| 区块到区块 | 24px |
| 卡片到卡片 | 12px |
| 列表项到列表项 | 8px |

### 安全区域

| 平台 | 顶部安全区 | 底部安全区 |
|------|-----------|-----------|
| iOS | 44px | 34px |
| Android | 24px（状态栏） | 0px |
| HarmonyOS | 24px（状态栏） | 0px |

---

## 6. Depth & Elevation（深度与层级）

### 阴影层级

| Level | Shadow | Usage |
|-------|--------|-------|
| Flat | none | 默认表面、列表项 |
| Subtle | 0 1px 2px rgba(45, 42, 38, 0.04) | 卡片静止态 |
| Raised | 0 2px 8px rgba(45, 42, 38, 0.06) | 卡片悬停、下拉菜单 |
| Floating | 0 4px 16px rgba(45, 42, 38, 0.08) | 模态弹窗、Toast |
| Overlay | 0 8px 32px rgba(45, 42, 38, 0.12) | 全屏覆盖层、危机弹窗 |

> 所有阴影使用暖色调（rgba 基于暖黑 #2D2A26），避免冷灰阴影带来的冰冷感

### Z-index Scale

| Token | Value | Usage |
|-------|-------|-------|
| --z-base | 0 | 页面内容 |
| --z-sticky | 100 | 吸顶App Bar、Tab Bar |
| --z-dropdown | 200 | 下拉菜单、Picker |
| --z-sticky-element | 300 | 吸底操作栏 |
| --z-modal | 400 | 模态弹窗、对话框 |
| --z-popover | 500 | 气泡提示 |
| --z-toast | 600 | Toast通知 |
| --z-crisis | 700 | 危机预警弹窗（最高层级） |

### 圆角规范

| Token | Value | Usage |
|-------|-------|-------|
| --radius-sm | 8px | 小按钮、Badge |
| --radius-md | 12px | 输入框、普通按钮 |
| --radius-lg | 16px | 卡片 |
| --radius-xl | 20px | 大卡片、温暖卡片 |
| --radius-2xl | 24px | 底部弹窗顶部 |
| --radius-full | 9999px | 药丸形、圆形 |

### 动效规范

| 类型 | 时长 | 缓动 | Usage |
|------|------|------|-------|
| 微交互 | 150ms | ease-out | 按钮按下、Tab切换 |
| 标准过渡 | 250ms | ease-in-out | 页面切换、卡片展开 |
| 强调动画 | 400ms | cubic-bezier(0.34, 1.56, 0.64, 1) | 弹出提示、进度完成 |
| 氛围动画 | 600-1200ms | ease-in-out | 渐变呼吸、背景微动 |

---

## 7. Cautions（注意事项）

### Never Do（绝对禁止）

1. **禁止医疗化视觉**：不使用白色+蓝色的医疗配色（#0077CC + #FFFFFF），不使用十字/心电图/脑电波等医疗符号
2. **禁止纯红色危机提示**：危机预警绝不用 #FF0000 或 #E53E3E，这会制造恐慌；使用深琥珀色 #B8652A
3. **禁止纯黑白数据展示**：测评报告不用纯黑 #000 + 纯白 #FFF 的高对比组合，这过于冰冷；使用暖黑 #2D2A26 + 暖白 #FAF8F5
4. **禁止过度可爱化**：不使用圆体字、夸张的大圆角（>24px用于非底部弹窗）、大量emoji装饰、卡通吉祥物
5. **禁止冷灰色系**：不使用蓝灰色 #64748B、纯灰色 #94A3B8 作为中性色，改用暖灰 #7A746C / #A69E94
6. **禁止标签化表达**：UI文案不用"患者""症状""诊断""异常"等医疗标签，用"探索""发现""关注""特别提醒"
7. **禁止荧光/霓虹色**：不用荧光绿、电光蓝等高饱和度颜色，所有色彩饱和度控制在 0.18 以内

### Prefer（推荐替代）

1. **用生活化隐喻替代医疗符号**：用"雾→光""模糊→清晰"替代"诊断→治疗"
2. **用暖色渐变替代纯色块**：卡片背景优先用渐变而非纯色，营造呼吸感
3. **用深琥珀替代纯红做警告**：危机场景用 #B8652A（温暖但严肃）替代 #E53E3E（冰冷且恐慌）
4. **用暖底色替代纯白**：页面底色用 #FAF8F5（暖米白）而非 #FFFFFF（纯白）
5. **用圆角+暖阴影替代硬边**：卡片用 16px 圆角 + 暖调阴影，而非直角 + 冷灰阴影
6. **用分段+进度可视化替代长表单**：量表测评拆分为3-5题一组，每组间有进度条和"休息一下"提示

---

## 8. Responsive Behavior（响应式行为）

### 三端适配策略

| 平台 | 底部安全区 | 返回按钮 | 导航交互 | 字体缩放 |
|------|-----------|---------|---------|---------|
| iOS | 34px Home Indicator | 左滑返回 | 原生Tab切换 | Dynamic Type 适配 |
| Android | 系统导航栏 | 系统返回手势 | 原生Tab切换 | 系统字体缩放适配 |
| HarmonyOS | 系统导航栏 | 系统返回手势 | 原生Tab切换 | 系统字体缩放适配 |

### 断点定义

| Name | Width | Behavior |
|------|-------|----------|
| SE/Mini | 375px | 紧凑布局，卡片padding减至14px |
| Standard | 390px | 基准尺寸，所有规范以此为准 |
| Plus/Max | 428px | 加宽布局，可展示更多信息列 |
| Fold Outer | 600px+ | 折叠屏展开态，双列布局 |

### 适配规则

1. **字体缩放**：支持系统最大1.5倍缩放，超过1.5倍时截断并提示"建议使用标准字体大小"
2. **横屏处理**：对话场景支持横屏（双栏：对话列表 + 当前对话），其他场景锁定竖屏
3. **折叠屏**：展开态使用双列布局（首页：推荐 + 快捷入口；测评：列表 + 简介）
4. **深色模式**：暂不支持，优先保证浅色模式的视觉一致性；预留CSS变量便于后期扩展

### 测评场景特殊适配

| 阶段 | 交互 | 适配重点 |
|------|------|---------|
| 量表列表 | 分类浏览 | 大点击区域（最小48×48），分类标签可横滑 |
| 测评执行 | 逐题作答 | 进度条常驻顶部，选项卡片式而非radio，支持手势左滑下一题 |
| 分段休息 | 每8-10题 | 鼓励文案 + 深呼吸动画 + "继续"/"稍后完成"双选择 |
| 测评报告 | 结果展示 | 数据用图表+文字双通道，关键数字用 Data 字号突出 |

---

## 9. Agent Prompt Guide（Agent 生成指南）

### Key Instructions

1. **色彩安全线**：所有页面底色必须使用 --color-bg（#FAF8F5），绝不用纯白 #FFFFFF 做页面底色
2. **温暖骨架**：所有中性色（边框、文字、阴影）必须使用暖灰色系，不用冷灰/蓝灰
3. **圆角一致**：同一层级元素圆角必须统一，不混用 8px 和 16px
4. **危机场景隔离**：危机预警页面必须使用 --color-crisis 系列色值，不用 --color-danger
5. **对话气泡区分**：用户气泡用珊瑚浅底（#FDF0EB），AI气泡用白底+边框，不混用
6. **数据展示专业感**：测评报告的数据区域用等宽字体、对齐数字、清晰图表，但底色仍保持暖调
7. **间距呼吸感**：卡片间距不小于12px，区块间距不小于24px，避免信息压迫感
8. **三端兼容**：底部安全区通过 Flutter SafeArea 处理，不硬编码像素值
9. **树洞匿名信号**：树洞相关UI使用面具/遮罩图标 + "匿名安全"文案标签 + 暖底色，传递安全匿名感
10. **测评疲劳防控**：量表超过10题必须分段，进度条常驻，每段结束有休息提示

### Quick CSS Snippet

```css
:root {
  /* 品牌主色 */
  --color-primary: #E8835A;
  --color-primary-hover: #D4724B;
  --color-primary-light: #FDF0EB;
  --color-primary-soft: #F5C4AD;

  /* 品牌辅色 */
  --color-secondary: #6BAF9E;
  --color-secondary-hover: #5A9D8C;
  --color-secondary-light: #EDF7F4;

  /* 中性色 */
  --color-bg: #FAF8F5;
  --color-surface: #FFFFFF;
  --color-surface-warm: #F7F4F0;
  --color-border: #E8E2DB;
  --color-border-light: #F0EBE5;
  --color-text-primary: #2D2A26;
  --color-text-secondary: #7A746C;
  --color-text-tertiary: #A69E94;
  --color-text-inverse: #FFFFFF;

  /* 语义色 */
  --color-success: #5BA88D;
  --color-success-bg: #EDF7F4;
  --color-warning: #D4943A;
  --color-warning-bg: #FDF5EC;
  --color-danger: #C75C5C;
  --color-danger-bg: #FDF0F0;
  --color-info: #6B8EC7;
  --color-info-bg: #EFF4FB;

  /* 危机场景 */
  --color-crisis: #B8652A;
  --color-crisis-bg: #FFF5EB;
  --color-crisis-text: #6B3A15;
  --color-crisis-border: #E8A45C;

  /* 间距 */
  --space-3xs: 2px;
  --space-2xs: 4px;
  --space-xs: 8px;
  --space-sm: 12px;
  --space-md: 16px;
  --space-lg: 20px;
  --space-xl: 24px;
  --space-2xl: 32px;
  --space-3xl: 48px;
  --space-4xl: 64px;

  /* 圆角 */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 24px;
  --radius-full: 9999px;

  /* 阴影 */
  --shadow-subtle: 0 1px 2px rgba(45, 42, 38, 0.04);
  --shadow-raised: 0 2px 8px rgba(45, 42, 38, 0.06);
  --shadow-floating: 0 4px 16px rgba(45, 42, 38, 0.08);
  --shadow-overlay: 0 8px 32px rgba(45, 42, 38, 0.12);

  /* Z-index */
  --z-base: 0;
  --z-sticky: 100;
  --z-dropdown: 200;
  --z-sticky-element: 300;
  --z-modal: 400;
  --z-popover: 500;
  --z-toast: 600;
  --z-crisis: 700;

  /* 字体 */
  --font-heading: "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, -apple-system, sans-serif;
  --font-body: "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", "SF Mono", "Fira Code", monospace;

  /* 动效 */
  --duration-micro: 150ms;
  --duration-standard: 250ms;
  --duration-emphasis: 400ms;
  --ease-out: ease-out;
  --ease-in-out: ease-in-out;
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---
title: ClipBook 用户手册
date: 2026-02-05
tags:
  - clipbook
  - documentation
aliases:
  - ClipBook 帮助
  - ClipBook 指南
---

# ClipBook 用户手册

ClipBook 让你可以将 API 密钥、令牌和可重用的文本片段存储在 Obsidian 笔记中，并提供紧凑的界面以便一键复制。

## 快速开始

在任意笔记中创建一个使用 `clipbook` 语言的围栏代码块：

````
```clipbook
[OpenAI]
API Key = !sk-proj-abc123def456
Org ID = org-xyz789
```
````

切换到 **阅读视图** —— 你将看到一个紧凑的、结构化的面板，并带有复制按钮。

## 语法参考

### 键值对

每行遵循 `Key = Value`（键 = 值）的格式：

````
```clipbook
Username = octocat
Email = user@example.com
```
````

**Key（键）** 是显示在左侧的标签。**Value（值）** 是点击复制按钮时复制的内容。

> [!tip] 包含 `=` 符号的值
> ClipBook 仅在 **第一个** `=` 处进行分割。像 `host=db;port=5432` 这样的连接字符串可以正常工作：
> ```
> Connection = host=db;port=5432;user=admin
> ```
> 键：`Connection`，值：`host=db;port=5432;user=admin`

### 分组（Sections）

使用 `[Section Name]` 标题将相关条目分组：

````
```clipbook
[AWS Production]
Access Key = !AKIA1234EXAMPLE
Secret Key = !wJalrXUtnFEMI/K7MDENG
Region = us-east-1

[AWS Staging]
Access Key = !AKIA5678STAGING
Secret Key = !xYzAbCdEfGhIjKlMnOp
Region = ap-northeast-1
```
````

任何出现在 `[Section]` 标题 **之前** 的条目在渲染时不会有分组标签 —— 这对于不需要分组的简单列表很有用。

### 隐藏敏感值（Masking）

在值的前面加上 `!` 即可将其隐藏（掩码）：

````
```clipbook
API Key = !sk-proj-abc123def456ghi789
Region = us-east-1
```
````

| 你输入的内容 | 你看到的内容 | 复制的内容 |
| -------------- | ------------ | ---------------- |
| `Key = !sk-proj-abc123def456ghi789` | `sk-···i789` | `sk-proj-abc123def456ghi789` |
| `Key = us-east-1` | `us-east-1` | `us-east-1` |

**根据值长度的掩码规则：**

| 长度 | 显示方式 | 示例 |
| ------ | ------- | ------- |
| >10 字符 | 前 3 个 + `···` + 后 4 个 | `sk-···f456` |
| 4-10 字符 | 前 2 个 + `···` | `us···` |
| 1-3 字符 | `···` | `···` |

> [!info] 掩码仅用于视觉显示
> 值以纯文本形式存储在笔记中。掩码仅在阅读视图中隐藏它们，以防被人窥视，但这 **不是加密**。

### 注释

以 `#` 或 `;` 开头的行将被忽略：

````
```clipbook
# 生产环境凭证 — 上次轮换时间 2026-01-15
[Stripe]
Publishable Key = pk_live_abc123
Secret Key = !sk_live_xyz789

; TODO: 下个月轮换这些
[Twilio]
Account SID = !AC1234567890abcdef
Auth Token = !abcdef1234567890
```
````

### 空行

空行会被忽略，可以随意用于在视觉上组织代码块。

## 交互

### 复制

点击任意行上的复制按钮（剪贴板图标）。图标会短暂变为 **对号** (✓) 以确复制成功。

> [!warning] 如果复制失败
> 在某些设备上，剪贴板访问可能受限。ClipBook 将显示通知：“Failed to copy to clipboard.”（复制到剪贴板失败）。

### 显示隐藏值

**点击或轻触** 被掩码的值（例如 `sk-···f456`）以显示完整文本。再次点击或轻触可重新隐藏。

这在桌面端和移动端都有效 —— 无需悬停。

### 键盘导航

所有交互元素都支持键盘导航：

| 按键 | 动作 |
| --- | ------ |
| `Tab` | 在值和复制按钮之间移动焦点 |
| `Enter` 或 `Space` | 切换显示隐藏值，或触发复制 |

## 示例

### 简单 — 只有几个键，没有分组

````
```clipbook
GitHub PAT = !ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
npm Token = !npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Docker Hub = !dkr_pat_xxxxxxxxxxxxxxxxxxxxx
```
````

### 结构化 — 多个服务

````
```clipbook
[OpenAI]
API Key = !sk-proj-abc123def456
Organization = org-xyz789
Model = gpt-4

[Anthropic]
API Key = !sk-ant-abc123def456
Model = claude-sonnet-4-5-20250929

[Database]
Host = db.example.com
Port = 5432
Username = app_user
Password = !s3cureP@ssw0rd
Connection = postgresql://app_user:s3cureP@ssw0rd@db.example.com:5432/mydb
```
````

### 混合 — 密钥和非密钥

````
```clipbook
# 项目配置 — 可以分享
Project ID = proj_12345
Region = us-central1
Environment = production

# 凭证 — 需要保密
[Credentials]
Service Account = !eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9
API Key = !AIzaSyB4xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
````

## 提示

> [!tip] 在任何笔记中使用
> ClipBook 可以在 **任何笔记** 中工作，只要它包含 ` ```clipbook ` 代码块。你可以在单个笔记中放置多个代码块，或者将它们分散在不同的笔记中。

> [!tip] 无需插件也可工作
> 如果你在没有安装 ClipBook 的设备上打开你的库，该代码块将显示为普通的围栏代码块 —— 仍然可读，只是没有 UI 界面。

> [!tip] 开发模式下的监听
> 如果你正在为 ClipBook 贡献代码，运行 `npm run dev` 以进行自动重新构建。然后只需重新加载 Obsidian (Ctrl/Cmd+R) 即可看到更改。

## 已知限制

- **仅视觉掩码** — 不是加密。值在笔记中以及渲染时的内存中都是纯文本。
- **仅限单行值** — 不支持多行值（如 SSH 密钥、证书、JSON）。每个条目必须是一行。
- **无法原地编辑** — 要修改值，请切换到源码/编辑模式并编辑原始文本。
- **无搜索或过滤** — 对于大型代码块，请在编辑模式下使用 Obsidian 的内置搜索 (Ctrl/Cmd+F)。
- **无设置** — 掩码阈值和反馈时间在 v0.1 中是固定的。

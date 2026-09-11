# CJK Bold Fix（中文加粗修复）

> **补丁版 fork** — [English](README.md) · [中文](README.zh-CN.md)
>
> 本仓库是 [ebibibi/obsidian-cjk-bold-fix](https://github.com/ebibibi/obsidian-cjk-bold-fix) 的维护型 fork，额外修复了一个问题：**中英混排段落中，纯英文加粗现在可以正确显示**。同一修复已提交给上游，见 [PR #3](https://github.com/ebibibi/obsidian-cjk-bold-fix/pull/3)。

一个 [Obsidian](https://obsidian.md) 插件，用于修复实时预览（Live Preview）模式下中文（中日韩）加粗 `**粗体**` 与斜体 `*斜体*` 的渲染问题。

## 本 fork 的差异

**v1.0.1-patch1** 修复了"同一行同时含中文加粗与英文加粗"的场景：

```markdown
**大文件与文本文件要分开处理。**PDF、PPT 直接进版本库。大文件走**Git LFS**。
```

- **修复前**：只有 `大文件与文本文件要分开处理。` 显示加粗——`Git LFS` 被压回正常字重。
- **修复后**：**两处都正确显示加粗**。

**根因**：插件收集"正确加粗"时，只接受**匹配内容本身含中文/全角标点**的匹配（`isCJKRelated(inner)`）。`**Git LFS**` 这类纯英文内容被直接跳过；当解析器因 CommonMark flanking 问题把整行误判为加粗时，插件的"纠正网"（第 3 阶段）把整行除第一处中文加粗外的内容全部压回正常字重，英文加粗被一并误伤。

**修复方式**：把判定条件放宽为"匹配内容含中文 **或整行含中文**"（`isCJKRelated(inner) && isCJKRelated(lineText)`），加粗、斜体、加粗+斜体三处正则循环同步修改。纯英文段落行为完全不变——整行无中文时仍按原逻辑跳过。

补丁提交见：[c865664](https://github.com/redzhx/obsidian-cjk-bold-fix/commit/c865664)

## 配套 CSS 片段（修复颜色染色）

插件只修复字重（是否加粗）。如果你的主题会给加粗文字上**颜色**（如 AnuPpuccin），误判的整行也会被染成加粗色——因为主题对任何 `.cm-strong` 区间都会上色。添加下面的 CSS 片段，即可让误判部分恢复正文颜色，同时保留真加粗的主题色：

```css
/* ① 插件标记的"误判加粗"部分：恢复正文颜色 */
.markdown-source-view.is-live-preview .cm-cjk-fix-override {
  color: var(--text-normal) !important;
}

/* ② 解析器漏判、由插件补上的真加粗：保留主题加粗色 */
.markdown-source-view.is-live-preview .cm-cjk-strong,
.markdown-source-view.is-live-preview .cm-cjk-strong-em {
  color: var(--bold-color, var(--text-accent)) !important;
}
```

**启用步骤**：

1. 打开库目录 → 进入 `.obsidian/snippets/` 文件夹。
2. 新建文件 `live-preview-bold-normal-color.css`，粘贴上面两条规则。
3. Obsidian → 设置 → 外观 → **CSS 代码片段** → 点刷新图标 → 打开开关（片段热加载，无需重启）。

> 注意：此方案依赖插件保持开启——`.cm-cjk-fix-override` / `.cm-cjk-strong` 是插件运行时打的类。

## 问题背景

Obsidian 的实时预览（编辑模式）使用 CodeMirror 6，遵循 CommonMark 规范的强调语法解析。规范的"左侧翼/右侧翼（left/right-flanking）"规则按英文空格分隔的习惯设计，当 CJK 字符紧贴强调标记时判定会出错。

### 出错示例

```markdown
は、**知識があれば**です。       ← 不显示为加粗
**テスト。**テスト              ← 不显示为加粗
これは**重要な**テキストです     ← 不显示为加粗
```

> **注意**：阅读模式渲染正常——问题只影响实时预览（编辑模式）。

这是 [CommonMark 已知问题（#650）](https://github.com/commonmark/commonmark-spec/issues/650)，235+ 条评论，7 年未解决。

## 工作原理

插件注册了一个 CodeMirror 6 ViewPlugin，分 4 个阶段工作：

1. **收集解析器强调** — 读取 HyperMD 语法树，找出解析器应用了加粗/斜体的位置
2. **找出正确强调** — 按行用正则判断 `**...**`、`*...*`、`***...***` 含中文内容的模式实际应在哪里
3. **纠正错误强调** — 对解析器误加粗的区间应用 `font-weight: normal`
4. **补上正确强调** — 对解析器漏判的加粗/斜体补样式，并隐藏 `**`/`*` 标记

## 安装方式

### 通过 BRAT 安装（本 fork 推荐）

本 fork 未上架官方社区插件列表，更新走 [BRAT](https://github.com/TfTHacker/obsidian42-brat)（Obsidian42 - BRAT）：

1. 在社区插件市场安装并启用 **BRAT**。
2. 命令面板 → `BRAT: Add a beta plugin for testing` → 粘贴 `https://github.com/redzhx/obsidian-cjk-bold-fix` → Add。
3. 按提示启用 **CJK Bold Fix**。

安装后插件更新完全来自本 fork 的 Release，**不会再被上游版本覆盖**（上游版本缺少混排修复）。

### 手动安装

1. 从 [最新 Release](https://github.com/redzhx/obsidian-cjk-bold-fix/releases) 下载 `main.js` 和 `manifest.json`
2. 在库的 `.obsidian/plugins/` 目录下创建 `cjk-bold-fix` 文件夹
3. 把两个文件复制进去
4. 在 Obsidian 设置中启用插件

### 官方社区市场（仅上游版）

在 Obsidian 社区插件市场搜索 "CJK Bold Fix"——安装的是**上游版本**，不含混排修复。仅在你不需要该修复时使用。

## 支持语言

- 日语（平假名、片假名、汉字）
- 中文（简体 & 繁体）
- 韩语（谚文）

## 技术细节

- **方案**：ViewPlugin + Decoration（无 monkey-patching、无内部 API 依赖）
- **性能**：只处理可见区域，仅在文档/视口/选区变化时重建
- **兼容性**：只使用官方 Obsidian 插件 API（`registerEditorExtension`）
- **强调类型**：加粗（`**`）、斜体（`*`）、加粗+斜体（`***`）

## 维护本 fork

上游发布新版本后：

```bash
./cjk-bold-fix-maintain.sh
```

脚本（仓库根目录，需可执行权限）会自动：拉取上游 → rebase → 重打 3 行补丁（幂等）→ 重新构建 `main.js` → 验证。之后更新 `manifest.json` 版本号、推送，并带上 `main.js` + `manifest.json` 创建新 Release。详见脚本内注释。

## 相关链接

- [CommonMark Issue #650](https://github.com/commonmark/commonmark-spec/issues/650) — 上游规范问题
- [Obsidian 论坛讨论](https://forum.obsidian.md/t/parsers-problems-with-bold-italic-highlight-markers-and-whitespaces-and-punctuation-marks/105107)
- [markdown-cjk-friendly](https://github.com/tats-u/markdown-cjk-friendly) — 面向多种解析器的规范级修复
- [上游 PR #3](https://github.com/ebibibi/obsidian-cjk-bold-fix/pull/3) — 本 fork 提交给上游的修复

## 协议与致谢

MIT。原插件作者 [ebibibi](https://github.com/ebibibi)——本 fork 仅增加混排修复与文档。

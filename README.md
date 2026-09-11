# CJK Bold Fix

> **Patched fork** — [English](README.md) · [中文](README.zh-CN.md)
>
> This is a maintained fork of [ebibibi/obsidian-cjk-bold-fix](https://github.com/ebibibi/obsidian-cjk-bold-fix) with one additional fix: **pure-English emphasis inside mixed CJK lines now renders correctly**. The same fix has been submitted upstream as [PR #3](https://github.com/ebibibi/obsidian-cjk-bold-fix/pull/3).

An [Obsidian](https://obsidian.md) plugin that fixes **bold** and *italic* rendering for CJK (Chinese, Japanese, Korean) text in Live Preview mode.

## What's different in this fork

**v1.0.1-patch1** adds a fix for lines that contain both CJK and English emphasis:

```markdown
**重要提示。**后面的正文需要正常显示，其中**GitHub**需要加粗。
```

- **Before**: only `重要提示。` renders bold — `GitHub` is flattened to normal weight.
- **After**: **both** render bold correctly.

**Root cause**: the plugin collects "correct" emphasis matches only when the matched content itself is CJK-related (`isCJKRelated(inner)`). Pure-English emphasis such as `**GitHub**` is skipped, so when the parser mis-parses the whole line as bold (CommonMark flanking issue), Phase 3's override range flattens the English bold along with the rest of the line.

**Fix**: accept a match when either the inner content **or the whole line** is CJK-related (`isCJKRelated(inner) && isCJKRelated(lineText)`), applied to all three regex loops (bold, italic, bold+italic). Pure-English lines are unaffected — no CJK in the line means matches are still skipped, exactly as upstream behaves.

See the patch commit: [c865664](https://github.com/redzhx/obsidian-cjk-bold-fix/commit/c865664)

## Companion CSS snippet (fix the color bleed)

The plugin itself fixes font **weight**. If your theme styles bold text with a custom **color** (e.g. AnuPpuccin), the mis-parsed line will also be colored as bold — because the theme colors any `.cm-strong` range. Add this CSS snippet to restore normal text color for the mis-parsed parts while keeping the accent color on genuinely bold text:

```css
/* ① Mis-parsed (overridden) parts: restore normal text color */
.markdown-source-view.is-live-preview .cm-cjk-fix-override {
  color: var(--text-normal) !important;
}

/* ② Genuine bold added by the plugin: keep the theme's bold color */
.markdown-source-view.is-live-preview .cm-cjk-strong,
.markdown-source-view.is-live-preview .cm-cjk-strong-em {
  color: var(--bold-color, var(--text-accent)) !important;
}
```

**How to enable it**:

1. Open your vault → `.obsidian/snippets/` folder.
2. Create `live-preview-bold-normal-color.css` and paste the rules above.
3. Obsidian → Settings → Appearance → **CSS snippets** → click the refresh icon → toggle the snippet on (hot-reloads, no restart needed).

> Requires the plugin to be enabled — the `.cm-cjk-fix-override` / `.cm-cjk-strong` classes are added by this plugin at runtime.

## The Problem

Obsidian's Live Preview (editing mode) uses CodeMirror 6, which follows the CommonMark specification for emphasis parsing. The CommonMark spec's "left-flanking" and "right-flanking" delimiter run rules were designed for space-separated languages like English and break when CJK characters appear adjacent to emphasis markers.

### Examples of broken patterns

```markdown
は、**知識があれば**です。       ← Doesn't render as bold
**テスト。**テスト              ← Doesn't render as bold
これは**重要な**テキストです     ← Doesn't render as bold
```

> **Note**: Reading mode (preview) renders correctly — the bug only affects Live Preview (editing mode).

This is a [known CommonMark issue (#650)](https://github.com/commonmark/commonmark-spec/issues/650) with 235+ comments, unresolved for 7+ years.

## How It Works

The plugin registers a CodeMirror 6 ViewPlugin that operates in 4 phases:

1. **Collect parser emphasis** — Reads HyperMD syntax tree to find where the parser applied bold/italic
2. **Find correct emphasis** — Uses per-line regex to determine where `**...**`, `*...*`, and `***...***` patterns with CJK content should actually be
3. **Override wrong emphasis** — Applies `font-weight: normal` to ranges the parser incorrectly bolded
4. **Apply correct emphasis** — Adds bold/italic styling and hides `**`/`*` markers where the parser missed

## Installation

### Via BRAT (recommended for this fork)

This fork is not published to the official community plugin list, so updates go through [BRAT](https://github.com/TfTHacker/obsidian42-brat) (Obsidian42 - BRAT):

1. Install and enable **BRAT** from the Community Plugins browser.
2. Command Palette → `BRAT: Add a beta plugin for testing` → paste `https://github.com/redzhx/obsidian-cjk-bold-fix` → Add.
3. Enable **CJK Bold Fix** when prompted.

Once installed via BRAT, plugin updates are pulled from this fork's releases — they will **never** be overwritten by the upstream version (which lacks the mixed-line fix).

### Manual Installation

1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/redzhx/obsidian-cjk-bold-fix/releases)
2. Create a folder `cjk-bold-fix` in your vault's `.obsidian/plugins/` directory
3. Copy the files into that folder
4. Enable the plugin in Obsidian's settings

### From Community Plugins (upstream only)

Search for "CJK Bold Fix" in Obsidian's Community Plugins browser — this installs the **upstream** version without the mixed-line fix. Use this only if you don't need the fix.

## Supported Languages

- Japanese (Hiragana, Katakana, Kanji)
- Chinese (Simplified & Traditional)
- Korean (Hangul)

## Technical Details

- **Approach**: ViewPlugin + Decoration (no monkey-patching, no internal API dependencies)
- **Performance**: Only processes visible ranges, rebuilds only on document/viewport/selection changes
- **Compatibility**: Uses only official Obsidian plugin APIs (`registerEditorExtension`)
- **Emphasis types**: Bold (`**`), italic (`*`), and bold+italic (`***`)

## Maintaining this fork

When upstream publishes a new version:

```bash
./cjk-bold-fix-maintain.sh
```

This script (in the repo root, made executable) fetches upstream, rebases, re-applies the 3-line patch (idempotent), rebuilds `main.js`, and verifies it. Then bump the version in `manifest.json`, push, and create a new release with `main.js` + `manifest.json` attached. See the script for details.

## Related

- [CommonMark Issue #650](https://github.com/commonmark/commonmark-spec/issues/650) — The upstream specification issue
- [Obsidian Forum Discussion](https://forum.obsidian.md/t/parsers-problems-with-bold-italic-highlight-markers-and-whitespaces-and-punctuation-marks/105107)
- [markdown-cjk-friendly](https://github.com/tats-u/markdown-cjk-friendly) — Spec-level fix for various parsers
- [Upstream PR #3](https://github.com/ebibibi/obsidian-cjk-bold-fix/pull/3) — this fork's fix submitted upstream

## License & Credits

MIT. Original plugin by [ebibibi](https://github.com/ebibibi) — this fork only adds the mixed-line patch and documentation.

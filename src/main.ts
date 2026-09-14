import { Plugin, Editor } from "obsidian";
import { cjkEmphasisExtension } from "./extension";

/**
 * CJK-safe bold toggle (character-based, immune to the syntax-tree
 * mis-parse of `**中文**`). Handles: wrap / unwrap / strip markers /
 * empty-selection wordAt / bold-typing mode.
 */
function cjkSafeToggleBold(editor: Editor): boolean {
	let from = editor.getCursor("from");
	let to = editor.getCursor("to");
	let empty = from.line === to.line && from.ch === to.ch;

	// Empty selection: prefer the word under the cursor (same as core toggle-bold)
	if (empty) {
		const w = editor.wordAt ? editor.wordAt(from) : null;
		if (w) {
			from = w.from;
			to = w.to;
			empty = false;
		}
	}

	const sel = editor.getRange(from, to);

	const apply = (fn: () => void) => {
		// Batch into one undo stop when the editor supports transaction()
		if (typeof (editor as any).transaction === "function") {
			(editor as any).transaction(fn);
		} else {
			fn();
		}
	};

	// 1) Selection is fully inside a **...** pair (single line) → unwrap that pair.
	//    Regex over the whole line: ordinary text sandwiched between two bold
	//    spans (e.g. the "乙" in **甲**乙**丙**) is NOT inside any pair and gets
	//    wrapped below, instead of wrongly unwrapping the neighbouring bold.
	if (!empty && from.line === to.line) {
		const lineText = editor.getLine(from.line);
		const pairRe = /\*\*(.+?)\*\*/g;
		let m: RegExpExecArray | null;
		while ((m = pairRe.exec(lineText)) !== null) {
			const cFrom = m.index + 2;
			const cTo = m.index + m[0].length - 2;
			if (from.ch >= cFrom && to.ch <= cTo) {
				const unwrapped = lineText.slice(cFrom, cTo);
				// Capture match positions outside the closure (TS narrowing)
				const mk = m.index;
				const mkEnd = m.index + m[0].length;
				apply(() => {
					editor.replaceRange(unwrapped, { line: from.line, ch: mk }, { line: from.line, ch: mkEnd });
					editor.setSelection({ line: from.line, ch: mk }, { line: from.line, ch: mk + cTo - cFrom });
				});
				return true;
			}
		}
	}
	// 2) Selection includes the ** markers → strip them
	if (sel.startsWith("**") && sel.endsWith("**") && sel.length > 4) {
		const nto = { line: to.line, ch: from.ch + sel.length - 4 };
		apply(() => {
			editor.replaceRange(sel.slice(2, -2), from, to);
			editor.setSelection(from, nto);
		});
		return true;
	}
	// 3) Empty selection, no word → bold-typing mode (****, cursor inside)
	if (empty) {
		apply(() => {
			editor.replaceRange("****", from, from);
			editor.setCursor({ line: from.line, ch: from.ch + 2 });
		});
		return true;
	}
	// 4) Default → wrap selection in **...**
	const nfrom = { line: from.line, ch: from.ch + 2 };
	const nto = { line: to.line, ch: to.ch + 2 };
	apply(() => {
		editor.replaceRange("**" + sel + "**", from, to);
		editor.setSelection(nfrom, nto);
	});
	return true;
}

export default class CJKBoldFixPlugin extends Plugin {
	private _toggleFixed = false;
	private _toggleOrig: ((...args: unknown[]) => unknown) | null = null;
	private _toggleProto: object | null = null;

	onload() {
		this.registerEditorExtension(cjkEmphasisExtension());
		this.installToggleFix();
	}

	onunload() {
		this.restoreToggleFix();
	}

	/**
	 * Patch the editor's toggleMarkdownFormatting so Cmd+B / command palette /
	 * formatting toolbar all use the CJK-safe character-based toggle. The core
	 * implementation decides "already bold" from the syntax tree, which
	 * mis-parses `**中文**` as one paragraph-wide strong node and unwraps the
	 * whole paragraph on toggle. Restored on plugin unload.
	 */
	private installToggleFix() {
		const t = this;
		const tryPatch = (): boolean => {
			const ae = (t.app.workspace as any).activeEditor;
			const ed = ae && ae.editor;
			if (!ed) return false;
			const proto = Object.getPrototypeOf(ed);
			if (!proto || typeof (proto as any).toggleMarkdownFormatting !== "function") return false;
			if (t._toggleFixed) return true;
			t._toggleOrig = (proto as any).toggleMarkdownFormatting;
			t._toggleProto = proto;
			(proto as any).toggleMarkdownFormatting = function (this: any, type: string, ...args: unknown[]) {
				if (type === "bold") {
					const s = this;
					try {
						// Multi-cell table selection → fall back to the original
						if (s.getTableSelection && s.getTableSelection().length > 0) {
							return (t._toggleOrig as (...a: unknown[]) => unknown).apply(s, args);
						}
						// Multi-cursor → fall back to the original
						const sl = s.listSelections ? s.listSelections() : null;
						if (sl && sl.length === 1 && cjkSafeToggleBold(s)) return;
					} catch (e) {
						return (t._toggleOrig as (...a: unknown[]) => unknown).apply(s, args);
					}
				}
				return (t._toggleOrig as (...a: unknown[]) => unknown).apply(this, args);
			};
			t._toggleFixed = true;
			return true;
		};
		if (!tryPatch()) {
			this.registerEvent(this.app.workspace.on("active-leaf-change", tryPatch));
		}
	}

	private restoreToggleFix() {
		if (this._toggleFixed && this._toggleProto) {
			(this._toggleProto as any).toggleMarkdownFormatting = this._toggleOrig;
		}
		this._toggleFixed = false;
	}
}

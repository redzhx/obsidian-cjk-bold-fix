#!/usr/bin/env bash
set -euo pipefail
# ============================================================
# CJK Bold Fix fork 维护脚本（redzhx/obsidian-cjk-bold-fix）
# 用途：上游 ebibibi 更新后，一键拉取 -> 重打补丁 -> 构建验证
# 用法：./cjk-bold-fix-maintain.sh
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# 脚本支持两种位置：仓库根目录内，或与仓库目录同级（仓库名为 obsidian-cjk-bold-fix）
if [ -d "$SCRIPT_DIR/src" ] && [ -d "$SCRIPT_DIR/.git" ]; then
  REPO_DIR="$SCRIPT_DIR"
else
  REPO_DIR="$SCRIPT_DIR/obsidian-cjk-bold-fix"
fi

cd "$REPO_DIR"

echo "==> [1/5] 拉取上游更新"
git fetch upstream
git rebase upstream/main

echo "==> [2/5] 重打补丁（幂等：已打过则跳过）"
if grep -q "!isCJKRelated(inner) && !isCJKRelated(lineText)" src/extension.ts; then
  echo "    补丁已存在，跳过"
else
  perl -0pi -e 's/if \(!isCJKRelated\(inner\)\) continue;/if (!isCJKRelated(inner) \&\& !isCJKRelated(lineText)) continue;/g' src/extension.ts
  echo "    已应用补丁"
fi
COUNT=$(grep -c "!isCJKRelated(inner) && !isCJKRelated(lineText)" src/extension.ts)
echo "    补丁位置数：$COUNT（应为 3）"
[ "$COUNT" -eq 3 ] || { echo "    错误：补丁数量异常，中止"; exit 1; }

echo "==> [3/5] 安装依赖并构建"
npm install --legacy-peer-deps >/dev/null 2>&1
npm run build

echo "==> [4/5] 语法验证"
node --check main.js && echo "    main.js 语法 OK"
grep -c "if(!b(E)&&!b(f))continue" main.js | xargs -I{} echo "    main.js 补丁数：{}（应为 3）"

echo "==> [5/5] 完成"
echo "    下一步："
echo "      git push origin main"
echo "      更新 manifest.json 版本号后提交推送"
echo "      gh release create v1.0.1-patchN main.js manifest.json --repo redzhx/obsidian-cjk-bold-fix"

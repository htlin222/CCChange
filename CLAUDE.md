# CCChange

每日一則 Claude Code changelog 中文講義的 Astro 站台，出刊流程由 Claude Code 自己跑。
線上位置：https://htlin222.github.io/CCChange/

## 出刊怎麼跑

每日講義的完整程序在 skill 裡，不在這裡：

```
/daily-changelog-post
```

→ `.claude/skills/daily-changelog-post/SKILL.md`

這份 CLAUDE.md 只放**每個 session 都適用的不變條件**。要改出刊流程請改 skill，
不要把程序複製到這裡；兩份會分岔。

## 專案結構

| 路徑 | 是什麼 |
| --- | --- |
| `src/content/posts/YYYY-MM-DD-slug.md` | 講義本體。**唯一**每日出刊會動到的地方 |
| `src/content/pages/` | 關於頁、首頁引言 |
| `src/content.config.ts` | frontmatter 的 Zod schema |
| `configs/user.config.ts` | 站名、導覽、社群連結 |
| `scripts/check-*.mjs` | CI 跑的兩支檢查 |
| `.github/workflows/` | ci / auto-merge / deploy |
| `src/` 其餘 | vendored [Lipi](https://github.com/thelocalhoststudio/lipi) 模板 |

## 不變條件

### 1. 站內連結一律走 `getAssetPath()`

這是 GitHub Pages 的 **project site**，`astro.config.mjs` 設了 `base: '/CCChange'`。

```astro
---
import { getAssetPath } from "@/utils/url";
---
<a href={getAssetPath("/archive")}>封存</a>   <!-- ✅ -->
<a href="/archive">封存</a>                    <!-- ❌ 本機正常，上線 404 -->
```

`pnpm dev` 和 `pnpm build` 都不會抱怨寫死的 `href="/..."` —— 它只在正式站上壞掉。
`scripts/check-build.mjs` 就是為了擋這一類而寫的，CI 會失敗。Lipi 上游有 9 處這種
連結，都已改掉；**新增元件時別把它加回來**。

### 2. 套件管理用 pnpm，且 `.npmrc` 的 `node-linker=hoisted` 不能拿掉

Lipi 的 remark plugins 匯入了沒宣告在 `package.json` 的傳遞相依
（`@astrojs/markdown-remark`、`unist-util-visit`）。pnpm 嚴格佈局下 build 直接失敗。

新增需要跑 postinstall 的原生套件時，要加進 `pnpm-workspace.yaml` 的
`onlyBuiltDependencies`，否則 CI 的非互動安裝會靜默跳過它。
（`sharp` 是刻意不列的，理由寫在該檔案裡。）

### 3. 每日 PR 只能碰 `src/content/` 和 `public/`

`.github/workflows/auto-merge.yml` 用檔案路徑當閘門。一旦 PR 動到 workflow、
`scripts/`、或建置設定，就**不會**自動合併 —— 這是刻意的，能改變 CI 自身行為的
東西必須人看過。

所以：出刊時如果順手想修個 bug，**開另一支 PR**，不要跟講義混在一起，否則整支
PR 會卡住等人。

### 4. 合併是 workflow 的事，不是 agent 的

`gh pr merge` 在 `.claude/settings.json` 裡被 deny。開 PR、貼上驗證結果，然後停手。

### 5. 文章裡的每個事實都要有出處

版本號、時間戳、引述、定價 —— 都必須來自這個 session 實際跑過的指令或抓過的 URL，
並在文中標註是「官方文件」、「社群」還是「本機實測」。
**「今天沒有新版」是合法且有價值的一篇**，不要為了有東西寫而編。

## 指令

```bash
pnpm install          # Node >= 22.12
pnpm dev              # http://localhost:4321/CCChange
pnpm build            # prebuild 會先跑 check-content
pnpm test             # check-content + check-build，開 PR 前必須是 0 exit
```

`pnpm test:content` / `pnpm test:build` 可以單獨跑。

## 語言

講義用繁體中文。程式碼識別字、設定鍵、CLI flag 保持原文。

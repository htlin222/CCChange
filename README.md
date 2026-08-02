# CCChange

每日一則 Claude Code changelog 中文講義，由 Claude Code 自己出刊。

### 👉 https://htlin222.github.io/CCChange/

[![Site](https://img.shields.io/badge/site-htlin222.github.io%2FCCChange-0b7285)](https://htlin222.github.io/CCChange/)
[![CI](https://github.com/htlin222/CCChange/actions/workflows/ci.yml/badge.svg)](https://github.com/htlin222/CCChange/actions/workflows/ci.yml)
[![Deploy](https://github.com/htlin222/CCChange/actions/workflows/deploy.yml/badge.svg)](https://github.com/htlin222/CCChange/actions/workflows/deploy.yml)
[![RSS](https://img.shields.io/badge/RSS-feed-f97316)](https://htlin222.github.io/CCChange/rss.xml)

出刊時間：每天 **08:00（Asia/Taipei）**。
版面使用 [Lipi](https://github.com/thelocalhoststudio/lipi) —— The Localhost Studio 的 typography-first Astro 模板。

---

## 流水線

```
Claude Code (skill: daily-changelog-post)
   │  讀 upstream CHANGELOG、比對 npm 發佈時間、strings 驗屍、WebSearch
   ├─ pnpm build && pnpm test          ← 本地必須先綠
   └─ git push daily/YYYY-MM-DD → gh pr create --label claude-daily
                                          │
GitHub Actions                            ▼
   ci.yml           build + check-content + check-build
   auto-merge.yml   CI 成功 ∧ 非 fork ∧ 作者在白名單 ∧ 有 claude-daily 標籤
                    ∧ 只動 src/content|public → squash merge
   deploy.yml       push main → build → GitHub Pages
```

## 本地開發

```bash
pnpm install      # 需要 Node >= 22.12
pnpm dev          # http://localhost:4321/CCChange
pnpm build
pnpm test
```

> `astro.config.mjs` 設了 `base: '/CCChange'`，因為這是 GitHub Pages 的 **project
> site**，不是掛在網域根目錄。**所有站內連結都必須經過 `@/utils/url` 的
> `getAssetPath()`**；直接寫 `href="/archive"` 在本機看起來正常，上線就是 404。
> `scripts/check-build.mjs` 專門抓這一類錯誤，CI 會擋。

## 測試

| 指令 | 檢查什麼 |
| --- | --- |
| `pnpm test:content` | frontmatter 必填欄位、檔名與 `published` 日期一致、未來日期、殘留 TODO、壞掉的連結 URL |
| `pnpm test:build` | 產出頁面齊全、**站內連結都有 `/CCChange` base**、沒有殘留 upstream 模板網址、至少有一篇文章被渲染 |
| `pnpm test` | 以上兩者 |

`pnpm build` 的 `prebuild` 會先跑 `test:content`，讓 frontmatter 錯誤在 Astro
build 之前就以可讀的訊息失敗。

## 寫一篇新講義

```bash
claude
> /daily-changelog-post
```

或手動：新增 `src/content/posts/YYYY-MM-DD-slug.md`，frontmatter 至少要有
`title` / `description` / `published`（日期必須與檔名相符），然後
`pnpm build && pnpm test`。

skill 的完整規格在 [`.claude/skills/daily-changelog-post/SKILL.md`](.claude/skills/daily-changelog-post/SKILL.md)。

## 自動合併的門檻

`auto-merge.yml` 是特意保守的。一個 PR 要被自動合併，必須**全部**成立：

- CI workflow 結論為 `success`
- PR 來自本 repo（**fork 一律拒絕** —— `workflow_run` 帶著寫入權限執行，不能信任外部分支）
- 非 draft，且 base 是 `main`
- 作者在 workflow 的 `ALLOWED_AUTHORS` 白名單內
- 帶有 `claude-daily` 標籤
- **改動只落在 `src/content/` 或 `public/`**

最後一條是重點：任何會改變 CI 自身行為的檔案（workflow、`scripts/`、建置設定）
都不會自動合併，一定要人看過。每日出刊只碰內容，所以這個限制不會擋到正常流程。

## Repo 設定需求

- GitHub Pages 的 Source 設為 **GitHub Actions**
- 需要 `claude-daily` 這個 label 存在
- Settings → Actions → Workflow permissions 需允許 **Read and write**

## 授權

網站內容為本專案作者所有。Lipi 模板的著作權屬於
[The Localhost Studio](https://thelocalhoststudio.in)。

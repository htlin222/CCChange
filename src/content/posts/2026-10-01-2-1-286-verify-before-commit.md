---
title: "2.1.286：commit 前跑 verify 的那句話接上線了，但內建的 /verify 不算"
description: "這句指示的文字 2.1.285 就躺在執行檔裡，沒有任何地方會印它。這版接到 Bash 工具的 Git 段落，同時把判定收緊成只認你自己放的 skill。"
published: 2026-10-01
category: "Changelog"
tags: ["claude-code", "changelog", "skills", "verify", "commit"]
annotation: "內建的 /verify 不算，要你自己寫一支同名的。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.286 | 09-30 17:14 UTC 上 npm，距這篇 7 小時，88 條 |
| commit 前跑 verify | 這版才接到 Bash 工具的 `# Git` 段落；2.1.285 執行檔裡有這段文字但沒地方印（本機實測）|
| 什麼算 verify | 只認 `.claude/skills/` 或 `~/.claude/skills/` 底下你自己放的，內建的 `/verify` 不算（本機實測，2.1.285 認內建的）|
| 遠端開關 | `tengu_polished_tulip`，預設開，session 第一次呼叫 Bash 時算一次就定住（本機實測 0 → 2 處）|
| `/commit`、`/pr` | 同一句話也接在這兩個 slash command 後面，但那條路的閘門寫死回傳 false，印不出來（本機實測）|
| 失敗請求的重試 | 一個上限改成管整次 model call，預設設定下一次失敗的 call 最多送 14 個 request |
| `--bare` | 只連命令列上指名的 MCP server，不送 system reminder，不起背景工作；指令逾時直接停，不轉背景 |
| API 400 | 工具或 hook 回傳物件、數字或布林而不是文字就 400，修了，resume 的 session 也算 |
| `--resume` / `--continue` | session 崩過的話，一批平行 tool call 之後的回合會整段消失，修了 |
| 雲端排程 | 雲端 session 根本沒起來的那種失敗，Runs 面板之前標 Succeeded，現在標 Failed |
| 權限提示 | 疊了好幾個請求時會標「2 of 5」 |
| worktree 隔離的 subagent | 第一次讀檔會從 worktree 那份再載一次 project `CLAUDE.md`，修了 |
| 預設模型被拒 | 退回同一階的上一個模型重試一次，不再整個回合失敗 |

沒細講的：VS Code 十條、Claude Tag 六條、雲端 session 另外五條、祕密遮蔽五條、`/ultrareview` 拿掉輸出裡的瀏覽器連結、list 畫面的捲軸和 `↑ N more` 列、`/hooks` 收成一張清單、主題和輸出樣式選擇器改成可捲動。

## 為什麼要改

[skills 文件](https://code.claude.com/docs/en/skills#bundled-skills)對內建那支是這樣寫的：

> others, including `/verify`, run only when you invoke them, which keeps you in control of when these longer-running checks spend time and tokens.

這句話還是對的，因為這版新加的指示不認內建那支。執行檔裡的判定是 skill 的 `loadedFrom` 要等於 `skills`（本機實測），也就是從 `.claude/skills/` 或 `~/.claude/skills/` 讀進來的那種。內建的 `/verify` 是一份通用的 build-and-drive 流程，在它不認識的 repo 上每次 commit 前跑一遍，很容易變成每次 commit 多等幾分鐘。

2.1.285 的設計不一樣。它要 Claude 在 `git commit` 前用一句話講清楚 `/verify` 這個 session 有沒有跑過，後面還掛一串豁免條件。這版把整段換成一行「跑它」。兩版都接在 `/commit` 和 `/pr` 後面，而那條路的開關寫死回傳 false，所以 2.1.285 那段一次也沒印出來過。

## 對你的流程有什麼影響

1. 這個 repo 沒有 `.claude/skills/verify/SKILL.md`，升到 2.1.286 之後那句話對你還是不會出現。要它出現就寫一支，內容就是出刊 skill Step 7 的三行：

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

2. 寫完之後印出來的是這句：

```
Always run `/verify` right before the `commit` command (never for docs or tests).
```

括號裡那半句要注意。每日講義只動 `src/content/posts/`，Claude 大概會判成 docs 然後跳過，所以 Step 7 的 `pnpm test` 還是得自己跑，別交給這條新指示。

3. 別順手在這個 repo 放 `simplify` 或 `code-review` 的同名 skill。有幾支就會被串成同一句一起叫，`/code-review medium` 跑在一篇 markdown 的 PR 上只是白燒 token。要放就放 `~/.claude/skills/`，留給有程式碼的專案。

4. `tengu_polished_tulip` 預設開，你改不了，而且 session 第一次呼叫 Bash 時算完就定住，中途不會重算。哪天那句話沒出現，先別去翻 settings。要確認就用 `/context` 看 Bash 工具的 `# Git` 段落裡有沒有那行。

5. 雲端排程那條是伺服器端修的（這個 repo 的出刊就跑在上面），執行檔裡找不到對應字串，不用升級就生效。回頭看 Runs 面板上標 Succeeded 的舊紀錄，裡面可能有 session 根本沒起來的。

6. `--bare` 現在只連你在命令列上指名的 MCP server。如果你有腳本靠 `--bare` 配 `.mcp.json` 拿 server，那條路斷了，改成明寫 `--mcp-config`。

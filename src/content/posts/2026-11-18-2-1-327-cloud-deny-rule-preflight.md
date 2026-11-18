---
title: "2.1.327：搬去雲端前先驗 deny 規則，/status 多了一份壞檔清單"
description: "173 條的一版。/teleport 搬 session 到雲端之前會先看 deny 規則，內容裡有 ) 接空白或逗號的直接不給搬。/status 新增的壞檔清單判斷邏輯 326 就有了，只是一直關在 claude doctor 裡面。"
published: 2026-11-18
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "cloud", "mcp"]
annotation: "key 名字打錯的還是抓不到。11-16 那篇講的洞，327 沒補。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.327 | 11-17 20:33 UTC 上 npm，我查的時候過了 3.6 小時。離 326 隔 25.8 小時 |
| 規模 | changelog 173 條，326 那版是 367 條 |
| `/teleport` 搬去雲端 | 多一條擋人的條件：deny 規則內容裡有 `)` 接空白或逗號，整個不給搬 |
| `/status` | 多一份清單，列壞掉的 agent、skill、command、output style 檔，keybinding 錯誤，sandbox 不能用，被忽略的 permission 設定，還有永遠不會中的 hook matcher |
| 設定存不進去 | 以前完全沒聲音，現在 prompt 底下會寫一行 |
| `claude mcp add-json <name> -` | 從 stdin 讀 server 的 JSON，token 不用上命令列。session 裡面叫不動 |
| `claude mcp add` / `remove` 的 project scope | 不再順手刪掉 `.mcp.json` 其他 top-level key，像 `$schema` 或別的工具的 `servers` |
| 第一個 Bash 指令 | shell 啟動檔會在你批准之前先跑，按拒絕它也已經跑完了。`CLAUDE_CODE_DISABLE_SHELL_HEAD_START=1` 關掉 |
| Remote Control worktree | 停伺服器會刪掉執行中 session 的 git-ignored 檔案，`.env` 那類。修掉了 |
| 其餘約一百六十條 | TUI、終端機顯示、VSCode、subagent 的模型繼承，跟排程出刊這條路無關 |

## 為什麼要改

326 補的是命令列上被切斷的權限規則，327 把同一個洞往雲端那邊再堵一層。`/teleport` 搬 session 過去之前會先看 deny 規則，內容裡出現 `)` 接空白或逗號的就不給搬，訊息直接說雲端會在那個括號把規則切掉。這句話在 326 的二進位裡完全找不到，是新寫的（本機實測）。

`/status` 那份清單的來路不一樣。官方的[設定文件](https://code.claude.com/docs/en/settings)到今天還是這樣寫：

> The line confirms which files Claude Code read; it doesn't show which file supplied each key. To list entries Claude Code rejected, run `claude doctor`.

判斷邏輯 326 就有，只是關在 `claude doctor` 裡面。327 做的事是把它搬到你每天會開的那個畫面上。

shell 啟動檔那條是反方向。2.1.309 才剛把啟動檔跑在 sandbox 外面這件事修掉，327 為了讓第一個 Bash 指令快一點，又讓它跑在批准之前。309 動的是沙盒邊界，327 動的是時序，兩條嚴格說不衝突（官方 changelog）。

## 對你的流程有什麼影響

1. 這個 repo 的 deny 規則過關，不用改。四條 `Bash(git push --force:*)`、`Bash(gh pr merge:*)`、`Read(./.env)`、`Read(./.env.*)`，括號內容裡沒有一個 `)`。另外排程直接起的雲端 session 不走 `/teleport`，這條檢查攔不到它，也就幫不了它。
2. 升完開一次 `/status`，整份清單讀到底。最該看的是被忽略的 permission 設定，還有那些永遠不會中的 hook matcher。
3. 想在升級前就看到同樣的東西，跑 `claude doctor`。`matches no tool` 這串字在 2.1.326 的二進位裡已經有七處（本機實測），那份判斷早就寫好了，327 只是換了個地方給你看。
4. key 名字打錯的還是抓不到。11-16 那篇講的洞沒補，unknown setting 這類判斷在 327 的字串表裡一個都找不到（本機實測）。`modle` 寫成那樣照樣被靜靜丟掉，還是只能靠 `.claude/settings.json` 開頭那行 `$schema` 幫你在編輯器裡標紅。
5. `~/.bashrc` 要不要讓它搶跑，今天決定一次。啟動檔裡會寫檔或起背景程序的話，就設 `CLAUDE_CODE_DISABLE_SHELL_HEAD_START=1`。我自己會關。我不想要那種「我按了拒絕，可是那台機器上已經發生了一些事」的狀態。
6. MCP server 要帶 token 的改用 `claude mcp add-json <name> -`，JSON 從 stdin 餵進去。它在 session 裡面叫不動，得自己開一個 shell。
7. 升。這版沒有會讓既有設定行為變掉的條目，昨天 326 那種 hook 的 `block` 開始真的生效的狀況，這次沒有。

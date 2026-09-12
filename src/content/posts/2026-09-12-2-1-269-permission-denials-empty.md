---
title: "2.1.269：permission_denials 以前是空的，plugin eval 多了一道會卡住 CI 的確認"
description: "重點不在新功能。2.1.268 用 --output-format json 做的權限稽核，被 path deny rule 擋掉的 Read 一筆都沒記，實測回空陣列。"
published: 2026-09-12
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "headless", "plugin-eval"]
annotation: "changelog 說 Added 的那個指令，上一版就跑得動了。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| `permission_denials` | 被 path deny rule 擋掉的 Read／Edit／Write 以前不會進這個欄位，同一組 fixture 在 2.1.268 回空陣列、2.1.269 照實列出 |
| `claude plugin eval` | changelog 寫 Added，但 2.1.268 的 `--help` 就把整套列得出來，也跑得動 |
| `--trust-plugin` | 這才是新的：第一次在沒信任過的 plugin 目錄跑會停下來問，這個 flag 是給 CI 回答用的 |
| `--mocks record` | 沒有 mock 的 plugin MCP server 從此不啟動，要起得另外加 `--allow-real-servers` |
| `bashEditDiffEnabled` | Bash 改過的檔案會附一份 diff，PostToolUse 的 Bash hook 從 `tool_response` 拿得到改檔清單 |
| `CLAUDE_CODE_BG_TASKS_REPORT_RUNNING` | 不是新的，2.1.268 的執行檔裡就有，這版把預設從關翻成開 |

剩下六十幾條是終端機按鍵、prompt cache、VSCode 面板和 Slack 的修正，升級就有，不用做事。

## 為什麼要改

[headless 文件](https://code.claude.com/docs/en/headless)寫得很篤定：最後那則 result 訊息會把擋掉的呼叫列在 `permission_denials`。我搭了一個只有 `Read(./secret/**)` 一條 deny 規則的資料夾，叫 2.1.268 去讀那個檔，它回 `BLOCKED`，`permission_denials` 卻是 `[]`。2.1.269 跑同一組 fixture，那次 Read 照實列了出來。兩版都有擋，差別在有沒有留下紀錄。

麻煩的地方在於，欄位是空的跟真的沒東西被擋，在 JSON 裡長得一模一樣。你的 gate 讀到 0 就放行，而它本來該攔的那次讀取確實發生過。

`plugin eval` 那道確認是補防線。eval 會用你的身分、在你的機器上跑 plugin 自己帶的 prompt 和 grader，`--mocks off` 還會把真的 MCP server 起起來。這些事上一版就做得到了，只是沒有任何一道門。

`bashEditDiffEnabled` 有個限制值得記一下：在 auto 和 bypassPermissions 以外的模式，只有 user、flag 或 policy 設定能把它打開，repo 裡的 `.claude/settings.json` 寫了不算。[官方 settings 頁](https://code.claude.com/docs/en/settings)目前查不到這個鍵。

## 對你的流程有什麼影響

1. 升級之前用 `claude -p --output-format json` 做過的權限稽核，結論重跑一次。在 2.1.268，空陣列證明不了任何事。
2. CI 裡叫得到 `claude plugin eval` 的地方補上 `--trust-plugin`，否則第一次在沒信任過的目錄會停在確認那裡等人。
3. 同一條 eval 指令的分數會變，因為 `--mocks record` 現在不啟動沒有 mock 的 server。先跑一次記下新基準，別把落差當成 plugin 退步。
4. PostToolUse 的 Bash hook 有在 parse `tool_response` 的，先看一眼多出來的改檔清單會不會弄亂它。要關就寫 `bashEditDiffEnabled: false`，位置在 `~/.claude/settings.json`。
5. `CLAUDE_CODE_BG_TASKS_REPORT_RUNNING` 不用管。預設翻成開之後，headless 和遠端 session 不會再在 background agent 還在跑的時候宣稱在等你輸入。
6. 雲端 session 從 claude.ai 同步下來的 skill 現在叫 `anthropic-skills:<name>`。腳本裡寫死裸名的改掉，裸名只在沒有別的東西撞名的時候才通。

---

*版本與條目來自 npm registry 和官方 changelog（官方文件）。`permission_denials` 的差異、`plugin eval --help` 的新舊對照、`CLAUDE_CODE_BG_TASKS_REPORT_RUNNING` 的預設翻轉，來自本次下載並比對 2.1.268 與 2.1.269 執行檔並實際執行（本機實測）。*

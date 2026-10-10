---
title: "2.1.296：BASH_ARGV0 繞過 Bash 權限檢查，MCP 描述上限翻倍"
description: "權限檢查判斷變數能不能靜態算出來，靠一份寫死的名字清單，BASH_ARGV0 漏在外面。同一版把前置送出的 MCP 描述上限從 2048 升到 4096，官方文件還寫舊值。"
published: 2026-10-10
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "mcp", "pricing", "subagents"]
annotation: "名單上有 BASH_ARGV、BASH_ARGC、BASH_SUBSHELL、BASH_LINENO，就是沒有 BASH_ARGV0。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.296 | 10-09 16:58 UTC 上 npm，距這篇 7.2 小時，79 條 |
| `BASH_ARGV0` | `BASH_ARGV0=rm` 之後用 `$BASH_ARGV0`，權限檢查會把它當字面值拿去比 allow 規則，這版改成要問（本機實測：2.1.295 那份動態變數 Set 裡有 BASH_ARGV、BASH_ARGC、BASH_SUBSHELL、BASH_LINENO、BASH_REMATCH，沒有 BASH_ARGV0） |
| MCP 描述上限 | 前置送出的 tool description 和 server instructions 從 2048 升到 4096。走 tool search 載進來的那條還是 16384，沒動（本機實測） |
| Sonnet 5.5 的 cache read | `/cost`、status line、`--max-budget-usd` 之前按 $0.2 算，這版改成 $0.1（本機實測：295 把它掛在 `tier_2_10`，296 換到新加的 `tier_2_10_cache_read_0_10`） |
| `autoCompactWindow` | agent 檔的 frontmatter 和 `--agents` 現在讀得到，吃 100000 到 1000000（本機實測：引擎層 295 就有這個鍵，新的只是 agent 檔那一層） |
| prompt hook 中途按 Esc | 會放行沒檢查過的 prompt，headless 還會整個收掉（官方 changelog） |
| headless 的 MCP | 換過目錄或 reload plugins 之後，你在那個資料夾關掉的 `.mcp.json` 和 plugin MCP server 會自己起來（官方 changelog） |
| Read 的 `allow_large` | 新參數，整個檔案都要而 context 吃得下的時候一次讀過大小上限（本機實測：295 完全沒有這個字串） |

另外兩個新變數：`CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL` 把 workflow 裡每個 agent 釘在同一個模型，`CLAUDE_CODE_OVERLOADED_RETRY_MAX_DELAY_MS` 拉長 529 的 backoff 上限。剩下的跟你沒關係：Claude apps gateway 的 `code` policy key、Claude Tag 的 Slack 七條、VS Code 五條、自建環境 Activity 頁的狀態篩選。

## 為什麼要改

BASH_ARGV0 這條的修法比它本身有意思。權限檢查碰到變數展開，得先判斷這個名字的值能不能靜態算出來，算不出來就不能拿去比 allow 規則。它用的是一份寫死的清單，大概五十個名字，RANDOM、SECONDS、LINENO、BASH_COMMAND 都在裡面。2.1.295 補過 for 迴圈那條路，`for BASH_ARGV0 in ...` 會被判成 too-complex，但普通賦值沒補。所以這版做的事就是在那份清單尾巴多塞一個字串。

清單漏一個名字，繞過就成立。下一個沒列到的特殊變數還會再來一次，所以我不把 Bash 的 allow 規則當成唯一那層。

另外兩件是文件落後執行檔。[env-vars 文件](https://code.claude.com/docs/en/env-vars)現在還寫 `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH` 預設 2048。[sub-agents 文件](https://code.claude.com/docs/en/sub-agents)的欄位表沒有 `autoCompactWindow`，講到 subagent 壓縮只給你 `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`。

Sonnet 5.5 的 cache read 不是降價，是 Claude Code 自己算錯。[官方定價頁](https://platform.claude.com/docs/en/about-claude/pricing)寫 Opus 5.5 和 Sonnet 5.5 的 cache hit 都是 base input 的 0.05 倍，Sonnet 5.5 折下來 $0.10。執行檔裡 Opus 5.5 本來就在那層，Sonnet 5.5 卻被丟到通用的 0.1 倍。差的這一倍跟著進了 `/cost` 和預算上限。

## 對你的流程有什麼影響

1. 先升到 2.1.296。BASH_ARGV0 是權限繞過，沒有設定替代得了升版。
2. `--max-budget-usd` 的值要重設。agentic loop 的 token 絕大多數是 cache read，Sonnet 5.5 的帳之前多算一倍，你以前撞上限的那個數字現在偏保守。看 `/cost` 的歷史數字也要記得打對折。
3. MCP server 接得多的話，前置描述的 context 成本這版直接翻倍。在 `settings.json` 的 `env` 加 `"CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH": "2048"` 釘回舊值，先看 `/context` 再決定要不要放開。這個變數 295 就有了，改的只是沒設它的時候用哪個預設。
4. agent 檔要加 `autoCompactWindow` 就加，範圍 100000 到 1000000。文件還沒列，加完用 `claude --debug` 看一眼有沒有吃到；changelog 說這版的 `--debug` 開始會點名 agent 檔裡認不出來的 frontmatter 欄位，正好拿來驗。
5. 拿 `UserPromptSubmit` 或 mod 的 `prompt.submit` 當閘門的人，2.1.294 那條極性判反之後又來一條。按 Esc 的時機不是你能控制的，升版以外沒別的辦法。
6. CI 裡的 `claude -p` 不用改設定。之前 session 中途換目錄或 reload plugins，你關掉的 MCP server 會自己連上去，日誌裡那幾條對不上的連線有解釋了。
7. `/code-review` 在雲端 session 和 SDK 收尾吐原始 JSON array 的毛病也修了，不用管。Read 的 `allow_large` 同樣不用管，那是給模型自己判斷要不要一次讀完的參數。

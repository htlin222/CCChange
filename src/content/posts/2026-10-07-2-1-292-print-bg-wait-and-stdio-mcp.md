---
title: "2.1.292：`claude -p` 不再五秒砍掉背景指令，stdio MCP 新握手變成預設"
description: "92 條，一天之內出了兩版。昨天那篇叫你升的 2.1.290 在雲端會掉權限提示的答案，2.1.291 補掉之後十三小時就被 2.1.292 蓋過。握手那條預設換了，但只打到不抓 feature flag 的那群人。"
published: 2026-10-07
category: "Changelog"
tags: ["claude-code", "changelog", "mcp", "headless", "scheduled-tasks"]
annotation: "529 的退避起始延遲可以調了，不過那條路徑的上限寫死 32 秒，設得比它大等於沒設。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.291 | 10-06 03:32 UTC，兩條回歸修正，一條是 2.1.290 在雲端 session 會掉權限提示的答案 |
| 2.1.292 | 10-06 17:10 UTC，距這篇 7.0 小時，92 條：63 Fixed、13 Improved、8 Added、7 Changed、1 Security |
| `claude -p` 的背景指令 | 最後一次回覆後五秒就被砍，現在改成等。上限十分鐘，`CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0` 無限等（官方＋本機實測） |
| `claude -p` 的 scheduled wakeup | 一次性跑完會掉，現在也一起等（官方） |
| stdio MCP 握手 | negotiate `2026-07-28` 成為每個安裝的預設。`MCP_PROTOCOL_NEGOTIATION` 兩版都在，動的只是預設（本機實測） |
| `CLAUDE_CODE_OVERLOADED_RETRY_BASE_DELAY_MS` | 新變數，529 退避的起始延遲，預設 500 毫秒。那條路徑的 capMs 寫死 32000（本機實測） |
| Agent tool 的 `effort` | 從 subagent frontmatter 的欄位變成每次呼叫可以帶的參數，底層的 `subagent_effort` 在 2.1.290 就有了（本機實測） |
| `claude plugin install --marketplace` | CLI 補上這個旗標，2.1.290 的 `--help` 裡沒有；`/plugin install` 那邊早就有了（本機實測） |
| UNC 路徑的讀取 | PreToolUse hook 的放行和 auto mode 會繞過權限提示，掛 Security 標記（官方） |
| `permissionMode: auto` 的 subagent | auto mode 關著的時候不再硬進去，改成問你（官方） |
| 定時任務 | `/resume`、`/branch`、`/clear` 之後存的任務不再永遠不觸發；雲端 session 的訊息被重送或編輯時也不再掉（官方） |

剩下的是 Claude Tag 八條、Code Review 三條、vim mode、iTerm2 的 scrollback，加上 mod hooks 一整批。沒碰那幾塊就整批不用管。

## 為什麼要改

[MCP 文件](https://code.claude.com/docs/en/mcp#mcp-client-runtimes)寫過去的分界：

> on Claude Code v2.1.285 or later it asks stdio servers as Anthropic rolls that change out. To have it ask connector and stdio servers in every session, set `MCP_PROTOCOL_NEGOTIATION` to `auto`.

roll out 的手段是 feature flag，而[有一整群 session 根本不抓 flag](https://code.claude.com/docs/en/env-vars#features-that-need-feature-flag-fetching)：Bedrock、Google Cloud Agent Platform、Microsoft Foundry，再加上設了 `DISABLE_TELEMETRY`、`DO_NOT_TRACK` 或 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` 的那些。他們的 stdio server 從頭到尾沒被問過。2.1.292 把預設拉齊，所以這次會感覺到變化的就是這群人，其他人早就在新握手上了。

`claude -p` 是另一回事。十分鐘的等待上限、一條五秒的短路、`CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS` 這個變數，三樣東西在 2.1.290 就都在了。差的是 one-shot 跑完之後走到哪一條。走到五秒那條，CI 裡丟出去的 `npm pack` 或長建置就在最後一次回覆後五秒被收掉，而且終端機不會講。

## 對你的流程有什麼影響

1. 升到 2.1.292，2.1.291 直接跳過。它只活了不到十四個小時，而昨天那篇叫你升的 2.1.290 正是會掉雲端權限答案的那一版。

2. CI 和雲端出刊這些 `claude -p` 的流程，背景指令現在撐得完。這篇用來比對的三個 binary 就是背景抓的，在 2.1.290 下會在最後一次回覆後五秒被砍。要卡死等完是設 `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0`，代價是沒有逃生門，建置掛住就一起掛住。我還是走預設的十分鐘。

3. 529 撞得兇的話，`CLAUDE_CODE_OVERLOADED_RETRY_BASE_DELAY_MS` 設在 2000 到 8000 就夠。這條路徑的 capMs 寫死 32000，起始延遲設得比它大，第一次重試就直接頂到 32 秒，再往上加不會有差。要更長的退避還是靠 `CLAUDE_CODE_RETRY_WATCHDOG=1`，429 走的是另一條，上限五分鐘。這個新變數，還有第 2 條那個 `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS`，[env-vars 文件](https://code.claude.com/docs/en/env-vars)兩個都還沒收。

   ```json
   { "env": { "CLAUDE_CODE_OVERLOADED_RETRY_BASE_DELAY_MS": "4000" } }
   ```

4. 本機有 stdio MCP server、又跑在 Bedrock、Vertex／Agent Platform 或 Foundry 上的話，升版後第一次連會多一輪握手。不想動就設 `MCP_PROTOCOL_NEGOTIATION=legacy`，但它會把所有 server 都拉回舊握手，不只 stdio。

5. `.claude/agents/` 底下寫了 `permissionMode: auto` 的，升版後在 auto mode 關著的環境會開始跳權限提示。社群的[整合評估](https://github.com/RESMP-DEV/lapis/issues/106)講得更白：subagent 開得多的設定，提示量是往上走不是往下。CCChange 這支沒有 agents 目錄，不用管。

6. 要在 Agent tool 呼叫時指定 `effort`，[sub-agents 文件](https://code.claude.com/docs/en/sub-agents)只寫 frontmatter 那個欄位，新參數還沒進文件。先照舊寫 frontmatter。

7. 排程 routine 現在會直接發一個只有你看得到的 artifact，不問。要連 connector 的那種還是會問。不用管，只是下次看到多了幾個私有 artifact 不要以為是誰手滑。

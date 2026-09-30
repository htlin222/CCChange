---
title: "2.1.285：WebFetch 多一個關法，同一個變數在雲端會關掉 WebSearch"
description: "CLAUDE_CODE_DISABLE_WEB_FETCH 是新的，但它同時被接進 WebSearch 走不走 proxy 的判斷，只在雲端 session 生效，changelog 沒寫。另外 claude -p 在第三方供應商下改成預設 auto mode，文件那張表還沒補。"
published: 2026-09-30
category: "Changelog"
tags: ["claude-code", "changelog", "websearch", "auto-mode", "sandbox"]
annotation: "名字寫 WEB_FETCH，管的不只 WebFetch。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.285 | 09-29 17:32 UTC 上 npm，距這篇 7 小時，136 條 |
| `CLAUDE_CODE_DISABLE_WEB_FETCH` | 新環境變數，關掉 WebFetch（本機實測，2.1.284 執行檔裡 0 處，這版 9 處） |
| 同一個變數 | 在雲端 session 裡也決定 WebSearch 走不走 proxy，changelog 沒提（本機實測） |
| `claude -p`、Python SDK | 掛第三方供應商或關掉 telemetry 時，沒指定 permission mode 就開 auto |
| 背景 Bash / PowerShell | 開始有時鐘，預設 30 分鐘、上限 2 小時，停掉時會通知 Claude |
| `allowedProviders` | 新的 managed setting，限制這台機器能用哪些 API 供應商（本機實測 0 → 46 處） |
| `claude --desktop` | 用桌面 app 開當前目錄，可配 `--continue` / `--resume <id>`（本機實測，2.1.284 的 `--help` 沒有這個 flag） |
| `claude plugin configure` | 列出 plugin 哪些選項還沒設，或用 `--values-stdin` 吃一份 JSON 存進去（本機實測） |
| sandbox auto-allow | `python3 -c`、`node -e` 之前只因為字串裡有 `=` 就每次要你批准，改掉了 |
| log 和 transcript 的遮蔽 | 網址密碼含 `@` 會漏一段，寫成 `%40` 整串漏光，修了 |
| `CLAUDE_CODE_NONSTREAMING_TIMEOUT_RETRIES` | 限制非串流 fallback 逾時後重送幾次（本機實測 0 → 3 處） |

沒細講的：`/ultrareview` 上傳路徑八條、VS Code 二十五條、Claude Tag 三條、Bedrock 和 Vertex 的啟動檢查四條、Artifact 工具七條、`widgets` 這個 MCP server 名字在雲端被保留。

## 為什麼要改

三天前那篇講 2.1.283 把關掉 telemetry 的互動 session 推進 auto mode。這版讓 `claude -p` 和 Python SDK 走同一條路。[permission-modes 那張表](https://code.claude.com/docs/en/permission-modes#which-mode-a-session-starts-in)今天還是這樣寫：

> | `claude -p` or the Agent SDK | `default` |

這行沒錯，只是沒帶上這版新開的例外。要靠得住就看表的第一列：任何設定檔把 `disableAutoMode` 設成 `"disable"`，`-p` 就一定回 `default`。執行檔裡對應的旗標叫 `autoModeKillSwitchOnDisk`，只認從磁碟讀到的值，環境變數塞不進去。

WebFetch 那個新變數的名字會騙人。它被塞進決定 WebSearch 要不要走 proxy 的那段判斷，條件是 `ccrSessionUrl` 有值，也就是雲端 session。2.1.284 同一個函式只看 feature flag，這版多了 `CLAUDE_CODE_DISABLE_WEB_FETCH ||`（本機實測）。

背景指令被停掉的機制本來就在，以前唯一的理由是記憶體不足，這版多了一個時間到（本機實測，兩版都有 `memory_pressure`，只有這版有「reaching its background time limit」）。

## 對你的流程有什麼影響

1. 不要把 `CLAUDE_CODE_DISABLE_WEB_FETCH` 寫進雲端環境的變數清單。這個 repo 的 `.claude/settings.json` 同時放行 WebSearch 和五個 WebFetch 網域，每日出刊查證那步兩個都要用。設了它，WebSearch 在雲端連 proxy 都不走，光看變數名字猜不到。

2. `claude -p` 這條在這個 repo 不用管，`.github/` 底下 grep 不到它。別處有 `claude -p` 又掛在 gateway 或關了 telemetry 的，補 `--permission-mode` 進那條命令，或在 `~/.claude/settings.json` 寫 `"disableAutoMode": "disable"`。兩個都能壓住，前者只管一次。

3. 背景指令跑超過半小時的自己帶 `timeout`。上限兩小時，到點會停，Claude 會收到通知。平常的指令碰不到這條，長時間的 build 或 migration 才會。

4. 網址密碼那條值得回頭看一次。changelog 說密碼含 `@` 會漏一段，寫成 `%40` 會整串漏出來。你如果曾經在 session 裡貼過 `https://user:pass@host` 這種 URL，舊的 transcript 和 log 就得當成外洩處理，該換的換掉。

5. `python3 -c` 和 `node -e` 的批准提示會少很多，不用改任何設定。

6. `allowedProviders` 單機沒 MDM 的話不用管。[admin-setup 那頁](https://code.claude.com/docs/en/admin-setup)今天還沒收錄這個鍵，執行檔裡倒是有 46 處，其中一條管理員訊息會在 gateway 沒列進去的時候要你補上。

7. `claude plugin configure <plugin> --values-stdin < values.json` 可以把 plugin 選項寫進非互動流程了。手上的 plugin 都沒有選項的話，先記著有這招。

---
title: "2.1.238：Ctrl+W 可以換成 readline 那套，headersHelper 被拉進信任閘"
description: "新的 keybindingFlavor 是目前唯一能改 Ctrl+W 的開關，keybindings.json 綁不到它。同一版把專案 .mcp.json 的 headersHelper 關進資料夾信任閘，官方文件那段 Note 寫的還是舊行為。"
published: 2026-08-21
category: "Changelog"
tags: ["claude-code", "changelog", "keybindings", "mcp", "plugins", "settings"]
annotation: "keybindings.json 的動作表裡沒有刪詞這一項。Ctrl+W 你想自己綁，綁不到。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 版本 | 2.1.238，08-20 18:01 UTC 發的，距這篇 6.1 小時。2.1.237 昨天還沒有條目，今天補上了：修 LLM gateway 和自訂 base URL 的 prompt caching，加一個 Concise output style。`stable` 還停在 08-11 的 2.1.228 |
| `keybindingFlavor` | 新設定。設 `"readline"` 之後 Ctrl+W 刪到前一個空白為止，跟 Bash 一樣。預設 `"classic"` 維持刪前一個詞 |
| MCP `headersHelper` | 專案 `.mcp.json` 裡的，還有 project 和 `--add-dir` agent 檔裡內嵌的 server，現在要那個資料夾的信任對話點過才跑，`claude -p` 底下也一樣 |
| helper 拿到的環境 | 專案、plugin、agent 檔來的 headersHelper 執行時看不到繼承下來的憑證環境變數。user、managed、claude.ai 範圍的改成從 Claude config 目錄跑 |
| marketplace `headersHelper` | url marketplace 和 catalog entry 可以宣告一個指令去生 HTTP header，抓 catalog 和同源 archive 時帶上。catalog entry 那種只在你自己 install/update 時跑，跑之前先把指令印出來問 `[y/N]` |
| 長 session 記憶體 | subagent 的工具結果一離開最近的顯示區間就釋放，不再一路累積 |
| output style | 自訂、專案、plugin 的 output style 不再在 session 中途漂回預設語氣 |
| Ctrl+L 和 Cmd+K | fullscreen 下只重繪。連按兩次等於 `/clear` 這個捷徑拿掉了 |
| `claude mcp list` | 停用的 server 直接標 Disabled，不再連上去做健檢 |

其餘大宗是 Remote Control。手機或網頁在 Claude 講到一半送出的訊息，不再在回合結束後從逐字稿裡消失；手機上換的模型會同步回終端機那一行；短暫斷網不再被判成登入過期。另外 `claude remote-control` 起的 session 不再繼承啟動它那個 shell 的 session 環境變數。cross-session messaging 那邊，對方拒收或佇列塞爆會回報給你了，不會靜靜地算成送達。self-hosted runner 多了 `--defer-shutdown-max-min` 跟兩個 `--proxy-authorization-*`。

## 為什麼要改

Ctrl+W 這件事拖很久了。`~/.claude/keybindings.json` 的 [Chat actions 表](https://code.claude.com/docs/en/keybindings)裡壓根沒有刪詞這個動作，你想自己綁也綁不到。GitHub 上抱怨的角度各不相同：#34539 要 macOS 的 Option+Delete，#49621 說 Windows 的 Ctrl+Backspace 在輸入框裡沒反應，#55730 直接要求把 `chat:deleteWordForward` 開出來。官方最後沒開放 rebind，改成給一個鍵讓你整組換掉。

headersHelper 那條是在補洞。[官方 MCP 文件](https://code.claude.com/docs/en/mcp)現在還寫著：

> `headersHelper` executes arbitrary shell commands. When defined at project or local scope, Claude Code runs it under the same workspace trust rule as hooks in settings files, so it runs in a `-p` session in a folder you've never trusted.

clone 一個陌生 repo、在裡面跑一次 `claude -p`，那個 repo 自帶的 `.mcp.json` 就能執行任意指令。2.1.238 關掉了。規則本身不新，`apiKeyHelper`、`awsAuthRefresh`、`gcpAuthRefresh`、`awsCredentialExport` 早就都在同一條裡面，headersHelper 是這版才被拉進來的，文件那段 Note 還沒跟著改。

## 對你的流程有什麼影響

1. `settings.json` 加 `"keybindingFlavor": "readline"`。這個鍵是唯一開關，`keybindings.json` 動不到 Ctrl+W。它也不像 2.1.235 的 `spellcheck` 有「只認 user settings」的守門，專案設定放得下去。
2. repo 裡有 project `.mcp.json` 走 headersHelper 的話，CI 那條會斷，runner 上是全新 clone，沒人點過信任對話。這點我在本機復現不出來：`claude mcp list` 在信任判斷之前就先被 `.mcp.json` 自己的 approval 閘擋住，兩個版本一模一樣，差別只在 `-p` 那條路。真的靠它就先在 CI 跑一次確認。
3. helper 腳本如果靠 shell 繼承下來的 token（`GITHUB_TOKEN` 這類），現在讀到的是空的。改成自己讀檔或讀 keychain。
4. 私有 marketplace 的 plugin 走 headersHelper 抓 archive 的話，背景自動更新不會跑那個指令，得你自己進 `/plugin` 更新。自己寫 catalog 的話順手把 `sha256` 釘上，marketplace 校驗會提醒這件事。
5. 開一整天的 session 不用再為了吃記憶體重開，升上來就有，沒有要設的東西。
6. `/config` 裡把 output style 切成 Concise 試一輪，2.1.237 起才有。改完要 `/clear` 或開新 session 才進 system prompt。
7. Ctrl+L 連按兩次清對話的手指記憶要改掉，現在只會重繪。要清就打 `/clear`。
8. 釘 `stable` 的機器還在 2.1.228，上面這些一條都收不到。

---

*版號、發版時間、dist-tags 來自 npm registry，條目引自官方 changelog。`keybindingFlavor` 的兩個值與預設值、`missing_trust` 原本涵蓋哪些 helper、憑證環境變數被清空、`sha256` 那句提醒，都來自比對 2.1.236 / 2.1.237 / 2.1.238 三份 linux-x64 執行檔（本機實測）。`keybindingFlavor` 在 settings 和 keybindings 兩頁都查不到，Ctrl+W 也不在 Chat actions 表裡，Note 那段引文出自 MCP 那頁（官方文件）。#34539、#49621、#55730 來自 web search（社群）。此環境 `api.github.com` 回 403，`pushed_at` 拿不到。*

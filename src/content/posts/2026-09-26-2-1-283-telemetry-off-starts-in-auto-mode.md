---
title: "2.1.283：關掉 telemetry 的 session 開始預設進 auto mode"
description: "旗標讀不到時的本地預設值從 false 翻成 true，所以關著 telemetry 的互動 session 不再退回 manual。同一份 config 實測，2.1.282 開在 manual，2.1.283 開在 auto。"
published: 2026-09-26
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "auto-mode", "telemetry"]
annotation: "翻的是一個 boolean，不是判斷邏輯。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.283 | 09-25 18:46 UTC 上 npm，距這篇 5.8 小時，94 條 |
| `stable` | 還停在 2.1.274，`latest` 和 `next` 都指 2.1.283 |
| 關掉 telemetry 的互動 session | 沒設 `permissions.defaultMode` 就開在 auto mode，2.1.282 開在 manual（本機實測） |
| `claude -p` | 不受影響，兩版都回 manual（本機實測） |
| `claude-ai` 這個名字 | 2.1.282 把它保留給 claude.ai 同步下來的 skill，這版還回來了（本機實測） |
| `/doctor prompt-audit` | 新入口，稽核 CLAUDE.md、skill、agent、command 裡為舊模型寫的寫法 |
| `availableModelsMatch`、`deniedModels` | 兩個新 managed setting，一個把 `availableModels` 鎖到指名的版本，一個當黑名單 |
| `/context` | MCP server instructions 獨立一列，也算進總數 |
| 雲端 session | 伺服器端重啟後重跑已完成的步驟，重複留言或重複 push，修了 |
| routine 排程 | 新建的預設落在整點過幾分，排在整點整的會晚幾分鐘才開始 |
| artifact 監看 | 自動掛上的那種 3.5 小時沒動靜就解除，你自己要求的不會 |
| `cmd /c rd` | Windows 的 PowerShell tool 之前能用它刪磁碟根目錄和家目錄，這版擋掉 |

沒細講的：MCP 連線那批修復、`claude plugin` 的十來條、vim mode 的 `J` 和 `.`、`keybindings.json` 的錯字警告、一堆清單加上滑鼠和翻頁鍵、Claude Tag 和 Code Review 各幾條。

## 為什麼要改

auto mode 當預設不是這版才開始的，伺服器早就在分批放。你一直沒被放到，因為 [permission-modes 文件](https://code.claude.com/docs/en/permission-modes)那張「session 從哪個模式開始」的表裡有這麼一列：

> | Feature-flag fetching is off | `default` |

旗標讀不到就退回 manual。telemetry 關著旗標就讀不到，於是這波放量一直繞過你。執行檔自己把這個因果寫進 debug log：

> rollout flag (tengu_plugin_hooks_modules) is off, from the default (GrowthBook is off for this session: a third-party provider, or telemetry opted out)

2.1.283 動的就是那個 from the default。管 auto 當預設的旗標叫 `tengu_harbor_willow`，schema 裡的名字是 `autoDefaultLaunchEnabled`，它讀不到時的本地預設值從 `false` 翻成 `true`。判斷邏輯一行沒改，翻的是那一個 boolean。所以關著 telemetry 的互動 session 現在拿到 auto。文件那張表還沒跟著改。

## 對你的流程有什麼影響

1. 先看 `~/.claude/settings.json` 的 `permissions.defaultMode` 有沒有值。沒有，而你又關著 telemetry，那 2.1.283 之後每個終端機 session 都開在 auto：

   ```json
   { "permissions": { "defaultMode": "default" } }
   ```

   同一份 config、同一個 `DISABLE_TELEMETRY=1`、同一個資料夾，2.1.282 的 footer 是 `⏸ manual mode on`，2.1.283 是 `⏵⏵ auto mode on`，並且多印一段 Auto mode is now Claude Code's default permission mode 的通知。把上面那段補進去，2.1.283 也回到 manual（本機實測）。

2. 想讓 shift+tab 連切都切不過去，用 `permissions.disableAutoMode: "disable"`，實測一樣壓得住。`defaultMode` 管的是開場，`disableAutoMode` 是整個拿掉。我自己只設 `defaultMode`，因為旁邊有人看著的時候我要能切進 auto。

3. CI 不用動。`claude -p` 的 stream-json `init` 兩個版本都回 `permissionMode: default`（本機實測），文件那張表也把 `-p` 和 Agent SDK 列成 `default`。

4. 昨天那條「`claude-ai` 底下的東西要改名」作廢。這版把這個名字還回來了，`~/.claude/skills/claude-ai/` 的 skill 在 2.1.282 列不出來、在 2.1.283 列得出來（本機實測）。`anthropic-skills` 沒還，那邊仍然只給同步下來的 skill。已經改過名的不必改回去，還沒動的別動了。

5. `/doctor prompt-audit` 跑一次，對著你那份 global `CLAUDE.md` 和累積下來的 skill。它不是新寫的稽核器，是把內建 `claude-api` skill 裡本來就有的 `prompt-audit` 接到 `/doctor` 底下。2.1.282 的執行檔裡那個 workflow 就在，只是沒有入口叫得動它。

6. `availableModelsMatch` 和 `deniedModels` 不用管，schema 上註明 Read from managed settings only。

7. 這個 repo 的出刊跑在雲端 session 上，「伺服器重啟後重複留言或重複 push」那條修掉了，不用改設定。routine 如果你排在整點整，changelog 說會晚幾分鐘才開始，往後挪個幾分鐘。

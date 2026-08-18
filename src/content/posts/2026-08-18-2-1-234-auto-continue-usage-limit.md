---
title: "2.1.234：撞到用量上限會自己接著跑，預設就是開的"
description: "自動續跑不用你去打開，社群介紹文說的「勾起來」是錯的。它只在互動 session 生效，程序一退出就取消。另外 teammateDefaultModel 這個鍵整個消失了。"
published: 2026-08-18
category: "Changelog"
tags: ["claude-code", "changelog", "usage-limit", "agent-teams", "settings"]
annotation: "`teammateDefaultModel` 在 2.1.234 的執行檔裡一次都沒出現。舊版有九處。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 版本 | 2.1.234，08-17 18:19 UTC 發的，距這篇 6.0 小時。`stable` 從 2.1.224 前進到 2.1.226（08-08 01:53 UTC 發的那支） |
| 用量上限自動續跑 | 撞到 claude.ai 的上限後等重置、自己接下去做。`/config` 那一列「Continue automatically at usage limit」預設值是開 |
| `teammateDefaultModel` | 官方寫「從 `/config` 拿掉」，實際上這個鍵在執行檔裡從九處變成零處。teammate 現在跟 leader 的模型 |
| 系統提示多一句 email 規則 | 你的帳號 email 只能用來標示身分，不准塞進 header、URL 或 payload |
| `claude-api` skill | 載入成本從 ~200k tokens 降到 ~25k，reference 文件改成要用才讀 |
| `\??\` NT 路徑 | 2.1.233 補的那個洞延伸到遠端讀檔、session restore、`CLAUDE.md` include、workflow script、檔案上傳 |
| `/permissions` 和 `/add-dir` | Claude 在跑的時候也能開，規則當回合就生效 |
| `CLAUDE_CODE_GOAL_CHECKIN_MINUTES` | `/goal` 卡在背景工作超過 30 分鐘會主動去看一眼，設 `0` 關掉 |

剩下四十幾條是 Remote Control 的狀態同步、queued `!` 指令的一堆邊角、markdown 算繪速度，還有 GitLab MR 徽章。

## 為什麼要改

自動續跑這件事外面喊很久了。anthropics/claude-code 上 #18980 和 #35744 兩張 feature request，社群還有 `claude-auto-continue`、`claude-autocontinue` 兩個 wrapper 在做同一件事：盯著時鐘，重置了就把 prompt 重送一次。官方版做在 session 內部，接的是原來那個 turn，不是重跑一遍。

[官方 changelog](https://code.claude.com/docs/en/changelog) 對 teammate 那條的寫法是「Removed the "Default teammate model" setting from `/config`」。讀起來像 UI 收掉、鍵還留著。不是。

## 對你的流程有什麼影響

1. CI 裡的 `claude -p` 不用管。自動續跑的守門是 `cO() && !As()`，也就是 `isInteractive()` 而且不在背景模式，headless 走不到那條路。
2. 互動 session 本來就是開的，不必去打開。那些介紹文都寫成「把這個 checkbox 勾起來」，`/config` 那一列的值在程式裡是 `?? true`。要關就 `/config`，或 `~/.claude/settings.json` 加一行 `"autoContinueAtUsageLimit": false`。
3. 這個鍵只認 user 層。`/config` 那一列出現的條件是設定來源為 undefined 或 `userSettings`，寫進 repo 的 `.claude/settings.json` 之後那一列會消失，只能回去改檔案。
4. 別當它是背景 daemon。程序退出、session 丟到背景、移交 Desktop、送上雲端，四種都會取消，執行檔裡各有一句對應的訊息。重置時間排到 24 小時以外也會停。所以它救得到的只有一種情況：你人在桌前撞到牆，然後去吃個飯。無人值守的長跑它幫不上忙。
5. 走 API key 或 usage-based 計費的話整段不會啟動，條件寫死 `billingType !== "usage_based"`，overage 期間也不進場。
6. 掃一下 `grep -n teammateDefaultModel ~/.claude/settings.json .claude/settings.json`，有就刪。它現在是死設定，不生效也不報錯。
7. 之前為了省 context 停掉 `claude-api` skill 的話，可以放回來了。

---

*版號、發版時間、dist-tags 來自 npm registry。2.1.234 的條目引自官方 changelog（官方文件）。#18980、#35744 和兩個 wrapper 來自 web search（社群）。守門條件、預設值、`teammateDefaultModel` 九處歸零、24 小時上限、四種取消訊息，來自本次下載並比對 2.1.233 與 2.1.234 的 linux-x64 執行檔（本機實測）。此環境 `api.github.com` 對 anthropics/claude-code 回 403，`pushed_at` 拿不到。*

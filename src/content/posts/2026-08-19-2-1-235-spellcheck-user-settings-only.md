---
title: "2.1.235：新增 spellcheck 設定，寫進 repo 的那份會被整塊丟掉"
description: "拼字檢查靠你自己裝的 aspell 或 hunspell，預設不開。這個區塊寫在 project 或 local 層會被忽略，官方 settings 文件的優先序表對它不成立。"
published: 2026-08-19
category: "Changelog"
tags: ["claude-code", "changelog", "spellcheck", "permissions", "settings"]
annotation: "贏的那一層是整塊蓋掉下面的。只放 language 而漏掉 enabled，整個功能就是關的。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 版本 | 2.1.235，08-18 18:24 UTC 發的，距這篇 6.0 小時。`latest` 和 `next` 都指它，`stable` 從 2.1.226 前進到 2.1.227（08-10 20:56 UTC 發的那支） |
| `spellcheck` | 新設定，用你自己裝的 `aspell` / `hunspell` / `ispell` 在輸入框畫底線。官方 settings 文件還沒收這個鍵 |
| 權限視窗的留言欄 | 在裡面按 Shift+Tab 會核准那次編輯，還順手發出整個 session 的編輯權限。這版修掉 |
| 「don't ask again」 | 選項寫的範圍現在跟真的會授出去的一致；內容顯示不全時這個選項直接不給 |
| 內建 `grep` | 原生 macOS/Linux build，`-m N` 配 `-A/-C` 印出來的 context 之前是錯的。病態 pattern 改成快速失敗，不再吃光記憶體 |
| prompt cache | language server 中途斷線或重連，不再讓整包 prompt cache 失效 |
| 背景雲端 session | `/ultrareview`、`/autofix-pr` 在背景跑的時候，事件流不再每次更新都重掃重畫 |
| context 上限錯誤 | 會講 auto-compact 是關的，並指去 `/config` 打開 |
| Agent 工具 | 沒有 general-purpose 的 session 漏填 `subagent_type`，改成列出可用 agent 的錯誤 |

剩下的是 vim NORMAL 模式在 ctrl+o 之後保留、ctrl+t 展開狀態、巢狀清單第三層對齊、slash command 顯示成 HTML entity、VSCode 分頁自己搶焦點這幾類。

## 為什麼要改

輸入框的拼字檢查外面要很久了。#16833 要 VSCode 擴充加上，#72247 要 Desktop 開放語言設定。#58693 是反過來的抱怨：Desktop 那邊關不掉，德文 Windows 配英文輸入，每個字都被畫紅線，這張單從 5 月開到現在還沒關。CLI 這版預設不開，字典也由你指定，兩個坑都繞過去了。

[官方 settings 文件](https://code.claude.com/docs/en/settings) 把優先序寫得很清楚，Managed、命令列、Local、Project、User，user 層最低。`spellcheck` 不照這張表走。執行檔裡有一句話專門講它：project 或 local settings 裡的 `spellcheck` 區塊會被忽略，不管你在那邊配了什麼，要設就設在 `~/.claude/settings.json`。那張表列的例外只有 managed settings，沒提這個鍵。

## 對你的流程有什麼影響

1. 先看機器上有沒有 checker，`which aspell hunspell ispell`。一個都沒有的話這功能靜默不開，只留一句 `[spellcheck] no checker found on PATH`。找的順序寫死是 aspell、hunspell、ispell。
2. 區塊寫進 `~/.claude/settings.json`，別寫進 repo 的 `.claude/settings.json`：

   ```json
   { "spellcheck": { "enabled": true, "language": "en_US" } }
   ```

   放錯的話它會提醒你一次，但那整塊設定就是不生效。我不會為了團隊共用去賭這個例外哪天會改。
3. `"enabled": true` 要明寫。贏的那一層是整塊蓋掉下面的，不是逐鍵合併，所以只放了 `language` 卻漏掉 `enabled`，整個功能就是關的。另外兩個鍵是 `checker`（預設 `auto`）和 `color`。
4. `language` 也明寫。不設就吃 checker 的預設字典，中英混打或滿篇專有名詞時，畫面就是 #58693 那位在抱怨的樣子。
5. Shift+Tab 那條更新就好，不用回頭稽核。誤發出去的是 session 級的編輯權限，程序關掉就沒了，不會留進 `settings.json`。
6. 有腳本或 hook 靠 `grep -m N` 配 `-A`/`-C` 取 context 的，之前拿到的內容是錯的，值得重跑一次。只影響原生 build。
7. 釘 `stable` 的話這篇一條都還沒到你手上，它落後 `latest` 七個版本。`npm view @anthropic-ai/claude-code dist-tags` 看一眼自己在哪條線上。

---

*版號、發版時間、dist-tags 來自 npm registry。2.1.235 的條目引自官方 changelog（官方文件）。#16833、#58693、#72247 來自 web search 與 GitHub issue 頁面（社群）。`spellcheck` 的四個鍵、只認 user 層、整塊覆蓋、checker 搜尋順序，來自本次下載並比對 2.1.234 與 2.1.235 的 linux-x64 執行檔（本機實測）。此環境 `api.github.com` 回 403，`pushed_at` 拿不到。*

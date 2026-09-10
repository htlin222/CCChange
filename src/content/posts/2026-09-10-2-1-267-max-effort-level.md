---
title: "2.1.267：maxEffortLevel 變成你能寫的設定鍵，跨檔案是最小值贏"
description: "effort 上限本來只能從組織那邊發下來，而且只在 first-party 和 gateway 生效。現在你自己寫得了，Bedrock 和 Vertex 也管得到，但合併規則跟其他設定鍵反過來。"
published: 2026-09-10
category: "Changelog"
tags: ["claude-code", "changelog", "settings", "effort", "prompt-cache"]
annotation: "設下去之後，沒有臨時放行的路。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.267 | 09-09 18:25 UTC 發，五十幾條 |
| `maxEffortLevel` | 進了設定檔 schema，頂層或 `modelSettings.<模型>` 底下都能寫，Bedrock、Vertex、Foundry 一起管 |
| 這個鍵的合併規則 | 跨設定檔取最小值，不是層級近的那個贏 |
| clamp 得到什麼 | `/effort`、`/model` 選的、`--effort`、`CLAUDE_CODE_EFFORT_LEVEL`、模型預設值 |
| clamp 不到什麼 | `CLAUDE_CODE_EXTRA_BODY` 裡塞的 effort |
| `--system-prompt-snapshot off` | changelog 寫 Added，help 字串在 2.1.266 一字不差（本機實測） |
| prompt cache | 十幾條在修同一件事：session 中途加工具、切模型、resume 都會改寫 prompt 前綴 |
| managed 的白名單 | `allowedHttpHookUrls` 這類讀不到時原本全放行，改成全擋 |
| `effort:` frontmatter | Opus 4.7、4.8、Fable 5 上原本整行被忽略 |

沒細講的：marketplace 路徑帶反斜線可以繞過 containment 檢查、`/context` 在手機端印空白、5 MB 以上的 session resume 會掉平行工具呼叫和它們的 hook 輸出、VS Code 的 CRLF 和 RTL 兩條。

## 為什麼要改

effort 上限本來就在，只是輪不到你設。2.1.266 的二進位裡 `maxEffortLevel` 出現三次，全部在從 API 收回來的模型清單那條路上，而那個函式第一行就是 provider 不是 `firstParty` 也不是 `gateway` 就 `return null`。走 Bedrock 或 Vertex 的人碰不到（本機實測）。

2.1.267 把它加進設定檔 schema，值域 `low` `medium` `high` `xhigh` `max`。[官方文件](https://code.claude.com/docs/en/model-config)講得很白：超過上限的等級不會出現在 `/effort` 選單，硬用 `--effort` 指一個更高的，跑起來還是上限那個。

麻煩在合併規則。同一份檔案裡 `modelSettings.<模型>.maxEffortLevel` 蓋掉頂層的，寫 `"max"` 就是這個模型豁免。跨檔案是另一回事：binary 的說明字串寫 across settings files the lowest value wins，文件那張表講同一件事，使用者層設得比 managed 更嚴照樣算數。你熟的那套「近的蓋遠的」在這裡不成立。

擋得住多少也寫在同一段裡：Enforced client-side: an effort supplied through CLAUDE_CODE_EXTRA_BODY is not clamped。它壓的是 client 送出去之前那一步，不是伺服器在把關。

值不值得設，看 catalog 裡 Opus 5 那筆的 `effort_cost_index`：low 0.67、medium 0.76、high 1、xhigh 1.6、max 1.7，預設 high（本機實測）。官方對 max 的評語也不客氣，寫的是 diminishing returns、prone to overthinking。

## 對你的流程有什麼影響

1. `~/.claude/settings.json` 加一行：

   ```json
   { "maxEffortLevel": "xhigh" }
   ```

   max 那一格是 high 的 1.7 倍，換來一個官方自己說會 overthinking 的東西。加完 `/effort` 選單裡就看不到 max 了。

2. 加之前先認清一件事：這個鍵沒有臨時放行的路。`--settings` 另指一份檔案寫 `"max"` 不會鬆綁，跨檔案取最小。要解開只能回去改那一行。`effortLevel` 的脾氣不是這樣，別把手感帶過來。

3. 只想管一個模型就寫進 `modelSettings`：

   ```json
   { "modelSettings": { "claude-opus-5": { "maxEffortLevel": "xhigh" } } }
   ```

   key 照 canonical name 寫就好。binary 裡說它同時 match dated、`[1m]`、Bedrock 和 Vertex 的拼法，`claude-opus-5[1m]` 和 `us.anthropic.claude-opus-5` 不用另外列一行。

4. 別把它當花費的保險。會被 clamp 的來源就是上面表格那一列，`CLAUDE_CODE_EXTRA_BODY` 不在裡面，skill 和 subagent 的 `effort:` frontmatter 也不在。你有 wrapper 在動那個環境變數的話，上限對它沒有作用。

5. `--system-prompt-snapshot off` 先別加進 wrapper。它在 2.1.266 就長這樣，help 文字連標點都沒動，這條 Added 補的是文件不是功能。它自己最後一句還寫著 No effect where system-prompt recording is not yet enabled，你的帳號沒開就是白加。

6. 你的 skill 和 subagent 如果寫了 `effort:`，而你跑在 Opus 4.7、4.8 或 Fable 5，那行之前等於沒寫。升上來才開始算數。挑一個平常在跑的 subagent 走一遍，看行為跟你當初寫那行時想的一不一樣。

7. prompt cache 那一串不用改設定。2.1.265 補的是 subagent 那兩條，這次補 MCP server 重連、`/model` 切換、5 MB 以上 resume。看 `/cost` 的 cache read 就知道有沒有省到。

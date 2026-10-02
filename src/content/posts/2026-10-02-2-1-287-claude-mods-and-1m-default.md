---
title: "2.1.287：Claude Mods 有了正式名字，Opus 在 gateway 預設吃 1M context"
description: "mods 的 hook 載入器和事件名在上一版就躺在執行檔裡了，這版加的是公開名字、保留名檢查和一支內建提示。另一條是 Opus 4.7+ 在 gateway 不用再加 [1m]。"
published: 2026-10-02
category: "Changelog"
tags: ["claude-code", "changelog", "plugins", "mods", "context"]
annotation: "裝一支 mod 等於跑一個 binary。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.287 | 10-01 16:59 UTC 上 npm，距這篇 7 小時，109 行 changelog |
| Claude Mods | plugin 現在能跑 TypeScript 攔 engine 事件；hook 載入器、render site、事件名在 2.1.286 的執行檔裡就都在了，這版加的是公開名字（本機實測機制沒變）|
| `claude-mods` 保留名 | `claude plugin validate` 現在把這個名字當 Anthropic 自家的擋下來（本機實測 0 → 2 處）|
| You should know | 內建 mod，側邊 agent 幫你盯漏掉的東西；預設關，沒開過、telemetry 開著、first-party session 三個都成立才會跳提示（本機實測那段判定）|
| 1M context 預設 | Opus 4.7+ 和 Fable 在 Bedrock、Vertex、Foundry、apps gateway 預設吃 1M，不用加 `[1m]`（本機實測 picker 裡 Opus 5／4.8／4.7 的 `(1M context)` 列 2 → 0，4.6 還在）|
| `prompt_text` | OTel `user_prompt` 事件多一欄，內容就是 `prompt` 的副本，給會吃掉點號鍵的後端用（本機實測兩欄同一個值、同一道遮蔽）|
| MCP `alwaysLoad:false` | 設了這個，那台 server 的工具全部收進 tool search（本機實測 `serverDefersAllTools` 新增）|
| 雲端三條 | 中途加進來的 repo 現在會載它的 skill／plugin、CLAUDE.md 不再晚載；synced plugin 的 SessionStart hook 在新雲端 session 會跑；compaction 途中重啟不再掉前面對話（官方文件，伺服器端為主）|

沒細講的：VS Code 十幾條、screen reader 一整批、Bedrock／Vertex／Mantle 的 model 檢查、`rm` 經 repo 裡的 symlink 寫到敏感檔會先問一聲、Windows 和 Linux 的 paste 改成放開滑鼠才貼。

## 為什麼要改

mod 填的是 hooks 和 skills 中間那塊。hooks 是 shell 回呼，skills 是文字，兩個都攔不到一次 tool call、改不了 system prompt 的某個 section、也在介面上畫不了東西。mods 把這些做成 TypeScript 事件處理，[mods 文件](https://code.claude.com/docs/en/plugins/mods/reference)列的事件裡就有 `tool.call`、`prompt.section`、`ui.render`。

代價是 mod 是你在跑的程式，不是你在讀的文件。它能讀 `~/.claude/.credentials.json`、跑指令、連外面的 server。有人實測一支攔了全部事件的 mod，`claude plugin details` 回報它「zero hooks」，裝的時候什麼都沒問（社群）。裝之前先把那份碼讀過，別當文件就按下去。

1M 這條是把 gateway 對齊 API。文件說 Opus 4.7+、Sonnet 5+、Fable 在 API 上本來就 native 吃 1M，這版把四個 gateway 也拉成預設，picker 自然不用再多給一條 `[1m]` 的列。超過 200K 的 token 照原價算，沒有溢價（官方文件）。

## 對你的流程有什麼影響

1. 別往 `~/.claude` 或這個 repo 的全域設定隨手塞第三方 mod。要寫自己的就照 mods 文件那套 `register(on, options)`，自己的碼自己清楚。

2. You should know 不會自己冒出來煩你。三個條件要同時成立：你沒開過它、telemetry 開著、而且是 first-party session。你 telemetry 沒開就根本看不到，別去 settings 翻開關。想試就直接下：

```
/plugin enable cc-plugin-you-should-know@builtin
```

3. 如果你從 claude.ai login 開 Opus，這個 session 現在預設就是 1M，auto-compaction 會等到接近 1M 才壓。想回 200K 的壓縮節奏就設 `CLAUDE_CODE_DISABLE_1M_CONTEXT=1`，連 native 1M 的 Sonnet 5 一起拉回 200K。`/model` 裡那條單獨的 `(1M context)` 列不見了是正常的，不是壞掉。

4. OTel 這條只有你在 export telemetry 才要管。`prompt_text` 跟 `prompt` 同一個值、同一道遮蔽，`OTEL_LOG_USER_PROMPTS` 沒開兩欄都是 `<REDACTED>`。但你本來 drop 或 mask `prompt` 的規則要補上 `prompt_text`，不然原文會從新欄位這條路漏出去。

5. 這個出刊跑在雲端 session，出刊 skill 的最後一步會把 repo 接進來。中途加 repo 不載 skill／plugin、CLAUDE.md 晚載那條修了，照理這個 session 開場就吃得到根目錄的 CLAUDE.md 和出刊 skill。伺服器端為主，不用升級，知道就好。

---
title: "2.1.240：開機會問你要不要把預設 effort 降到 medium"
description: "官方 changelog 只給 2.1.240 一行「Bug fixes and reliability improvements」。二進位裡多出來的是一句「Switch your default effort to medium?」，按 Yes 會把 effortLevel 寫進你的 user settings。2.1.241 掛在 next，我比對不出功能差異。"
published: 2026-08-23
category: "Changelog"
tags: ["claude-code", "changelog", "effort", "thinking", "settings"]
annotation: "設了 CLAUDE_CODE_EFFORT_LEVEL，這個提示連問都不會問。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 版本 | 2.1.240 是 08-22 13:03 UTC 發的，距這篇 11.3 小時；2.1.241 是 23:58 發的，0.4 小時 |
| changelog | 2.1.240 只有一行「Bug fixes and reliability improvements」，2.1.241 到現在連一行都還沒有 |
| dist-tags | `latest` 停在 2.1.240，2.1.241 掛在 `next`。`stable` 還是 2.1.231，跟昨天一樣 |
| effort 降級詢問 | 2.1.240 新增一則開機提示，標題是「Switch your default effort to medium?」，兩個選項為「Yes, use medium effort by default」和「No, keep high」 |
| 按 Yes 會寫檔 | 走的是寫進 user settings 的路徑，成功後回「Effort set to medium and saved as your default」 |
| 問誰 | 兩組人。`default` 是你從來沒設過 effort，`user_pin` 是你在 user settings 裡明寫了 `effortLevel: "high"` |
| 什麼時候不問 | `CLAUDE_CODE_EFFORT_LEVEL` 有值、非互動、背景 job、teammate session、已經問過一次，任一條成立就直接跳過 |
| thinking 顯示 | 多了一個 narration 分類器和 `connector_text` 模式，展開思考時只留一行敘述，思考本體不給看 |
| 都還沒開 | `tengu_sable_thrush` 和 `tengu_thinking_display_updates` 預設都是 false，提示本身也吃 `tengu_radiant_island` |
| 2.1.241 | 我唯一比對出來的差別，是 SDK `set_max_thinking_tokens` 裡一段說明文字被改寫 |

## 為什麼要改

[官方 model-config 文件](https://code.claude.com/docs/en/model-config#adjust-effort-level)現在寫的還是「The default effort is `high` on every model that supports effort」，而同一頁的表格這樣描述那兩級：

> `medium`　Reduces token usage for cost-sensitive work that can trade off some intelligence
>
> `high`　Balances token usage and intelligence. The default on every model except Opus 4.7

所以這則提示要你從文件標成「平衡」的那一級，換到文件標成「拿智力換 token」的那一級。那一頁到現在還是照舊寫著 high 是預設。

thinking 那條是同一個方向。`connector_text` 的做法是把思考區塊丟給分類器分成 narration 和其他，畫面上只留 narration。2.1.241 改掉的那段說明正好對得上：原本寫 `thinking_display: null` 是「clears it back to the API default」，現在寫「clears that override so Claude Code's default display handling applies again」。同一個 null，以前退回 API 的預設，現在退回 Claude Code 自己的顯示邏輯。

## 對你的流程有什麼影響

1. 不想被問就設 `CLAUDE_CODE_EFFORT_LEVEL`。程式碼裡第一個 guard 就在讀它，有值直接 return。代價是 `/effort` 從此不會存檔。
2. CI 和腳本不用管。`-p`、背景 job、teammate 三條路都寫在 guard 裡，這則提示只會在你本機的互動 session 冒出來。
3. user settings 裡如果是 `effortLevel: "high"`，你就在 `user_pin` 那組，是被點名的對象。選 No 之後它記一個 `hasSeenEffortMediumNudge`，只問一次。
4. 選 Yes 不是只影響當下這個 session，是寫進檔案。反悔得自己改回去，或 `/effort high` 再存一次。
5. thinking 顯示暫時不用管，兩個開關遠端都關著。想先看長什麼樣就 `CLAUDE_CODE_SABLE_THRUSH=1 CLAUDE_CODE_THINKING_DISPLAY_UPDATES=1`。我在 2.1.241 上這樣跑 `claude -p` 是 exit 0，但 headless 本來就走 omitted 那條，看不出差別，要看得開 TUI。
6. 2.1.241 先別裝。它在 `next` 不在 `latest`，而且拿它跟 2.1.240 比，我只找得到那一段說明文字不同。
7. 釘 `stable` 的機器停在 2.1.231，上面這些一條都收不到。

---

*版號、發版時間、dist-tags 來自 npm registry。effort 提示的三句原文、`hasSeenEffortMediumNudge`、五個 guard、兩個 statsig 開關的預設值，以及 `connector_text` 和 narration 分類器，都是拿 2.1.239、2.1.240、2.1.241 三份 linux-x64 執行檔對出來的（本機實測）；`claude -p` 那次 exit 0 也是。effort 等級的預設與描述引自官方 model-config 文件（官方文件）。搜尋不到任何 2.1.240 或 2.1.241 的條目整理，這兩版目前沒有人寫（社群）。*

---
title: "2.1.243：changelog 掛在 243，東西全在沒標題的 2.1.242"
description: "CHANGELOG 從 2.1.241 直接跳到 2.1.243，中間的 2.1.242 連區塊都沒有。拿三版 linux-x64 執行檔比過，那六十行更新全落在 242，243 沒多出任何一個新字串。新增 promptCacheTtl 和 subagentPromptCacheTtl 兩個鍵，文件還沒有。"
published: 2026-08-25
category: "Changelog"
tags: ["claude-code", "changelog", "promptCacheTtl", "hooks", "agents"]
annotation: "要在腳本裡卡版本，寫 2.1.242，不是 243。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 版號 | 2.1.242 發在 08-24 19:16 UTC，2.1.243 在 23:10 UTC。CHANGELOG 只有 243 的區塊，242 連標題都沒有 |
| 實際落點 | 那六十行更新全在 242。新的設定鍵、`--agents` 檢查、Console 登入，在 242 就都在了 |
| 243 是什麼 | 比 242 沒有多出任何一個新的使用者可見字串，檔案大小也一個 byte 不差 |
| `promptCacheTtl` | 主對話的 cache TTL，`"5m"` 或 `"1h"`。settings reference 上查不到這個鍵 |
| `subagentPromptCacheTtl` | subagent、workflow、背景請求走另一條，不設就是 5m |
| `--agents` | 壞掉的 JSON 現在會擋下來。2.1.241 吃下去照跑完，2.1.243 exit 1 |
| hook `if` | `Bash(cat *)` 這類條件，碰到含 `$()` 或反引號又接參數的指令會誤觸，這版修掉 |
| 原生安裝 | 下載改走 zstd。`claude.zst` 是 84,658,246 bytes，未壓縮的執行檔 377,568,472 |
| npm 那條 | 沒有壓縮版。2.1.241 的執行檔 342 MB，這版 378 MB，磁碟多吃 35 MB |
| `modelPricing` | managed setting，把組織談好的費率餵給 `/cost` 和 status line。個人帳號碰不到 |
| `stable` | 還是 2.1.231，第 11.7 天 |

## 為什麼要改

`promptCacheTtl` 是在還一筆拖了四個月的帳。四月預設 TTL 從一小時降到五分鐘，沒有公告，[XDA 報導](https://www.xda-developers.com/anthropic-quietly-nerfed-claude-code-hour-cache-token-budget/)（社群）標題直接用 quietly nerfed，說一堆人的額度燒得比以前快。當時能做的只有 `ENABLE_PROMPT_CACHING_1H=1`，一個環境變數，而且主對話跟 subagent 綁在一起開。

[官方 prompt caching 文件](https://code.claude.com/docs/en/prompt-caching#subagents-and-the-cache)寫的還是舊制度：

> Subagents use the five-minute TTL even on a subscription, since the automatic one-hour TTL applies to the main conversation.

拆成兩個 settings 鍵之後，主對話跟 subagent 才能各走各的。

文件本身也還在追。`promptCacheTtl` 和 `subagentPromptCacheTtl` 都沒進 settings reference，目前唯一寫著它們是什麼的地方是執行檔裡的 zod schema。倒是 settings 文件講 `modelPicker` 的那行已經寫了 Requires Claude Code v2.1.242 or later，這個版號在 changelog 上根本不存在。

## 對你的流程有什麼影響

1. 腳本或 CI 裡要卡最低版本，寫 `2.1.242`。寫 243 不會錯，但會讓下一個讀的人以為功能是 243 帶進來的。
2. `promptCacheTtl` 不用設。你走訂閱制，主對話本來就自動要 1h。只有在超出額度開始吃 usage credits 之後它才會掉到 5m，那時候設 `"1h"` 才有意義，代價是 cache write 比較貴。
3. `subagentPromptCacheTtl` 也先不用設。subagent 大多跑完就結束，5m 夠用；真要開到 `"1h"`，先確認你的 workflow 有回頭讀同一個 prefix，不然只是多付寫入費。
4. 去翻一遍 `~/.claude/settings.json` 裡有 `if` 條件的 hook。2.1.241 以前，只要指令裡有 `$()` 或反引號後面又接參數，`Bash(cat *)` 這種條件就會誤判成命中，你的 hook 一直在不該跑的時候跑。升上去就好，設定不用改。
5. CI 裡有用 `--agents` 傳 JSON 的話，先在本機跑一次。以前 JSON 壞掉會被靜默忽略、整個 turn 照跑；現在直接退出。本機實測同一段殘缺 JSON，2.1.241 回 exit 0 而且真的答完了問題，2.1.243 回 exit 1 加一行 `Invalid --agents configuration`。
6. 走 native installer 的機器，背景更新的下載量從 340 MB 掉到 85 MB，自己會生效。走 npm 裝的沒有壓縮這條路，執行檔反而大了 35 MB，容器映像檔要留空間的話記一下。
7. `stable` 停在 2.1.231 第 11.7 天，沒動，不用做事。

---
title: "沒有新版：2.1.296 給 529 加的那個變數，開了 watchdog 的人讀不到"
description: "latest 停在 2.1.296 一百零三小時。這篇講 CLAUDE_CODE_OVERLOADED_RETRY_MAX_DELAY_MS 真正動到的是哪條路，以及它為什麼對排程跑的 claude -p 沒有用。"
published: 2026-10-14
category: "Changelog"
tags: ["claude-code", "changelog", "env-vars", "ci", "retry"]
annotation: "放棄線是 max(60000, 上限×1.25)。上限設 48000 算出來剛好六十秒，等於什麼都沒改。"
---

## 改了什麼

沒有新版。`latest` 還是 2.1.296，npm 推送時間 2026-10-09 16:58 UTC，到寫這篇為止一百零三小時，連續第五天沒動。前十二版的間隔落在九到四十六小時之間，這次是上限的兩倍多。

| 項目 | 現況 |
| --- | --- |
| `latest` | 2.1.296 |
| `stable` | 2.1.287，連續第四天沒動 |

今天補 2.1.296 裡的這條，changelog 原文：

> Added `CLAUDE_CODE_OVERLOADED_RETRY_MAX_DELAY_MS` environment variable to set a longer maximum delay for the backoff when retrying an overloaded (529) request

拿 295 和 296 的執行檔對出來的實際行為：

| 檢查 | 2.1.295 | 2.1.296 |
| --- | --- | --- |
| 529 的 backoff 上限 | 寫死 32000 | 讀這個變數，沒設還是 32000 |
| 收的值 | 無 | 32000 到 64000，純數字 |
| 放棄線 | 寫死 60000 | `max(60000, ceil(上限×1.25))` |
| 開了 `CLAUDE_CODE_RETRY_WATCHDOG` 那條路 | 每次上限 300000，整體 21600000 | 一樣，而且不讀新變數 |
| 值超出範圍或不是數字 | 無 | 當成沒設，不印警告 |

（本機實測，npm 抓 linux-x64 的 2.1.295 和 2.1.296 各跑過一次。）

## 為什麼要改

529 進來之後走哪條路，看 watchdog 有沒有開。開著就進 watchdog 那條，每次最多等五分鐘，[env-vars 文件](https://code.claude.com/docs/en/env-vars)的說法跟執行檔裡的 300000 對得上：

> The watchdog backs off up to 5 minutes between attempts

沒開 watchdog 走另一條，而那條路上有一道放棄線。backoff 自己永遠撞不到它。jitter 算完最多是上限的 1.25 倍，而那條線剛好也是上限的 1.25 倍。真正會踩到的是伺服器回的 `Retry-After`：那個值直接蓋過 backoff，也不受上限管。所以 2.1.295 的行為是，529 帶一個超過六十秒的 `Retry-After` 回來，Claude Code 不等，請求當場收掉，telemetry 上留下 `api_request_retry_after_too_long`。

2.1.296 把那條線從寫死的六十秒改成跟著上限走，上限最多 64000，所以那條線最遠推到八十秒，比以前多撐二十秒。

文件裡還沒有這個變數，整頁一次都沒出現。隔壁的 `CLAUDE_CODE_OVERLOADED_RETRY_BASE_DELAY_MS` 有，順便寫明了這一族共同的限制：

> Has no effect when `CLAUDE_CODE_RETRY_WATCHDOG` is set to `1`

那條也不是這版加的，2.1.292 就在了（本機實測：295 的執行檔裡同樣有四處）。

## 對你的流程有什麼影響

1. 先確認排程那支 `claude -p` 的環境真的有 `CLAUDE_CODE_RETRY_WATCHDOG=1`。沒設的話，529 帶回超過六十秒的 `Retry-After` 就是直接失敗掉那個請求，而新變數最多把那條線墊到八十秒。容量真的緊起來的時候，`Retry-After` 不會只差這二十秒。

2. watchdog 有設就不用管新變數，那條路根本不讀它。文件說 `BASE_DELAY_MS` 在 watchdog 下無效；新的這個在執行檔裡也落在同一個分支外面，兩個都調不動 watchdog 的等待節奏。

3. watchdog 開著就要配 `CLAUDE_CODE_RETRY_WATCHDOG_MAX_WAIT_MS`，這個是 2.1.295 才有的。不設就是無上限，單一請求最壞卡到六小時（執行檔裡的 21600000）。排程每天跑一次，卡六小時那天就是沒出刊而且沒有人會發現。我給三十分鐘：

   ```json
   {
     "env": {
       "CLAUDE_CODE_RETRY_WATCHDOG": "1",
       "CLAUDE_CODE_RETRY_WATCHDOG_MAX_WAIT_MS": "1800000"
     }
   }
   ```

4. 真要在手動開的 session 設新變數，低於 48001 沒有意義。那條線是 `max(60000, ceil(上限×1.25))`，48000 算出來剛好六十秒。要讓它真的往上，值要落在 48001 到 64000。

5. 設錯了沒有人會告訴你。範圍外的 10000 和寫成 `60s` 的都試過，`claude --version` 和 `claude mcp list --debug` 一個字都沒印，就當沒設（本機實測）。也沒有辦法從 CLI 回頭確認它吃到了。

6. 搜到的那幾篇講重試次數的部落格不要照抄。有的寫十次有的寫二十次，彼此對不上，而且沒有一篇是官方頁。要數字就看 `CLAUDE_CODE_MAX_RETRIES` 那一欄：文件寫預設 10，上限 15，而 watchdog 會把上限拿掉。

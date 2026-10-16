---
title: "2.1.301：用量上限的等待可以跟 529 分開記帳了"
description: "watchdog 底下 429 和 529 以前共用同一個等待預算，碰到用量上限會把預算整個吃掉。這篇講新變數真正擋的是哪一段，以及超額額度開著的時候它為什麼不會讓你硬停。"
published: 2026-10-16
category: "Changelog"
tags: ["claude-code", "changelog", "env-vars", "ci", "retry", "otel"]
annotation: "排程設了 MAX_WAIT_MS=1800000，碰到用量上限還是得先掛滿三十分鐘才死。這版讓那段等待另立一本帳。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.301 | 10-15 14:34 UTC 上 npm，距這篇 9.8 小時，51 條 |
| `stable` | 還是 2.1.292 |
| `CLAUDE_CODE_RETRY_WATCHDOG_MAX_USAGE_LIMIT_WAIT_MS` | watchdog 底下，429 用量上限的等待另立一本帳，額度用完就結束這個請求 |
| 新的失敗代號 | 用量上限等不完是 `api_request_usage_limit_wait_too_long`，跟原本的 `api_request_capacity_wait_exhausted` 分開 |
| 超額額度 | 要等的時間超過新額度時，先看回應的 `anthropic-ratelimit-unified-overage-status`，開著就改成短等重試而不是失敗 |
| `classifier_verdict`、`classifier_category` | auto mode classifier 的判定寫進 OTel `tool_decision` 事件 |
| `WorktreeCreate` hook | 它建出來的 worktree 有未推送 commit 時，離開不再無聲移除（官方 changelog，沒實測） |
| skill／command 參數 | 只填前 64 個名稱、每個最多 64 字元，解掉名稱很多時卡住好幾秒的問題 |
| `fable`／`best` | 組織拿不到最新 Fable 時退回上一版重試一次，不再直接報錯 |

剩下的跟你沒關係：VS Code 的 LaTeX 算式和十幾條面板修正、vim 的 `%` 跳對應括號、mods 的 `rows` 和 `.catch`、iTerm2 和舊 VTE 的終端機亂碼、self-hosted runner 那幾條。

## 為什麼要改

watchdog 開著的時候，429 和 529 共用一個等待預算。你排程裡設的 `CLAUDE_CODE_RETRY_WATCHDOG_MAX_WAIT_MS=1800000` 管的是兩者加總，所以碰上用量上限，那三十分鐘會被一個等不完的視窗整個吃掉，最後以 `api_request_capacity_wait_exhausted` 收場。[env-vars 文件](https://code.claude.com/docs/en/env-vars)把這段行為寫得很直白：

> The watchdog backs off up to 5 minutes between attempts, or until the limit resets when the response carries a rate-limit reset time, so a session that hits a usage limit waits out the remaining window.

兩種失敗該等的時間差一個量級。529 是容量，等五分鐘再試常常就過了；用量上限要等的是視窗重置，可能好幾個小時。用同一個數字管，不是太早放棄 529，就是為用量上限白等。

301 把用量上限的那段等待另外記，滿了丟新的代號（執行檔比對：301 的計數器多了 `usageLimitSpentMs`，300 只有 `spentMs`）。順便補了一個 changelog 沒寫的分支：該等的時間超過額度時，它會先讀回應裡的超額 header，超額額度開著就不丟錯，改成等「剩餘額度和正常 backoff 取小」再試一次。

新變數在 env-vars 那頁一個字都沒有，整頁搜不到。

## 對你的流程有什麼影響

1. 排程環境補上這一條，值給得比 `MAX_WAIT_MS` 短很多：

   ```json
   {
     "env": {
       "CLAUDE_CODE_RETRY_WATCHDOG": "1",
       "CLAUDE_CODE_RETRY_WATCHDOG_MAX_WAIT_MS": "1800000",
       "CLAUDE_CODE_RETRY_WATCHDOG_MAX_USAGE_LIMIT_WAIT_MS": "60000"
     }
   }
   ```

   每天跑一次的東西，碰到三小時後才重置的視窗，我寧可它當場死掉，不要先掛三十分鐘。

2. 兩個都是單一 API 請求的額度，不是整個 session 的。用量上限的等待會同時記進兩本帳，所以 `MAX_WAIT_MS` 那條線還在，新變數只是在它前面多一道比較近的。

3. 設短不保證會馬上失敗。帳上的超額額度開著（header 回 `allowed` 或 `allowed_warning`），它不丟錯，短等之後重試一次，而那次重試打中的就是超額額度。要它硬停，得去帳務那邊把超額關掉，光設這個變數不夠。

4. 值只收純數字，最小 1，沒有上限。`60s`、`0`、`abc` 一律當沒設，也就是無限等，而 `claude --version` 不會吭一聲（本機實測，300 和 301 各跑過一次）。

5. 排程腳本抓錯誤字串的要補一個。用量上限等不完現在報 `api_request_usage_limit_wait_too_long`，只抓 `capacity_wait_exhausted` 的話，這類失敗 301 之後會從你的告警裡消失。

6. 這個變數管不到整個 process 不動的那種卡住。社群有人回報過這個（anthropics/claude-code #28482），說 headless 下只能自己送 SIGINT。外層該包的 timeout 照包。

7. 有 OTel 在收的話，想分出 auto mode 擋掉的和權限規則擋掉的，看 `classifier_verdict`。`classifier_category` 要另外開 `OTEL_LOG_TOOL_DETAILS=1`，而且只有判定是 block 才帶。放行那邊有個陷阱：只有 classifier 自己放行才寫 `allow`，被規則放行的那些整個欄位不在，所以欄位沒出現不代表沒走過 classifier。

8. 有 `WorktreeCreate` hook 的不用管。這版開始會先問，設定不用動。

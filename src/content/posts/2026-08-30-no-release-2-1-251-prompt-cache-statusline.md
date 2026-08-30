---
title: "沒有新版：2.1.251 的 prompt_cache 進了狀態列，執行檔內建的說明沒收"
description: "latest 停在 2.1.251 已經 32.6 小時。趁空檔把上一版加的快取統計接進狀態列，順手發現執行檔裡那份 statusLine 說明只補了 spend_limit，沒補 prompt_cache。"
published: 2026-08-30
category: "Changelog"
tags: ["claude-code", "changelog", "statusline", "prompt-cache", "cost"]
annotation: "你叫 Claude 幫你加這個欄位，它會照一份沒有這個欄位的說明去寫。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 新版 | 沒有。npm 的 `latest` 還是 2.1.251，08-28 15:34 UTC 發的，距這篇 32.6 小時 |
| `next` | 也是 2.1.251 |
| `stable` | 2.1.236，08-19 18:45 UTC 發的，十天沒動，後面已經疊了 13 個版本 |
| `prompt_cache` | 2.1.251 給狀態列加的物件，十二個欄位。主對話拿到第一次 API 回應之前，這個 key 整個不存在 |
| `/usage` 的 `Prompt cache (main)` | 同一份數字的終端版，`/clear` 會跟著清掉 |
| 執行檔內建的 statusLine 說明 | 這版補了 `rate_limits.spend_limit`，沒補 `prompt_cache` |
| 狀態列重跑的時機 | 多一條：快取還熱的時候，`expires_at` 一到就自己重跑 |

## 為什麼要改

一個開了一整天的 session 到底吃掉多少額度，以前只能猜。`/usage` 告訴你花了多少，不告訴你其中有多少是重打的。快取斷掉沒有訊息。你會發現，通常是因為那一輪特別慢。

新的統計把「真的沒吃到快取」和「我自己重寫了對話」分開算。[官方文件](https://code.claude.com/docs/en/costs#prompt-cache-statistics)寫的門檻是：一次請求重跑了本來讀得到的快取內容超過 5%、而且至少兩千個 token，才記一次 miss；`/compact` 或清掉舊 tool result 之後的那次重建，記進 `expected_rebuilds`。這條線分不開的話，每次 compact 都會看起來像快取壞了。

## 對你的流程有什麼影響

1. 接進狀態列，最短的一段長這樣：

   ```bash
   input=$(cat)
   echo "$input" | jq -r '.prompt_cache // empty
     | "cache \(if .warm then "warm" else "cold" end) \((.hit_ratio // 0) * 100 | round)% · \(.misses) miss"'
   ```

2. `// empty` 不能省。每個 session 的第一輪都還沒有這個 key，少了它 jq 會 exit 5，整條狀態列空白。這兩種輸入我都餵過一次（本機實測）。
3. 別叫 Claude 幫你加。它動手時看的是執行檔內建的那份 statusLine JSON 說明，2.1.251 往裡面補了 `rate_limits.spend_limit`，`prompt_cache` 一個字都沒進去（比對 2.1.248 和 2.1.251 的 linux-x64 執行檔）。要嘛欄位名自己貼給它，要嘛把[文件那一節](https://code.claude.com/docs/en/statusline#prompt-cache-fields)貼給它。
4. 不用為了這個去設 `refreshInterval`。快取由熱轉冷那一刻本來就是重跑條件，執行檔裡排下一次重跑取的是 rate limit 各個 `resets_at` 跟 `prompt_cache.expires_at` 的最小值。
5. 讀數字的時候 `misses` 和 `expected_rebuilds` 分開讀。你自己按的 `/compact` 落在後者，那個不用修。
6. `caching_observed` 是 `false` 的話先別動設定。那句話的意思是這個 provider 沒回報快取 token，不是快取關了。另一邊，`caching_observed` 為真但 `warm` 是 `false`，代表最後那次回應沒有回報快取 token。
7. `spend_limit` 不用管。執行檔裡它只有走 Claude apps gateway 才會塞進去，個人訂閱看不到這個欄位。
8. 先跑一次 `claude --version`。還釘在 `stable` 的機器上會看到 2.1.236，上面七條一條都用不到。

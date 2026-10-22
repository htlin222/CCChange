---
title: "2.1.307：`claude_code.safety_event` 開始送了，欄位在文件上還查不到"
description: "新的 OTel 事件只記被擋下來的 tool call，誰擋的直接寫在 category 裡。monitoring-usage 那頁還沒有這一節，欄位是從執行檔挖的。"
published: 2026-10-22
category: "Changelog"
tags: ["claude-code", "changelog", "opentelemetry", "auto-mode", "sandbox", "api-version"]
annotation: "tool_decision 記的是每一次決定，accept 也算一筆。想知道昨晚那趟 -p 被什麼擋住，得先把八成的資料濾掉。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.307 | 10-21 20:47 UTC 上 npm，距這篇 3.5 小時，43 條。`latest` 和 `next` 指它，`stable` 還停在 2.1.306 |
| 2.1.306 | 10-21 02:28 UTC，兩條，昨天那篇出完才上的。一條是雲端 session 裡 `claude -p` 沒帶到環境變數就回 Not logged in |
| `claude_code.safety_event` | 新事件。權限規則、auto mode、safety check、hook、sandbox 擋下、改成問、或退回去的每一次 tool call，各送一筆 |
| 它帶的欄位 | `category`、`decision`、`decision_source`、`reason_type`、`reason_code`、`rule_source`、`grant_scope`、`circuit_breaker`、`classifier_category`、`hook_event`、`tool_name`、`tool_use_id`、`permission_mode`、`sandbox_violation_count`、`sandbox_enabled`（執行檔比對） |
| `category` 的值 | `safety_check`、`managed_policy`、`permission_rule`、`static_analysis`、`hook`、`auto_mode_block`、`auto_mode_no_verdict`、`permission_mode`、`sandbox_override`、`sandbox_network`、`sandbox_other`、`user_rejected` |
| 文件 | monitoring-usage 到 10-22 為止沒有這一節，整頁 grep `safety` 只打到 `tool_decision` 底下 `classifier_verdict` 的兩行 |
| 它掛在遠端開關上 | `tengu_snoopy_creek`，預設開。不是 settings 裡的鍵（執行檔比對） |
| `/claude-api api-version` | 新子指令，把 API 程式碼搬到 `2026-10-21` |
| `opus[1m]` 這種別名 | 只要 `CLAUDE_CODE_DISABLE_1M_CONTEXT` 有設，請求就回 model-not-found，這版修掉 |
| 雲端 session | `/autocompact` 重開後不再掉回預設視窗，`/clear` 清掉的對話也不再復活 |

剩下三十幾條大多在接線：HTTP MCP 連線中途斷掉只對唯讀工具重送、macOS 鑰匙圈鎖著的時候 MCP 會講原因而不是叫你重登、讀一堆 PDF 之後的 autocompact thrashing、`prompt-caching-scope` 不再往自架閘道送。self-hosted runner 的 checkout hook 改成預設 30 分鐘砍掉，要更久得自己開 `--checkout-hook-timeout-min`。

## 為什麼要改

`claude_code.tool_decision` 一直都在，記得也比較細。它什麼都記，accept 佔了絕大多數。[那頁文件](https://code.claude.com/docs/en/monitoring-usage)對 `source` 那一欄自己講得很白：「The `source` value doesn't indicate which of these sources matched.」

查得到是 `config` 決定的，查不到那是專案設定、managed policy、權限模式、還是 classifier。你得再去撈 `classifier_verdict` 才知道 classifier 有沒有插手，而那一欄在規則直接命中的時候根本不送。

所以要回答「昨晚那趟無人值守的 `-p` 到底被什麼擋住」，流程是先濾掉 accept，再從三四個欄位的在與不在去反推。safety_event 把這段省掉：只有被擋或被改成問的才送，`category` 直接寫是誰擋的，sandbox 違規也走同一條，多帶一個 `sandbox_violation_count`。

文件沒跟上。這版才上三小時，monitoring-usage 的事件清單最後一條還是 `managed_settings_resolved`。上面那組欄位是我拿 307 和 306 的執行檔比出來的，不是官方清單，之後補文件時名字可能還會動。

## 對你的流程有什麼影響

1. 已經在收 OTel log 的，升上去就會多一條 stream，不用改設定。認的是 log record 的 `event.name`，值是 `safety_event`。先收一天再決定要不要拉板。它的量看你被擋幾次，跟你跑了幾趟沒什麼關係。

2. 要看 classifier 到底引哪條內建規則，`OTEL_LOG_TOOL_DETAILS=1` 得開著。執行檔裡 `classifier_category` 這一欄直接掛在那個變數底下，沒開就整欄不送，你會拿到一堆 `auto_mode_block` 而不知道踩到哪條。

3. 沒在收 OTel 的就不用管，這版沒有別的東西值得你為它升。真要補收，記得 `tengu_snoopy_creek` 是遠端開關。今天預設開，不保證下個月還開著。

4. `settings.json` 的 `env` 裡有 `CLAUDE_CODE_DISABLE_1M_CONTEXT`、模型名又寫成 `opus[1m]` 的，升到 307。之前這組合直接回 model-not-found。不會降級，就是叫不動。

5. 寫 API 程式碼的先別急著把 `anthropic-version` 換成 `2026-10-21`。[版本頁](https://platform.claude.com/docs/en/api/versioning)列了這一版拿掉什麼：`temperature`、`top_p`、`top_k` 三個參數在所有模型上都變成 400，`document` block 放進 assistant message 也是 400。`/claude-api api-version` 就是幫你搬這個，但搬之前先確認手上的程式碼沒在調 temperature。

6. 排程跑雲端 `claude -p` 的，306 和 307 各修了一個會咬到你的：沒帶環境變數起來就說沒登入，以及 session 重開之後 `/autocompact` 的視窗掉回預設。兩個都不用改設定，升版就好。

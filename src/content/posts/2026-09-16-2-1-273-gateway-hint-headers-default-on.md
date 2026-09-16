---
title: "2.1.273：gateway hint headers 寫著 opt-in，直連的 session 預設就開著"
description: "官方說 gateway hint headers 要自己開。執行檔裡的判斷式是直連 Anthropic 時無條件回 true，走 gateway 才是關的那一邊。另外 2.1.268 那道 deny rule 檢查整段砍了。"
published: 2026-09-16
category: "Changelog"
tags: ["claude-code", "changelog", "privacy", "permissions", "auto-compact", "scheduled-tasks"]
annotation: "opt-in 的是 gateway，不是你。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| `latest` | 2.1.273，2026-09-15 18:06 UTC 上 npm。中間的 2.1.272 官方只給了一行 Bug fixes |
| gateway hint headers | changelog 寫要用 `CLAUDE_CODE_GATEWAY_HINT_HEADERS=1` 開。執行檔裡直連 api.anthropic.com 的 session 無條件回 true，走第三方 gateway 才落到遠端開關 |
| auto-compact 的計數 | 叫過 advisor 的那一輪被算了兩次，視窗用到一半就觸發壓縮。這版改成取最後一個不是 advisor、也不是 compaction 的 iteration |
| 2.1.268 加的那道 deny rule 檢查 | 整段砍掉，不是關掉。`denyRulesUnjudged` 這個 circuit breaker 和它那三句提示，2.1.273 裡一個都不剩 |
| `.claude/scheduled_tasks.json` | 這個檔案被複製到別的 checkout 之後，新 session 不再默默接手跑，會印一行說有幾個 task 不是它的 |

另外六十條是 Artifact、Claude Design、Claude Tag、VSCode 和一大批錯誤訊息的措辭，你不會感覺到。

## 為什麼要改

header 這條是官方 changelog 跟執行檔講的不一樣。changelog 寫 opt in，[env vars 那頁](https://code.claude.com/docs/en/env-vars)還沒收錄這個鍵。實際的判斷式有四層：環境變數設了就聽它的；沒設而且你沒有 `ANTHROPIC_BASE_URL`（或者它指向 Anthropic 自己），直接回 true；第三方 gateway 才落到 `tengu_splendid_sutton` 這道遠端開關，本地預設 false；Bedrock、Vertex、Foundry 一律關。opt-in 的是 gateway，不是你。

送出去的東西裡面，`x-claude-code-prev-tool-durations` 是一串 `工具名=毫秒`，最多 32 組或 4096 bytes，先到先截，MCP server 的工具名也算在內。`x-claude-code-agent-type` 我本來以為會把自訂 agent 的名字帶出去，看了才發現內建的送原名，自訂的一律壓成 `custom`。

auto-compact 那條是單純算錯。advisor 要你自己用 `/advisor`、`advisorModel` 或 `--advisor` 開，[文件](https://code.claude.com/docs/en/advisor)講得很清楚，不設就不會有。2.1.271 和 2.1.272 的執行檔裡連 `iterations.findLast` 都搜不到，這個挑法是這版才寫的。

九月十號那道檢查，當初的理由站得住腳：`eval`、`env -C` 這種行 permission checker 讀不完整，讀不完整就不該讓 allow rule 蓋過去。代價是 `time -p make build` 也被歸進同一類，於是整段收掉了。

## 對你的流程有什麼影響

1. 升到 2.1.273，`npm i -g @anthropic-ai/claude-code` 拿到的就是它。
2. 決定 header 要不要送。你是直連，所以它現在開著，每個 request 會帶走上一輪叫過的工具名和各自花了多久。不想送就在 `~/.claude/settings.json` 的 `env` 放 `"CLAUDE_CODE_GATEWAY_HINT_HEADERS": "0"`，`0` 在它認得的 falsy 字串裡。我自己留著開，工具名和毫秒數對我沒什麼好藏的。你的帳可能不是這樣算。
3. `time -p make build`、`env -C somewhere make` 這類指令的 allow rule 現在又有效了。九月中如果為了繞過它把 settings 裡的規則放寬，或在腳本裡塞了 bypass，收回去。
4. auto-compact 不用管，前提是你沒設 advisor。設了的話，這幾版你看到的 context 讀數大約是實際的兩倍，`/autocompact` 設的視窗等於被腰斬，升上去就回來了。
5. `.claude/scheduled_tasks.json` 只有在你複製 checkout 的時候會碰到。開 worktree 之前把它從複製過去的 `.claude/` 裡拿掉，不然新 session 不跑，得在那邊重建。之前它是默默接手跑別人的 task，現在會講。

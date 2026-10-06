---
title: "2.1.290：WebSearch 配額開始回補，`/loop` 撐得過壓縮了，兩件都有前提"
description: "190 條的大版。回補只在互動終端機打開，claude -p 還是 200 次封頂；定時任務的 carry 記錄寫在 transcript 裡，昨天就壓縮過的 session 升版救不回來。"
published: 2026-10-06
category: "Changelog"
tags: ["claude-code", "changelog", "websearch", "scheduled-tasks", "permissions"]
annotation: "回補速率在 headless 是 0，撞到兩百就是整個 session 不再放。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.290 | 10-05 18:12 UTC 上 npm，距這篇 6.0 小時，190 條：112 Fixed、22 Changed、15 Improved、11 Added |
| WebSearch 配額 | 200 次的 session 上限沒拿掉，改成每小時回補 100 次，把用掉的數字往下扣（本機實測） |
| 回補的開關 | 預設值是不回補，只有互動終端機那一個呼叫點把它打開。`claude -p`、SDK host、背景 worker 都吃預設（本機實測） |
| 撞到上限之後 | 回補速率是 0 的話就不會再放，不是等一陣子會好（本機實測） |
| `CLAUDE_CODE_WEB_SEARCH_REFILLS_PER_HOUR` | 新環境變數，覆蓋速率，`0` 關掉。env-vars 文件還沒收這一條（官方） |
| `/loop` 定時任務過壓縮 | 壓縮時把還活著的任務寫成一筆 `session_cron_carry` 掛在 transcript 上，resume 才掃得到（本機實測） |
| 這條修正的範圍 | 只算這版之後做的壓縮，舊壓縮點沒有這筆記錄（官方＋本機實測） |
| carry 不收的 | 帶 `agentId` 的、帶 `kind` 的、已經寫進 `scheduled_tasks.json` 的那些（本機實測） |
| `pyright` | 從「自動放行、只驗旗標」那張名單上被拿掉了（本機實測） |
| `ps` | 帶 `e` 的旗標組合要整串落在一小組安全字母裡才自動過，`ps aux`、`ps -ef` 不受影響（本機實測） |
| `CLAUDE_CODE_DISABLE_ATTACHMENTS` | 進了 repo settings 不准設的那張名單（本機實測） |

剩下的是長尾：mod 畫面、agents view 的 Ctrl+X 和 Esc、`/ultrareview` 上傳的七種失敗訊息、Claude apps gateway、Claude Tag、VS Code。沒碰到那幾塊的話整批不用管。

## 為什麼要改

[scheduled tasks 文件](https://code.claude.com/docs/en/scheduled-tasks)在 Limitations 那節把承諾講得很清楚：

> When you resume a session with `claude --resume` or `claude --continue`, Claude Code restores the tasks scheduled with `CronCreate`, except recurring tasks that have expired and one-shot tasks whose scheduled time has passed.

restore 的做法是回頭掃 transcript 裡的 `CronCreate` tool call，一筆一筆重排。壓縮會把那些 assistant 訊息刪掉，所以掃不到東西，任務就這樣沒了，而且終端機不會說。這版在壓縮的時候補一筆記錄把任務帶過去。記錄住在 transcript 裡，所以它只救得了從這版開始做的壓縮。

WebSearch 那邊，[env-vars 文件](https://code.claude.com/docs/en/env-vars)寫 `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` 預設 200，「the cap can be raised but not turned off」。長跑的 session 會撞到，撞到就只能重開。回補是對的解法，只是打開它的只有互動終端機一個地方。

`pyright` 離開自動放行名單的理由，寫在這版新加的那段 allowlist 指引裡：

> Tools that start an interpreter in the working directory: `pyright` in any form (it runs `python3` there, which imports from that directory first)

clone 下來的 repo 裡放一個 `json.py`，`pyright` 跑起來就會載到它。

## 對你的流程有什麼影響

1. 升版，然後把現在開著、已經壓縮過的長跑 session 關掉重開，要留的定時任務重下一次。carry 記錄從這版的壓縮才開始寫，舊壓縮點沒有，升版不會回頭補。

2. 雲端出刊、CI 這些 `claude -p` 的流程，要查很多東西的話在 env 裡加 `CLAUDE_CODE_WEB_SEARCH_REFILLS_PER_HOUR=100`。不加就還是兩百次封頂，而且撞到之後整個 session 都不會再放一次。

   ```json
   { "env": { "CLAUDE_CODE_WEB_SEARCH_REFILLS_PER_HOUR": "100" } }
   ```

3. 去 `~/.claude/settings.json` 的 allow 清單找 `pyright`。有就刪掉。留著規則它還是不會問，而新的指引寫得很明白，這東西不該放行。

4. repo 的 `.claude/settings.json` 用 `env` 設過 `CLAUDE_CODE_DISABLE_ATTACHMENTS` 的話，搬去 `~/.claude/settings.json`。CCChange 這支沒有 `env` 區塊，不用動。

5. 不給 interval 的 `/loop` 還是不會 restore，subagent 排的也不在 carry 裡。真的要跨 resume 活下來就別用 session 層的排程，改 Routines。

6. `ps` 那條不用管。`ps aux` 和 `ps -ef` 兩版都直接過；要問的是帶 `e` 的旗標又混進 `--sort` 這種不在安全字母表裡的參數，或者 `H`/`L`/`T`/`m` 出現兩個以上。

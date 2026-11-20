---
title: "2.1.329：舊版存下來的排程任務，換個登入就不跑了"
description: "329 開始檢查磁碟上的排程任務是不是在這個 session 的組織底下建的，證明不出來就跳過，而檔案原封不動留著。同一版把 Code Mode 的三個關閉條件也拆掉了。"
published: 2026-11-20
category: "Changelog"
tags: ["claude-code", "changelog", "scheduled-tasks", "code-mode", "hooks"]
annotation: "任務還在檔案裡，只是不跑。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.329 | 11-19 18:40 UTC 上 npm，我查的時候過了 5.4 小時。離 328 隔 19.5 小時 |
| 時間來源 | `gh api` 在這個容器照樣 403，`pushed_at` 拿不到，上面的時間都是 npm 的 |
| 通道 | `latest` 和 `next` 都指 329，`stable` 還停在 2.1.311 |
| 磁碟上的排程任務 | 跑之前先認組織，認不出來的跳過，留在 `scheduled_tasks.json` 裡不動 |
| 排程 daemon | 組織簽入（不是 claude.ai 登入）底下整個 worker 停掉，訊息叫你 `claude auth logout` 重登再重啟 daemon |
| Code Mode 的關法 | telemetry、nonessential traffic、feature flags 關掉都不再讓它關著，只有 tracing 還會 |
| Code Mode 裡的 PreToolUse | hook 自己出錯不再擋掉 script 的工具呼叫，跟 Code Mode 外面一樣 |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | 從 settings.json 的 `env` 移掉之後，跑著的 session 會放回啟動值或直接拿掉 |
| `~/.claude.json` | 修掉存檔時碰上網路卡住或檔案鎖、檔案被清空後寫成預設值那條 |
| 其餘 | 133 條。`/status` 多一列 Marketplace auto-update，`/mcp` 多一列 Server message，`/tasks` 把排程任務和 `/loop` wakeup 收進來、`x` 可以停掉，剩下大半落在 Code Mode 和 VSCode |

## 為什麼要改

存在 `.claude/scheduled_tasks.json` 的排程任務，一直是一串沒有身分的 prompt。檔案裡只有 cron 和要跑什麼。誰建的、拿哪個帳號建的，都不在裡面，所以下一個開在這個資料夾的 session 撿到就照跑，用的是它自己手上那份登入。

329 不接受這件事了。跑之前先看任務歸不歸得到這個 session 的組織底下，歸不出來就跳過，log 寫得很直白（本機實測）：

> [ScheduledTasks] not running <id>: not shown to be made under this session's organization; left in scheduled_tasks.json

關鍵在 not shown to be made。舊版存的任務身上沒有這個戳章，不是戳錯是根本沒有，所以永遠證明不出來。官方 changelog 自己寫的是 most：329 之前存的大多在新 session 裡不會跑，`--resume` 原來那個 session 還會，因為那個 session 的登入就是當初存它的那份。

[官方文件的 Limitations](https://code.claude.com/docs/en/scheduled-tasks) 目前只列了一種「列得出來但不會跑」，是把檔案複製到別的資料夾。組織這條還沒補進去，daemon 那串訊息更是連 desktop 排程那頁都沒提過 daemon.json（官方文件）。

## 對你的流程有什麼影響

1. 雲端出刊那條不用管。它是 cloud scheduled task，跑在伺服器端，跟本機這份檔案的過濾是兩回事。
2. 本機存過排程任務的話，升上去之後開一個新 session 列一次，沒跑的重新建一次。別想從檔案判斷有沒有中，整個過程檔案一個字都不會變。
3. 去 settings.json 把靠自己 exit 非 0 擋東西的 PreToolUse hook 找出來，補上 `"onFailure": "block"`。[hooks 文件](https://code.claude.com/docs/en/hooks)本來就寫 hook 失敗預設放行。Code Mode 以前比文件嚴格，hook 出錯會順手把那次呼叫擋掉，329 改成跟外面一致。你在 Code Mode 裡有一層從來沒設定過的保護，今天沒了。
4. 不要再拿「我沒開 feature flags，Code Mode 不會啟動」當防線。telemetry、nonessential traffic、feature flags 三個都從關閉條件裡拿掉了，壓著它只剩 managed settings 和 tracing 這兩條路。
5. `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` 從 settings.json 拿掉之後不必重開 session 了。自己在 shell `export` 的那份不受影響，329 認出是你寫的就不碰（本機實測）。
6. 升。這版沒有會把既有設定行為改掉的條目，要動手的是上面第 2 和第 3 點。

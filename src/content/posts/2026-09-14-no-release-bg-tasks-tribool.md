---
title: "沒有新版：2.1.269 把那顆 background task 環境變數換成三態，設 0 從此有作用"
description: "latest 還是 2.1.270，二十九小時沒動。要回頭看的是兩天前寫「不用管」的那顆環境變數，它的型別在 2.1.269 換掉了，舊的寫法現在意思不一樣。"
published: 2026-09-14
category: "Changelog"
tags: ["claude-code", "changelog", "env-vars", "headless", "background-tasks"]
annotation: "它不在 env-vars 文件頁上，所以沒有任何一頁會告訴你這件事。"
---

## 改了什麼

沒有新版。`latest` 還停在 2.1.270，npm 上的推送時間是 2026-09-12 18:52 UTC，到寫這篇為止二十九小時。

| 項目 | 現況 |
| --- | --- |
| `latest` | 2.1.270，沒動 |
| `stable` | 2.1.236，也沒動 |
| `CLAUDE_CODE_BG_TASKS_REPORT_RUNNING` | 型別在 2.1.269 從 `bool` 換成三態，「設成 0」和「沒設」從此是兩回事 |
| 同一顆變數的兩個用途 | 2.1.269 拆成兩道閘，一道翻成預設開，另一道還是要你寫 `1` |

## 為什麼要改

2.1.269 那條的正文是修好 headless 和遠端 session 在 background agent 還在跑的時候宣稱在等你輸入，後面用括號補一句，設 `CLAUDE_CODE_BG_TASKS_REPORT_RUNNING=0` 可以回到舊行為。括號裡那句讀起來像這版新開的逃生口。它不是。

兩天前那篇講過這顆變數 2.1.268 就在了。漏掉的是型別。2.1.268 的宣告是 `P.bool()`，只認 `1`、`true`、`yes`、`on`，其他一律當 false，所以在那一版，沒設跟設成 `0` 走同一條路。2.1.269 換成 `P.triBool()`，多出第三態：`0`、`false`、`no`、`off` 是 false，沒設是 undefined。[env-vars 文件](https://code.claude.com/docs/en/env-vars)開頭那條通則講的就是這個，開關型變數 `1` 開 `0` 關，只是這顆要到 2.1.269 才真的照著走。

接著兩道閘分了家。判斷要不要回報 idle 的那道問「不等於 false」，所以沒設就是開著。另一道問「等於 true」，管的是 rewind 的時候要不要順手停掉那之後長出來的 background agent。舊版一顆 `1` 兩件事一起來，現在前面那件免費，`1` 只剩後面那件。

這顆變數不在 env-vars 頁上，整頁搜過，一個字也沒有。

## 對你的流程有什麼影響

1. 先確認你到底有沒有設。`grep -rn BG_TASKS_REPORT_RUNNING ~/.zshrc ~/.bashrc ~/.claude/settings.json .github/workflows/ 2>/dev/null`。十之八九是空的，空的就到此為止，下面三條不用看。
2. 有 `=1` 的刪掉。你當初要的是 idle 那件事，2.1.269 之後它本來就開著，留著只是多帶一個 rewind 停 agent 的行為，那件事你沒有要過。
3. 有 `=0` 的更要刪。在 2.1.268 寫這行等於沒寫，多半就是這樣留下來的，現在它會把「background agent 還在跑卻宣稱在等輸入」那個 bug 裝回去。
4. 兩個都沒有就不用管，這是 2.1.269 之後該有的樣子。
5. 同一區真正該記住的是 `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS`，[headless 文件](https://code.claude.com/docs/en/headless#background-tasks-at-exit)寫得清楚，預設十分鐘，`-p` 等 background subagent 等到這個上限就不等了。每日出刊這條線沒有開 background subagent，用不到。

---

*版本、推送時間與 dist-tag 來自 npm registry，`CLAUDE_CODE_BG_TASKS_REPORT_RUNNING` 那條 changelog 正文與括號來自官方 changelog（官方文件）。env-vars 頁的開關通則、`CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS` 的預設值，以及該頁查無此變數，來自本次抓取的官方文件頁（官方文件）。型別從 `P.bool()` 換成 `P.triBool()`、兩道閘的判斷式，以及拆分落在 2.1.269 而非 2.1.270，來自本次下載並比對 2.1.268、2.1.269、2.1.270 三版執行檔（本機實測）。*

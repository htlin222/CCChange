---
title: "沒有新版：2.1.318 給 Claude 自己寫的程式碼多開一條拒絕路徑"
description: "2.1.318 上 npm 滿 50 小時，第三天沒有東西跟上。補一條 CHANGELOG 沒寫的：318 給「Claude 自己寫的程式碼」開了一條獨立的拒絕路徑，其中兩種理由不會跳提示給你看。"
published: 2026-11-06
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "auto-mode", "code-execution"]
annotation: "回來的時候先送一句話，不要先重問。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 今天 | 沒有新版。2.1.318 在 11-03 21:55 UTC 上 npm，到現在 50 小時 |
| 通道 | `latest` 和 `next` 都還指 2.1.318，`stable` 還是 2.1.311 |
| 318 多出來的 | Claude 自己寫的程式碼在呼叫工具時，多一條獨立的拒絕路徑（本機二進位比對）|
| 317 | `replScriptCall`、`replAsyncAsk`、`replScriptBuiltCommand` 這些符號一個都沒有，是從零長出來的（本機二進位比對）|
| 四種拒絕理由 | `unanswered`、`not_shown`、`built_as_it_ran`，加上 classifier 沒覆蓋到的那種 |
| `not_shown` | 前一個權限提示沒人回，後面需要核准的呼叫直接拒掉，連提示都不跳 |
| `built_as_it_ran` | 只在 `auto` mode 成立：指令是腳本跑到那裡才拼出來的，classifier 沒讀到原文 |
| 怎麼解開 | 送任何一句話進去，提示就會再出現 |
| 核准對話框 | 318 多寫一句，說第一行是 Claude 自己的摘要，沒有東西拿它對照過程式碼（本機二進位比對）|
| CHANGELOG | 84 條裡沒有一條提到這條路徑 |

## 為什麼要改

318 的 CHANGELOG 只有這句沾到邊：

> Fixed permission prompts being answered by keys typed just after sending a message, or before a slow prompt appeared

[permission-modes](https://code.claude.com/docs/en/permission-modes) 寫的規則是，`auto` 和 `bypassPermissions` 下的提示帶兩分鐘倒數，而按鍵只該把倒數停住：

> Press any key while the prompt is open to stop the countdown and keep the prompt waiting for your answer.

317 不是這樣。訊息送出後緊接著打的字會被當成答案收下，提示還沒畫出來就已經被你回掉了。要修的是鍵盤誤觸核准，倒數本身沒壞（官方文件）。

倒數跑完之後的規則文件也寫了，而且三次以後會整個收起來：

> After three of these prompts run out unanswered in a session, Claude Code stops showing them and denies further critical-path removals immediately. Sending a new message starts the count over.

這段掛在 critical-path 的 `rm` 底下。318 把同一套搬去管另一種呼叫：Claude 寫一段程式碼，程式碼裡再呼叫工具，這些呼叫現在一個一個走這條路。文件沒跟上，`permission-modes` 整頁查不到這條分支。

## 對你的流程有什麼影響

1. 通道不用動，`latest` 還是 318。

2. 核准 Claude 跑自己程式碼的時候看程式碼，別看第一行。318 在對話框上自己寫明了：

```
Yes runs Claude's code. The line at the top is Claude's own summary of it,
and nothing checks it against the code.
```

3. 回到一個好像什麼都沒做的 session，先隨便送一句話，再問它卡在哪。提示被收起來的狀態要新訊息才解開，你在那個狀態下重問，它只會再被拒一次。318 同時要求 Claude 主動交代哪一步被跳過，所以直接問「剛剛有哪些呼叫沒被問到」。

4. `auto` mode 下讓指令寫成字面值。路徑或參數是程式碼跑到一半才從變數拼出來的，classifier 讀不到原文就拒。文件對 `rm -rf "$VAR"` 給的解法一樣，把真正的路徑寫進指令裡（官方文件）。

5. 無人顧的 session 要不卡住，接 `PermissionRequest` hook，會問的模式下它可以直接回答提示（官方文件）。別整個丟進 `bypassPermissions`：倒數跑完就 deny 這個預設是對的，我不會為了省幾次點擊把整個 session 的檢查拿掉。

6. 別把這條路徑寫進自己的 `CLAUDE.md`。它目前只存在於二進位裡，`permission-modes` 的 Time limits 那節哪天出現 Claude's code 的字樣，那時候再當規則用。

---
title: "2.1.328：跨 session 訊息多了「以後都送」，但開關還鎖在遠端 flag 後面"
description: "328 上 npm 一小時，changelog 還沒有這一節。新增 alwaysDeliverInSession 和 remoteMessageReceipts 兩個 key，兩個都被遠端 flag 關著，今天不用改設定。"
published: 2026-11-19
category: "Changelog"
tags: ["claude-code", "changelog", "cross-session", "cloud", "config"]
annotation: "兩個新 key 都還關著。今天只需要知道它們在。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.328 | 11-18 23:09 UTC 上 npm，我查的時候過了 1.1 小時。離 327 隔 26.6 小時 |
| changelog | 還沒有 328 這一節。GitHub main 上最新還是 327，十一分鐘內查三次都一樣 |
| 時間來源 | `gh api` 在這個容器照樣 403，`pushed_at` 拿不到，上面兩行的時間都是 npm 的 |
| `alwaysDeliverInSession` | 新 key。被扣住的訊息批准一次之後，同範圍的後續就直接送進來 |
| `remoteMessageReceipts` | 新 key。`on`（預設）/ `always` / `off`，管雲端和 Remote Control 那邊的送達通知 |
| 兩個都還關著 | `tengu_eager_sutton` 和 `tengu_toasty_phoenix` 兩支遠端 flag 預設 false |
| `/code-review` | findings 開頭改成寫字、不放 emoji：`Important:`、`Pre-existing (not from this change, not blocking):`、`Nit (optional):` |
| sandbox 搬家那行訊息 | 只改字。`Bash prompts again` 變成 `Bash stops being auto-allowed`，行為沒動 |

## 為什麼要改

扣訊息這件事 327 就有了，不是這版的新東西。[官方文件](https://code.claude.com/docs/en/cross-session-messaging)到今天也只寫到三個值：

> `accept` Claude Code delivers each message to Claude.
> `hold` Claude Code shows a notice for each message and doesn't deliver it.
> `refuse` Claude Code drops each message without delivering it.

真正卡人的是沒設值時那套 mode parity。收訊息的 session 只要在 bypass，進來的訊息就一律扣住等你按，而 `dialogExpiry` 預設五分鐘，過了就丟掉。想不要再按，過去只有一條路：把 `crossSessionInbound` 設成 `accept`，連不認識的來源一起放進來。328 補的是中間那一格，在批准的對話框上順手說這個 session 以後都送，範圍可以只限自己的 session。

`remoteMessageReceipts` 管反方向。送達通知會叫醒 session，兩邊互相通知就互相叫醒。預設 `on` 自帶兩個上限，一小時最多 30 個 turn，每個扣住訊息的收件端只通知一次。`always` 把這兩個上限都拿掉。

## 對你的流程有什麼影響

1. 今天不用改設定。兩個 key 的開關都在遠端，`tengu_eager_sutton` 關著的時候訊息照舊一律扣住，`/config` 裡連那一列都不會長出來（本機實測）。
2. 不要把 `remoteMessageReceipts` 加到這個 repo 的 `.claude/settings.json`。它只從 managed 和 user settings 讀，project 檔放了沒用。雲端 session 又不讀 user settings，所以排程出刊這條路上只有 server-managed 進得去。
3. flag 哪天開了，`always` 不要選。`on` 那兩個上限是唯一攔住兩邊互相叫醒的東西。
4. 對話框上那個第二層「Always deliver in every session on this computer」不要按。它寫進 user settings、所有來源、所有新 session。我不會開，因為排程跑起來的時候沒有人在看畫面，而官方自己在那個確認框上就寫了：「A session that has read something malicious could pass instructions on, and a session that skips permission prompts may act on them with no one checking.」
5. 真要常駐收訊息的 `claude -p` worker，照舊用 `--settings` 帶 `crossSessionInbound: "accept"`。328 沒碰這條路。
6. `/code-review` 的輸出會變樣，開頭從 emoji 換成 `Important:` 那三個字串。有拿 findings 餵下游腳本的話，去看一下有沒有在 match emoji。
7. 升。這版沒有會讓既有設定行為變掉的條目，兩個新 key 都還關著。

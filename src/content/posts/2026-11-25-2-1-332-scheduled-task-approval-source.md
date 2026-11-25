---
title: "2.1.332：排程任務的核准要你本人按，changelog 還沒跟上"
description: "npm 上的 2.1.332 比官方 changelog 早了一天多。重點是雲端排程任務的寫入動作多一道執行時檢查：核准不是你本人給的，就整個不送。"
published: 2026-11-25
category: "Changelog"
tags: ["claude-code", "changelog", "scheduled-tasks", "permissions"]
annotation: "hook 替你答應的，從這版起不算核准"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.332 本身 | npm 在 11/24 22:06 UTC 推了，`anthropics/claude-code` 的 CHANGELOG.md 到現在還停在 331，這版沒有官方條目 |
| 排程任務的寫入動作 | `create` / `update` / `run` / `create_webhook_trigger` 送出前多查一次核准是誰給的，不是你本人按的就不送 |
| 擋下來的回覆 | 「Nothing was created, changed, or run: no approval of yours is on record for this call. A hook or plugin may have answered it.」 |
| routine 改名 | 介面字串整批換成 cloud scheduled task，舊名只剩在網址和文件頁的 `/routines` |
| `/ship` | 問過你之後 auto-merge 才被打開的話，它停手，不 commit 也不 push |
| 讀取動作 | `list` / `get` / `list_runs` / `get_run_log` 四個沒動 |

Windows 的 PowerShell library load guard、幾個 host 層的環境變數也動了，跟你無關。

## 為什麼要改

排程任務的文件早就把話說在前面：trigger 送來的 prompt「can't act as approval or consent for actions during the run」（[官方文件](https://code.claude.com/docs/en/routines)）。331 之前這只是文件裡的一句話。工具的 `checkPermissions` 判斷完就直接打 API，誰答應的不再過問，所以一個 `PermissionRequest` hook 回 allow，跟你自己按 y 在程式裡長得一模一樣。

332 把這件事搬到執行的那一刻。送出前它去看這次 tool call 的決定來源，只認 `user_temporary` 和 `user_permanent`，也就是你按的「允許一次」和「永遠允許」；其他來源不送，回上面那句話（本機實測）。管的只有能生出新排程任務的那四個寫入動作。

`/ship` 是另一回事。331 的中止理由有四種，都跟 commit 和 push 本身有關。332 多了第五種，條件是你被問過之後 auto-merge 才被打開，防的是把東西推進一個 GitHub 隨即合掉、沒人看過的 PR。

## 對你的流程有什麼影響

1. 這個 repo 不用管。`.claude/settings.json` 裡沒有 hook，`allow` 清單也沒有排程任務工具的規則（本機實測）。
2. 去 `~/.claude/settings.json` 和全域 hooks 看一遍有沒有哪個 `PermissionRequest` 或 `PreToolUse` 在替你答應。有的話從這版起它對排程任務的寫入動作只會換來一句拒絕，不是靜靜放行。把它收到只蓋 `list`、`get`、`list_runs`、`get_run_log` 四個。
3. 每天出刊那條排程不受影響。雲端的 run 開在 auto mode，走 classifier，不是這道 gate。
4. 別把出刊改用 `/ship`。它看的是 GitHub 自己的 auto-merge 開關，`gh pr merge --auto` 設的那個。這個 repo 的 `auto-merge.yml` 是 `workflow_run` 直接呼 merge API，PR 上那個開關從來沒開過，新煞車攔不到你。現有的 `gh pr create` 維持原樣。
5. 要刪排程任務還是只能去 claude.ai/code/routines，CLI 這邊依舊沒有 delete。

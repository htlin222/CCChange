---
title: "沒有新版：2.1.319 說補好了 deny 規則的引號漏洞，文件還寫它不擋"
description: "319 的 CHANGELOG 有一條說 Bash deny 和 ask 規則以前漏掉加引號的寫法。permissions 那頁今天還把 git 'push' 列在不擋的那一欄，二進位比對也看不出解析器有動。另外 319 開始警告 cloud session 的 /loop 計時器活在容器裡。"
published: 2026-11-09
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "loop", "cloud-sessions"]
annotation: "CHANGELOG 說補好了，文件說沒有。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 沒有新版 | 2.1.319 從 11-06 00:58 UTC 之後沒動，到現在 71 小時。`latest` 和 `next` 還是它，`stable` 停在 2.1.311，第 13 天 |
| deny 規則的引號 | CHANGELOG 寫 `Fixed a case where Bash deny and ask rules missed commands written with quoted words` |
| 文件相反 | permissions 那頁今天還把 `git 'push' origin main` 放在 `Bash(git push *)` 的「Doesn't stop」欄 |
| 二進位比不出差別 | 指令解析器裡負責引號的五個符號，318 和 319 數字一樣：`argvSourceLiteral` 8/8、`carveOutMayDesyncQuoteScan` 7/7、`argvUnquotedGlob` 9/9、`hasUnquotedGlob` 9/9、`plainUnquotedHeredocs` 4/4（本機二進位比對）|
| 319 多出來的引號字串 | 落在另一套東西上：skill 攔 `git push` / `gh pr create` 危險選項的訊息，318 裡 0 次 |
| `/loop` 在 cloud session | 新增一句警告：計時器活在這個 session 的容器裡，容器被收掉或換掉就不會再響（318 裡 0 次，319 有 2 次）|
| 活得下來的 loop | 要你自己開口要才會給。做法是在容器外掛一個待處理的喚醒，用新容器把 session 叫起來 |
| scheduled-tasks 文件 | 比較表裡 `/loop` 的 Runs on 還寫 Your machine，Limitations 七條沒有一條講容器 |

gateway、VS Code、Claude Tag 那些昨天和前天寫完了。

## 為什麼要改

deny 規則漏掉引號確實是個洞。你 `.claude/settings.json` 裡那兩條 `Bash(gh pr merge:*)` 和 `Bash(git push --force:*)`，只要有人寫成 `gh 'pr' merge`，比對的是文字，引號沒拆就比不中。

麻煩是補完之後沒有第二個地方承認它補了。[permissions 那頁](https://code.claude.com/docs/en/permissions#what-a-bash-rule-doesnt-match)今天仍然這樣寫：

> A Bash rule matches the command text Claude writes, after Claude Code splits compound commands and strips wrappers. It doesn't match the same program invoked in a different form, so a deny or ask rule covers the invocation Claude usually produces and isn't a security boundary around the program.

同一張表的第三列把 `git 'push' origin main` 跟 `/usr/bin/git push`、`sh -c` 擺在一起，都算不擋。二進位那邊也看不出解析器被動過。

`/loop` 那條是另一種漏。cloud session 的容器閒著就可能被回收，計時器跟著沒了。你看到的只是 loop 不再出現。[scheduled-tasks 那頁](https://code.claude.com/docs/en/scheduled-tasks#compare-scheduling-options)的比較表只分「你的機器」和「雲端排程」兩欄，cloud session 裡的 `/loop` 兩邊都不是。

## 對你的流程有什麼影響

1. deny 清單原樣不動，也不要因為那行 CHANGELOG 就放鬆。說它補好的只有 CHANGELOG，文件寫的是不擋，二進位比不出差別。要真的擋住 `git push --force`，走 sandbox，不要靠 `Bash(...)` 規則。

2. 想自己確認就在一個 scratch repo 裡試 `gh 'pr' merge`，看它跳不跳提示。這個 session 裡我沒能把那兩個執行檔跑起來，所以上面那格只寫「數字一樣」，沒寫「沒修」。

3. cloud session 裡的 `/loop` 不要拿來掛過夜的事。319 會警告你了，但預設仍然是容器內的計時器，容器一換就沒了。要它撐過換容器，開口的時候就得講明，例如「用能活過容器的那種 loop」。

4. 要穩的排程走 cloud scheduled task。這個 repo 每天出刊就是這樣跑的，容器用完就丟，`/loop` 在這種地方本來就接不住。

5. `stable` 第 13 天停在 2.1.311。共用那份 `settings.json` 的人如果走 stable，這幾天寫到的鍵在他那邊全部是無效鍵。

6. 319 還是該升，理由是前天那三個權限繞過，不是今天這條。引號這條目前只有 CHANGELOG 自己說。

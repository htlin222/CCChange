---
title: "2.1.330：沒有新版，開機那行「更新了什麼」永遠少一版"
description: "53 小時沒有新版。回頭查開機摘要的料是哪來的：夾在二進位裡的一份 changelog 快照，只留三節，而且停在前一版。從 329 升到 330，那行能講的東西剛好是零。"
published: 2026-11-23
category: "Changelog"
tags: ["claude-code", "changelog", "release-notes", "cloud"]
annotation: "快照在編譯的時候切掉，那時候它自己那一節還沒寫出來。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 沒有新版 | 330 還是 11-20 19:16 UTC 那一版，我查的時候過了 53.0 小時 |
| changelog | 最上面一節還是 2.1.330，沒長出新的 |
| 通道 | `latest` 和 `next` 都指 330，`stable` 還停在 2.1.323 |
| 時間來源 | `gh api` 在這個容器照樣 403，`pushed_at` 拿不到，上面的時間全是 npm 的 |
| 開機摘要的料 | 330 的二進位裡夾著一份 changelog 快照，60,749 字元，裡面只有 2.1.329、328、327 三節，沒有 330 自己那一節（本機實測） |
| 329 的那份 | 一樣三節，2.1.328、327、326，也沒有自己那一節（本機實測） |
| 誰在讀快照 | 開機時算「你上次看到之後更新了什麼」的那段程式讀的是這份快照，不是抓回來的檔（本機實測） |
| `/release-notes` | 另一條路，去抓 raw.githubusercontent 上的 `CHANGELOG.md`，只等 500 ms，逾時改讀磁碟快取，快取也沒有就只印一條 GitHub 連結（本機實測） |
| 快取在哪 | `<CLAUDE_CONFIG_DIR>/cache/changelog.md`。這台雲端容器跑著 330，這個檔不存在（雲端實測） |
| 抓多久 | 從這個容器抓那份 1.38 MB 的 `CHANGELOG.md`，三次分別 0.23、0.23、0.11 秒（雲端實測） |
| `.claude.json` 併發 | 10 個 `claude mcp add --scope user` 同時打同一份檔，329 和 330 都是 10 筆全留（本機實測） |

## 為什麼要改

開機那行摘要和 `/release-notes` 看起來在講同一件事，料卻是兩套。

摘要要在你按下 Enter 之前就出現，所以它不等網路，讀的是編譯進二進位的那份快照。快照是打包的時候切下來的，那個時間點它自己那一節還沒寫出來，所以永遠少一版。這不是 330 弄壞的，329 的那份也一樣，少的是 329。

它旁邊掛的連結倒是對的，指到[官方的 changelog 頁](https://code.claude.com/docs/en/changelog)，那一頁現在最上面就是 2.1.330。點進去才看得到完整的。

`/release-notes` 走網路，拿到的是 GitHub 上那份完整的，代價是它只給 500 ms，而且抓不到時不會退回去用快照。

## 對你的流程有什麼影響

1. 升級後開機那行「更新了什麼」，別當成你剛裝的這版的 release notes。它算的區間是你上次看到的版本到現在這版，資料來自那份停在前一版的快照。329 升 330，區間裡一條都沒有。

2. 一次跳超過三版也看不全，快照只留三節。2.1.325 直接升到 330，那行最多講到 327 到 329，326 掉在外面。

3. 要知道新版到底改了什麼，去上面那個 docs 頁，或者自己抓。這行比開 `/release-notes` 快，也不會被 500 ms 咬到：

   ```bash
   curl -s https://raw.githubusercontent.com/anthropics/claude-code/refs/heads/main/CHANGELOG.md \
     | sed -n '1,/^## 2\.1\.329/p'
   ```

4. 想確認 `/release-notes` 給你的是不是舊的，看快取檔還在不在：

   ```bash
   ls -l "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/cache/changelog.md"
   ```

   檔案不在，就是這台機器從來沒抓成功過一次，那條指令現在只會給你一條連結。

5. 雲端 session 不要用 `/release-notes`。這台容器跑的是 330，快取檔不存在，抓檔本身只要 0.1 秒多，直接 curl 省事。

6. 330 那幾條「兩個 process 同時存就互相蓋掉」不用管，升上去就結束。`.claude.json` 這條 2.1.259 就補好了，10 個 `claude mcp add` 併發打進去，329 和 330 都是 10 筆全留。330 修的是 `~/.claude/settings.json`、plugin 安裝清單和 task metadata，我沒重現出 329 的壞法，不知道它壞得多嚴重。

7. 還沒升的別用 `claude install stable`。`stable` 還停在 2.1.323，一裝就往下掉七版，這一個禮拜寫過的雲端 deny 規則和排程任務那些修正全部退回去。

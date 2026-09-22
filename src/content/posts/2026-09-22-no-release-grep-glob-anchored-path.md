---
title: "沒有新版：2.1.278 第三天，Grep 的 glob 只要帶斜線就會安靜回空"
description: "latest 七十小時沒動。今天驗的是一條沒人在修的：Grep 的 glob 一旦含斜線，比對基準就是 path，把 path 往上挪一層，同一批檔案變成查無。"
published: 2026-09-22
category: "Changelog"
tags: ["claude-code", "changelog", "grep", "glob", "ripgrep", "tools"]
annotation: "ripgrep 沒找到，跟 ripgrep 沒跑起來，退出碼都是 1。"
---

## 改了什麼

沒有新版。`latest` 還是 2.1.278，2026-09-19 01:48 UTC 上 npm，到現在七十小時。

| 項目 | 現況 |
| --- | --- |
| `latest` | 2.1.278，沒動 |
| `stable` | 2.1.267，第十二天 |
| Grep 的 `glob` 含 `/` 時 | 拿去比的是「相對於 `path` 的路徑」，不是檔名 |
| 同一批檔案 | `path` 指在 repo 根，`.github/workflows/*.yml` 找得到；`path` 往上挪一層變 `No files found`（本機實測 2.1.278） |
| 繞法 | 含 `/` 的 glob 前面補 `**/` |
| 回報紀錄 | anthropics/claude-code 的 #27171 和 #30486 講的就是這件事，兩個都被 closed as not planned（社群） |
| 2.1.277 修掉的另一種空 | rg 因為系統資源不足而根本沒起來，以前一樣回「沒有符合」 |
| 新的錯誤類別 | `RipgrepSpawnResourceError`，認得 `EAGAIN`、`ENOMEM`、`EMFILE`、`ENFILE`，各給一句處置。2.1.276 裡沒有這個類別（本機實測） |
| Write 寫進一個目錄 | 以前整個 turn 當成你拒絕授權就收掉，2.1.277 起回 `is a directory, not a file` |

## 為什麼要改

ripgrep 找不到東西的時候退出碼是 1，這是它的設計。至於 ripgrep 連起都沒起來，那是另一回事，但上層要是沒分開接，兩邊會落到同一句「沒有符合」。

[官方 troubleshooting 的搜尋段落](https://code.claude.com/docs/en/troubleshooting#search-and-discovery-issues)只收了一種情形：內建那顆 rg 在你的系統上跑不動，解法是裝系統的 ripgrep 再把 `USE_BUILTIN_RIPGREP` 設成 `0`。資源不足那種它沒寫，glob 的對齊規則也沒寫。2.1.277 補掉的是資源不足那半：起不來的時候現在會說出 errno，`EMFILE` 叫你重開 Claude Code，另外三個叫你去關別的程式。

glob 這條沒人在修。#30486 把成因寫得很清楚，rg 的 `--glob` 只要含斜線就從搜尋根目錄起算，作者的結論是文件該補一句，然後 issue 被關掉了。ripgrep 本來就這樣設計，不算它的錯。難纏的是 Grep 把 `path` 和 `glob` 並排成兩個參數，看起來互不相干，實際上前者決定後者從哪裡開始數。

## 對你的流程有什麼影響

1. 不用升級。兩條 channel 都沒動，手上是 2.1.278 就已經有上面講的兩個修正。

2. 以後寫含 `/` 的 glob，前面一律補 `**/`。差別現場就看得到：

   ```bash
   mkdir -p /tmp/g/repo-a/.github/workflows
   echo hit > /tmp/g/repo-a/.github/workflows/ci.yml
   rg -l --hidden hit --glob '.github/workflows/*.yml' /tmp/g      # 沒有
   rg -l --hidden hit --glob '**/.github/workflows/*.yml' /tmp/g   # 找得到
   ```

3. 最容易中的是 `path` 往上挪的時候。同一句 `glob: ".github/workflows/*.yml"`，`path` 指在這支 repo 的根目錄會找到 `ci.yml`，指到裝著好幾個 repo 的上層目錄就回空。worktree 和雲端 session 從 `/home/user` 出發，都是這個形狀。

4. 廣搜回空的時候，先把 `glob` 拿掉重跑一次再下結論。這條值得寫進你的 `CLAUDE.md`，因為排程跑的 `claude -p` 不會自己起疑：它拿到「沒有符合」，就接著寫「這個專案沒有 workflow」，然後你隔天早上看到的是一篇根據空結果寫出來的東西。

5. 看到 `ripgrep could not start, so nothing was searched and matches may still exist` 開頭的錯誤，先看括號裡的 errno 再決定。`EMFILE` 是 Claude Code 自己開太多檔案，重開；`ENFILE`、`ENOMEM`、`EAGAIN` 是整台機器的事，關掉別的程式。這段訊息在 2.1.276 的執行檔裡一個字都找不到，所以更舊的版本碰到同一件事，你看到的只會是查無。

6. 有讓腳本或 hook 組 `file_path` 再交給 Write 的話，組錯成目錄以前看起來像權限被拒，現在會直接說是目錄。原本靠「turn 無聲結束」當失敗訊號的地方要改。

---

*版本號與推送時間來自 npm registry 和 `downloads.claude.ai/claude-code-releases` 的 channel 檔（官方文件）。`USE_BUILTIN_RIPGREP` 與搜尋故障排除的原文來自本次抓取的 troubleshooting 頁（官方文件）。#27171 與 #30486 的狀態和成因說明來自這兩個 issue 本身（社群）。glob 對齊行為由 2.1.278 的 Grep 工具與系統 ripgrep 14.1.0 對同一組目錄實跑取得；`RipgrepSpawnResourceError`、四個 errno 的處置字串、Write 的目錄錯誤訊息，來自本次下載 2.1.276 與 2.1.278 執行檔的字串比對，三段都是 0 到有（本機實測）。*

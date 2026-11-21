---
title: "2.1.330：easel 預設開著，雲端 session 的 rm 被換掉了"
description: "changelog 寫 Added easel，但 329 的二進位裡整組程式碼已經在了，330 開的是開關，而自動畫圖預設是 true。另外雲端和 self-hosted session 的 PATH 最前面被插了一支代替 rm 的腳本。"
published: 2026-11-21
category: "Changelog"
tags: ["claude-code", "changelog", "easel", "mods", "permissions"]
annotation: "程式碼 329 就在了，330 開的是開關。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.330 | 11-20 19:16 UTC 上 npm，我查的時候過了 4.9 小時。離 329 隔 24.6 小時 |
| 時間來源 | `gh api` 在這個容器照樣 403，`pushed_at` 拿不到，上面的時間都是 npm 的 |
| 通道 | `latest` 和 `next` 都指 330。`stable` 現在是 2.1.323，昨天那篇記的還是 2.1.311 |
| easel | 內建的畫圖 mod。changelog 寫 Added，但 329 的二進位裡整組已經在了，330 開的是開關（本機實測） |
| 自動畫圖 | `autoCharts` 預設 `true`。任何 `mcp__*` 的結果都可能被接著畫一張圖，不必有人開口 |
| `autoChartSkip` | changelog 沒提的設定，逗號分隔 server 名單，可以只豁免幾台而不用整個關掉（本機實測） |
| `rm` | 雲端和 self-hosted session 的 PATH 最前面插一支代替 `rm` 的 shell 腳本，329 裡一個字都沒有 |
| 排程任務 | recurring 的壽命從 7 天延到 30 天，330 之前建的還是 7 天 |
| `max_tokens` 重試 | 329 拿掉的那個自動重試，330 放回來了 |
| 其餘 | 142 條裡 89 條是 Fixed。VSCode 佔 28 條、self-hosted runner 21 條、Code Mode 9 條。Linux 上 `node_modules` 這類大忽略資料夾拖慢 Bash、後面整個 session 看不到 file diff 的那條修了 |

## 為什麼要改

changelog 給 easel 的動詞是 Added。照字面讀會以為 330 塞了個新東西進來，但 329 的執行檔裡 `cc-plugin-easel` 已經整組都在，連拒絕畫圖時要吐哪句話都寫好了。兩版差的是 `isAvailable` 那道閘門。八月 ultraplan 那次也一樣，動詞描述的是閘門，程式碼本身沒動。

`autoCharts` 的 schema 寫 `default: !0`，判斷式是 `autoCharts !== false`，所以你沒設定它就是開的。它掛在所有 `mcp__*` 的結果上，只排除 easel 自己和 artifacts 的 publish。哪天接了一台會回時序數字的 server，圖就自己出現。官方目前沒有 easel 的文件頁，關它的機制在[管理 mod 那頁](https://code.claude.com/docs/en/plugins/mods/admin)：內建 mod 不吃 `allowManagedModsOnly` 那類設定，每一個有自己的開關。

`rm` 那支腳本 changelog 完全沒提。它補的是權限提示看不到的那一半。分類器只看得到 Claude 打進 Bash 的那一行，寫在腳本或 Makefile 裡的 `rm` 從來沒經過它，而這支 stand-in 坐在 PATH 最前面，那些也躲不掉。腳本自己的註解寫得很白：

> Stand-in for rm, first on PATH in hosted sessions while its flag is served (src/utils/shell/rmGuard.ts).

while its flag is served 那半句才是能不能遇到它的條件，遠端開關關著就不會上 PATH，你本機也碰不到。雲端 session 沒有人能回答權限提示，所以它不問，直接拒掉。

## 對你的流程有什麼影響

1. easel 的開關今天就處理掉，它預設是開的。要整個關，`~/.claude/settings.json` 加這段：

   ```json
   {
     "pluginConfigs": {
       "cc-plugin-easel@builtin": {
         "options": { "autoCharts": false }
       }
     }
   }
   ```

   `/config` 裡有同一個開關（官方文件）。鍵名只認 `cc-plugin-easel@builtin` 這個寫法。

2. 只想擋幾台的話用 `autoChartSkip`，逗號分隔，名字照工具名寫：`mcp__grafana__query` 就寫 `grafana`。它跟 `autoCharts` 放在同一個 `options` 底下。

3. 雲端 session 裡 `which rm` 不會是 coreutils 那支，寫 CI 腳本時記著。它攔的是根目錄、根目錄下一次點名 20 個以上、系統資料夾（`/usr`、`/etc`、`/var/lib` 這些）、`/home` 和 `/root`、還有它自己那支腳本所在的資料夾。你工作目錄底下的 `rm -rf node_modules` 不在名單上，不用管。要注意的是 refuse 模式連「安全檢查被信號打斷」都算不通過，那時 `rm` 整個不跑，退出碼也不是 0。腳本裡把 `rm` 退出碼吃掉的地方去看一下，不然後面會當成檔案已經刪掉了。

4. 排程任務延到 30 天這條，雲端出刊這支不吃。它是 cloud scheduled task，跟 session-scoped 任務的過期是兩套東西。本機 `/loop` 建過又想留著的，得砍掉重建才拿得到 30 天。[官方文件那頁](https://code.claude.com/docs/en/scheduled-tasks)現在還寫著 Seven-day expiry，別照它估時間。

5. `max_tokens` 超過上限的自動重試回來了。329 當天如果你在外面包了一層 retry 或把 `max_tokens` 往下壓過，現在是兩層重試疊著跑，拿掉你自己那層。

6. 全域那份 `CLAUDE.md` 跑一次 `grep -nE '^\[[^]]+\]:' ~/.claude/CLAUDE.md`。330 修掉的是「檔案裡有 HTML 註解就把 link reference definition 整個吃掉」，中了的話你之前那些連結在系統提示裡是空的。這個 repo 的 CLAUDE.md 有兩個 HTML 註解但沒有 link reference definition，不用管（本機實測）。

7. 升。Linux 上大忽略資料夾拖慢 Bash 的那條，這個 repo 正好中；compact 完卡好幾分鐘和 WebFetch 卡住的兩條也一起修了。

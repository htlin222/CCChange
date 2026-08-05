---
title: "2.1.220 沒有新東西，但裡面躺著一支被關掉的 /whiteboard"
description: "第九天沒有新版。2.1.220 在介面上跟 2.1.219 一個字都不差，倒是 2.1.218 偷偷帶進來一支官方沒公佈的內建 skill，而它的開關寫死 false。"
published: 2026-08-03
category: "Changelog"
tags: ["claude-code", "changelog", "whiteboard", "skills", "npm"]
annotation: "版本號動了，介面沒動。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.220 | 沒有新版第九天。這一版跟 2.1.219 在使用者看得到的地方完全一樣 |
| `/whiteboard` | 2.1.218 就帶進來的內建 skill，完整實作，但 `isEnabled` 寫死 `false`，叫不動 |
| workspace trust | 信任的粒度是整個 repository，包含它其他的 worktree 和子目錄 |
| npm 套件結構 | 主套件只是 22 KB 的殼，執行檔在八個平台專屬的 optionalDependencies 裡 |

## 為什麼要改

這一天沒有什麼要你改。距離上一版 217 小時，排在這個套件 476 次發佈的間隔裡是第二長，僅次於元旦那次。正常心跳是一天一版，這個安靜有點反常。我搜了一輪，沒有任何官方或社群說明，所以以下純屬猜測：看起來像有一批東西在等統一的發佈時機。

`/whiteboard` 算是支持這個猜測的一點證據。它不是散落的字串，是一支註冊完整的 skill，有 `template.html`、有合併腳本，連「什麼時候該主動提議畫圖」的語氣都調過。[官方 commands 參考頁](https://code.claude.com/docs/en/commands)的內建清單裡沒有它。從 2.1.218 到 2.1.220 這九天它還在長，代表有人在動它。但寫死的 `return !1` 躺個一年也不是沒發生過，別太興奮。

workspace trust 那條是 2.1.218「agent frontmatter hooks 要求所在資料夾已接受 workspace trust」的附帶效果，粒度大到值得單獨講一句，文件沒強調。

## 對你的流程有什麼影響

1. 2.1.220 升不升都行。介面上不會有任何一個字不一樣，所以如果你在等某個顯示問題被修掉，這版不是。
2. 不要去試 `/whiteboard`，打了什麼都不會發生。想看它長什麼樣就等，不要為它排時程。
3. 掛別人的 repo 進來之前先想一下。按下信任是一次信整個 repository，連它其他的 worktree 和子目錄一起。
4. 要在私有 registry 做鏡像、或把某一版釘進 Docker image 的，你要處理的是九個套件不是一個：主套件加八個平台包，postinstall 會去挑對應的那個。
5. 這幾天沒事做的話，把 2.1.219 那三條 Opus 5 的 breaking change 補完比較實在，前一篇有清單。

---

*版本時間與套件結構來自 npm registry 與本次下載解開的 tarball（本機實測）。`/whiteboard` 的註冊內容與 `isEnabled` 判定來自比對 2.1.217 至 2.1.220 執行檔（本機實測）。內建 skill 清單為撰稿時抓取（官方文件）。*

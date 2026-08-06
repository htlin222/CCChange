---
title: "2.1.220 沒有新東西，但裡面躺著一支被關掉的 /whiteboard"
description: "第九天沒有新版。2.1.220 在介面上跟 2.1.219 一個字都不差，倒是 2.1.218 偷偷帶進來一支官方沒公佈的內建 skill，而它的啟用判定是一個寫死的 false。"
published: 2026-08-03
category: "Changelog"
tags: ["claude-code", "changelog", "whiteboard", "skills", "npm"]
annotation: "版本號動了，介面沒動。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.220 | 沒有新版第九天。這一版跟 2.1.219 在使用者看得到的地方完全一樣，兩者只差七小時發佈 |
| `/whiteboard` | 2.1.218 就帶進來的內建 skill，實作完整，但啟用判定裡串了一個永遠回 false 的函式，叫不動 |
| workspace trust | 信任的粒度是整個 repository，包含它其他的 worktree 和子目錄 |
| npm 套件結構 | 主套件只有 7 個檔案，執行檔在八個平台專屬的 optionalDependencies 裡 |

## 為什麼要改

這一天沒有什麼要你改。上一版是 2026-07-24 發的，到現在九天多，而正常心跳是一天一版。我搜了一輪，官方和社群都沒有說法，所以底下純屬猜測：看起來像有一批東西在等統一的發佈時機。

`/whiteboard` 算是支持這個猜測的一點證據。它不是散落的字串，是一支註冊完整的 skill，有 `template.html`、有合併腳本，連「什麼時候該主動提議畫圖」的語氣都調過。但它進不了選單：

```console
$ V=~/.local/share/claude/versions
$ strings -a $V/2.1.220 | grep -o 'function QGS(){[^}]*}'
function QGS(){return FQi()&&j$e()}
$ strings -a $V/2.1.220 | grep -o 'function FQi(){[^}]*}'
function FQi(){return!1}
```

`QGS` 就是那支 skill 的 `isEnabled`，而 `FQi()` 永遠回 `false`，後面那個條件根本不會被算。這跟 ultraplan 那種遠端 flag 不一樣，這個是編譯進去的，翻不動。[官方 commands 參考頁](https://code.claude.com/docs/en/commands)的內建清單裡也沒有它。從 2.1.218 到 2.1.220 這九天它還在長，代表有人在動它。但寫死的 `return!1` 躺個一年也不是沒發生過，別太興奮。

workspace trust 那條是 2.1.218「agent frontmatter hooks 要求所在資料夾已接受 workspace trust」的附帶效果，粒度大到值得單獨講一句，文件沒強調。

## 對你的流程有什麼影響

1. 2.1.220 升不升都行。介面上不會有任何一個字不一樣，所以如果你在等某個顯示問題被修掉，這版不是。
2. 不要去試 `/whiteboard`，打了什麼都不會發生。想看它長什麼樣就等，不要為它排時程。
3. 掛別人的 repo 進來之前先想一下。按下信任是一次信整個 repository，連它其他的 worktree 和子目錄一起。
4. 要在私有 registry 做鏡像、或把某一版釘進 Docker image 的，你要處理的是九個套件不是一個：主套件加八個平台包，postinstall 會去挑對應的那個。用 `npm view @anthropic-ai/claude-code@2.1.220 optionalDependencies` 看清單。
5. 這幾天沒事做的話，把 2.1.219 那三條 Opus 5 的 breaking change 補完比較實在，前一篇有清單。

---

*發佈時間與套件結構來自 npm registry（本機實測）。`/whiteboard` 的啟用判定來自本機 2.1.220 執行檔，指令與輸出如上（本機實測）。內建 skill 清單為撰稿時抓取（官方文件）。*

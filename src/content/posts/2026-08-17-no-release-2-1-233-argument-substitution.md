---
title: "沒有新版：2.1.233 補了參數那頭，Anthropic 自己的 xlsx skill 還在漏"
description: "latest 停在 2.1.233 已經 53 小時。趁空檔掃了機器上 16 份 SKILL.md，唯一中槍的是官方的 xlsx，裡面三個試算表絕對位址長得跟位置參數一樣，被替換掉了。"
published: 2026-08-17
category: "Changelog"
tags: ["claude-code", "changelog", "skills", "arguments", "xlsx"]
annotation: "`$B$2` 在 skill 檔案裡跟 `$2` 是同一件事，替換引擎分不出來。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 新版 | 沒有。npm 和 `downloads.claude.ai` 的 `latest` 都還是 2.1.233，08-14 18:50 UTC 發的，距這篇 53.4 小時 |
| `stable` | 2.1.224，08-07 01:36 UTC 發的，滿十天 |
| 2.1.233 那條參數替換修正 | 補的是參數那一頭。填進去的值不再被下一輪替換當成 placeholder 再吃一次 |
| 沒補的那一頭 | skill 檔案裡寫著的 `$2`、`$5` 照樣被當成位置參數替掉。這是設計如此，要防得自己加反斜線 |
| 現在中槍的 | Anthropic 自己的 `xlsx` skill。SKILL.md 第 53、78、94 行有三個試算表絕對位址 `$B$2`、`$B$5`、`$B$6` |
| 拿 2.1.233 的函式實跑 | 參數有三個詞以上時，`='[1]Returns Analysis'!$B$2` 會變成 `$B` 接上你參數的第三個詞 |
| 其餘的 | `~/.claude/skills` 加這個 repo 共 16 份 SKILL.md，另外 15 份一處都沒有 |

## 為什麼要改

[官方文件](https://code.claude.com/docs/en/skills)把跳脫寫得很清楚：

> To include a literal `$` before a digit, `ARGUMENTS`, or a declared argument name, such as `$1.00` in prose, escape it with a backslash: `\$1.00`.

寫是寫了，自家的 xlsx skill 沒照做。替換引擎認的是 `/\$(\d+)(?!\w)/`，`$B$2` 尾巴那個 `$2` 後面接反引號，剛好符合。它分不出這是 Excel 的絕對位址還是第三個參數。

用 2.1.233 的替換函式跑第 53 行：

```
參數 "幫我把 Q3 的銷售表整理成一張 pivot"
  前：`='[1]Returns Analysis'!$B$2`
  後：`='[1]Returns Analysis'!$B的銷售表整理成一張`
```

參數只有一個詞就不會動，因為索引 2 不存在，引擎會原樣留著。所以這件事平常看不見，要到你一次講清楚需求的時候才發作，而且不報錯。

2.1.233 修的是另一半：以前參數值填進去之後，後面幾輪替換還會再掃它一次。四輪的順序是 `$name`、`$ARGUMENTS[N]`、`$N`、`$ARGUMENTS`，前一輪填的被後一輪吃掉。新版把值裡的 `$` 換成 U+FFFF、兩端包一對 U+FFFE，四輪跑完才還原。

## 對你的流程有什麼影響

1. 自己掃一次：`grep -rnP --include=SKILL.md '\$\d+(?!\w)|\$ARGUMENTS\[' ~/.claude/skills .claude/skills`。
2. 我這邊只吐出 xlsx 那三行。16 份裡沒有一份寫 `$ARGUMENTS`，全靠沒有 placeholder 時自動附在結尾的那行 `ARGUMENTS: <value>`，那條路不經過替換。
3. 別去改那個檔案。manifest 裡它是 `source: anthropic`，`lastUpdated` 今天 00:14 UTC 才寫過，你改完下次同步就沒了。
4. 要做的是往後看輸出。叫模型做跨檔案的試算表時，它寫出來的絕對位址自己核一下。`$B$2` 被替掉之後長相很正常，不會有錯誤訊息。
5. 真要少踩，喚起 xlsx 的那句話講短一點。索引不存在的位置參數原封不動留著，一個詞的參數完全不會觸發。
6. 哪天你自己寫用到 `$0`、`$1` 的 skill，下限訂 2.1.233。在 `stable` 通道的話手上是 2.1.224，那支執行檔的替換函式跟 2.1.232 逐字一樣，參數那頭的修正還沒傳過去。
7. 昨天第 8 條還開著。`claude plugin validate . --strict` 對這個 repo 跑起來是 Validation passed，要進 CI 得另開一支 PR。

---

*版號與發版時間來自 npm registry 和 `downloads.claude.ai/claude-code-releases`（官方文件）。跳脫規則引自 skills 文件（官方文件）。四輪替換順序、U+FFFF／U+FFFE 的包法、2.1.224 與 2.1.232 逐字相同的舊版函式、16 份 SKILL.md 的掃描結果、xlsx 第 53 行的實際替換結果、`plugin validate --strict` 的輸出，來自本次下載並比對 2.1.224、2.1.232、2.1.233 的 linux-x64 執行檔（本機實測）。此環境沒有 `gh`，`pushed_at` 拿不到。*

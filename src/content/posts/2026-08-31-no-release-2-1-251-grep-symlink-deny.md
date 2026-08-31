---
title: "沒有新版：2.1.251 補的是 Grep 走 symlink 那條路，上一篇我測錯了"
description: "latest 停在 2.1.251 已經 56.7 小時。把上一篇沒測出來的那條重跑一次：deny 規則一直是有效的，2.1.248 漏掉的只有搜尋工具那條路。"
published: 2026-08-31
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "grep", "symlink"]
annotation: "Grep 回你找不到，可能是規則把它濾掉了，不是真的沒有。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 新版 | 沒有。npm 的 `latest` 還是 2.1.251，08-28 15:34 UTC 發的，距這篇 56.7 小時 |
| `stable` | 2.1.236，08-19 18:45 UTC 發的，十一天沒動，後面疊了 13 個版本 |
| 上一篇第 7 點 | 作廢。`Read()` deny 規則一直是有效的，寫在專案 `.claude/settings.json` 或用 `--settings` 帶進去都擋得住 |
| 2.1.248 真正漏的 | 檔案層的 deny 規則，管不到 Grep 從 symlink 目錄走進去撈到的檔案 |
| 2.1.251 | 同一個測試從吐出整行變成 `No matches found` |
| 擋下來的方式 | 靜默過濾。沒有錯誤也沒有警告，那個檔就是不在結果裡 |
| Bash 的 `grep -r` | 兩版都拿得到，`Read()` 的規則管不到它 |

changelog 那句話還帶到 Glob，那半我沒重現出來。不管有沒有設 deny 規則，`link/*.txt` 在 2.1.251 和 2.1.248 都回空的，Glob 根本不走進 symlink 目錄（本機實測）。

## 為什麼要改

Read、Write、Edit 早就會把 symlink 解到底再去比對規則。我拿 2.1.248 直接讀 `link/inner.txt`，一樣被擋掉，所以漏的從來不是這條。

漏的是搜尋工具。Grep 收到的參數是一個目錄，規則比對就停在那個目錄上，底下一個一個撈出來的檔案沒有再過一次 `Read()`。所以你把 `real/inner.txt` 明白寫進 deny、`real` 這層卻沒擋的時候，一條 `link -> real` 就繞過去了。[官方權限文件](https://code.claude.com/docs/en/permissions)現在把這件事寫成一句話：「Grep and Glob search the directory the `path` argument resolves to. Claude Code applies `Read` deny rules to that directory.」同一頁也講了 deny 碰到 symlink 的比法，「apply when either the symlink path or its target matches」，符號本身和它指到的地方，中一個就算。

同一類問題的另外兩條路沒補。GitHub issue #28008 報的是 Bash 的 `grep -r` 會漏內容、Glob 會漏檔名，那張單被關成 not planned（社群）。

## 對你的流程有什麼影響

1. 把上一篇第 7 點畫掉。壞的是那次的測試，不是規則。下面這個寫法今天在 2.1.251 上跑過，直接讀會回「File is in a directory that is denied by your permission settings.」：

   ```json
   { "permissions": { "deny": ["Read(./real/inner.txt)"] } }
   ```

2. 你如果靠 deny 規則不讓 Grep 掃到 `.env` 這類東西，2.1.251 當下限。我用同一份設定、同一個 `link -> real` 的 symlink，在 2.1.248 上 Grep 出來的是 `link/inner.txt:1:MARKER_BETA_4417 tail`，整行原樣。
3. 記住它擋人的時候不吭聲。一個目錄底下兩個檔都中關鍵字，其中一個被 deny，2.1.251 只會回沒被擋的那個，沒有警告。Claude 那邊看到的是「找不到」，不是「不給看」，它接下來會照著這個錯誤前提往下推。
4. 想要失敗看得見就寫目錄層。`Read(./real/**)` 在 2.1.248 和 2.1.251 都會直接報 `Permission to read …/link has been denied`，訊息裡還會把 symlink 那個路徑名字印出來。檔案層的規則沒有這個待遇。
5. 別把它當安全邊界。同一份設定我叫它跑 `grep -r MARKER_BETA .`，2.1.251 照樣回 `real/inner.txt:MARKER_BETA_4417 secret`。要真的擋住，`Read()` 之外得再補一條 Bash 的 deny，或者那個檔就不要放在工作目錄底下。
6. Glob 不用管，它進不去 symlink 目錄。

---
title: "沒有新版：2.1.332 把 hook 的 ask 理由補回檔案工具的對話框"
description: "24 小時內沒有新版。332 修掉一個從 2.1.233 拖到現在的回歸：hook 回 ask 時想跟你說的理由，在 Read、Edit、Write 的權限對話框上是空的。"
published: 2026-11-28
category: "Changelog"
tags: ["claude-code", "changelog", "hooks", "permissions"]
annotation: "按下 y 的時候，hook 想講的話沒送到"
---

## 改了什麼

沒有新版。2.1.332 在 11/24 22:06 UTC 上 npm，到現在 74.3 小時。

| 項目 | 現狀 |
| --- | --- |
| `latest` / `next` | 都還指 2.1.332 |
| `stable` | 2.1.326，11/16 18:43 UTC 推的，落後六個版、11.2 天 |
| 官方 CHANGELOG | 最新一節還是 2.1.332 |
| 這篇要講的 | PreToolUse hook 回 `ask` 的理由，以前在五個檔案工具的對話框上不顯示 |
| 同一版一起修的 | 四種會把 session 凍住的 hook 和權限規則寫法 |

`anthropics/claude-code` 的 `pushed_at` 又拿不到，容器的 egress 讓 GitHub API 回 403。時間都來自 npm registry。

## 為什麼要改

hook 回 `ask` 的時候，`permissionDecisionReason` 應該印在那個權限對話框上。[官方文件](https://code.claude.com/docs/en/hooks)講得很短：「For `"ask"`, shown to the user in the permission prompt.」

Read、Grep、Glob、Edit、Write 這五個沒照做。回報的人在 2.1.301 上測 Write，看到的是「Only the generic 'Create file' dialog appeared, with no reason text」；按了 No 之後翻 Ctrl+O 也沒有，因為被拒絕的呼叫當時根本不會寫進 transcript。他把後果講得比 changelog 準：「the user may approve something they would have refused.」（社群，anthropics/claude-code#102892）

這個洞開很久了。同樣的行為在 2.1.233 就有人報過、維護者也確認過，接著因為沒人動被自動關掉，2.1.301 再報一次，332 才修。

程式是真的動了。332 多出一個取理由的函式，帶 `isTheHooksOwn` 這個欄位，331 的執行檔裡一次都沒出現（本機實測）。

## 對你的流程有什麼影響

1. 這個 repo 不用管，`.claude/settings.json` 裡沒有 `hooks` 這個鍵（本機實測）。
2. 出刊那條排程也不用管。壞掉的只有終端機畫的那個框。我在 331 和 332 各跑一次 `claude -p`，hook 回 `ask` 夾一串 `CCCHANGE_SENTINEL_REASON_ABC`，兩個版本都把它送到模型手上了（本機實測）。
3. 升上 332 之後，把全域那些會回 `ask` 的 PreToolUse hook 的理由字串重讀一次。以前那串字寫了也沒人看得到，現在 Read、Edit、Write 的框上會照實印出來。
4. hook 要給 Claude 看的字串，一條別超過 10,000 字。超過的話整段會搬到 session 目錄下的檔案，原位只留前 2,000 字，而且沒人會叫 Claude 去讀它。我在 332 上送 13,800 字的 `additionalContext`，哨兵字串埋在第 4,800 字，它回我 `NOT_VISIBLE` 加一個 `tool-results/…-additionalContext.txt` 路徑（本機實測）。這個上限沒有環境變數可以調。
5. changelog 另外提了一個「超過大約 50,000 字會被縮短」。那管的是另一段文字：hook 擋下來、或自己掛掉的時候丟出來的那串。跟上面的 10,000 不同一條路，hooks 文件裡也查不到這個數字。會長到五萬字的東西就不要往 blocking error 裡塞。
6. 權限規則裡一條 pattern 掛了好幾個 `*` 的，去全域 settings 撈一遍。332 修的凍結就是這種 pattern 碰上長指令。`claude doctor` 幫不了你：我拿 `Bash(*node_modules*fixture*snapshot*)` 餵 331 和 332，兩邊都只回安裝相關的那三個警告，規則本身一個字都沒提（本機實測）。
7. `stable` 通道那台現在是 2.1.326，上面這些修的一個都還沒下去。
8. 社群有篇文章說 332 上 hook 印 `allow` 再 exit 1 會把指令擋掉。我在 331 和 332 的 `claude -p` 下各試一次，`echo` 都正常跑完，exit 1 依舊是非阻斷的（本機實測）。

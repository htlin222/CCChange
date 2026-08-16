---
title: "沒有新版：latest 停在 2.1.233，stable 還在 2.1.224"
description: "美西的週末，六月以來 65 次發版沒有一次落在星期天。趁今天去看你的 autoUpdatesChannel 寫的是哪一邊，stable 落後九個版，擋掉的只有回歸。"
published: 2026-08-16
category: "Changelog"
tags: ["claude-code", "changelog", "autoUpdatesChannel", "release-channel"]
annotation: "設定檔的通道列舉其實吃三個值，第三個叫 rc，端點是 404。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 新版 | 沒有。npm 和 `downloads.claude.ai` 的 `latest` 都還是 2.1.233，08-14 18:50 UTC 發的，距這篇 29.3 小時 |
| `stable` 通道 | 2.1.224，08-07 01:36 UTC 發的，8.9 天前，落後九個版 |
| 發版日 | 六月以來 65 次發版，換成美西時間 3 次在星期六、0 次在星期天。現在是美西星期六傍晚 |
| `autoUpdatesChannel` | 設定檔的列舉吃三個值 `latest`、`stable`、`rc`，它自己的欄位說明只寫前兩個 |
| `rc` | `/config` 把它顯示成 slow，而 `claude-code-releases/rc` 回 404。2.1.224 的 schema 裡就有這個值 |
| 2.1.230 | 沒發過，npm 和 changelog 都沒有這一版 |

## 為什麼要改

今天沒東西可升，這件事不用讀出弦外之音。

要看的是另一邊。[官方文件](https://code.claude.com/docs/en/setup)把 `stable` 寫得像保險：

> `"stable"`: use a version that is typically about one week old, skipping releases with major regressions

一週是真的，擋的也真的只有回歸。2.1.224 之後那幾條權限修正一條都還沒傳過去：2.1.228 把 claude.ai 同步下來的 skill 收進沙盒，不再蓋掉本機同名指令，body 裡的 `!` 不執行、`@` 不展開；2.1.229 讓 `/commit-push-pr` 停止自動放行 `--force`、`--amend`、`--no-verify`；2.1.232 修掉巢狀 git repo 從上層目錄繼承信任。

`rc` 不是這幾天冒出來的，2.1.224 的 schema 裡就在。執行檔自己寫了通道怎麼查：GET `https://downloads.claude.ai/claude-code-releases/<channel>`，回純文字版號。照著打 `rc` 和 `slow`，兩個都 404。

## 對你的流程有什麼影響

1. 今天不用等升級。最快也是星期一。
2. 打開 `~/.claude/settings.json` 找 `autoUpdatesChannel`。沒有這個鍵就是 `latest`，你手上是 2.1.233，不用管。
3. 寫的是 `stable` 的話，你跑的是 2.1.224，上面那幾條權限修正都不在你這台。同步 skill 那條最該補：2.1.224 上，claude.ai 同步下來的 skill 還蓋得掉你本機的同名指令。
4. 同一台上 Todo 工具還在，因為 2.1.224 裡根本沒有那個模型閘門。別把它當成官方改回去了。
5. 別去設 `rc`。schema 收得下去，`/config` 顯示成 slow，然後更新檢查對著一個 404 打。
6. 真要從 latest 退去 stable，不會被降版。文件寫切換時會問你留在原版還是允許降，選留下就把 `minimumVersion` 釘在當前版號，執行檔裡的分支也是這樣寫的。我自己不會換過去，權限修正慢一週到比偶爾踩一次回歸更難受。
7. 昨天第 2 條可以結了。這個 repo 的 `.claude/` 底下沒有一處提到 TodoWrite 或 TaskCreate，`CLAUDE_CODE_ENABLE_TODO_TOOLS` 不用開。
8. 昨天第 5 條還開著。`claude plugin validate` 要進 CI 得另開一支 PR，每日這支不能碰 `scripts/`。

---

*版號與發版時間來自 npm registry 與 `downloads.claude.ai/claude-code-releases`，條目引自官方 changelog 與 setup 文件（官方文件）。通道列舉的三個值、`rc` 的 404、`minimumVersion` 的釘版分支、2.1.224 裡不存在的 Todo 閘門，來自本次下載並比對 2.1.224 與 2.1.233 的 linux-x64 執行檔（本機實測）。此環境沒有 `gh`，`pushed_at` 拿不到。*

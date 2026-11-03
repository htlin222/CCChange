---
title: "2.1.317 只上 next：它開始講你的 hook 為什麼沒在跑"
description: "2.1.317 昨晚上 npm，只掛在 next，CHANGELOG 還沒有它的段落。執行檔裡多出一組訊息，專講你自己的 hook 這個 session 沒載到，其中兩句是 onFailure: \"block\" 不會擋。"
published: 2026-11-03
category: "Changelog"
tags: ["claude-code", "changelog", "hooks", "settings", "release-channel"]
annotation: "設定檔是對的，hook 不在那裡。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.317 | 11-02 23:57 UTC 上 npm，只掛 `next`，`latest` 還是 2.1.316 |
| CHANGELOG | 沒有 2.1.317 的段落，最上面還是 316 |
| hook 沒載到的警告 | 三句新訊息，分別是啟動模式把你的設定排除、設定沒跑完、上層程式擋掉（執行檔 0→4 次）|
| `onFailure: "block"` 的警告 | 兩句，一句是 session 已經在跑所以沒註冊 hook，一句是接手 initialize 的程式不認這個欄位（0→2 次）|
| routine 要按確認 | 建立、修改、立刻執行各多一道，文案是「runs Claude under your claude.ai account」（0→2 次）|
| symlink | 五句新訊息提到 symlink 或 Windows junction，其中一句是「hooks 目錄是連結，沒有讀」（0→5 次）|
| `CLAUDE_CODE_PERSONAL_HOOKS_OFF` | 新的（0→5 次），env-vars 那頁搜不到 |
| 另外三個新變數 | `CLAUDE_CODE_DISABLE_MCP_TASKS`、`CLAUDE_CODE_DISABLE_SUBAGENT_HANDBACK`、`CLAUDE_CODE_ENABLE_WRAP_UP`，文件也都沒有 |
| `.claude` 做成 symlink | hook 照樣觸發，316 和 317 一樣（本機實測）|
| `claude doctor` | 兩版都不提 symlink，警告一樣三條（本機實測）|
| `stable` | 還是 2.1.309，11 天前那版 |

## 為什麼要改

`onFailure: "block"` 不生效的情形，[hooks 那頁](https://code.claude.com/docs/en/hooks)本來就列了一串。事件就有四個不吃：

> The field has no effect on these hooks: `Stop`, `SubagentStop`, `TaskCompleted`, and `TeammateIdle` hooks

這些你讀自己的 `settings.json` 就查得出來，欄位寫在哪個 matcher 底下是你自己打的。

317 補的是另一類。那句新訊息是這樣寫的：

> This session was already running and did not register your hooks, so a hook set to onFailure: "block" would never run. Start a new session, or remove onFailure: "block" from your hooks.

跟你的檔案沒關係。同一組還有三句，講的是啟動模式不載你的設定、設定跑到一半沒完、以及上層程式直接把 hook 擋在外面。這四句在 316 的執行檔裡一句都沒有，所以同樣的情形發生在 316 上，終端機不會提一個字。

routine 那三道確認跟 hook 無關。建立、修改、立刻執行排程任務各要你按一次，文案強調它會用你 claude.ai 的帳號跑。

## 對你的流程有什麼影響

1. 先別換通道。2.1.317 只在 `next`，你手上該是 2.1.316，維持現狀就好：

```bash
claude --version
grep -n 'autoUpdatesChannel' ~/.claude/settings.json
```

   沒印東西就是 `latest`，不用動。

2. 查自己有沒有踩到那一串既有的限制：

```bash
grep -n 'onFailure' ~/.claude/settings.json
```

   有印出來的話，看它掛在哪個事件下。`Stop`、`SubagentStop`、`TaskCompleted`、`TeammateIdle` 這四個事件上它不生效，`async: true` 的 command hook 也不生效。這是 316 就有的行為，317 沒改。

3. 新的那幾句警告不用去追。`claude doctor` 兩版輸出一字不差，`claude -p` 也印不出來，它們掛在我這裡叫不起來的啟動路徑上。等它進 `latest`、你某天真的看到其中一句，再照它說的開新 session。

4. `~/.claude` 做成 symlink 指到 dotfiles repo 的，不用管。我把 `.claude` 設成 symlink 實測過，`PreToolUse` hook 照樣觸發，316 和 317 都一樣。那句「hooks 目錄是連結，沒有讀」講的不是 `settings.json` 裡的 hooks。

5. 四個新變數先別寫進 `settings.json` 的 `env`。文件一個都搜不到。`CLAUDE_CODE_PERSONAL_HOOKS_OFF` 從名字看像是關掉你自己的 hook，猜錯方向的代價是你以為擋著的東西其實沒擋，這種變數我不碰。

6. 有排程任務的，317 進 `latest` 之後第一次跑會停下來等你確認。這道確認是好事，別急著找開關關掉它。

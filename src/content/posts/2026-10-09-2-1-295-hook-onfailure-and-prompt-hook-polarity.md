---
title: "2.1.295：command 和 http hook 拿到 onFailure，2.1.294 修掉 prompt hook 把命令句判反的問題"
description: "寫成「擋掉某某」的 prompt hook，在 2.1.293 和之前判出來是放行。2.1.295 給 command 和 http hook 一個 onFailure 欄位，設成 block 才算真的擋。"
published: 2026-10-09
category: "Changelog"
tags: ["claude-code", "changelog", "hooks", "permissions", "settings"]
annotation: "你寫「擋掉會刪檔的指令」，它判這句成立，回來的是放行。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.294 | 10-08 03:43 UTC 上 npm，只有 2 條 |
| 2.1.295 | 10-08 18:23 UTC 上 npm，距這篇 5.8 小時，144 條 |
| 命令句寫法的 `prompt` hook | 2.1.293 的評審被問的是「條件成立嗎」，所以 `Block commands that...` 判成立之後回的是 `ok: true`，那是放行（本機實測：2.1.294 整條修正就是把這段 system prompt 換成「這個動作可不可以過」） |
| Stop／SubagentStop 的 prompt hook | changelog 說判法也調了，但 293 和 294 執行檔裡這段 system prompt 和包在外面的問句一字不差（本機實測） |
| `onFailure` | command 和 http hook 新增的欄位，吃 `continue`（預設）或 `block`（本機實測：2.1.293 的 hook schema 裡沒有它） |
| 什麼算失敗 | 起不來、逾時、exit code 不是 0 也不是 2、印出壞掉或過不了驗證的 JSON。`block` 一律當 exit 2 辦 |
| `onFailure` 不生效的地方 | `async: true` 和 `asyncRewake: true` 的 hook，再加 Stop、SubagentStop、TaskCompleted、TeammateIdle 這四個事件（本機實測：schema 自己的說明就這樣寫） |
| `prompt`／`agent`／`mcp_tool` hook | 沒有 `onFailure` 可以設，只有 command 和 http 兩個 schema 有（本機實測） |
| `CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG` | changelog 和文件都沒提的新變數。開了之後 skill 和 command 的 `allowed-tools` 不再預先放行工具、自訂 agent 不能自己宣告 MCP server 也不能放寬 permission mode、你自己的 hook 在 PreToolUse 等五個事件上變成必須成功（本機實測：2.1.293 執行檔裡找不到這個名字） |
| 雲端 routine | 有些舊 routine 開跑時沒把存好的 prompt 交給 Claude，這版修掉（官方 changelog） |

剩下大半跟你無關：Claude apps gateway 一整批（`upstream_ttfb_ms`、每個 upstream 的 `models` 白名單、Bedrock 的 CountTokens、admin 花費頁）、Claude Tag 的 Slack 設定五條、自建 runner 兩條、VS Code 四條。

## 為什麼要改

hook 壞掉就放行這件事，[hooks 文件](https://code.claude.com/docs/en/hooks)自己講得很白：

> When you set up a policy hook, watch for this notice on its first run: a mistyped path in `settings.json` leaves the gate silently disabled.

在今天以前，官方的辦法就是第一次跑的時候自己盯一下那行通知。http hook 更鬆，文件寫 non-2xx 和連不上都算 non-blocking error、執行照跑，status code 本身也沒辦法表達擋下。`onFailure: "block"` 補的就是這段。那頁還沒收錄這個欄位，我今天抓下來 grep 是零筆。

prompt hook 是另一種坑。文件對 `prompt` 只說是送給模型評估的提示文字，沒說該寫成條件還是寫成指令。寫成指令的人就把極性接反了：「擋掉會寫到 repo 外面的指令」被判為成立，傳回來的是 `ok: true`，Claude Code 讀到的是可以過。搜了一輪，社群還沒人寫到這兩版，現在找得到的 hook 教學講的都還是舊的 exit code 模型。

## 對你的流程有什麼影響

1. 先升到 2.1.295。極性那條沒有設定可以繞，只能靠升版。

2. 打開全域 `~/.claude/settings.json`，把每個 `type: "prompt"` 和 `type: "agent"` hook 的句子讀過。開頭是 `Block` 或 `Reject` 這類命令句的，在 2.1.293 和之前都是放行。Stop 和 SubagentStop 上的不受影響。

3. 真的要擋的東西別交給 prompt hook。它連 `onFailure` 都沒有，模型判錯就過去了，而 294 修的也只是評審那段 system prompt。要擋就寫成 command hook，`exit 2`，再加一個欄位：

```json
{ "type": "command", "command": "~/.claude/hooks/gate.sh", "onFailure": "block" }
```

4. 加之前先確認那支 hook 沒有 `async: true`。有的話欄位整個被忽略，只在 debug log 留一行 warning。設定檔看起來是對的。

5. Stop、SubagentStop、TaskCompleted、TeammateIdle 上的 hook 不用加，一樣會被忽略。

6. 哪天 skill 的 `allowed-tools` 突然不預先放行工具了，先 `env | grep RESTRICT_PERSONAL_CONFIG`，不要先去改 skill。這個變數開著就會往背景 session 一路傳下去，而且在這個模式下叫不動雲端 agent，只剩 `isolation: "worktree"` 可以用。

7. 這支每日出刊是雲端 routine，67 篇裡只缺 09-04 那天。再遇到 routine 起了一個沒拿到 prompt 的 session，不用自己查，這版修了。

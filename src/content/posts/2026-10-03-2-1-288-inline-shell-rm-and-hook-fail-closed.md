---
title: "2.1.288：bash -c 裡的危險 rm 之前沒進檢查，hook 比對失敗從放行改成擋下"
description: "allow rule 配對的是外層那個字，-c 後面整串 shell 從來沒被拆開看過。同一版把比對不出來的 PreToolUse hook 從靜靜跳過改成擋掉那次呼叫。"
published: 2026-10-03
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "hooks", "rules"]
annotation: "設來擋東西的 hook，以前在它自己壞掉的時候最放鬆。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.288 | 10-02 18:30 UTC 上 npm，距這篇 5.7 小時，89 條 |
| `bash -c` 裡的危險 `rm` | shell allow rule 或 bypassPermissions 放行時，`-c` 後面那串字裡的 `rm -rf ~` 不會被攔（本機實測：2.1.287 的檢查走不進那串字，2.1.288 會） |
| PreToolUse／PermissionRequest hook | matcher 比對失敗、或 tool input 序列化不出 JSON，之前是整個 hook 跳過、呼叫照跑，現在擋掉（官方文件） |
| path-scoped `.claude/rules` | Write／Edit 建立或改到 `paths` 範圍內的檔案會載規則了，之前只有 Read 算（官方文件） |
| 背景指令時限 | 只在 unattended session（`-p`、Agent SDK、CI、雲端）生效，terminal、桌面 app、VS Code 沒上限 |
| `claude project purge` | 改名 `claude purge`，舊名還通並印一行提示（本機實測：2.1.287 連這個子指令都沒有） |
| `CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS` | gateway 拒收 structured output 時 session 標題、memory recall、prompt hook 會壞，這支整個關掉（本機實測：2.1.287 的執行檔裡找不到這個變數） |
| `/code-review --max-findings` | 吃 `<n>` 或 `all`，設過會沿用下去，要還原得下 `--max-findings default` |
| `$.ui.selection()` | mods 拿得到 fullscreen 下最後選取的那段文字（本機實測：2.1.287 沒有這支 API） |

剩下大半跟你無關：VS Code 三條、screen reader 一批、Bedrock 和 Vertex 的登入與 model 檢查、resume 掉 context 的那四條、Claude Tag 的 Slack 設定。

## 為什麼要改

危險 `rm` 的檢查本來就在，漏的是入口。`Bash(bash:*)` 這類 allow rule 配對的是外層那個字，`-c` 後面是一整串不透明的 shell，從來沒被拆開看過。2.1.288 補上這段（官方 changelog 掛的是 issue #96300）。

hook 那條是方向反過來了。比對不出來的 hook 之前當成「沒有 hook 要跑」，於是你設來擋東西的那支，在它自己壞掉的時候反而最放鬆。現在改成擋掉那次呼叫。

`.claude/rules` 的 `paths` frontmatter，[hooks 文件](https://code.claude.com/docs/en/hooks)的 `path_glob_match` 寫得很清楚：Claude 碰到符合的檔案才觸發。問題是 Write 新建一個檔不算碰到它。同一版給 `InstructionsLoaded` 補上的 `agent_id` 和 effort，那頁還沒寫，所以要對照得自己讀 changelog。

## 對你的流程有什麼影響

1. 先翻 allow list 有沒有哪條會放行 shell wrapper，`Bash(bash:*)`、`Bash(sh:*)` 之類。這個 repo 的 `.claude/settings.json` 裡沒有，全域那份要自己看。沒有就不用管。

2. 升完之後第一次跑 hook 多的流程，盯一下有沒有東西被擋住。matcher 寫錯以前是靜靜跳過，你不會知道，現在會變成一次失敗的 tool call，看起來像新 bug 其實是舊設定。

3. 寫過 path-scoped 規則、又覺得它好像沒在作用的，不是你寫錯。這個 repo 沒有 `.claude/rules`，根目錄 CLAUDE.md 是 always loaded，出刊這條路不受影響。

4. terminal 裡跑長的背景指令不用再繞 `nohup` 了。雲端和 `-p` 的上限照舊，所以這支每日出刊的限制沒變。

5. gateway 那條只有你從 gateway 打模型才要管。症狀是 session 沒標題、memory recall 不動、prompt hook 不跑，先設 `CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS=1` 試，別先去翻 hook。

6. 腳本裡的 `claude project purge` 不用急著改，舊名還通。要改就順手用 `claude purge --dry-run`，它會先把要刪的列出來。

7. `--max-findings` 會黏住。哪天你下了 `--max-findings all`，之後每次 `/code-review` 都是 all，直到你下 `--max-findings default`。

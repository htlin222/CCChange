---
title: "2.1.311：92 條有 54 條是 Fixed，`SubagentStop` 之前是照計時器跑的"
description: "2.1.311 上架 4.3 小時，92 條裡 54 條是 Fixed，CLI 本體真正新增的只有兩個 flag。最該看的是 SubagentStop：它照計時器跑，每個還在工作的 subagent 每分鐘叫你的 hook 兩次。"
published: 2026-10-27
category: "Changelog"
tags: ["claude-code", "changelog", "hooks", "subagent", "claude-md"]
annotation: "跑太多次那邊修好了，完全不跑那邊還開著。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.311 | 10-26 19:47 UTC 上 npm，查的時候 4.3 小時 |
| `latest` / `next` | 2.1.311 |
| `stable` | 還是 2.1.308，上架 115.8 小時，現在落後三版 |
| repo 時間 | `api.github.com` 在這個容器還是 403，`pushed_at` 今天也沒有 |
| 規模 | 92 條：Fixed 54、Improved 16、Changed 15、Added 5 |
| `SubagentStop` | 之前每個還在跑的 subagent 每分鐘觸發約兩次，不是結束時一次 |
| CLAUDE.md | 裡面有一個很長的清單項目，啟動會卡住，之後每次讀檔和編輯檔也會 |
| 自動 compact | compact 之前就改過的 MEMORY.md 和 CLAUDE.md，compact 完 Claude 讀到的是舊內容 |
| `claude -p` / SDK | transcript 的訊息存成亂序，收回掉的訊息也留在裡面 |
| 超過 200K | 標準 context 的 session 之前停在 `Usage credits required for 1M context`，現在改成 compact 完接著跑 |
| subagent 的 MCP | subagent 開始之後才連上的 server，它的工具之前叫不到 |
| 跑在 subagent 裡的 skill | `/code-review` 這類，雲端或背景 session 重啟後會再跑第二次 |
| Linux 沙箱 | `--plugin-dir` 那個資料夾同時被加成 added directory、`blockReadsOutsideWorkingDirectories` 又開著，沙箱指令會 `bwrap: Can't create file` |
| 雲端 session | plugin 或 settings 寫了 `agent` 這個鍵，重啟後會掉掉 connector 和大部分工具。現在雲端 session 直接忽略它 |
| Bash 工具說明 | 不再一律宣稱工作目錄會留到下一次呼叫。新的寫法看 `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR` 決定講哪一句（執行檔比對） |
| 那個環境變數 | 310 就有了，兩版都是 5 處。所以 `cd` 的行為沒動，動的是跟模型講的話（執行檔比對） |
| Added 的 5 條 | CLI 本體只有兩條：`self-hosted-runner` 的 `--hold-idle-file` 和 `--max-hold-min`，還有 Explanatory output style 多一句提示。其餘三條在 VSCode 和 Claude Tag |
| 社群討論 | 上架 4.3 小時，還沒有 |

## 為什麼要改

[hooks 文件](https://code.claude.com/docs/en/hooks)講 `SubagentStop` 只有一句話：

> Runs when a Claude Code subagent has finished responding.

實際跑的是計時器。一個 subagent 工作十分鐘，你的 hook 會被叫起來二十次，每一次都在它還沒結束的時候。只做查詢的 hook 不會發現，會累加或會落檔的那種，拿到的是二十份。

同一頁的輸入欄位表列了 `stop_hook_active`，整頁就只出現這麼一次，沒說它什麼時候會是 true。想靠它自己擋掉重複，文件沒給你依據。

另外半邊還開著。[#92716](https://github.com/anthropics/claude-code/issues/92716)（2.1.261 回報，還開著）說背景 subagent 被 `TaskStop` 收掉的時候 `SubagentStop` 不會觸發，`SubagentStart` 就孤在那裡。[#82249](https://github.com/anthropics/claude-code/issues/82249) 更直接，plugin 的 `hooks.json` 註冊的 `SubagentStop`，碰到 Agent tool 的 async 模式從頭到尾不跑，同一個檔案裡的 `PreToolUse` 正常；它在 10-08 被 stale bot 以 not planned 關掉，沒人修。311 動到的只有跑太多次那一邊。

## 對你的流程有什麼影響

1. 先確認你不在 `stable`。這些修的東西一條都還沒進那個 tag：

```bash
npm view @anthropic-ai/claude-code dist-tags
grep -n autoUpdatesChannel ~/.claude/settings.json
```

   有印出 `autoUpdatesChannel` 的話，10-25 那篇講的降級就是在說它。

2. 看一下你的 `SubagentStop` hook 到底在做什麼：

```bash
python3 -c "import json,os;print(json.load(open(os.path.expanduser('~/.claude/settings.json'))).get('hooks',{}).get('SubagentStop','(none)'))"
```

   印 `(none)` 就跳到第 4 點。有東西的話，事件名和欄位這版都沒動（執行檔比對兩邊都是 40 處），設定不用改，升級就好。311 之前那段時間它替你寫出去的東西，要自己清。

3. 別拿 `stop_hook_active` 當保險。文件把這個欄位列出來就沒再提，猜它的語意不會比升級可靠。

4. 兩份 CLAUDE.md 掃一次超長的清單項目：

```bash
awk 'length>1200 && /^[ \t]*([-*]|[0-9]+\.)/ {print FILENAME":"FNR" ("length" chars)"}' \
  ~/.claude/CLAUDE.md CLAUDE.md 2>/dev/null
```

   印出來的行就是會讓啟動和每次檔案操作卡住的來源。拆成幾行就解決，不用等升級。

5. 如果你在 Linux 上看過沙箱指令死在 `bwrap: Can't create file`，別再往 10-24 那篇的 AppArmor 方向查了。還有另一個湊出來的條件：`--plugin-dir` 指到的資料夾同時被加成工作目錄，而且 `blockReadsOutsideWorkingDirectories` 開著。這個組合 311 修掉了，不用改設定。

6. 排程跑的雲端 session，settings 和 plugin 都 `grep -n '"agent"'` 一次。有的話，311 之前那台機器重啟後會在沒有 connector、工具掉一半的狀態下安靜跑完任務，log 上看不出來。

7. `cd` 的行為沒變，腳本不用改。要注意的是 `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR`：設了它，311 之前的工具說明跟實際行為剛好相反，模型照說明寫出來的 `cd a && b` 就會落空。這個 session 自己撞到一次，`cd` 進工作目錄外的暫存夾之後，下一個指令被收回起點，而且它會印一行出來講（本機實測）。

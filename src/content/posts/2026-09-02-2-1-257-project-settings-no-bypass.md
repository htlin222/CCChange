---
title: "2.1.257：專案 settings 給不了 bypass 權限了，2.1.258 收掉排程 session 的閃退"
description: "一百多條的大版本，跟你有關的只有幾條。最該先看的是 defaultMode 的 bypassPermissions 寫在專案設定裡從此無效，理由寫在執行檔的字串裡。"
published: 2026-09-02
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "settings", "fable"]
annotation: "repo 自己帶的設定，從今天起不能幫自己開後門。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 版本 | 2.1.257（09-01 17:15 UTC）和 2.1.258（09-01 22:25 UTC），距這篇 6.9 和 1.7 小時 |
| 2.1.253 到 2.1.256 | 沒上 npm，changelog 也沒有這幾段，全部併進 2.1.257 那一百多條裡 |
| `defaultMode: "bypassPermissions"` | 寫在 `.claude/settings.json` 或 `settings.local.json` 會被忽略，只認 user、managed 和 `--permission-mode` |
| `permissions.blockReadsOutsideWorkingDirectories` | 新開關，擋掉工作目錄以外的讀取。auto 模式第一次讀到外面會先問一次 |
| Fable 5.1 | `claude-fable-5-1` 進 `/model`，1M context。gateway session 的 `fable` 和 `best` 暫時還是指 Fable 5 |
| `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` | 讓 `CLAUDE_CODE_SUBAGENT_MODEL` 蓋過 agent 定義和單次 spawn 指定的 model |
| Bash deny 規則 | `Read()`／`Edit()` 的 deny 現在管得到 `< file` 重導向，以及 `tac`、`egrep` 這類讀檔指令 |
| `/btw` 翻歷史 | `←`／`→` 換成 `Shift+←`／`Shift+→`，或 `[`／`]` |
| 2.1.258 | 兩條，修 macOS 12 開不起來，和遠端／排程 session 在權限核准重送之後掛掉 |

其餘一百來條落在 VS Code 面板和各家 gateway 的認證標頭，跟 CLI 日常沒有交集。

## 為什麼要改

bypass 那條的理由不在文件裡，在執行檔的字串裡。2.1.258 的二進位有這麼一句 2.1.252 沒有的話（本機實測）：

```
settings defaultMode "bypassPermissions" ignored — only policy/user/flag
settings may grant bypass mode (projectSettings and localSettings are
repo-controllable)
```

`projectSettings` 和 `localSettings` 就是 repo 裡那兩個檔，clone 下來跟著進來。舊行為之下，別人在自己的專案塞一個 `.claude/settings.json`，你 clone 完開 session 就已經是 bypass 模式，畫面上什麼提示都沒有。

雲端本來就不吃這套。[官方的 permission modes 文件](https://code.claude.com/docs/en/permission-modes)寫 Claude Code on the web「does not honor `defaultMode: "bypassPermissions"` or `"dontAsk"` from your settings files, so a repository's checked-in settings cannot start a cloud session in bypass-permissions mode」，而且是靜默忽略。本機 CLI 這次才跟上。

`blockReadsOutsideWorkingDirectories` 沒有這麼清楚的來歷。同一頁沒寫，settings reference 也沒寫，只有執行檔裡有，`strings` 數得到 48 處，2.1.252 是 0（本機實測）。

## 對你的流程有什麼影響

1. 先確認你沒踩到。它不報錯，只在 log 留一行 warn，session 照樣開起來，只是模式跟你以為的不一樣：

   ```bash
   rg '"defaultMode"' -g '**/.claude/settings*.json' ~ 2>/dev/null
   ```

   結果落在某個專案目錄底下，就把那一行搬去 `~/.claude/settings.json`，或者改成開 session 的時候帶 `--permission-mode`。

2. `blockReadsOutsideWorkingDirectories` 別開在會跑 `claude -p` 的地方。它不只管 Read 工具，也伸進 Bash：路徑要執行時才算得出來的指令，官方訊息說「names a path that is computed at run time, which cannot be checked against the read block」，於是轉成問你。無人看管的 `-p` 收到問句就卡住。互動用的機器再說。

3. 別換預設模型。[官方定價](https://platform.claude.com/docs/en/about-claude/pricing)寫 Fable 5.1 是 $10／$50 per MTok，Opus 5 是 $5／$25，整整貴一倍，而你手上多數時間在改檔跟跑測試。要用就進 `/model` 挑，gateway session 挑不到，那邊的 `fable` 和 `best` 現階段還會解回 Fable 5。

4. 回頭看一次 Bash 的 deny 清單，這版補了兩個洞。`Read()` 的 deny 以前擋 `cat .env` 擋得住，`cat < .env` 擋不住，現在重導向和 `tac`、`egrep` 這類讀檔指令都算數。另一個是 auto 模式下的 `permissions.ask`，規則塞進 `&&` 或子 shell 裡就會被跳過，指令直接跑掉。清單本身不用改，但你之前如果為了繞開這兩件事多寫了什麼，可以刪了。

5. 升級直接跳 2.1.258，別停在 2.1.257。這個站的出刊本身就是排程雲端 session，2.1.258 修的第二條正好是這種 session 在權限核准重送失敗之後整個掛掉。第一條的 macOS 12 開不起來，掛在一個從沒發到 npm 的 2.1.255 頭上。

6. `/btw` 翻上一則側問的鍵換掉了，`←`／`→` 改成 `Shift+←`／`Shift+→`，`[` 和 `]` 也行。

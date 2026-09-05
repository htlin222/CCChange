---
title: "2.1.261：keybindingFlavor 活了十五天就廢掉，2.1.260 把昨天那條 deny 規則退回去"
description: "兩版一百三十幾條，最該先動的是 Ctrl+W。它今天起換了行為，而且沒有設定可以換回來。昨天那篇講的 Read() 管 Bash 參數已經作廢。"
published: 2026-09-05
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "keybindings", "skills"]
annotation: "一個設定活了十五天。砍掉沒意見，難看的是沒有退路。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 版本 | 2.1.260（09-03 22:32 UTC）和 2.1.261（09-04 17:49 UTC），距這篇 6.3 小時 |
| `Read()` 管 Bash 參數 | 2.1.260 整條退回。理由是 `Read(./**/build/**)` 會連 `npm run build` 一起擋掉 |
| `keybindingFlavor` | 標成 deprecated，設了不生效。斷詞規則一律照 Bash |
| `/skill-doctor` | 列出載進來卻沒用到的 skill，以及各自吃掉多少 context |
| `bashOutputMaxChars`、`taskOutputMaxChars` | 指令和背景任務的 inline 輸出上限，預設 30000／32000，可調到 128000 |
| `--append-subagent-system-prompt-file` | subagent 的 system prompt 改從檔案讀，命令列塞不下的走這條 |
| 含括號的檔案規則 | 2.1.260 修好。路徑有 `(` 的 Edit/Write/Read 規則以前整條被當無效丟掉，宣告唯讀的資料夾其實可寫 |
| zsh 的 REPORTTIME | 藏在 REPORTTIME、REPORTMEMORY、DIRSTACKSIZE 賦值裡的 command substitution 以前自動放行，現在會問 |
| `/diff` | fullscreen 下開側欄，邊改邊看未 commit 的變更 |

剩下的大宗是 VS Code 側欄、Remote Control 的連線狀態、各家 gateway 的憑證，還有 Bedrock 和 Vertex 的啟動路徑。

## 為什麼要改

`keybindingFlavor` 是 8/20 的 2.1.238 加的，預設 `classic`，隔天 2.1.239 又把 Alt+F 和 Alt+D 補進 readline 那一邊。9/4 標成 deprecated。中間十五天。

這次不是關掉旗標而已。2.1.259 的二進位裡讀這個鍵的函式還在，讀不到值就退回 `"classic"`；2.1.261 裡讀它的地方掛零，連 classic 模式砍詞的實作 `deleteWordBefore` 都從 4 個字串掉到 0（本機實測）。程式碼是真的拿掉了。

維護兩套斷詞規則本來就沒什麼道理，砍掉我沒意見。難看的是沒留退路。word-editing 那幾個鍵不是 `keybindings.json` 認得的 action，綁不回來，用慣 classic 的只能自己重練手感。

2.1.260 那條 revert 的理由 changelog 自己寫得很清楚：`Read(./**/build/**)` 這種規則會把 `npm run build` 一起擋掉，所有模式都擋。上線一天就退回去。

文件還沒跟上。[settings 頁](https://code.claude.com/docs/en/settings)查不到 `keybindingFlavor`、`bashOutputMaxChars` 和 `taskOutputMaxChars`，[commands 頁](https://code.claude.com/docs/en/commands)也沒有 `/skill-doctor`。這幾天別拿文件當準。

## 對你的流程有什麼影響

1. 昨天那篇的第 2 點作廢，從腦子裡刪掉。`Read(./.env)` 又只管檔案工具了，`git diff .env` 繞得過去。2.1.259 那顆符號 `readDenyRuleLocatedUnder` 在 2.1.261 裡是 0（本機實測）。這個 repo 的 deny 清單不用改，但別再以為它擋得住 Bash。

2. Ctrl+W 今天起會變。你沒設過 `keybindingFlavor` 就是吃 classic，現在一律 Bash：Ctrl+W 砍到上一個空白，Alt+F 和 Alt+D 停在詞尾，標點算分隔。先看一下有沒有設過：

   ```bash
   grep -n keybindingFlavor ~/.claude/settings.json
   ```

   有的話那行刪掉，schema 還收但不做事。想換回舊的沒有辦法。

3. `/skill-doctor` 直接打打看。它在 2.1.259 的二進位裡就已經是完整的了（本機實測），2.1.261 只是把開關打開，所以叫不出來是旗標還沒發到你身上，不是版本不夠。

4. `bashOutputMaxChars` 不用管。這個 repo 的 `pnpm build` 整份輸出 11377 bytes，離預設的 30000 還很遠（本機實測）。

5. 全域設定翻一下有沒有路徑帶括號或中括號的檔案規則：

   ```bash
   grep -n 'Read(\|Edit(\|Write(' ~/.claude/settings.json
   ```

   2.1.260 之前，`Edit(./src/(legacy)/**)` 這種會被當無效整條丟掉，你以為鎖住的目錄其實可寫；有一條 `[` 沒收尾的更慘，會讓所有檔案編輯掛在 `Invalid regular expression`。這個 repo 的四條 deny 都沒有括號。

6. `/diff` 在 fullscreen 下開一個側欄，邊改邊看未 commit 的變更。你現在是改完再 `git diff` 看一次，這個會跟著動，試一輪再決定留不留。

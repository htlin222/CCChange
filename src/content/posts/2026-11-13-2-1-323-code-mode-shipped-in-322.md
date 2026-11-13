---
title: "2.1.323：Code Mode 的程式碼 322 就在機器裡，權限檢查補了十幾個洞"
description: "296 條 changelog，重心在 Bash 權限。Code Mode 是這版唯一的新功能，但它的程式碼上一版就在了，而且官方文件頁現在是 404。"
published: 2026-11-13
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "sandbox", "code-mode", "settings"]
annotation: "`*` 會吃空白，所以 Bash(PORT=* npm run dev) 等於放過同一行後面接的任何東西。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.323 | 11-12 20:29 UTC 上 npm，寫這篇的時候 3.6 小時。296 條，154 條是 Fixed |
| Bash 權限檢查 | 十幾條修同一個形狀的問題：你以為會跳提示的命令沒跳 |
| `Bash(ls*)` | 這種貼著寫的 wildcard 原本會跳過提示。`Bash(NODE_ENV*)` 這種指到變數的現在會問 |
| `Bash(PORT=* npm run dev)` | 啟動時多一條新警告，說 `*` 也吃空白，這條規則會順手放過同一行後面的別的命令（本機實測，322 沒有這段字串）|
| `sudo` / `env` 包起來的命令 | 原本讓 deny 和 ask 規則認不出來 |
| Write / Edit | 原本寫得進被 `Read` deny 掉的路徑 |
| `claude -p` 的 sandbox | `--settings` 的 sandbox 設定不合法時，原本是直接不開 sandbox 跑 Bash，現在啟動就停，並指名那個設定 |
| `--permission-mode auto` | auto 不可用時改成從 Manual 起，不再掉進一個可能放更寬的模式 |
| Code Mode | 唯一的新功能。`CLAUDE_CODE_EXPERIMENTAL_CODE_MODE`，開了之後 Claude 改寫 JavaScript 呼叫自己的工具 |
| Code Mode 的程式碼 | 322 的二進位裡就整組在了，字串數一模一樣。323 公開的是開關（本機實測）|
| Code Mode 的文件 | changelog 指的 `code.claude.com/docs/en/code-mode` 現在回 404，隔壁 settings、model-config 都 200（本機實測）|
| 未知 model ID 的 context | changelog 說假設值從 200K 改成 1M。官方 model-config 那頁現在還寫 200K |
| sandbox 裡的 git | `git worktree add`、`move`、`remove` 變成 read-only 失敗；在不是 session 起點、也沒指定給它的 worktree 裡 commit 也一樣，就算那個 worktree 在專案底下 |
| `/security-review` | 跑之前會先問。skill 裡內嵌的 git 命令在 bare repo 和類似的資料夾裡也會停下來等放行，auto 和 bypass 模式除外 |
| `subagentStatusLine` | 移除，留在設定檔裡不會壞。但這個 key 還算在「這個 settings 檔要不要你同意」的判斷裡（本機實測）|

剩下的兩百多條分佈在 Claude Tag、OpenTelemetry、Remote Control、VS Code 和 web session，跟你這台機器上的用法沒有交集。

## 為什麼要改

這些權限修一條一條看都很小，排在一起才看得出是同一件事：規則你寫得出來，但檢查對不上你寫的字。`sudo` 或 `env` 把命令包一層就認不出來，wildcard 貼著前一個字就少問一次。都不是新功能的副作用，是擺在那裡一段時間的洞。

成因講得最清楚的反而是新加的那條啟動警告。二進位裡的原句是 `A * also matches spaces, so this rule can also approve a different command that has … later in the line, without a prompt. Give the variable an exact value instead.`

Code Mode 的落差在時間上。它在 changelog 裡是 Added，但我把 322 和 323 的可讀字串整份比過，`codeModeExperiment`、`codeModeRouted`、`CLAUDE_CODE_EXPERIMENTAL_CODE_MODE` 的出現次數兩版一模一樣，REPL 那整套 322 就在裡面了。323 放出來的是開關，不是功能；功能早就隨著上一次更新進了你的機器。至於[changelog 指的那頁](https://code.claude.com/docs/en/code-mode)，現在是 404。

未知 model ID 的 context 假設值得單獨記一筆，因為兩邊說法打架。changelog 說從 200K 改成 1M，[官方 model-config 的 Correct the window 一節](https://code.claude.com/docs/en/model-config#correct-the-window-for-a-gateway-or-custom-model-id)到現在寫的還是 assumes 200K tokens。二進位的 context window 常數區比 322 多了一個 1M 出來，所以我押 changelog，文件是舊的。社群還回報過這條的止血閥 `CLAUDE_CODE_DISABLE_1M_CONTEXT` 在 2.1.156 整版失效，別只靠它。

## 對你的流程有什麼影響

1. 先升，理由是權限那十幾條。你機器上現有的 allow 規則在 322 以前可能比你以為的鬆。
2. 升完看第一次啟動的訊息。出現 `has a * in a variable's value` 就是有規則中了，把那個變數改成精確值。這個 repo 的 `.claude/settings.json` 我看過，allow 全是精確命令或 `:*` 結尾，沒有 `=*`，不用動；要翻的是 `~/.claude/settings.json`。
3. 同一份檔案裡找貼著寫的 wildcard。`Bash(ls*)` 改成 `Bash(ls:*)`，`Bash(NODE_ENV*)` 這種從今天起會跳提示，留著只是每次多按一次。
4. `subagentStatusLine` 直接刪掉。它已經不做事，但還算在那個「要不要你同意這份 settings」的判斷裡，留著等於白換一次確認。
5. Code Mode 先不要開。功能沒什麼可疑，問題是那頁 404，它的 caveat 你讀不到。而開之前要先吃掉兩個 caveat 同意旗標、重啟一次 session，REPL 進去還有一道 engine 檢查等著，失敗的訊息是叫你改用 repo 裡 pinned 的 Bun。等文件上線再回來。
6. 接下來兩項只有 gateway 或自訂 model ID 的人要做。先用 `/status` 看 model 那行印的是不是你自己取的名字，是空的或認得出來的官方 ID 就跳到第 8 項。
7. 是你自己的名字，就別等它猜。照文件那節把真實視窗寫死：`CLAUDE_CODE_MAX_CONTEXT_TOKENS=<你的視窗>`，ID 帶 `[1m]` 的要再補 `CLAUDE_CODE_DISABLE_1M_CONTEXT=1` 才吃得到。猜錯的代價是 session 滿了以後每一輪都失敗，非 `/clear` 不能走。
8. sandbox 開著又靠 worktree 幹活的話，把建 worktree 那一步移到 sandbox 外面。`git worktree add` 現在在裡面是 read-only 失敗，能 commit 的也只有 session 起點或明確指定給它的那個。
9. 自動跑的流程去確認 `--settings` 的 sandbox 那段是合法 JSON。以前寫壞了是默默不開 sandbox 跑 Bash，現在是啟動就停並指名那個設定，排程會直接掛在那裡。排程若不是跑在 auto 或 bypass 底下，`/security-review` 和 skill 內嵌的 git 命令還會多一道問人，也會卡。
10. Claude Tag、OTel、VS Code、Remote Control 那兩百多條不用管。

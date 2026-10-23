---
title: "2.1.309：`sed -i` 以前根本沒跑，這版開始真的進 sandbox"
published: 2026-10-23
description: "307 之前的單檔 `sed -i` 會被攔下來算成一次編輯寫下去，標 sandboxed: false。309 把那條路拿掉，連帶 /rewind 不再還原它。"
category: "Changelog"
tags: ["claude-code", "changelog", "sandbox", "permissions", "ultrareview", "auto-mode"]
annotation: "攔下來算成一次編輯，你看到的是 diff 卡片而不是一條命令。代價是它不受 sandbox 管。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.309 | 10-22 20:34 UTC 上 npm，距這篇 3.6 小時，79 條 |
| dist-tags | `latest` 和 `next` 指 309，`stable` 停在 308 |
| 2.1.308 | 10-22 04:19 UTC，changelog 只有一行 Bug fixes and reliability improvements |
| `sed -i` | 307 以前 claude 不會真的跑它。Bash tool 把單檔 `sed -i` 攔下來，自己算出改完的內容掛在 `_simulatedSedEdit` 上，走編輯那條路寫下去，標 `sandboxed: false`（執行檔比對） |
| 309 拿掉的 | 產生那個欄位的程式、套用它的程式、schema 宣告都不見了。剩一個字串常數和一段剝欄位的分支，沒有東西餵它（執行檔比對） |
| 連帶 | 權限卡片從「Edit file」變回 Bash 那張，而且 `/rewind` 不再還原它（官方 changelog） |
| `claude ultrareview` | 要 workspace trust。`--trust-workspace` 是新 flag，不吃值，PR 號或 base branch 得寫在它前面（本機實測 `--help`） |
| 參數順序 | usage 行跟著改：`[options] [target]` 變成 `[target] [options]`（本機實測） |
| 新環境變數 | `CLAUDE_CODE_DISABLE_ULTRAREVIEW_TRUST_CHECK`，0 到 4 處，而且進了環境變數白名單（執行檔比對） |
| sandbox | macOS 和 Linux 上，每條 sandboxed Bash 命令之前都會先在 sandbox 外面跑一次 shell 啟動檔。這版修掉（官方 changelog） |
| GitHub mention | 「別把 `@reviewer` 這種佔位字寫成 mention」是一句塞進 system prompt 的字串，0 到 2 處。發文路徑上沒有做轉義（執行檔比對） |
| 拿不到的 | `gh api repos/anthropics/claude-code` 在這個容器回 403，沒有 repo 的 `pushed_at` 可以對 |

剩下六十幾條：巢狀 CLAUDE.md 超過大小上限改成只載開頭，之前那種檔案會讓 session 一直 compact；雲端環境編輯器不再把同時含兩種引號的環境變數加反斜線；Slack 草稿誤發私訊；磁碟滿了的訊息會講要清哪個資料夾。還有一串權限繞路被堵掉：redirect 開不起來時仍然採信那個變數、`Edit(path)` deny 擋不住帶 subshell 的 Bash redirect、worktree 隔離放過 locale 前綴和 zsh 的算術式、分割視窗的 teammate 沒繼承 leader 命令列上的 deny 和 `--tools`。

## 為什麼要改

那個 sed 特例是為了好看。攔下來算成一次編輯，你看到的是 diff 卡片而不是一條命令，`/rewind` 也還原得了。代價寫在 [sandbox 那頁](https://code.claude.com/docs/en/sandboxing)自己的清單上：Read、Edit、Write 這些檔案工具跑在 sandbox 外面，吃權限規則，不吃作業系統的邊界。所以那條 `sed -i` 寫檔案的時候，走的是 sandbox 外面這條路。

權限那側本來就擋 `.claude`、`.mcp.json`、`.bashrc` 這些路徑，[protected paths](https://code.claude.com/docs/en/permission-modes) 列得很清楚，`acceptEdits` 自動放行的清單裡 `sed` 也在，而 allow rule 蓋不過去。那部分沒變，別搞混。變的是 sandbox 自己那層：它的邊界由作業系統在命令執行的時候套上，而模擬出來的編輯沒有命令在跑，這層對它根本不存在。

ultrareview 要 trust 是另一回事。它把你的工作樹打包上傳到雲端 sandbox，而這個資料夾的 git 設定和專案設定都叫得起程式。問題是 [ultrareview 那頁](https://code.claude.com/docs/en/ultrareview)的 subcommand flag 表到今天還只有四個 flag，沒有 `--trust-workspace`，底下那段還寫著 subcommand「starts without waiting for input」。這版才上線三小時，文件沒跟上，照它寫的腳本會卡在文件沒提的那個問句上。

## 對你的流程有什麼影響

1. auto mode 的指示就是叫 agent 用 sed 和 heredoc 改檔案，你這邊預設開著。今天起那些改動不在 `/rewind` 的還原範圍，叫它改用 Edit，或者認了用 git 回頭。

2. sandbox 開著的話，變的是寫入邊界。`sed -i` 現在是一條在 sandbox 裡面跑的命令，寫到 `allowWrite` 沒涵蓋的地方會在作業系統那層失敗，不再像以前那樣當成一次編輯過去。要查的是腳本和 hook 裡有沒有 sed 往工作目錄以外寫。

3. `settings.json` 裡有 `Bash(sed:*)` 或 `Edit(...)` 規則的看一眼。單檔 `sed -i` 以前吃 Edit 那側的判定，現在吃 Bash 那側，兩邊寫得不一樣就會換行為。

4. CI 裡跑 `claude ultrareview` 的今天就改，順序不能錯：

```bash
claude ultrareview 1234 --trust-workspace     # 可以
claude ultrareview --trust-workspace 1234     # 被拒
```

第二行會讓它以為 flag 帶了值，然後回 `--trust-workspace` takes no value，直接不跑。

5. 這個 trust 檢查掛在遠端開關 `tengu_twinkly_breeze` 上（執行檔比對）。沒有 TTY 的時候只有開關開著才攔，所以你今天什麼都沒改，它哪天也可能開始擋你的 CI。先把 flag 加上去。`CLAUDE_CODE_DISABLE_ULTRAREVIEW_TRUST_CHECK=1` 是關掉檢查，不是通過它，留給真的改不動命令列的情況。終端機裡它一定會問，五分鐘沒人回就算拒絕（執行檔比對，`answerTimeoutMs: 300000`）。

6. 開 sandbox 的 macOS 和 Linux 直接升。啟動檔在 sandbox 外面跑那條是這版唯一值得趕的，其他都可以等。

7. GitHub mention 那條不用做事。但它只是一句叮嚀，不是轉義，所以每日 PR 的內文裡還是會偶爾冒出 `@reviewer` 這種東西。

8. Windows、PowerShell、Claude Tag、VS Code 面板、self-hosted runner 那幾十條都不用管。

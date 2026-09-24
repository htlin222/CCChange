---
title: "2.1.281：settings 可以寫 attribution: false，但舊版讀到會把整份檔案丟掉"
description: "關掉 commit 和 PR 署名多了一個 boolean 簡寫。代價是 2.1.280 以前的 CLI 碰到它會跳過整份 settings 檔，同一份裡的 permissions.deny 跟著失效，而且一聲不吭。"
published: 2026-09-24
category: "Changelog"
tags: ["claude-code", "changelog", "settings", "attribution", "permissions"]
annotation: "壞掉的不是署名，是同一份檔案裡的 deny。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.281 | 09-23 17:01 UTC 上 npm，距這篇 7.2 小時，176 條 |
| `stable` | 2.1.273，09-15 18:06 UTC 發的；`next` 和 `latest` 都指 2.1.281 |
| `"attribution": false` | 新的簡寫，等於 `{ "commit": "", "pr": "", "sessionUrl": false }`；寫 `true` 等於沒寫 |
| 舊版碰到 boolean | 2.1.280 把整份 settings 檔丟掉，同一份裡的 `permissions.deny` 一起不算數（本機實測） |
| 有沒有警告 | `claude -p` 什麼都不印，`--debug-file` 也撈不到（本機實測） |
| dangerous rm | 刪除目標整串都是命令替換生出來的，像 `rm -rf "$(pwd)"`，auto mode 和 `--dangerously-skip-permissions` 底下也會停下來問了 |
| 沒人回答那個問句 | 等兩分鐘，然後拒絕並附一句改寫建議，session 繼續往下跑 |
| `CLAUDE_CODE_AUTO_MODE_SERVER` | 直連 Anthropic API 也吃它了，`0` 關 `1` 開 |
| self-hosted runner | system prompt 改用私有檔案傳，接 `--system-prompt` 的 wrapper 和 hook 要換成 `--system-prompt-file` |
| `--setting-sources` | 之前沒往下傳，teammates、`/bg`、`claude agents`、`--worktree --tmux` 現在跟著父層的限制走 |
| 排程雲端 session | 先前訊息是純字串就每輪報錯、wakeup 投遞失敗會每秒重射，兩個都修了 |

沒細講的：resume 重送歷史害 prompt cache 失效那一串、proxy 把串流截斷的六七條、vim mode 的一堆邊角，還有幾十條 VS Code 和 Claude Tag。

## 為什麼要改

`attribution` 本來只有物件形式，想全部關掉得寫三個鍵。加個 boolean 簡寫是順手的事。

舊版沒有退路。2.1.280 那格 schema 就是個 object，boolean 塞進去是 schema mismatch，而 Claude Code 對 settings 的 schema mismatch 一律整檔跳過。這句話是執行檔自己寫的：

> the file is skipped and any rules it contained — including permission allow/deny lists — are not applied

所以掉的不只是署名。同一份檔案裡的 `permissions.deny: ["Bash"]`，餵給 2.1.280 完全沒生效，Bash 照樣在工具清單上；把 boolean 換回物件形式就擋住了（本機實測）。2.1.281 兩種寫法都留得住 deny。`true` 跟 `false` 一樣會炸。

[settings 文件](https://code.claude.com/docs/en/settings-reference)列的還是 `attribution.commit`、`attribution.pr`、`attribution.sessionUrl` 三個鍵，boolean 這條只寫在 changelog 和執行檔的 schema 說明裡。社群回報已經有了，issue 標題就寫著「attribution booleans invalidate settings.json, disabling all hooks」。

## 對你的流程有什麼影響

1. 要關署名，寫物件形式：

   ```json
   { "attribution": { "commit": "", "pr": "", "sessionUrl": false } }
   ```

   這份新舊版都讀得動。`false` 要 2.1.281 以後才認得。

2. 已經寫了 `false` 的話，先看那份檔案裡還住了什麼。跟 `permissions` 或 `hooks` 同住是最糟的組合：還沒升到 2.1.281 的那台機器，等於在沒有 deny 規則的狀態下跑，而且不會提醒你。

3. 這條規則不只管 attribution。任何新版才有的鍵，寫進跨版本共用的檔案裡（dotfiles repo、CI image 內建那份），舊版讀到都是整檔跳過。共用的那份就守著最舊那台機器的 schema，新鍵另外開一份用 `--settings` 疊上去。

4. 只是不想讓 commit 尾巴帶 `Claude-Session:` 連結的話，單獨設 `sessionUrl: false` 就好，`commit` 和 `pr` 留著。

5. 上禮拜寫進 CI job 環境的 `CLAUDE_CODE_AUTO_MODE_SERVER`，現在多管一種連線方式。值的讀法沒再動，還是只認 `1`、`true`、`yes`、`on`（本機實測）。

6. dangerous rm 那個問句不用管。官方寫的是無人看管的 session 現在能繼續跑：兩分鐘沒人答就拒絕，附一句改寫建議。除非你的腳本真的要 `rm` 一個從變數或 `$(...)` 來的路徑，那得先把路徑寫死。

7. 有 wrapper 或 `command` hook 在往 self-hosted runner 的啟動指令後面接 `--system-prompt` / `--append-system-prompt` 的，換成 `--system-prompt-file` / `--append-system-prompt-file`。舊寫法不再收得到。

8. 用 `--setting-sources` 縮設定來源的，之前 `/bg` 和 `--worktree --tmux` 開出來的 session 沒繼承這個限制，等於繞過去了。升上來就好，不用改設定。

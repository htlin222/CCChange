---
title: "2.1.265 的 provider 判斷多接了一支 gateway，四個半小時後被 2.1.266 拿掉"
description: "改的是一行三元判斷的最後一格。設過 CLAUDE_CODE_USE_GATEWAY 又不是走 gateway 登入的機器，那四個半小時裡每一發請求都被拒。同一版還換掉了 --plugin-dir 指到資料夾時的行為。"
published: 2026-09-09
category: "Changelog"
tags: ["claude-code", "changelog", "plugins", "gateway", "env-vars"]
annotation: "四個半小時，一格三元判斷。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.265 | 09-08 19:05 UTC 發，四十幾條 |
| 2.1.266 | 09-08 23:32 UTC 發，只回收一件事，距這篇不到一小時 |
| `CLAUDE_CODE_USE_GATEWAY` | 2.1.265 把它接進 provider 判斷鏈最後一格，設了就整個 session 判成 gateway；2.1.266 刪掉那一格（本機實測） |
| `--plugin-dir` | 指到裝著多個 plugin 的資料夾會逐個載子資料夾，舊版是把整個上層當成一個 plugin（本機實測） |
| 工具結果落地 | 加了 1 GiB 上限，被截斷時預覽多一句說整份 parse 會失敗 |
| 非互動 session 的 cwd | `-p`、Agent SDK、雲端 session 不再每收到一則使用者訊息就重設工作目錄 |
| subagent 的 prompt cache | resume subagent 和 agent teammate 兩條會動到 prompt prefix 的路徑修掉 |

剩下的沒細講：MCP 的 `http` server 會退回 SSE、`/model opusplan[1m]` 不再被拒、`--worktree` 在大 repo 改成平行 checkout、VS Code 會自動歸檔閒置的 session。

## 為什麼要改

`CLAUDE_CODE_USE_GATEWAY` 從來沒進過文件。[官方文件](https://code.claude.com/docs/en/gateways)整頁講 gateway 只講 `ANTHROPIC_BASE_URL` 和 `ANTHROPIC_AUTH_TOKEN`，沒提過這個變數。程式碼裡它一直只是個附加條件：先確認 base URL 和 token 都在，缺一個就 warn 一句 `; ignoring` 然後當沒看到。

2.1.265 把它接到了另一個地方，那串決定 session 算哪個 provider 的三元判斷：

```js
...a.CLAUDE_CODE_USE_VERTEX?"vertex":a.CLAUDE_CODE_USE_GATEWAY?"gateway":"firstParty"
```

環境裡有這個變數，provider 就是 gateway。接著請求路徑上那句「provider 是 gateway 而且沒登入就 throw」直接成立，每一發都回 Not signed in to the Cloud gateway。有 API key、有 `apiKeyHelper`、自己塞 auth header 都救不了，判斷壓根沒看那些。2.1.266 刪掉的就是 `CLAUDE_CODE_USE_GATEWAY?"gateway":` 這一格，錯誤訊息尾巴那句括號提示也一起收掉（本機實測）。

`--plugin-dir` 的舊行為更陰。[官方文件](https://code.claude.com/docs/en/plugins-reference)通篇假設它指向單一 plugin，而指到上層資料夾不會報錯，會安靜載成一個空的：

```
> pdtest@inline
  Version: unknown
  Status: √ loaded
```

同一個目錄在 2.1.266 印出 alpha 和 beta 兩個，各自 0.0.1。沒有 manifest 的子資料夾跳過（本機實測）。

## 對你的流程有什麼影響

1. 直接升到 2.1.266，別停在 2.1.265。先看自己有沒有踩到：

   ```bash
   env | grep -i CLAUDE_CODE_USE_GATEWAY
   ```

   沒東西就不用管，這兩版對你的行為一模一樣。

2. 自己那包還沒發出去的 plugin，現在一行帶整包進去測：

   ```bash
   claude --plugin-dir ~/dev/plugins plugin list
   ```

   跑之前確認版本是 2.1.266。舊版這樣下去印的是一個 `Version: unknown` 的空殼，而它看起來像載成功了。

3. 落檔的工具輸出多了一道 1 GiB 硬上限。2.1.261 那兩個 `bashOutputMaxChars` / `taskOutputMaxChars` 管的是進對話的字元數，這個管的是落到磁碟那一份。超過就截，預覽會講整份 JSON parse 會失敗。你有腳本拿那個檔案去餵 `jq`，要認得這句。

4. 雲端 session 裡那行「Shell cwd was reset to …」不是這次修的那條。三個版本的那段程式碼一個 byte 不差。觸發它的是 `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR`，或者命令結束時的 cwd 跟專案目錄對不上（本機實測）。所以 skill 裡 `cd $(mktemp -d)` 再讓下一個 command 接著用的寫法照樣不能用，要嘛一個 command 串到底，要嘛全走絕對路徑。

5. subagent 的 prompt cache 那兩條不用改設定。有 SubagentStart hook 又常 resume subagent 的話，省下來的直接反映在 cache read，看 `/cost` 就知道有沒有生效。

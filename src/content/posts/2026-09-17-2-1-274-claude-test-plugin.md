---
title: "2.1.274：changelog 還沒寫，裡面躺著一個叫 claude-test 的內建 plugin"
description: "2.1.274 上了 npm，GitHub 的 CHANGELOG.md 還停在 2.1.273。拆執行檔看到的是一整套 claude-test，用白話 spec 跑瀏覽器測你的 dev server，但指令歸遠端開關管。"
published: 2026-09-17
category: "Changelog"
tags: ["claude-code", "changelog", "plugins", "testing", "permissions", "mcp"]
annotation: "程式碼在你機器上，指令不一定在。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| `latest` | 2.1.274，2026-09-16 22:36 UTC 上 npm。我查的時候 GitHub 上的 `CHANGELOG.md` 最上面還是 2.1.273，這版一行都沒有 |
| `claude-test` | 新的內建 plugin。`.claude-test/specs/` 放白話寫的 spec，背景開一個關起來的 headless 瀏覽器打你本機 dev server，一條 spec 回一個 PASS 或 FAIL 加一張截圖 |
| 它掛進來的 MCP server | `plugin_claude-test_browser`，工具清單裡有 `browser_run_code_unsafe`、`browser_file_upload`、`browser_route` |
| 它預先要走的 Edit 權限 | `.claude-test/specs/**`、`.claude-test/skills/**`、`.claude-test/runs/*/*.*`、`.claude-testrc` |
| `tengu_mellow_hollerith` | `/claude-test` 這個指令出不出現，由這道遠端開關決定，不是由版本決定 |
| 八個沒進文件的環境變數 | `CLAUDE_CODE_MCP_STARTUP_WAIT_MS`、`CLAUDE_GATEWAY_DRAIN_TIMEOUT_MS`、`CLAUDE_CODE_STARTUP_FAILURE_RESULTS` 等，在 2.1.273 的執行檔裡一個都搜不到 |

Artifact 那邊 watch 的措辭整批換過，`sdk-tools.d.ts` 的 `asset_read` 多一個 `public_read`。

## 為什麼要改

`claude-test` 對著的是你已經在用別的方式湊的那件事：前端改完，畫面還會不會動。現在不外乎自己接 Playwright MCP，或者養一支 e2e，兩邊都要你維護選擇器，改個版面就重寫一輪。它的 spec 是白話句子，第一次跑會先擬一組給你過目再存進 repo，結果落在 `.claude-test/runs/`。

可用性那條要先講。執行檔裡 `/claude-test` 掛在 `tengu_mellow_hollerith` 這道遠端開關上，跟八月 `ultraplan` 同一套機制。我在 2.1.274 的執行檔裡搜得到整套程式碼，五十幾處字串，這跟你的 session 裡叫不叫得動它是兩回事。

它也只在終端機的互動 session 裡跑。啟動方式是 reload plugin 把 browser helper 叫起來，而只有終端機 session 會在 reload 時起 plugin helper，七秒沒起來就放棄。cloud session 和 `claude -p` 碰不到。

文件是空的。`docs.claude.com/en/docs/claude-code/claude-test` 會 301 到 `code.claude.com/docs/en/claude-test`，那頁 404，[env vars 那頁](https://code.claude.com/docs/en/env-vars)新的八個變數一個都沒收，連昨天那個 `CLAUDE_CODE_GATEWAY_HINT_HEADERS` 也還沒補。

## 對你的流程有什麼影響

1. 升級：`npm i -g @anthropic-ai/claude-code`。
2. 開一個終端機 session 打 `/claude-test`，看它出不出來。沒出來就是遠端開關還沒開到你這邊，別翻 settings 找，過幾天再試。另外這支 repo 的每日出刊跑在 cloud session 上，那邊永遠叫不動它，別想接進 CI。
3. 出來了，先看它掛進來的 MCP server。`plugin_claude-test_browser` 那組工具裡有一個叫 `browser_run_code_unsafe`，名字自己寫著。我會讓它跑，前提是那台 dev server 後面接的是本機測試資料庫，不是正式環境的憑證。
4. 決定 `.claude-test/` 哪些進 git。官方對 spec 的描述用的字是 committed，那是要你審、要跟著 diff 走的東西；`runs/` 底下是每次跑的結果和截圖，我會直接 gitignore。
5. 想清楚再把 specs 放進 repo。門檻就是 `.claude-test/specs/` 這個資料夾存不存在：它在，你沒開口，它也會在你做完一個看得見的改動之後自己跑一輪。
6. 已經裝了自己那支叫 `claude-test` 的 plugin，或有 MCP server 叫 `plugin_claude-test_browser` 的話，內建這支不會起來，它會叫你先用 `/plugin` 或 `/mcp` 關掉一邊。
7. 八個新環境變數不用管。看名字就知道是 host 端和 gateway 在用的，`CLAUDE_CODE_MCP_STARTUP_WAIT_MS` 是唯一一個你將來可能會想動的，等 MCP server 啟動慢到卡人再說。

---
title: "2.1.227：登入過期會把你推去買 credits，Actions 上的 Bash 也修好了"
description: "五條修補。一條跟錢有關，token 過期時方案判定會掉到沒訂閱，Max 用戶因此被提示開 usage credits 買 Fable。另一條修掉 claude-code-action 在託管 runner 上每條 Bash 都失敗。"
published: 2026-08-11
category: "Changelog"
tags: ["claude-code", "changelog", "github-actions", "sandbox", "billing"]
annotation: "缺 socat，Bash 全掛，--dangerously-skip-permissions 也繞不過去。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 版本 | 2.1.227，npm 上 08-10 20:56 UTC 發，`latest` 和 `next` 都指這一版 |
| 登入過期 | token 過期時 feature flag 沒帶方案等級，Max 用戶被提示開 usage credits 買 Fable |
| `allowed_non_write_users` | 用了它的 `claude-code-action`，在 GitHub 託管 runner 上每一條 Bash 都失敗 |
| `/tui` | 會把已經 rewind 掉的對話撈回來，rewind 到第一則訊息之前時尤其明顯 |
| `stable` tag | 還停在 2.1.220，七月二十四日發的，落後七個版本 |

slash 選單的配色和兩條 event loop 卡頓（file-not-found 建議、at-mention 大小檢查）也一起修了，用法沒變。

## 為什麼要改

`allowed_non_write_users` 是拿來讓沒有 write 權限的人也能 `@claude` 的。[官方文件](https://code.claude.com/docs/en/github-actions#who-can-trigger-runs)要求它一定要配自己的 `github_token`。放寬了誰能觸發，就得收緊它跑起來之後拿得到什麼，這件事落在 `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` 上。

那顆開關要 bubblewrap 和 socat 兩支外部程式才動得起來，而託管 runner 兩支都沒有。我把 226 和 227 都抓下來跑，沒有 bwrap 的時候 CLI 根本不啟動（本機實測）：

> error: bubblewrap is required for subprocess env scrubbing and isolation.

裝了 bwrap、還缺 socat，就變成啟動得了但每條 Bash 都掛在沙箱初始化。226 和 227 在這裡表現一致，兩支程式都補上之後也都跑得動，所以 runner 上真正的修法我重現不出來。

錢那條是另一種壞法。token 過期，方案等級查不到，判定就掉到「沒訂閱」，Max 用戶於是看到 `Run /usage-credits to turn on extra usage for your org`。227 改成先講真正的原因，`Anthropic profile login expired`，這兩個字串在 226 的執行檔裡一個都找不到（本機實測）。

## 對你的流程有什麼影響

1. 升上去，`latest` 和 `next` 現在同一版。
2. 最近如果被提示開 usage credits 或買 Fable 5，先 `/login` 重登再看一次，別急著付錢。
3. workflow 裡有 `allowed_non_write_users` 的，確認 action 拉得到 2.1.227，而且配了自己的 `github_token`。少了後面那個，這個參數本來就不生效。
4. 自架 runner 跑 `claude-code-action` 的，開機腳本補一行：

   ```bash
   apt-get install -y bubblewrap socat
   ```

   缺哪一支都會壞，壞法還不一樣。
5. scrub 開著的時候別再傳 `--dangerously-skip-permissions`。它會被壓回 `default`，226 和 227 都會印這行（本機實測）：

   > ⚠ Permission mode forced to default — CLAUDE_CODE_SUBPROCESS_ENV_SCRUB is set (allowed_non_write_users hardening).

   要放行就寫 `--allowedTools`。plan mode 和 agent frontmatter 的 `permissionMode` 一樣會被蓋掉。
6. pin 在 `stable` 的腳本改指 `latest`。停在 2.1.220 的話，這批一條都拿不到。
7. `/tui` 和 slash 選單那幾條裝上去就有，不用管。

---

*版本與發佈時間取自 npm registry。`allowed_non_write_users` 需要自帶 `github_token` 引自 code.claude.com（官方文件）。啟動錯誤、permission mode 警告字串，以及 226 與 227 的字串比對，來自本次下載的兩份 linux-x64 執行檔實跑（本機實測）。這個 session 的 egress policy 擋掉 api.github.com，repo 的 `pushed_at` 沒取到。*

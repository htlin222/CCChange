---
title: "沒有新版：2.1.312 補上 auto mode 停擺的四種理由，行為兩版一樣"
description: "2.1.312 之後 29.5 小時沒有新東西。這天挖到的是 312 裡 changelog 沒寫的一段：安全檢查停擺的時候，它現在會說是哪一種停擺、該找誰。行為本身 311 就長這樣。"
published: 2026-10-29
category: "Changelog"
tags: ["claude-code", "changelog", "auto-mode", "permission-modes", "ci"]
annotation: "停掉這一輪的門檻是連續 10 個回應拿不到判決。311 和 312 同一個數字。"
---

## 改了什麼

沒有新版。

| 項目 | 一句話 |
| --- | --- |
| 24 小時內 | 沒有東西上架。2.1.312 是 10-27 18:36 UTC 上 npm，查的時候 29.5 小時 |
| `latest` / `next` | 2.1.312 |
| `stable` | 還是 2.1.308，落後四版，上架到現在 6.8 天 |
| repo 時間 | `api.github.com` 在這個容器又是 403，`pushed_at` 今天也沒有 |
| 312 裡 changelog 沒寫的 | 「Auto mode can't check actions in this session」整套說明文字，39 條裡一個字都沒提 |
| 它會點名原因 | 四種：實驗 beta 在這裡被關掉、Anthropic 暫時關了、你的請求走的 gateway 不轉送、伺服器這場就是不跑 |
| 後果分三支 | 退回來問你；設定裡有只有自動檢查會套的 deny 規則，就直接拒而且不問你；沒人可問的 session 一律拒 |
| 行為沒變 | 連續 10 個回應拿不到可用判決就停掉這一輪，兩版同一個寫死的數字（執行檔比對） |
| 遠端開關也沒變 | `tengu_valiant_sphinx` 兩版都在，退避和計數那幾句一模一樣（執行檔比對） |
| 312 才開始分的 | 本機 classifier 在不在。以前只有伺服器審不審（執行檔比對） |

## 為什麼要改

[permission modes 文件](https://code.claude.com/docs/en/permission-modes)講伺服器不審這場的時候是這樣寫的：

> The server doesn't review the session: a response completes with no review results, or the server answers that it doesn't review this session. ... Claude Code falls back to its own classifier requests.

退回本機。312 的新字串裡有另一句：

> the server-side classifier does not run for this session (...) and there is no local one to fall back to

差的是有沒有本機那一層。文件那頁沒寫這個情況，而本機那一層在不在，是 312 才開始追的事。

這套說明在治什麼，看 [#69726](https://claudeissues.com/issue/69726-bug-auto-mode-classifier-permanently-unavailable-for-my-account-days-not-transie) 就知道。回報的人 Pro 方案、claude.ai OAuth、2.1.183，每一次 Write 和 Edit 都拿到 classifier 不可用，連續好幾天，重啟 session 沒用。他試過登出再登入、刪掉 `~/.claude.json`、確認 token 有效、確認打得到 API。最後 issue 被關成重複。四種原因裡有一種的正解是「它自己會回來」，當時畫面上沒有任何東西告訴他是哪一種，所以該做的事是什麼都不做，他卻去刪了設定檔。

312 加進去的就是這段字。auto mode 停擺的機率沒變，畫面上多出來的是原因和該找誰。

## 對你的流程有什麼影響

1. 先確認你沒有自己把伺服器那一路關掉。文件寫 `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1` 而 `CLAUDE_CODE_AUTO_MODE_SERVER` 沒設的話，它就不問伺服器了：

```bash
env | grep -E 'CLAUDE_CODE_(DISABLE_EXPERIMENTAL_BETAS|AUTO_MODE_SERVER)'
grep -n 'EXPERIMENTAL_BETAS\|AUTO_MODE_SERVER' ~/.claude/settings.json
```

   兩邊都沒印東西就跳到第 2 點。

2. 排程那支還是不要寫 `--permission-mode auto`。10-18 那篇的理由是連續擋下的門檻，這裡多一個：沒人可問的 session 碰到檢查停擺，需要檢查的動作一律被拒。不是被擋下，是沒有人能放行。照舊走白名單：

```bash
claude -p "$PROMPT" --permission-mode dontAsk \
  --allowedTools 'Read,Grep,Bash(pnpm test)'
```

3. `permissions.deny` 翻一遍：

```bash
grep -n -A5 '"deny"' ~/.claude/settings.json
```

   印出東西的話，檢查停擺時你落在第二支：動作被拒，而且不跳提示框。互動終端機裡這跟平常不一樣，沒有東西可以按。

4. 真的撞到的時候，把那行字讀完再動手。寫 Anthropic 暫時關掉的，正解是等；寫 gateway 不轉送的，去找管那台 gateway 的人；寫實驗 beta 被關掉的，回第 1 點。寫伺服器這場不跑的，沒有你能動的地方，Shift+Tab 換個模式把手上的事做完。別刪 `~/.claude.json`，那是 69726 那位做過而且沒用的事。

5. 順手看一下通道，上面每一條都還沒進 `stable`：

```bash
npm view @anthropic-ai/claude-code dist-tags
```

6. 不要為了這件事升版。312 加的是字，連續 10 個回應沒判決就停掉這一輪的行為，311 跑起來一模一樣。第 2 和第 3 點才是會動到你的，而那兩件在 311 上一樣要做。

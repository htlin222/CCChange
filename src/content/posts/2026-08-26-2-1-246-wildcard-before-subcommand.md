---
title: "2.1.246：allow 裡的 * 放在子指令前面會被警告，但三種形狀它不查"
description: "開機多了一行警告，點名 Bash(git * main) 這類把萬用字元放在子指令前面的 allow 規則。本機實測它只查 allow，而且漏掉第一個字就是 * 的規則，還有結尾是選項的規則。"
published: 2026-08-26
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "settings", "security"]
annotation: "沒被警告不等於那條規則是安全的。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 開機警告 | allow 裡像 `Bash(git * main)` 這種把 `*` 放在子指令前面的規則，開機會被點名 |
| 警告怎麼說 | 「也會 match 插在那個位置的任何選項，並且不問就放行」；程式是 `git` 時多一句 `-c` 和 `--exec-path` 能跑任意程式 |
| 查的範圍 | 只有 allow。deny 和 ask 裡同樣形狀的規則不會叫 |
| 不查的三種 | `:*` 結尾、第一個字就是 `*`、`*` 後面只接選項 |
| `/permissions` | 多一個 Auto mode 分頁，auto mode 分類器的規則可以在那裡看和改 |
| `/cd` | 換過去之後，新目錄的 project settings、hooks、skills、agents 馬上生效，不必 `--resume`；`.mcp.json` 一樣要先過核准 |
| 背景 session 回收 | 過期的背景 session 記錄指到 `.claude/worktrees/` 時，會把你自己開的 worktree 一起掃掉，這版修了 |
| `-p` / SDK / 雲端 session | 回應被伺服器錯誤或斷線截斷，現在自己接著跑完，不再收成一個 error |
| 第三方 gateway | telemetry 和 metrics 以前帶著 `ANTHROPIC_BASE_URL` 那把金鑰送去 Anthropic，現在憑證只送自己的 host |
| 2.1.245 | 整版只有一行：glibc 2.44 的機器（Arch、CachyOS、Fedora Rawhide）開機就 crash |
| `stable` | 還是 2.1.231，第 12.7 天 |

其餘五十幾行是全螢幕捲動、markdown 判定、plugin 快取、`/stats` 熱力圖差一格這類修補，升上去就有，不用做事。

## 為什麼要改

`Bash(git * main)` 這條規則你會寫，是想讓 `git merge main` 不用每次按確認。官方 permissions 文件那張對照表寫的是它實際 match 到什麼（官方文件）：

> `Bash(git * main)` — Matches: `git merge main`, `git push origin main`, `git -c core.fsmonitor=<script> diff main`

第三個才是重點。`-c core.fsmonitor` 可以指一支腳本，git 會去跑它。這條規則你是為了省麻煩才寫的，結果它讓人不用問就能執行任意程式。[文件](https://code.claude.com/docs/en/permissions#wildcard-patterns)裡那個「把 `*` 放在子指令後面」的警告框早就在了，只是沒有人會回頭讀設定文件。這版把它搬到你開機的時候講。

社群抱怨的其實是另一種形狀。[#29187](https://github.com/anthropics/claude-code/issues/29187)（社群，已關）說權限對話框自己按「Yes, and don't ask again」寫出來的是 `gcloud scheduler:*`，把 `jobs create` 和 `jobs delete` 一起放行了。那條以 `:*` 結尾，新的檢查看到就直接跳過。選項注入跟前綴開太寬是兩回事，這版處理的是前面那件，`gcloud scheduler:*` 那種還是得自己翻。

## 對你的流程有什麼影響

1. 升上 2.1.246，看第一次開機的 stderr。這個 repo 的 `.claude/settings.json` 我掃過，allow 裡的 `*` 全在尾巴（`Bash(git status:*)` 那種），不會叫。要翻的是 `~/.claude/settings.json`。
2. 沒被叫不代表那條規則沒事。本機實測，同一份設定檔裡 `Bash(gh * merge)` 和 `Bash(git * main)` 有警告，`Bash(* --version)`、`Bash(docker * -v)`、`Bash(pnpm * --frozen-lockfile)` 三條一聲不吭。判斷式要求 `*` 後面還跟著一個不是選項的字，`Bash(docker * -v)` 尾巴是 `-v` 就漏過去了。`:*` 收尾更乾脆，`Bash(git * origin:*)` 跟 `Bash(git * main)` 擺在同一個檔案裡，只有後者被念。
3. `Bash(* --version)` 這種第一個字就是 `*` 的，自己改掉，別等它提醒。官方文件寫它會 match `bash -c 'echo hi' --version`，等於什麼程式都放行，而它偏偏是判斷式明文排除的形狀。
4. 改法一句話：`*` 挪到子指令後面。`Bash(git * main)` 改成 `Bash(git log * main)`，`Bash(gh * merge)` 改成 `Bash(gh pr merge *)`。
5. deny 清單不用重寫。檢查只跑 allow，deny 寬一點只會多攔，不會少攔。
6. CI 不用管這行警告。它走 stderr，`-p` 的 stdout 還是只有答案。本機實測同一份設定加 `2>/dev/null`，輸出就一個 `ok`。
7. 跨 repo 用 `/cd` 的時候留意一下。換過去之後那邊的 hooks 和 skills 立刻就生效了，以前要等 `--resume`。
8. 自己在 `.claude/worktrees/` 底下開 worktree 的話，這是升級的理由。以前背景 session 記錄一過期，回收機制會把那些目錄當殘留清掉。
9. Arch 或 Fedora Rawhide 上卡在 2.1.243 開不起來的機器，直接升。那是 glibc 2.44 的問題，2.1.245 修掉了。`stable` 那條線沒動，還是 2.1.231，第 12.7 天。

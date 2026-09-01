---
title: "2.1.252：新 clone 的 repo 裡「不要再問」存不進去，這版才修好"
description: "四條全是 Fixed，沒有新功能。最值得看的是標準核准在沒有 settings.local.json 的專案裡會靜默失效，以及 tasks 目錄被連結時整個 Bash 工具會停擺。"
published: 2026-09-01
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "settings", "background-tasks"]
annotation: "同一個指令你核准過三次，不是你記錯，是它沒存。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 版本 | 2.1.252，08-31 17:07 UTC 發的，距這篇 7.2 小時；跟 2.1.251 隔了 73.6 小時 |
| 內容 | 四條，全是 Fixed。沒有 Added，也沒有 Improved |
| 標準核准 | 專案裡還沒有 `.claude/settings.local.json` 的時候，「不要再問」存不進去 |
| tasks 目錄 | `task output swap refused` 這個錯在部分 Mac 上會冒出來 |
| Remote Control | Claude Desktop 或 VS Code 當 host、連 claude.ai 的線路不穩時，工具跑完會卡上幾分鐘 |
| 背景任務通知 | 失敗輸出太大（官方舉的例子是磁碟滿了的 git 錯誤）會把對話撐過 API 的請求上限 |
| npm tag | `latest` 和 `next` 都指到 2.1.252，`stable` 還停在 2.1.236 |

## 為什麼要改

標準核准這條會挑「檔案還不存在」的專案出事，是因為建檔那條路上綁了不只一件事。[官方 settings 文件](https://code.claude.com/docs/en/settings)寫說這個檔是「the first time you give a standing approval on a permission prompt」才生出來的。同一次寫入還要把 `**/.claude/settings.local.json` 塞進你的 global git excludes，免得它被 commit 進去。已經有檔案的專案走的是另一條路，不受影響。所以症狀很挑人：你在熟悉的老專案裡從來沒遇過，一 clone 新 repo 就中。

同一頁還講了兩件容易忘的事。在 git repo 的子目錄裡開 session，讀寫的是 repo 根目錄那一份，核准範圍是整個 repo；worktree 裡用的則是主 checkout 根目錄那一份。

tasks 目錄那條的成因從二進位看得出來。macOS 的 `/tmp` 本身就是指到 `/private/tmp` 的 symlink，而背景任務的輸出正好放在 `/private/tmp/claude-<uid>/` 底下（社群，issue #42388）。2.1.252 的執行檔裡多了兩句 2.1.251 完全沒有的字串：

```
by realpath; same directory (device and inode), treated as an alias
not the same directory by a link-free route; refused
```

判斷從「路徑上不准有連結」放寬成「解出來是同一個 inode 就算同一個」。

## 對你的流程有什麼影響

1. 升上去。四條都是修的，沒有新東西要學，也沒有設定要改。
2. 如果你最近有過「這個指令我明明核准過」的感覺，去看那個專案有沒有 `.claude/settings.local.json`。沒有就是踩到這條，2.1.252 之後補按一次「Yes, and don't ask again」就會存進去。
3. 順手確認它有進 global excludes：

   ```bash
   git check-ignore -v .claude/settings.local.json
   ```

   由 Claude Code 建的檔會自動加，你自己手動建的那些不會，得自己寫進 `.gitignore`。
4. `task output swap refused (tasks dir moved or linked)` 真的出現的時候，別以為只有背景指令壞掉。我在 2.1.251 和 2.1.252 上都重現過，前景的 Bash 一樣打不動，模型回我的原話是「the Bash tool itself can't run right now in this session」（本機實測）。
5. 這條沒有全修好。我把 tasks 目錄換成一個指向隔壁目錄的 symlink，兩版都照樣拒絕。差在訊息。2.1.251 只丟一條路徑給你，2.1.252 會接著講怎麼救：換一個乾淨的 `CLAUDE_CODE_TMPDIR` 重開，或者把那個多出來的目錄或連結本身刪掉再重開。要刪的是那個項目，不是它指到的東西。
6. 別為了預防這件事先去設 `CLAUDE_CODE_TMPDIR`。我拿一個本身就是 symlink 的路徑餵給它，2.1.251 和 2.1.252 都跑得好好的，什麼都沒觸發（本機實測）。它是出事以後的救場工具，平常掛著沒有意義，而且它也沒寫在 settings reference 裡。
7. 另外兩條我沒驗到。Remote Control 那條要 Claude Desktop 或 VS Code 當 host，這裡起不來。通知太大那條，我比對過通知內容的 12000 字元上限和 `TASK_MAX_OUTPUT_LENGTH`（預設 32000、上限 160000），兩版一模一樣，修的地方不在這，我沒找出來在哪。

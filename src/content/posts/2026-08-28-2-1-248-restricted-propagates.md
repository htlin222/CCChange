---
title: "2.1.248：--restricted 會傳給子行程，2.1.250 只多了兩句話"
description: "新的 --restricted 把會跑指令的內建工具整組拿掉，而且會自己接到 subagent 和背景 session 上。掛在 next 的 2.1.250 沒有 changelog，二進位比下來只差兩句提示字串。"
published: 2026-08-28
category: "Changelog"
tags: ["claude-code", "changelog", "cli", "settings", "security"]
annotation: "next 上那版的全部差別是兩句提示字串。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| `--restricted` | 新旗標。拿掉 Bash、PowerShell、REPL 這類會跑東西的內建工具和 `WebFetch`，檔案工具只能在工作目錄裡動，`bypassPermissions` 直接拒絕 |
| `CLAUDE_CODE_RESTRICTED=1` | 跟旗標等效，實測吐出來的錯誤訊息一字不差。CLI reference 上沒有這個變數 |
| `experimental.cacheTtl` | agent frontmatter 新欄位，`"5m"` 或 `"1h"`。subagent 文件的欄位表裡查不到 |
| `/ultrareview` 上傳 | 沒 commit 的 `prod.env`、`*.tfvars`、`key.pem.tmp` 這類檔案以前會跟著送上雲，這版留在本機 |
| prompt cache | 長 session 大約每小時掉一次快取的問題修掉了，起因是換完 OAuth token 之後工具定義被重畫 |
| `/usage-credits` | changelog 寫 Added，2.1.247 的二進位裡字串就在了。這版動的是誰有資格用 |
| 2.1.250 | 掛在 `next`，沒有 changelog。跟 2.1.248 的差別是兩句 artifact watch 提示字串 |

其餘四十幾條裡你會碰到的：hook 的 stdout 印出壞掉的 JSON 現在報 parse 錯誤，不再被當成純文字吞下去；`claude agents` 一批鍵盤和 session 狀態的修正；Workflow 工具描述從 5.7k token 壓到 1k；`/loop` 的 dynamic 模式在 Bedrock/Vertex/Foundry 也開了。升上去就有，沒有要設定的東西。

## 為什麼要改

`--safe-mode` 早就在了，2.1.247 和 2.1.248 的二進位裡字串數一樣。它關的是客製化，內建工具和權限照留。跑評測的人需要的比這嚴：這台機器不准跑指令，也不准讀它自己的 settings。

官方文件把情境寫得很死：

> Use it when an evaluation harness drives `claude` on a shared machine and Claude Code must not run commands or read that machine's user and project settings.

出處是 [cli-reference](https://code.claude.com/docs/en/cli-reference)，同一頁註明要 2.1.248 以上。

文件跟 `--help` 對 settings 的說法對不起來。`--help` 寫 ignores user, project and local settings files，文件寫 loads only managed settings and `--settings`。兩句拼起來才完整：managed settings 照載，`~/.claude/settings.json` 裡的東西不會。

`/ultrareview` 那條掛的是 Fixed。認得出這些檔名的樣式表 2.1.247 就有了，`*.tfvars` 的正規式兩版一模一樣。壞在上傳那條路從來沒去問過它。

## 對你的流程有什麼影響

1. 留在 2.1.248，`next` 上的 2.1.250 不用跟。兩版可讀字串比對下來只差兩句話，都是 artifact 斷線之後要不要重新 watch 的提示。沒有新旗標、沒有新設定鍵，changelog 也還沒有它。
2. 2.1.247 以前跑過 `/ultrareview`，而且當時工作目錄裡躺著沒 commit 的 `prod.env`、`*.tfvars`，或 `id_rsa.swo` 這種編輯器暫存檔的話，那些內容上去過。先升到 2.1.248，再把裡面的憑證換掉。
3. CI 要接 `--restricted` 的話，先知道它會自己接到你 spawn 出來的東西上，背景 dispatch、subagent 和 tmux 都會補上這個旗標。另外 `isolation: remote` 在這個模式底下不能用，有 git root 就退回 `worktree`，沒有就直接在本地跑。
4. `--restricted` 底下想留 `WebFetch`，得在 `--tools` 裡點名，寫 `default` 這個預設集合不算數。
5. `experimental.cacheTtl` 已經在設 `subagentPromptCacheTtl` 的話不用管，設定和環境變數都比它優先。真要用的人記一件事：帳號進 overage 之後 `"1h"` 會被無聲忽略。這行寫在二進位的 schema 描述裡，subagent 文件沒有。
6. `/usage-credits` 不用管。它 2.1.247 就在了，這版擴的是 AWS Marketplace 計費和 Enterprise 試用的資格。

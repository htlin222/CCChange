---
title: "2.1.302：`claude -p` 的起始權限模式退回 default，fork subagent 的開關變成三個"
description: "v2.1.285 讓不抓 feature flag 的 -p session 預設走 auto，這版退回 default，而官方文件那張表還停在舊說法。另外 fork subagent 多了兩個你關不到的開關。"
published: 2026-10-17
category: "Changelog"
tags: ["claude-code", "changelog", "ci", "permission-modes", "subagents", "env-vars"]
annotation: "changelog 說關掉 fork subagent 靠 CLAUDE_CODE_FORK_SUBAGENT=0。二進位裡有三條路可以關掉它，只有這條在你手上。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.302 | 10-16 16:48 UTC 上 npm，距這篇 7.4 小時，63 條 |
| `stable` | 還是 2.1.292 |
| `claude -p`／Agent SDK | 沒帶 `--permission-mode` 時，第三方 provider、telemetry 關掉、全新安裝這三種情況改回 `default`；明寫 `--permission-mode auto` 不受影響 |
| permission-modes 文件 | 那張表今天還寫這些 session 在 v2.1.285 之後走 `auto`，跟 changelog 對不上 |
| fork subagent | `-p`、SDK、桌面版、VS Code 預設開。能關掉它的路有三條，`CLAUDE_CODE_FORK_SUBAGENT=0` 只是其中一條 |
| `CLAUDE_CODE_AUTO_MODE_MODEL` | 變數 2.1.301 就在了，這版加的是「伺服器指定的 classifier model 蓋過你」的警告 |
| `/config` | 多一列 `Idle compaction`，預設開著 |
| 排程 routine | 中途失敗的那次不再隔一小時從頭重跑，不會再貼出兩份一樣的報告（官方 changelog，沒實測） |
| prompt／agent hooks | 同一個事件最多 12 個同時跑，其餘排隊（官方 changelog，沒實測） |
| Read 讀圖 | 超過 128 MB 的來源直接拒絕，不再整個讀進記憶體（官方 changelog，沒實測） |

剩下的跟你沒關係：Slack 和 Claude Tag 那十幾條、Windows 的 exFAT 寫入、PowerShell 的外掛路徑、reftable 格式下的 worktree 和 git fetch、VS Code 面板那幾條。

## 為什麼要改

起始權限模式這條繞了一圈回到原點。v2.1.285 讓不抓 feature flag 的 session 預設進 `auto`，也就是第三方 provider，或你自己把 telemetry 關掉的那些。用意是沒人看著的時候，讓 classifier 代你按核准。但 `-p` 底下沒有終端機可以問，[permission-modes 文件](https://code.claude.com/docs/en/permission-modes#which-mode-a-session-starts-in)把 auto 碰到這種場合的行為寫得很直白：

> In `auto` mode, wherever Claude Code can't show you a terminal prompt, it denies the command immediately

於是這版退回 `default`。同一頁的那張表今天還停在舊說法，寫這些 session 在 v2.1.285 以後走 `auto`。

fork subagent 是另一回事。changelog 說它在 `-p`、SDK、桌面版和 VS Code 預設開了，給的關法是 `CLAUDE_CODE_FORK_SUBAGENT=0`。二進位裡的判斷式比這長：環境變數沒明寫 `1`、是這幾個介面、而且遠端 flag `tengu_federated_ullman` 回 true，三個條件同時成立才關得掉。那個 flag 2.1.301 裡找不到，是這版新加的。一起進來的還有組織政策欄位 `forkSubagentDisabled`，跟 `backgroundTasksDisabled`、`unsandboxedCommandsDisabled` 掛在同一個物件上。環境變數在你手上，另外兩條不換版本就能翻。

`CLAUDE_CODE_AUTO_MODE_MODEL` 掛著 Added，2.1.301 的二進位裡卻已經有它，在環境變數的傳遞白名單中。這版真正加的是一句警告：伺服器指定了 classifier model 的時候，你設的值會被忽略。

## 對你的流程有什麼影響

1. CI 和排程裡的 `claude -p` 一律補上 `--permission-mode`。文件給 CI 的範例是 `--permission-mode dontAsk` 配 `--allowedTools` 白名單。這個預設值翻過去又翻回來，而文件那張表落後於 changelog，不寫就是在賭哪一邊是對的。

2. 同一批腳本順便確認有沒有關掉 telemetry。關了會讓 session 不抓 feature flag，而上面那兩條預設值都是看這件事分流的。

3. fork subagent 想要行為固定，就明寫 `CLAUDE_CODE_FORK_SUBAGENT`，要開寫 `1`，要關寫 `0`。預設值現在繫在一個遠端 flag 上，Anthropic 翻它的時候你的 pipeline 收不到通知。fork 和一般 subagent 的 context 繼承方式不一樣，翻掉就會改變你拿到的東西。

4. 有設 `CLAUDE_CODE_AUTO_MODE_MODEL` 的話，升版後去 log 裡抓 `ignoring CLAUDE_CODE_AUTO_MODE_MODEL=`。看到這句代表伺服器那邊指定了 classifier model，不是你變數寫錯。

5. 這個 repo 的每日排程直接吃到那條 routine 修正。2.1.302 之前，跑到一半失敗的排程可能隔一小時從頭再來，對出刊流程來說就是同一天開出兩支 PR。升上去就不用自己在腳本裡擋重複。

6. 其餘三樣不用管。`Idle compaction` 預設開著，Read 的 128 MB 圖片門檻是合理預設，hooks 的 12 併發上限要同一事件掛超過 12 個 hook 才看得到，而且是排隊不是報錯。

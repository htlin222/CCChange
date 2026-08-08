---
title: "2.1.224：session 之間開始互相傳訊息，而且預設是開的"
description: "跨 session 傳訊上了 latest，每個 session 會綁一個 inbox socket，收訊行為由新的 crossSessionInbound 決定。另外 /bug 分享逐字稿現在連你的 CLAUDE.md 一起送。"
published: 2026-08-08
category: "Changelog"
tags: ["claude-code", "changelog", "settings", "sandbox", "privacy"]
annotation: "設過 DO_NOT_TRACK 的人，這個功能在你機器上是關的，而且沒人會告訴你。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 版本 | 2.1.224 上了 latest，發出來 22 小時。2.1.225 一小時前才推上 next，還沒有 changelog |
| 跨 session 傳訊 | 同一台機器的 session 可以互相傳純文字，macOS 和 Linux 預設就是開的，沒有開關要打開 |
| `SendMessage` / `ListAgents` | 原本只管 subagent，這版擴到你自己開的獨立 session |
| `crossSessionInbound` | 收訊三段值 `accept` / `hold` / `refuse`，專案設定只能往嚴的方向調 |
| `dialogExpiry` | 核可對話框的逾時，預設五分鐘，你沒回來按它就把訊息丟掉 |
| inbox socket | 每個 session 綁一個，`/status` 的 `Peer address` 看得到，hook 從 `CLAUDE_CODE_MESSAGING_SOCKET` 拿得到 |
| `/bug` 分享逐字稿 | 經你同意後，system prompt（裡面有你的 `CLAUDE.md`）、工具定義、模型參數一起上傳 |
| 沙箱 deny | 結尾多一個斜線的 `denyRead: "~/.aws/"`，在 Linux 和 macOS 上繞得過去，這版修掉 |
| subagent 上限 | 每個 session 200 個的上限拿掉了 |

剩下的跟你無關：self-hosted runner 是 Team 和 Enterprise 的、`archive` 這個 plugin 來源、Bedrock 的 `ANTHROPIC_BEDROCK_REGION_PREFIX`，還有一整排 Remote Control 修補。

## 為什麼要改

之前兩個 session 之間要傳一句話，只能你自己複製貼上。[官方文件](https://code.claude.com/docs/en/cross-session-messaging)舉的例子是同一個 repo 開兩個 worktree，一邊改完 schema，另一邊還在舊欄位上寫東西。

預設扣住訊息是有道理的。收訊那端如果跑在 `bypassPermissions`，一段別人寫的文字進來就直接變成新的一輪。官方按權限模式分兩類，對方沒宣告自己是哪一類、或跟你不同類，就先扣著等你按。文件也講明訊息不能代你核可、不能改設定，裡面的 `/compact` 只會當成普通文字讀。

社群嫌的是同一件事的另一面。[#78706](https://github.com/anthropics/claude-code/issues/78706) 七月中開到現在還沒關：一個 coordinator session 在調度十個本機 session，一輪掃下來要按十次核可。提案是加一個 `trustedPeerSessions` 之類的本機白名單，目前沒有這種設定。

`SendMessage` 這串字在 2.1.223 的執行檔裡就有 58 處，這版是 61 處。功能不是新蓋的，是把已經在跑 subagent 的那套接到 session 之間（本機實測）。

## 對你的流程有什麼影響

1. 升。`npm i -g @anthropic-ai/claude-code`。latest 從 2.1.223 移到 2.1.224 了。
2. 先確認你到底有沒有這個功能，打 `/list-agents`。認不得這個指令就是沒有。`DISABLE_TELEMETRY`、`DO_NOT_TRACK`、`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`、`DISABLE_GROWTHBOOK` 這四個，設了任何一個功能就整個關掉，因為它掛在 feature flag 上。官方文件寫在 Availability 那節，session 裡不會有提示。我會先查這個再查別的，不然你會對著一個根本沒載入的功能 debug 半小時。
3. CI 裡那些 `claude -p` 現在也會綁 inbox socket。`-p` 顯示不了核可對話框，被扣住的訊息會一直扣著。沒東西會傳給它就不用管；要它收，`--settings` 裡明寫 `crossSessionInbound: "accept"`。
4. 想整個關掉的話，`refuse` 只擋得住進來的。送出去跟列舉要另外加 permission deny rule，`SendMessage` 和 `ListAgents` 兩個都寫，少一個就漏。
5. 下次按 `/bug` 分享逐字稿之前看清楚。你的全域 `CLAUDE.md` 在 system prompt 裡，會一起送出去。
6. 翻一下 settings 裡的 `sandbox.filesystem`，`denyRead` 和 `denyWrite` 結尾有斜線的都改掉。以前那樣寫等於沒寫。
7. 2.1.225 不用追。它只在 next，沒有 changelog。比對執行檔看到的是 `crossSessionInbound` 被 repo 或組織設定壓住時的提示文字，2.1.224 裡沒有這幾句，所以你的 `accept` 沒生效時它不會告訴你為什麼（本機實測）。

---

*版本、dist-tag 與發佈時間取自 npm registry。跨 session 傳訊的行為、feature flag 依賴、`crossSessionInbound` 與 `dialogExpiry` 的值域經 code.claude.com 確認（官方文件）。核可摩擦引自 GitHub issue #78706（社群）。字串比對來自本次下載 2.1.223、2.1.224、2.1.225 三份 linux-x64 執行檔（本機實測）。*

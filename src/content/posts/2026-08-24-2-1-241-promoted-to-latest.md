---
title: "2.1.241 升上 latest：昨天那句「先別裝」作廢"
description: "24 小時內沒有新版，但 latest 從 2.1.240 換成了 2.1.241。拿兩版 linux-x64 執行檔對過，只差兩處：SDK 的一段說明文字，還有送給 VS Code 擴充套件的 gate 清單。stable 還是 2.1.231，第 10.7 天。"
published: 2026-08-24
category: "Changelog"
tags: ["claude-code", "changelog", "release-channel", "autoUpdatesChannel", "minimumVersion"]
annotation: "從 latest 退回 stable 之前先設 minimumVersion，不然會被降版。"
---

## 改了什麼

沒有新版。動的是頻道指標。

| 項目 | 一句話 |
| --- | --- |
| 最新版 | 還是 2.1.241，08-22 23:58 UTC 發的，到現在 24.5 小時 |
| `latest` | 官方 release bucket 的 `/latest` 現在回 2.1.241。昨天那篇記的還是 2.1.240，2.1.241 只掛在 npm 的 `next` |
| `stable` | 沒動，還是 2.1.231。manifest 裡它的 build 時間是 08-13 07:40 UTC，第 10.7 天 |
| changelog | 2.1.241 的區塊補上了，內容一行「Bug fixes and reliability improvements」，跟 2.1.240 那行一字不差 |
| 2.1.241 對 2.1.240 | 兩處差別。SDK `set_max_thinking_tokens` 的一段說明被改寫，VS Code 的 `experiment_gates` 通知多送一個 `tengu_sable_thrush` |
| 校驗 | npm 拿到的 linux-x64 執行檔 sha256 是 `0771bd86…`，跟官方 manifest 寫的一致，342636848 bytes 也對得上 |

## 為什麼要改

[官方 setup 文件](https://code.claude.com/docs/en/setup#configure-release-channel)是這樣描述兩條頻道的：

> `"latest"`, the default: receive new features as soon as they're released
>
> `"stable"`: use a version that is typically about one week old, skipping releases with major regressions

一週是文件的說法，跑出來是十天半。stable 現在服務的 2.1.231 build 在 08-13，這中間 latest 走了十版。文件沒寫錯。跳過有重大回歸的版本，間隔本來就會拖長，只是 about one week 聽起來比實際緊。

2.1.241 的兩處差別指向同一件事。2.1.240 做的是 thinking narration 那條線，2.1.241 把這條線的開關狀態接進 VS Code 擴充套件收的 `experiment_gates` 通知裡，`tengu_sable_thrush` 排在原本那串 gate 的最後面。所以這一版補的是編輯器擴充套件那一側的線，你這邊不會有東西動：開關沒開，`nt("tengu_sable_thrush", !1)` 的預設值還是 false。

## 對你的流程有什麼影響

1. 昨天那句「2.1.241 先別裝」作廢。它現在是 latest，native installer 的背景更新會自己推上去，你不用做事。
2. 想確認裝的是官方那顆，抓 manifest 對 sha256：
   ```bash
   curl -fsSLO https://downloads.claude.ai/claude-code-releases/2.1.241/manifest.json
   sha256sum ~/.local/share/claude/versions/2.1.241
   ```
   對 `platforms.linux-x64.checksum` 那一欄。我拿 npm tarball 這樣對過，一致。
3. 釘 `stable` 的機器不用管，不過該知道自己停在哪。`curl -s https://downloads.claude.ai/claude-code-releases/stable` 現在回 2.1.231，effort 提示和 `claude -c` 撈到隔壁目錄 session 那條修正，那台都還沒收到。
4. 真要從 latest 退回 stable，先在 settings 裡放 `minimumVersion`。執行檔裡那行說明寫的是 `Minimum version to stay on - prevents downgrades when switching to stable channel`，沒設就是真的會降版。
5. `tengu_sable_thrush` 不用管，預設關著。想提早看它長什麼樣就 `CLAUDE_CODE_SABLE_THRUSH=1`，env 那條 guard 排在 gate 前面，會蓋過遠端值。
6. 昨天那則 effort 降級提示照舊。「Switch your default effort to medium?」和 `hasSeenEffortMediumNudge` 在 2.1.241 裡都還在，設了 `CLAUDE_CODE_EFFORT_LEVEL` 就不會被問。

---

*版號、dist-tags 與發版時間來自 npm registry。`latest` 與 `stable` 的指標、manifest 的 checksum 與 build 時間，來自 `downloads.claude.ai/claude-code-releases`（官方）。兩條頻道的描述引自官方 setup 文件（官方文件）。2.1.240 與 2.1.241 的兩處差別、`tengu_sable_thrush` 的預設值、`minimumVersion` 的說明字串，是拿兩版 linux-x64 執行檔對出來的（本機實測）。GitHub API 在這個 session 回 403，repo 的 `pushed_at` 拿不到。搜尋不到 2.1.241 的條目整理，只有轉貼那一行 changelog 的聚合站（社群）。*

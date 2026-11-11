---
title: "2.1.322：整份 changelog 一條，fast mode 開到 Vertex 上"
description: "322 只做了一件事，而且只有把 Claude Code 架在 Agent Platform 上的人會碰到。第一方帳號這版可以不升，321 要。"
published: 2026-11-11
category: "Changelog"
tags: ["claude-code", "changelog", "fast-mode", "vertex", "settings"]
annotation: "settings 裡的 fastMode 在 Agent Platform 上一律不看。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.322 | 11-10 01:58 UTC 上 npm，到現在 22 小時。`latest` 和 `next` 指它，`stable` 還是 2.1.311 |
| changelog 本身 | 一條。Vertex 上的 fast mode，別的什麼都沒有 |
| Agent Platform 的 fast mode | 原本的 Vertex AI，Fable 5.2 可以開 fast mode 了，要 2.1.322 以上 |
| 區域 | Fable 5.2 的區域得是 `global`、`us` 或 `eu`，程式裡就是這三個字串的集合（本機二進位比對）|
| 區域不對的時候 | `/fast` 回 `Fast mode needs Vertex region global, us or eu`，`claude -p` 照標準速度跑完 |
| settings 的 `fastMode` | 在 Agent Platform 上不生效，user、project、local、managed 四層都不看 |
| Vertex 拒掉的時候 | 403 或 404 會讓這個 project 進三十分鐘冷卻，退回標準速度，不報錯 |
| Bedrock、Foundry、Claude Platform on AWS | 還是沒有，只是訊息從「只有直接用 Anthropic API 才有」換成「這個 provider 沒有」|

## 為什麼要改

321 以前這個閘門只有一格：你是不是直接打 Anthropic API。不是就整條拒掉，二進位裡那句話寫得很白，`Fast mode is only available when using the Anthropic API directly`。公司把 Claude Code 架在 Agent Platform 上的人就沒有路。322 把那一格換成按 provider 分流，Vertex 走自己的一套檢查。

[官方 fast mode 文件](https://code.claude.com/docs/en/fast-mode)多了一節 Use fast mode on Agent Platform。條件寫得很明確：2.1.322 以上，只有 Fable 5.2，區域限 `global`、`us`、`eu`。為什麼只有這三個，文件沒說。

settings 不生效這件事文件也只給結論，沒給理由。不過二進位裡 `fastMode` 的設定說明已經改成 On Vertex a saved value is ignored: use /fast each session，可見不是漏寫，是刻意的。

社群那邊的參考點從二月就是「第三方雲端沒有 fast mode」，[heise 2026-02-08 的報導](https://heise.de/-11169259)原句是 the fast mode is not available on third-party cloud platforms such as Amazon Bedrock, Google Vertex AI, or Microsoft Azure。現在 Vertex 那半不成立了，Bedrock 和 Azure 那半還成立。這陣子搜到的說法大多還是舊的那版，別拿來當依據。

## 對你的流程有什麼影響

1. 先用一行決定要不要讀下去。`/status` 的 API provider 那行寫 `Google Vertex AI` 才跟你有關，或者直接 `echo $CLAUDE_CODE_USE_VERTEX`。是空的就跳到第 6 項。
2. 要開的話先把區域弄對，而且要在起 `claude` 之前 export：`export VERTEX_REGION_CLAUDE_FABLE_5_2=global`。這個變數沒設會掉回 `CLOUD_ML_REGION`。
3. 然後去 Model Garden 確認 Fable 5.2 真的開了。沒開的話 Vertex 回 403 或 404，整個 project 進三十分鐘冷卻，畫面上只寫 `Fast mode was refused for this project · trying again in 30m`。你看不到錯誤，只會覺得它慢。想提早重試就再跑一次 `/fast on`。
4. 別想用 managed settings 推給全公司，推不動。CI 和排程要用就每次自己帶 `claude -p --model claude-fable-5-2 --settings '{"fastMode": true}'`，互動的 session 每次手打 `/fast`。
5. 錢不要照文件那張表算。$16/$80 是 Anthropic 自己收的價，Agent Platform 上帳由 Google 開，文件沒給數字。開給團隊用之前先去 Google 那邊問到單價，不然你發出去的是一個不知道多貴的加速按鈕。
6. Bedrock 或 Foundry 不用管。換掉的只是那句話的字，功能沒過去。
7. 第一方帳號這版可以不升。我把 322 新增的可讀字串整份比過，全是這條功能和它旁邊兩個標籤，跟你一點關係都沒有。該升的是 321。那版四條權限修裡，`/bin/cp` 繞過 deny 規則那條你要是還沒回頭查過，那才是升級的理由。

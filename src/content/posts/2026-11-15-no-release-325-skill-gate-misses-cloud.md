---
title: "沒有新版：2.1.325 那條排程 skill 閘門，在雲端出刊這條路上沒擋人"
description: "28 小時沒有新版本。昨天我說雲端出刊會卡在 humanizer 那一步，今天這趟排程實際跑過，沒卡。要補的規則還是要補，只是補的位置在你自己的機器上。"
published: 2026-11-15
category: "Changelog"
tags: ["claude-code", "changelog", "skills", "permissions", "scheduled-tasks"]
annotation: "allow 規則比對的是 skill 自己的名字和 Claude 叫它的那個名字，前綴規則接不到裸名字。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 沒有新版 | 11-15 00:07 UTC 查，`latest` 還是 2.1.325，離上架 28 小時 |
| `stable` | 一樣停在 2.1.311 |
| CHANGELOG | 最上面還是 2.1.325 那段，沒有新條目 |
| 昨天的預測 | 錯了。今天這趟排程跑在 2.1.325 上，humanizer 照常載入，沒問人 |
| 昨天的第 2 項待辦 | 還沒做，`.claude/settings.json` 裡仍然沒有 `Skill(humanizer-zh-tw)` |
| `CLAUDE_CODE_HOST_SCHEDULED_RUN` | 324 新增的字串，323 沒有，雲端容器裡沒設 |

## 為什麼要改

昨天我說 325 那條「排程任務和 `/loop` 遇到宣告 `allowed-tools` 的 skill 會先問人」，會讓這個 repo 的出刊排程卡在 humanizer 那一步。今天這趟就是那個排程。容器裡 `claude --version` 回 2.1.325，skill 的 frontmatter 照樣宣告 `allowed-tools`，allow 清單照樣沒有對應規則。它載入了，沒停。

這不代表閘門壞掉。整趟下來一次權限提示都沒有，`npm pack`、`tar`、`strings` 都不在 allow 清單裡，照樣跑完。這個環境本來就不會問人，閘門在不在都看不出來。能確定的只有雲端這條路不會停。

324 多出一個 `CLAUDE_CODE_HOST_SCHEDULED_RUN`，323 的字串表裡沒有。二進位對它的說明是，排程的理由「由伺服器為雲端排程任務設定，或由本機 host 宣告自己的排程執行，而後者只在 host 用 `CLAUDE_CODE_HOST_SCHEDULED_RUN=1` 啟動的行程裡才採信」。這台容器裡它沒設。

[skills 文件](https://code.claude.com/docs/en/skills)整頁到現在沒有提過這條閘門，連 `/loop` 的段落都沒有。文件裡寫到 `allowed-tools` 和信任的只有這句：

> Claude Code applies a project skill's `allowed-tools` even in a `-p` run in a folder you've never trusted.

## 對你的流程有什麼影響

1. 雲端出刊這邊不用趕。今天這趟是真的跑過了，humanizer 沒卡，那支補規則的 PR 可以排到你有空的時候再開。
2. 要補的是本機那份。`/loop` 和桌面排程跑在你自己的機器上，閘門要擋也是擋那裡。把 `"Skill(humanizer-zh-tw)"` 加進 `~/.claude/settings.json` 的 `permissions.allow`，不是專案那份。
3. 名字要跟 Claude 叫它的時候一字不差。文件寫的是 allow 規則只比對 skill 自己的名字和 Claude 呼叫時用的名字，二進位裡還有一條專門講邊界的提示：`Skill(x) only covers names starting with "y:". Add Skill(z) to allow z without asking.` 從 plugin 來的要寫 `Skill(plugin:name)`，裸名字接不到；反過來寫前綴規則也蓋不到裸名字。
4. 補之前先知道有幾支要補：

   ```bash
   grep -l allowed-tools ~/.claude/skills/*/SKILL.md ~/.claude/skills/*/*/SKILL.md
   ```

   只有你手動叫的那些不用動。
5. 這條閘門別去文件上查，查不到。判斷條件目前只能靠 changelog 那一行和二進位裡那個環境變數。skills 頁更新了再回來對。
6. 還沒升到 2.1.325 的話現在升。zstd 解碼那條安全修正只掛在它名下，`stable` 的 2.1.311 沒有。

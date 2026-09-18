---
title: "2.1.275：帳號 skills 同步不是今天才開的，plugins 那半邊到現在還是空的"
description: "changelog 把 claude.ai 帳號同步寫成這版 Added，執行檔從 2.1.260 到 2.1.275 一個字都沒動。順便發現 /update-config 幫你寫的 Write(path) 規則從來沒被比對過。"
published: 2026-09-18
category: "Changelog"
tags: ["claude-code", "changelog", "skills", "plugins", "permissions", "sandbox"]
annotation: "寫 Added 的那天，通常不是它開始跑的那天。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| `latest` | 2.1.275，2026-09-17 20:20 UTC 上 npm，我查的時候過了 3.8 小時 |
| claude.ai 帳號 skills 同步 | changelog 這版寫 Added，但 `syncClaudeAiSkills` 這串字從 2.1.260 到 2.1.275 每一版都出現七次，沒動過。預設開著 |
| plugins 那半邊 | 同一套程式碼，落地是空的。我這個 session 的 `~/.claude/skills/synced/` 有 21 個 skill，`~/.claude/plugins/synced/` 底下沒有半個 |
| `Write(path)` 權限規則 | 路徑規則只認 `Edit(path)` 和 `Read(path)`。`Write(path)`、`NotebookEdit(path)`、`Glob(path)` 寫了不會被比對，而 `/update-config` 以前會幫你寫出第一種 |
| npm 來源的 plugin | 改成 `npm pack --ignore-scripts` 抓再驗 integrity，裝的時候不跑它的 install script。`expectedNpmIntegrity` 那組字串 2.1.274 一個都沒有 |
| Linux sandbox 下的 zsh | 失敗的指令回 exit 0 修掉了。順便多了 `ZSH_DANGEROUS_BUILTINS` 這組沒寫進 changelog 的檢查 |
| `otelHeadersHelper` | 跑掛的時候啟動會講一聲，`/status` 也看得到。之前是安靜地不送 |
| ctrl+enter | 打斷現在這一輪，把排隊的訊息一次送出去，`ctrl+x ctrl+s` 同義 |

VS Code 那邊二十幾條大多是 fullscreen 捲動和 agent map。cloud 環境修掉一個舊 bug：allowed-domains 清單太長的時候存檔會過，之後每次開 session 都失敗。

## 為什麼要改

同步這件事的用途很好懂：你在 claude.ai 的設定裡開了幾個 skill，終端機看不到，只能自己複製一份到 `~/.claude/skills/`。現在它在 session 開始時抓一次，之後每十分鐘對一次。[官方文件](https://code.claude.com/docs/en/skills)連退出之後檔案會搬去 `~/.claude/skills/.trash/` 都寫了，`syncClaudeAiPlugins` 則整頁找不到。

難看的是 plugins。社群在 2.1.260 就報過（[#92031](https://github.com/anthropics/claude-code/issues/92031)，還開著）：同一次 session 裡 skills 下載九個，plugins 是 `count:0`。我這邊重現了，21 比 0。`tengu_account_plugins_sync_enabled` 這道 gate 的字串也比過，2.1.260、2.1.274、2.1.275 完全一樣，這版沒碰它。

`Write(path)` 那條跟版本無關，是一直都這樣，今天才第一次被寫下來。2.1.275 的 `/update-config` 內文多了一句「`Write(path)`、`NotebookEdit(path)` 和 `Glob(path)` 規則不會被檔案權限檢查比對」，2.1.274 的同一份文字裡連這個段落都沒有。所以你手上任何一條這樣的規則都是死的，而它長得跟有效的規則一模一樣。

## 對你的流程有什麼影響

1. 升級：`npm i -g @anthropic-ai/claude-code`。
2. `ls ~/.claude/skills/synced/*/`，看看裡面有什麼。這不是今天才開始的，你在 claude.ai 那邊開的東西已經進終端機好一陣子了。我不會關掉它，但我會偶爾看一眼，因為那個資料夾不經過我的 repo，也不經過任何 review 就被載進來。真的不要就在 `~/.claude/settings.json` 加 `"syncClaudeAiSkills": false`，下次啟動會把同步過的搬去 `.trash/`。
3. plugins 不用管。想靠帳號同步在新機器上長出 plugin 的話，現在會拿到零個，手動 `/plugin` 裝還是唯一的路。
4. 抓一次死規則：`grep -nE '"(Write|Glob|NotebookEdit)\(' ~/.claude/settings.json .claude/settings.json`。有中的就把 tool 名字換成 `Edit`，路徑照抄。這支 repo 的我看過，只有 `Bash(...)`、`WebFetch(...)` 跟兩條 `Read(...)`，沒中。
5. 在 Linux 上用 sandbox 跑 Bash、而且登入 shell 是 zsh 的話，之前失敗的指令會回 0 給你。任何靠 exit code 決定要不要繼續的 hook 或腳本，找一條會失敗的指令重跑一次確認。
6. 自己養 plugin marketplace 的話，升上來之後 npm 來源會驗 integrity，registry 沒給 integrity 的套件會直接裝不起來，錯誤訊息寫得很清楚。改用 git 或本機路徑就繞過了。
7. `otelHeadersHelper` 沒接就不用管，那行警告只在你設過它的時候才會出現。
8. ctrl+enter 值得花兩天練起來。你現在的做法是按 Esc 打斷、重打一次；換成排隊幾句再一起送，省掉的就是重打那一段。

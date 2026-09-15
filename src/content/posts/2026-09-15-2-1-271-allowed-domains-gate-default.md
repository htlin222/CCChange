---
title: "2.1.271：allowed_domains 的程式碼上一版就寫好了，這版翻的是預設值"
description: "九十六條裡跟你有關的有四條。官方寫 Added 的 allowed_domains，兩版執行檔的相關字串一字不差，改的是 gate 的本地預設值。真正值得現在升上去的理由是 .git/config.lock 那條。"
published: 2026-09-15
category: "Changelog"
tags: ["claude-code", "changelog", "sandbox", "subagents", "git", "plugins"]
annotation: "沙箱指令連起都沒起來，鎖檔留在原地，後面每一次寫 git config 都撞上它。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| `latest` | 2.1.271，2026-09-14 19:45 UTC 上 npm。2.1.272 同一天 23:34 也上了，但掛在 `next` |
| 每道指令的 `allowed_domains` | 官方寫 Added。兩版執行檔的相關字串一字不差，變的是 `tengu_flickering_rain` 這道 gate 的本地預設值，`false` 換成 `true` |
| `omitClaudeMd` | agent frontmatter 的鍵白名單多了它，排在 `background` 和 `isolation` 中間。2.1.270 裡它只出現在內建 agent 的物件字面值 |
| `.git/config.lock` | 沙箱指令啟動失敗會留下鎖檔，之後同一個 session 的 `git checkout -b`、`git push -u`、`git config` 全部壞掉。Linux 限定 |
| `--accept-command <sha256>` | `claude plugin install` 多了這個旗標，用 sha256 釘住要執行的那一行，取代 `-y` |

剩下九十二條是 fast mode、MCP、VSCode、Claude Tag 和 Code Review，跟你這條線沒有交集。

## 為什麼要改

先看 `.git/config.lock`。它講的情境就是你每天出刊在跑的那個：Linux 上的沙箱 session，接連 `git checkout -b` 和 `git push -u`。2.1.271 之前，只要有一道沙箱指令連起都沒起來，鎖檔就留在原地，後面每一次寫 git config 都撞上它。報出來的錯不會指向幾十個 tool call 以前的那次失敗。這條只有官方 changelog 一個來源，兩版執行檔的 `config.lock` 字串完全一樣，我沒比出東西。

`allowed_domains` 是另一回事。[sandbox 文件](https://code.claude.com/docs/en/sandboxing)整頁講的都是 settings 裡的 `network.allowedDomains`，沒提過可以把 `allowed_domains` 掛在單一道 Bash 呼叫上。比對執行檔，這套東西 2.1.270 就寫完了。schema、錯誤訊息、送去給 classifier 的那條路徑，全都在。差別只在 gate 的第二個參數：2.1.270 是 `("tengu_flickering_rain", false)`，2.1.271 是 `("tengu_flickering_rain", true)`。原本關著的開關翻了面而已，遠端那一側沒有動。

`omitClaudeMd` 倒是真的多了東西，只是[文件](https://code.claude.com/docs/en/sub-agents)沒跟上。frontmatter 表格列了十七個欄位，裡面沒有它。

## 對你的流程有什麼影響

1. 升到 2.1.271。`npm i -g @anthropic-ai/claude-code` 拿到的就是它。`next` 上那個 2.1.272 別去拿，字串差異翻過一遍，幾乎整包是 Artifact 和 design REPL 的東西。
2. 手上還開著的舊 session 如果 git 已經卡住，`rm -f .git/config.lock` 解得掉，不必重開。升上去之後就不會再遇到。
3. 你的 global CLAUDE.md 目前每個 subagent 都吃得到。挑那些 prompt 已經把該說的說完的（跑檢查、查東西那類）加一行 `omitClaudeMd: true`。有兩個邊界。它只在那個 agent 當 subagent 被叫起來的時候生效，用 `--agent` 拉成主 session 不算；managed policy 那份 CLAUDE.md 照樣會載進去，這個欄位擋不掉。
4. `allowed_domains` 不用動任何設定。沒有新程式碼，gate 也還在原位。今天預設開著不代表下週還開著，別在 CI 裡寫依賴它的東西。
5. 腳本裡跑 `claude plugin install -y` 的地方換成 `--accept-command <sha256>`。先用 `--json` 跑一次，把 `shownCommand.sha256` 抄下來釘住。之後 marketplace 把那行指令換掉，安裝會拒絕並且把新的指令再印一次給人看，不會照跑。

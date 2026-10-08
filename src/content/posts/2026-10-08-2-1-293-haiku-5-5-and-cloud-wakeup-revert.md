---
title: "2.1.293：Haiku 5.5 進了 catalog，但 gateway 那格是空的"
description: "五十六條，三分之二是 Fixed。Haiku 5.5 有 1M 原生 context 和十分之一的價錢，但換過去是一次搬遷不是改字串。另外 2.1.290 那條把雲端 session 從容器重啟裡叫醒的修正被收回去了。"
published: 2026-10-08
category: "Changelog"
tags: ["claude-code", "changelog", "haiku", "pricing", "scheduled-tasks"]
annotation: "4.6 之後的模型都是整個 1M 一個價，只有 Haiku 5.5 按 prompt 長度分級。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.293 | 10-07 17:18 UTC 上 npm，距這篇 6.9 小時，56 條：37 Fixed、7 Improved、5 Changed、3 Added、2 Reverted |
| Haiku 5.5 | `claude-haiku-5-5` 新進 model catalog，1M 原生 context、128K 輸出、knowledge cutoff 2026 年 6 月（本機實測） |
| 價錢 | 十萬 token 以內 `$0.10`／`$0.50`，超過跳到 `$0.50`／`$2.50`，cache read 從 `$0.01` 變 `$0.05`（官方＋本機實測） |
| 誰拿得到 | catalog 的 haiku 預設換成 5.5，但 bedrock、vertex、foundry、mantle、gateway 全被釘回 `claude-haiku-4-5`，而 5.5 那筆定義裡沒有 gateway 這一格（本機實測） |
| tokenizer | 跟 4.7 以後同一個，同一段字多算約三成（官方） |
| 會直接報錯的 | `budget_tokens`、`temperature`／`top_p`／`top_k`、assistant prefill、舊的 `computer_20250124`（官方） |
| 雲端的 `/loop` 和定時任務 | 2.1.290 那條「容器重啟後把 session 叫醒」被 revert，session 就繼續睡，也沒人會告訴 Claude（官方） |
| Bash 單檔讀取 | 用 `cat`、`head`、`tail`、`sed -n`、`grep` 看檔，現在也會載 nested CLAUDE.md 和 path-scoped rule（官方） |
| 壓縮 | 壓縮前做完的事不再被當成沒做完，然後收回去重做一遍（官方） |
| `/model` 的 effort | ←／→ 繞過最高或最低那一格會把 Low 存成某個模型的預設，修掉了（官方） |
| `subagentStatusLine` | payload 多一個 `agentType`；mods 的 `$.tool.register` 多一個 `isDeferred`（官方） |
| HTTP MCP | 連線在關掉之前會一直留著自己發過的每一個 request，修掉了（官方） |

剩下是長尾：vim mode 的 `>>` 和 `V`＋`d`、keybindings.json 的檢查、`claude purge` 的 exit code、Claude Tag 七條、Remote Control 四條、`claude plugin eval` 在裝了 Docker Desktop 的 Mac 上。沒碰到就整批不用管。

## 為什麼要改

Haiku 4.5 是 200K context、64K 輸出、`$1`／`$5`。拿它跑分類和 subagent，200K 常常塞不下一次大一點的 repo grep。5.5 把 context 和輸出都放寬，價錢還砍到十分之一。代價寫在[定價頁](https://platform.claude.com/docs/en/about-claude/pricing)的 long context 那節，而 4.6 以後的模型裡只有它吃這個待遇：

> Claude 4.6 and later models (except Claude Haiku 5.5) include the full 1M token context window at standard pricing. Claude Haiku 5.5 is priced by prompt length: a prompt of over 100,000 tokens pays higher prices.

這條單獨看還好。跟 tokenizer 那條湊起來才難算：[what's new 那頁](https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5)寫 the same input text produces approximately 30% more tokens on Claude Haiku 5.5 than on Claude Haiku 4.5，所以你在 4.5 底下量到七萬七的 prompt，搬過去就壓在懸崖邊上。

revert 那條是另一回事。2.1.290 想解的是容器重啟會把 pending wakeup 弄掉，解法是把 session 叫起來、告訴 Claude 有東西掉了。這版把叫醒收回去。訊息本身還躺在 binary 裡，兩版 byte 一樣，收掉的是觸發它的那件事。

## 對你的流程有什麼影響

1. 升到 2.1.293。

2. 跑在 subscription 上的話，Haiku 5.5 這整條對你是零。Claude Code 的 catalog 把 gateway 那格釘在 `claude-haiku-4-5`，而 5.5 那筆 model 定義裡連 gateway 的 model id 都沒給。三家雲也一樣被釘回 4.5。要碰到它只能走第一方 API key。

3. 自己拿 API 寫的那幾支腳本，換過去之前先拿掉四樣：`budget_tokens`、`temperature`／`top_p`／`top_k`、assistant prefill、`computer_20250124`。四個都是直接報錯，不會悄悄降級。所以這是一次搬遷，不是把 model 字串改掉就算了。我會另開一支腳本先跑一週，不在現有的那幾支上面動。

4. 回來的第一個 content block 可能是 thinking。按位置取第一塊當答案的 parser 要改成按 `type` 挑。thinking 文字預設也不回了，要看就設 `thinking.display: "summarized"`。

5. 算成本的時候門檻訂在七萬 4.5-token 左右，別訂十萬。越過之後輸入和 cache read 都貴五倍。不過就算踩進去，`$0.50` 還是比 4.5 的 `$1` 便宜，所以這是要不要放大 batch 的問題，預算炸不掉。

6. 雲端出刊這種只靠 session 裡的 `/loop` 或定時任務當鬧鐘的流程，別再只掛那一條。2.1.290 之後容器重啟會把 session 叫起來補救，這版收回去了，而且不會有人講。改成 repo 層的排程觸發。這篇就是這樣跑的。

7. auto mode 下讓 Claude 用 `cat`、`sed -n`、`grep` 看檔的，升版前那些讀取不載 nested CLAUDE.md 和 path-scoped rule。命令清單兩版一樣，動的是看完以後載不載規則。只有一層 CLAUDE.md 的 repo 沒差，CCChange 就是。

8. 去 `/model` 把每個模型記住的 effort 看一遍。←／→ 繞過最高或最低那一格會把 Low 存下來當預設，而且存的時候不講，所以帳可能已經記在那裡好幾天了。

9. `subagentStatusLine` 腳本現在收得到 `agentType`，自訂 agent 終於分得開。長跑的 session 配 HTTP MCP server 的，順便等這版補那個記憶體漏洞。

---
title: "2.1.232：fork subagent 預設開了，但只在互動 session"
description: "三十幾條，真正翻轉的是一個預設值。fork mode 從遠端開關改成本機預設開，`claude -p` 和 Agent SDK 維持關閉。另外 `< file` 這種輸入導向開始走權限檢查。"
published: 2026-08-14
category: "Changelog"
tags: ["claude-code", "changelog", "subagents", "fork", "permissions"]
annotation: "fork mode 開著的時候，Agent 工具的 run_in_background 參數會整個消失。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 版本 | 2.1.232，npm 08-13 21:30 UTC 發；`latest`、`next` 都指它，`stable` 從 2.1.222 前進到 2.1.223 |
| fork subagent | 互動 session 預設開。舊版由遠端 gate 決定，這版把 gate 整段拿掉，改成本機預設 |
| Agent 工具 | fork mode 開著時 `run_in_background` 參數會從工具定義裡被拿掉，模型要不到前景 |
| `claude -p`、Agent SDK | 維持關閉，要開得自己寫 `CLAUDE_CODE_FORK_SUBAGENT=1` |
| `@` 提及 | 提示列打 `@名字` 直接點名另一個 session，`SendMessage` 也認得沒有 ref 的裸名字了 |
| session 撞名 | 同一台機器上重名會自動改成 `name-word-word` 並告訴你 |
| `< file` | 輸入導向開始走權限檢查，擋掉時訊息是 `Input redirection from '…' was blocked` |
| `/config` | 多兩列：Dialog expiry、Messages from your other sessions |
| GitLab | 九種 token 前綴進遮蔽名單，plugin marketplace 認得 `gitlab.com` 的裸 repo URL |

剩下的是修補。PowerShell 和 Git Bash 各補掉一個權限繞道，巢狀 git repo 不再繼承父目錄的信任。MCP 探測失敗不會再卡滿 30 秒，Bedrock 和 Vertex 的區域字串和 idle timeout 也修了，Remote Control 那邊重連和被別台接手的毛病修了一串。`/code-review` 在 high 以上改成跟其他等級一樣走背景 agent。前一版 2.1.231 只有一條，修 Slack 這類用預先註冊 OAuth client 的 MCP 登入。

## 為什麼要改

fork 不是新東西。`subagent_type: "fork"` 那套程式碼在 2.1.231 的執行檔裡就完整存在，這版一個字都沒多。變的是誰決定它開不開。舊版最後一步是去問一個遠端 gate，問不到就關。新版那段查詢直接不見了，只剩下互動就開。

[官方 subagents 文件](https://code.claude.com/docs/en/sub-agents)把版本寫死了：

> Claude Code turns fork mode on by default in interactive sessions and leaves it off by default in non-interactive mode with `-p` and in the Agent SDK. The interactive default requires Claude Code v2.1.232 or later.

理由是快取。fork 的 system prompt 和工具定義跟母 session 完全相同，第一次請求就吃得到母 session 的 prompt cache。[第三方量過](https://systima.ai/blog/subagent-tax)一般 subagent 扇出會用掉單線作業 2.6 到 5.9 倍的 input token，fork 補的就是這個洞。

代價官方沒講。[另一份社群整理](https://www.buildthisnow.com/blog/guide/mechanics/claude-code-fork-subagent)講得比較白：「Long sessions with many children cost more in total, even with caching.」母 session 越長，每個 fork 帶走的歷史越大，打了折還是乘上去。我比較在意 `run_in_background` 那條。這個參數在 fork mode 開著時會從 Agent 工具的定義裡消失，模型從此不能說「這件事我要等結果再往下走」。

`< file` 那條的問題很直白：以前 `cmd < somefile` 讀進去的檔案，路徑檢查根本看不到。

## 對你的流程有什麼影響

1. 先決定要不要讓它開著。長 session 裡每 fork 一次就複製一次當下的對話，你那種開一整天不關的 session 最吃虧。全部關掉是 `CLAUDE_CODE_FORK_SUBAGENT=0`，本機實測 `0`、`false`、`no`、`off` 都吃。
2. 想留 fork mode 但不想讓 Claude 真的開 fork，官方給的是在 `permissions.deny` 加一條 `Agent(fork)`。subagent 照樣在背景跑，只是不走 fork 那條路。
3. CI 不用動。`claude -p` 這版沒有被翻開，跑起來跟昨天一樣。要在 CI 開就自己加 `CLAUDE_CODE_FORK_SUBAGENT=1`，加之前先把第一條的帳算一遍。
4. 互動 session 裡 subagent 以後一律在背景。習慣叫一個 subagent、等它回話再繼續的，那個等待點沒了，進度要去 `/tasks` 看。
5. 翻一遍 hooks 和 `settings.json` 裡的 Bash allow 規則，找有沒有 `cmd < file` 的寫法。讀的檔案在工作目錄外，這版開始會被擋。
6. `@名字` 現在直接能用，不必先 `ListAgents` 抄 ref 再貼回去。
7. `/config` 那兩列不用管。背後的 `crossSessionInbound` 上一版就在了，這版只是給它一個 UI 入口，設過的人不用重設。
8. GitLab 那幾條和 marketplace 的 `additionalMarketplaces`、`allowedMarketplaces` 別名，你人在 GitHub，不用管。

---

*版本與條目來自 npm registry 與官方 changelog（官方文件）。fork 預設值的翻轉、`< file` 的錯誤訊息、`crossSessionInbound` 的存在時點，來自本次下載並比對 2.1.231、2.1.232 執行檔（本機實測）。token 倍數與長 session 的成本說法引自第三方（社群）。此環境沒有 `gh`，`anthropics/claude-code` 的 `pushed_at` 這次拿不到。*

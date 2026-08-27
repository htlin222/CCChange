---
title: "2.1.247：SendFeedback 不是今天才有的，feedbackDrafts 的 quiet 不會讓它停"
description: "changelog 說這版新增 SendFeedback，二進位裡 2.1.237 就有了。真正要決定的是 feedbackDrafts 設哪個值，以及 ~/.claude/feedback/drafts/ 現在躺著什麼。"
published: 2026-08-27
category: "Changelog"
tags: ["claude-code", "changelog", "settings", "privacy", "feedback"]
annotation: "quiet 不是關掉，是不讓你看見。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| `SendFeedback` | changelog 寫 Added，但 2.1.237 的二進位裡就有了，這版是打開它並補上文件 |
| `feedbackDrafts` | 三個值。`notify` 是預設，出卡片；`quiet` 照樣起草只是不出卡；`off` 才真的不排隊 |
| 草稿位置 | `~/.claude/feedback/drafts/`，全帳號佇列 10 筆，第 11 筆擠掉最舊的，30 天過期 |
| 卡片上限 | 每個 session 三張，這個數字 Anthropic 可以從伺服器改，不必發版 |
| 逐字稿 | 只有在審核畫面把 Send transcript 留在 yes 才會附。從卡片直接送不含逐字稿 |
| 送出去之後 | 走 `/feedback` 同一條路，保留五年 |
| 跨 session 訊息 | 收回 2.1.228 的 inline 顯示，改回一行預覽，Ctrl+O 展開 |
| Sonnet 5 自動壓縮 | 1M 視窗的門檻從約 934K 提到約 967K |
| subagent 404 | 第一次呼叫就吃到 404 不再整個死掉，改走 session 的 fallback 鏈 |
| hook 爆量輸出 | hook 或背景 agent 吐幾 MB 錯誤訊息，把 session 卡在 Prompt is too long，修了 |
| 雲端 session | 容器在兩個 turn 之間重啟、背景任務還在跑的時候整個安靜掉，現在會回報丟了什麼 |
| `~/.claude/settings.json` | Bash sandbox 收尾會刪掉 nix、home-manager、stow 管的那條 symlink，修了 |
| `stable` | 還是 2.1.231，第 13.7 天 |

其餘二十幾行是方向鍵搶拍、kitty 終端下的 Ctrl 快捷鍵、`/terminal-setup` 覆蓋整份 Zed `keymap.json`、plugin marketplace 名稱過濾這類修補，升上去就有。

## 為什麼要改

`/feedback` 難用的地方在時機。東西壞掉的當下你在趕別的事，等到空下來想回報，已經想不起來是哪一步壞的、哪個 request id。SendFeedback 把起草搬到壞掉的那一刻：工具連續失敗、它幫不上你要它做的事、你指出它做錯、它自己發現做錯，或你直接叫它去報，它就寫一份丟進 `~/.claude/feedback/drafts/` 等你審。[官方工具文件](https://code.claude.com/docs/en/tools-reference#sendfeedback-tool-behavior)把觸發時機和附件清單都列了（官方文件），順帶寫著一句：

> Requires Claude Code v2.1.238 or later

那句話跟今天的 changelog 對不上。本機實測，`SendFeedback`、`feedbackDrafts`、`CLAUDE_CODE_SEND_FEEDBACK` 三個字串在 2.1.237 的二進位裡就在，2.1.246 到 2.1.247 之間一個都沒動。Added 講的是打開開關和補文件，不是寫程式，而文件自己說的可用版本也比今天早了半個月。你的 session 這段時間有沒有真的在起草，看 `~/.claude/feedback/drafts/` 最快。

## 對你的流程有什麼影響

1. 先看佇列：`ls -la ~/.claude/feedback/drafts/`。過期是 30 天，所以那裡如果有東西，是你這一個月某次罵它的時候寫下來的。看過再決定要不要留。
2. 不想要就設 `off`，別設 `quiet`。文件寫 `quiet` 是 Claude continues drafting feedback without showing cards，草稿照排，只是你看不到；不寫這個鍵等同 `notify`。單次跑用 `CLAUDE_CODE_SEND_FEEDBACK=0`。我自己設 `off`，理由不是怕它外洩，是決定要不要送的那一刻我通常正在趕別的事，那不是個做判斷的好時機。
3. 留著的話記住哪條路會帶逐字稿。卡片上直接送不含逐字稿；進審核畫面那條，Send transcript 預設留在 yes，整份對話跟著走，而且跟 `/feedback` 同一條路，[保留五年](https://code.claude.com/docs/en/data-usage)（官方文件）。逐字稿裡有你貼進去的東西。
4. 每 session 三張這個上限別當常數用。文件明說 Anthropic 可以從伺服器調它，不必發版。所以哪天卡片變多或變少，先別懷疑自己的設定被改掉。
5. 跨 session 訊息又縮回一行了。2.1.228 才把它改成 inline 顯示，這版收回去，看全文按 Ctrl+O。常在 session 之間互丟訊息的話，眼睛要重新習慣。
6. 有 hook 的機器直接升。hook 或背景 agent 吐出幾 MB 錯誤訊息會把整個 session 卡死在 Prompt is too long，這版修掉了。
7. 這個 repo 的雲端出刊也吃到。容器在兩個 turn 之間重啟而背景任務還在跑的時候，以前 session 就這樣沒聲音了，現在至少會說丟了哪些工作。
8. `~/.claude/settings.json` 是 stow 或 home-manager 管的 symlink 的話，這是升級理由。之前 Bash sandbox 收尾會把那條 symlink 當殘留刪掉。
9. CI 裡 `claude -p` 有釘模型的，subagent 第一次呼叫吃到 404 不再整個死，改走 fallback 鏈，回給 parent 的錯誤也帶 request id 了。
10. Sonnet 5 開 1M 視窗的長 session 會多撐一段，自動壓縮的門檻從約 934K 挪到約 967K。
11. `stable` 沒動，還是 2.1.231，第 13.7 天。

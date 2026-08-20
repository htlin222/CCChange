---
title: "2.1.236：新增 ANTHROPIC_DEFAULT_MODEL，設了 ANTHROPIC_MODEL 的人拿不到"
description: "新的環境變數只決定新 session 從哪個模型開機，/model 存下來的選擇贏得過它。但 ANTHROPIC_MODEL 一設，它就完全不生效，而官方文件那張優先序清單還沒收這個鍵。"
published: 2026-08-20
category: "Changelog"
tags: ["claude-code", "changelog", "model", "sendmessage", "auto-mode", "settings"]
annotation: "settings 的 model 是 opus-5、ANTHROPIC_DEFAULT_MODEL 是 haiku，送出去的是 opus-5。換成 ANTHROPIC_MODEL，送出去的就變 haiku。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 版本 | 2.1.236，08-19 18:45 UTC 發的，距這篇 5.7 小時，`latest` 指它。2.1.237 在 08-19 23:57 UTC 上了 `next`，距這篇半小時，官方 changelog 還沒有它的條目。`stable` 從 2.1.227 前進到 2.1.228 |
| `ANTHROPIC_DEFAULT_MODEL` | 新環境變數，決定新 session 開在哪個模型。`/model` 存下來的選擇贏得過它 |
| `notify_when_idle` | SendMessage 新參數，訂閱另一個 session 下次進 idle 時的一次性通知，只認同一台機器上的 Claude session |
| sandbox 讀取拒絕 | macOS，`**/.env` 這類 wildcard deny 現在在允許讀的區域裡面優先，命中的目錄連內容一起算，改檔名躲不掉 |
| auto mode 看工作區 | 那道 git status 檢查不再被 repo 的 `status.showUntrackedFiles=no` 騙成乾淨的樹 |
| auto mode 的 Monitor | auto mode 開著時 Monitor 的 allow 規則被擱在一邊，跟 Bash 指令一樣逐條審 |
| `claude -p` 收到 SIGTERM | 不再記一筆被打斷的 turn 和一批假的工具拒絕，跑著的指令照樣終止，退出碼還是 143 |
| 打錯的 slash command | 按 Enter 會告訴你打錯了，不再跑最接近的模糊匹配。前綴和 alias 照舊 |
| session recap | 自動的和 `/recap` 的文字都上限 400 字元，在詞邊界切 |
| `/goal` | 目標卡在長時間背景工作後面的閒置 session，現在 30 分鐘自己回報一次，接著是 1 小時、2 小時 |

剩下的多半只影響畫面：fullscreen renderer 啟動失敗一次之後退回經典 renderer，而不是之後每次啟動都直接退出；`/model` 選單不再畫得比終端機還高；tmux 分頁標題不再每 960ms 抖一下。切走的目錄被刪掉之後剪貼簿和背景 session 會壞掉，2.1.229 就有了，這版才修。

## 為什麼要改

模型那個鍵的來源是 #66100。VS Code 擴充把 `ANTHROPIC_MODEL` 塞進 `claudeCode.environmentVariables`，`/model` 就選不動了，從那份設定刪掉它才恢復，同一組設定在終端機裡沒這問題。要的是「開機從這裡開始」的鍵，不是蓋掉你每次選擇的那種。

[官方 model configuration 文件](https://code.claude.com/docs/en/model-config) 那張「Setting your model」的優先序清單有四項：`/model`、`--model`、`ANTHROPIC_MODEL`、settings 的 `model`。新的鍵不在上面，這頁還沒更新。cross-session messaging 那頁也一樣，`notify_when_idle` 一個字都沒有。

`ANTHROPIC_DEFAULT_*_MODEL` 這一家不是沒有前科。#49566 是 Bedrock 上設了之後 `/model` 選單多冒出一列重複的 Custom：自訂那列的 value 是 `sonnet`、內建那列是解析後的 Bedrock model ID，去重去不掉。四月開的單，結案理由寫 not planned。

`notify_when_idle` 補的是那頁早就列成用途、卻沒給工具的一格：「讓長時間跑的工作回報進度」。能做的一直只有輪詢。新的工具說明現在明文寫著別在迴圈裡輪詢 SendMessage，也別一直問對方 are you done。

## 對你的流程有什麼影響

1. 先看 `ANTHROPIC_MODEL` 有沒有被設在哪裡，`env | grep ANTHROPIC_MODEL`，還有 `~/.claude/settings.json` 的 `env` 區塊。它一設，新鍵就等於不存在：本機實測，settings 的 `model` 是 `claude-opus-5`、`ANTHROPIC_MODEL` 是 haiku 4.5，送出去的全是 haiku。
2. 想要「預設開在這個模型，但 `/model` 選了就聽 `/model`」，就把 `ANTHROPIC_MODEL` 刪掉，改設 `ANTHROPIC_DEFAULT_MODEL`。同一組實測換成新鍵，送出去的是 `claude-opus-5`。也就是說它只管沒人有意見的時候，組織預設還壓在它上面。
3. 別拿文件那張四項清單推論新鍵落在哪一格，它還沒被收進去。2.1.235 完全不理這個變數。
4. 要盯背景那支 `-p` worker，讓它純訂閱就好，`message` 空著，對方一個 token 都不花。附了訊息就是送達加訂閱兩件事一起做。
5. 目標不是同一台機器上的 Claude session，teammate、subagent、Remote Control、雲端 session 都算，整個呼叫會失敗，訊息本身也不會送達，錯誤訊息會叫你拿掉 `notify_when_idle` 再送一次。
6. 訂閱十二小時後過期。過期通知還是會來，只是內容變成「沒等到」。比十二小時久的搬遷或大測試別靠它收尾。
7. `git config --get status.showUntrackedFiles`，含 global 那份。之前是 `no` 的話，auto mode 那道「工作區乾淨嗎」的判斷一路看到的都是乾淨的樹。2.1.236 起那個 git 呼叫永遠明寫 `--untracked-files=normal`，之前這個 flag 是條件性的，沒帶就照 repo 走。這條我不會只更新版本了事，會回頭看有哪些 auto mode 的批准建立在那個誤判上。
8. 釘 `stable` 的人這篇一條都收不到，那條線還在 08-11 發的 2.1.228，落後 `latest` 八個版本。

---

*版號、發版時間、dist-tags 來自 npm registry，條目引自官方 changelog。優先序清單四項、以及 `notify_when_idle` 未收錄，來自 code.claude.com 的 model configuration 與 cross-session messaging 兩頁（官方文件）。#66100、#49566 來自 web search 與 GitHub issue 頁（社群）。模型解析先後、`--untracked-files=normal`、十二小時過期、跨機器目標連訊息一起退回，來自比對 2.1.235 與 2.1.236 的 linux-x64 執行檔，以及用假的 `ANTHROPIC_BASE_URL` 攔下實際請求（本機實測）。此環境 `api.github.com` 回 403，`pushed_at` 拿不到。*

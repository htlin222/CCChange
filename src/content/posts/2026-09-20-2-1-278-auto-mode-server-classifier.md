---
title: "2.1.278：auto mode 分類器不再另外計費，CLAUDE_CODE_AUTO_MODE_SERVER=0 的意思反過來"
description: "整版只有兩條，都在講 auto mode 的安全檢查改到伺服器做、而且不收費。真正會咬人的是那個環境變數：2.1.277 以前設 0 是開，2.1.278 起設 0 才是關。"
published: 2026-09-20
category: "Changelog"
tags: ["claude-code", "changelog", "auto-mode", "billing", "gateway", "settings"]
annotation: "同一個 =0，上一版是開，這一版是關。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| `latest` | 2.1.278，2026-09-19 01:48 UTC 上 npm，我查的時候過了 22.3 小時 |
| `stable` | 還是 2.1.267，09-09 18:25 UTC 發的，第十天 |
| 整版條目 | 兩條，都是 auto mode |
| 計費 | 分類器的檢查改成夾在 session 本來就要送的請求裡交給伺服器，伺服器做掉的那些不另外算錢 |
| 影響誰 | Claude API、Enterprise，以及 Bedrock、Vertex、Foundry、gateway。Pro、Max、Team 不在名單上 |
| 接不上的時候 | 退回本機分類器，照舊計費，而且會把下一個要檢查的動作壓住，跳一則提示等你按 Enter |
| `/status` | 多一列 `Auto mode server`，值是 Enabled 或 Disabled |
| `CLAUDE_CODE_AUTO_MODE_SERVER` | 2.1.273 就在了。當時預設是關的，要設 `=1` 才開 |
| 這個值怎麼讀 | 2.1.277 以前整串直接拿去當真假值，所以 `0` 也是開。2.1.278 起只認 `1`、`true`、`yes`、`on`（本機實測） |
| 提示跳幾次 | 一個 session 一次。認得出 gateway 的話，按下去之後這台機器 24 小時內不再跳（本機實測） |

## 為什麼要改

auto mode 每攔一個動作，就得另外發一次模型請求去問分類器，那筆算你的 token。開著它跑一整天，帳單裡有一塊根本不是你的工作，是檢查本身。

[官方文件](https://code.claude.com/docs/en/auto-mode-classifier-billing)寫的新做法是把檢查併進 session 原本就要送的請求：請求多帶一個 `safeguards` 欄位，回應帶回 `safeguard_results`，伺服器做完，這段不收費。中間那台 gateway 只要把不認得的欄位丟掉，或是改寫 streaming 事件裡的 key，這條路就斷了，退回本機那套，照舊計費。

這個預設值上禮拜才剛往反方向調過一次。2.1.273 把 Bedrock、Vertex、Foundry 的預設關掉，寫「暫時先用本機的，要開自己設 `=1`」，五天後又翻回來。比對執行檔，`safeguards` 在兩版出現的次數一模一樣，線上那套早就寫完了，這版動的是一個寫死的預設值和一則提示（本機實測）。

## 對你的流程有什麼影響

1. 升級：`npm i -g @anthropic-ai/claude-code`。`stable` 還停在 2.1.267，跟著 stable 走的機器整篇都還沒輪到。

2. 去翻 `~/.claude/settings.json` 跟專案那份的 `env`，找 `CLAUDE_CODE_AUTO_MODE_SERVER`。2.1.273 到 2.1.277 之間，這個值是整串直接當真假值用的，寫 `0`、`false`、`off` 全部都是開；2.1.278 改成只認 `1`、`true`、`yes`、`on`（本機實測）。你當初寫了什麼不重要，現在都反了。

3. 開一個 auto mode 的 session 打 `/status`，看新加的 `Auto mode server` 那列。Enabled 就是這個 session 的檢查在伺服器那邊做。

4. Pro、Max、Team 不用管那則提示。決定提示要不要跳的函式，第一件事就是對這三種 plan 直接回 false（本機實測），跟文件講的一致。

5. `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1` 現在會順手把這個一起關掉。新的預設值算式是「沒設那個變數就開」，所以為了別的理由設過它的人，等於選了繼續付分類器的錢。

6. CI 裡的 `claude -p` 不會被提示卡住。沒有對話介面可以跳的時候，它寫一行 log 就往下跑：

   ```
   [server-classifier] auto mode fell back to billed classifier requests; no dialog surface to warn on, continuing in auto mode
   ```

   要在 CI 看得到就讀 stderr，或接 `stream-json` 那條線上的 `system` 訊息（本機實測）。

7. 自己或公司架了 gateway 的話，把 `safeguards` 這個請求欄位和 `safeguard_results` 這個回應欄位原封不動轉過去，不然這條線永遠停在計費那一邊。執行檔裡認得八家，LiteLLM、Helicone、Portkey、Cloudflare AI Gateway、Kong、Braintrust、Bifrost、Databricks，認得出來的提示會直接點名是誰（本機實測）。

8. 短期改不動 gateway 的，設 `CLAUDE_CODE_AUTO_MODE_SERVER=0` 可以把提示收掉，檢查一樣跑，帳單一樣算。文件自己註明這個變數是暫時的、以後可能拿掉。我會把它寫在 CI 的 job 環境裡，不寫進 `~/.claude/settings.json`：一個五天內換過預設值、又換過值解讀方式的開關，擺進長期設定檔就是等著變成沒人記得為什麼在那裡的一行。

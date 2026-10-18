---
title: "沒有新版：2.1.302 底下寫 `--permission-mode auto`，排程就帶上 3 次連續擋下的上限"
description: "latest 停在 2.1.302 三十一小時。昨天那篇叫你補 --permission-mode，這篇講補 auto 的代價：門檻寫死在執行檔裡，而 classifier 自己回應壞掉也記一次。"
published: 2026-10-18
category: "Changelog"
tags: ["claude-code", "changelog", "permission-modes", "auto-mode", "ci", "subagents"]
annotation: "subagent 可以死在連續擋下的上限上，而外層那支 claude -p 的 exit code 還是 0。"
---

## 改了什麼

沒有新版。`latest` 還是 2.1.302，npm 推送時間 2026-10-16 16:48 UTC，到寫這篇為止 31.3 小時。

| 項目 | 現況 |
| --- | --- |
| `latest` | 2.1.302 |
| `stable` | 2.1.292，10-15 推上去之後沒再動 |

昨天那篇的第一條是叫你在排程的 `claude -p` 補上 `--permission-mode`。今天補的是補上之後的事：那個值寫 `auto` 會帶上什麼。

| 檢查 | 結果 |
| --- | --- |
| 擋下門檻 | `{maxConsecutive:3,maxTotal:20}`，寫死的字面值，附近沒有任何環境變數讀它 |
| 連續那本帳 | 中間放行一次就歸零 |
| 總數那本 | 整個 session 累積，只有自己撞線才歸零 |
| classifier 回應解析不出來 | 照記，走的是同一個計數器 |
| 安全防護拒掉 classifier 自己的請求 | 不記 |
| 2.1.301 跟 2.1.302 的門檻 | 兩邊同一個字面值 |
| 「對話太長就先壓縮」那條 | 程式碼和旗標 `tengu_merry_popcorn`（預設 true）在 301 就有，302 改的是遠端那個值 |

（本機實測，npm 抓 linux-x64 的 2.1.301 和 2.1.302 解開來比對。）

## 為什麼要改

門檻[文件寫出來了](https://code.claude.com/docs/en/permission-modes#repeated-block-thresholds)：

> The thresholds of 3 blocks in a row and 20 blocks total are not configurable.

互動終端機裡這不礙事。撞線之後 auto mode 停下來改回問你，按一次同意就恢復。排程沒有人按，而同一段接著處理了這件事：

> A non-interactive `-p` run without a `--permission-prompt-tool` has no prompt to fall back to. When repeated blocks reach a threshold, the action doesn't run and Claude keeps working. Claude Code doesn't stop the run.

執行檔裡那個分支只問一件事：這個 session 叫不叫得出提示框。叫不出來就丟一個 `AbortError`，訊息是 `Agent aborted: too many classifier denials in headless mode`，而外層那個 catch 認出 `AbortError` 就往上拋，不轉成單次拒絕。我沒有把它跑起來，所以分不出主對話和 subagent 走的是不是同一條，主對話的行為照文件算。subagent 那邊不必猜，[errors 文件](https://code.claude.com/docs/en/errors#auto-mode-cannot-determine-the-safety-of-an-action)自己寫了背景 subagent 拿到的就是一則 `Agent aborted:` 的錯誤結果，而外層的 run 繼續跑。

難查的是這三次怎麼湊出來的。不必是 Claude 真想做三件危險的事：classifier 回應解析不出來也算一次，執行檔裡 `failureMode` 那條分支呼叫的是同一個計數器，所以一段網路不穩就夠了。安全防護把 classifier 自己的請求拒掉那種才不記，這點文件寫明了。

「對話太長就先壓縮，不要整批擋掉」看起來正好治這個，但它在 301 的執行檔裡就能跑，旗標和那幾句訊息字串兩版一模一樣，302 改的是遠端那個值。

## 對你的流程有什麼影響

1. 排程那支不要寫 `--permission-mode auto`。文件給 CI 的是 `dontAsk` 配白名單：

   ```bash
   claude -p "$PROMPT" --permission-mode dontAsk \
     --allowedTools 'Read,Grep,Bash(pnpm test)'
   ```

   這條路上沒有 classifier，計數器根本不會開始跑。

2. 非要 auto 就同時給 `--permission-prompt-tool`。文件那句話的前提是「沒有這個旗標」，有了就有東西可以退回去。但那支工具得真的會回答，掛一支不答的等於沒掛。

3. 不要再找調門檻的辦法。`{maxConsecutive:3,maxTotal:20}` 是寫死的字面值，執行檔裡沒有任何環境變數讀它，文件也寫 not configurable。

4. `-p` 裡有在用 subagent 的，日誌去抓 `Agent aborted:`。昨天那篇叫你把 `CLAUDE_CODE_FORK_SUBAGENT` 的值寫定，而 302 又把桌面版和 VS Code 的 subagent 一律改成背景跑。疊起來就是 subagent 可以死在連續擋下上，而外層的 exit code 還是 0。

5. 別為了那條壓縮去關 `CLAUDE_CODE_AUTO_MODE_SERVER`。設 0 是不問伺服器、一律用本機的 classifier 請求（官方文件），而那條壓縮講的是伺服器那一路。

6. 壓縮那條本身不用管。預設開著，旗標 301 就在，你這邊不用動設定。

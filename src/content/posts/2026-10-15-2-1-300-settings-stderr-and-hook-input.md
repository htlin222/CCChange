---
title: "2.1.299／2.1.300：settings 壞掉 claude -p 終於會講，hook 多塞的欄位開始被丟掉"
description: "停了五天，兩版在一天之內連上。這篇講設定檔驗證失敗的那行 stderr、hook 改寫 tool input 的新規矩，以及閒置壓縮為什麼跟你的排程無關。"
published: 2026-10-15
category: "Changelog"
tags: ["claude-code", "changelog", "settings", "hooks", "compaction"]
annotation: "設定檔錯一個型別，整份不載入，hook 和權限規則跟著消失，而 exit code 還是 0。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.299 | 10-14 00:23 UTC 上 npm，距這篇 24.0 小時，190 條 |
| 2.1.300 | 10-14 14:27 UTC，距這篇 9.9 小時，88 條 |
| `stable` | 從 2.1.287 推到 2.1.292 |
| 設定檔驗證 | 載不起來的檔案和壞掉的那一欄，`claude -p` 會印在 stderr（本機實測：2.1.296 從頭到尾不吭聲，299 起會印） |
| hook `updatedInput` | 工具 schema 不認得的鍵會被丟掉（本機實測：296 和 299 原樣送進工具，300 丟掉並在 debug log 記一行） |
| 閒置壓縮 | changelog 寫 Added，但 `tengu_idle_compact` 旗標和那整串字在 2.1.296 的執行檔裡就有了，299 開的是遠端開關 |
| `CLAUDE_CODE_DISABLE_FILE_MENTIONS` | `@` 只把路徑交給 Claude，內容讓它自己用 Read 去拿（本機實測：296 的執行檔找不到這個變數） |
| `CLAUDE_CODE_STRICT_INLINE_SHELL_RM_PROMPT` | 把 10-03 寫過的 inline `rm` 判定要回嚴格版，預設已經改成不問 |

兩版加起來 278 條，剩下的跟你沒關係：VS Code 十幾條、Claude Tag 的 Slack Connect、self-hosted runner、mods 的 `virtualText` 和 `prompt.change`、OpenTelemetry 的 GenAI 屬性命名。

## 為什麼要改

設定檔驗證一直是全有全無。一個欄位型別寫錯，整份檔案不載入，裡面的 hook 和權限規則一起消失。麻煩在於 `claude -p` 以前什麼都不說。[settings 文件](https://code.claude.com/docs/en/settings)寫了優先序和每個鍵的型別，但沒有哪一頁會在你打錯的時候提醒你。299 起訊息長這樣：

> These settings files did not load, so nothing in them is in effect, including hooks and permission rules.

（本機實測：同一份 `permissions.allow` 寫成字串的 `.claude/settings.json`，餵給 296、299、300 各跑一次。296 只印出 `ok`。）

hook 那條是把 `updatedInput` 當成 Claude 自己送的 tool input 來驗。以前 hook 回什麼就原樣塞進工具，工具收到不認得的鍵，也只能自己忍著。

閒置壓縮的理由在 [idleCompaction](https://code.claude.com/docs/en/settings-reference#idlecompaction)：一小時的 prompt cache 過期之後，你回來打的下一句會把整段對話重算一次，它趕在到期前先壓掉。條件寫得很死，互動終端機、一小時 TTL、拿得到 feature flag、閒置約 54 分鐘，四個都要。

## 對你的流程有什麼影響

1. 先拿新版對現有設定跑一次，看 stderr 有沒有東西掉出來：

   ```bash
   claude -p 'reply with ok' --max-turns 1 2>&1 1>/dev/null
   ```

   沒輸出就是都載進去了。

2. 這行訊息不動 exit code，三個版本都是 0，排程那支不會因此紅掉。要擋得自己抓：

   ```bash
   claude -p "$PROMPT" 2>err.log
   if grep -q 'did not load' err.log; then cat err.log; exit 1; fi
   ```

   別寫成 `grep -q … && { … }`。grep 沒抓到東西那行就回傳 1，擺在 `run:` 區塊最後一行，設定明明是好的也會把 step 判成失敗（本機實測，bash）。

3. 排程的 `claude -p` 不用管閒置壓縮，它只在互動終端機開（官方文件）。

4. 互動 session 要不要調門檻，看你跑哪個模型。預設 200000，而 200K 窗的模型在摸到這個數字之前就先自動壓縮掉了，等於永遠不觸發（官方文件）。想讓它真的動，門檻降到 150000；低於 100000 會被抬回 100000。不想要就 `"idleCompaction": false`，290 以上都吃。

5. 有 PreToolUse hook 在回 `updatedInput` 的，去把多餘的鍵清掉。我拿一支多塞 `bogus_key_xyz` 的 hook 試過，300 的 debug log 寫 `dropped 1 key(s) that the tool's schema does not know`，終端機上一聲不響。鍵掉了而且沒人通知你，比直接擋下來難查。

6. inline `rm` 的預設鬆掉了。10-03 那篇講 2.1.288 把 `bash -c` 裡的 `rm` 補進檢查，現在讀不到的腳本裡執行期才組出來的那種不再問。要問回來得設 `CLAUDE_CODE_STRICT_INLINE_SHELL_RM_PROMPT=1`。排程那支我會設：沒人在旁邊按同意，問等於擋，而我寧可它擋掉。

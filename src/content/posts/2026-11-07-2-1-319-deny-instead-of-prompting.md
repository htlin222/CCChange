---
title: "2.1.319：denyInsteadOfPrompting 把等不到人回答的權限提示直接拒掉"
description: "319 把 -p 專屬的 --permission-prompts none 搬進 settings。它只讀 user settings，而且跟 auto mode 的 classifier fallback 撞在一起會把自己鎖死。"
published: 2026-11-07
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "settings", "auto-mode"]
annotation: "它只會拒，不會放。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.319 | 11-06 00:58 UTC 上 npm，到現在 23 小時。`latest`、`next` 指它，`stable` 還是 2.1.311 |
| `permissions.denyInsteadOfPrompting` | 會卡在權限提示的呼叫當場拒掉，告訴模型，turn 接著跑（318 的二進位裡 0 次，319 有 18 次）|
| 讀取來源 | 只讀 user settings、`--settings`、managed settings。專案和 local settings 被忽略，任一處 `true` 就算開 |
| 它的邊界 | 只拒不放。allow 規則、權限模式、auto mode classifier、`PermissionRequest` hook 都還是先決定 |
| 被收走的工具 | `AskUserQuestion` 和 plan mode 的工具不會給模型，MCP elicitation 直接取消，除非有 Elicitation hook 接 |
| `canUseTool` / `--permission-prompt-tool` | 開了之後不會被問到。要放行只剩 `PermissionRequest` hook |
| CHANGELOG 沒寫的 | 連續二十次被拒之後 turn 會被收掉，不是一路「接著跑」（本機二進位比對）|
| auto mode | telemetry 或 feature flag 關掉時，server 檢查不到的呼叫改成問你或拒掉，不再退回內建 classifier |
| 兩個一起開 | classifier fallback 的確認通知沒人能回，需要 classifier 的呼叫會一路被拒，直到你把設定關掉 |
| `claude -p` | auto mode 下因為沒有安全檢查而被拒，現在 exit 1，之前是 0 |
| 權限繞過 | 修了三個：環境變數前綴藏指令、`sed` 在 accept-edits 和 auto mode 下跳過檢查、建 worktree 時逃出 sandbox |
| 文件 | `denyInsteadOfPrompting` 在 settings、permission-modes、headless 三頁都查不到 |

整份 CHANGELOG 146 條，上面之外大半是 gateway、VS Code 和 Claude Tag 的修補，你不用管。`/context` 也不再把整張視覺格子每輪送給模型，這筆 token 不用設定就省下來了。

## 為什麼要改

這件事之前只有 `-p` 做得到。[headless 那頁](https://code.claude.com/docs/en/headless#turn-off-permission-prompts-in-unattended-runs)寫得很白：

> Pass `--permission-prompts none` when nobody is available to answer permission prompts, for example in a scheduled job.

麻煩在它是 CLI flag。cloud session 直接拒收，理由寫在二進位裡：`turning permission prompts off is not supported for a cloud session yet; they reach the host over stdio`。終端機開著但人走掉的那種 session 走不到這條路，被排程叫起來的 teammate 也走不到。剩下的選擇是 `bypassPermissions`，等於把檢查整個拔掉。

319 把同一件事搬進 settings，並且只給它拒的權力。規則和 hook 照常先決定，它只做一件事：把「沒人能回答」從等待改成拒絕。

`permission-modes` 那頁在 11-06 22:09 UTC 動過，比 319 上 npm 晚了二十一小時，裡面還是沒有這個鍵。它的鄰居 `blockWritesOutsideWorkingDirectories` 和 `disableAutoMode` 都在。

## 對你的流程有什麼影響

1. 要開就寫 `~/.claude/settings.json`。寫進 repo 的 `.claude/settings.json` 不會生效，這個鍵只從 user settings、`--settings` 和 managed settings 讀（本機二進位比對）：

```json
{ "permissions": { "denyInsteadOfPrompting": true } }
```

2. 開之前先把 `PermissionRequest` hook 接好。開了以後 `canUseTool` 和 `--permission-prompt-tool` 都不會被問到，hook 是唯一還能放行的地方。

3. 別讓它跟 auto mode 的 classifier fallback 撞上。二進位裡的字是：

```
Auto mode fell back to billed classifier requests, which need a person's
acknowledgement. Calls that need the classifier are denied until
permissions.denyInsteadOfPrompting is off and the notice is answered.
```

你在 gateway 後面或者設了 `DISABLE_TELEMETRY`，319 不再退回內建 classifier，而那張確認通知又因為這個設定而沒人能回。啟動時給 `CLAUDE_CODE_AUTO_MODE_SERVER=0`，不要指望通知會被答掉。

4. 我自己不會在手上這台互動的終端機開它。它是給沒人看著的跑法設計的，開在你面前，表面上只是少被問幾次，實際上連續二十次之後 turn 會自己斷，而畫面上看不出原因。排程那份開就好。

5. CI 裡 `claude -p --permission-mode auto` 的 exit code 要重看一遍。沒有安全檢查可用而被拒的那種失敗，319 之後 exit 1。靠 exit 0 判斷成功的腳本會開始紅，這種紅本來就該紅，去改判斷而不是去關它。

6. 今天就升：`npm i -g @anthropic-ai/claude-code@2.1.319`。環境變數前綴能把一段指令藏過檢查，`sed` 在 accept-edits 和 auto mode 下能跳過檢查，建 worktree 的時候能逃出 sandbox。三個都在 319 修掉。

7. `CLAUDE_CODE_DISABLE_MCP_TASK_BACKGROUND`、`CLAUDE_CODE_DISABLE_MCP_TASKS`、`CLAUDE_CODE_LOOP_KEEPALIVE` 這三個 CHANGELOG 寫 Added，318 的二進位裡字串數卻一樣（4、9、3）。開關早就在，319 翻的是預設值。要留舊的 `/loop` 行為就設 `CLAUDE_CODE_LOOP_KEEPALIVE=1`。

8. `.claude/skills` 不用管。sandbox 開著時，起始目錄以下的 skill 要從那裡啟動或 `/cd` 過去才會載；你的 skill 在 repo 根目錄，從根目錄起 `claude` 就還是載得到。

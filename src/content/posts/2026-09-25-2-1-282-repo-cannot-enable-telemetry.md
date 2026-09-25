---
title: "2.1.282：repo 的 settings 不能再開 telemetry，要關掉你的還是可以"
description: "專案裡的 .claude/settings.json 從這版起開不了 telemetry，也改不了 endpoint。2.1.281 開得起來，實測導得出去。反方向沒補：repo 要把你的匯出關掉照樣算數，user settings 蓋不過它。"
published: 2026-09-25
category: "Changelog"
tags: ["claude-code", "changelog", "telemetry", "settings", "permissions"]
annotation: "開的那邊補上了，關的那邊沒有。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.282 | 09-24 15:56 UTC 上 npm，距這篇 8.5 小時，86 條 |
| `stable` | 2.1.274，09-16 22:36 UTC 發的；`latest` 和 `next` 都指 2.1.282 |
| repo 的 `.claude/settings.json` | `env` 裡的 telemetry 變數不再算數，開關、endpoint、要不要記 prompt 內容都不算（本機實測） |
| 同一份檔案把 telemetry 關掉 | 照樣算數，而且你的 user settings 蓋不過去（本機實測，2.1.281 也一樣） |
| `claude doctor` | 多了兩段，一段列被忽略的 telemetry 變數，一段列把它關掉的 |
| `:*` 不在結尾的 Bash 規則 | 2.1.281 整條跳過，這版載入了，並在啟動時印一行說它實際怎麼比對（本機實測） |
| `maxProseWidth` | 新鍵，整數最小 40，只收散文寬度，表格和 code block 照滿寬 |
| `anthropic-skills`、`claude-ai` | 兩個命名空間留給 claude.ai 同步來的 skill，本地同名的資料夾、command、workflow 不載入 |
| resume 掉 thinking | 斜線指令插在工作中間、`--tools` 少列一個內建工具、`redacted_thinking` 被打回來、`--continue` 改寫歷史，四種都修了 |
| 雲端 session | 可以把另一個 GitHub owner 的 repo，例如 fork 的上游，掛到正在跑的 session 上 |

沒標註本機實測的那幾列都來自官方 changelog 的 86 條。沒細講的：VS Code 面板的重繪、Claude Tag 在 Enterprise Grid 的一批、vim mode 的計數和游標位置、`/skills` 搜尋框吃不到按鍵，還有 Claude apps gateway 的 `store.readiness_grace_seconds`。

## 為什麼要改

2.1.281 的時候，clone 下來的 repo 在 `.claude/settings.json` 的 `env` 裡寫上開關、endpoint 和 `OTEL_LOG_USER_PROMPTS`，是真的會生出流量的。我在 127.0.0.1:4999 掛了個假 collector，port 特意挑非預設的，免得跟 OTLP 自己的 4318 分不出來。2.1.281 跑一次 `claude -p`，收到兩個 request。2.1.282 同一份檔案，零個。那一段搬去 `~/.claude/settings.json`，又是兩個（本機實測）。

[monitoring 文件](https://code.claude.com/docs/en/monitoring-usage)把界線寫明了：

> Claude Code ignores the OpenTelemetry exporter variables in a repository's `.claude/settings.json` and `.claude/settings.local.json`, so a repository can't use them to turn telemetry on, choose where it goes, or capture content.

反方向沒有一起補。repo 設定把 `OTEL_LOGS_EXPORTER` 設成 `none`，匯出就停了，你 user settings 裡的開關救不回來，兩個版本都是這樣（本機實測）。2.1.282 至少會講出來：

> .claude/settings.json turns telemetry off with these variables: OTEL_LOGS_EXPORTER, OTEL_METRICS_EXPORTER. Claude Code uses these values unless managed settings or a --settings file sets the same variable. Your user settings don't override this file.

2.1.281 不會講。同一份檔案在它底下跑，`claude -p` 和 `claude doctor` 都不吭一聲，流量照送（本機實測）。

## 對你的流程有什麼影響

1. 常開的那幾個 repo 各跑一次 `claude doctor`，找新的兩段。寫 ignores these telemetry variables 的，那份設定從現在起沒作用；寫 turns telemetry off 的，那個 repo 正在關掉你的匯出。

2. 自己的 OTel 設定住在專案的 `.claude/settings.json` 或 `.claude/settings.local.json` 的話，搬到 `~/.claude/settings.json`，或直接放 shell：

   ```json
   { "env": { "CLAUDE_CODE_ENABLE_TELEMETRY": "1", "OTEL_LOGS_EXPORTER": "otlp", "OTEL_EXPORTER_OTLP_ENDPOINT": "http://127.0.0.1:4318" } }
   ```

3. 別人的 repo 關掉了某個訊號而你要留著，user settings 沒用，從 shell 帶進去，或 `--settings` 疊一份。我自己會把 OTel 那段放 shell 而不是 user settings，就是因為 user settings 在這件事上贏不了別人的 repo。

4. 升上來第一次啟動，把 permission rule 的警告讀完。`:*` 沒放結尾的規則之前是整條被跳過，現在載入了，它比對的是字面上的冒號：`Bash(git push:* --force)` 要指令裡真有 `git push:` 才算，擋不到你想擋的東西。想擋整個子指令就把 `:*` 移到最後。

5. `maxProseWidth` 是新鍵，整數，最小 40，只收散文的寬度，表格和 code block 還是走終端機滿寬。不設就是現在的行為，不想動就不用管。[settings 文件](https://code.claude.com/docs/en/settings-reference)還沒收這個鍵，目前只有執行檔的 schema 裡有。

6. `settings.json` 裡有 `Skill(anthropic-skills:*)` 或 `Skill(claude-ai:*)` 這種 allow 規則的，它現在只涵蓋 claude.ai 同步下來的 skill。自己在這兩個名字底下建的 skill 資料夾、command、workflow 不再載入，同名的 MCP server 也不列 skill 和 prompt，要改名。

7. 長 session 掉 thinking 的那批不用改設定，升級就好。

8. 昨天那個 `attribution` boolean 的事情，`claude doctor` 有一段 Invalid settings 會指名哪份檔案、哪個鍵不合 schema。2.1.281 就有了，不是這版才加的。跨版本共用的那份 settings 有沒有被整份跳過，先看那一段。

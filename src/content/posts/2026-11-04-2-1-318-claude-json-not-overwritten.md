---
title: "2.1.318：壞掉的 ~/.claude.json 不再被蓋成預設值"
description: "2.1.318 昨晚上 npm，直接拿下 latest。最值得知道的一條：非互動啟動碰到壞掉的 ~/.claude.json，317 會把它蓋成預設值，318 留著不動。settings.json 那半沒修。"
published: 2026-11-04
category: "Changelog"
tags: ["claude-code", "changelog", "config", "headless", "release-channel"]
annotation: "exit 1 比檔案被換掉好。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.318 | 11-03 21:55 UTC 上 npm，`latest` 和 `next` 現在都指它 |
| 2.1.317 | 沒單獨掛過 `latest`，昨天只在 `next`，今天被 318 蓋過去 |
| `stable` | 從 2.1.309 推到 2.1.311 |
| 壞掉的 `~/.claude.json` | 317 的 `claude -p` 會把它蓋成預設值，318 原封不動並印出修法（本機實測）|
| `claude auth status` | 多一個 `loginExpiresAt`，317 沒這欄（本機實測）；CLI 文件還沒寫 |
| `claude -p` 的 JSON | schema 多 `credential_expires_at`，是 optional，沒登入資料時整欄不出現（本機實測）|
| 登入到期前 10 天 | `claude -p` 的 stderr 多一行警告，點名 `claude setup-token` |
| `--continue` | 修掉 2.1.314 起的回歸：工具呼叫重試用完後會接不回前面的對話 |
| 壞掉的 `settings.json` | 兩版一字不差，exit 0、照跑完，hooks 和權限規則全不生效（本機實測）|
| 其餘 | 84 條裡 41 條是 Fixed，大半落在網路家目錄、gateway、自架 runner 和雲端 session |

## 為什麼要改

CHANGELOG 這條後面掛了一個 issue 編號：

> Fixed non-interactive launches replacing a `~/.claude.json` that isn't valid JSON with defaults; the start now fails, says how to restore the file, and leaves it as is (anthropics/claude-code#87551)

舊的壞法是這樣。檔案爛掉，`claude -p` 把爛的那份複製進 `~/.claude/backups/`，接著在原地寫一份乾淨的預設值。你的 `mcpServers`、信任過的目錄、裡面所有東西都還在，只是不在原來的位置了，而終端機給你的只有一段 corrupted 字樣。這類回報不是新的，2.1.59 和 2.1.198 那個年代都有人開過，[抱怨的點一直是 user-scope 的 MCP server 無聲消失](https://claudeissues.com/issue/73590-claude-json-corrupts-repeatedly-on-windows-silently-wiping-user-scope-mcpservers)（社群）。

318 把這段換掉了。我給兩個版本各配一份壞掉的 `~/.claude.json`，跑同一句 `claude -p`：317 跑完，檔案裡剩下 `migrationVersion` 那串預設值；318 跑完，還是我原本塞進去的爛 JSON，多一句「Fix the JSON in …, or move the file aside to start with default settings」。兩版都 exit 1，差別只在檔案活不活。

`loginExpiresAt` 是順手加的。[CLI 文件的 `claude auth status` 那段](https://code.claude.com/docs/en/cli-reference)目前只列到 `configDirectory` 和 `authMethod`，這欄還沒補上去（官方文件）。

## 對你的流程有什麼影響

1. 通道不用動。`latest` 已經是 318，auto-update 自己會帶你過去，昨天叫你守在 316 的理由今天沒了。

2. 先翻備份目錄，看自己有沒有已經中過一次：

```bash
ls -1 ~/.claude/backups/ | grep corrupted
```

   有印出東西，那一次就是舊版把你的 `~/.claude.json` 換成了預設值。檔名裡的 epoch 時間戳是當時那份，`mcpServers` 得自己從裡面撈回來。318 之後不會再有新的。

3. CI 跑 `claude -p` 之前加一道 `settings.json` 的檢查。318 修的是 `~/.claude.json`，`settings.json` 這半沒動，我實測兩版行為完全一樣：JSON 壞掉時它不會被改寫，但 `claude -p` 會 exit 0、把整個 turn 跑完，你的 hooks 和權限規則一條都沒生效，只有 stderr 有一行字說它沒載到。這種綠燈比直接紅掉難查。

```bash
jq empty ~/.claude/settings.json || exit 1
```

4. 別拿 `credential_expires_at` 當 gate。它在 schema 裡是 optional，我這邊的憑證不是 claude.ai 的存檔登入，`--output-format json` 的結果裡整個欄位不出現，`claude auth status` 的 `loginExpiresAt` 也是 `null`。null 不是「沒到期」，是它答不出來。真要擋到期，照那行警告說的走 `claude setup-token`。

5. 腳本裡有 `--continue` 的，等升上 318 再跑。2.1.314 到 2.1.317 之間，工具呼叫重試用完的那種 turn 會讓它接不回前面的對話。

6. 剩下那八十幾條不用管。網路家目錄、gateway、自架 runner 和雲端 session 的重連邏輯佔掉大半，單機一個人用碰不到。

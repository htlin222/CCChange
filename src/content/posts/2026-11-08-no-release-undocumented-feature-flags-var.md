---
title: "沒有新版：2.1.319 的錯誤訊息開始叫一個文件裡不存在的環境變數"
description: "319 把 DISABLE_GROWTHBOOK 改名成 CLAUDE_CODE_DISABLE_FEATURE_FLAGS，錯誤訊息跟著改，文件六頁都沒跟上。另外新增一條警告，告訴你家目錄裡有兩份 config。"
published: 2026-11-08
category: "Changelog"
tags: ["claude-code", "changelog", "env-vars", "config", "mcp"]
annotation: "名字換了，文件沒換。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 沒有新版 | 2.1.319 從 11-06 00:58 UTC 之後沒動，到現在 47 小時。`latest` 和 `next` 還是它，`stable` 停在 2.1.311，已經 12 天 |
| `CLAUDE_CODE_DISABLE_FEATURE_FLAGS` | `DISABLE_GROWTHBOOK` 的新名字，319 才有，兩個都還認（本機二進位比對）|
| auto mode 的拒絕理由 | 318 寫死 `DISABLE_GROWTHBOOK`，319 改成印你實際設的那個，兩個都沒設就印新名字 |
| 文件 | env-vars、settings-reference、claude-directory、errors、debug-your-config、mcp 六頁都查不到新名字，舊名字在 env-vars 有 |
| 兩份 config 的警告 | 家目錄同時有 `~/.claude.json` 和 `~/.claude/.config.json` 時，stderr 說哪份在用、哪份被忽略。318 沒有這條警告（本機二進位比對）|
| 背景 MCP task | 319 多了兩句話：追不到但還在查、已經放棄查所以結果不知道。`CLAUDE_CODE_DISABLE_MCP_TASKS` 文件也查不到，只有 `..._TASK_BACKGROUND` 有 |

`.config.json` 是 `~/.claude.json` 之前的檔名。整個 319 其他部分昨天寫完了。

## 為什麼要改

GrowthBook 是那個變數名字的來源，一家 feature flag 服務商。叫使用者去設一個以供應商命名的變數本來就怪，319 給了它一個講得通的名字。程式碼和錯誤訊息都換了，[env-vars 那頁](https://code.claude.com/docs/en/env-vars#features-that-need-feature-flag-fetching)還是只認舊的：

> Set to `1` or `true` to disable feature-flag fetching and use code defaults for every flag.

兩份 config 的事比較實際。你在 dev container 裡跑一份、在 host 上跑一份，兩邊共用同一個家目錄。各自挑了不同的檔案，然後互相覆蓋。318 以前不講，你看到的只是設定莫名其妙變回去。

## 對你的流程有什麼影響

1. 腳本和 `env` block 裡繼續寫 `DISABLE_GROWTHBOOK`。新名字能用，但文件上不存在，半年後你或別人要查它在幹什麼會查不到。

2. auto mode 拒掉一個動作、理由裡出現 `CLAUDE_CODE_DISABLE_FEATURE_FLAGS` 的時候，別去翻文件。那句話是在說這個 session 沒有抓 flag，原因可能是 `DISABLE_TELEMETRY`、`DO_NOT_TRACK`、`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`、舊名字，或是你在 gateway、Bedrock、Vertex 後面。它只是印了預設的那個名字。

3. 現在跑一次，看有沒有兩份 config：

```bash
ls -la ~/.claude.json ~/.claude/.config.json 2>&1
```

兩個都在的話，319 起來的時候 stderr 會講。清的順序是它自己寫的，不要跳步：

```
To end this: if several hosts share this home, first get every host to version
2.1.319 or later, since an older one can write a moved .config.json back. Then
stop your Claude processes on every host, move aside the one you do not want,
and start none until no host lists it.
```

順序反過來做會白做。318 以下的 host 會把你搬走的那份寫回來。

4. CI 和排程裡有 MCP tool call 的，別假設結果一定回得來。319 新增的那兩句就是在講追不到的情況，而且它只告訴模型「結果不知道」。腳本如果要靠 MCP 的回傳值決定下一步，超時得自己管。

5. `stable` channel 已經 12 天沒動，停在 2.1.311。跟你共用一份 `settings.json` 的人如果走 stable，`permissions.denyInsteadOfPrompting` 在對方那裡是個無效鍵，上面這些也都還沒有。要嘛請對方換 `latest`，要嘛那份設定別寫進共用的檔案。

6. 我不會為了名字好看就把現有設定換成新鍵。這種改名通常兩個名字都會留很久，而文件什麼時候跟上沒人知道。等它出現在 env-vars 那頁再換。

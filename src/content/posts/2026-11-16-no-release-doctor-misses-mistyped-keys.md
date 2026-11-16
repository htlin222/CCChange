---
title: "沒有新版：2.1.325 會講設定值填錯，key 名字打錯它不講"
description: "52 小時沒有新版。325 把 teammateMode 的錯值加進 claude doctor 會唸的清單，我拿 2.1.311 餵同一份設定對照過。但 key 的名字打錯，doctor、claude -p、編輯器的 schema 三邊沒有一個會吭聲。"
published: 2026-11-16
category: "Changelog"
tags: ["claude-code", "changelog", "settings", "permissions", "doctor"]
annotation: "型別填錯會被抓出來，名字打錯不會。規則就這樣消失了，而 Invalid settings 那一區看起來很乾淨。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 沒有新版 | 11-16 00:07 UTC 查，`latest` 還是 2.1.325，離上架 52 小時 |
| `stable` | 還在 2.1.311，10-26 19:47 UTC 上架的，到今天 20 天 |
| CHANGELOG | 最上面還是 2.1.325 那段 |
| `claude doctor` 的 Invalid settings | 325 會列 `teammateMode` 的錯值，同一份設定餵給 2.1.311 不會列。這一區本身兩版都有 |
| 型別填錯 | 抓得到。`cleanupPeriodDays` 該給數字給了字串，`hooks` 該給物件給了字串，都被列出來 |
| key 名字打錯 | 查無此事。`permission`、`hook`、`permissions.allowed` 在 doctor 和 `claude -p` 都不會被提到 |
| schemastore 那份 schema | 最上層是 `additionalProperties: true`，`permissions`、`hooks`、`sandbox`、`worktree` 這些巢狀物件是 `false` |
| 這個 repo 的 `.claude/settings.json` | 對過 schema 的 key 清單，沒有多餘的 |

## 為什麼要改

325 那條寫的是 `teammateMode` 填了不認得的值會被列成跳過的項目。這條補得對，之前它就是安靜地被丟掉。拿 2.1.311 餵同一份設定，doctor 只抱怨 `permissions.defaultMode`，`teammateMode: "banana"` 連一行都沒有。

會咬人的不是這條。[設定文件](https://code.claude.com/docs/en/settings)講壞設定的那一段，主詞從頭到尾都是值：

> If you mistype JSON or set a key to a value Claude Code doesn't accept, Claude Code tells you at the start of an interactive session.

Settings Warning 那條舉的例子是格式不對的權限規則，還有不認得的 hook 事件名。key 自己的名字打錯不在這段的守備範圍，文件也沒說它在。

編輯器也接不住。文件建議在設定裡放 `$schema`，說它給你自動完成和即時驗證，還提醒 schema 可能落後於 CLI，所以跳出警告不一定代表你寫錯。它擔心的是誤報。真正會漏的是另一邊：那份 schema 最上層寫 `additionalProperties: true`，142 個 key 以外你多寫什麼它都照收。巢狀物件倒是關起來了，所以 `allow` 寫成 `allowed` 編輯器會畫紅線，`permissions` 寫成 `permission` 不會。

所以最上層的 key 名字打錯，doctor 不會列，`claude -p` 不會印，編輯器也不畫線。那條規則從來沒生效過，而 Invalid settings 那一區照樣是乾淨的，跟設定真的沒問題的時候長得一樣。

## 對你的流程有什麼影響

1. 這個 repo 不用動。`.claude/settings.json` 只有 `$schema`、`permissions.allow`、`permissions.deny` 三個 key，我跟 schema 的清單對過了。
2. 本機那幾份自己跑一次：

   ```bash
   curl -sSL https://json.schemastore.org/claude-code-settings.json \
   | python3 -c '
   import json,sys
   valid=set(json.load(sys.stdin)["properties"])
   for k in json.load(open(sys.argv[1])):
       if k not in valid: print("unknown:", k)
   ' ~/.claude/settings.json
   ```

   `~/.claude/settings.json` 跑完換 `.claude/settings.local.json` 再跑一次。
3. 懷疑某個 key 的名字對不對，別去翻文件，用型別探針快得多。把它的值換成一個明顯錯的型別，例如字串 `"x"`，然後跑 `claude doctor`。它抱怨型別，名字就是對的；完全沒反應，這個 key 不存在。我試過 `permissions`、`hooks`、`env` 都會抱怨，`permission`、`hook`、`enve` 全程安靜。
4. `$schema` 那行留著。它接得住巢狀那一層的錯字，而那層本來就比較容易打錯。
5. CI 裡的 `claude -p` 會把跳過的項目印在輸出前面，開頭是 `These settings entries were skipped`。要擋就在那條流程裡 grep 這句，但它只蓋型別和列舉值，名字打錯 grep 不到。
6. 別拿 Invalid settings 乾淨當成設定沒問題，它只回答值對不對。
7. `stable` 第 20 天停在 2.1.311。要 zstd 那條安全修正就不能待在這個 tag 上。

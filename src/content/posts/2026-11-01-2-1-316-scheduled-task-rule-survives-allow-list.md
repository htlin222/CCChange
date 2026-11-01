---
title: "2.1.316：自訂的 `autoMode.allow` 不再蓋掉排程任務規則，Opus 4.8 的 fast mode 有死線了"
description: "昨天我說 315 多出來的 Scheduled-Task Fires 規則官方還沒解釋。316 解釋了，而且順手修掉它被自訂 allow list 刷掉的那條路。另外 Opus 4.8 的 fast mode 11 月 30 日移除，但 Claude Code 的文件還當它好好的。"
published: 2026-11-01
category: "Changelog"
tags: ["claude-code", "changelog", "auto-mode", "scheduled-tasks", "fast-mode", "subagents"]
annotation: "到期那天開始，終端機就不會再提醒你它到期了。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.316 | 10-31 00:42 UTC 上 npm，`latest` 和 `next` 現在都指它，55 條 |
| 2.1.315 | 沒有自己的 CHANGELOG 段落，從 314 直接跳到 316 |
| `stable` | 從 2.1.308 推到 2.1.309，落後七版 |
| 排程任務規則 | `autoMode.allow` 沒寫 `$defaults` 的時候，不再把內建那條排程任務規則一起刷掉 |
| 這段是新程式 | 剪掉樣板的 `<user_allow_rules_to_replace>` 區塊，再從剩下的文字裡撈開頭是 `- Scheduled-Task Fires:` 的那一行補回去（執行檔比對 0→2）|
| 撈不到的時候 | 不擋，記一行警告說清單「goes to the platform without it」，然後照送（執行檔比對）|
| 反方向也修了 | managed 的 `autoMode.allow` 不該拿回內建例外，之前 host app 的 `--settings`、`/permissions` 加的第一條規則、`/auto-mode-setup` 三條路都會打回來 |
| 雲端排程任務 | auto mode 因為伺服器沒回安全判定而停掉一輪時，現在會標成失敗 |
| `claude -p` | 背景 agent 還在跑的時候，現在會說出 auto mode 為什麼停 |
| Opus 4.8 的 fast mode | 10-30 起 deprecated，11-30 移除。之後帶 `speed: "fast"` 直接報錯，不退回標準速度 |
| 日期是遠端給的 | 執行檔裡寫 `tengu_sunset_penguin_opus48`，預設值 `2026-11-30`，遠端可以改（執行檔比對）|
| 提示自己會消失 | 程式是 `Date.now()>=o` 就不顯示，到期那天起你不會再被提醒（執行檔比對）|
| 這段 314 就有 | 字串和日期邏輯一個字沒差，316 的 changelog 是補公告不是補程式（執行檔比對）|
| `CLAUDE_CODE_SUBAGENT_EFFORT` | 新變數。指定 subagent 沒人指定 effort 時的預設值，不再繼承 session。吃 low / medium / high / xhigh / max（執行檔比對 0→7）|
| `CLAUDE_CODE_DISABLE_ULTRATHINK` | 新變數。底層的遠端開關 `tengu_turtle_carbon` 314 就在了，316 加的是本機這一道（執行檔比對）|
| 兩個都沒有文件 | `env-vars` 和 `settings-reference` 兩頁都搜不到 |
| `SHELLOPTS` | 有 export 的時候，Bash tool 起的 script 跑完第一行就停。修了 |
| 離場留下的 process | 憑證被拒、雲端 session 被封存這類自己退出的情況，會留 shell 指令在跑。修了 |
| `--restricted` | Read allow 規則蓋到工作目錄外的檔案時會被上傳。修了 |
| 其餘 | gateway 的 pooled budget、Bedrock guardrail 輸入標籤、分層 policy、Slack、VSCode、自架 runner，都不用管 |
| 今天沒有本機實測 | 容器的 auto mode 擋掉執行下載來的二進位，只做得到字串表比對 |

## 為什麼要改

昨天 315 裡多出來的 `Scheduled-Task Fires`，我當時寫官方還沒說它會改變什麼。316 講完了。那是 auto mode 內建的一條規則，而在 316 以前，你自己寫的 `autoMode.allow` 只要沒帶 `$defaults`，整份內建規則就會被你的清單換掉，這條跟著消失。[settings-reference 的 `autoMode`](https://code.claude.com/docs/en/settings-reference) 只寫到 "Add your own allow and deny rules to the auto mode classifier"，沒提少寫 `$defaults` 的後果。

執行檔裡的補救方式有點土：把樣板的 allow 槽整塊剪掉，然後去剩下的文字裡找 `- Scheduled-Task Fires:` 開頭那一行，硬塞回去。塞不進去也不會擋你，它記一行警告，然後照送。

fast mode 是另一件事，麻煩在兩頁文件對不起來。[Claude Code 的 fast mode 頁](https://code.claude.com/docs/en/fast-mode)到今天還寫 "Fast mode is supported on Opus 5.5, Opus 5, and Opus 4.8"，連 Opus 4.8 的 $10/$50 都照列，整頁沒有一個字提到移除。你平常開的是這一頁。[platform 那一頁](https://platform.claude.com/docs/en/build-with-claude/fast-mode)掛了警告：

> Fast mode on Claude Opus 4.8 is deprecated and will be removed on November 30, 2026. After removal, requests to `claude-opus-4-8` with `speed: "fast"` will return an error.

## 對你的流程有什麼影響

1. 升版：

```bash
claude update   # 或 npm i -g @anthropic-ai/claude-code@2.1.316
```

2. 查全域設定有沒有自訂的 `autoMode`：

```bash
python3 -c "import json,os;print(json.load(open(os.path.expanduser('~/.claude/settings.json'))).get('autoMode'))"
```

   印 `None` 就跳過，這整段跟你無關。印出一份 `allow` 而裡面沒有 `"$defaults"`，那 315 到 316 之間每一次排程出刊，送去分類器的規則都少了排程任務那條。316 之後它會自己補回來，不必改設定檔。

3. `fastMode` 查一次就結案：

```bash
grep -n 'fastMode' ~/.claude/settings.json
```

   沒印東西就不用管。印出 `true` 而模型是 Opus 4.8 的話，11-30 之後請求會報錯，換 Opus 5.5。日期掛在遠端開關上，有可能提早。到期當天起終端機就不再提醒了，別等提示消失才發現。這個站的出刊是排程跑的，官方那頁自己就說 CI 用標準速度。

4. `CLAUDE_CODE_SUBAGENT_EFFORT` 要用的話，先確認你要的是它而不是 `CLAUDE_CODE_EFFORT_LEVEL`。它只在 subagent 自己沒指定 effort 的時候生效，後者是蓋掉所有人：

```bash
CLAUDE_CODE_SUBAGENT_EFFORT=low claude -p '...'
```

   我不會把它寫進 `settings.json` 的 `env`。沒有文件，而且 `low` 會套到所有沒指定的 subagent，包括偶爾被你叫去查東西那幾個。

5. `CLAUDE_CODE_DISABLE_ULTRATHINK` 不用管，你不會想關掉 ultrathink。它值得記的只有一件事：ultrathink 本來就掛在遠端開關上，Anthropic 不發版也能關掉它。ultraplan 當初就是這樣不見的。

6. 排程出刊過去幾次的綠燈不要全信。auto mode 停一輪而伺服器沒回安全判定的時候，316 以前那次 run 不會被標成失敗：

```bash
gh run list --workflow=ci.yml --limit 20
```

   有哪天沒出文章卻也沒有紅的，就是這個。

7. hook 或 `scripts/` 底下有 export `SHELLOPTS` 的腳本，之前 Bash tool 跑它只執行第一行。現在修好了，當初為了繞過它拆成好幾次呼叫的可以合回來。

8. 315 不用再等。它沒拿到 CHANGELOG 段落，316 直接蓋過去了。

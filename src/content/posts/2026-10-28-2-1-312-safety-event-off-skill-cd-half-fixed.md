---
title: "2.1.312：`safety_event` 撐了五天就關掉，per-directory skill 的 `cd` 只修了一半"
description: "10-21 加進來的 OTel 事件這版停送，執行檔裡一個 byte 都沒少，關的還是那個遠端開關。另一邊 Bash `cd` 之後找不到子目錄 skill 的毛病修了，但只修 `cd` 那半。"
published: 2026-10-28
category: "Changelog"
tags: ["claude-code", "changelog", "opentelemetry", "skills", "hooks", "claude-md"]
annotation: "10-22 寫「不保證下個月還開著」。答案是五天。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.312 | 10-27 18:36 UTC 上 npm，查的時候 5.5 小時 |
| `latest` / `next` | 2.1.312 |
| `stable` | 還是 2.1.308，現在落後四版 |
| repo 時間 | `api.github.com` 在這個容器還是 403，`pushed_at` 今天也拿不到 |
| 規模 | 39 條：Fixed 22、Changed 9、Added 4、Improved 4。沒掛平台標籤的 25 條 |
| `claude_code.safety_event` | 不送了。10-21 的 2.1.307 才剛加 |
| 那套東西還在 | 遠端開關 `tengu_snoopy_creek`，還有送出那一行和它的十五個欄位，兩版 byte 完全一樣（執行檔比對） |
| per-directory 和 `paths:` skill | Bash `cd` 進 git repo 深處之後找不到，這版修掉 |
| 這次是真的改程式 | skill registry 多一個 `deferredSkillDirs`，311 零處、312 兩處（執行檔比對） |
| Write 砸掉 CLAUDE.md | 子目錄的超大 CLAUDE.md、rules 檔、`@` 引入的檔，之前只看到開頭就整檔覆寫 |
| 那是觸發條件變了 | 「沒讀完」那組提示文字兩版數量一模一樣，沒有新句子（執行檔比對） |
| prompt / agent hook | 每個 session 最多同時 24 個，含 subagent；另外最多 12 個是逾時還排著的。`timeout` 小於 1 秒算 1 秒 |
| 名字不合法的 command | 之前會讓所有 command 都載不進來，`claude -p` 因此完全沒輸出 |
| 雲端 WebFetch | host 解不出來的時候會說可能不在允許的網域裡，並且點名該放行哪個 host |
| 但它只接 ENOTFOUND | 而且只在雲端。proxy 回 403 走的不是這條（執行檔比對） |
| `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` | 兩版都 3 處。鍵早就在，改的是 Bedrock / Vertex / Foundry / Mantle 上認不出的模型名吃哪一版系統提示（執行檔比對） |
| `CLAUDE_CODE_DISABLE_REFUSAL_FALLBACK` | 同上，也是 3 比 3。自動換模型的範圍擴到認不出的部署名 |
| 5 小時額度 | 文案從 session limit 改叫 5-hour limit（新 21 處、舊 2 處） |
| 社群討論 | 上架 5.5 小時，2.1.312 這個號碼還搜不到東西 |

剩下的多半在收尾：VS Code 登入之後整場抓不到 managed settings、resume 之後的第一句回覆下次再 resume 就不見了、PDF 頁面撞到舊 session 清理會 `pdftoppm failed`、vim mode 的 `d` `c` `y` 配大數字的 `gj` 會砍到不該砍的行。Claude Tag 四條、雲端 session 六條。

## 為什麼要改

[skills 文件](https://code.claude.com/docs/en/skills)講 `paths` 的那一行是這樣寫的：

> Patterns are relative to Claude's current working directory, and files outside that directory don't match.

同一頁說子目錄的 skill 要「第一次讀或編輯那裡的檔案」才會載進來。讀和編輯是指 Read 和 Edit，不包含 Bash。auto mode 的提示詞又反過來叫模型拿 `cat`、`sed -n`、`grep` 去替掉那幾個工具。兩邊湊在一起，子目錄的 skill 整場都不會出現。

[#93403](https://github.com/anthropics/claude-code/issues/93403) 從 9-10 開著到現在。回報的人在 `enms/backend/` 底下用 Bash 讀了一小時、還改過檔，那層的九個 skill 一個都沒載；補一次三行的 Read，九個全進來。另一個人去數過：只靠 Bash 和 Grep 碰到的 44 個資料夾，載入數是零；有 Read 或 Write 碰過的 19 個裡，13 個載進來了。觸發它的是工具名字，不是路徑。2.1.295 上 Bash `cd` 進去會被當成主工作目錄變更，那層的 CLAUDE.md 因此載到了，skill 還是沒有。

312 補的是 `cd` 這半邊。`cat` 和 `grep` 那半邊沒動，issue 也還開著。

`safety_event` 是另一種情況。它 10-21 才上，10-22 那篇寫它掛在 `tengu_snoopy_creek` 底下，今天預設開但不保證下個月還開著；結果撐了五天。changelog 這次的字是 stop sending，可是執行檔裡送出那一行和它的十五個欄位都還在。關掉它的是同一個遠端開關。

## 對你的流程有什麼影響

1. 10-22 之後真的去拉 safety_event 板的話，那條 stream 現在會安靜下來。先確認你有沒有在收：

```bash
grep -n 'OTEL' ~/.claude/settings.json
```

   沒印東西就跳到第 2 點。有的話，收端的接線別拆。`tengu_snoopy_creek` 怎麼關的就能怎麼開回來，程式碼一直都在。要看被擋掉的 tool call，先回去用 `claude_code.tool_decision`，代價是得自己濾掉 accept。

2. 確認你不在 `stable`。上面每一條都還沒進那個 tag：

```bash
npm view @anthropic-ai/claude-code dist-tags
```

3. 靠子目錄 skill 的專案，升上去只解決 `cd`。auto mode 底下照提示詞用 `cat` 和 `grep` 去碰那層目錄，skill 還是不會載。要它載就在那層開一次 Read，三行就夠。

4. 子目錄有大 CLAUDE.md 的先量一下：

```bash
find . -name 'CLAUDE.md' -not -path '*/node_modules/*' -exec wc -c {} +
```

   門檻官方沒寫，我不給數字。變的是 Write 不再默默整檔蓋掉，它會先要求讀完或改走 Edit。所以同一個 session 裡原本一次寫完的動作，現在要先吃掉整份檔案的 context。排程跑的腳本如果會重新產生某層的 CLAUDE.md，這一步會變貴。

5. hook 的 `timeout` 翻一遍，小於 1 秒的現在一律算 1 秒：

```bash
grep -n '"timeout"' ~/.claude/settings.json
```

   [hooks 文件](https://code.claude.com/docs/en/hooks)還停在舊規則，寫的是每個事件 12 個 prompt/agent hook 同時跑。新的算法是每個 session 24 個、外加 12 個逾時還排著的，文件沒跟上，別照那頁推自己會不會排到隊。

6. `~/.claude/commands/` 和專案的 `.claude/commands/` 掃一次檔名。有一個名字不合法，312 之前會讓所有 command 都載不進來，排程的 `claude -p` 就這樣安靜跑完又什麼都沒輸出。

7. 雲端那條新錯誤訊息別期待太多。它只接 ENOTFOUND，解不出 host 才會講網域允許清單。這個 session 查 `anthropics/claude-code` 的 `pushed_at`，拿到的是 proxy 回的 403，走的不是這條，訊息裡什麼都沒有（本機實測）。

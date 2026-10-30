---
title: "2.1.312：subagent 的 `autoCompactWindow` 終於壓得過環境變數，2.1.314 只上了 `next`"
description: "欄位 10-09 就加了，但只要你設過 CLAUDE_CODE_AUTO_COMPACT_WINDOW，它 18 天都不算。312 把這個補掉，文件兩頁還停在舊行為。另外 2.1.314 在查的當下剛上 npm，只掛 next。"
published: 2026-10-30
category: "Changelog"
tags: ["claude-code", "changelog", "subagents", "context-window", "autocompact"]
annotation: "你寫 200000，它在 180000 壓縮。那 20000 文件沒寫。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.314 | 10-30 00:12 UTC 上 npm 主套件、00:16 上 linux-x64，只掛在 `next` |
| `latest` | 還是 2.1.312，10-27 18:36 UTC 上架，查的時候 53.7 小時 |
| 2.1.313 | npm 上沒有，跳號 |
| CHANGELOG | 最上面還是 2.1.312，314 還沒有段落 |
| 314 不是空包版 | 跟 312 比，字串表多 19713 條、少 17636 條（執行檔比對） |
| `stable` | 2.1.308，7.8 天沒動，落後四版 |
| repo 時間 | `api.github.com` 在這個容器又是 403，`pushed_at` 今天也沒有 |
| 312 真正改掉的那條 | subagent frontmatter 的 `autoCompactWindow` 現在壓得過 `CLAUDE_CODE_AUTO_COMPACT_WINDOW`，而且只能往下壓 |
| 311 怎麼跑的 | env 設 900000、frontmatter 寫 200000，subagent 吃到 880000。欄位等於沒寫（本機實測） |
| 312 怎麼跑的 | 同樣輸入，subagent 180000、主 session 880000（本機實測） |
| 往上拉拉不動 | env 400000、frontmatter 900000，兩邊都是 380000（本機實測） |
| 沒設那個變數的人 | 311 和 312 一模一樣：主 980000、subagent 180000。這條碰不到你（本機實測） |
| 固定少 20000 | 寫 200000 在 180000 壓，寫 350000 在 330000 壓（本機實測） |
| 範圍外的值分兩路 | 走 `--agents` JSON 直接讓 session 起不來；寫在 agent 檔裡靜默忽略（本機實測） |
| 警告躺在哪 | `~/.claude/debug/latest`，不在終端機（本機實測） |
| 314 沒把它改回去 | 同一組輸入，subagent 還是 180000（本機實測） |

## 為什麼要改

[sub-agents 文件](https://code.claude.com/docs/en/sub-agents)那一行到現在還是這樣寫：

> If you set `CLAUDE_CODE_AUTO_COMPACT_WINDOW`, the subagent uses that variable's window instead and the field has no effect

[model-config 文件](https://code.claude.com/docs/en/model-config)也還是舊的，說變數「takes precedence over the command, the flag, and the `autoCompactWindow` setting」。兩頁描述的都是 311。

欄位是 2.1.296、10-09 加進來的。在那之後的 18 天裡，只要你設過那個變數，寫在 agent 檔裡的值就不算，而且它不會講。

這個洞是 [#83355](https://github.com/anthropics/claude-code/issues/83355) 踩出來的。回報的人 coordinator 吃 1M，subagent 釘在一個 372k 的模型上，壓縮門檻取的是 session 模型的視窗，比 subagent 的真實上限還高，所以它永遠不壓縮，一路長到上游回 400。他 20 天掉了 58 次 subagent run，有幾次跑超過一小時才死。他找到的 workaround 是把變數設成 100k，可是那是整個 process 的，coordinator 一起被壓到 100k。他也試過 frontmatter，當時沒用。

312 補的只是這兩個設定的優先順序。#83355 真正在抱怨的那件事沒有動：視窗取自 session 的模型，不是 subagent 自己的模型。issue 還開著。

## 對你的流程有什麼影響

1. 先確認這條碰不碰得到你：

```bash
env | grep CLAUDE_CODE_AUTO_COMPACT_WINDOW
grep -n 'AUTO_COMPACT_WINDOW' ~/.claude/settings.json
```

   兩邊都沒印東西就跳到第 4 點。你的 frontmatter 從 2.1.296 起一直在生效，312 沒改你這一路。

2. 有印東西的話，把 agent 檔裡的值全撈出來，這些數字升上 312 之後會第一次真的生效：

```bash
grep -rn 'autoCompactWindow' ~/.claude/agents/ .claude/agents/ 2>/dev/null
```

   之前寫 200000 卻一直吃 900000 的 subagent，現在會在 180000 壓縮。本來不壓縮的東西開始壓縮，長任務的 subagent 會在中途掉掉一段 context。覺得這個時機不對，現在就把那行刪掉。

3. 不要把壓縮點當成你寫的那個數字，它固定少 20000。這個差額文件沒寫，#83355 回報的人在舊版上量到的是 13000，所以也別寫進腳本。要知道當下的實際值就讀 log：

```bash
grep 'effectiveWindow' ~/.claude/debug/latest | tail -3
```

4. CI 裡用 `--agents` 餵 JSON 的話，範圍外的值會讓整個 session 起不來，不是靜默忽略：

```
Error: Invalid --agents configuration:
logreader.autoCompactWindow: Too small: expected number to be >=100000
```

   311 和 312 一樣會這樣死。寫在 `.claude/agents/*.md` 裡則相反，session 照跑，值被丟掉。同一個欄位兩種下場，排程那支如果是從檔案搬到 JSON，先跑一次確認起得來。

5. 要查值有沒有被丟掉，去翻檔案，不要看終端機：

```bash
grep 'invalid autoCompactWindow' ~/.claude/debug/latest
```

   文件叫你跑 `claude --debug` 然後搜這行字。那行字只進 `~/.claude/debug/latest`；`claude -p` 底下就算加上 `--debug --verbose`，終端機一個字都不印（本機實測）。

6. 不要為了 314 升版。它只掛在 `next`，CHANGELOG 沒有它的段落，官方還沒說裡面是什麼。它不是空包版，但你現在升等於替別人測。等它進 `latest`：

```bash
npm view @anthropic-ai/claude-code dist-tags
```

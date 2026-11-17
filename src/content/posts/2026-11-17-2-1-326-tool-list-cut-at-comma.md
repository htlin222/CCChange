---
title: "2.1.326：命令列的 --allowedTools 規則被切成兩半，現在至少會吭一聲"
description: "367 條的一版。真正會咬到自動化的是新增的開機檢查：--allowedTools、--disallowedTools、--tools 的項目看起來不是完整規則就印警告。這條警告在程式裡的 key 叫 cut-tool-list，而 --output-format json 的輸出裡撈不到它。"
published: 2026-11-17
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "cli", "automation"]
annotation: "規則在逗號那裡斷掉，半條照樣被收下，session 就用一份比你想的寬或窄的清單跑完。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.326 | 11-16 18:43 UTC 上架，我查的時候過了 5.5 小時。離 2.1.325 隔 70 小時 |
| 規模 | changelog 367 條，325 只有 139 條 |
| `--allowedTools` `--disallowedTools` `--tools` | 新增開機檢查，項目看起來不是一條完整規則就印一行警告 |
| 怎麼判的 | 兩種會被點名：解析不出規則的，還有帶逗號而且括號數量對不上的 |
| 警告長相 | 每個 flag 只點名第一個壞掉的，其餘收成 `This list has N more like it.`，訊息要你把整條搬進設定檔的 `permissions.allow` / `permissions.deny` |
| `--output-format json` | JSON 輸出裡沒有這條警告。`stream-json` 才會多送一則 `subtype: "notification"` |
| auto mode | 多一條訊息：分類器判不動、現場又沒人能問的呼叫直接不跑，還補一句這不是判定它不安全 |
| hook 的 `"decision": "block"` | 官方寫現在更多情況會生效，本來一直印 block 的 hook 可能開始真的擋下呼叫 |
| 其餘三百多條 | 畫面、捲動、輸入法、登入、MCP 的修補，跟排程出刊這條路無關 |

## 為什麼要改

[CLI reference](https://code.claude.com/docs/en/cli-reference) 給 `--allowedTools` 的範例是分開引號：

> `"Bash(git log *)" "Bash(git diff *)" "Read"`

同一張表裡 `--tools` 的範例卻是 `"Bash,Edit,Read"`。兩種寫法並存，而 GitHub Action 的 `claude_args` 只有一個字串欄位，大家就用逗號串。規則自己帶逗號的時候，清單在那裡斷掉，半條規則照樣被收下，沒有人會告訴你。

這條警告在程式裡的 key 叫 `cut-tool-list`。文件那邊今天還是兩種格式並陳，也沒說哪種規則不該放在命令列上。

## 對你的流程有什麼影響

1. 這個 repo 不用動。`.claude/settings.json` 25 條 allow、4 條 deny，沒有一條帶逗號，括號全部成對，而且規則都寫在設定檔裡，一條都沒從命令列進去。
2. 別處用 GitHub Action 或任何 `claude_args` 傳權限規則的，今天去看一眼。括號裡有逗號的整條搬進 `permissions.allow`，命令列只留純工具名。這件事跟升不升級無關，現在就該做。
3. 不要靠這條警告把關。排程跑的那支如果吃 `--output-format json`，JSON 裡撈不到它；要讓它進得了日誌，改 `stream-json`，接 `subtype: "notification"` 那種事件。
4. hooks 翻一遍，找無條件印 `"decision": "block"` 的 PreToolUse。以前被忽略的那些現在可能真的開始擋。我自己沒這種寫法，所以沒踩到，但它是這版少數會讓既有設定行為變掉的一條。
5. 升。前四件做完再升，順序別反過來。367 條大多是介面修補，會動到行為的是權限那幾條，而它們動的方向是變嚴：auto mode 判不動又沒人能問的呼叫現在直接不跑。排程那支第一次跑 326，看它有沒有在半路停掉。

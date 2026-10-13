---
title: "沒有新版：2.1.296 之前的 claude purge 會留下你以為刪掉的 prompt"
description: "latest 停在 2.1.296 七十九小時。這篇講 2.1.296 修掉的一條：prompt 裡有 U+2028，purge 不但刪不掉那筆，還會把它切成認不出來的殘骸留在 history.jsonl 裡。"
published: 2026-10-13
category: "Changelog"
tags: ["claude-code", "changelog", "privacy", "cli", "settings"]
annotation: "910 bytes 的 history.jsonl purge 完剩 462，prompt 原文一個字沒少，而 2.1.296 自己也認不出那些殘骸。"
---

## 改了什麼

沒有新版。`latest` 還是 2.1.296，npm 推送時間 2026-10-09 16:58 UTC，到寫這篇為止七十九小時，連續第四天沒動。

| 項目 | 現況 |
| --- | --- |
| `latest` | 2.1.296 |
| `stable` | 2.1.287，跟前兩天一樣 |

今天補 2.1.296 裡的這條，changelog 原文：

> Fixed `claude purge` leaving a prompt in the history file when its text held a Unicode line or paragraph separator (U+2028, U+2029)

拿四筆 prompt 的 `history.jsonl` 實測，其中兩筆分別含 U+2028 和 U+2029：

| 檢查 | 2.1.295 | 2.1.296 |
| --- | --- | --- |
| `purge --dry-run` 數到幾筆 | 2 | 4 |
| `purge -y` 跑完 | 910 bytes 剩 462，那兩筆的 prompt 原文完整留著 | 0 bytes |
| 留下來的 byte | 分隔字元被換成真換行，兩筆變四行，四行都不是合法 JSON | 無 |
| 對已經壞掉的檔案再 purge 一次 | 無 | 回 `No Claude Code project state found`，462 bytes 一個沒動 |

（本機實測，npm 抓 linux-x64 的 2.1.295 和 2.1.296 各跑一次。）

## 為什麼要改

`history.jsonl` 沒有別的出口。[claude-directory 文件](https://code.claude.com/docs/en/claude-directory#clear-local-data)把它列在「Kept until you delete them」那一節：

> Every prompt you've typed, with timestamp and project path.

同一列註明只有 HIPAA 設定生效的 session 才會按 `cleanupPeriodDays` 掃它，所以一般帳號的 prompt 歷史根本不會過期，`claude purge` 是唯一的刪除路徑。文件對這個檔案的保護也寫得很白：

> Transcripts and history are not encrypted at rest. OS file permissions are the only protection.

`JSON.stringify` 不轉義 U+2028 和 U+2029，Claude Code 寫出來的 `.jsonl` 就帶著那三個原始 byte（本機實測：含 U+2028 的 prompt 存進 transcript，`E2 80 A8` 原封不動，轉義過的版本零筆）。purge 不是從檔案中間挖掉一行，是整份讀進來、過濾完再寫回去，而 2.1.295 切行的時候把 U+2028 當換行用。一筆斷成兩半，兩半都不是合法 JSON，過濾器認不出是誰的，就原地留下了。

2.1.296 修的是比對那一端，它讀得到含分隔字元的 entry。前一版留下的殘骸它一樣認不出來，拿同一個檔案再跑只會說找不到這個專案的狀態。

## 對你的流程有什麼影響

1. 先看你的檔案有沒有被切過。別用 grep 找 U+2028，那個字元在重寫的時候就換成換行了，grep 不到。要找的是解不開的行：

   ```bash
   jq -R -n 'inputs | . as $l | try (fromjson|empty) catch ($l[0:60])' \
     ~/.claude/history.jsonl
   ```

   有輸出就是有。從來沒跑過 `claude purge` 的話應該是乾淨的。

2. 要清就只留合法的行。這個檔案有 lock，先把 session 都收掉，備份再動：

   ```bash
   cp ~/.claude/history.jsonl ~/.claude/history.jsonl.bak
   jq -R -c 'fromjson?' ~/.claude/history.jsonl.bak > ~/.claude/history.jsonl
   ```

   實測 682 bytes 的檔案清成 211，壞的四行全掉，好的那筆原樣留著。寫一半被中斷的行會一起丟，那種本來也救不回來。

3. 別把 `claude purge --all` 當清理工具。它確實會把 `history.jsonl` 整個刪掉，官方文件這樣寫，實測也是如此，但那是連所有專案的 prompt 歷史一起丟。為了幾行殘骸付這個價不值得，用上面那個 jq。
4. 要讓某個 prompt 根本不落地，得在它寫進檔案之前就擋。`CLAUDE_CODE_SKIP_PROMPT_HISTORY` 一設，transcript 和 prompt 歷史都不寫，代價是 `--resume` 和 Rewind 跟著沒了。我只在要貼 token 的那個 shell 裡臨時 export，不寫進 `settings.json`。這個變數 2.1.295 就有，不是這版新加的。
5. `cleanupPeriodDays` 不要拿來當 prompt 歷史的保險。調到 1、跑過 `claude doctor` 和 `claude -p`，`history.jsonl` 一個 byte 沒少（本機實測）。它管的是 transcript。
6. `CLAUDE_CODE_TRANSCRIPT_LOCAL_GC` 那條同根因的修正不用管，預設關著。

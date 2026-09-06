---
title: "沒有新版：stable 頻道卡在 2.1.236 第十七天，今天點得出它缺什麼"
description: "latest 是 2.1.261，三十小時沒動，週末而已。要看的是 stable，官方下載端點回的還是 08-19 那顆，跟文件寫的落後一週差了兩倍多。"
published: 2026-09-06
category: "Changelog"
tags: ["claude-code", "changelog", "release-channel", "permissions", "settings"]
annotation: "文件說 stable 大概落後一週。今天量到十七天。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 新版 | 沒有。latest 還是 2.1.261，09-04 17:49 UTC 發的，距這篇 30 小時 |
| `stable` 頻道 | `downloads.claude.ai/claude-code-releases/stable` 現在回 2.1.236，08-19 18:45 UTC 發的 |
| 兩邊的距離 | 十七天，二十五個版本 |
| 2.1.236 裡沒有的 | 2.1.260 那個「含括號的檔案規則被當無效丟掉」的修正（本機實測） |
| 也沒有的 | `--permission-prompts none`，以及 2.1.259 之後長出來的那批 `managedMcpServers` |

08-31 那篇提過 stable 沒動，當時是十一天十三版。今天換個做法，直接把它缺的東西挖出來。

## 為什麼要改

三十小時的空窗不用解讀。上一個週五發完到週一才有下一版，中間隔了 73.6 小時，這次還在同一個節奏裡。

要看的是另一邊。[setup 頁](https://code.claude.com/docs/en/setup)講 stable 是「typically about one week old, skipping releases with major regressions」，落後大約一週，跳過有重大回歸的版本。今天量到十七天。

十七天不是「跳過一個壞版本」的落後量，是整條線沒動過。2.1.259 那個把 `Read()` deny 規則套到 Bash 參數上、隔天就被 2.1.260 整條退掉的改動，stable 上的人確實沒碰到。可是同一天進來的修正也一起沒拿到。2.1.260 修的是路徑含括號的 `Edit`／`Write`／`Read` 規則以前會被當無效整條丟掉；我在 2.1.236 的二進位裡找那段修正留下的字串，掛零，2.1.260 裡有兩個（本機實測）。stable 上你宣告成唯讀的資料夾現在還是可寫，沒有錯誤也沒有警告。

## 對你的流程有什麼影響

1. 先確認自己在哪條線上：

   ```bash
   claude --version
   grep -n 'autoUpdatesChannel\|minimumVersion' ~/.claude/settings.json
   ```

   沒設過就是 latest，跳到第 3 點。Homebrew 靠 cask 名字分，`claude-code` 走 stable，`claude-code@latest` 走 latest；apt 和 dnf 看當初寫進 sources 的是哪一段路徑。

2. 真的在 stable 上的話，翻一下全域設定有沒有路徑帶括號的檔案規則。有的話那條在 2.1.236 上是無效的，你以為鎖住的目錄可寫。要嘛把括號從規則裡拿掉重寫，要嘛 `autoUpdatesChannel` 換回 `"latest"`。我會選後者，落後十七天不值得拿去換跳過一次 revert。

3. `env` 裡設過 `BASH_MAX_OUTPUT_LENGTH` 的話記一下順序：2.1.261 的 `bashOutputMaxChars` 有值就用它，沒有才去讀環境變數（本機實測）。預設 30000，可調範圍 4000 到 128000；`taskOutputMaxChars` 預設 32000。這兩個鍵到今天還是查不到[文件](https://code.claude.com/docs/en/settings)。

4. `--append-subagent-system-prompt-file` 不在 `claude --help` 的清單裡，但二進位裡是完整的（本機實測）。之前把整段 subagent prompt 塞在命令列的，現在可以改成指一個檔案。help 沒列不代表沒有。

5. 有腳本或 hook 在跑 `sh -c "rm -rf $SOMETHING/..."` 這種形狀的，趁早跑一遍。2.1.261 在「變數可能是空的」那條檢查旁邊補了雙引號解跳脫和反引號兩組 regex（本機實測），原本躲得掉的寫法現在會跳確認，而這條確認不吃 permission 規則。在 `--permission-prompts none` 底下就是直接被拒。

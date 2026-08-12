---
title: "2.1.228：Write 不用先讀就能覆蓋，claude.ai 同步的技能被關進單獨一層"
description: "十八條，多數是修補。兩條會動到你的預期：Write 對新模型解掉了「沒讀過就不准覆蓋」，官方 tools reference 那一段現在是錯的；claude.ai 同步下來的技能變成獨立來源，不再蓋掉本機同名指令。"
published: 2026-08-12
category: "Changelog"
tags: ["claude-code", "changelog", "skills", "tools", "memory"]
annotation: "文件還寫著 A Write to an unread existing file fails with an error，執行檔裡已經不是了。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 版本 | 2.1.228，npm 08-11 17:45 UTC 發，`latest` 和 `next` 都指它 |
| `Write` | 新模型覆蓋沒讀過的舊檔不再直接失敗，改吃 Edit 那套判定；舊模型照舊要先讀 |
| claude.ai 同步技能 | 獨立成一層來源，不再蓋掉本機同名指令和 MCP prompt，描述會被消毒並標上出處 |
| auto memory | session 清理會刪掉 `~/.claude/projects/<project>/memory/` 裡的檔案，這版修掉 |
| 跨 session 訊息 | 裝完或升級後的第一個 session 有時候沒有 inbox |
| Remote Control | 連線中 `/resume`，被 resume 那段對話的標題和歷史會漏進當前 session |
| marketplace 設定 | 高優先層重新定義的 entry 會繼承別層的 custom headers，改成整筆合併 |
| `stable` tag | 昨天還停在 2.1.220，今天推到 2.1.221 |

另外九條裝上去就有，不用做什麼：plugin cache 清理誤刪 symlink 開發版、Vertex AI 憑證過期改成幾秒內失敗、self-hosted runner 兩條、TUI 整個停止重繪、Windows 上找不到 git、`/tui` 把模型倒退回上一個、deferred tools 提示重複送、compaction 的倒數和卡住提示，還有終端標題那顆會抖的 spinner。auto 模式比較貴的舊提示也拿掉了。

## 為什麼要改

Write 這條是把 Edit 的規則抄過來。[官方 tools reference](https://code.claude.com/docs/en/tools-reference) 對 Edit 講得很明確：Opus 4.6、Haiku 4.5 和更舊的一定要先讀，新模型在「讀這個檔不會跳權限提示、而且 Read 工具在」的前提下可以直接動沒讀過的檔。Write 一直沒跟上，於是同一個檔 Edit 得動、Write 不得動。

227 和 228 兩份執行檔我都拉下來比過。227 裡只有一個做這個判定的函式，帶 `model` 參數，掛在 Edit 上；228 多了一個走 Write 路徑的，呼叫同一個模型判定，還順手帶上 Edit 那條「檔案在磁碟上變過、但內容對得上就放行」的放寬（本機實測）。

同一份文件的 Write 段落現在對不上程式了，還寫著：

> If the target path already exists, Claude must have read that file at least once in the current conversation before overwriting it. A Write to an unread existing file fails with an error.

技能那條方向相反，是在收。claude.ai 上啟用的技能會同步到 `~/.claude/skills/synced/`，之前跟你自己寫的技能同一個池子，撞名就蓋掉。228 把它獨立成一層（`syncedSkills`），這個字串在 227 的執行檔裡一次都沒有，228 有七十幾次（本機實測）。同一層還多了一句提示，說同步下來的技能刪本機資料夾沒用，下次同步會抓回來。

## 對你的流程有什麼影響

1. 升上去，`latest` 和 `next` 同一版。
2. Write 不用改設定，要改的是預期。Claude 現在可能直接覆蓋一個它這回合沒讀過的檔，「反正它得先讀」這道保險沒了。真的不想讓它動的檔，寫進 `permissions.deny`。
3. 檢查 auto memory 有沒有被刪過：

   ```bash
   ls -la ~/.claude/projects/*/memory/
   ```

   `MEMORY.md` 不見或 topic 檔少了一截，就是 227 之前那個清理踩到的。刪掉的救不回來，升上 228 之後不會再發生。
4. 有在同步 claude.ai 技能的，跑一次 `/skills` 對一下 `~/.claude/skills/synced/`。以前被同步版蓋掉的本機同名指令，這版會冒回來，先確認冒回來的是你要的那個。
5. 要移掉某個同步技能就去 claude.ai 關掉，別刪本機資料夾。
6. 跨 session 訊息你八號才接上。升完開的第一個 session 先確認 inbox 在，這版修的就是頭一次啟動沒 inbox。
7. `stable` 現在指 2.1.221，離 `latest` 還差七版。腳本裡 pin `stable` 的改成 `latest`，不然這篇講的一條都拿不到。
8. marketplace 在多層 settings 重複定義的，確認 headers 沒有串到別層去。只有一層的不用管。

---

*版本與發佈時間、`dist-tags` 取自 npm registry。Edit 的 read-before-edit 規則與 Write 段落的原文引自 code.claude.com（官方文件）。227 與 228 的讀取判定函式差異、`syncedSkills` 字串計數，來自本次下載的兩份 linux-x64 執行檔比對（本機實測）。auto memory 誤刪那條沒能從字串比對上確認，只有官方 changelog 說法。這個 session 的 egress policy 擋掉 api.github.com，repo 的 `pushed_at` 沒取到。*

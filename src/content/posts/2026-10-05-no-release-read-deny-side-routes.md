---
title: "沒有新版：2.1.289 那條 symlink 修正補的不是 Read 工具，是 @-mention 那四條側路"
description: "latest 停在 2.1.289 二十八小時。今天驗昨天那條 symlink 修正到底動了哪裡：Read 工具的比對兩版逐字相同，真正補起來的是 @-mention、IDE 開檔、IDE 選取、改動檔案重讀這四條從來不問 deny rule 的路。"
published: 2026-10-05
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "security"]
annotation: "CVE 在 2.1.7 結案，四條側路開到 2.1.289。"
---

## 改了什麼

沒有新版。`latest` 還是 2.1.289，10-03 20:12 UTC 上 npm，到現在 28.1 小時。

| 項目 | 現況 |
| --- | --- |
| `latest` | 2.1.289，沒動 |
| `stable` | 2.1.285，09-29 17:32 UTC 推的，落後四個版號 |
| `anthropics/claude-code` 的 `pushed_at` | 這個容器擋掉 `api.github.com`，一樣沒取到 |
| 昨天那條 symlink 修正動到哪 | 不是 Read 工具，是 `@檔名`、IDE 開檔、IDE 選取的那幾行、改動過的檔案自動重讀，這四條（本機實測） |
| Read 工具本身 | 兩版的 deny 比對迴圈逐字相同，2.1.288 就已經把 symlink 落點一起比對了（本機實測） |
| 開關 | `hasReadDenyRuleInForce`。settings 裡有任何一條 Read deny rule 才成立，裸的 `Read` 也算；一條都沒有就整段解析不跑（本機實測） |
| 解析不出來的時候 | 內容不送進 prompt，終端機不印東西（本機實測） |
| 四條路的差別 | 只有 @-mention 會留痕跡，model 看得到你提過這個檔名、標成 `unexamined`。另外三條整個不送（本機實測） |
| IDE 選取那條的時間上限 | 1000 ms，寫死的。另外三條吃 session 的 abort signal，沒有自己的上限（本機實測） |
| 放棄的門檻 | 同一個檔案最多認 32 種寫法，symlink 最多 40 跳（本機實測） |

## 為什麼要改

[permissions 文件](https://code.claude.com/docs/en/permissions)講 deny rule 碰到 symlink 的那段沒留餘地：

> **Deny rules**: apply when either the requested path or the file it resolves to matches. A symlink that points to a denied file is itself denied.

同一頁再往下，範圍才說清楚：deny rule 管的是 Claude's built-in file tools，加上 Bash 裡認得出來的 `cat`、`head`、`sed` 這些。`@檔名` 不在裡面。它不是工具呼叫，檔案內容是當 attachment 掛在你那則訊息上送出去的，沒經過 Read 的那道檢查。IDE 開檔、IDE 選取、改動檔案自動重讀也一樣。

這個洞本來就有案底。[CVE-2026-25724](https://github.com/advisories/GHSA-4q92-rfm6-2cqx) 寫的就是這件事：deny 掉某個檔案，Claude Code 還是能從指過去的 symlink 讀到。GitHub advisory 二月六號發的，評 Low、CVSS v4 2.3，結案版本寫 2.1.7（社群）。那次補的是 Read 工具那條，補得紮實，我把 2.1.288 和 2.1.289 的比對迴圈拉出來對過，一個字沒差。另外四條到 2.1.288 都還沒接上去。這次接的時候加了一道開關，settings 裡沒有 Read deny rule 就整段跳過，所以多數人升上去不會感覺到差別。

## 對你的流程有什麼影響

1. 先看開關在你那邊是開是關。一條 Read deny rule 都沒有的話，昨天那條修正對你就是零，連一次 `lstat` 都不會多跑：

   ```bash
   grep -n '"Read(' ~/.claude/settings.json ~/.claude/settings.local.json .claude/settings.json 2>/dev/null
   ```

   有東西出來，底下幾條才跟你有關。

2. 這個 repo 的 `.claude/settings.json` deny 了 `Read(./.env)` 和 `Read(./.env.*)`，所以開關在這裡是開的。從 2.1.289 起，在這個 repo 每打一個 `@`，Claude Code 會先把那條路徑的 symlink 走完，拿所有走得到的寫法逐一比對 deny rule，然後才決定送不送。

3. `@` 進去的檔案內容沒出現，先想 symlink，不要先想權限壞了。四條路裡只有 @-mention 留得下痕跡，model 知道你提過這個檔名但沒讀到。IDE 開檔、IDE 選取、改動檔案重讀這三條解析不出來就整個不送，你和 model 兩邊都收不到訊息。擋下來不講是對的，解析超時不講就只是在製造幻覺，這裡該印一行。

4. macOS 的 `/tmp` 和 `/var` 本來就是 symlink，worktree 和網路掛載也常常是。這些都還在 32 種寫法、40 跳的額度裡，不用管。真的會撞到上限的是指來指去的手工 symlink。

5. 在 IDE 選一段程式碼再問問題的那條路有 1 秒上限，設定裡沒有對應的鍵可以調。慢速掛載上的檔案光第一次 `lstat` 就可能吃掉大半，選取沒送到的話重選一次多半就過了。

6. deny rule 本身一個字都不用改，比對邏輯沒動過，動的是哪幾條路會去問它。去補 `Read(**/link*)` 這種規則白做工。

7. 別把 auto-update 釘回 `stable`。它停在 2.1.285，這條修正不在裡面。`claude doctor` 的 `Auto-update channel` 那行看得到自己現在在哪條線上。

8. 要的如果是真的擋住，還是得開 sandbox。Read deny rule 攔不住自己開檔案的子行程，文件自己寫了，一個 Python 腳本照樣讀得到。2.1.289 補的是 Claude Code 把檔案塞進 prompt 的那幾條路，不是作業系統層的邊界。

---
title: "2.1.289：四條 deny／ask rule 漏掉的情況，auto-allow 下 `TZ=... rm` 會過"
description: "27 條裡 20 條是 mod 畫面的 crash，剩下那幾條都是你寫的 deny rule 沒被叫到。Read deny rule 碰到 symlink 過來的 @-mention，在這版之前根本沒有這個檢查。"
published: 2026-10-04
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "sandbox", "plugins"]
annotation: "deny rule 一條都沒變，變的是誰算「指令本身」。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.289 | 10-03 20:12 UTC 上 npm，距這篇 4.1 小時，27 條：1 Added、23 Fixed、2 Improved、1 Reverted |
| env 前綴擋住 deny rule | sandbox auto-allow 放行指令時，`TZ="$HOME" rm -rf build` 這種寫法，deny／ask rule 看不到後面那個 `rm` |
| 裸的變數賦值在前 | 同上，賦值擺在指令前面，auto-allow 下規則直接被跳過 |
| compound command 的巢狀片段 | managed 機器上，user-installed mod 的 approval 蓋過 deny／ask rule |
| `Read` deny rule 走 symlink | @-mention、IDE 選取、改動過的檔案，經 symlink 時不走 Read deny rule（本機實測：2.1.288 的執行檔裡沒有這個檢查） |
| user-installed plugin | 之前改得動 org-managed MCP server 登入工具的 description |
| `$.ui.fault` | mod 的 Client 在畫的時候掛掉，現在只有它自己壞，並丟這個事件（本機實測：2.1.288 沒有） |
| `$.agent.spawn` | changelog 寫 Added，2.1.288 就有了，這版是開放給 teammates |
| VS Code `claude auth status` | 2.1.288 那個改動 revert 掉了，升上去之後常被登出的是它 |
| 升級後第一個 session | 裝好的 mods 不會載入，修掉了 |

剩下的是 mod 畫面壞掉的長尾：pane、band、Box 的 border style、tab 和 C1 控制字元畫到別人身上、`plugin validate` 兩條、`--plugin-dir` 的 hot reload。沒在寫 mod 的話整批不用管。

## 為什麼要改

[sandbox 文件](https://code.claude.com/docs/en/sandboxing)在 auto-allow 那節寫得很白：「Even in auto-allow mode, the following still apply: Explicit deny rules are always respected」。四條裡有兩條就是這句話沒做到。

兩個版本的執行檔拿來對過，判斷「這個指令安不安全」的那段一個字沒差。`rm`／`rmdir` 的 base 檢查、變數名安不安全的判斷，兩版一樣。差的是前一步，誰算「指令本身」。`TZ="$HOME" rm -rf build` 被認成一個叫 `TZ=...` 的東西，後面的 `rm` 根本沒走到檢查。昨天 `bash -c` 那條也是這樣。

Read 那條不一樣。2.1.288 的執行檔裡找不到對應的符號，所以不是檢查做錯，是整個檢查沒有。`Read(./.env)` 碰到 symlink 過去的 @-mention，在這版之前不是擋失敗，是從來沒被問過。

## 對你的流程有什麼影響

1. 先看 sandbox auto-allow 開著沒有。前兩條只在 auto-allow 放行指令的時候成立，`/sandbox` 的 Mode tab 或 settings 的 `sandbox` 區塊看得到。沒開就只有 Read 那條要管。

2. deny rule 不用改。寫法一條都沒問題，缺的是它有沒有被叫到，升版就解決。去補 `Bash(env:*)` 之類的規則是白做工。

3. 這個 repo 的 `.claude/settings.json` deny 了 `Read(./.env)` 和 `Read(./.env.*)`。出刊這條路不碰 `.env`，所以沒影響。全域那份的 deny Read 規則自己翻一下，有在用 symlink 的，那些規則到 2.1.289 才真的生效。

4. 同一份 settings 裡 `Bash(git push --force:*)` 和 `Bash(gh pr merge:*)` 也在 deny。auto-allow 開著的話，`GIT_DIR="$HOME/x" git push --force` 在 2.1.288 之前會過去。

5. 升完之後第一次開的那個 session，mods 現在會載進來了。你每天升一版，所以每天第一個 session 都沒有 mods，又不會跳任何提示，重開第二次才正常。

6. VS Code 裡被登出的頻率變高，是 2.1.288 的 `claude auth status` 造成的，289 revert 回去了。設定不用動。

7. 有 mod 在 call `$.agent.spawn` 的不用管它。changelog 寫 Added，那支 API 2.1.288 就在了，連「in-process teammates 不能 spawn 背景 agent」的擋法都一樣，這版是把它開給 teammates 用。

8. 全域 allow list 有 `Bash(find:*)` 的，升完會多幾次 prompt。`-exec`、`-delete` 這類本來就不吃 prefix rule（[permissions 文件](https://code.claude.com/docs/en/permissions)寫了），289 又多擋一種：不同版本的 find 讀法不同的那些 option，會被當成後面可能藏著 action。這條不在 changelog 裡。

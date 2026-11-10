---
title: "2.1.321：Fable 5.2 接手預設，cp 用絕對路徑寫檔不受管的洞補掉"
description: "321 有兩件要動手的事：存起來的 Fable 5.1 選擇會自己搬到 5.2，還有 /bin/cp 這種寫法在 319 完全跳過寫入路徑檢查。"
published: 2026-11-10
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "models", "settings"]
annotation: "補的是路徑檢查那一層，不是 Bash 規則。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.321 | 11-09 19:02 UTC 上 npm，到現在 5 小時。`latest`、`next` 指它，`stable` 還是 2.1.311 |
| Claude Fable 5.2 | `claude-fable-5-2`，接手 Fable 預設。1M context、$8/$40 per Mtok、cache read $0.20 |
| 存起來的 5.1 選擇 | Pro 和 Max 直接搬成 `fable`，Team 和 Enterprise 要等組織放行 |
| `cp` / `mv` 的路徑檢查 | 寫檔目標的 deny 規則和受保護檔案提示，319 只認 `cp`，`/bin/cp` 整條路放過（本機二進位比對）|
| 寫進目錄的那個檔 | `cp x dir/` 真正寫出來的路徑，之前不受 deny 規則和受保護檔案提示管 |
| 唯讀指令 | 有一種情況會不問就跑在 sandbox 外面 |
| Bash 的權限檢查 | 有一種情況是拿錯的資料夾去判斷一個寫入，結果沒問 |
| mods 的權限 | Claude 自己寫的 mods 在 auto 和 bypass 模式不問就開，它的 `$.tool.call` 不走你的 ask 規則 |
| MCP OAuth | server 轉址時 refresh token 之類的祕密會被送到別的 host |
| 帳號 email 檢查 | 現在只擋同時含你 email 又指定 User-Agent 的指令，排程跑的其他指令不再停在提示上 |
| `claude -p` 背景指令 | 之前跟模型說有 30 分鐘，實際 10 分鐘就收掉 |

剩下一百多條大多碰不到你，像是 UNC 和 WSL 路徑上的 `Edit` 和 `NotebookEdit`、Windows 的 PATH 查找、gateway 的花費上限訊息、`/config` 的權限模式預設標籤。

## 為什麼要改

寫檔目標那層檢查的做法，是把指令名前面的目錄砍掉，再拿去查一個集合。2.1.319 的集合裡只有 `rm`、`rmdir`、`tee`，所以 `/bin/cp` 砍成 `cp` 之後查不到，被判成「不是受路徑限制的指令」，整條路放行。321 的集合多了 `cp` 和 `mv` 兩個字，另外把 `cp.exe` 和大小寫不同的寫法也認進來。

只補到路徑檢查這一層。[官方權限文件](https://code.claude.com/docs/en/permissions)的立場沒有變：Bash 規則比的是 Claude 寫出來的那串文字，不是程式本身，`Bash(rm *)` 擋得住 `rm -rf build/`，擋不住 `/bin/rm -rf build/`。文件自己寫 isn't a security boundary around the program。

Fable 5.2 是正常換代。[官方模型頁](https://platform.claude.com/docs/en/models/overview)列 1M context、$8/$40 per Mtok、預設 effort `high`，5.1 掛進 legacy 那排。

mods 的豁免是另一回事。那是 Claude 寫給自己介面用的東西，每個 tool call 都問一次等於不能用，於是整條路不問，你的 ask 規則在那裡就不生效了。

## 對你的流程有什麼影響

1. 先看 `/model` 存的是什麼。之前釘 `claude-fable-5-1` 的話它已經變成 `fable`，也就是 5.2。要留在 5.1 就 `/model claude-fable-5-1`，它沒下架，只是進 legacy。
2. 升上去，不用等 `stable`。這版有四條權限相關的修，方向都是往緊的走，321 之前的版本都在鬆的那邊。
3. 你那幾條保護 `.env` 和 credentials 的 deny 規則，在 321 之前用 `/bin/cp` 或 `cp x dir/` 寫過去是擋不住的。要不要回頭看有沒有真的被寫過，看你這幾週讓它跑了什麼。
4. 真的要擋就別只靠 deny 規則。照文件改成 sandboxing，或寫一條 PreToolUse hook 自己讀整串指令文字。deny 規則擋的是 Claude 平常會寫出來的那個寫法。
5. 跑 auto 或 bypass 模式的話，Claude 寫的 mods 會不問就開，managed `allowUnsandboxedCommands: false` 也擋不住。不要就跑 `dontAsk` 模式，那裡不載 mods。deny 規則在所有模式都還管得到。
6. 排程那條線順一點了。帳號 email 的檢查以前會把帶著 email 的指令停在提示上，沒人回答就卡住，現在只擋同時指定 User-Agent 的那種。
7. `claude -p` 背景指令那條不用管，十分鐘沒變，只是之前跟模型說錯。

---
title: "2.1.314 進 `latest`：`blockWritesOutsideWorkingDirectories` 會連設定檔一起鎖"
description: "昨天叫你等的那一版現在是 latest，119 條裡只有一個鍵跟你有關。它擋的不只是工作目錄外面，開了之後 Claude 也改不動你的 settings.json，而這件事 changelog 沒寫。"
published: 2026-10-31
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "settings", "working-directories"]
annotation: "開了這個鍵，Claude 就改不動你的 settings.json。文件還沒有這個鍵。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.314 | 昨天只掛 `next`，現在是 `latest`，CHANGELOG 的段落也補上了 |
| 那個段落 | 119 條，其中 80 條 Fixed、6 條 Added |
| 唯一跟你有關的新鍵 | `permissions.blockWritesOutsideWorkingDirectories`：Write、Edit、NotebookEdit 在所有權限模式下拒絕工作目錄外的路徑 |
| 這是新程式 | 312 的執行檔裡沒有這個鍵，不是把舊開關露出來（執行檔比對） |
| 讀的那一邊 | `blockReadsOutsideWorkingDirectories` 2.1.257 就有了，文件寫得很完整 |
| 寫這邊的文件 | 沒有。`settings-reference` 和 `permissions` 兩頁都搜不到這個鍵 |
| changelog 沒寫的那條 | 開了之後設定檔本身也寫不進去，因為設定檔可以解除這個封鎖（執行檔比對） |
| `.json` 那條 | 管理設定目錄解不出來時，執行檔的訊息說「任何 `.json` 都算設定檔」（執行檔比對） |
| auto mode 不會提醒你 | 讀那邊第一次讀到工作目錄外會跳提示問你要不要封鎖，寫這邊沒有對應程式碼 |
| 2.1.315 | 10-30 21:05 UTC 上 npm，掛 `next`，CHANGELOG 沒有它的段落 |
| 315 值得記的一件事 | auto mode 的樣板多了一條 `Scheduled-Task Fires` 規則，312 和 314 都沒有（執行檔比對） |
| `stable` | 還是 2.1.308，落後六版 |
| 今天沒有本機實測 | 這個容器的 auto mode 擋掉執行下載來的二進位，只做得到字串表比對 |

## 為什麼要改

讀的那一邊九月就封起來了。[settings-reference 的 `blockReadsOutsideWorkingDirectories`](https://code.claude.com/docs/en/settings-reference#permissions-blockreadsoutsideworkingdirectories) 這樣寫：

> Make Claude's file tools refuse reads outside your working directories in every permission mode, including `bypassPermissions`.

寫的那一邊一直沒有這種東西。`bypassPermissions` 和 auto mode 底下，Write 和 Edit 碰到工作目錄外的路徑就照各自模式的規則走。想擋只能自己寫 `PreToolUse` hook，社群早就在做了，[dev.to 這篇](https://dev.to/fewparts/how-to-stop-a-claude-code-agent-writing-outside-a-directory-253p)連理由都寫了：`permissions.deny` 是黑名單，翻不成白名單，而專案根目錄這個邊界只管得住「別跑出專案」。

314 補的就是這個鍵。文件到現在沒有它。`settings-reference` 和 `permissions` 兩頁都搜不到，能看的只有 changelog 那一條和執行檔裡的錯誤訊息。changelog 寫到「在所有權限模式下拒絕工作目錄外的路徑」就停住，執行檔裡還有第二條：開著它的時候，設定檔本身也寫不進去，因為設定檔可以把這個封鎖解除掉。後面緊接一句，說管理設定目錄解不出來的時候，任何 `.json` 都算設定檔。

## 對你的流程有什麼影響

1. 升版。昨天叫你等的就是這個，它現在是 `latest`：

```bash
claude update   # 或 npm i -g @anthropic-ai/claude-code@2.1.314
```

2. 不要順手把 `blockWritesOutsideWorkingDirectories` 加進 `~/.claude/settings.json`。開了之後 Claude 改不動你的 `.claude/settings.json`，而你每週都在請它動那個檔裡的 hooks 和 permission rules，以後那些都得自己手改。我自己不開，那個檔我動得太頻繁。

3. 真要開，先在一個丟得掉的 repo 上確認 `.json` 那條的範圍。訊息字面上是「任何 `.json`」，沒說是不是只限解不出來的那個目錄底下，我今天沒辦法實測。你自己試一次就知道：

```bash
mkdir /tmp/wtest && cd /tmp/wtest && npm init -y
claude --settings '{"permissions":{"blockWritesOutsideWorkingDirectories":true}}' \
  -p '在 package.json 加一個 scripts.hello，印 hi'
```

   它改不動 `package.json` 的話，那句訊息講的就是字面意思，你每個 Node 專案都會踩到。

4. 讀那邊已經開了的話，兩邊可以一起開，出口是同一個 `/add-dir`：

```bash
grep -n 'blockReadsOutsideWorkingDirectories' ~/.claude/settings.json
```

   沒印東西就先開讀那邊。它有文件，auto mode 第一次讀到外面也會主動問你。

5. 寫這邊不要等 auto mode 提醒。它沒有這個流程，你不自己寫進設定檔就永遠不會開。

6. 排程那支今天先不要碰 315。它掛在 `next`、沒有 CHANGELOG 段落，而 auto mode 的樣板裡多了一條 `Scheduled-Task Fires` 規則。你的每日講義就是排程跑的，這條會不會改變它能做什麼，官方還沒說。等它進 `latest`：

```bash
npm view @anthropic-ai/claude-code dist-tags
```

7. CI 裡靠 `claude -p` 的 exit code 判斷成敗的話，314 有一條不用設定就生效：啟動失敗以前會給你 exit 0 和空輸出，現在印錯誤並 exit 1（官方 changelog）。當初為了遮這個行為加的 `|| true` 現在可以拿掉，不然你還是看不到錯誤。

---
title: "沒有新版：2.1.296 的 Edit 開始拒絕 Big5 檔，Write 那條路還開著"
description: "latest 停在 2.1.296 已經五十五小時。這篇補 10-10 漏掉的一條：Edit 碰到不是 UTF-8 的檔案，以前照寫而且回報成功，把中文全換成 U+FFFD。"
published: 2026-10-12
category: "Changelog"
tags: ["claude-code", "changelog", "encoding", "permissions", "tools"]
annotation: "2.1.295 那次 Edit 回的是 updated successfully。41 bytes 進去 63 bytes 出來，中文沒了。"
---

## 改了什麼

沒有新版。`latest` 還是 2.1.296，npm 推送時間 2026-10-09 16:58 UTC，到寫這篇為止五十五小時。週五傍晚推完就沒再動。

| 項目 | 現況 |
| --- | --- |
| `latest` | 2.1.296，距上次出刊沒動 |
| `stable` | 2.1.287，跟昨天一樣 |

今天補 2.1.296 裡 10-10 那篇漏掉的一條，changelog 原文：

> Fixed Edit and NotebookEdit replacing every non-ASCII character in files that are not valid UTF-8 (Windows-1252, Shift-JIS, GBK); such edits are now refused

Big5 沒列在括號裡，但它判的是這份 byte 能不能用 UTF-8 解開，不是比對編碼名單。拿 Big5 檔實測：

| 工具 | 2.1.295 | 2.1.296 |
| --- | --- | --- |
| Edit、NotebookEdit | 照寫，回 `updated successfully`，解不開的 byte 全變 U+FFFD | 拒絕，檔案一個 byte 沒動（新的 errorCode 15） |
| Write | 整份蓋掉，存成 UTF-8 | 只有待寫內容本身含 U+FFFD 才拒絕，乾淨的內容照蓋 |
| Read | 直接顯示 U+FFFD，沒有任何警告 | 一樣沒有警告 |
| UTF-16LE 帶 BOM | 無 | Edit 照做，寫回去仍然是 UTF-16LE，中文完好 |

（本機實測，npm 上抓 2.1.295 和 2.1.296 的 linux-x64 執行檔各跑過一次。）

## 為什麼要改

Edit 整份讀進來、字串替換、整份寫回去，而寫回去一律是 UTF-8。Big5 檔在讀進來那一步中文就已經是 U+FFFD 了，所以寫回去等於把原始 byte 清掉。我那個 41 bytes 的測試檔出來變 63 bytes，中文全沒了，還多出一個希伯來字母，因為 `匯` 的尾 byte 跟 `出` 的首 byte 湊成了一個合法的 UTF-8 序列。回報是成功。

這個洞社群報過很多次。[#7134](https://github.com/anthropics/claude-code/issues/7134) 講 Windows-1252，另外有 Shift-JIS 和 Latin-1 `.properties` 的版本。共同點是災情要等別的程式再讀那個檔才浮出來。

[tools-reference 的 Non-UTF-8 files](https://code.claude.com/docs/en/tools-reference#non-utf-8-files) 這次文件沒落後，連 Write 的例外都寫明了：

> Claude can still replace such a file with Write, unless the new content contains `U+FFFD`, the character Read shows Claude in place of bytes it can't decode.

Write 那道關卡是在待寫字串裡找 U+FFFD，不是看檔案編碼。模型要是自己把讀到的亂碼「修」成通順的中文再 Write，字串裡就沒有 U+FFFD，那份猜出來的內容會原封不動地蓋上去，檔案順便被轉成 UTF-8。Edit 和 NotebookEdit 這兩條路是關了，Write 沒有。

## 對你的流程有什麼影響

1. 先掃一遍手上的 repo 有哪些檔會踩到。`file --mime-encoding` 會把 Big5 猜成 `iso-8859-1`，拿來篩可以，名字不要信。要精準就直接用 Claude Code 判的那個條件：

   ```bash
   git ls-files -z | while IFS= read -r -d '' f; do
     iconv -f utf-8 -t utf-8 "$f" >/dev/null 2>&1 || echo "$f"
   done
   ```

   這個站的 repo 我掃過，一個都沒有，所以要動的是你另外那幾支。

2. 再掃舊災情。2.1.296 之前被 Edit 動過的 legacy 檔，當下回的是成功，所以你不會記得有這回事。U+FFFD 會留在檔案裡：

   ```bash
   grep -rl $'\uFFFD' .
   ```

   找到就從 git 歷史或 checkpoint 撈原始 byte 回來，不要手動把字補上去。

3. 以後看到 `File is not valid UTF-8` 不是 bug，不用回報。那種檔要改就讓它走 Bash，用 `iconv` 轉完再編、或原編碼改；想一次解決就把檔案轉成 UTF-8。
4. Write 這條路要自己擋，而且別寫成 `Write(...)`。[permissions 文件](https://code.claude.com/docs/en/permissions)說檔案路徑規則只認 `Edit(path)` 和 `Read(path)`，`Write(path)` 收下但永遠不會查，啟動時只給你一行警告。擋一整個目錄就寫 `"deny": ["Edit(/legacy/**)"]`，它連 Write 一起管。我只對確定是舊編碼的目錄下這條，全域擋掉 Edit 等於把正常的檔一起鎖死。
5. Windows 來的 UTF-16LE 帶 BOM 的檔不用管。實測 Edit 照改，寫回去還是 UTF-16LE。
6. 你自己的繁中 UTF-8 檔不用管。社群報過合法 CJK 被誤判成無效 UTF-8，2.1.296 上拿同一份內容的 UTF-8 版測過，Edit 正常。

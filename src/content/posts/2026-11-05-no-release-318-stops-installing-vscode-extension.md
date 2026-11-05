---
title: "沒有新版：2.1.318 不再從 IDE 終端機幫你裝 VS Code extension"
description: "2.1.318 上 npm 已經 50 小時，後面沒有東西跟上。補昨天沒寫到的那條：318 唯一的一條 Changed 把整合終端機裡的 extension 自動安裝關掉了，裝機順序因此反過來。"
published: 2026-11-05
category: "Changelog"
tags: ["claude-code", "changelog", "vscode", "ide", "setup"]
annotation: "先裝 extension，再跑 claude。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 今天 | 沒有新版。2.1.318 在 11-03 21:55 UTC 上 npm，到現在 50 小時 |
| 通道 | `latest` 和 `next` 都還指 2.1.318，`stable` 還是 2.1.311，跟昨天一樣 |
| 318 唯一一條 Changed | 在 IDE 終端機裡啟動，不再安裝或更新 IDE extension |
| 實際動到的那行 | 安裝分支多一個條件，IDE 必須是呼叫端指名的；從終端機偵測出來的那個不算（本機實測）|
| 317 | `TERM_PROGRAM=vscode` 之下跑起來就呼叫 `code --list-extensions --show-versions`，然後 `code --force --install-extension anthropic.claude-code`（本機實測）|
| 318 | 同一組環境變數、同一個假的 `code`，一次都沒被呼叫（本機實測）|
| JetBrains | 不受影響，兩版的 JetBrains 分支本來就只查有沒有裝，從來不會自己裝（本機實測）|
| 整合終端機裡的 `/ide` | 兩版一樣，安裝提示只在你不在 IDE 終端機時才出現，所以它補不了這個洞 |
| `autoInstallIdeExtension` | 現在只管外部終端機 `/ide` 那條路，文件的描述已經跟著改了 |

## 為什麼要改

舊的那條路是這樣：claude 在 VS Code 的整合終端機裡起來，認出父終端機是 VS Code，就去 `$PATH` 上找 `code`，跑一次 `--list-extensions --show-versions`，沒裝或是版號比打包的舊，就 `--force --install-extension` 下去。走得順的時候沒人會注意到它。壞的時候，你看到的是一條自己沒下過的指令，配一段指不到問題的錯誤訊息。這種回報一直都有，[2.1.76 這張](https://github.com/anthropics/claude-code/issues/34639)貼的就是 `ERR_STREAM_PREMATURE_CLOSE: code --force --install-extension anthropic.claude-code`（社群）；Windows 上 `code` 不在整合終端機的 `$PATH` 裡、dev container 裡裝不起來，也都是同一條路上的事。

[vs-code 那頁](https://code.claude.com/docs/en/vs-code)現在把新行為寫得很直：

> Starting `claude` doesn't install the extension. Without it, `/ide` in the integrated terminal reports "No available IDEs detected" and `/status` shows the IDE as "Not connected".

`/config` 裡那個 Auto-install IDE extension 開關只在 IDE 終端機裡出現，而它現在管的是外部終端機的 `/ide`。[settings 文件](https://code.claude.com/docs/en/settings-reference)那欄的描述也照這樣改了：Let `/ide` install the IDE extension from an external terminal。於是文件只好要你從整合終端機的 `/config` 去關一件只會在整合終端機外面發生的事。開關本身還是有效的，位置沒跟著搬。

## 對你的流程有什麼影響

1. 先把兩個版號對一次，318 之後 extension 不會再自己跟著 CLI 走：

```bash
code --list-extensions --show-versions | grep anthropic.claude-code
claude --version
```

   號碼一樣就不用動。extension 的版號跟著打包時的 CLI 版號，我在 317 上看到的那行就是 `installed extension v2.1.317`。

2. 裝新機器的順序反過來。先在 Extensions view 裝 `anthropic.claude-code`，再跑 `claude`。順序弄錯的話整合終端機裡的 `/ide` 回 No available IDEs detected、`/status` 寫 Not connected（官方文件），而沒有任何一行字會告訴你原因。

3. 整合終端機裡別再試 `/ide`。那條安裝提示兩版都卡在「不在 IDE 終端機」這個條件上。真要讓 CLI 動手，開一個 IDE 外面的終端機跑 `claude`，再 `/ide`。

4. devcontainer 跟遠端開發的 postCreate 腳本，如果本來是靠 claude 自己把 extension 帶起來的，那一步現在是空的。寫明白：

```json
{ "customizations": { "vscode": { "extensions": ["anthropic.claude-code"] } } }
```

5. `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL` 和 `autoInstallIdeExtension` 這兩個，如果當初是為了擋整合終端機那次安裝才設的，現在可以拿掉，留著也不會壞。順手記一下位置，`autoInstallIdeExtension` 在 `~/.claude.json` 的 global config，不在 `settings.json`（官方文件）。

6. 第一次裝好會跳的那個 Welcome to Claude Code for VS Code 畫面也一起沒了，317 有、318 沒有（本機實測）。不用管，只是別把沒看到它當成沒裝好。

---
title: "2.1.270：唯讀 git 指令開始跳確認，清單沒動過，壞的是查的時機"
description: "2.1.269 的 session 跑久了，git status 會突然要你按同意。判定唯讀的那張表兩版一個 byte 沒差，也沒有任何設定擋得住，只能升上去。"
published: 2026-09-13
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "bash", "git"]
annotation: "昨天按下去的那顆「不要再問」，會留在 settings.local.json 裡比 bug 活得久。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 唯讀 git 指令 | 2.1.269 的 session 跑久了，`git status`、`git log`、`git diff` 會開始跳權限確認，2.1.270 修掉 |
| 觸發時機 | 不是一開就壞。拿 2.1.269 開新 session 跑一次 `git status --short`，直接過，`permission_denials` 回空陣列 |
| 唯讀判定表 | 兩版執行檔裡 `git status` 的 safe flag 表和內建的 git 預先核可清單，比對下來一個 byte 沒差 |
| 設定 | 2.1.270 在權限這一段沒多出任何設定鍵、環境變數或事件名稱，沒有開關可以關掉它 |

這版就這一條。

## 為什麼要改

[權限文件](https://code.claude.com/docs/en/permissions#read-only-commands)講得很死。Claude Code 內建一組唯讀 Bash 指令，任何模式都不問就跑，裡面包含 read-only forms of `git`，然後接一句 The set is not configurable。你只能加 `ask` 或 `deny` 把它變嚴，沒有反方向的旋鈕。

所以這條沒有 workaround。它壞掉的時候你唯一能做的，是從另一邊補一條自己的 allow 規則。

麻煩就在確認框上那顆「Yes, and don't ask again」。文件寫得很清楚，按下去的規則會寫進 repo 根目錄的 `.claude/settings.local.json`，之後那個 repo 的每個 session 都吃得到。昨天你在哪個 repo 被問煩了按了它，`Bash(git status:*)` 就留在那個 repo 的 settings.local.json 裡，bug 修好也不會跟著消失。

## 對你的流程有什麼影響

1. 先升級。`claude update`，然後確認 `claude --version` 吐的是 2.1.270。唯讀清單不可設定，這件事沒有第二條路。
2. 掃一遍昨天動過的 repo：`find ~ -name settings.local.json -path '*/.claude/*' -exec grep -l 'Bash(git' {} +`。昨天為了止血加的刪掉，本來就想要的留著。
3. CCChange 不用管。這個 repo 的 `.claude/settings.json` 裡本來就有 `Bash(git status:*)`、`Bash(git diff:*)`、`Bash(git log:*)`，2.1.269 在這裡不會跳確認，每日出刊那條線昨天沒事。
4. 昨天有 headless job 跑在 2.1.269 上的，翻一下 log。預設模式下跳確認等於被拒，`--output-format json` 的 `permission_denials` 會記到。真有 git 指令被擋掉，那一輪的結論不能信。
5. 別開一個新 session 測一次就當沒事。我就是這樣測的，過了。這個 bug 要 session 活夠久才出得來。

---

*版本與 changelog 條目來自 npm registry 與官方 changelog（官方文件）。唯讀指令集不可設定、以及「不要再問」會寫進 `.claude/settings.local.json`，來自官方權限文件（官方文件）。兩版執行檔的唯讀 git 判定表無差異、以及新 session 下 `git status --short` 不跳確認，來自本次下載 2.1.269 與 2.1.270 執行檔比對並實際執行（本機實測）。*

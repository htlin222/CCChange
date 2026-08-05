---
title: "2.1.222：ultraplan 被關掉，worktree 隔離擴大到 session"
description: "21 條更新，值得動手的有三件。其中一條寫著「Removed ultraplan feature」，但程式碼一個 byte 都沒少，關掉的是一個你翻不到的遠端開關。"
published: 2026-08-05
category: "Changelog"
tags: ["claude-code", "changelog", "ultraplan", "worktree", "remote-control"]
annotation: "「移除」在這裡的意思是有人翻了一個你看不到的開關。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| `/ultraplan` | changelog 寫「Removed」，但關掉的是遠端開關，整套程式碼原封不動留在執行檔裡 |
| worktree 隔離 | 攔截範圍從 Bash 擴到檔案編輯，而且 session 自己也被管，不再只管 subagent |
| Remote Control 自動啟動 | repo 層的 `remoteControlAtStartup: true` 不再能打開它，只有 user scope 算數 |
| `SendMessage` | summary 太長不再整個 send 失敗，改成截斷 |
| `claude import` | 新的 CLI 入口，`--help` 列得出來，跑下去說自己還沒做好 |

其餘十幾條是修 bug：`/usage` 對 MCP server 的用量歸因、「Connection closed mid-response」誤報、`--ax-screen-reader` 的退格重讀、file watcher 崩潰、Bedrock 的 SSO profile。升級就有，不用做事。

## 為什麼要改

Remote Control 那條的動機是安全。你 clone 下來的 repo 能自己打開遠端控制，本來就不該成立。可是[官方 settings 文件](https://code.claude.com/docs/en/settings)到現在沒有 `remoteControlAtStartup` 這個鍵，只寫了 `disableRemoteControl`「works from any scope」。

比對過兩版之後我認為行為根本沒變。repo 層設定在舊版就是被忽略的，2.1.222 加的是一句告訴你它被忽略了的訊息。把「現在會講了」寫成「現在不能了」，會讓本來設定就沒生效的人以為自己昨天還是好的。

worktree 那條是實打實的擴張。以前只有 subagent 會被擋，現在你自己的 background session 跑到共用 checkout 也會被攔下來。

ultraplan 被關掉我沒話說，那功能的帳很難算。[社群實測](https://www.shareuhack.com/en/posts/claude-code-ultraplan-guide-2026)量過一輪完整流程吃掉 Pro 五小時額度的三分之一左右，而且它看的是遠端 repo 的當下狀態，你啟動之後在本機改的東西它不知道。我介意的是「Removed」這個動詞。有人會照著它去清掉 wrapper、跟同事說別用了，而程式碼其實一個 byte 都沒少。

## 對你的流程有什麼影響

1. 在任何 repo 的 `.claude/settings.json` 或 `.claude/settings.local.json` 寫過 `remoteControlAtStartup: true` 的，那行從來沒生效過，刪掉。真的要開就跑 `/config`，值會落在 `~/.claude/settings.json`。寫 `false` 關掉的仍然有效。
2. 有跑 background session 或 `isolation: "worktree"` 的，這版開始檔案編輯也會被擋。被擋到不用查半天，要整個關掉是在 `.claude/settings.json` 加 `"worktree": {"bgIsolation": "none"}`。
3. `/ultraplan` 從腳本和 alias 裡拿掉，現在叫不動。但別當它死了。程式碼還躺在執行檔裡，開關在遠端，它翻回來的時候不會有 changelog。
4. 之前為了閃 `SendMessage` 長度限制、自己先切字串的，那段可以拆了。
5. `claude import` 不用管。`--help` 列得出來，跑下去只回一句還沒做好。
6. `stable` 這個 dist-tag 還停在 2.1.220，落後 latest 兩版。想穩就釘 `@stable`，代價是這篇講的東西一個都拿不到。

---

*版本與條目來自 npm registry 和官方 changelog（官方文件）。ultraplan 與 `remoteControlAtStartup` 的行為判斷來自本次實際下載並比對 2.1.221、2.1.222 執行檔（本機實測）。額度數字引自第三方評測（社群）。*

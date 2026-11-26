---
title: "沒有新版：2.1.332 的 PreSkillShellCommand，skill 內嵌指令第一次攔得到"
description: "24 小時內沒有新版。昨天漏掉了 2.1.332 裡唯一要你動設定檔的東西：skill 載入時跑的那幾條 shell 指令，以前 PreToolUse 根本看不到。"
published: 2026-11-26
category: "Changelog"
tags: ["claude-code", "changelog", "hooks", "skills"]
annotation: "舊版讀到這個事件名，是當作沒看到"
---

## 改了什麼

沒有新版。2.1.332 在 11/24 22:06 UTC 上 npm，到現在 26.0 小時。

| 項目 | 現狀 |
| --- | --- |
| `latest` / `next` | 都指 2.1.332 |
| `stable` | 2.1.326，11/16 18:43 UTC 推的，落後六個版、9.2 天 |
| 官方 CHANGELOG | 昨天還停在 331，今天 332 的條目補進去了 |
| 這篇要講的 | 2.1.332 新增的 `PreSkillShellCommand` 事件，昨天那篇沒寫到 |

`anthropics/claude-code` 的 `pushed_at` 這次拿不到，容器的 egress 讓 GitHub API 回 403。上面的時間全部來自 npm registry。

## 為什麼要改

skill 和 `/security-review` 這類指令在載入時會先跑幾條 shell 指令，把輸出塞進 context。官方文件講得很直白：「[PreToolUse](https://code.claude.com/docs/en/hooks) hooks don't fire for injected commands.」你全域那條守 Bash 的 `PreToolUse`，從來沒看過它們一眼。

所以不是 332 弄壞了什麼。洞一直在，332 只是終於給了你補的工具。`PreSkillShellCommand` 收到的欄位也是衝著這件事來的：`tool_input.command` 是即將執行的那串指令原文，`command_name` 是哪個 skill 在載入，`command_source` 說它從 `userSettings`、`plugin` 還是 `builtin` 來，`invoked_by` 則分得出是你叫的還是 Claude 自己叫的。它只能擋，不能放行也不能改寫。

331 和 332 的執行檔比過了。`PreSkillShellCommand` 從 0 個字串變成 25 個，是真的新程式，不是把本來就在的開關打開（本機實測）。

## 對你的流程有什麼影響

1. 這個 repo 不用管。`.claude/settings.json` 沒有 `hooks` 這個鍵，也沒有 `.claude/hooks/`，兩支 skill 都不內嵌 shell 指令（本機實測）。
2. 去 `~/.claude/settings.json` 看那條守 Bash 的 `PreToolUse` 蓋到哪裡。它蓋不到 skill 載入時跑的指令，以前也沒蓋到。先去 `~/.claude/skills/` 和 plugin 底下 grep 一次 `` !` ``，有東西才有必要接。
3. 真要接之前，確認每一台都在 2.1.332 以上。2.1.331 的 `claude doctor` 給的是 `Unknown hook event "PreSkillShellCommand" was ignored.`，後面列 33 個合法事件名。重點是 ignored：守衛不在，但你以為在（本機實測）。設定檔裡順手把 `requiredMinimumVersion` 訂到 `2.1.332`。
4. 還在 `stable` 通道的機器現在跑 2.1.326，這個 hook 它吃不下。要嘛那台改走 `latest`，要嘛別把 hook 寫進會同步到它的那層設定。
5. `type` 只能寫 `command`。文件說 `prompt` 和 `agent` 在這個事件上跑不起來，而且會把每一條符合 matcher 的指令全部擋掉。332 自己的驗證器不攔這種寫法，我拿 `prompt` 的設定去跑 `claude doctor`，它一句話都沒說（本機實測）。
6. 接的話先只記錄、不要擋。擋下來的時候 skill 還是會載入，只是那條指令的輸出被換掉，靠那段輸出做事的 skill 會開始亂（社群）。記錄也別寫原始指令字串，裡面會有 token。

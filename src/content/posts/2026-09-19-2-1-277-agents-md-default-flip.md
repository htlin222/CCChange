---
title: "2.1.277：AGENTS.md 的開關兩版前就裝好了，這版翻面順便把 key 改名"
description: "changelog 寫 Added AGENTS.md support，但那個 builtin plugin 2.1.275 就在了，預設關著還會跳提示叫你自己開。這版把預設翻成開，四個選項值全部改名，而且第一個 session 讀不到。"
published: 2026-09-19
category: "Changelog"
tags: ["claude-code", "changelog", "agents-md", "claude-md", "sandbox", "gateway"]
annotation: "整版 AGENTS.md 支援，落到程式碼是一個 default 從 claude 換成 claude-md-or-agents-md。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| `latest` | 2.1.277，2026-09-18 16:22 UTC 上 npm，我查的時候過了 7.8 小時 |
| 2.1.276 | 整版只有一條：2.1.275 讓 `ANTHROPIC_BASE_URL` 指向 proxy 或 gateway 的人每個請求都 400 |
| AGENTS.md | 沒有 CLAUDE.md 的專案改讀 AGENTS.md。`agents-md` 這個 builtin plugin 2.1.275 就在，當時預設是 `claude`，只跳一次提示叫你自己去開 |
| 選項改名 | `projectInstructions` → `instructionFiles`，四個值也全換：`claude`→`claude-md`、`agents-fallback`→`claude-md-or-agents-md`（新預設）、`both`→`claude-md-and-agents-md`、`none`→`managed-only` |
| 舊 key | 還讀，會警告。兩個都設的話舊的完全不看 |
| 能不能用到 | 靠遠端 feature flag。Bedrock、Vertex、Foundry、關掉 telemetry 都拿不到，`/config` 裡連「Project instructions」那一列都不會出現 |
| 升上去的第一個 session | 讀不到，第二個 session 起才生效 |
| `claude -p` / SDK | 內部錯誤之後整個掛住不回結果的修掉了，現在報錯並 exit 1 |
| `sandbox.excludedCommands` | 複合指令以前只要一段 match 就整條免 sandbox，現在每一段都要 match |
| `CLAUDE_GATEWAY_PROXY_IS_EGRESS_BOUNDARY=1` | 新的，給只能靠 forward proxy 出去的 gateway，主機名交給 proxy 解 |

這版一共 87 條。沒列進上面那張表的七十幾條，大半是 `~/.claude.json` 存到壞值就開不起來的那種崩潰，還有 `/plugin` 和 `/skills` 面板的修補。

## 為什麼要改

AGENTS.md 是別的 agent 在讀的檔案。一個已經寫好 AGENTS.md 的 repo，以前要讓 Claude Code 看到，得多開一個 CLAUDE.md，或在裡面補一行 `@AGENTS.md` import。現在它自己會找。

[官方文件](https://code.claude.com/docs/en/memory#agents-md)把判斷條件寫得很細。工作目錄和它上面任何一層只要有 `CLAUDE.md`、`.claude/CLAUDE.md` 或 `CLAUDE.local.md`，就讀那些，AGENTS.md 一個字都不碰。`~/.claude/CLAUDE.md`、組織的 managed CLAUDE.md、`.claude/rules/` 不算數，會跟 AGENTS.md 一起載進來。這是 fallback 不是 merge，兩個同時生效得自己去設。

changelog 寫 Added，程式碼不是這樣。2.1.275 的執行檔裡 `agents-md` plugin 該有的都有，只是預設值當時是 `claude`，而且多一組 `NUDGE_TIMEOUT_MS`：偵測到你有 AGENTS.md 沒 CLAUDE.md，它提醒你一次「把 `projectInstructions` 設成 `agents-fallback`」，然後就不管了。2.1.277 拿掉提醒，改成直接載。翻的是預設值。

## 對你的流程有什麼影響

1. 升級：`npm i -g @anthropic-ai/claude-code`。昨天照我寫的升到 2.1.275、而且走 gateway 或自架 proxy 的話，那個每次都 400 就是 2.1.276 在修，直接升到 277 一起解決。
2. 升完先隨便開一個 session 再關掉。第一個 session 拿不到那個 flag，官方文件自己講明了，所以你馬上測會以為功能是壞的。
3. 這支 repo 不用管。根目錄有 CLAUDE.md，沒有 AGENTS.md，預設值下行為跟以前一模一樣。
4. `git ls-files | grep -i agents` 把手上每個 repo 掃一遍，只有 AGENTS.md 沒有 CLAUDE.md 的那些，把檔案讀一次。它們下個 session 起會進你的 context，而那通常是寫給別的工具看的東西，沒人為了你檢查過。
5. 想兩個都載就寫在 `~/.claude/settings.json`。專案的 `.claude/settings.json` 和 local 那層寫了不生效，文件明講這個 key 在專案層被忽略。我自己不會開：同一個 repo 兩份指令檔遲早各自長歪，等到哪天它們講相反的話，你不會知道模型聽的是哪一份。

   ```json
   {
     "pluginConfigs": {
       "agents-md@builtin": {
         "options": { "instructionFiles": "claude-md-and-agents-md" }
       }
     }
   }
   ```

6. 有 `CLAUDE.local.md` 的專案要記得它算一份 CLAUDE.md。你為了塞自己不想 commit 的指令加一個，就順手把 AGENTS.md 擋掉了。
7. 前兩天手動設過 `projectInstructions` 的話改名。舊的還讀但會唸你，而且只要 `instructionFiles` 也在，舊的就整個不看。
8. `grep -n excludedCommands ~/.claude/settings.json .claude/settings.json` 掃一遍。裡面有 `a && b` 這種複合指令的話，你的豁免範圍從今天起變窄了，原本跑得過的 hook 可能開始被 sandbox 擋。
9. CI 裡跑 `claude -p` 的話，以前撞到內部錯誤會吊死到 job timeout，現在 exit 1。原本靠 timeout 當保險的地方改回看 exit code。

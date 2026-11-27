---
title: "沒有新版：2.1.332 的 MCP skills 其實 331 就有，雲端和 claude -p 吃不到"
description: "24 小時內沒有新版。332 條目的第一行是 server 可以直接送 skill 過來，但程式在 331 就已經全在，而且你跑出刊的那種 session 根本不在支援清單裡。"
published: 2026-11-27
category: "Changelog"
tags: ["claude-code", "changelog", "mcp", "skills", "permissions"]
annotation: "終端機用順了，寫進 CI 就靜靜地消失"
---

## 改了什麼

沒有新版。2.1.332 在 11/24 22:06 UTC 上 npm，到現在 50.1 小時。

| 項目 | 現狀 |
| --- | --- |
| `latest` / `next` | 都還指 2.1.332 |
| `stable` | 2.1.326，11/16 18:43 UTC 推的，落後六個版、10.2 天 |
| 官方 CHANGELOG | 最新一節還是 2.1.332，沒有新條目 |
| 這篇要講的 | 332 條目的第一行，MCP server 可以直接送 skill 過來，前兩篇都沒寫到 |
| 版本要求 | changelog 掛在 332，官方文件寫 2.1.331 以上 |

`anthropics/claude-code` 的 `pushed_at` 又拿不到，容器的 egress 讓 GitHub API 回 403。上面的時間都來自 npm registry。

## 為什麼要改

MCP server 以前只能給你 tools。[Skills extension](https://code.claude.com/docs/en/mcp#use-skills-from-mcp-servers) 讓它連 skill 一起送，名字長成 `<server>:<skill>`，附檔當 MCP resource 現場讀。它省掉的是重裝：server 那邊改一版，你這邊什麼都不必動。

331 和 332 的執行檔比過，MCP skill 那套程式在 331 裡就整套都在，連遙測事件名都一樣（本機實測）。所以 332 的 Added 是公告，不是新程式，文件寫的 331 才是真的。升版換不到它，開關不在版本號上，在 Anthropic 的遠端設定和你的帳號、連線方式。

核准是另一回事。auto mode 下它不問你，classifier 自己決定 skill 要不要載，而且不讀 skill 內容。Manual 模式才看得到那個「Allow this version」。官方文件自己也寫了 server 隨時能換掉 skill，而 `claude mcp add` 加進來的那些根本不經掃描。

## 對你的流程有什麼影響

1. 出刊這條不用管。雲端 session 在官方的不支援清單裡，`claude -p`、GitHub Actions、Agent SDK 一樣在上面。這個 repo 沒有 `.mcp.json`，`.claude/settings.json` 裡也沒有任何 MCP server（本機實測）。
2. 不用為了它升版。331 的執行檔裡就有了。
3. 在終端機試之前，先去 `/mcp` 看那台 server 有沒有 Protocol 這一行。要講 MCP revision 2026-07-28 以上才會被問 `skills/list`，而一般寫法的 `StdioServerTransport()` 停在 2025-11-25，skill 一個都不會出現（社群）。
4. `claude mcp add` 加的 server 給它 `ask`：規則寫 `Skill(mcp__<server>__*)`。沒有掃描，auto mode 又不問，這是唯一能插進去的地方。
5. `allow` 規則別指望。`allow Skill(mcp__x__*)` 只能寫在 user 或 managed settings，而且只對你自己 user/local scope 加的和 managed server 有效，connector、`.mcp.json`、plugin 帶的 server 都不吃。
6. `deny` 擋掉 skill 之後，那台 server 的 resource 還是讀得到。要連資源讀取一起關，得另外 deny `ReadMcpResourceTool`。
7. 整個關掉是 managed settings 的事：`disableDirectMcpSkills` 設 `true` 關非 connector 的來源，connector 那邊是 `disableClaudeAiConnectors`。用 `/login` 的 Pro、Max、Ultra 預設是開著的。
8. 終端機用順的 MCP skill 不要寫進 CI 腳本。`claude -p` 吃不到，而且是靜靜地沒有，不會報錯。

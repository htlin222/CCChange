---
title: "2.1.305：`sandbox.allowNestedUserNamespaces` 寫在 repo 的設定檔裡不會生效"
description: "新的沙箱開關只認 user 設定、managed 和 `--settings`，專案設定寫 true 會被丟掉。另外 watchdog 等用量上限時終於會回頭確認一次，但那個變數要自己填。"
published: 2026-10-21
category: "Changelog"
tags: ["claude-code", "changelog", "sandbox", "env-vars", "retry", "mcp"]
annotation: "想讓某個 repo 跑得起 Chromium，於是把開關寫進那個 repo 的 .claude/settings.json。這是唯一不會生效的寫法。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.305 | 10-20 19:29 UTC 上 npm，距這篇 4.8 小時，38 條 |
| `stable` | 還停在 2.1.304，`latest` 和 `next` 才是 305 |
| `sandbox.allowNestedUserNamespaces` | 新設定鍵，讓 Linux/WSL 的沙箱指令自己開 user namespace。Chromium、Electron、rootless podman、`unshare` 這類自帶沙箱的東西要靠它才跑得起來 |
| 同一個鍵的來源限制 | `true` 只認 user 設定、managed/policy 和 `--settings`。專案設定寫 `true` 直接忽略，寫 `false` 照算 |
| 這個鍵在 2.1.304 | 沙箱內部早就有這個選項，但沒有對外的鍵。寫進 settings 不報錯也不生效（執行檔比對） |
| `CLAUDE_CODE_RETRY_WATCHDOG_USAGE_LIMIT_RECHECK_MS` | watchdog 掛在用量上限上的時候，中途回頭確認是不是已經解除。沒設就完全不回頭 |
| 被閘道拒絕的 tool search | 2.1.304 只把那一個請求重送，下一個又帶著送，於是每個都 400。305 記住這次拒絕，整段對話都不再送 |
| `/effort`、`/autocompact` | 模型名跟 `modelOverrides` 的值差在大小寫或 `[1m]` 後綴時，設定會對不上，這版修掉 |
| `allowedMcpServers` | `managed-mcp.json` 裡只在 `env` 用到 `${VAR}` 的 stdio server 不再被濾掉，升級後自己載起來 |
| 磁碟滿掉時的 Bash | 不再把 raw `ENOSPC` 和一個路徑丟出來，改成說磁碟滿了、指令沒跑 |

剩下那些大多不必動設定。`/usage` 的警告改成一行一個修法，按 `f` 直接套，同一批修法也出現在 VS Code 和 `/doctor`。窄終端機不再截掉 `/usage` 的列。MCP 同意對話框不容易再把你要送 prompt 的 Enter 當成 Accept。`/artifacts` 的刪除確認換成 1 或 Enter 留著、2 刪掉、Esc 取消。bare repo 的新 worktree 不再從 local HEAD 開，沒動過的 subagent worktree 會被清掉。

## 為什麼要改

[settings-reference](https://code.claude.com/docs/en/settings-reference) 到現在沒有這個鍵，整頁搜不到，旁邊的 `enableWeakerNestedSandbox` 和 `allowAppleEvents` 各有四處。代價寫在執行檔自己的設定 schema 裡，而且寫得比 changelog 重（執行檔比對）：

> **Removes code-execution isolation** — in any folder a hostile command may write, it can then bypass filesystem.denyWrite, filesystem.denyRead, credentials.files entries and the paths the sandbox always write-protects (such as .claude/settings.json, git hooks and git config), and so plant code that later runs outside the sandbox; while autoAllowBashIfSandboxed is on, the command that plants it needs no approval.

它因此被歸到會削弱隔離的那一類，跟上面那兩個排在一起。這版把它加進那份名單。名單上的鍵只要設了，要求完全封閉沙箱的呼叫就不再執行，直接拒絕。

來源限制是同一個理由。寫在 repo 裡的 `true`，等於讓任何能發 PR 的人替你把沙箱關掉，所以專案設定只准關不准開。

另一條走反方向。watchdog 掛在用量上限上的時候，等的是視窗重置，[env-vars 文件](https://code.claude.com/docs/en/env-vars)對新變數的描述，重點在最後一句：

> Minimum interval in milliseconds between checks of whether a usage limit was already lifted, while a request waits for that limit to reset with `CLAUDE_CODE_RETRY_WATCHDOG` set. When a check finds the limit lifted, the request goes out at once. … When this variable is unset or its value is outside that range, no checks are made.

執行檔裡是這樣實作的：讀不到值，下一次檢查的時間就設成無限大。升級不會讓排程變聰明，開關放在那裡，要自己去開。

tool search 那條是 2.1.304 自己造的。那版把 tool search 在自訂 `ANTHROPIC_BASE_URL` 底下改成預設開，閘道回 400 或 422 就退掉重送。退的只有那一個請求，下一個照樣帶著 `tool_reference` 出去，又被拒絕，又退一次。305 多了一個記住拒絕的欄位，整段對話從此不送。狀態碼不是 400 或 422 就不吃這條，閘道回 500 的話照樣一路失敗。

## 對你的流程有什麼影響

1. 排程裡設了 `CLAUDE_CODE_RETRY_WATCHDOG=1` 的環境，補上新變數。升級本身不會替你做這件事：

```bash
CLAUDE_CODE_RETRY_WATCHDOG_USAGE_LIMIT_RECHECK_MS=300000
```

   範圍是 `60000` 到 `10800000`，超出去等於沒設，不會有任何提示。另外三種情況它不查：用超額額度的時候、`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` 開著的時候，以及上限不是 claude.ai 訂閱的 session 或 weekly 上限的時候。前兩個你查得到，第三個等於這條只對訂閱制有用。

2. 要讓某個 repo 跑得起 Chromium 或 rootless podman，別把開關寫進那個 repo 的 `.claude/settings.json`。寫了不報錯，就是不生效。真的要開，當場給：

```bash
claude --settings '{"sandbox":{"allowNestedUserNamespaces":true}}'
```

   寫進 `~/.claude/settings.json` 也行，代價是每個專案都開著。我自己走 `--settings`。沙箱裡的指令開了這個之後改得到 `.claude/settings.json` 和 git hooks，那兩個下一次是在沙箱外面跑的，我不想讓它在每個專案都開著。

3. 反過來要擋，專案設定寫 `false` 是有效的。替別人維護、又不確定對方 user 設定寫了什麼的 repo，這一行值得加。

4. tool search 那條只有走自訂 `ANTHROPIC_BASE_URL` 的人需要管。先確認自己在哪一邊：

```bash
echo "${ANTHROPIC_BASE_URL:-(unset)}"
```

   指向 `api.anthropic.com` 或沒設就跳過。指向閘道的話，除了升級，把 `ENABLE_TOOL_SEARCH=false` 明確寫進環境變數，不要靠預設值。env-vars 那頁到現在還寫著非第一方 host 預設關閉，2.1.304 的 changelog 寫的是預設打開。兩邊對不上的時候，寫死的那個才算。

5. 用 `@stable` 裝的機器現在拿到 2.1.304，也就是帶著那個 tool search 迴圈的版本。要修得明確指定 `@latest` 或 `@2.1.305`。

6. 沒有 managed settings 就跳過 `allowedMcpServers` 那條。有的話，升級前把 `managed-mcp.json` 看一遍，挑出只在 `env` 用到 `${VAR}` 的 stdio server。以前被 allowlist 擋掉的那些會自己載起來，要繼續擋得改寫 `deniedMcpServers`。

7. 其他不用管。`/effort` 和 `/autocompact` 那條要有 `modelOverrides` 才踩得到，那是 managed settings 的鍵。`/usage` 和 `/artifacts` 的按鍵改動只影響肌肉記憶：刪 artifact 時 `y` 不再是確認，按下去不會刪，也不會有別的事。

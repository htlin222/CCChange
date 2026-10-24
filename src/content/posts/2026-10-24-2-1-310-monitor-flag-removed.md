---
title: "2.1.310：Monitor 的遠端旗標被刪掉，foreground `sleep` 不再分環境擋"
description: "changelog 寫的是在 Bedrock、Vertex、Foundry 上「新增 Monitor」，執行檔裡看到的是一個預設關閉的遠端旗標整個消失。另外 cleanupPeriodDays 設太大反而會刪掉近期檔案。"
published: 2026-10-24
category: "Changelog"
tags: ["claude-code", "changelog", "monitor", "sandbox", "settings"]
annotation: "沒有新程式碼。2.1.309 就有了，只是被一個預設 false 的旗標關著。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.310 | 10-23 21:20 UTC 上 npm，距這篇 2.8 小時，26 條 |
| `stable` | 還停在 2.1.308，`latest` 和 `next` 才是 310 |
| Monitor 與 `sleep` 封鎖 | changelog 說在 Bedrock/Vertex/Foundry 和關掉遙測時「新增」。執行檔裡是 `tengu_amber_sentinel` 這個預設 `false` 的遠端旗標被刪掉，它管著的六處判斷一起變成無條件（執行檔比對） |
| 那六處 | Monitor 的 `isEnabled`、plugin monitors、Bash 和 PowerShell 的 `sleep` 攔截、Bash 工具說明裡那句話、系統提示裡叫模型改用 Monitor 的那條 |
| 攔的門檻 | 第一個 statement 是 `sleep` 且秒數大於等於 25 就拒絕。309 和 310 都是 25，門檻沒動 |
| 攔的形狀 | regex 只吃純數字，而且只看第一段。`sleep 2m` 不算，`echo x && sleep 60` 也不算 |
| 連帶關掉封鎖的鍵 | `backgroundTasksDisabled` 和 `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` 會把攔截一起關掉，Monitor 本身留著 |
| `cleanupPeriodDays` | 設成很大的值時，背景清理會反過來刪近期檔案，貼上的圖是其中一種 |
| Linux sandbox 警告 | bubblewrap 起不來時會點名 Ubuntu 的 AppArmor 並給出 sysctl（新字串，0 到 5） |
| 閘道相容 | 閘道退掉 `effort-2025-11-24` 或中途的 system message 時，改成拿掉那個再重試 |
| `claude -p` / Agent SDK | transcript 很大的時候，壓縮階段的記憶體用量降低 |
| MCP elicitation | 非互動 session 裡逾時的錯誤改成告訴模型沒人回答、不要重打 |

剩下那些不必動設定。cloud sessions 的 admin 介面、Claude Tag 的 `!` 指令、Code Review 後台、VS Code 裡 plan review 卡片按 Enter 會變成核准，都是各自介面裡的修正。Windows 有一條 hook 繞過：Git Bash 不在、而 hook 指令整條只有帶引號的字串時，PreToolUse 和 PermissionRequest 會放行。那是安全修正，但只有 Windows 踩得到。

## 為什麼要改

攔截訊息叫模型去用 Monitor。但在 2.1.309，Monitor 掛不掛出來和 `sleep` 擋不擋，看的雖然是同一個旗標，各自又多掛了不一樣的附帶條件，於是兩邊可以不同步。

社群在 v2.1.235 就報過這個。擋下來之後模型照訊息去叫 Monitor，拿回來的是

> Error: No such tool available: Monitor. Monitor is disabled for this session, in subagents as well as here.

那張 issue 九月被關成 not planned，裡面提的修法是讓攔截和 Monitor 走同一個條件。這版刪掉旗標之後，非 Windows 上 Monitor 一律存在，攔截要撞上 Monitor 不在已經沒有路徑可走。

Linux 那條是 10-21 那篇的前一關。`allowNestedUserNamespaces` 管的是沙箱裡的指令能不能自己開 namespace，AppArmor 管的是 `bwrap` 自己能不能開。profile 沒裝，沙箱根本起不來，後面那個設定無從談起。以前只說 bubblewrap 失敗，現在訊息直接指到 [sandboxing 文件](https://code.claude.com/docs/en/sandboxing)。

`cleanupPeriodDays` 那條的成因在它自己的設定說明裡：default 30、minimum 1，沒有 0。想讓 transcript 留久一點的人只能填一個很大的數字，而 changelog 說會誤刪的就是這種值。

## 對你的流程有什麼影響

1. 先看 `cleanupPeriodDays` 填了什麼：

```bash
python3 -c "import json,os;p=os.path.expanduser('~/.claude/settings.json');print(json.load(open(p)).get('cleanupPeriodDays','(unset)'))"
```

   沒設就是 30，跳過。設了一個很大的數字就是踩在這個 bug 上，先升級再把它改成真正想要的天數。沒有「0 等於關掉」這種寫法，最小值是 1。之前已經被掃掉的圖片不會回來，升級只是讓它停手。

2. 把開頭是 `sleep` 的地方找出來：

```bash
grep -rn 'sleep [0-9]\{2,\}' ~/.claude/hooks ~/.claude/skills ~/.claude/settings.json 2>/dev/null
```

   `sleep` 在第一段、秒數 25 以上的，現在一律被拒，而且不再取決於遠端旗標那天開著沒有。等自己啟動的指令改 `run_in_background: true`，等條件改成 `until <check>; do sleep 2; done`。

3. 別用 `sleep 2m` 或在前面塞一個 `:` 去繞。regex 確實攔不到這兩種，但訊息裡那句 `Do not chain shorter sleeps to work around this block` 是寫給模型看的，繞過去只是讓它下一輪自己再撞一次。

4. Ubuntu 或 WSL2 查一次：

```bash
sysctl kernel.apparmor_restrict_unprivileged_userns
```

   回 `0` 或說找不到這個 key 就跳過。回 `1` 就照文件把 profile 寫進 `/etc/apparmor.d/bwrap`，再 `sudo systemctl reload apparmor`。新訊息會順手建議 `sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0`，那個 reboot 就沒了，而且是整台機器放寬。profile 只放寬 `bwrap` 一支，我裝 profile。

5. 走閘道的升級。`effort-2025-11-24` 被退掉時 310 會自己拿掉那個再重試。先確認自己在哪一邊：

```bash
echo "${ANTHROPIC_BASE_URL:-(unset)}"
```

   指向 `api.anthropic.com` 或沒設就跳過，這條只在自架閘道後面才踩得到。

6. 用 `@stable` 裝的機器現在拿到 2.1.308，上面幾條都不在裡面。要修得明確指定 `@latest` 或 `@2.1.310`。

7. 其他不用管。`backgroundTasksDisabled` 會連 `sleep` 攔截一起關掉，但代價是整個 background task，不值得拿來換。cloud sessions 和 Claude Tag 那幾條都在別人的介面裡。

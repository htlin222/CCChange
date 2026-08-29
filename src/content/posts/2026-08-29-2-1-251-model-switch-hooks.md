---
title: "2.1.251：模型切換終於有 hook，專案 settings 的 env 又少三十個 key"
description: "PreModelSwitch 和 PostModelSwitch 是全新的東西，官方 hooks 文件還沒收。同一版把專案 settings 能設的環境變數砍掉三十個，changelog 只點名三個，被砍掉的時候也沒人通知你。"
published: 2026-08-29
category: "Changelog"
tags: ["claude-code", "changelog", "hooks", "settings", "subagent"]
annotation: "被丟掉的 env key 不會出現在 claude -p，也不會出現在 claude doctor。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| `PreModelSwitch` / `PostModelSwitch` | 兩個新 hook 事件，切模型之前可以擋掉或要求確認，matcher 比對的是 `to_model` |
| `SessionStart` 的 resume | resume 和 fork 多拿到 `context_tokens`、`prompt_cache_likely_expired`、`estimated_cache_write_usd`、`seconds_since_last_response` |
| 專案 `env` 的黑名單 | `.claude/settings.json` 和 `settings.local.json` 的 `env` 這版多擋三十個 key，changelog 只點名三個 |
| `CLAUDE_CODE_SUBAGENT_MODEL` | 從蓋掉一切降級成預設值，agent 定義裡的 `model:` 和單次 spawn 指定的都比它大 |
| `attach` `logs` `stop` `respawn` `rm` | 背景 session 的五個子指令進了 `claude --help`，以前只在 `claude agents` 裡摸得到 |
| 權限檢查 | 補了五個洞：檢查完才被抽換的 symlink、走 symlink 進去的 Grep 和 Glob 沒套 `Read()` deny、plugin 路徑穿越、Workflow 的 `scriptPath`、Bash 裡 `OPTIND=1/0` 這種算術賦值被自動放行 |

其餘五十幾條會碰到的：那一輪只吐 thinking 之後卡在 `text content blocks must be non-empty` 的死結解了；Opus 5 在 effort 開到 xhigh 或 max、thinking 又關掉的時候會直接失敗，現在自動降成 `high` 送出去；`/effort` 改成每個模型各記一份；背景 session 和它的 subagent 現在改得動自己用 `git worktree add` 開出來的檔案了。升上去就有。

## 為什麼要改

Session 中途換模型以前是個沒有掛勾的地方。`/model`、模型選單、fast mode 開關、換 agent，四條路徑都會改掉 session 模型，而你沒有任何位置能在它發生前插話。`PreModelSwitch` 補的是這個。退出碼沿用 `PreToolUse` 那一套：exit 0 可以回 `permissionDecision` 的 allow、deny 或 ask，exit 2 直接擋掉並把 stderr 給人看。

[官方 hooks 文件](https://code.claude.com/docs/en/hooks)今天還沒有這兩個事件，那張生命週期表列到 `SessionEnd` 就停了。欄位名要嘛開 `/hooks` 看，要嘛看下面。

`env` 那份黑名單擴得比 changelog 講的多很多。理由不難猜：專案 settings 是別人 commit 進 repo、你 clone 下來就生效的東西。改得動 `CLAUDE_CONFIG_DIR`，就等於換掉你整份設定；改得動 `OTEL_LOG_RAW_API_BODIES`，原始 API body 就寫進硬碟了。新擋的三十個 key 裡，十四個是暫存或設定目錄，九個是 tracing 和 log 的輸出位置。

## 對你的流程有什麼影響

1. 要攔模型切換就寫 `PreModelSwitch`，matcher 填 `to_model`。裡面不要帶 `[1m]`，Claude Code 比對之前會先把 `[1m]` 和 `[2m]` 拿掉，寫進去反而不會中。輸入 JSON 是 `from_model`、`to_model`、`requested_model`、`source`、`context_tokens`，外加估出來的重灌快取成本。
2. 掛上去之前先知道它管的不只有 `/model`。fast mode 開關和換 agent 走的是同一條檢查，你擋掉切換，這兩個動作會一起失敗，訊息是 `model switch blocked by a PreModelSwitch hook`。
3. 去翻每一個 repo 的 `.claude/settings.json` 和 `settings.local.json`。`env` 裡有 `TMPDIR`、`TMP`、`TEMP`、`CLAUDE_CODE_TMPDIR`、`CLAUDE_CONFIG_DIR`、`XDG_DATA_HOME` 這類 XDG 目錄、`GITHUB_ACTIONS`、`CLAUDE_CODE_DEBUG_LOGS_DIR` 的話，搬到 shell 或 `~/.claude/settings.json`。CCChange 這個 repo 沒有 `env` 區塊，不用動。
4. 上一條沒有安全網。二進位裡確實有一句 `… is ignored — project-scoped settings can't set this key`，但我拿一個 scratch 專案塞了三個被擋的 key 進去，`claude -p` 和 `claude doctor` 都沒印出來。當成靜默失效處理。
5. 有設 `CLAUDE_CODE_SUBAGENT_MODEL` 的話，它的意思變了。現在只是預設值，agent frontmatter 的 `model:` 和 spawn 時明講的模型都贏它。要強制全部走同一個模型，得改到 agent 檔案裡去寫。
6. 升完版跑一次 `claude respawn --all`，把還開著的背景 session 重開到新版本，不然它們會用舊的執行檔一直跑下去。
7. 那五個權限修正不用做什麼，升上去就好。要注意的是其中一條：`Read()` 的 deny 規則在這版之前，對走 symlink 路徑進去的 Grep 和 Glob 不生效。這條我只有 changelog，本機重現失敗了，`--settings` 帶進去的 deny 規則連直接讀都沒擋住，那次測試不算數。你如果靠 deny 規則擋 `.env`，把 2.1.251 當下限。

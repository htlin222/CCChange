---
title: "2.1.280：Opus 5.5 進來了，user settings 頂層那個 effortLevel 對它不生效"
description: "opus 別名改指 claude-opus-5-5，cache read 從 $0.50 降到 $0.20。但它出廠 effort 是 medium，而你存在 ~/.claude/settings.json 頂層的 effortLevel 前面卡了一份寫死的模型名單，Opus 5.5 不在裡面。"
published: 2026-09-23
category: "Changelog"
tags: ["claude-code", "changelog", "models", "effort", "hooks"]
annotation: "降價的主力是 cache read，不是 input。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.280 | 09-22 15:44 UTC 發，距這篇 8.5 小時。npm 上沒有 2.1.279 |
| Opus 5.5 | `claude-opus-5-5`，`opus` 別名現在指它 |
| 價格 | $4／$20 per Mtok，cache read $0.20。Opus 5 是 $5／$25／$0.50 |
| 出廠 effort | Opus 5.5 的 `default_effort` 是 `medium`。Opus 5、Sonnet 5、Fable 5.1 都是 `high` |
| 舊的 `effortLevel` | 存在 `~/.claude/settings.json` 頂層的那一個，對 Opus 5.5 不算數 |
| `max_output_tokens` | catalog 裡 Opus 5.5 預設 128k，Opus 5 是 64k，上限兩者都 128k |
| gateway、Foundry | `opus` 在這兩邊還是 4.7 和 4.6，兩版的 catalog 一個字都沒差 |
| Pro、Team Standard | 預設模型從 Sonnet 換成 Opus |
| PermissionRequest hook | `type: "agent"` 的現在直接報錯，要改 `command` 或 `http` |
| symlink 寫入 | 連出去落在樹外的，`acceptEdits`、allow 規則、auto mode 都不再放行 |
| `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH` | 新的，動 MCP 工具描述那個 2048 字上限 |

沒細講的：`y`／`n` 誤觸關掉對話框、雲端 routine 在排程前一刻改了 prompt 還是跑舊的、幾十條 VS Code 和 Claude Tag 的修正。

## 為什麼要改

這次降價降在 cache read，$0.50 到 $0.20。agentic 跑起來帳單大半是 cache read，這條比 input 從 $5 變 $4 有感多了。

別名那張表[官方文件](https://code.claude.com/docs/en/model-config)列出來了：Anthropic API、Bedrock、Google Cloud 上 `opus` 是 Opus 5.5，Microsoft Foundry 是 Opus 4.6。gateway 沒進那張表。我把 2.1.278 和 2.1.280 的 model catalog 挖出來對，`gateway:"claude-opus-4-7"` 兩版一模一樣，走 gateway 升不升級都拿到 4.7。

effort 是這版最容易踩到的。Opus 5.5 出廠 `medium`，Opus 5 是 `high`；同時 2.1.280 新長出一個 `legacyUserEffort`，前面卡一份寫死的模型名單，`claude-opus-5-5` 不在裡面。[settings 文件](https://code.claude.com/docs/en/settings-reference)寫的卻是「for models without a saved level of their own」。兩邊對不上，我算它是文件沒跟上。名單只管 user settings 那一份，專案的 `.claude/settings.json` 和 `--settings` 照樣生效。

## 對你的流程有什麼影響

1. 切過去之後先確認實際跑在哪一級，別假設 `effortLevel: "high"` 還跟著你。要釘死就寫進 `modelSettings`：

   ```json
   { "modelSettings": { "claude-opus-5-5": { "effortLevel": "high" } } }
   ```

   這條不受那份名單管。`/effort` 手動選一次也行，它會自己寫到同一個地方。

2. hook 設定裡有 `"type": "agent"` 掛在 `PermissionRequest` 上的，現在會吐這句：

   > agent-type hooks are not supported for PermissionRequest events (an agent hook answers ok or not ok, and cannot return the allow / deny decision a permission request needs). Use a command- or http-type hook instead.

   改成 `command` 或 `http`。[hooks 文件](https://code.claude.com/docs/en/hooks)沒說過 agent 不支援這個事件，之前掛上去就是靜靜地什麼也沒做。

3. 走 gateway 的 wrapper，`--model opus` 拿到 4.7。要 5.5 得把全名寫死：`--model claude-opus-5-5`。

4. `.claude/` 或設定檔做成 symlink 指到 repo 外面的話，`acceptEdits` 底下之前會直接過，現在停下來問你，而且提示裡寫的是檔案真正落地的位置。修對了。但沒人看著的腳本會卡在那個問句上，這點得先想過。

5. 有在剪 `claude -p` 輸出的下游，自己看一眼。catalog 裡的預設輸出上限翻了一倍，同一句 prompt 回來的東西可能比你習慣的長。

6. `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH` 不用設。2048 字砍掉的正是那種把半份 README 塞進 tool description 的 server。

7. 二進位裡 Opus 5.5 多了一句 2.1.278 沒有的退讓訊息：「is more capable and has stronger safeguards as a result, which can sometimes flag non-cybersecurity work」。真撞到，同一件事換 Sonnet 5 跑通常就過。

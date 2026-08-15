---
title: "2.1.233：Todo 工具在新模型上被關掉，昨天那條 `< file` 收回去了"
description: "二十條裡有兩條會直接動到你。Todo/Task 那組工具在 Opus 4.8 以上的模型拿不到了，程式碼一個字沒少；2.1.232 才加的輸入導向權限檢查整段刪掉。"
published: 2026-08-15
category: "Changelog"
tags: ["claude-code", "changelog", "todo-tools", "permissions", "skills"]
annotation: "TodoWrite 的工具說明還在執行檔裡，關它的是一段模型版本比較。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 版本 | 2.1.233，npm 08-14 18:50 UTC 發，距這篇約 5 小時；`latest`、`next` 指它，`stable` 還在 2.1.224 |
| Todo/Task 工具 | Opus 4.8、Sonnet 5、Fable 5、Mythos 5 以上的模型看不到這組工具，`CLAUDE_CODE_ENABLE_TODO_TOOLS=1` 拿得回來 |
| `< file` 權限檢查 | 2.1.232 才加的，這版整段刪掉，`Input redirection from` 這句在新執行檔裡是 0 次 |
| `CLAUDE_CODE_TOOL_MEMORY_LIMIT` | Linux 和 WSL 上替 Bash 工具跑的指令套一層 memory cgroup，不設就不開 |
| `CLAUDE_CODE_WEBFETCH_CACHE_TTL_MS` | WebFetch 的 URL 快取 TTL，預設仍是 15 分鐘 |
| `claude plugin validate` | 認得只有 `.claude/skills/`、沒有 plugin manifest 的 repo，會去驗每個 SKILL.md 的 frontmatter |
| 內建 skill 別名 | `/checkup`、`/review` 被同名的 user 或 project skill 蓋住時，在 `-p` 下報 Unknown command，修了 |
| Notification hook | Claude Desktop 和 VS Code 底下權限提示不觸發 hook，修了 |
| `-p` 診斷 | 送出的 model ID 認不得時，stderr 會多一行 `[claude-code:unrecognized_model]` |
| Linux 閒置 CPU | 開 sandbox 的閒置 session 有時吃滿一顆核心，修了 |

剩下的動不到你：GitLab 的 MR URL、apps gateway 的 `forward_user_identity`、MCP v2 訂閱重連、Windows 的 `\??\` 前綴繞過 UNC 檢查、螢幕閱讀器下的 `/effort` 選單。

## 為什麼要改

changelog 那條 Todo 工具寫的是 no longer available。執行檔裡不是這樣。TodoWrite 的工具說明整段都還在，新加進去的是一張表和一個遠端開關：

```js
[["opus",[4,8]],["sonnet",[5]],["fable",[5]],["mythos",[5]]]
```

模型 ID 拆成家族加版號，版號大於等於表上那個就拿不到工具。開關叫 `tengu_rosy_wren`，2.1.232 裡還不存在，預設關。功能沒被砍，是從新模型的工具清單裡拿掉。

官方沒講理由，壞掉的人倒是先出現了。superpowers 的 [issue #1518](https://github.com/obra/superpowers/issues/1518) 列了六個因此掛掉的 skill，錯誤訊息是「No such tool available: TodoWrite. TodoWrite exists but is not enabled in this context.」

memory cgroup 那條要看清楚它圈的是誰。Linux 上 Claude Code 吃記憶體吃到觸發 OOM killer 吵很久了（anthropics/claude-code 的 #4953、#20777），社群的辦法是拿 `systemd-run --scope -p MemoryMax=` 把整個 process 包起來。官方做的不是那個。它在 `/sys/fs/cgroup/…/claude-code-bash` 底下開一個 v2 cgroup，圈的是 Bash 工具跑出去的指令，agent 本體漲上去照樣漲。

[官方文件](https://code.claude.com/docs/en/plugins-reference)一直建議把 `claude plugin validate` 放進 CI：

> Pass `--strict` to treat warnings as errors. Use it in CI to catch a misspelled field name or a field left over from another tool's manifest before publishing, even though the plugin would load at runtime.

沒寫的是它到 2.1.232 為止對沒有 manifest 的目錄根本不做事。拿這個 repo 實測，2.1.232 回 `No manifest found in directory`，2.1.233 回 `Validation passed`。

`< file` 那條沒解釋，只說比較窄的版本之後會回來。昨天叫你翻 allow 規則的時候，它上線才一天。

## 對你的流程有什麼影響

1. 先確認你在哪個模型。`claude-opus-5` 和 `claude-sonnet-5` 都在被關的那一邊，`claude-haiku-4-5` 不在表上，工具照給。
2. 拿回來之前先 `grep -ri 'TodoWrite\|TaskCreate' ~/.claude/skills .claude/skills`。沒東西提到就別加，新模型本來就會自己追進度。有 skill 在點名這些工具，改 skill 比開環境變數乾淨。
3. 真要開就在 `~/.claude/settings.json` 的 `env` 放 `"CLAUDE_CODE_ENABLE_TODO_TOOLS": "1"`。從執行檔確認吃的是 `1`、`true`、`yes`、`on` 這四個。
4. 昨天第 5 條作廢。`< file` 不走權限檢查了，不用為它改 allow 規則，也別假設它擋著。
5. `claude plugin validate .` 現在對這個 repo 有效，跑起來是 Validation passed。它抓 frontmatter 解析失敗，也就是「loads with empty metadata (all frontmatter fields silently dropped)」那種，`pnpm test` 看不到。要進 CI 得另開一支 PR，混進每日 PR 會卡住 auto-merge。
6. memory limit 不設就沒有。要開是 `CLAUDE_CODE_TOOL_MEMORY_LIMIT=4G`，吃 `4G`、`512M`、`1.5g`、`2GiB` 這些寫法，純數字當 byte 算，`none` 關掉。macOS 上設了不生效。
7. `CLAUDE_CODE_WEBFETCH_CACHE_TTL_MS` 不用管。改它會連工具說明裡那句 cached for N minutes 一起改掉，為了省一次抓取不值得動模型讀到的字。
8. `-p` 的 stderr 開始會多一行 `[claude-code:unrecognized_model]`。CI 裡把 stderr 當失敗訊號的話先看一眼。
9. Notification hook、Linux 閒置 CPU、`/checkup` 那組別名都是純修 bug，升上去就好，其餘不用管。

---

*版本與條目來自 npm registry 和官方 changelog（官方文件）。閘門表、`tengu_rosy_wren`、消失的 `Input redirection from`、環境變數吃的值、`plugin validate` 的兩版差異，來自本次比對並實際執行 2.1.232 與 2.1.233 執行檔（本機實測）。壞掉的 skill 和 OOM 討論引自 GitHub issue（社群）。此環境沒有 `gh`，`pushed_at` 拿不到。*

---
title: "2.1.229：GitHub review workflow 的模板補了兩行，你 repo 裡那份不會自己跟上"
description: "三十幾條，大半是修補。真正要動手的只有一條：/install-github-app 產生的 code review workflow 模板改了，已經 commit 進 repo 的那份還是會跑完卻不留言。另外 self-hosted runner 開始收伺服器下發的 hook 腳本。"
published: 2026-08-13
category: "Changelog"
tags: ["claude-code", "changelog", "github-actions", "hooks", "workflow"]
annotation: "修的是產生器，不是執行時。升級 Claude Code 對你 repo 裡那支 yml 沒有任何幫助。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 版本 | 2.1.229，npm 08-12 19:28 UTC 發，`latest` 和 `next` 都指它，`stable` 停在 2.1.222 |
| `/install-github-app` 的 review workflow | 模板補上 `--comment` 和一行 `claude_args`，之前那份會跑完但不在 PR 上留言 |
| self-hosted runner | 伺服器可以下發 hook 腳本到 runner 上落地執行，九種事件都能掛 |
| `/commit-push-pr` | `--force`、`--amend`、`--no-verify` 這類旗標不再自動放行 |
| `/code-walkthrough`、`/pr-explainer` | 兩個內建技能從執行檔裡整個消失，changelog 沒提 |
| plugin marketplace | 多一種 `command` 來源：本機指令印出外掛目錄，每個 session 重新解析，不用重開 |
| workflow 扇出 | 同前綴的 sibling agent 錯開送出去吃 prompt cache，`CLAUDE_CODE_WORKFLOW_PREFIX_STAGGER_MS=0` 關掉 |
| 容器 CPU | dynamic workflow 之前讀主機核心數，現在讀容器給的上限 |
| `claude remote-control --continue` | 只是補了文件和 help 文字，旗標 2.1.200 就能用 |
| `ListAgents` | 斷線的 Remote Control 標成 `offline`，你自己的雲端 session 標 `cloud` |

其餘二十幾條裝上去就有：串流時長回應會消失一半又印兩次、工具參數不是字串時崩到錯誤畫面（連帶 `--resume` 也開不起來）、終端太窄時進度條和表格觸發 RangeError、Windows 的 `\\?\` 與 UNC 路徑、MCP OAuth 改用 `127.0.0.1`、關掉 attribution header 的人 auto 模式每個工具都失敗、IDE 診斷幾千條時的 UI 卡頓、file watcher handle 洩漏，還有沙箱網域清單裡的 IPv6 字面值改成帶方括號。

## 為什麼要改

review workflow 那條修的是產生器裡的模板，不是執行時的行為。228 產出來的 `prompt` 是 `/code-review:code-review <repo>/pull/<n>`，沒有 `--comment`，也沒開 inline comment 的工具，所以 job 亮綠燈、PR 上一個字都沒有。229 的模板兩行都補上了（本機實測，比對兩版執行檔內嵌的 `claude-code-review.yml`）：

```yaml
prompt: '/code-review:code-review --comment ${{ github.repository }}/pull/${{ github.event.pull_request.number }}'
claude_args: '--allowedTools "mcp__github_inline_comment__create_inline_comment"'
```

模板換了不會回頭改已經 commit 進你 repo 的那份，只能自己動手。

runner 那條方向不同，是把 managed 環境的行為搬到自架的。runner session 現在會收伺服器下發的一組 hook：`{event, filename, script}` 的陣列，落地在 `hooks/.ccr-launcher/`，目錄權限 0700，檔名只收 `.py` 和 `.sh`，單支上限 128 KB，事件從 `SessionStart` 到 `PreToolUse` 共九種（本機實測，228 完全沒有這段程式）。

官方文件沒有寫這一段。最接近的是 [self-hosted runner reference](https://code.claude.com/docs/en/self-hosted-environments-reference) 的 `--confine-repo-settings`，講的是反方向：repo 自帶的 `disableAllHooks` 會被當成越權標出來。229 新增的一行 log 正好接上這個場景，repo 設了 `disableAllHooks: true`，伺服器那組 hook 會連同 Stop reply-gate 一起被丟掉，session 跑完但你收不到回覆。

`/commit-push-pr` 收緊自動放行是同一種顧慮，只是規模小得多。那支技能原本會替你把整串 git 指令放過去，包含 `--force` 和 `--amend`。

## 對你的流程有什麼影響

1. 升上去。`latest` 和 `next` 同一版，`stable` 還在 2.1.222，腳本裡 pin `stable` 的一樣拿不到。
2. 任何跑過 `/install-github-app` 的 repo，打開 `.github/workflows/claude-code-review.yml` 對一下：`prompt` 那行要有 `--comment`，下面要有那行 `claude_args`。缺一個，review 就只是跑完而已。不想手改就重跑 `/install-github-app`，它會另開分支。這個 repo 沒裝這支 workflow。
3. `/commit-push-pr` 以後遇到 `--amend` 之類會停下來問。日常出刊用不到，真的要改上一個 commit 就自己按過。
4. `/code-walkthrough` 和 `/pr-explainer` 打不出來了，執行檔裡連字串都不剩（本機實測）。有寫進哪支技能或 alias 的現在改掉，不然下次是叫不動而不是報錯。
5. 在有 CPU 上限的容器裡跑 dynamic workflow，這版才會讀容器的上限，之前讀的是主機核心數。不用設定。
6. 扇出的錯開是預設開的，覺得起步變鈍再 `CLAUDE_CODE_WORKFLOW_PREFIX_STAGGER_MS=0`。
7. `claude remote-control --continue` 不用等 229。[官方文件](https://code.claude.com/docs/en/remote-control)寫明 2.1.200 起就能用，這版只是把它寫進去。
8. 沒在跑 self-hosted runner 的，那組下發 hook 不用管。有在跑的，`disableAllHooks` 別放進 repo 的 `.claude/settings.json`。

---

*版本與發佈時間、`dist-tags` 取自 npm registry。`--continue` 的最低版本引自 code.claude.com 的 Remote Control 頁（官方文件）。`claude-code-review.yml` 模板差異、`launcher_hooks` 的落地路徑與事件清單、兩支內建技能的消失，都來自本次下載的 2.1.228 與 2.1.229 linux-x64 執行檔比對（本機實測）。伺服器下發 hook 這件事在官方文件裡目前查不到。這個 session 的 egress policy 擋掉 api.github.com，repo 的 `pushed_at` 沒取到。*

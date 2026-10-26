---
title: "沒有新版：2.1.310 補的那句提示，說的是 `bypassPermissions` 關不掉的那個 ask"
description: "2.1.310 之後 50.9 小時沒有新東西。這天的收穫是一句字串：310 的「Improved auto mode's prompt」只換掉一行解釋，而那行解釋補上的，是開了 blockReadsOutsideWorkingDirectories 之後 Bash 側多出來的人工關卡，allow 規則和 bypassPermissions 都蓋不掉。"
published: 2026-10-26
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "sandbox", "auto-mode"]
annotation: "它問的不是路徑，是「這條指令我讀不懂」。"
---

## 改了什麼

沒有新版。

| 項目 | 一句話 |
| --- | --- |
| 24 小時內 | 沒有東西上架。2.1.310 是 10-23 21:20 UTC 上 npm，查的時候 50.9 小時 |
| `latest` / `next` | 2.1.310 |
| `stable` | 2.1.308，上架到現在 91.9 小時，和昨天一樣落後兩版 |
| repo 時間 | 這個容器還是打不到 `api.github.com`，`pushed_at` 今天也沒有 |
| CHANGELOG | 最上面還是 `## 2.1.310`，和 npm 的版號對得上 |
| 310 的 Improved auto mode's prompt | 動的是一個字串。沙箱沒在擋的那個分支換了寫法，結尾多一句 `Auto mode asks before each shell command it can't check.`（執行檔比對） |
| 底下的行為 | 309 一模一樣。三個 ask 的建構式、`outsideReadsBlocked` 那筆設定的六個欄位，都沒動（執行檔比對） |
| 誰落在那個分支 | `sandbox.enabled` 沒開（預設 `false`）、filesystem 規則是 relaxed、有人設了 `allowManagedReadPathsOnly`、工作目錄名字含 glob 字元。Windows 永遠在這邊 |
| 會被攔下來問的形狀 | 子 shell、`python -c` 這類 inline code、從 stdin 餵進去的程式、一條指令裡兩個以上的 `cd`、路徑要跑起來才知道的重導向、不在白名單上的 sed script |
| 這個 ask 的分類 | `safetyCheck`、`circuitBreaker: "outsideReadsBlocked"`、`classifierApprovable: false`、`bypassImmune: true` |
| allow 規則 | 這幾個 ask 不帶 `bashAllowRuleOverridable`，寫 allow 蓋不掉 |
| 誰能打開這個 block | 任何一份 settings 寫 `true` 就算，repo 的 `.claude/settings.json` 也算（本機實測：2.1.310 的 `doctor` 收下不抱怨，值寫成字串才報 Expected boolean） |
| repo 加的目錄 | 不算工作目錄。所以 repo 能幫你把 block 打開，不能幫你放寬 |

另外 25 條在 10-24 那篇都寫過了。

## 為什麼要改

309 的舊解釋只講了不會變的一半：沙箱指令在這台機器上沒有受影響，括號裡列了四個原因。會變的那一半，[settings reference](https://code.claude.com/docs/en/settings-reference#permissions-blockreadsoutsideworkingdirectories) 早就寫了：

> A Bash command the shell parser can't trace, such as one that changes directory more than once or runs a subshell, prompts you even in auto mode and `bypassPermissions` mode. The prompt appears even when the command names no path outside the working directories.

在那個對話框上按下「No, and block reads outside the working directories from now on」的人，看到的解釋是檔案工具以後會拒絕，加上沙箱那邊不受影響。他實際拿到的是 Bash 側多一道只有人能過的關卡，而那道關卡跟指令有沒有碰到工作目錄外的路徑無關。310 補的就是這句。

社群踩的是同一件事。[#91479](https://github.com/anthropics/claude-code/issues/91479) 的回報人開了 block 之後每次 `gh` 都被攔，訊息說路徑是跑起來才算出來的，可他的參數只有 PR 號碼、`--repo` 和 `--jq`，連檔名都沒有。他寫了 allow 規則，照樣被問。[#91629](https://github.com/anthropics/claude-code/issues/91629) 是另一個形狀：目錄都加進去了還是每次問。兩張都還開著。

## 對你的流程有什麼影響

1. 四份 settings 一起查，不要只看 user 那份：

```bash
grep -l blockReadsOutsideWorkingDirectories \
  ~/.claude/settings.json .claude/settings.json .claude/settings.local.json 2>/dev/null
```

   一行都沒印就跳過剩下的。印出 `.claude/settings.json` 的，是那個 repo 幫你開的。

2. 有開的話，接著看沙箱有沒有真的在擋：

```bash
python3 -c "import json,os;p=os.path.expanduser('~/.claude/settings.json');print(json.load(open(p)).get('sandbox','(unset)'))"
```

   印 `(unset)` 就是沒開。這種狀態下 block 真正守住的只有 Read、Grep、Glob 和 LSP 四個工具。Bash 那邊靠問你撐著，上面那排形狀會一個一個跳出來。

3. 要留著 block 就把沙箱一起開，而且加上 `failIfUnavailable`：

```json
{
  "sandbox": { "enabled": true, "failIfUnavailable": true },
  "permissions": { "blockReadsOutsideWorkingDirectories": true }
}
```

   少了 `failIfUnavailable`，沙箱起不來的時候指令會安靜地跑在外面，你就退回第 2 點的狀態。10-24 那篇第 4 條的 AppArmor 限制正是會讓它起不來的原因，Ubuntu 和 WSL2 上這兩件要一起做完。

4. `/add-dir` 在這裡沒用。它問的不是路徑，是「這條指令我讀不懂」，加目錄改不了指令的形狀。真的只想讓這幾個 ask 消失，辦法只有把 `blockReadsOutsideWorkingDirectories` 拿掉，連那四個工具的保護一起放掉。

5. 不要拿 `--dangerously-skip-permissions` 繞。這幾個 ask 的 decisionReason 是 `safetyCheck`，而把 ask 轉成 allow 的那條判斷明文排除 `safetyCheck`。繞不動。

6. 排程跑 `claude -p` 的機器，照第 1 點掃一遍。文件只說「第一次讀到工作目錄外」那個對話框在 `-p` 和背景 session 不出現，沒說 Bash 這幾個 ask 在沒人能回答的時候算什麼。我今天沒把 `-p` 跑起來驗，所以寧可讓那幾台機器一開始就沒有這個鍵。

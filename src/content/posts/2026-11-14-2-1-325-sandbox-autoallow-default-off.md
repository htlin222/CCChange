---
title: "2.1.325：sandbox 自動放行預設關掉，排程叫 skill 要先寫 Skill() 規則"
description: "139 條 changelog，兩條會動到無人值守的流程：沙箱裡的 Bash 不再自動放行，排程和 /loop 遇到宣告 allowed-tools 的 skill 會停下來等人。這個 repo 的出刊排程剛好中第二條。"
published: 2026-11-14
category: "Changelog"
tags: ["claude-code", "changelog", "sandbox", "permissions", "skills", "scheduled-tasks"]
annotation: "allowed-tools 的授權不看 workspace trust，沒信任過的資料夾裡 -p 跑也照給。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.325 | 11-13 20:07 UTC 上 npm，寫這篇的時候 4.1 小時。139 條，`stable` 還停在 2.1.311 |
| 2.1.324 | 85 分鐘前上的那一版，changelog 裡沒有它的區塊 |
| `sandbox.autoAllowBashIfSandboxed` | 預設從 true 翻成 false，沙箱裡的 Bash 回到正常權限流程 |
| 排程任務和 `/loop` | 遇到宣告 `allowed-tools` 或 hooks 的 skill 會先問人，allow 清單裡有 `Skill(名字)` 才會自己跑完 |
| 唯讀 git 命令 | 在不是專案、你也沒信任過的 repo 裡要先問。免問要用 `--add-dir`，`additionalDirectories` 不算 |
| Bash 權限檢查 | 又三條同形狀的洞：有些複合命令跑得過、allow 規則放行的可能是別的程式、重啟後才回來的核准不吃 deny |
| `Read(./.env)` 這種相對規則 | `cd` 之後不再失效，而且擴到 added directories |
| zstd 回應解碼 | 一個安全問題，排在 325 清單第一條 |
| `sonnet[1m]` | 存好的這個設定在新機器安裝時會被改寫成 API 不收的 model id，修掉了 |
| Artifact 的 deny 和 ask 規則 | 在部分雲端 session 裡原本沒生效，hooks 也一樣 |

剩下的落在 VS Code、MCP 重連、Windows 的磁碟機代號大小寫、OpenTelemetry 和 Claude Tag 上。

## 為什麼要改

autoAllow 的預設值一直開得比它的風險寬。323 的二進位裡，這個 key 自己的說明是 `still defaults to true, so set it to false to keep prompting`；324 和 325 換成了這句：

> Default: false, so sandboxed commands go through the same permission flow as any other command.

[官方 sandboxing 那頁](https://code.claude.com/docs/en/sandboxing)到現在印的還是舊的那句，說它 still defaults to true。社群對這個開關的回報累積了一陣子，最難看的一條是它連「把沙箱關掉」的命令都一起自動放行。

skill 那條的理由，[skills 文件](https://code.claude.com/docs/en/skills)自己講得很清楚：allowed-tools 的授權 `Workspace trust doesn't gate this field`，你從沒信任過的資料夾裡 `-p` 跑，repo 裡的 skill 一樣拿得到它要的工具。有人坐在前面時這只是省一次按鍵，排程沒有這個人，所以 325 把這種情況切出來單獨問。

324 掛名的東西我比對過。沙箱 schema 那句、`pluginDigests`、`failIfUnavailable`、`teammateMode` 的字串在 324 和 325 完全一樣，跟 323 都不同，所以 325 的 changelog 大半是 324 就進去的東西。兩版的執行檔不一樣，差在哪我沒驗出來。

## 對你的流程有什麼影響

1. 這個 repo 的出刊排程自己就中第二條。`.claude/skills/humanizer-zh-tw/SKILL.md` 的 frontmatter 宣告了 `allowed-tools`，而 `.claude/settings.json` 的 allow 清單裡沒有 `Skill(humanizer-zh-tw)`。雲端排程升上 325 以後，humanizer 那一步會停下來等放行，沒人按就卡在那裡。
2. 補規則另外開一支 PR，把 `"Skill(humanizer-zh-tw)"` 加進 `permissions.allow`。別跟講義混在一起，auto-merge 拿檔案路徑當閘門，動到 `.claude/` 整支就要等人審。
3. 把 `~/.claude/skills/` 底下宣告過 `allowed-tools` 的 skill 列一次：`grep -l allowed-tools ~/.claude/skills/*/SKILL.md`。會被排程或 `/loop` 叫到的，照名字補 `Skill()`；只有你手動叫的不用動。
4. 本機沒開 sandbox 就不用管 autoAllow，但先確認一次有沒有寫過。`grep -n autoAllowBashIfSandboxed ~/.claude/settings.json .claude/settings.json` 有結果而且是 true，那現在才是你真正要的值，留著。
5. 雲端不受影響。hosted container 本來就沒有 command sandbox，325 還改成不管 `sandbox.failIfUnavailable` 設了什麼都照開。
6. 有用 `additionalDirectories` 指到別的 repo 去跑 `git log` 或 `git diff` 的流程會開始問人。把那個路徑改成啟動時的 `--add-dir`。
7. 新機器裝完發現 model 那行是 API 不收的值，就是 `sonnet[1m]` 被改寫那條，升上來不會再發生。
8. deny 規則的範圍變大了。這個 repo 的 `Read(./.env)` 現在 `cd` 到子目錄和 added directories 都算得到，不用改。
9. 要裝就裝 325，不要 pin 324。zstd 那條安全修正只掛在 325 名下。

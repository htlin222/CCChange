---
title: "2.1.222：changelog 寫 Removed ultraplan，關掉的是一個遠端 flag"
description: "21 條更新，其中一條是「Removed ultraplan feature」。那支指令的程式碼在 2.1.222 裡完好無缺，關掉它的開關由伺服器發下來，而且就存在你自己機器上的一個 JSON 檔裡。"
published: 2026-08-05
category: "Changelog"
tags: ["claude-code", "changelog", "ultraplan", "worktree", "feature-flag"]
annotation: "「移除」在這裡的意思是有人翻了一個你看不到的開關。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| `/ultraplan` | 把規劃工作丟到 Claude Code on the web 上跑的指令。changelog 寫 Removed，但指令註冊、提示詞、逾時設定都還在執行檔裡 |
| worktree 隔離 | 攔截範圍從 Bash 擴到檔案編輯，而且每一種 session 都算，不再只擋 subagent |
| Remote Control 自動啟動 | repo 層的 `remoteControlAtStartup: true` 現在會印一行「已忽略」。它本來就沒生效過 |
| `SendMessage` | summary 太長不再整包送失敗，改成截斷 |

其餘十七條是修 bug：`/usage` 把用量過度歸給 MCP server、「Connection closed mid-response」誤報、HTTPS proxy 後面的啟動連線檢查卡死、org 限制下 subagent 的 model alias 掉回上一級。升級就有，不用做事。

## 為什麼要改

先講 ultraplan，因為那個動詞用錯了。

它的啟用判定在兩版之間沒動過，只有 minifier 換了符號名：

```console
$ V=~/.local/share/claude/versions
$ strings -a $V/2.1.221 | grep -o 'function jHe(){[^}]*}'
function jHe(){return Xe("tengu_ultraplan_config",null)?.enabled===!0&&T$t()&&!Ra()}
$ strings -a $V/2.1.222 | grep -o 'function kHe(){[^}]*}'
function kHe(){return Qe("tengu_ultraplan_config",null)?.enabled===!0&&FNt()&&!qa()}
```

`Xe` 和 `Qe` 是同一支 GrowthBook 取值函式，第二個參數是取不到時的預設值。`tengu_ultraplan_config` 由伺服器發，預設 `null`，`?.enabled` 就是 undefined，指令於是不出現。那份快取躺在你家目錄裡，可以直接讀：

```console
$ python3 -c 'import json,os;print(json.load(open(os.path.expanduser("~/.claude.json")))["cachedGrowthBookFeatures"]["tengu_ultraplan_config"])'
{'enabled': False}
```

上面這段話管的是 ultraplan 這條路徑，不是整個執行檔。兩個執行檔差了 771,552 bytes，`wc -c` 一分鐘就看得出來，別把它讀成「什麼都沒改」。

Remote Control 那條的動機是安全：clone 回來的 repo 不該有辦法自己打開遠端控制。但 2.1.221 的判定就已經只認 policy、flag、user 三個來源了，repo 層的設定只有在寫 `false` 的時候會被理會：

```console
$ strings -a $V/2.1.221 | grep -o 'function ulv(){.\{0,160\}'
function ulv(){if(Lr("projectSettings")?.remoteControlAtStartup===!1||Lr("localSettings")?.remoteControlAtStartup===!1)return!1;return Lr("policySettings")?.remoteContro
```

2.1.222 把這段抽成 `ect()`，來源清單原封不動，多的是一行告訴你設定被忽略的訊息。[官方 changelog](https://code.claude.com/docs/en/changelog) 把它寫成 "can no longer turn it on"，讀起來像行為變了。沒有變，變的是它現在會講。

## 對你的流程有什麼影響

1. 在任何 repo 的 `.claude/settings.json` 或 `.claude/settings.local.json` 寫過 `remoteControlAtStartup: true` 的，那行從來沒生效過，刪掉。真要開就跑 `/config`，值會落在 `~/.claude/settings.json`。寫 `false` 關掉的仍然有效。
2. 有跑 background session 或 `isolation: "worktree"` 的，這版開始檔案編輯也會被擋。要整個關掉是在 `.claude/settings.json` 加 `"worktree": {"bgIsolation": "none"}`。
3. `/ultraplan` 現在叫不動，從腳本和 alias 裡拿掉。但別把它當成已經消失的功能刪乾淨：程式碼還在，開關在伺服器那端，翻回來的時候不會有 changelog 通知你。
4. 之前為了閃 `SendMessage` 長度限制、自己先切字串的，那段可以拆了。

---

*條目與官方說法引自 changelog（官方文件）。ultraplan 與 `remoteControlAtStartup` 的判定來自本機 2.1.221、2.1.222 執行檔，指令與輸出如上（本機實測）。*

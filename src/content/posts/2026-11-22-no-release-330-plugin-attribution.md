---
title: "2.1.330：沒有新版，plugin 在雲端抓不到時終於講得出理由"
description: "28.9 小時沒有新版。回頭挖 330 跟 plugin 有關的兩處：managed git 擋掉存取時會說是哪一種擋法，/mcp 把 plugin 帶來的 server 從內建清單裡拆出來。這支出刊 session 兩條都用不到，因為它的 plugin 全是從 claude.ai 同步下來的。"
published: 2026-11-22
category: "Changelog"
tags: ["claude-code", "changelog", "plugins", "mcp", "cloud"]
annotation: "雲端容器裡根本沒有 marketplace 那幾個檔案。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 沒有新版 | 330 還是 11-20 19:16 UTC 那一版，我查的時候過了 28.9 小時 |
| changelog | 最上面一節還是 2.1.330，沒長出新的 |
| 通道 | `latest` 和 `next` 都指 330，`stable` 還停在 2.1.323 |
| 時間來源 | `gh api` 在這個容器照樣 403，`pushed_at` 拿不到，上面的時間都是 npm 的 |
| 抓不到 plugin 的理由 | 330 新增 `Anthropic-managed git refused access to …`，底下分 `not-in-session`、`no-github-connection`、`other`。329 的二進位裡這些字一個都沒有（本機實測） |
| `/mcp` 分組 | plugin 帶來的 server 從內建清單裡拆出來，改站在 Plugin MCPs 底下，旁邊標 `/plugin to manage`。這兩個標題 329 也沒有（本機實測） |
| 這台容器 | `installed_plugins.json`、`known_marketplaces.json`、`marketplaces/` 三個都不存在，plugin 全是 `@synced`，躺在 `~/.claude/plugins/synced/` 底下（雲端實測） |
| 等授權的 server | `mcp-needs-auth-cache.json` 裡 17 筆，key 全長這樣：`plugin:marketing:figma` |

## 為什麼要改

330 之前，雲端 session 抓不到某個 plugin 的 repo，你拿到的只有「它沒載進來」這個結果，沒有理由。330 把理由寫進訊息裡：

> Plugin `"<name>"` couldn't be fetched: `<repo>` isn't one of this session's repositories, or the marketplace names it wrong. If your access and your organization allow it, you can choose that repository when you start a session, or ask Claude to add that repository to this session.

另外兩種是 GitHub 沒接起來，以及要 self-hosted runner 的管理者自己去翻 debug log。

它補的是文件早就寫明、現場卻看不出來的那一段。[plugin 載入那頁](https://code.claude.com/docs/en/plugins/loading)講得很白：雲端 session 不會去加 repo 在 `extraKnownMarketplaces` 列的 marketplace，因為那要過工作區信任對話框，而那個框在雲端從來不出現。同一頁還列了 external source 的 plugin 只有四個地方設 `true` 才會去抓，你的 user settings、不進 git 的 `.claude/settings.local.json`、`--settings`、managed settings。進了 git 的那份 `.claude/settings.json` 不在名單上。

`/mcp` 那邊是另一種看不見。這台容器有 17 台 server 在等授權，330 之前它們跟內建的混在同一份清單裡，壞掉一台你看不出是哪個 plugin 帶來的。

## 對你的流程有什麼影響

1. CCChange 這支出刊 session 不用管 managed git 那條訊息，它永遠不會跳。容器裡沒有 `known_marketplaces.json` 也沒有 `marketplaces/`，plugin 一個都不是從 git 抓來的，全部走 claude.ai 的 catalog 同步，manifest 裡寫的是 `"marketplaceKind": "anthropic_catalog"`。

2. 想讓某個 plugin 在雲端 session 跟著跑，別寫進這個 repo 的 `.claude/settings.json`，那份檔案沒有抓 external source 的權限。走 repo 這條路就放進 `.claude/skills/`。這個 repo 的 `daily-changelog-post` 和 `humanizer-zh-tw` 正是這樣擺的，兩個都沒有 `.claude-plugin/plugin.json`，所以是當普通 skill 載進來，雲端照樣吃得到。要整包 plugin 就去 claude.ai 帳號那邊開，它會以 `@synced` 進來。

3. 哪天要在雲端用自己的 marketplace repo，先確認它在 session 的 repo 清單裡，不然就在 session 裡叫 Claude 加進來。330 之後至少會講明是哪一種擋法，不用再自己猜。

4. 下次在終端機開 `/mcp`，從 Plugin MCPs 那一組看起，server 的頁面現在會寫它屬於哪個 plugin。

5. 雲端這邊開不了面板，要查哪台 server 卡在授權就直接讀檔：

   ```bash
   python3 -c "import json;print(*json.load(open('$HOME/.claude/mcp-needs-auth-cache.json')),sep='\n')"
   ```

   key 的格式是 `plugin:<plugin>:<server>`，plugin 名字就在中間那段，不用再去對照面板。

6. 本機已經在 330 就沒別的事要做。還沒升的話昨天那幾條照舊。

---
title: "沒有新版：2.1.283 第三天，2.1.282 動 installed_plugins.json 會順手刪掉別的紀錄"
description: "latest 停在 2.1.283 五十三小時。今天驗的是 plugin 那批修復裡最貴的一條：檔案有一筆讀不懂的紀錄時，2.1.282 的下一次寫入會把整份清單換掉，而且回報成功。2.1.283 改成留一份副本或乾脆不寫。"
published: 2026-09-28
category: "Changelog"
tags: ["claude-code", "changelog", "plugins", "settings"]
annotation: "回報成功，清單只剩它剛裝的那一個。"
---

## 改了什麼

沒有新版。`latest` 還是 2.1.283，09-25 18:46 UTC 上 npm，到現在 53.6 小時。

| 項目 | 現況 |
| --- | --- |
| `latest` | 2.1.283，沒動 |
| `stable` | 2.1.274，第十一天 |
| `~/.claude/plugins/installed_plugins.json` | 記著每個 plugin 的 `scope`、`installPath`、`version`。session 啟動時就從這裡讀（官方文件） |
| 檔案裡有一個不能用的 plugin id | 2.1.282 的 `plugin list` 回「No plugins installed」，整份當沒讀到；2.1.283 正常列（本機實測） |
| 同一個檔案，2.1.282 再裝一個 plugin | 寫完之後清單只剩剛裝的那一個，原本真的裝著的那個紀錄沒了，回報成功（本機實測） |
| 同一個檔案，2.1.283 再裝一個 plugin | 真紀錄留著，壞掉的那個 key 被搬到旁邊的 `installed_plugins.set-aside.<日期>.<hash>.json`（本機實測） |
| 檔案裡有一筆這個版本讀不懂的紀錄 | 2.1.282 一樣靜靜換掉整份；2.1.283 直接拒絕寫，指名是哪一筆，給三條救法（本機實測） |
| 檔案被截斷（寫到一半被砍、磁碟滿） | 兩個版本都救不回紀錄。2.1.283 會把原始 bytes 留成 `installed_plugins.unreadable.<日期>.<hash>.kept`，但一個字都不講（本機實測） |
| 紀錄掉了以後 | plugin 的檔案還在 `cache/` 底下，`plugin list` 就是不列它（本機實測） |
| 兩個只差大小寫的 plugin id | 2.1.282 的 `plugin uninstall` 會做一半：enabledPlugins 的那筆拔掉了，plugin 還裝著，然後叫你去手改 settings。2.1.283 做完（本機實測） |
| 檔案格式 | 兩版都寫 `"version": 2`，互相讀得懂，所以「讀不懂」這條今天要靠手改或更新的版本才踩得到（本機實測） |
| repo 的 `pushed_at` | 這個容器擋掉 `api.github.com`，這次還是沒拿到 |

2.1.283 那 94 條裡 plugin 佔了十六條，其他的沒細講：`plugin validate` 收緊、`plugin details` 少算 MCP server、家目錄搬過之後的 cache-miss、`--plugin-dir` 失敗時多印 `path`。

## 為什麼要改

[plugin 載入文件](https://code.claude.com/docs/en/plugins/loading)把這個檔案的地位寫得很清楚：

> Plugins load at session start from installed_plugins.json and the cache without using the network.

所以 Claude Code 知道你裝過什麼，靠的就是那份清單。plugin 的檔案躺在 `cache/` 裡不會消失，可是少了那一行，Claude Code 不知道要載它，`plugin list` 也不列。我拿一個真的裝好的 probe plugin 試：把檔案截掉一半，2.1.282 裝第二個 plugin，回報成功，清單剩一筆。原本那個的 `cache/ccchange-probe/demo/0.0.1` 還在原地。

同一頁還提到一件連帶的事：

> The sweep runs only while installed_plugins.json records at least one install.

舊版本目錄那個十四天的清理只在清單至少有一筆的時候跑。清單一空，孤兒目錄就永久留著。2.1.283 多了一句 debug 訊息講這件事，寫 installed_plugins.json could not be read, so which flat folders are still referenced is not known。

2.1.283 改的地方在讀不懂的時候要不要覆蓋。能用的紀錄留下來，不能用的 key 搬去旁邊，整份都讀不懂就不寫。

拒絕寫那條我覺得是對的，它把選擇還給你。截斷那條就有點敷衍：bytes 留了，訊息一個字沒有。我跑那次的終端機輸出只有一行 Successfully installed plugin，`.kept` 檔案是我自己 `ls` 才看到的，不 `ls` 就不會知道它在那裡。

## 對你的流程有什麼影響

1. 先確認你那份讀得懂。這個檔案裡沒有祕密，直接看：

   ```bash
   python3 -m json.tool ~/.claude/plugins/installed_plugins.json | head -30
   claude plugin list
   ```

   JSON 過了、`plugin list` 也列得出東西，就沒事。JSON 過了但 `plugin list` 說 No plugins installed，那你踩到的是這篇講的第一種：裡面有一筆讀不進來的東西，而 2.1.282 不會告訴你。

2. 對照兩邊的數量。`plugins` 這個 key 有幾個 id，`plugin list` 就該列幾個：

   ```bash
   python3 -c "import json,os;print(len(json.load(open(os.path.expanduser('~/.claude/plugins/installed_plugins.json')))['plugins']))"
   ```

   對不上就別在那台機器上跑任何 `claude plugin` 指令，先把檔案複製一份出來。損失是在下一次寫入的時候發生的，所以現在還來得及。

3. 別讓兩個版本共用同一個 `~/.claude`。`stable` 停在 2.1.274 已經十一天，跟 `latest` 差九個版號。你在 2.1.283 裝的東西，2.1.274 目前讀得懂，但格式哪天跳號，先寫的那個版本就會被後跑的舊版清掉。我自己的做法是舊版一律配 `CLAUDE_CONFIG_DIR` 指到別的資料夾，反正 plugin 清單本來就不需要共用。

4. 任何 `claude plugin` 指令跑完，看一眼旁邊有沒有新檔案：

   ```bash
   ls ~/.claude/plugins/ | grep -E 'set-aside|unreadable'
   ```

   `.set-aside.<日期>.<hash>.json` 是被搬走的壞 key，多半可以不管。`.unreadable.<日期>.<hash>.kept` 是你原本那份檔案的 bytes，裡面有你裝過什麼的清單，要重建就靠它，而且它出現的時候畫面上不會有任何提示。

5. 兩個 plugin id 只差大小寫的話，在 2.1.283 才去卸。我裝了 `demo` 和 `Demo`，2.1.282 卸 `demo` 會停在半路：enabledPlugins 裡 `demo@ccchange-probe` 那筆已經拔掉了，plugin 本身還裝著，錯誤訊息說它 still switched on，叫你自己去 settings.json 動手。照著做就只剩 `Demo` 那筆可以拔，等於關掉另一個 plugin。2.1.283 同一組操作一次做完，`Demo` 沒被碰到。

6. 還沒升到 2.1.283 就升。前兩天那兩條（關掉 telemetry 的 session 會開在 auto mode、`/context` 開始算 MCP server instructions）都在這版，這條也在。升完之後這個檔案還是沒有備份機制，所以第 2 點那個數量對照值得偶爾跑一次，尤其在你手改過它之後。

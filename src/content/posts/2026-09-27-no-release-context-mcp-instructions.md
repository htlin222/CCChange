---
title: "沒有新版：2.1.283 第二天，`/context` 之前沒算過 MCP server instructions"
description: "latest 停在 2.1.283 快三十小時。今天驗的是 /context 那一列新欄位：它補的不是排版，是一段本來完全沒被算進總數的 token。順手抓到內建 keybindings 速查表講錯兩件事。"
published: 2026-09-27
category: "Changelog"
tags: ["claude-code", "changelog", "context", "mcp", "keybindings"]
annotation: "叫你去量開銷的工具，之前漏掉它自己叫你量的那一項。"
---

## 改了什麼

沒有新版。`latest` 還是 2.1.283，09-25 18:46 UTC 上 npm，到現在 29.6 小時。

| 項目 | 現況 |
| --- | --- |
| `latest` | 2.1.283，沒動 |
| `stable` | 2.1.274，第十天 |
| `/context` 的 MCP server instructions | 2.1.283 才有這一列，之前這段 token 一個都沒算進總數（本機實測） |
| 同一台 probe server，instructions 7,595 字元 | 2.1.282 總數 32.8k、沒有這列；2.1.283 總數 33.9k、這列寫 896（本機實測） |
| tool 定義被 deferred 的時候 | instructions 照樣進 context，跟 tool search 無關（官方文件） |
| 打錯的 modifier | `ctl+e` 會把 `ctl` 丟掉，這條 binding 落到裸的 `e`。兩版行為一樣（本機實測） |
| 2.1.283 多出來的 | 一句 debug 警告：`"ctl" is not a modifier, so "ctl+e" in Chat applies to "e" instead — Did you mean "ctrl+e"?` |
| 執行檔內建那份 keybindings 速查表 | 2.1.282 寫 `meta` 的 alias 有 `cmd`、`command`，chord 逾時 1 秒。兩句都是錯的（本機實測） |
| 解析器 | 兩版一個字沒差，`cmd`/`command`/`super`/`win` 都對到 cmd，多數終端機不送這顆鍵（官方文件） |
| repo 的 `pushed_at` | 這個容器擋掉 `api.github.com`，這次沒拿到 |

## 為什麼要改

MCP server 的 instructions 屬於你關不掉的那種開銷。tool 定義現在預設 deferred，[官方成本頁](https://code.claude.com/docs/en/costs#reduce-mcp-server-overhead)講得很直接：deferred 之後留在 context 裡的是 tool 名字和 server instructions，要看誰在吃空間就去跑 `/context`。可是 2.1.283 之前跑了也看不到。那段 token 一列都沒出現，總數也跟著少算，所以你之前看到的總數是少算的。

keybindings 這條的形狀不一樣。[官方 keybindings 頁](https://code.claude.com/docs/en/keybindings)一直是對的：`cmd` 那組寫成獨立一群，只有會回報 Super modifier 的終端機收得到，chord 逾時也寫 3 秒。錯的是執行檔自己帶的那份速查表。2.1.282 把 `cmd` 列成 `meta` 的 alias，chord 寫 1 秒。你叫 Claude 幫你設快捷鍵的時候，它讀的是後面這份，不是網頁。

## 對你的流程有什麼影響

1. 不用升級，2.1.283 就是頂。`stable` 停在 2.1.274 第十天了，這條 channel 你本來也沒在跟。

2. 在 2.1.283 跑一次 `/context`，把 MCP server instructions 那列的數字抄下來。這是你之前看不到的那層地板。想確認差多少，同一組設定拿兩個版本各跑一次就看得出來：

   ```bash
   npm pack @anthropic-ai/claude-code-linux-x64@2.1.282
   # 解開後 CLAUDE_CONFIG_DIR 指同一個資料夾，兩邊都跑 claude -p '/context'
   ```

   我拿一台 instructions 有 7,595 字元的假 server 量：2.1.282 總數 32.8k，完全沒有這列；2.1.283 是 33.9k，單獨列出 896。deferred 沒幫上忙，兩邊的 System tools (deferred) 都還是 21.5k。

3. 那列數字大到你不想接受的話，處理方式是 `/mcp` 把沒在用的 server 關掉，或者換回 CLI。砍 tool 數量沒有用，instructions 是 server 一連上就進來的。我自己不會為了 896 token 去動 github 那台，那組工具值這個價；要關就關你整個月沒叫過的那幾台。

4. `grep -E 'cmd\+|command\+|super\+|win\+' ~/.claude/keybindings.json`。有中的話，那幾條在任何版本都沒生效過，不是 2.1.283 才壞的。要 Ctrl 就寫 `ctrl`，要 Option 就寫 `alt`。

5. 順手抓打錯的 modifier。2.1.283 只在 debug log 講一次，平常看不到：

   ```bash
   claude --debug --debug-file /tmp/kb.txt   # 開起來馬上 ctrl+c
   grep 'not a modifier' /tmp/kb.txt
   ```

   我用 `ctl+e` 試過。2.1.282 是 0 warnings，一聲不響，binding 總數照樣 227，那條規則被當成裸的 `e` 收下了。2.1.283 同一份檔案吐 1 warning，行為沒改。那條規則是真的生效了，只是綁在裸的 `e` 上面，你在對話框外面打到 e 就會觸發。

6. 以前放棄過的 chord 值得再試一次。逾時是 3 秒，內建速查表把它寫成 1 秒，一路錯到 2.1.282。

---

*版本號與推送時間來自 npm registry 和 `downloads.claude.ai/claude-code-releases` 的 channel 檔（官方文件）。`cmd` 群組的偵測條件、chord 3 秒逾時、MCP instructions 在 deferred 之後仍進 context，來自本次抓取的 keybindings 與 costs 兩頁（官方文件）。`/context` 的兩組數字、warning 原文、binding 計數、內建速查表 1 秒與 `cmd` alias 的原始字串，來自本次用 `npm pack` 下載 2.1.282 與 2.1.283 執行檔後的實跑與字串比對（本機實測）。repo 的 `pushed_at` 因為容器擋掉 GitHub API，這次沒取得。*

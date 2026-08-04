---
title: "2.1.220：拆開執行檔，裡面一個新句子都沒有，但 2.1.218 偷渡了一支被關掉的 /whiteboard"
published: 2026-08-03
description: "changelog 對 2.1.220 只寫「Bug fixes and reliability improvements」。我把它跟 2.1.219 的二進位攤開比，新的使用者可見字串是 0 條。同一套方法在 2.1.218 挖到一支官方沒公佈、而且被 kill switch 關掉的 /whiteboard skill。"
category: "Changelog"
tags: ["claude-code", "changelog", "binary-diff", "whiteboard", "skills", "npm"]
annotation: "版本號動了，字串沒動。"
---

## TL;DR

距離 2.1.220 發佈已經 217 小時，是這個套件 476 次發佈裡的第二長沉默。既然沒有新版可寫，就拆舊的。

| 更新 | 一句話 | 你要動嗎 |
| --- | --- | --- |
| 2.1.220 這一版 | 沒有任何新的使用者可見字串、設定鍵、工具名稱或錯誤訊息 | 升不升都行。介面上你不會看到一個字不一樣 |
| workspace trust 的粒度 | 信任一個 repo 等於信任它所有 worktree 和子目錄 | 掛別人的 repo 進來之前想一下 |
| npm 上的 `@anthropic-ai/claude-code` | 只有 22 KB，是個殼，本體在八個平台專屬的 optionalDependencies 裡 | 要做私有 registry 鏡像或釘進 Docker image 的話，你要處理九個套件不是一個 |
| 版本巡檢腳本 | 直接數 `strings` 差集會被 minifier 的識別字重命名假造出幾千條「新增」 | 改成只比對純散文句子，方法在下面 |
| `/whiteboard` | 完整註冊的內建 skill，但 `isEnabled` 寫死 `false` | 不用管。你今天打 `/whiteboard` 什麼都不會發生 |

## 這解決了什麼痛點

「Bug fixes and reliability improvements」這句話等於沒說，而你要拿它決定要不要升。這是每個追版本的人每隔幾週就會撞到一次的狀況：官方給了一行字，你得自己判斷那行字後面有沒有東西。

第二個痛點更實際一點。如果你有腳本在巡版本，最直覺的做法是抽兩版的字串然後相減。這個做法會騙你，而且騙得很有數據感。bundler 每次建置產生的混淆識別字都不一樣，只要一條字串裡黏到了相鄰的識別字，它就會被算成「不同」。我這次量到 3,799 條「新增」，真正的新句子是 0 條。

第三個是 workspace trust。你按下信任的時候，粒度不是那個資料夾，是整個 repository，包含它的其他 worktree 和子目錄。這點官方文件沒有特別強調，但它決定了你掛別人的 repo 進來時實際交出去多少東西。

## 好處與官方文件

先講不好的：官方文件在這件事上幫不了你。[官方 changelog 頁](https://code.claude.com/docs/en/changelog)和 [CHANGELOG.md](https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md) 對 2.1.220 就是那一行。真正的答案在執行檔裡。

`/whiteboard` 更徹底。我抓了 [commands 參考頁](https://code.claude.com/docs/en/commands)，內建 skill 的清單是 `/batch`、`/claude-api`、`/code-review`、`/dataviz`、`/debug`、`/design-sync`、`/doctor`、`/fewer-permission-prompts`、`/loop`，沒有 whiteboard。[Skills 文件](https://code.claude.com/docs/en/skills)也沒有。搜尋 Claude Code whiteboard 出來的全是第三方的 Excalidraw MCP 和 tldraw skill，跟這個沒有關係。一支寫完了、有模板檔、有合併腳本的內建 skill，在官方文件裡不存在。

所以這篇的好處是方法而不是結論：`npm pack` 加一支會濾掉 minifier 雜訊的 diff 腳本，跑一次不用五分鐘，而它看得到的東西比 changelog 多。changelog 的內容是有人選過的，字串表沒有。

有一件事必須先說清楚。這個雲端環境的 egress policy 擋掉了 `api.github.com` 和 `github.com`，兩者都回 403，所以 repo 的 `pushed_at` 我這次拿不到。`raw.githubusercontent.com` 是通的，CHANGELOG 內容有抓到，npm registry 也在白名單裡。

## 實測驗證

這個容器沒有本機安裝的 Claude Code，`~/.local/share/claude/versions` 不存在，所以改用 `npm pack` 直接抓。

```bash
npm pack @anthropic-ai/claude-code@2.1.219 @anthropic-ai/claude-code@2.1.220
```

兩個 tarball 各 22,970 bytes，解開之後總共 7 個檔案，`bin/claude.exe` 只有 500 bytes。整包沒有 CLI 本體。看 `package.json` 就懂了：它列了八個 `optionalDependencies`，`-darwin-arm64`、`-linux-x64`、`-linux-x64-musl`、`-win32-arm64` 之類的，postinstall 跑 `install.cjs` 去挑對應平台那包。真正的執行檔在那裡面，linux-x64 版本 275 MB。

比對兩版的 wrapper，七個檔案裡六個 sha256 完全相同。唯一不同的是 `package.json`，diff 出來就是一行 `version` 加八行 optionalDependencies 的版號。

`sdk-tools.d.ts` 這份 149 KB 的 SDK 型別定義，跨 2.1.217 到 2.1.220 四個版本，唯一的改動長這樣：

```diff
-   * Overwrite without a conflict check. Use only after a 409 when you have
-   * reconciled with the other session's version and intend to replace it.
+   * Last-resort overwrite that DISCARDS another session's published version.
+   * On a 409 conflict the normal fix is to re-read the artifact, merge your
+   * edits on top of the newer content, and publish again — not force.
```

型別本身一個字沒動。他們只是覺得原本那句講得不夠嚇人，改成大寫的 DISCARDS。我很好奇中間發生了什麼事。

接著是執行檔本體。2.1.219 是 275,004,400 bytes，2.1.220 是 275,012,592，差 8,192，剛好兩個 page，聞起來像對齊 padding。sha256 不同，所以檔案確實變了。抽字串：

```bash
strings -a -n 6 claude | sort -u > s-2.1.219.txt
```

271,485 條 vs 271,456 條，set 相減多出 3,799、少了 3,828。翻一下就知道那是假的：

```
- A Claude workflow file already exists at"," ",kR.jsx(h,
+ A Claude workflow file already exists at"," ",HR.jsx(h,
```

`kR` 變成 `HR`。3,799 這個數字量的是 minifier 的心情。改成只比對純散文句子（開頭大寫、只含字母數字和常見標點、以句號結尾、至少六個詞、不含任何看起來像程式碼殘渣的東西），結果是兩邊各 6,762 句，交集 6,762 句，差集兩個方向都是零。挑功能符號再數一次也全部一樣：

| 符號 | 2.1.219 | 2.1.220 |
| --- | --- | --- |
| `DirectoryAdded` | 20 | 20 |
| `strictAllowlist` | 5 | 5 |
| `workflowSizeGuideline` | 14 | 14 |
| `ultrareview` | 75 | 75 |

要小心不要過度解讀。純邏輯的修正本來就不會產生新字串，把一個 `<` 改成 `<=` 修掉一個 off-by-one，字串表當然長得一模一樣。「Bug fixes and reliability improvements」完全可能是誠實的描述。

### 同一套方法，換一個真的有內容的版本

拿 2.1.217 和 2.1.218 跑同一套：純散文句子從 6,641 變 6,693，新增 75 句，消失 23 句。75 對 0，這就是一個真正的發佈和一個 bug fix 發佈的差別。而 2.1.218 的 changelog 有 25 條，那 75 句裡能對應到 changelog 條目的大概五、六句。

其中最大的一塊是 `whiteboard`：2.1.217 出現 0 次，2.1.218 出現 32 次，2.1.220 是 40 次。它不是散落的字串，是一支完整註冊的內建 skill：

```
name:"whiteboard",
menuDescription:"Sketch on a whiteboard Artifact you can send to Claude",
description:qVS, whenToUse:VVS, isEnabled:GVS, userInvocable:!0
```

附帶 `template.html` 和 `merge-state.mjs` 兩個檔案，SKILL.md 的內容也完整躺在裡面。`when_to_use` 那段在教模型主動開口：

> Offer it unprompted, too — at most once per session, and putting the whiteboard up only if the user says yes — when a sketch would carry the conversation better than prose, namely when the user asks for an architecture or system design, when a plan you are writing spans three or more components or traces a request or data flow, or when you are about to ask your second or third clarifying question about how the pieces connect.

拿「你正要問第二或第三個釐清問題」當觸發條件，我覺得寫得很準。文字講到那個地步通常就是該畫圖了，只是平常沒人會把這條規則寫下來。

然後是重點，它被關著：

```
function GVS(){ return OQi() && j2e() }
function OQi(){ return !1 }
```

`isEnabled` 指向 `GVS`，`GVS` 的第一個條件是 `OQi`，而 `OQi` 在整個 bundle 裡只有一個定義，回傳 `!1`。短路，永遠 false。對照組是 `loop` 那些真的能用的 skill，註冊時根本沒有 `isEnabled` 這個欄位。

我的判斷是這東西會出。一支寫好了、有模板檔、有合併腳本、連「什麼時候該主動提議」都調過語氣的 skill，通常不會是有人寫爽的，而且它從 218 的 32 條字串長到 220 的 40 條，代表這九天的沉默期間還有人在動它。但我可能錯，寫死的 `return !1` 躺個一年也不是沒發生過。

### 順手撿到的

系統提示詞在 2.1.217 到 2.1.218 之間改了四處，方向一致，都在調模型跟使用者意見不合時要怎麼辦。拒絕之後的收尾從 `offer the nearest thing you can do, and move on.` 變成 `...and move on without moralizing or criticism.`，「不要說教」是新加的。另外多了一整句 217 沒有的：`Be fair and factual in resolving disagreements about the premises, scope, or approach of the work.`

這種東西不會出現在任何 changelog 裡，但它對你每天用起來的手感影響，可能比那七個 Added 條目加起來還大。比內容更值得記的是這件事本身：Claude Code 的行為準則是明文躺在執行檔裡的，`strings` 就讀得到，而且可以跨版本 diff。

還有兩條 2.1.218 新增的字串值得留意。`Trusting it trusts that whole repository, including its other worktrees and subdirectories.` 對得上 changelog 那條 agent frontmatter hooks 要求 workspace trust 的條目，也就是上面 TL;DR 講的粒度問題。另一條是 `The URL resolves to a non-public IP at connect time. Disables immediately.`，配套理由字串是 `auto-disabled: endpoint URL resolved to an invalid address`，看起來是某個 endpoint 設定的 SSRF 防護，連線當下再解析一次位址，指到內網就直接停用。

## 下一步

1. 2.1.220 可以放著不升，介面行為不會變。要升也沒風險。
2. 如果你有腳本在巡版本，把「數 `strings` 差集」換成只比對純散文句子。不換的話它會定期報給你幾千條假新增。
3. 掛別人的 repo 進來之前，先確認你接受的是整個 repository，包含它的其他 worktree 和子目錄。
4. 要做私有 registry 鏡像或把版本釘進 Docker image 的話，去看 `package.json` 的八個 `optionalDependencies`，你要鏡像九個套件。
5. `/whiteboard` 不用去試。想追蹤它有沒有被打開，下次升級後數一次 `strings -a <binary> | grep -c whiteboard`，數字停在 40 附近就是還沒動。

---

*本文所有版本時間來自 npm registry，字串統計來自本次實際下載並解開的 tarball，官方文件內容為撰稿時抓取。`api.github.com` 在本環境被 egress policy 阻擋（403），因此沒有 GitHub repo 的 `pushed_at` 資料。*

### 參考來源

- [claude-code CHANGELOG.md](https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md)、[官方 changelog 頁](https://code.claude.com/docs/en/changelog)
- [Claude Code commands 參考](https://code.claude.com/docs/en/commands)、[Skills 文件](https://code.claude.com/docs/en/skills)
- npm registry：`npm view @anthropic-ai/claude-code time --json`、`npm pack @anthropic-ai/claude-code-linux-x64@<version>`
- [Claude Code v2.1.220 · changelogs.directory](https://changelogs.directory/tools/claude-code/releases/2.1.220)（第三方追蹤站，用來確認 2.1.220 仍是最新）
- [Anthropic explains Claude Code's recent performance decline after weeks of user backlash（Fortune）](https://fortune.com/2026/04/24/anthropic-engineering-missteps-claude-code-performance-decline-user-backlash/)

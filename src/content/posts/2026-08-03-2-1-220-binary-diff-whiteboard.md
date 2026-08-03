---
title: "第九天沒有新版：我把 2.1.220 拆開，裡面一個新句子都沒有"
description: "距離上一版 217 小時，是 476 次發佈裡的第二長沉默。既然沒新聞，就拆二進位：2.1.220 沒有任何新的使用者可見字串，而 2.1.218 偷偷帶了一支 changelog 沒提過的 /whiteboard。"
published: 2026-08-03
category: "Changelog"
tags: ["claude-code", "changelog", "binary-diff", "whiteboard", "skills", "npm"]
annotation: "版本號動了，字串沒動。"
---

## 今天要動的

| 事情 | 你要改什麼 |
| --- | --- |
| 掛別人的 repo 進來 | workspace trust 的粒度是**整個 repository，包含它所有 worktree 和子目錄**。掛之前想一下 |
| 私有 registry 鏡像 | 要鏡像九個套件不是一個。主套件只是 22 KB 的殼，本體在八個平台專屬的 optionalDependencies 裡 |
| 你的巡檢腳本 | 如果你也在追版本，改用只比對散文句子的 diff。直接數 `strings` 差集會被 minifier 的識別字重命名假造出幾千條「新增」 |

## 今天不用管的

`/whiteboard` 不要去試，`isEnabled` 寫死 `false`。2.1.220 升不升都行，介面不會有一個字不一樣。系統提示詞那四處改動沒有動作，只是解釋了為什麼最近感覺它比較不愛說教。

## 判決：第九天沒有新版

而且這次的「沒有」比昨天更值得講。檢核時間是 2026-08-03T00:10:55Z（台北時間 08:10）：

| 追蹤對象 | 最新 | 發佈時間 | 距今 |
| --- | --- | --- | --- |
| `@anthropic-ai/claude-code`（latest） | 2.1.220 | 2026-07-24T23:11:21Z | 217.0 小時 |
| 同上（stable dist-tag） | 2.1.212 | 2026-07-16T19:20:24Z | 412.8 小時 |
| `CHANGELOG.md` 最新段落 | `## 2.1.220` | 內容只有「Bug fixes and reliability improvements」一行 | commit 時間本次取不到，見下 |

昨天那篇說「連續八天安靜本身有點意思」。今天我把整份 npm registry 的發佈時間表拉下來算了一次，結果比「有點意思」誇張。

從 2025-02-24 的 0.2.6 到現在，這個套件一共發佈過 476 版。相鄰兩版的間隔中位數是 21.9 小時，平均 26.0 小時。只看 2026 年的 191 次發佈，中位數 22.6 小時。換句話說，這個專案的正常心跳是一天一版。

現在這 217 小時，排在 476 個間隔裡的第二名。

唯一比它長的是 336.5 小時，2.0.76 到 2.0.77，結束在 2026-01-06。那是元旦。全世界的工程團隊在那個星期都是這樣。而現在是八月的第一個星期，沒有明顯的理由。

我不知道這代表什麼。可能在憋一個大版本，也可能只是一批人剛好同時休假。我搜了一輪，沒有任何官方或社群的說明，第三方 changelog 追蹤站也都停在 2.1.220。所以以下純屬觀察：這個專案正在經歷它有史以來第二長的沉默，而上一次這麼久是因為過年。

有一件事必須先說清楚。這個雲端環境的 egress policy 擋掉了 `api.github.com` 和 `github.com`（兩者都回 403），所以昨天那張表裡的 `pushed_at` 我今天拿不到。`raw.githubusercontent.com` 是通的，CHANGELOG 內容有抓到；npm registry 也在白名單裡。上表沒有 GitHub repo 的時間戳，不是我忘了，是這次驗不到。

既然沒新聞，那就換個方法找東西。

## npm 上的 claude-code 只有 22 KB

我原本打算照慣例做二進位比對，但這個雲端容器沒有本機安裝的 Claude Code，`~/.local/share/claude/versions` 不存在。所以改用 `npm pack` 直接抓套件。

```bash
npm pack @anthropic-ai/claude-code@2.1.219 @anthropic-ai/claude-code@2.1.220
```

抓下來兩個 tarball，各 22,970 bytes。解開之後總共 7 個檔案：

| 檔案 | 大小 |
| --- | --- |
| `sdk-tools.d.ts` | 149,125 |
| `install.cjs` | 7,196 |
| `cli-wrapper.cjs` | 4,997 |
| `package.json` | 1,476 |
| `README.md` | 2,037 |
| `bin/claude.exe` | 500 |
| `LICENSE.md` | 147 |

`bin/claude.exe` 是 500 bytes。整包沒有 CLI 本體。

看 `package.json` 就懂了。它列了八個 `optionalDependencies`，`-darwin-arm64`、`-linux-x64`、`-linux-x64-musl`、`-win32-arm64` 之類的，然後 postinstall 跑 `install.cjs` 去挑對應平台那包。真正的執行檔在那裡面，linux-x64 版本 275 MB。

`install.cjs` 的偵測邏輯寫得挺細的，值得一提兩處。它判斷 musl 不是去 spawn `ldd`，而是讀 `process.report` 裡的 `glibcVersionRuntime` 有沒有值，註解直接寫了理由：比 spawn 快，而且避開 `ldd` 不存在時被誤判成 musl 的 ENOENT 陷阱。另外它處理了 Rosetta 2，x64 的 Node 跑在 Apple Silicon 上時 `arch()` 會回報 `x64`，程式碼裡有一段專門把它導回 arm64。

這對日常使用者沒差別。但如果你要在私有 registry 做鏡像，或想把某一版釘進 Docker image，你要處理的是九個套件而不是一個。

比對兩版的 wrapper：2.1.219 和 2.1.220 的七個檔案裡，六個 sha256 完全相同。唯一不同的是 `package.json`，diff 出來就是一行 `version` 加八行 optionalDependencies 的版號。

`sdk-tools.d.ts` 在 2.1.217 到 2.1.218 之間變過一次，之後 218、219、220 三版一模一樣。而那次變動的內容是這樣：

```diff
-   * Overwrite without a conflict check. Use only after a 409 when you have
-   * reconciled with the other session's version and intend to replace it.
+   * Last-resort overwrite that DISCARDS another session's published version.
+   * On a 409 conflict the normal fix is to re-read the artifact, merge your
+   * edits on top of the newer content, and publish again — not force.
```

整份 149 KB 的 SDK 型別定義，跨四個版本，唯一的改動是 Artifact 工具 `force` 參數的註解。型別本身一個字沒動。他們只是覺得原本那句話講得不夠嚇人，改成大寫的 DISCARDS。

## 驗屍一：2.1.220 到底改了什麼

Changelog 對 2.1.220 只寫了一句「Bug fixes and reliability improvements」。這句話等於沒說，所以我去問二進位檔。

先看大小。2.1.219 的執行檔 275,004,400 bytes，2.1.220 是 275,012,592。差 8,192，剛好兩個 page，聞起來像對齊 padding。sha256 不同，所以檔案確實變了。

然後抽字串：

```bash
strings -a -n 6 claude | sort -u > s-2.1.219.txt
```

271,485 條 vs 271,456 條。set 相減，2.1.220 多出 3,799 條、少了 3,828 條。看起來改了不少。

但那是假的。翻一下就發現絕大多數長這樣：

```
- A Claude workflow file already exists at"," ",kR.jsx(h,
+ A Claude workflow file already exists at"," ",HR.jsx(h,
```

`kR` 變成 `HR`。bundler 每次建置產生的混淆名稱都不一樣，只要一條字串裡黏到了相鄰的識別字，它就會被算成「不同」。3,799 這個數字量的是 minifier 的心情。

所以我改成只比對純散文句子：開頭大寫、只含字母數字和常見標點、以句號結尾、至少六個詞、而且不含任何看起來像程式碼殘渣的東西。

結果是這樣：

| | 2.1.219 | 2.1.220 |
| --- | --- | --- |
| 純散文句子（去重） | 6,762 | 6,762 |
| 只在此版出現 | 0 | 0 |

兩邊 6,762 句，交集 6,762 句。差集兩個方向都是零。

再挑功能符號數一次，也全部一樣：

| 符號 | 2.1.219 | 2.1.220 |
| --- | --- | --- |
| `DirectoryAdded` | 20 | 20 |
| `strictAllowlist` | 5 | 5 |
| `workflowSizeGuideline` | 14 | 14 |
| `mcp_server_errors` | 3 | 3 |
| `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` | 5 | 5 |
| `ax-screen-reader` | 5 | 5 |
| `ultrareview` | 75 | 75 |

（這些數字是去重後的唯一字串數，跟昨天那篇用 `grep -c` 直接數原始輸出的口徑不同，不要拿去互相對照。）

所以 2.1.220 這一版：沒有新的使用者可見文字，沒有新的設定鍵，沒有新的工具名稱，沒有新的錯誤訊息。

要小心不要過度解讀。純邏輯的修正本來就不會產生新字串，把一個 `<` 改成 `<=` 修掉一個 off-by-one，字串表當然長得一模一樣。「Bug fixes and reliability improvements」完全可能是誠實的描述。

但反過來說，這也把升級 2.1.220 的期望值定住了。介面上你不會看到任何一個字不一樣，所以如果你正在等某個顯示問題被修掉，這版不是。

## 驗屍二：2.1.218 有 75 句新的，changelog 提到的不到十分之一

有了上面那套方法，就可以拿它去量「一個真正有內容的版本」長什麼樣。我把 2.1.217 和 2.1.218 也抓下來跑同一套。

| | 2.1.217 | 2.1.218 |
| --- | --- | --- |
| 純散文句子 | 6,641 | 6,693 |
| 新增 | | 75 |
| 消失 | 23 | |

75 對 0。這就是一個真正的發佈和一個「bug fixes」發佈的差別，量出來大概是這個數量級。

而 2.1.218 的 changelog 有 25 條，幾乎全是 Fixed。那 75 句新句子裡，能對應到 changelog 條目的大概五、六句。其餘的東西官方一個字都沒講。

先講最大的那個。

## 有一支 /whiteboard，而且它被關著

2.1.217 的二進位裡，`whiteboard` 這個字出現 0 次。2.1.218 出現 32 次。2.1.220 是 40 次。

它不是散落的字串，是一支完整註冊的內建 skill：

```
name:"whiteboard",
menuDescription:"Sketch on a whiteboard Artifact you can send to Claude",
description:qVS, whenToUse:VVS, isEnabled:GVS, userInvocable:!0
```

附帶兩個檔案，`template.html` 和 `merge-state.mjs`。SKILL.md 的內容也在裡面，完整的：

> Create a whiteboard artifact — a freehand canvas for sketching architecture diagrams at wireframe fidelity (boxes, databases, decision diamonds, sticky notes, arrows, labels) that the user can send back to this session for planning.

`when_to_use` 那段更有意思，因為它在教模型主動開口：

> Offer it unprompted, too — at most once per session, and putting the whiteboard up only if the user says yes — when a sketch would carry the conversation better than prose, namely when the user asks for an architecture or system design, when a plan you are writing spans three or more components or traces a request or data flow, or when you are about to ask your second or third clarifying question about how the pieces connect. Make the offer one short line, for example "Want to sketch this on a whiteboard first?", then stop and wait; on a no, or no answer, carry on in prose and do not offer again.

拿「你正要問第二或第三個釐清問題」當觸發條件，我覺得寫得很準。文字講到那個地步通常就是該畫圖了，只是平常沒人會把這條規則寫下來。

官方文件裡沒有它。我抓了 [commands 參考頁](https://code.claude.com/docs/en/commands)，內建 skill 的清單是 `/batch`、`/claude-api`、`/code-review`、`/dataviz`、`/debug`、`/design-sync`、`/doctor`、`/fewer-permission-prompts`、`/loop`，沒有 whiteboard。搜尋 Claude Code whiteboard 出來的全是第三方的 Excalidraw MCP 和 tldraw skill，跟這個沒有關係。

然後是重點。它被關著。

```
function GVS(){ return OQi() && j2e() }
function OQi(){ return !1 }
```

`isEnabled` 指向 `GVS`，`GVS` 的第一個條件是 `OQi()`，而 `OQi` 在整個 bundle 裡只有一個定義，回傳 `!1`，也就是 `false`。短路，永遠 false。

（另一半 `j2e(){return "capabilities" in ONt().shape}` 是在檢查 Artifact 工具的 schema 有沒有 `capabilities` 欄位，跟 artifact runtime capabilities 有沒有開有關。但它跟不跟都沒差，前面那個已經寫死了。）

對照組：`loop` 那些真的能用的 skill，註冊時根本沒有 `isEnabled` 這個欄位。

所以誠實的講法是：`/whiteboard` 在 2.1.220 裡是完整實作但被 kill switch 關掉的功能，你今天打 `/whiteboard` 什麼都不會發生。它從 218 的 32 條字串長到 220 的 40 條，代表這九天的沉默期間有人還在動它。

要不要興奮，看你怎麼想。我的看法是：一支寫好了、有模板檔、有合併腳本、連「什麼時候該主動提議」都調過語氣的 skill，通常不會是有人寫爽的。但寫死的 `return !1` 也可能就這樣躺一年。

## 順便看到系統提示詞被改了

二進位裡有一整塊 Claude Code 自己的行為指令。既然抽了字串，就順手 diff 了一下。2.1.217 到 2.1.218 之間有四處改動。

拒絕的措辭改了：

```
217: Refusal is for requests that are genuinely harmful or clearly prohibited...
218: Refusals are only for requests that are genuinely harmful or clearly prohibited...
```

拒絕之後該怎麼收尾也改了：

```
217: ...offer the nearest thing you can do, and move on.
218: ...offer the nearest thing you can do, and move on without moralizing or criticism.
```

「不要說教」是新加的。

範圍的講法改了：`acting on what is in the request` 變成 `acting on the actual request`。

然後多了一整句 2.1.217 沒有的：

> Be fair and factual in resolving disagreements about the premises, scope, or approach of the work.

這四個改動的方向一致，都是在調「模型跟使用者意見不合時要怎麼辦」：少說教，少替使用者腦補他沒說出口的動機。這種東西不會出現在任何 changelog 裡，但它對你每天用起來的手感影響，可能比那七個 Added 條目加起來還大。

比內容更值得記的其實是這件事本身。Claude Code 的行為準則是明文躺在執行檔裡的，`strings` 就讀得到，而且可以跨版本 diff。

## 其他撿到的

`Trusting it trusts that whole repository, including its other worktrees and subdirectories.` 這句在 2.1.217 出現 0 次，2.1.218 出現 2 次。它對得上 changelog 那條「agent frontmatter hooks 現在要求 agent 檔案所在資料夾已接受 workspace trust」。所以信任的粒度是整個 repo，包含它的其他 worktree 和子目錄，這點文件沒特別強調。

`The URL resolves to a non-public IP at connect time. Disables immediately.` 也是 218 新增，配套的理由字串是 `auto-disabled: endpoint URL resolved to an invalid address`。看起來是某個 endpoint 設定的 SSRF 防護，連線當下再解析一次位址，指到內網就直接停用。

還有一批關於 memory store 和 environment 的 webhook 事件描述，其中一句是 `Individual memories and memory versions emit no webhook events at all`。以及 nested subagent 的串流語意，`A worker that does nothing but report back therefore streams no deltas at all, even with a correct opt-in on the right thread.` 這句寫得很像是被問過太多次之後補的。

## 嘻嘻的部分

字串比對騙人的程度超出我預期。3,799 條「新增」，實際上真正的新句子是 0 條。差別全在 bundler 這次心情想把 `kR` 叫成 `HR`。如果我沒有多看一眼就直接寫「2.1.220 新增 3,799 條字串」，這篇會變成一篇假新聞，而且看起來還挺有數據感的。

跨四個版本的 SDK 型別定義，唯一的改動是把一句警告改得更兇。原本說「用之前先確認你已經跟對方的版本調和過」，現在說「這會 DISCARDS 別人發佈的版本」，DISCARDS 還是大寫。我很好奇中間發生了什麼事。

最後，我是在一個連 GitHub API 都連不上的容器裡，靠 `npm pack` 一個 275 MB 的執行檔，從裡面挖出一支官方沒公佈的功能，然後發現它被 `return !1` 關掉。整個過程沒有用到任何一個 GitHub 頁面。

## 我的看法

我自己的感覺是複雜的。一方面，能從一個 275 MB 的 bundle 裡拆出這麼多官方沒講的東西，這件事很爽。另一方面，這九天的安靜配上一支被關著的完整功能，怎麼看都像是有一批東西在等一個統一的發佈時機。

昨天那篇的結論是「等下一版」。今天多了一點證據支持那個判斷，但也就是一點。`return !1` 這種東西躺個半年也不是沒發生過。

如果今天這篇有什麼可以帶走的，我會說是方法而不是結論。`npm pack` 加一支會濾掉 minifier 雜訊的 diff 腳本，跑一次不用五分鐘，而它看得到的東西比 changelog 多。changelog 的內容是有人選過的，字串表沒有。

---

*本文所有版本時間來自 npm registry，字串統計來自本次實際下載並解開的 tarball，官方文件內容為撰稿時抓取。`api.github.com` 在本環境被 egress policy 阻擋（403），因此沒有 GitHub repo 的 `pushed_at` 資料。*

### 參考來源

- [claude-code CHANGELOG.md](https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md)、[官方 changelog 頁](https://code.claude.com/docs/en/changelog)
- [Claude Code commands 參考](https://code.claude.com/docs/en/commands)、[Skills 文件](https://code.claude.com/docs/en/skills)
- npm registry：`npm view @anthropic-ai/claude-code time --json`、`npm pack @anthropic-ai/claude-code-linux-x64@<version>`
- [Claude Code v2.1.220 · changelogs.directory](https://changelogs.directory/tools/claude-code/releases/2.1.220)（第三方追蹤站，用來確認 2.1.220 仍是最新）
- [Why Developers Are Suddenly Turning Against Claude Code?](https://ucstrategies.com/news/why-developers-are-suddenly-turning-against-claude-code/)（批評向，主要談 2026 年初第三方工具存取 Opus 被收回一事）
- [Anthropic explains Claude Code's recent performance decline after weeks of user backlash（Fortune）](https://fortune.com/2026/04/24/anthropic-engineering-missteps-claude-code-performance-decline-user-backlash/)

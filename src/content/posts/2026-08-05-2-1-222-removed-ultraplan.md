---
title: "2.1.222 說它移除了 ultraplan，但那 109 個字串一個都沒少"
description: "睽違十天的兩連發第二棒，這次 changelog 寫了 21 條。其中一條是「Removed ultraplan feature」，可是拆開二進位，整套 ultraplan 還在裡面，開關在遠端。同一支執行檔還多冒出一個 changelog 沒提的 claude import，跑下去它說自己還沒做好。"
published: 2026-08-05
category: "Changelog"
tags: ["claude-code", "changelog", "binary-diff", "ultraplan", "worktree", "remote-control"]
annotation: "「移除」在這裡的意思是有人翻了一個你看不到的開關。"
---

## 今天要動的

| 事情 | 你要改什麼 |
| --- | --- |
| Remote Control 自動啟動 | 如果你在某個 repo 的 `.claude/settings.json` 或 `.claude/settings.local.json` 寫了 `remoteControlAtStartup: true`，官方說這版起無效。要開就 `/config`，值落在 `~/.claude/settings.json`。寫 `false` 關掉仍然有效 |
| worktree 隔離 | 有跑 background session 或 `isolation: "worktree"` 的話，這版把攔截從 Bash 擴到檔案編輯，而且 session 本身也被管，不再只管 subagent。指令跑到共用 checkout 會被擋下來。要整個關掉是 `.claude/settings.json` 的 `"worktree": {"bgIsolation": "none"}` |
| `/ultraplan` | 官方寫「Removed」。client 端一行沒動，關的是遠端 gate。所以不用升級也不用改設定，但別留在任何腳本或 alias 裡，它隨時會再被翻回來 |
| `SendMessage` | summary 太長不再整個 send 失敗，改成截斷。之前為了閃這個限制自己先切字串的，那段可以拆了 |

## 今天不用管的

`claude import` 是個空殼，下面會講。`/usage` 對 MCP server 的用量歸因修正、「Connection closed mid-response」誤報、`--ax-screen-reader` 的退格重讀、file watcher 崩潰、Bedrock 的 SSO profile，升級就有，不用做事。org 限制 `model: opus` 的 subagent alias 現在會降到同家族最新的可用型號而不是掉回 parent，這條只有企業帳號會遇到。

## 判決：有新版，3.6 小時前

檢核時間 `2026-08-05T00:13:05Z`（台北 08:13）：

| 追蹤對象 | 值 | 距檢核時間 |
| --- | --- | --- |
| `@anthropic-ai/claude-code` 最新發佈 | 2.1.222，`2026-08-04T20:37:17Z` | 3.60 小時 |
| 前一版 2.1.221 | `2026-08-03T22:16:25Z` | 25.94 小時 |
| 再前一版 2.1.220 | `2026-07-24T23:11:21Z` | 265.03 小時 |
| dist-tags | `stable` 2.1.220、`latest` 2.1.222、`next` 2.1.222 | |
| `CHANGELOG.md` 最新段落 | `## 2.1.222`，21 條 | |
| 官方 changelog 頁最新條目 | 2.1.222，標 August 4, 2026 | |

昨天那篇的判決是「2.1.221 上了 latest，changelog 一個字都沒寫」。今天回頭看，2.1.221 的 39 條說明已經補上去了，標的日期也是 August 4。文件確實只是慢了一天。

`stable` 還停在 2.1.220，落後 `latest` 兩版了。`api.github.com` 在這個容器裡回 403，訊息寫的是這個 session 只授權了 `htlin222/CCChange`，所以 repo 的 `pushed_at` 一樣拿不到。

## 本日一題：changelog 和執行檔對不起來，而且是兩個方向

先把兩版抓下來擺在一起。這段不需要登入，五分鐘跑得完：

```bash
cd $(mktemp -d)
npm pack @anthropic-ai/claude-code-linux-x64@2.1.222 \
         @anthropic-ai/claude-code-linux-x64@2.1.221
for v in 2.1.221 2.1.222; do
  mkdir -p x/$v && tar xzf anthropic-ai-claude-code-linux-x64-$v.tgz -C x/$v
done
```

先看 changelog 講了、但執行檔沒發生的那一半。「Removed ultraplan feature」是 2.1.222 的最後一條，也是唯一一條 Removed：

```
$ for s in ultraplan Ultraplan ULTRAPLAN; do
    printf '%-12s 2.1.221=%-4s 2.1.222=%s\n' "$s" \
      "$(strings -a x/2.1.221/package/claude | grep -c -- "$s")" \
      "$(strings -a x/2.1.222/package/claude | grep -c -- "$s")"
  done
ultraplan    2.1.221=109  2.1.222=108
Ultraplan    2.1.221=29   2.1.222=29
ULTRAPLAN    2.1.221=7    2.1.222=7
```

少一個。那個 1 是 minifier 換識別字的噪音，不是功能。逐項對過去，`type:"local-jsx",name:"ultraplan"` 兩版都是 1、`hasSeenUltraplanTerms` 都是 3、`tengu_ultraplan_launched` 都是 2、`isUltraplanMode` 都是 4。slash command 的註冊、同意條款對話框、遙測、把計畫傳回本機的 `__ULTRAPLAN_TELEPORT_LOCAL__` 協定，全部原封不動待在 2.1.222 裡。

決定它出不出現的是同一個函式，兩版邏輯一字不差：

```
=== 2.1.221 ===
function UPe(){return Je("tengu_ultraplan_config",null)?.enabled===!0&&ENt()&&!xa()}
=== 2.1.222 ===
function xPe(){return Qe("tengu_ultraplan_config",null)?.enabled===!0&&B1t()&&!ja()}
```

`tengu_ultraplan_config` 是遠端下發的設定。所以「Removed」的實際內容是有人把那個 flag 的 `enabled` 設成 false，你的執行檔完全不知情。

反方向的那一半更好玩。比對兩版的 `--help`，只差兩行：

```
$ diff <(x/2.1.221/package/claude --help) <(x/2.1.222/package/claude --help)
218a219,220
>   import [options] [source]             Import config from another AI coding
>                                         agent into Claude Code
```

changelog 二十一條裡沒有這個。`claude import --help` 說它吃 `codex` 和 `gemini` 兩個來源，有 `--dry-run`，還有一個 `--yes=<digest>` 給 headless 用。既然 `--dry-run` 不寫東西，直接跑跑看：

```
$ x/2.1.222/package/claude import codex --dry-run
`claude import` is not yet available in this build. Run `claude` and use /mcp or edit ~/.claude/settings.json directly.
$ echo $?
1
```

它自己承認沒做完。互動版的 `/import` 其實 2.1.221 就在了，掛在 `tengu_import` 這個 gate 上，預設 false 而且 `isHidden` 跟著 gate 走，所以你在 `/` 選單裡看不到它。2.1.222 新增的是最外層那個 CLI 入口，`--help` 會列，執行會拒絕。

順帶量一下尺度。撈出兩版真正是英文句子的字串（去掉 minifier 碎片，再逐條回原檔確認對面真的沒有）：2.1.221 有 15,892 句，2.1.222 有 15,948 句，其中 80 句只在新版、26 句只在舊版。執行檔從 288,705,544 bytes 長到 289,467,400，多了 0.26%。這是一個以修 bug 為主的版本，數字看起來也像。

那 80 句裡最大一叢是 worktree。`isolationRoot` 從 0 變 8、`work-tree-elsewhere` 0 變 2、`isolation worktree` 從 2 變 11。這叢對得上 changelog 的第一條。2.1.221 的拒絕訊息開頭是寫死的 "This agent is isolated in the worktree"，2.1.222 把主詞抽出來了：

> `function eun(e){return Bg()?.worktreePath===e?{noun:"This session",possessive:"a worktree-isolated session's"}:{noun:"This agent",possessive:"a worktree-isolated agent's"}}`

以前只有 subagent 會被念，現在 session 自己也會。同一批新字串裡還有一條上工前的檢查，看的是 `core.worktree` 有沒有被改去指別的地方：

> Refusing to use ${e} as an isolation worktree: git resolves its working tree to ${c.topLevel} (a core.worktree redirect, or a checkout discovered above it), so commands run there would write outside the worktree.

## 我的看法

Remote Control 那條我讀完二進位有意見。changelog 寫的是「Changed Remote Control auto-start so repo-local settings can no longer turn it on」，聽起來是行為改了。可是 2.1.221 的取值鏈長這樣：

```
=== 2.1.221 ===
if(Or("projectSettings")?.remoteControlAtStartup===!1||Or("localSettings")?.remoteControlAtStartup===!1)return!1;
return Or("policySettings")?.remoteControlAtStartup??Or("flagSettings")?.remoteControlAtStartup
     ??Or("userSettings")?.remoteControlAtStartup??Pt().remoteControlAtStartup
```

`projectSettings` 和 `localSettings` 只出現在那個 `===false` 的提前返回裡。要開的時候根本不看它們。2.1.222 真正加的是這句，`repo-scoped settings cannot` 這串字在舊版是 0 次：

> `remoteControlAtStartup: true in ${...} settings ignored — repo-scoped settings cannot enable Remote Control; set it at user scope (/config)`

行為大概沒變，變的是它終於肯講。我讀的是 minify 過的東西，可能漏了某條我看不到的路徑。但如果我沒看錯，把「現在會告訴你了」寫成「現在不能了」，會讓本來設定就沒生效的人以為自己昨天還是好的。

至於 ultraplan，我介意的不是關掉它。那功能的帳很難算：[Shareuhack 的實測](https://www.shareuhack.com/en/posts/claude-code-ultraplan-guide-2026)量過一輪完整流程（失敗、出計畫、改一次）吃掉 Pro 五小時額度的三分之一左右，而且它複製的是遠端 repo 的當下狀態，你啟動之後在本機改的東西它看不到。Bedrock、Vertex、Foundry 一律不支援。砍掉我沒話說。

我介意的是「Removed」這個動詞。這一條會被拿去做決定，該不該清掉 wrapper、要不要跟同事說別用了。實際上程式碼一個 byte 都沒少，還躺在你那 289 MB 執行檔裡，等一個你翻不到的開關。[claudefa.st 的整理](https://claudefa.st/blog/guide/mechanics/ultraplan)提到 2.1.89 到 2.1.91 之間它就被關掉又打開過一次，那次 changelog 沒寫。同一個機制用第二次，這回配了一個聽起來不可逆的字。

那篇還有一句話今天剛好過期。它說 ultraplan「從未出現在官方 CHANGELOG.md」，而現在出現了，總共一次，寫的是它被移除。

要分辨這兩種「移除」，`npm pack` 加 `grep` 就夠了。難的是想到要查。

---

*版本時間與 dist-tags 來自 npm registry（`npm view @anthropic-ai/claude-code time --json`、`dist-tags`）。字串統計、`--help` 差異、`import codex --dry-run` 的輸出，都來自本次實際下載並解開的 `@anthropic-ai/claude-code-linux-x64` 2.1.221 與 2.1.222 tarball，在本容器內執行。ultraplan 的額度與限制引自社群評測，非本次實測。`api.github.com` 在本環境回 403（session 僅授權本 repo），因此沒有 GitHub repo 的 `pushed_at`。*

### 參考來源

- [claude-code CHANGELOG.md](https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md)、[官方 changelog 頁](https://code.claude.com/docs/en/changelog)（本次抓取時最新皆為 2.1.222）
- [官方 settings 文件](https://code.claude.com/docs/en/settings)：目前沒有 `remoteControlAtStartup`，也沒有 `worktree.bgIsolation`；只寫了 `disableRemoteControl`「works from any scope」
- npm registry：`npm view @anthropic-ai/claude-code time --json`、`dist-tags`、`npm pack @anthropic-ai/claude-code-linux-x64@<version>`
- [Claude Code Ultraplan Complete Guide（Shareuhack）](https://www.shareuhack.com/en/posts/claude-code-ultraplan-guide-2026)（批評向：額度消耗、快照落差、雲端供應商不支援）
- [Ultraplan: Cloud Planning to Free Your Terminal（claudefa.st）](https://claudefa.st/blog/guide/mechanics/ultraplan)（2.1.89–2.1.91 的關掉又打開；該頁「從未出現在官方 CHANGELOG.md」的說法已被 2.1.222 推翻）

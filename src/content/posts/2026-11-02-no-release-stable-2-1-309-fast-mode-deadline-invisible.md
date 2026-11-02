---
title: "沒有新版：`stable` 還停在 2.1.309，fast mode 的死線在那裡看不到"
description: "latest 停在 2.1.316 已經 47 小時。今天查的是另一條線：stable 指的 2.1.309 比文件說的「大約一週」老了三天，而 11 月 30 日那個 fast mode 死線，在 309 的執行檔和 code.claude.com 的 fast-mode 頁上都找不到。"
published: 2026-11-02
category: "Changelog"
tags: ["claude-code", "changelog", "release-channel", "fast-mode", "settings"]
annotation: "在 stable 上，這個死線沒有一個地方會告訴你。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 沒有新版 | `latest` 還是 2.1.316，10-31 00:42 UTC 上 npm，到現在 47.4 小時 |
| `next` | 也指 2.1.316，兩條通道同一版 |
| `stable` | 2.1.309，10-22 20:34 上 npm，10.1 天前，落後六個版本 |
| 文件怎麼說 | `autoUpdatesChannel` 那段寫 stable「typically about one week old」 |
| Opus 4.8 的到期提示 | 2.1.309 裡不存在，`tengu_sunset_penguin_opus48` 和 `2026-11-30` 都是 0 次，316 兩個都有（執行檔比對）|
| fast-mode 那頁 | code.claude.com 還沒寫 4.8 要移除，Opus 4.7 上次的移除日期倒是寫著 |
| `blockWritesOutsideWorkingDirectories` | 309 裡 0 次，316 裡 20 次（執行檔比對）|
| `Scheduled-Task Fires` | 309 裡 0 次（執行檔比對）|
| 兩個新 env var | 309 裡都是 0 次，`env-vars` 和 `settings-reference` 兩頁也都還搜不到 |
| `tengu_turtle_carbon` | 309 和 316 都是 2 次，ultrathink 的遠端開關至少十天前就在了（執行檔比對）|
| 2.1.313 | npm 沒有，CHANGELOG 也沒有 |
| 2.1.315 | npm 有，CHANGELOG 還是沒有它的段落 |
| 還是沒有本機實測 | auto mode 照樣擋掉執行下載來的二進位，只做得到字串表比對 |

## 為什麼要改

47 小時沒出版，這件事本身不用管。2.1.317 沒來，CHANGELOG 最上面還是 316。

值得看的是另一條時鐘。Opus 4.8 的 fast mode 11 月 30 日移除，剩 28 天。316 的執行檔裡有一段把它做成終端機警告，過了那天自己消失，昨天寫過。我今天查的是同一段在 2.1.309 裡的下落。沒有。`tengu_sunset_penguin_opus48` 0 次，`2026-11-30` 0 次。

[code.claude.com 的 fast-mode 頁](https://code.claude.com/docs/en/fast-mode)也還沒補。剛才去看，仍然寫著 "Fast mode is supported on Opus 5.5, Opus 5, and Opus 4.8"，Opus 4.8 的 $10/$50 照列。那頁並不是沒有寫這種事的習慣，Opus 4.7 上次的移除就在同一段：

> Opus 4.7 doesn't support fast mode, so switching to it turns fast mode off. Fast mode for Opus 4.7 was deprecated on June 25, 2026, and removed on July 24, 2026.

於是在 stable 上，這個死線沒有一個地方會告訴你，執行檔和你平常開的那頁都不提。

stable 落後多少，文件自己給了數字。[settings-reference 的 `autoUpdatesChannel`](https://code.claude.com/docs/en/settings-reference) 寫：

> Set `"stable"` for a version that is typically about one week old and skips releases with major regressions

它現在指 2.1.309，10 月 22 日上 npm 的，10.1 天。多三天不是大事，只是「一週」這個數字別拿去排計畫。

## 對你的流程有什麼影響

1. 先確認通道，順便看版本：

```bash
claude --version
grep -n 'autoUpdatesChannel' ~/.claude/settings.json
```

   grep 沒印東西就是 `latest`，你手上應該是 2.1.316，第 2、3 點跳過。

2. 印出 `"stable"` 的話，你跑的是 2.1.309，10-31 那篇叫你加的 `blockWritesOutsideWorkingDirectories` 在那個執行檔裡一次都沒出現。寫在 `settings.json` 裡不會報錯，只是沒人讀它，你以為上了的那把鎖沒上。要它就換通道：

```bash
claude install latest
```

3. 還留在 stable 的話，`fastMode` 得自己查，終端機不會替你記：

```bash
grep -n 'fastMode' ~/.claude/settings.json
```

   印 `true` 而模型是 Opus 4.8，11-30 之後請求直接報錯，不退回標準速度，換 Opus 5.5。日期掛在遠端開關上，有可能提早。

4. 要查 fast mode 支援哪些模型，開 [platform 那一頁](https://platform.claude.com/docs/en/build-with-claude/fast-mode)。code.claude.com 那一頁還在列 4.8 的價錢，暫時不能當真。

5. 2.1.315 和 2.1.313 不用再追。315 有 npm 套件、沒有 CHANGELOG 段落；313 兩邊都沒有。昨天我寫 315 會被 316 蓋過去，確認了。

6. `CLAUDE_CODE_SUBAGENT_EFFORT` 和 `CLAUDE_CODE_DISABLE_ULTRATHINK` 還是沒文件，兩頁都搜不到。先別寫進 `settings.json` 的 `env`，沒有文件的變數改名或換語意不會通知你。

7. ultrathink 要是哪天突然不起作用，先想遠端被關掉，別先去翻自己的設定檔。`tengu_turtle_carbon` 在 2.1.309 裡就有，316 加的只是本機那道開關。

---
title: "2.1.263：勸你把 effort 降到 medium 的提示，多了一組 Fable 5.1"
description: "官方 changelog 只有一行 bug fixes。二進位裡多的是 Fable 5.1 專屬的降 effort 提示，而且「已經拒絕過」改成按模型記，你上次按的那次只算 Opus 5。"
published: 2026-09-07
category: "Changelog"
tags: ["claude-code", "changelog", "effort", "settings", "env"]
annotation: "上次按「No, keep high」只保住了 Opus 5。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 官方 changelog | 2.1.263 整篇只有一行 `Bug fixes and reliability improvements` |
| 降 effort 的提示 | 多了 Fable 5.1 專屬的一組，gate 叫 `tengu_steady_plum` |
| 觸發的起點 | Opus 5 只在 high 觸發，Fable 5.1 在 high、xhigh、max 都會 |
| 「已經看過」怎麼記 | 換成 `hasSeenEffortMediumNudgeByModel`，按模型分開記 |
| 提示的字 | 伺服器發的，這版多了 `showWarning` 和 `warningText` 兩個欄位 |
| `CLAUDE_CODE_POLISHED_DEWDROP` | 新環境變數，API 吃不下的圖或文件改成換一段文字再重送 |
| thinking-binding-controls | 伺服器退這個 beta header 時拿掉重試，不再整輪掛掉 |
| 2.1.262 | npm 上查不到，跳號 |

2.1.263 是 09-06 02:07 UTC 發的，距這篇 22 小時。stable 還是 2.1.236，第十八天。

## 為什麼要改

拿 2.1.261 和 2.1.263 的 Linux 二進位對字串，多出來的部分很好認（本機實測）：

```js
var v2 = {
  "claude-opus-5":    { flag: "tengu_radiant_island", from: ["high"] },
  "claude-fable-5-1": { flag: "tengu_steady_plum",    from: ["high","xhigh","max"] }
}
```

2.1.261 裡只有 `tengu_radiant_island` 一個寫死的 gate，判斷式也只有一句：看過就不再問。2.1.263 換成上面這張表，一個模型一個 gate，旗標也從全域改成按模型。舊的 `hasSeenEffortMediumNudge` 現在只認 `claude-opus-5` 這一個 key。

[官方文件](https://code.claude.com/docs/en/model-config)說 effort 本來就「saves the level per model, under the `modelSettings` key」，一個模型存一個值。提示跟著按模型問，這部分講得通。

麻煩的是同一頁的另一句。max 那級寫的是「applies `max` to the current session only」，刻意不落地。可是 Fable 5.1 那組把 max 也列成可以起跳的位置，而按下去那顆按鈕會把 medium 寫成你的長期預設。你本來只想讓它活這一輪。文件到今天沒提過這個提示存在。

另外兩項是真的在修 bug。以前丟一個 API 解不開的 PDF 或圖進去，整輪請求就死在那裡；現在把那個區塊換成一句 `[Document removed: ... do not retry reading it]` 再送一次。thinking-binding-controls 那個 beta header 被伺服器退回時也一樣，拿掉重試而不是報錯。

## 對你的流程有什麼影響

1. 先看自己被記到哪裡：

   ```bash
   grep -o 'hasSeenEffortMediumNudge[A-Za-z]*' ~/.claude.json | sort -u
   ```

   只印出 `hasSeenEffortMediumNudge` 而沒有 `...ByModel` 的，代表你之前拒絕過，但那次只保住 Opus 5。跑 Fable 5.1 的話還會再被問一次。

2. 習慣把 Fable 5.1 開在 xhigh 或 max 的，這條要留意。max 依文件只活這一場，提示卻把它列成可以起跳的位置，按下去寫進去的是 medium 當常駐預設。看到「Switch your default effort to medium?」就按 `No, keep max`，別因為它長得像一次性通知就順手 Enter。

3. 想從根本擋掉，把 `modelSettings` 寫進專案的 `.claude/settings.local.json`。[設定優先序](https://code.claude.com/docs/en/settings)裡 project local 排在 user 前面，提示寫的是 user 那層，在這個專案裡就蓋不過你（官方文件）。手改 `~/.claude.json` 也能達到同樣效果，但那個檔案同時放 trust 和 MCP 狀態，不值得為這件事去動它。

4. 餵 PDF 或截圖給 Claude Code 的流程，把這個加進 `env`：

   ```json
   { "env": { "CLAUDE_CODE_POLISHED_DEWDROP": "drop" } }
   ```

   預設是關的，遠端 gate 開了才生效，自己設就不用等排到你。壞檔案從「整輪失敗」變成「那個區塊換成一句說明，其他照跑」。填 `block` 是舊行為。這個鍵在[設定文件](https://code.claude.com/docs/en/settings)裡查不到。

5. thinking-binding-controls 那條不用管，重試是自動的。它會在 log 留一行 warn 寫 dropping the header and the block_binding value，看到那行不是你的錯。

6. stable 上的人這版一樣沒有。2.1.236 是 08-19 18:45 UTC 發的，到今天十八天，中間 npm 上過了二十版。昨天量到十七天，今天十八天，是同一條線沒動，不是它又慢了一天。

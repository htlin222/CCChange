---
title: "2.1.284：sonnet 這個別名指到 Sonnet 5.5，ultracode 從 xhigh 脫鉤"
description: "執行檔裡的 SONNET_ID 從 claude-sonnet-5 換成 claude-sonnet-5-5，價錢一樣。ultracode 不再是 effort 算出來的值，變成自己的開關。changelog 那條 auto mode 擴大放量其實是文件補登，程式碼沒動。"
published: 2026-09-29
category: "Changelog"
tags: ["claude-code", "changelog", "models", "effort", "auto-mode"]
annotation: "別名換了指向，價目表沒動。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.284 | 09-28 17:12 UTC 上 npm，距這篇 7 小時，100 條 |
| `sonnet` 這個別名 | 執行檔裡的 `SONNET_ID` 從 `claude-sonnet-5` 換成 `claude-sonnet-5-5`（本機實測） |
| Sonnet 5.5 價錢 | $2 / $10 per Mtok、cache 讀 $0.20，跟 Sonnet 5 同價（官方文件） |
| ultracode | 從 effort 算出來的值改成自己的開關，不再逼 xhigh（本機實測） |
| auto mode 當預設 | changelog 寫這版擴到所有方案和供應商，兩版相關程式碼一個 byte 沒差（本機實測） |
| 外部讀取的詢問 | 多一格「Yes, but ask again next time」，只放這一次（本機實測） |
| `.claude/rules` | rules 目錄或它的 `.claude` 上層是 symlink 時多一道檢查（本機實測） |
| `/mcp reconnect all` | 一次重連所有連不上或要重新認證的 server |
| hook 的 debug log | 失敗的 hook 同時寫 stdout 時，stderr 之前整段消失，現在留著，也印狀態碼 |
| Explore subagent | session 跑 Claude Code 認不出的 model ID 時沿用它，不再跳去 Opus |
| 壓縮 | 壓完還是太長就再壓一次，少留一點近期對話 |
| gateway 花費上限 | `/usage` 和 status line 開始印金額，`rate_limits.spend_limit` 多 `used_usd`、`limit_usd`、`period` |

沒細講的：Elicitation hook 的 `block` 回傳之前被忽略、`ANTHROPIC_FOUNDRY_RESOURCE` 加了格式檢查、VS Code 十八條、Claude Tag 十條、vim mode 的 `.` 和 `dd`、fullscreen 捲動兩條。

## 為什麼要改

auto mode 那條不是這版改的。[permission-modes 文件](https://code.claude.com/docs/en/permission-modes)那張表現在寫成這樣：

> | In a terminal or through the VS Code extension | `auto` with Claude Code v2.1.283 or later; on earlier versions, `auto` on Pro, Max, or Team plans in sessions that fetch feature flags, and `default` otherwise |

日期是 2.1.283，不是 2.1.284。三天前那篇講的就是這件事，當時文件還沒跟上。決定開場模式的那段程式碼兩版完全一樣，`tengu_harbor_willow` 讀不到時的本地預設值都是 `true`。所以 changelog 這條在補文件，順手把「只有 Pro、Max、Team」那個方案閘門的說法清掉。

ultracode 以前綁在 effort 上，滑桿最上面那一格同時是 xhigh 和 orchestration，你要後者就得連前者一起吃。這版拆成獨立的 boolean，多了 `ultracodeRequested` 和 `ultracodeAvailable` 兩個回報欄位，把「你要了」和「要到了」分開。

`sonnet` 換指向這件事文件沒特別提，[價錢那頁](https://platform.claude.com/docs/en/about-claude/pricing)講得清楚：Sonnet 5.5 和 Sonnet 5 都是 $2 / $10 per Mtok，cache 讀都 $0.20，1M context 從 4.6 之後都算標準價。換過去不會多付錢。

## 對你的流程有什麼影響

1. `sonnet` 這個字在你的設定裡到處都是：subagent 的 `model: sonnet`、CI 裡的 `--model sonnet`、`/model sonnet`。裝上 2.1.284 之後這些全部跑 Sonnet 5.5，不用改任何東西，但今天確實換了模型。要釘住舊的就寫全名 `claude-sonnet-5`，執行檔裡 `PREV_SONNET_ID` 和別名清單都還收它（本機實測）。

2. ultracode 可以單獨開了。`/effort ultracode on`、`/effort ultracode off`，面板裡是 Tab。想綁別的鍵，`keybindings.json` 有三個新 action：

   ```
   effortSlider:toggleUltracode
   effortSlider:decreaseEffort
   effortSlider:increaseEffort
   ```

   2.1.283 的執行檔裡這三個字串一個都找不到（本機實測）。以前為了 orchestration 才把滑桿推到頂的那個習慣可以停，medium 配 ultracode 現在是合法組合。

3. `permissions.defaultMode` 不用再動。三天前叫你補的那段在這版一樣壓得住，判斷順序（`--permission-mode` → 設定檔 → 內建預設）沒變。已經補過的略過這項。

4. auto mode 問你要不要讀工作目錄外的檔案時，選項多一格，按之前看一下。「Yes, but ask again next time」只放這一次，「Yes, don't ask again」是整個 session。舊版 No 那格寫「No, ask again next time」，這版是「No, and ask again next time」（本機實測）。靠肌肉記憶按方向鍵的話會選錯一次。

5. `.claude/rules` 或 `.claude` 本身是從 dotfiles repo symlink 過來的話，升級後第一次在那個 repo 開 session 會被問。2.1.283 的執行檔裡找不到這段訊息（本機實測），這道檢查是新的。答應它就好。

6. 有 hook 在 CI 裡靜悄悄壞掉過的，現在值得回頭用 `--debug` 重跑一次。之前 hook 失敗但同時寫了 stdout，stderr 整段不見，難怪查不出來。

7. `/mcp reconnect all`、gateway 的金額顯示、壓縮再壓一次、Explore 沿用 model：修好就好，不用改設定。你在 proxy 後面跑的話 Explore 那條會自己生效。

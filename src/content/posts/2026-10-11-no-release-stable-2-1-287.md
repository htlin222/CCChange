---
title: "沒有新版：stable 升到 2.1.287，九月那條『別切 stable』的理由作廢了"
description: "latest 停在 2.1.296 超過一天。今天看另一條線：stable 這個 channel 從九月記到的 2.1.267 推到了 2.1.287，當初叫你別切過去的那個 claude -p 會掛住的坑，現在補進 stable 了。"
published: 2026-10-11
category: "Changelog"
tags: ["claude-code", "changelog", "settings", "auto-update", "release-channel"]
annotation: "stable 不是同一份程式碼多放兩週，是九天前的快照，那天有的洞一個不少。"
---

## 改了什麼

沒有新版。`latest` 還是 2.1.296，npm 推送時間 2026-10-09 16:58 UTC，到寫這篇為止三十一小時，一整天內沒動。

今天動的是 stable。這個站九月二十一號那篇記下的 stable 是 2.1.267，現在它指到 2.1.287。

| channel | 現況 |
| --- | --- |
| `latest` | 2.1.296，距上次出刊沒動 |
| `stable` | 2.1.287，npm 推送 2026-10-01 16:59 UTC，九天前的版本 |
| 兩條差距 | 九版（287 到 296），九月那篇記的是差十一版 |
| 跨過的那版 | 2.1.277 進了 stable，正是九月那篇叫你別切的理由 |

版本號不必靠 npm 猜，原生安裝器讀的那兩個檔是公開的：

```bash
curl -s https://downloads.claude.ai/claude-code-releases/stable   # 2.1.287
curl -s https://downloads.claude.ai/claude-code-releases/latest   # 2.1.296
```

## 為什麼要改

九月二十一號那篇給的「維持 latest」只靠一件具體的事：stable 當時停在 2.1.267，而 2.1.277 才修掉 `claude -p` 和 Agent SDK 碰到內部錯誤整個掛住、沒有結果也沒有 exit code 的毛病。這個站的出刊本身就是排程跑 `claude -p`，掛住那天不會有人發現，只會看到沒出刊。那時 stable 沒有這條，所以結論是別切。

stable 現在跨過 277 了，那個理由就沒了。[官方文件](https://code.claude.com/docs/en/setup#configure-release-channel)對 stable 的說法是：

> `"stable"`: use a version that is typically about one week old, skipping releases with major regressions

九天，貼著「大約一週」在走。九月那篇記下 2.1.236 卡了十七天的那種停擺，這次沒有。

但「別切」的結論沒變，只是理由換了。stable 是九天前那顆 build 的快照，那天有的 bug 一個不少，而且 2.1.288 到 2.1.296 這九版它一條都還沒拿到。那九版裡有你這三天剛被交代要接的東西。

## 對你的流程有什麼影響

1. 先確認你在哪一條。`claude doctor | grep 'Auto-update channel'`，沒設過就是 `latest`，2.1.287 和 2.1.296 都印得出這行。
2. 繼續待在 latest。理由不再是「切過去 CI 會掛」，那條已經在 stable 裡了。現在的理由是 2.1.287 缺了你這三天剛接的三樣：2.1.294 把 prompt hook 判反命令句那條、2.1.295 給 command 和 HTTP hook 加的 `onFailure: "block"`、2.1.296 把 `BASH_ARGV0` 補進權限檢查的那條（本機實測：287 的動態變數 Set 裡 `BASH_LINENO` 後面直接接 `BASH_REMATCH`，中間沒有 `BASH_ARGV0`）。跑 prompt hook 或靠 Bash allow 規則的人切到 stable 等於把這三樣退回去。
3. 真要降到 stable，從 `/config` 的 Auto-update channel 走，它會問你留現在這版還是讓它降，選留就順手把 `minimumVersion` 寫成當前版本釘住。手改 `settings.json` 沒有這道問句，下次背景更新就把你降下去。
4. `minimumVersion` 只管更新擋不住啟動。要讓 Claude Code 在版本範圍外拒絕開，那是 managed settings 的 `requiredMinimumVersion` 和 `requiredMaximumVersion`，別跟前面那個混。

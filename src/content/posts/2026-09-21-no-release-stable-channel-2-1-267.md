---
title: "沒有新版：stable 還停在 2.1.267，跟 latest 差十一版"
description: "latest 四十六小時沒動。今天要看的是另一條線，stable 這條 channel 現在落後十一天，而且 autoUpdatesChannel 收一個文件上沒寫的第三個值。"
published: 2026-09-21
category: "Changelog"
tags: ["claude-code", "changelog", "settings", "auto-update", "release-channel"]
annotation: "設定檔收 rc，doctor 印成 slow，更新器回 Invalid channel。三層講三種話。"
---

## 改了什麼

沒有新版。`latest` 停在 2.1.278，npm 推送時間 2026-09-19 01:48 UTC，到寫這篇為止四十六小時。

| 項目 | 現況 |
| --- | --- |
| `latest` | 2.1.278，沒動 |
| `stable` | 2.1.267，2026-09-09 推的，落後十一天 |
| 兩條中間 | 2.1.268 到 2.1.278 共十一版，650 條 changelog |
| `autoUpdatesChannel` | 文件列兩個值，設定檔驗證器實收三個 |
| 多出來的 `rc` | 設定檔收，`claude update` 自己拒絕，退出碼 1 |

版本號不必靠 npm 猜，原生安裝器讀的那兩個檔是公開的：

```bash
curl -s https://downloads.claude.ai/claude-code-releases/stable   # 2.1.267
curl -s https://downloads.claude.ai/claude-code-releases/latest   # 2.1.278
```

## 為什麼要改

[官方文件](https://code.claude.com/docs/en/setup#configure-release-channel)對 stable 的說法是：

> `"stable"`: use a version that is typically about one week old, skipping releases with major regressions

一週。現在是十一天，這還算接近。難看的是它會整段不動：2.1.236 從 8 月 28 日掛到至少 9 月 14 日，這個站 9 月 14 號那篇記下的 stable 還是它。那十七天裡進去的修法，走 stable 的人一條都還沒拿到。

「跳過有重大迴歸的版本」那半句也有點卡。2.1.268 修掉的是 `ANTHROPIC_BASE_URL` 指向第三方 endpoint 時每個 turn 都回 400，官方正文寫這個迴歸「since 2.1.265」，所以 2.1.265、266、267 都中，而 stable 現在就指著 2.1.267。你走的是 claude.ai 登入，這條打不到你。但它說明了 stable 是什麼：不是同一份程式碼多放一週，是一個十一天前的快照，那天有的 bug 它一個不少。

設定值本身沒有變過，2.1.267 和 2.1.278 兩顆執行檔裡 `autoUpdatesChannel` 都在。變的只有 channel 現在指到哪。

## 對你的流程有什麼影響

1. 先確認你在哪一條。`claude doctor | grep 'Auto-update channel'`，沒設過就是 `latest`。這行 2.1.267 和 2.1.278 都會印，不用先升級才問得到。
2. 維持 `latest`，不要切。2.1.277 修的那條是 `claude -p` 和 Agent SDK 碰到內部錯誤之後整個掛住，沒有結果也沒有 exit code，改成回報錯誤並 exit 1。這個站的出刊就是排程跑 `claude -p`，掛住那天不會有人發現，只會看到沒出刊。2.1.267 沒有這條。
3. 別去寫 `"autoUpdatesChannel": "rc"`。設定檔驗證器收這個值，`claude doctor` 把它印成 `slow`，接著 `claude update` 自己翻臉：

   ```
   Checking for updates to slow version...
   Error: Failed to install native update
   TelemetrySafeError: Invalid channel: rc. Use 'stable' or 'latest'
   ```

   退出碼 1，一次都不會成功。同一個值三層講三種話，算數的是更新器那句。文件上沒有它，當它不存在。
4. 哪天真要降到 stable，從 `/config` 的 Auto-update channel 走。它會問你要留在現在這版還是讓它降，選留就順手把 `minimumVersion` 寫成當前版本。直接手改 `settings.json` 沒有這道問句，下次背景更新就把你降下去了。
5. `minimumVersion` 只管更新，擋不住啟動。要讓 Claude Code 在版本範圍外拒絕開，那是 managed settings 的 `requiredMinimumVersion` 和 `requiredMaximumVersion`，兩件事別混。

---

*版本號、推送時間與 dist-tag 來自 npm registry 與 `downloads.claude.ai/claude-code-releases` 的 channel 檔（官方文件）。stable 的定義原話、`autoUpdatesChannel`、`minimumVersion`、`requiredMinimumVersion` 的行為來自本次抓取的 setup 文件頁（官方文件）。2.1.268 與 2.1.277 兩條修正的正文來自官方 changelog（官方文件）。驗證器實收 `latest` / `stable` / `rc` 三個值、`rc` 顯示成 `slow`、`claude update` 對 `rc` 回 `Invalid channel` 並以 1 退出、`claude doctor` 的 `Auto-update channel` 那行，來自本次下載 2.1.267 與 2.1.278 執行檔實跑（本機實測）。2.1.236 佔住 stable 十七天，一半來自本站 9 月 14 日那篇的紀錄，一半來自社群的 cc-stable-watch 追蹤資料（社群）。*

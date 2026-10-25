---
title: "沒有新版：`stable` 還停在 2.1.308，手改 autoUpdatesChannel 會降級回去"
description: "2.1.310 之後 26.8 小時沒有新東西。這天的收穫是兩件設定上的事：stable 通道現在比 latest 落後兩版，手寫進 settings.json 會真的把你裝回去；還有 310 修的那個 cleanupPeriodDays bug，門檻比我昨天寫的高非常多。"
published: 2026-10-25
category: "Changelog"
tags: ["claude-code", "changelog", "settings", "autoupdates", "cleanup"]
annotation: "stable 的 2.1.308 沒有 309 的 sandbox 修正，也沒有 310 的那層 NaN 檢查。"
---

## 改了什麼

沒有新版。

| 項目 | 一句話 |
| --- | --- |
| 24 小時內 | 沒有東西上架。2.1.310 是 10-23 21:20 UTC 上 npm，查的時候 26.8 小時 |
| `latest` 通道 | 2.1.310（`downloads.claude.ai/claude-code-releases/latest`） |
| `stable` 通道 | 2.1.308，上架到現在 67.8 小時 |
| repo 時間 | 這個容器打不到 `api.github.com`，`pushed_at` 這次沒有 |
| `autoUpdatesChannel` 的值域 | schema 收 `latest`、`stable`、`rc` 三個，它自己的 `describe()` 只寫前兩個，`install.sh` 也只收前兩個 |
| 設 `rc` 的下場 | `claude doctor` 印 `Auto-update channel: slow` 而且不給警告，`claude update` 才回 `Invalid channel: rc. Use 'stable' or 'latest'` 並中止（本機實測） |
| 手寫 `"autoUpdatesChannel": "stable"` | 2.1.310 上跑一次 `claude update` 就裝回 2.1.308，launcher 跟著變（本機實測） |
| 同時寫 `minimumVersion` | 擋得住，訊息明說 stable 在你的下限以下，留在 2.1.310（本機實測） |
| 310 怎麼修 `cleanupPeriodDays` | cutoff 外面多包一層 `Number.isNaN`，算壞回 `null`，整輪 sweep 不跑（執行檔比對） |
| 那個「很大的值」有多大 | 要大到 cutoff 變成 Invalid Date 才算，今天是 100,020,752 天，約 27 萬年 |

## 為什麼要改

`stable` 本來就該落後。文件寫它「typically about one week old, skipping releases with major regressions」，今天量到的是落後兩版、67.8 小時。

會咬人的是切換的方式。[release channel 文件](https://code.claude.com/docs/en/setup#configure-release-channel)寫的流程是走 `/config`：從 latest 換到 stable 的時候它會問你要留在現在的版本還是允許降級，選留下就順手把 `minimumVersion` 寫成當前版本。手去編 `settings.json` 沒有這段問答。我在隔離的 HOME 裡用 2.1.310 試，它印完

> @stable is at 2.1.308 (older than 2.1.310)...

就裝了。

`rc` 的情況更單純：schema 收這個值，`doctor` 把它顯示成 `slow`，要到你真的跑 `claude update` 才被拒。

310 那條 changelog 寫 set to a very large value，讀起來像在講任何大數字。執行檔裡的 cutoff 是把 `Date.now() - 天數 × 86400000` 餵給 `new Date()`，309 直接拿結果去用，310 多檢查一次它是不是 Invalid。要踩到就得讓天數大到把這個 Date 推出 JS 的有效範圍。而 `cleanupPeriodDays` 自己的錯誤訊息建議的數字是 3650：

> To keep transcripts for a long time, set a large number (e.g. 3650 for ~10 years).

離門檻還有二十幾萬年。我在 309 上把 `paste-cache`、`image-cache`、`file-history`、`tasks`、`session-env`、`uploads`、`shell-snapshots`、`debug` 和一份 transcript 都塞了當下時間的檔案，`cleanupPeriodDays` 設 999999999 跑一輪，九個都還在，310 也一樣。社群那張用 1825 天報檔案被刪的 issue 被關成 not planned。照這個算法，1825 不會是原因。

## 對你的流程有什麼影響

1. 先把 `cleanupPeriodDays` 印出來：

```bash
grep -o '"cleanupPeriodDays"[^,}]*' ~/.claude/settings.json
```

   什麼都沒印就是沒設，走預設 30。印出來的數字只要不到九位數，310 修的那條跟你無關，不用為它改任何值。我 10-24 那篇第 1 條寫「設了一個很大的數字就是踩在這個 bug 上」，那句太寬了：門檻在一億天，3650 和 99999 在 309 和 310 的行為一模一樣。真的掉過圖的話原因在別處，別靠改這個數字解決。

2. 查每台機器的通道，順手看 `doctor` 怎麼說：

```bash
grep -o '"autoUpdatesChannel"[^,}]*' ~/.claude/settings.json
claude doctor | grep -i 'auto-update'
```

   沒設就是 `latest`，`Auto-update channel: latest`，跳過。印出 `slow` 的那台不是在走慢通道，是設了一個更新時會被拒的值，清掉它。

3. 要換到 `stable` 的話，`minimumVersion` 跟它寫在同一次編輯裡，別分兩步：

```json
{
  "autoUpdatesChannel": "stable",
  "minimumVersion": "2.1.310"
}
```

   只寫 `autoUpdatesChannel` 那行，2.1.310 會被換成 2.1.308。而 308 沒有 309 修掉的那件事：沙箱指令每次執行前，shell 啟動檔會先在沙箱外跑一次。那是安全修正。要慢通道可以，別順便把這條退回去。

4. 310 還有兩件沒動的。開頭是 `sleep`、秒數 25 以上的指令現在一律被拒，`~/.claude/hooks` 和 skills 裡還留著的要改掉。Ubuntu 或 WSL2 上 `sysctl kernel.apparmor_restrict_unprivileged_userns` 回 1 的話，profile 要寫進 `/etc/apparmor.d/bwrap`。這兩件是 10-24 那篇的第 2 和第 4 條，做過就跳過。

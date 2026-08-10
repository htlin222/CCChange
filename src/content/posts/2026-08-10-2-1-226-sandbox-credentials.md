---
title: "2.1.226 停了兩天：回頭把 sandbox 的 credentials 區塊看完"
description: "沒有新版，2.1.226 發出來到現在 46 小時。趁這個空檔補 2.1.224 那批 credential masking 設定，前面三篇一條都沒提，而它有幾個預設值是 fail-open。"
published: 2026-08-10
category: "Changelog"
tags: ["claude-code", "changelog", "sandbox", "settings", "security"]
annotation: "mask 寫在 repo 的 settings.json 裡是空的。不報錯，也不生效。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 版本 | 沒有新版。2.1.226 還是 latest 和 next，npm 上發出來 46 小時 |
| `stable` dist-tag | 還停在 2.1.220，七月二十四日發的，落後六個版本 |
| `sandbox.credentials` | 2.1.224 加的 `extract`、`onExtractNoMatch`、`decode: "jwt"`、`maskClaims`、`awsPairs`、`sigv4`，這六個鍵這裡從來沒寫過 |
| 設定來源 | `mask`、`network.tlsTerminate`、`allowPlaintextInject` 在 repo 的 `.claude/settings.json` 裡會被忽略，只認 user、managed 和 `--settings` |
| `injectHosts` | 不寫等於 `network.allowedDomains`，真憑證會在每一個放行的網域上被換回去 |
| `onExtractNoMatch` | 預設 `warn`，regex 沒中就把原檔案原樣放給沙箱讀 |
| macOS 的檔案 `mask` | 降成 deny，讀不到，而且關掉 filesystem isolation 也解不開 |
| 沙箱預設讀取範圍 | 沒有內建憑證黑名單，`~/.ssh/` 和 `~/.aws/credentials` 照樣讀得到 |

## 為什麼要改

`deny` 的毛病是工具跟著掛。你把 `~/.config/gh/hosts.yml` 擋掉，`gh` 在沙箱裡就登不進去。`mask` 走另一條路：沙箱裡的指令拿到一串 sentinel，proxy 在請求送出去的時候換回真值，指令本身和它寫的 log 都碰不到憑證。

要換就得看得到請求內容，所以這套綁 `network.tlsTerminate`。也因為它等於授權 proxy 把真憑證送到某些主機，[官方文件](https://code.claude.com/docs/en/sandboxing#mask-credentials)把它限制在你自己控制的那幾份設定，repo 裡的那份寫了不算。這頁文件難得寫得夠細，該標的例外都標了。

前提是沙箱真的有在跑。[sandbox-runtime #97](https://github.com/anthropic-experimental/sandbox-runtime/issues/97) 一月開到現在還開著：auto-allow 模式下指令被沙箱擋掉，Claude 會自己帶 `dangerouslyDisableSandbox: true` 重跑一次，不問你（社群）。

## 對你的流程有什麼影響

1. 不用升，你手上跑的就是 2.1.226。
2. 打開 `~/.claude/settings.json` 看 `sandbox.credentials` 有沒有東西。空的話，沙箱開著也讀得到 `~/.ssh/`，這是文件裡寫明的預設，不是誰設壞了。
3. 寫在 repo `.claude/settings.json` 裡的 `mask` 條目搬到 user settings。留在原地不會報錯，就是不生效。
4. 每條 `mask` 補上 `injectHosts`。少寫這一行，那顆 token 會在你 allowlist 上的每個網域被還原。
5. 有 `extract` 的把 `onExtractNoMatch` 設成 `"deny"`。預設 `warn` 的意思是 regex 打偏了就整份原樣放行。
6. 沒開 `tlsTerminate` 就先別寫 mask。我拿 2.1.226 跑了一次，啟動時它會先擋你（本機實測）：

> ⚠ sandbox.credentials mask entries (MY_TOKEN) are configured but TLS termination is unavailable — sandboxed commands see only a sentinel value and the proxy cannot substitute the real credential on egress, so tools needing these will fail to authenticate.

7. Mac 上檔案的 `mask` 就是 deny，別指望 `gh` 還能用。要驗就在沙箱裡 `cat` 那個檔案：Linux 看到 sentinel，macOS 直接讀失敗。
8. 加 `sandbox.failIfUnavailable: true`。我在容器裡跑，沙箱因為權限起不來，可是只寫 `enabled: true` 加一條 mask 的設定照樣跑完了，`printenv` 印出真值，畫面上一句話都沒有。補了 `failIfUnavailable` 才看到 `apply-seccomp: write /proc/self/uid_map: Operation not permitted`。你的機器上沙箱起得來，但這條安靜的退路是預設（本機實測）。
9. `decode: "jwt"` 不能跟 `extract` 併用。純 JWT 的變數只寫 `decode`，再用 `maskClaims` 挑要遮的 claim，其他 claim 留著，沙箱裡解碼讀非機密欄位的程式才不會壞。

---

*「沒有新版」以 npm registry 的發佈時間與 dist-tag 為準。這個 session 的 egress policy 擋掉 api.github.com，repo 的 `pushed_at` 沒取到。設定鍵語意、來源限制與 macOS 行為引自 code.claude.com（官方文件）。TLS 警告字串與 seccomp 錯誤來自本次下載的 2.1.226 linux-x64 執行檔實跑（本機實測）。auto-allow 繞過引自 sandbox-runtime issue #97（社群）。*

---
title: "2.1.331：doctor 多了連線檢查，專案設定一碰到網路就整段不測"
description: "331 給 claude doctor 加了 API connectivity，會真的打兩個請求回報狀態碼和耗時。它也有十三個提前放棄的出口，其中一個是你自己 repo 的 env 設定。"
published: 2026-11-24
category: "Changelog"
tags: ["claude-code", "changelog", "doctor", "proxy", "cloud"]
annotation: "Not tested 只有一行，跟兩行 200 擺在同一個位置，掃過去很像通過。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 版本 | 2.1.331，npm 上是 11-23 18:36 UTC，我查的時候過了 5.5 小時 |
| 通道 | `latest` 和 `next` 都指 331，`stable` 還停在 2.1.325 |
| `gh api` | 在這個容器照樣 403，`pushed_at` 拿不到，上面的時間全是 npm 的 |
| `claude doctor` | 多一段 API connectivity，打 `api.anthropic.com` 和 `platform.claude.com`，回報狀態碼和毫秒數（雲端實測） |
| 330 有沒有 | 沒有，整段是新的（雲端實測） |
| 不測的出口 | 程式裡十三個提前 return，踩到任何一個，整段就只剩一行 `Not tested:` 加原因 |
| 最容易踩的 | 專案或 local settings 的 `env` 放了網路相關的 key。`HTTPS_PROXY`、`ANTHROPIC_BASE_URL`、`NO_PROXY`、`CLAUDE_CODE_CLIENT_CERT`、`ANTHROPIC_AUTH_TOKEN` 五個都實測會擋掉整段 |
| 另一個 | `CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER` 配上 `proxyAuthHelper` 時它不跑 helper，所以不測（實測） |
| `CLAUDE_CODE_DISABLE_RESPONSE_COMPRESSION` | 新變數，只動經過 proxy 的 https 請求。沒設的時候那條預設路徑要等一個遠端開關，而那個開關 331 才加進去、預設是關的（本機實測） |
| rewind | restore 失敗不再刪掉 checkpoint 之後新建的檔，改成留著並印 `Kept N files created since then` |
| OTel | `llm_request` span 多了 `gen_ai.usage.*` 和 `gen_ai.response.model`，官方註明 `gen_ai.usage.input_tokens` 含 cache token |
| 社群 | 發佈 5 小時，搜不到任何第三方討論，所以上面沒有一條是別人幫我證實的 |

Code Mode 上了 Bedrock、Agent Platform 和 Foundry，plugin manifest 多了 `optionalDependencies`。這一版列了 135 條，其中 78 條是 VSCode 擴充套件的，剩下的是視窗高度、dictation 和各種 UI 修正，跟你用不上。

## 為什麼要改

以前要確認連線設定到底有沒有生效，只能開 `--debug` 去翻 `~/.claude/debug/` 的 log，或者在 session 裡看 `/status`。`/status` 回答的是「我讀到了什麼」，不是「打得通嗎」。[官方文件那一節](https://code.claude.com/docs/en/network-config)講得比我直白：`Additional CA cert(s)` 那列只顯示路徑，不檢查檔案有沒有真的載進去，所以那一列要自己去 debug log 再確認一次。設定寫錯的人，得等到真的送出請求才會知道。

新的這段就是補那個洞的。它給你狀態碼、毫秒數，還有 `ANTHROPIC_BASE_URL`、`NODE_EXTRA_CA_CERTS`、`CLAUDE_CODE_CLIENT_CERT` 現在各是什麼狀態。

彆扭的地方在後面。只要它判斷自己這次跑的環境跟你真實 session 的環境不一樣，它就不測，只印一行原因。寧可不測也不給你一個假的綠燈，這取捨我同意。問題是那行字很短，位置又跟成功的輸出一模一樣。

壓縮那個變數是另一件事。請求方向早就有 `CLAUDE_CODE_GZIP_REQUEST_BODIES=0`，331 補的是回應方向，給那種會把壓縮過的回應切斷的 proxy 用。

## 對你的流程有什麼影響

1. 升上 331，跑一次 `claude doctor`，看 API connectivity 底下是兩行 `answered HTTP 200`，還是一行 `Not tested`。只有一行就是它沒測，不是通過。

2. 注意你是在哪個 repo 底下跑的。那個 repo 的 `.claude/settings.json` 只要在 `env` 裡放了 `HTTPS_PROXY`、`ANTHROPIC_BASE_URL`、`NO_PROXY`、`CLAUDE_CODE_CLIENT_CERT`、`ANTHROPIC_AUTH_TOKEN` 任何一個，這段就不測。CCChange 的 settings 沒有 `env` 區塊，在這裡跑會測。要驗某個 repo 的連線設定，得 `cd` 過去再跑一次。

3. `CLAUDE_CODE_DISABLE_RESPONSE_COMPRESSION` 不用設。它只對經過 proxy 的 https 請求有效，直連完全不受影響。而你不設的話，走的那條預設路徑卡在一個 331 才出現、預設關閉的遠端開關後面。等哪天真的看到回應被截斷再回來設。

4. 有接 OTel 的話，別急著把 dashboard 換到 `gen_ai.` 開頭的新名字。舊的 `input_tokens` [官方文件寫](https://code.claude.com/docs/en/monitoring-usage)是不含 cache 的，新的 `gen_ai.usage.input_tokens` changelog 寫是含的。名字幾乎一樣，定義相反，換過去之後再跟 `cache_read` 相加就會多算一次。

5. rewind 那條是這次唯一值得單獨為它升級的理由。331 以前 restore 失敗，還是會把 checkpoint 之後新建的檔刪掉，還原沒成功、新檔也沒了。

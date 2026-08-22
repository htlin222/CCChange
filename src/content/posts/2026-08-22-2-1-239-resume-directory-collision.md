---
title: "2.1.239：claude -c 會接到隔壁目錄的對話，pluginRoot 終於真的會動"
description: "兩個目錄只差一個底線或句點，session 就共用同一份歷史，claude -c 撈到的是隔壁那場。同一版還把文件寫了很久卻沒實作的 marketplace pluginRoot 補上，跟一個帶 /claude-api upgrade 的 Python SDK 大版號。"
published: 2026-08-22
category: "Changelog"
tags: ["claude-code", "changelog", "session", "plugins", "python-sdk", "cloud"]
annotation: "session 資料夾名把 / _ . 全壓成 -，所以 my-proj 和 my_proj 共用一份歷史。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 版本 | 2.1.239，08-21 17:18 UTC 發的，距這篇 7.0 小時。59 條，絕大多數是修 bug。`stable` 從 2.1.228 挪到了 2.1.231 |
| `claude -c` 認錯目錄 | 兩個目錄只差 `-`、`_`、`.` 的時候會接到隔壁那個的對話。2.1.238 實測撈得到，2.1.239 撈不到 |
| marketplace `metadata.pluginRoot` | 文件寫著可以用 bare source 名，程式碼一直沒實作。2.1.238 裝下去回 `source: Invalid input`，這版才真的裝得起來 |
| `anthropic` Python 1.0 | 08-20 上 PyPI，1.x 底層從 `httpx` 換成 `httpx2`。新增 `/claude-api upgrade` 幫你搬 |
| WebFetch | 過期的頁面內容本來整個 session 都留在記憶體，現在照原本設計的 15 分鐘丟掉 |
| Esc 與排隊中的 prompt | 有個 race 會讓下一回合提早結束，session 看起來閒著、Claude 其實還在跑，之後重送會把動作再做一次 |
| cloud session 的網路 | Bash 打 `www`、`docs` 這些非 API 的 anthropic.com host，改走 session 的網路 proxy，會吃你環境的網域白名單 |
| 長 `SessionStart` / `Setup` hook | 遠端 session 在 hook 跑的期間持續送 keep-alive，容器不會被當成閒置回收掉 |
| Linux sandbox 加 `extensions.worktreeConfig` | 這種 repo 裡 sandbox 的 git 指令本來全部壞掉，卡在一個根本不存在的 `.git/config.worktree` |
| `.md` 開頭的 BOM | 官方寫 agent、skill、command 檔開頭有 BOM 會被靜默忽略。我在 2.1.238 上各放一個帶 BOM 的專案 skill 和 slash command，兩個版本都讀得到 |
| `/goal` | 背景工作的重複回報改成退避，30 分、1 小時，然後每 2 小時 |

剩下的大宗是 fullscreen：MCP elicitation 表單不再被裁掉、`/config` 這類面板不再蓋住訊息、點視窗回到焦點不會順手按到權限按鈕、`dark-ansi` 主題展開工具結果不再文字和背景同色。Bedrock 有一條值得看，proxy 把 Content-Type 拔掉會讓串流退回非串流、整輪重跑、計費翻倍。Windows 補上了 cross-session messaging，`/resume` 修了四條，`CLAUDE_CODE_RETRY_WATCHDOG` 碰到組織花費上限改成直接失敗，不再等重置。

## 為什麼要改

`-c` 那條的機制在 `~/.claude/projects/`。session 按 cwd 分資料夾，路徑編碼把 `/`、`_`、`.` 一律壓成 `-`，於是 `/tmp/foo-bar` 和 `/tmp/foo_bar` 共用同一個 `-tmp-foo-bar`。`-c` 只看資料夾，撈到的就是隔壁目錄最後那場對話。2.1.238 上實測：在 `-` 那邊留個暗號，`_` 那邊 `claude -c` 問得出來。2.1.239 問不出來，同目錄接續照常。

pluginRoot 是另一種毛病。[官方 marketplace 文件](https://code.claude.com/docs/en/plugin-marketplaces)的 metadata 表早就列了 `metadata.pluginRoot`，說明欄寫的是：

> Base directory prepended to relative plugin source paths (for example, `"./plugins"` lets you write `"source": "formatter"` instead of `"source": "./plugins/formatter"`)

照著寫，2.1.238 的 `claude plugin install` 回 `This plugin's marketplace entry is invalid: source: Invalid input`。文件對，程式碼沒跟上。

Python SDK 那條是被外面推的。1.0.0 在 08-20 19:58 UTC 上 PyPI，隔天 2.1.239 就帶著 `/claude-api upgrade` 出來了。

## 對你的流程有什麼影響

1. 先升。`-c` 那條沒有 workaround，你也不會知道自己什麼時候接錯過。想確認的話去看 `~/.claude/projects/`，有沒有哪個資料夾同時對得上兩個真實目錄，`my-proj` 跟 `my_proj` 這種。
2. 手上任何跑 `pip install -U anthropic` 的專案都會跳到 1.x。真正會擋的是 `http_client=`：傳 `httpx.Client()` 進去直接噴 `TypeError: Invalid http_client argument; Expected an instance of httpx2.Client`。但 `timeout=httpx.Timeout(...)` 建構時不擋，測試不一定掃得出來。要搬就跑 `/claude-api upgrade`，還沒要搬就把 `anthropic<1` 釘進 requirements。
3. cloud environment 用 Custom 網域清單的話，把 `www.anthropic.com` 和 `docs.anthropic.com` 補進去，不然 session 裡 curl 這兩個會被擋掉。Trusted 那組不用動，我這個 session 三個 host 都通。
4. 自己維護 marketplace、之前為了繞開 pluginRoot 把每個 source 都寫成完整相對路徑的，維持原樣。縮寫現在能用，可是使用者裡只要還有人停在 2.1.238，改了他就裝不起來。
5. `extensions.worktreeConfig` 的 repo 配上 Linux sandbox，本來 sandbox 裡的 git 全壞。升上來就好，沒有要設的東西。
6. `SessionStart` 或 `Setup` hook 跑很久的 repo，之前為了避免容器被回收而拆成兩段的，可以合回去。
7. BOM 這條不用管。我復現不出來，帶 BOM 的專案 skill 和 slash command 在 2.1.238 就讀得到，修的應該是別的路徑。真有 skill 憑空消失再回頭查它。
8. 釘 `stable` 的機器現在停在 2.1.231，上面這些一條都收不到。

---

*版號、發版時間、dist-tags 來自 npm registry，`anthropic` 1.0.0 的上架時間來自 PyPI，條目引自官方 changelog。`claude -c` 跨目錄撈錯 session、`pluginRoot` 的 bare source 在 2.1.238 被拒、帶 BOM 的 skill 兩版都讀得到，是拿 2.1.238 和 2.1.239 兩份 linux-x64 執行檔對跑出來的；`TypeError` 那句原文出自裝進乾淨 venv 的 `anthropic==1.0.0`（本機實測）。pluginRoot 的引文來自官方 marketplace 文件（官方文件）。這個容器 `api.github.com` 回 403，`pushed_at` 一樣拿不到。搜尋結果裡有把 2.1.233 的 Windows auto mode 修正掛到 2.1.239 名下的二手整理，別採信（社群）。*

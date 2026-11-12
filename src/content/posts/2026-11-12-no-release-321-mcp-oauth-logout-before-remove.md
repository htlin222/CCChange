---
title: "沒有新版：2.1.321 補的 MCP OAuth 轉址，升上去不等於處理完"
description: "322 到現在 46 小時，沒有新版。321 那條 refresh token 被轉址帶走的修，升級只擋住以後，已經送出去的要自己去撤。"
published: 2026-11-12
category: "Changelog"
tags: ["claude-code", "changelog", "mcp", "oauth", "security"]
annotation: "先 logout 再 remove，順序反了等於沒撤。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 今天 | 沒有新版。2.1.322 是 11-10 01:58 UTC 上 npm 的，到現在 46 小時 |
| changelog | 最上面還是 322 那一條 Vertex fast mode，沒有新段落 |
| `stable` | 還在 2.1.311，10-26 推的，16 天沒動。`latest` 和 `next` 都指 322 |
| 要回頭看的 | 321 那條「轉址時 refresh token 之類的祕密會被送到別的 host」 |
| 321 實際加了什麼 | OAuth 走的 fetch 自己接管轉址，非同源整條擋掉，上限五跳（本機二進位比對）|
| 放行的例外 | 同源，加上同一個 hostname 從 http 升到 https。其他一律丟錯 |
| 319 就有的那一半 | 另一條走 http adapter 的路早就擋非同源轉址，`Refused a redirect to another origin` 在 319 裡面就有。漏的是 fetch 這條 |
| 這個檢查管不到的 | MCP 自己的 JSON-RPC 流量被豁免，body 是 JSON-RPC 2.0 就不檢查 |
| 開關 | 預設開，本機沒有環境變數也沒有 settings 可調，遠端關得掉（本機二進位比對）|

## 為什麼要改

上游兩份 advisory 把範圍講得比 changelog 清楚。TypeScript SDK 那邊是 [CVE-2026-111769](https://github.com/advisories/GHSA-6prh-2h8m-c8cw)，`@modelcontextprotocol/sdk` 1.32.0 以前都中獎，CVSS 6.5；Python 的 `mcp` 另開一支 [CVE-2026-116685](https://github.com/advisories/GHSA-5h93-6whr-6q8j)，分水嶺在 1.30.0 和 2.2.0，評到 5.9。

走掉的不是 bearer token。兩份都寫 `fetch` 跨源的時候本來就會把 `Authorization` 拔掉。跟著轉址走的是 307 和 308 帶過去的 request body，而 OAuth 換 token 那一發的 body 裡面躺著 refresh token 和 client secret。你自己在 `headers` 設的 API key 也會一起過去。

威脅模型跟直覺有點差距。TypeScript 那份的原話是 a malicious server gains nothing from this, since it already receives requests directly。壞掉的 server 本來就直接收得到你的請求，不必繞這一圈。真正有風險的是有人能動一台你信任的 server 的轉址。

要動手的理由在[官方 MCP 文件](https://code.claude.com/docs/en/mcp)裡那句：移掉一台 remote server 的時候，Claude Code 會刪掉存在本機的 token，但 Claude Code doesn't revoke the tokens at the authorization server that issued them。文件自己叫你先跑 `claude mcp logout <name>`，再 `claude mcp remove <name>`。

## 對你的流程有什麼影響

1. 升到 322，別等 `stable`。那個 tag 還在 2.1.311，10-26 的東西，319 和 321 兩批權限修它都還沒有。
2. 升完事情沒結束。Python 那份 advisory 講得最白：upgrading alone does not address credentials that may already have been sent。
3. 先把名單列出來，`claude mcp list`，挑出 http 或 sse 而且走 OAuth 的那幾台。stdio 的不用管，TypeScript 那份明寫 stdio clients are not affected，Python 那份點名的也只有 HTTP 和 SSE。
4. 自己架的那幾台也不用管，你知道它轉去哪。剩下別人家的，而且你講不出它這幾週的轉址長什麼樣，就 `claude mcp logout <name>` 清掉本機那份，然後回它的後台撤 token、換 client secret。advisory 的字是 rotate the API keys and client_secret your application held and revoke its tokens。
5. 順序別弄反。先 logout 再 remove。直接 remove 只刪本機檔案，發出去的那張票在對面還是有效。
6. `.mcp.json` 裡塞過 `headers` 的話，那把 key 也在範圍內，一起換掉。
7. 換的時候順手收窄 `oauth.scopes`，把要用的幾個釘住。
8. 之後哪台 server 登不進去，畫面寫 `Stopped an OAuth request because of where its redirect pointed`，那就是這個新檢查在擋。訊息自己寫了去找那台 server 的管理者改轉址，你這邊沒有設定可以放它過。不過我不會把這個檢查當成裝好就有的保證：它的開關在 Anthropic 手上，不在你的 settings 裡，所以該撤的憑證還是得撤。

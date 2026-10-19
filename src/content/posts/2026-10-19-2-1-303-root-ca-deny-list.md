---
title: "2.1.303：changelog 只寫 Bug fixes，二進位裡多了一份 root CA 封鎖名單"
description: "這版硬編了四張 emSign 根憑證的封鎖名單，連 NODE_EXTRA_CA_CERTS 一起過濾，而且沒有開關能放行。Mozilla 自己還沒撤掉這四張的信任。"
published: 2026-10-19
category: "Changelog"
tags: ["claude-code", "changelog", "tls", "ca-certificates", "corporate-proxy", "env-vars"]
annotation: "官方 changelog 就一行 Bug fixes and reliability improvements。實際加的是一份信任否決清單，沒有任何開關關得掉。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.303 | 10-18 21:15 UTC 上 npm，距這篇 2.9 小時 |
| 官方 changelog | 一行「Bug fixes and reliability improvements」，沒有列任何項目 |
| `stable` | 還是 2.1.292 |
| root CA 封鎖名單 | 新增。四張 emSign 根憑證的 DER SHA-256，外加同四把公鑰的 SPKI SHA-256。這八個值在 2.1.302 的二進位裡找不到（本機實測） |
| 過濾範圍 | 內建 Mozilla 根、系統憑證庫、`NODE_EXTRA_CA_CERTS` 三個來源各過一遍，巢狀的往下剝最多 8 層 |
| 放行開關 | 沒有。沒有環境變數，也沒有 settings 鍵能把某一張放回去 |
| `CLAUDE_CODE_CERT_STORE=system` | 讀不到系統庫 API 時，2.1.302 把信任交回 runtime 預設，這版改成載入內建根 |
| 新增訊息 | 三句走 stderr，不開 `--debug` 也看得到，講 `NODE_EXTRA_CA_CERTS` 的整份檔案或單一區塊被丟掉 |
| 全部被擋時 | 丟 `No root certificates are left to trust`，要你升版 |

被擋的四張是 emSign Root CA - G1、emSign ECC Root CA - G3、emSign Root CA - C1、emSign ECC Root CA - C3，都出自 eMudhra。

## 為什麼要改

eMudhra 自己在 [Mozilla Bugzilla #2018979](https://bugzilla.mozilla.org/show_bug.cgi?id=2018979) 交過退場計畫。G1 和 ECC G3 底下非 TLS 的中介 CA 在 6 月 14、15 兩天撤銷完畢；C1 和 ECC C3 則提議把 Email 和 TLS 兩個信任位都設成 2026-06-15 起的 distrust-after。

那串還沒結案。Mozilla 的 root store 管理者 Ben Wilson 在同一串裡說 distrust-after 和整張移除是兩件不同的事，而且兩件都還沒做。所以這四張今天仍在 Mozilla 的清單上，也仍在 Claude Code 自己打包的那份 Mozilla 根憑證裡。這版的做法是照常打包，載入的時候再剝掉。

[企業網路設定那頁](https://code.claude.com/docs/en/corporate-proxy#ca-certificate-store)把 `CLAUDE_CODE_CERT_STORE` 的兩個值、它跟 `NODE_EXTRA_CA_CERTS` 怎麼疊、Node 版本的門檻都寫清楚了。封鎖名單一個字沒提。配上那行 changelog，現在要知道它存在只能自己翻二進位。

SPKI 那四組雜湊值得單獨說。它比的是公鑰而不是憑證，所以同一把金鑰重簽一張新的根憑證照樣擋，換殼不換鑰是沒有用的。

## 對你的流程有什麼影響

1. 先看自己機器上有沒有這四張。Linux 或任何 PEM bundle：

```bash
openssl crl2pkcs7 -nocrl -certfile /etc/ssl/certs/ca-certificates.crt |
  openssl pkcs7 -print_certs -noout | grep '^subject.*emSign'
```

macOS 換成 `security find-certificate -a -c emSign /Library/Keychains/System.keychain`。這個容器的系統憑證庫和代理 bundle 各有這四張，Debian 那組 Mozilla 憑證還在發。

2. 有也不用急著動手。格式正常的 PEM 區塊會被安靜剝掉，同一份檔案裡剩下的憑證照用。我在這個容器拿 2.1.303 配一份含這四張的 127 張 bundle 跑，連 API 一次就通（本機實測）。

3. 要處理的是 stderr 那三句。只有在 Claude Code 解不開那個區塊時才會印，看到就照它說的做：加 `--debug` 把 SHA-256 撈進 log，從 bundle 裡把那張刪掉。別去調 `CLAUDE_CODE_CERT_STORE`，調它不會讓名單放行。

4. 有設 `CLAUDE_CODE_CERT_STORE=system`、跑的又是 Node 22.15 以前的 npm 安裝，這版信任來源變了。以前那種情況 Claude Code 什麼都不蓋，交回 Node 預設；現在改成載入內建的 Mozilla 根。明寫 `bundled,system`，或把 Node 升上去，不然你信的東西跟升版前不一樣。

5. 沒有放行開關這件事記著就好。哪天內部站台的憑證鏈走到 emSign，`curl` 和瀏覽器都正常、只有 Claude Code 連不上，這裡是第一個要翻的地方，而且除了換版本沒別的辦法。擋這四張我沒意見，Mozilla 遲早也會動；我不太能接受的是它被歸進「Bug fixes」，文件也沒補。真的踩到的那天，你會先去懷疑代理設定，不會想到是 CLI 自己否決了一張根憑證。

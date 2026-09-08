---
title: "沒有新版：auto mode 的內建規則在 2.1.261 動了三條，2.1.263 一個字沒改"
description: "latest 卡在 2.1.263 四十六小時。該看的是 auto mode 那張規則表，它跟著版本走，而 2.1.261 改的三條裡只有一條寫進 changelog。"
published: 2026-09-08
category: "Changelog"
tags: ["claude-code", "changelog", "auto-mode", "permissions", "settings"]
annotation: "changelog 報了一條，實際上動了三條。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 新版 | 沒有。latest 還是 2.1.263，09-06 02:07 UTC 發的，距這篇 46 小時 |
| stable | 還是 2.1.236，08-19 18:45 UTC 發的，第十九天 |
| auto mode 內建規則 | 2.1.263 的 `claude auto-mode defaults` 跟 2.1.261 一個 byte 不差，都是 74280（本機實測） |
| 2.1.261 動了幾條 | 108 條裡三條，全在 `soft_deny`（本機實測） |
| Public Data-Sharing Upload | 網址本身夾著內容的連結也算上傳，寫進 PR 或 issue 就成立 |
| Code from External | 判準從指令長什麼樣，換成跑起來的東西是哪裡來的 |
| Unrequested Artifact Publish | 多一句，`The user asked for more questions` 不算答覆 |

changelog 只寫了中間那條。

## 為什麼要改

這張表是隨版本進來的，不是遠端發下來的，所以 `claude auto-mode defaults` 印出來的就是你這台正在用的那份。它不用登入也跑得動，把兩個版本的輸出丟進 diff 就看得出差在哪（本機實測）。

Public Data-Sharing Upload 以前只管你有沒有真的把東西送去 pastebin、mermaid.ink 那類地方。2.1.261 補上這段：

> A link to such a service whose URL itself encodes the content — in its path, query string, or `#fragment` (e.g. mermaid.live `#pako:`, mermaid.ink `/img/`, quickchart `?c=`) — is this upload too when posted or written anywhere it will be opened or fetched

`mermaid.live/#pako:...` 這種連結，內容整包壓在 fragment 裡。貼進 PR 描述的當下沒有任何請求送出去，所以以前攔不到。現在算上傳，理由是誰點開誰就替你送過去。

changelog 沒提的是 Code from External，那條改得大得多。舊的列指令形狀：`curl | bash`、`Invoke-Expression`、pickle 反序列化。新的改看來源。transcript 裡只要看得到某個目錄是 clone 或解壓出來的，在那底下跑 interpreter、build tool、test runner 或套件管理器，一律跟 `curl | bash` 同一級。規則裡還特別補了一句：就算唯一看得見的程式碼是 agent 自己那句 `-c`，也一樣。舉的例子是 `curl -o kit.zip …; unzip kit.zip -d kit; cd kit && python3 -c …`。拿 shell 工具去 list、read、grep 那些檔案不在內。

[官方文件](https://code.claude.com/docs/en/auto-mode-config)寫 `permissions.deny` 在 classifier 之前就擋掉，這句是準的。它沒寫的是你的 deny 規則同時會整份貼進 classifier 的 prompt，後面附一句叫它抓換工具繞路，點名 `python -c`、`sed -i`、`cat >` 和 heredoc（本機實測，2.1.259 到 2.1.263 都有）。

## 對你的流程有什麼影響

1. 先印一份自己那台的來對：

   ```bash
   claude auto-mode defaults --label 'Public Data-Sharing'
   ```

   印出來那段有沒有 `#pako:` 就是分界。2.1.259 沒有，2.1.261 起有（本機實測）。

2. 往後在 PR 描述或 issue 裡貼 `mermaid.live` 的 `#pako:`、`quickchart` 的 `?c=` 這種連結會被擋。它在 `soft_deny`，先講明你要貼就過得去。懶得每次講的話改用 markdown 的 mermaid 圍欄，GitHub 自己會畫，內容不出去。

3. 每天那套 `npm pack` 抓 tarball、解開、跑裡面 `package/claude`，正好落在新的 Code from External 上。先解壓、再 `cd` 進去執行，規則自己舉的例子就是這個形狀。在自己機器上跑同一套，開場先寫明要解哪個 tarball、要跑裡面哪支執行檔，soft_deny 就清掉了。

4. 09-05 那篇說 `Read(./.env)` 擋不住 `git diff .env`，那句在 permission 那一層還是對的。auto mode 下多一道：classifier 手上有你完整的 deny 清單，被交代要看你是不是換個工具做同一件事。判的還是模型，不是規則引擎。

5. Unrequested Artifact Publish 那條不用管。改的是把「使用者又要了一輪問題」歸到還沒回答這一邊，你本來就不會拿它當同意。

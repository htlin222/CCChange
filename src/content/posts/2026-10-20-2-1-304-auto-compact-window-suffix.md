---
title: "2.1.304：`CLAUDE_CODE_AUTO_COMPACT_WINDOW=200k` 在這版之前一直是 100k"
description: "這個環境變數現在吃得下 k 和 M 後綴。2.1.303 以前寫 200k 會被讀成 200，然後靜靜夾到 100k 下限，沒有任何提示。"
published: 2026-10-20
category: "Changelog"
tags: ["claude-code", "changelog", "auto-compact", "env-vars", "cloud-sessions", "skills"]
annotation: "寫 200k，拿到 100k。錯在打字的那一瞬間，但要翻到 /context 的分母才看得出來。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.304 | 10-19 19:47 UTC 上 npm，距這篇 4.4 小時。`stable`、`latest`、`next` 三個 tag 都指它 |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | 開始接受 `200k`、`200M` 這種寫法；值超出範圍或讀不懂時，走 stderr 說一句 |
| 同一個鍵在 2.1.303 | `200k` 讀成 `200` 再夾到 100000 下限，`abc` 整個忽略，兩種都不出聲（本機實測） |
| skill 的 hooks 沒掛上 | 新增一句警告，並且講明這個 skill 的 `allowed-tools` 也一起沒給 |
| 每個來源的 skill hooks | 新上限 1024 個 hook、16384 個 matcher 字元，沒有自己的訊息 |
| 排程的雲端 session | 子代理的 WebFetch 撞到未核准網址，以前每一個都空等五分鐘，這版修掉 |
| 壓縮後的 skill 清單 | 壓縮完改成自動重送，`/reload-skills` 改成只送新的或改過的 |

同一版 76 項裡還有幾個會掉東西的。`claude --worktree` 在 HEAD detached 的狀態離開時，連 commit 一起刪掉。`rm -r` 打在掛載點頂層少了安全確認。`CLAUDE_CODE_TRANSCRIPT_LOCAL_GC` 修剪檔案的途中磁碟滿了，會從存下來的 transcript 裡掉訊息。還有 `sandbox.filesystem.denyRead` 的 glob 含方括號時，Linux 上的沙箱指令整個起不來。

## 為什麼要改

[env-vars 那頁](https://code.claude.com/docs/en/env-vars)到現在還寫著舊行為：「Accepts a plain integer such as `500000` only: a value like `500k` reads as `500` and clamps to the 100K minimum.」文件沒寫錯，它描述的就是 2.1.303。

麻煩的是同一個站的[雲端 session 那頁](https://code.claude.com/docs/en/claude-code-on-the-web)叫你去環境變數裡設這個鍵，而且那是唯一的辦法：雲端 session 自己會塞一個 `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`，蓋掉你設的。我寫這篇的容器裡就有一個 `=80`（本機實測）。所以在雲端，視窗大小是你唯一能動的地方，而它在 2.1.303 上收到 `200k` 會砍一半，不吭聲。

兩個版本餵同一個值，看 `/context` 的分母：

| 值 | 2.1.303 | 2.1.304 |
| --- | --- | --- |
| `200k` | `26.9k / 100k` | `26.9k / 200k` |
| `200000` | `26.9k / 200k` | `26.9k / 200k` |
| `200` | `26.9k / 100k`，不出聲 | 一樣 100k，但 stderr 講了 |
| `abc` | `26.9k / 1m`，不出聲 | 一樣忽略，stderr 講了 |

100k 視窗底下，33k 的 autocompact buffer 吃掉三分之一；200k 底下是 16.5%。

## 對你的流程有什麼影響

1. 先查值。本機 `env | grep AUTO_COMPACT`，雲端翻 environment 的環境變數頁，再看 `~/.claude/settings.json` 的 `autoCompactWindow`。帶 `k` 或 `M` 的就是中了，而且你也查不出中了多久。

2. 查完不要相信那個值，去看分母：

```bash
claude -p "/context" | grep '^\*\*Tokens'
```

印出來的 `/ 100k` 或 `/ 200k` 才是實際生效的。在 2.1.303 上這是唯一看得出來的地方。

3. 要補就寫純整數 `200000`。`200k` 只有 2.1.304 以後才對，只要還有一台機器或一個雲端環境沒升上來，整數在兩邊都是對的。我自己會繼續寫整數，等升版落地一輪再說，省得之後還要回來查哪台是哪台。

4. 別再動 `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` 想讓雲端 session 晚一點壓縮。那個值雲端自己會設，會蓋掉你的，能調的只有視窗大小。

5. 排程的雲端 session 升到 2.1.304。這個 repo 的每日出刊就是這種跑法，主 session 抓網頁、子代理也抓網頁。以前每個子代理撞到未核准網址都要卡五分鐘，一輪研究開五六個就是半小時。這一條省下來的時間，比你把 prompt 寫短省下來的多。

6. 有靠 hooks 擋 tool call 的 skill，看到 `This skill declares hooks, and they were not registered in this session` 就當它完全沒在擋。`allowed-tools` 連帶不給，所以你會先發現權限對話框變多，不會先發現檢查不見了。1024 個 hook 的新上限沒有自己的訊息，就靠這一句。

7. 習慣壓縮完打 `/reload-skills` 把 skill 清單叫回來的，這版起不必了，壓縮自己會重送。反過來，`/reload-skills` 現在只送改過的，想用它補回整份清單是叫不動的。

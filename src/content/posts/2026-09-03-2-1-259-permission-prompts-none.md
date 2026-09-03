---
title: "2.1.259：無人看管的 -p 不用再靠 bypass，MCP 允許清單改成只管你自己加的"
description: "三十七條裡跟你有關的有六條。最該先動的是 CI 裡那幾行 --dangerously-skip-permissions，現在有更小的旗標可以換掉它。"
published: 2026-09-03
category: "Changelog"
tags: ["claude-code", "changelog", "permissions", "mcp", "skills"]
annotation: "無人看管的 -p，現在可以選擇拒絕，而不是全部放行。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 版本 | 2.1.259，09-02 21:21 UTC 上 npm，距這篇 2.9 小時，三十七條 |
| `--permission-prompts` | 新旗標，只在 `--print` 下作用。`host` 是舊行為，`none` 是沒人答，會問的一律拒 |
| `Read()` deny 規則 | 補上寫在選項值裡的檔案（`--ignore-revs-file=.env`、`-f.env`、`@file`）、`git diff` 的檔案參數，以及 `cd DIR && cat FILE` |
| `grep -r`／`cp -r` | 掃過含有被 deny 檔案的目錄，現在會問 |
| skill 和 command 的 `model:` | 互動 session 以前整個忽略，現在生效。auto 模式接不了的就退回 session 模型 |
| `allowedMcpServers` | 改成只管使用者自己加的 server，`managed-mcp.json` 派下來的不再被它濾掉 |
| `managedMcpServers` | 新的 managed 設定，組織直接發 HTTP／SSE server，寫 command 的條目會被跳過 |
| `claude plugin validate --json` | 驗證報告能機器讀了 |
| `~/.claude.json` | 同時開多個 session 不再互相蓋掉，workspace trust 不會被重設 |

剩下的是 VS Code 側欄、GitLab 的 MR 顯示、各家 gateway 認證，還有遠端 session 的幾條修補。

## 為什麼要改

`claude -p` 底下碰到要問的事，以前只有兩條路。一條是接 `--permission-prompt-tool`，自己養一個回答者；另一條是 `--dangerously-skip-permissions`，全部放行。無人看管的機器大多選了後者，因為前者要多開一個 MCP server 才跑得起來。

2.1.259 補上第三條。執行檔的 `--help` 這樣寫（本機實測，2.1.258 沒有這個旗標）：

```
--permission-prompts <target>  Who answers permission prompts with
                               --print: "host" (the SDK host or
                               --permission-prompt-tool) or "none"
                               (nobody: anything that would prompt is
                               denied automatically; the permission
                               mode still decides everything else)
                               (choices: "host", "none", default: "host")
```

括號裡的後半句才是重點：被拒的只有那些會跳出來問的，allow 規則和權限模式照常決定其餘。二進位裡對應的那行是 `no approval surface in this session; permission request denied automatically`。

比較意外的是文件還沒跟上。[官方 CLI reference](https://code.claude.com/docs/en/cli-reference) 只列了 `--permission-mode` 和 `--permission-prompt-tool`，沒有這一條；[managed MCP 那頁](https://code.claude.com/docs/en/managed-mcp) 也還寫著 `allowedMcpServers` and `deniedMcpServers` apply to managed servers too，跟 changelog 講的相反。這兩頁這幾天先別當準。

## 對你的流程有什麼影響

1. CI 裡跑 `claude -p` 的地方，把 `--dangerously-skip-permissions` 換掉：

   ```bash
   claude -p --permission-prompts none "..."
   ```

   allow 清單沒涵蓋到的工具會被拒，不會卡在那裡等人回答。跟 bypass 的差別在於它不會趁你沒看的時候放行一個你沒想過的指令。先挑一支不重要的 job 跑一輪，看被拒掉的是不是你預期的那幾個。

2. 接著看 deny 清單會不會因此變吵。這個 repo 的 `.claude/settings.json` 有 `Read(./.env)` 和 `Read(./.env.*)`，2.1.259 之前 `git diff .env` 繞得過去，現在繞不過去了。代價是 `grep -r` 掃過含有被 deny 檔案的目錄也會問你。互動用沒差，配上第 1 點的 `none` 就會變成直接拒。

3. 找一下有沒有哪支 skill 或 command 的 frontmatter 寫了 `model:` 然後忘了：

   ```bash
   grep -rn '^model:' ~/.claude/skills ~/.claude/commands
   ```

   以前互動 session 讀不到它，寫了等於沒寫，今天起會生效。這個 repo 的兩支 skill 都沒寫（本機實測）。

4. MCP 那兩條不用管。它們的前提是你機器上有 `/etc/claude-code/managed-mcp.json`，或是 MDM 派下來的 managed settings，你兩個都沒有。要留意的只有上一節講的那個文件落差。

5. `claude plugin validate --json` 進 CI 之前，先弄清楚它的報告長什麼樣：

   ```bash
   claude plugin validate --json --strict .claude
   ```

   乾淨的目錄回的是 `contents: []` 配 `success: true`，意思是沒發現問題，不是沒掃到東西。我拿一支缺 `description` 的 SKILL.md 餵進去，它出現在 `contents` 裡；把 description 補上，它就消失了（本機實測）。當成元件清單看會看錯，它是一份 findings 報告。

6. 本機 session 和雲端排程 session 同時開的話，這版值得馬上升。2.1.259 之前兩邊會互相蓋掉 `~/.claude.json`，workspace trust 被重設、MCP 和專案狀態不見，都是這條的症狀。

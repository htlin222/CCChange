---
title: "2.1.268：PermissionRequest hook 在 -p 底下一直沒跑過"
description: "掛在 CI 裡的那份 PermissionRequest hook，2.1.267 以前不會觸發。同一份設定在兩版各跑一次，一次沒有紀錄檔，一次有。SessionEnd 的逾時環境變數也是這版才真的有用。"
published: 2026-09-11
category: "Changelog"
tags: ["claude-code", "changelog", "hooks", "permissions", "headless"]
annotation: "設定寫在那裡，不代表它跑過。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 2.1.268 | 09-10 18:41 UTC 發，96 條，距這篇 5.6 小時 |
| PermissionRequest hook | `-p` 模式下之前完全不觸發，這版才會（本機實測） |
| `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` | 之前只放寬總預算，沒寫 `timeout` 欄位的 hook 照樣 1.5 秒被砍（本機實測） |
| Bash 的 deny 規則 | 同一行出現 `env -C`、`eval` 這類解析不動的指令，整行的 `Read()` deny 就不算數。補了 |
| `CLAUDE_CODE_WEBFETCH_DEADLINE_MS` | 新的。WebFetch 預設 300 秒斷線，設 0 關掉 |
| 第三方 `ANTHROPIC_BASE_URL` | 2.1.265 起每一輪都 400，卡在 Artifact 工具 schema 的一條 regex |
| `/mcp`、`claude mcp list` | 會把 `${VAR}` 展開後的值印出來，plugin 的錯誤訊息也漏 git URL 裡的 token |
| 閒置 session | 有個 busy loop 會吃滿一顆核 |
| `claude auth status --json` | 多一欄 `configDirectory`（本機實測） |
| `stable` | 還是 2.1.236，22 天沒動 |

沒細講的：gateway 的 `pricing:` 和 CIDR 警告、`gatewayInternalNetworks`、`claude self-hosted-runner --remove-session-state`、`claude plugin` 那批 `--json`，還有幾十條 VS Code、Claude in Slack、Code Review 的修正。

## 為什麼要改

PermissionRequest hook 就是拿來在沒有人看著的時候做決定的，而 `claude -p` 正是那個場合。它在那裡不跑，CI 裡那份 hook 等於沒掛。

我在 2.1.267 和 2.1.268 上各跑一次，同一份 settings、同一句 prompt，都是要它寫一個工作目錄外的檔案。前者跑完連計數檔都沒生出來，後者有一行（本機實測）。

SessionEnd 那條比較陰。[官方 hooks 文件](https://code.claude.com/docs/en/hooks)寫的是 SessionEnd hooks share a 1.5-second budget，要放寬就在 hook 裡加 `timeout`，環境變數那條路整頁沒提。2.1.267 的二進位裡它確實只餵給算總預算的那個函式，真正砍掉單一 hook 的還是寫死的 1500。2.1.268 拆成兩個函式，環境變數兩邊都讀。

deny 規則那條是[權限文件](https://code.claude.com/docs/en/permissions)講過的承諾：「Deny and ask rules apply when any subcommand matches them, including a command nested inside a subshell, a command substitution, or a control-flow body」。同一行裡只要有一個它解析不動的指令，整行就退回問你，deny 不算數。

## 對你的流程有什麼影響

1. CI 裡那份 `claude -p` 如果掛了 PermissionRequest hook，先當它從來沒跑過。升到 2.1.268，再自己確認一次：

   ```bash
   printf '{"hooks":{"PermissionRequest":[{"matcher":"*","hooks":[{"type":"command","command":"echo FIRED >> ./fired.log"}]}]}}' > s.json
   claude -p "用 Write 工具在 /tmp/x.txt 寫 hello" --settings s.json --permission-mode default < /dev/null
   ```

   2.1.267 跑完沒有 `fired.log`，2.1.268 有。

2. SessionEnd hook 只要會跑超過 1.5 秒，兩條路挑一條：hook 物件裡加 `"timeout": 10`，或者開 `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS=10000`。後者在 2.1.268 之前對沒寫 `timeout` 的 hook 沒用。我用一個 `sleep 3` 的 SessionEnd hook 跑四種組合，只有 2.1.268 加環境變數那一格寫得出檔案。

3. 拿這行去打你自己的 deny 規則：

   ```bash
   env -C /tmp true; cat /你/deny/掉的/檔
   ```

   2.1.267 讀給你看，2.1.268 回 blocked by a deny rule。別就此安心，`env -C <目錄> cat <相對路徑>` 這種寫法兩版都照樣讀得到（本機實測）。deny 擋的是它看得懂的那些指令。

4. 順手檢查規則怎麼寫的。`Read(/tmp/x)` 不是絕對路徑，單一斜線是從設定檔那層起算，要 `Read(//tmp/x)` 才對。我第一次測的時候栽在這裡，規則整條沒作用還以為是 bug。

5. `CLAUDE_CODE_WEBFETCH_DEADLINE_MS` 不用設。預設 300 秒，碰得到它的只有伺服器把連線掛著不關那種情況。

6. 有 wrapper 走第三方 `ANTHROPIC_BASE_URL` 的話，2.1.265 到 2.1.267 整段是壞的，每一輪 400。這幾天覺得某個 proxy 突然不能用的話，原因在這。

7. `/mcp` 或 `claude mcp get` 的輸出貼進過 issue、PR 或截圖的，回去看一眼。那幾版會把 `${VAR}` 解出來的值直接印在畫面上。

8. `stable` 頻道還是 2.1.236，後面疊了三十幾個版本，上面這幾條修正一條都沒有。你要是把 CI 釘在 `stable`，前面七點對你來說都還沒發生。

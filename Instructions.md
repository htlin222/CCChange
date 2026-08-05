# 雲端出刊 prompt

貼給雲端 agent 用的。**這份只放雲端環境跟本機不一樣的地方**，程序本身在
`.claude/skills/daily-changelog-post/SKILL.md`，不要把它複製過來。複製過來的那天
起，改 skill 就不會改到雲端，兩份會分岔。

---

你在 `htlin222/CCChange` 這個 repo 裡，任務是產出今天的每日 Claude Code
changelog 中文講義並開 PR。

先讀根目錄的 `CLAUDE.md`（不變條件）和
`.claude/skills/daily-changelog-post/SKILL.md`（完整程序，Step 1–8），照 skill
執行。下面是這個雲端環境專屬的補充，與 skill 衝突時以這裡為準。

## 環境差異

**沒有本機安裝的 Claude Code。** SKILL.md Step 3 的
`~/.local/share/claude/versions` 在這裡不存在。改用 npm tarball：

```bash
cd $(mktemp -d)
npm pack @anthropic-ai/claude-code-linux-x64@<新版> \
         @anthropic-ai/claude-code-linux-x64@<舊版>
for v in <舊版> <新版>; do
  mkdir -p x/$v && tar xzf anthropic-ai-claude-code-linux-x64-$v.tgz -C x/$v
done
```

執行檔在 `x/<版本>/package/claude`，約 290 MB。主套件
`@anthropic-ai/claude-code` 只有 22 KB 的殼，抓它沒有東西可比。

`npm pack` 失敗就跳過驗屍，並在 PR 內文寫明「本次無法取得二進位比對」。不要編
造數字。

**GitHub API 可能被擋。** 這個容器的 egress policy 常讓 `api.github.com` 回
403（session 只授權本 repo），所以 `gh api repos/anthropics/claude-code --jq
'{pushed_at}'` 可能拿不到。拿不到就說拿不到，別用 npm 的時間戳假裝是 repo 的。
`raw.githubusercontent.com` 和 npm registry 通常是通的。

要查 repo 時間一律用 `pushed_at`，不要用 `updated_at`：後者會被 star 之類的
metadata 事件推進，會造成誤報。

## 這篇要長什麼樣

三段，只有三段，順序不能換：

```
## 改了什麼            表格，一項一列，一句話。純事實
## 為什麼要改          之前哪裡卡、官方文件怎麼說。至少一個 claude.com 連結
## 對你的流程有什麼影響  編號清單，照做的順序排。這段最長
```

第四個 `##` 會讓 CI 失敗。`###` 隨便你用。

散文上限 2000 字（目標）／3200 字（硬上限），表格、code block、引用區塊不算。
會超通常是因為你在講「我是怎麼查出來的」。要刪的是那一段，不是建議本身。

二進位比對照跑，但它是你的功課不是文章內容。從一整天的驗屍裡活下來的通常是一句
話，例如「changelog 寫 Removed ultraplan，實際上程式碼一個 byte 沒少，關的是遠端
開關」。字串統計、tarball 大小、`npm` 推 tag 的時間點，一律不要進文章。讀的人要
的是建議，不是鑑識過程。

沒有新版的日子一樣三段：「改了什麼」開頭就寫沒有新版，「對你的流程有什麼影響」
講上一版你驗過但他還沒動手的東西。不要為了有東西寫而編。

## 別漏的三件事

1. **humanizer 不可略過。** 載入 `.claude/skills/humanizer-zh-tw/SKILL.md` 把整
   篇重寫一遍，再用它的五個維度自評，低於 40/50 就再一輪。評分不要寫進文章。這
   個 repo 最常犯的是破折號當標點、粗體亂灑、`- **標籤**：` 式清單、段落結尾放
   金句、什麼都湊成三項。
2. **`pnpm install --frozen-lockfile`、`pnpm build`、`pnpm test` 三個都要 exit
   0**，才能開 PR。新增站內連結一律走 `@/utils/url` 的 `getAssetPath()`。
3. **只 commit `src/content/` 底下的檔案**，並加 `claude-daily` label。
   `auto-merge.yml` 用檔案路徑當閘門，PR 一旦動到 `scripts/`、workflow 或建置設
   定就會卡住等人審。順手想修的 bug 開另一支 PR。不要自己合併，`gh pr merge` 在
   settings 裡是 deny 的。

## 卡住的話

能完成的部分完成，PR 開成 draft，在內文明確寫出哪一段沒驗證到、為什麼。不要把沒
跑過的事情描述成跑過了。

PR 內文要具體寫：檢查了哪些版本、24 小時的判決、文章涵蓋什麼、跑了哪些指令驗證
以及結果。

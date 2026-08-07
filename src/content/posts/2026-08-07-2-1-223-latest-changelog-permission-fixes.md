---
title: "2.1.223 上了 latest，changelog 也補了：這次該升"
description: "版本沒動，但 latest 從 2.1.222 推上來了，官方也把昨天還不存在的 changelog 補了出來。裡面有四條權限與沙箱修補，昨天那句「不用急著升」得收回。"
published: 2026-08-07
category: "Changelog"
tags: ["claude-code", "changelog", "security", "permissions", "settings"]
annotation: "核可對話框給你看的，跟 shell 真的收到的，是兩串字。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 版本 | 沒有新版。2.1.223 還是頂，npm 上發出來 25 小時了 |
| `latest` | 從 2.1.222 推到 2.1.223，`npm i -g` 現在會裝到它 |
| 官方 changelog | 昨天查沒有這一版，今天補上了，19 條 |
| 權限修補 | 動過手腳的 Bash 指令能把自己的一部分藏過權限檢查；tab 和隱形 Unicode 能讓核可對話框少顯示一段 |
| 沙箱修補 | workflow 腳本能用 dynamic `import()` 跑到沙箱外；agent 定義裡寫 `bypassPermissions` 能無視組織的停用政策 |
| `env` 合併 | 官方把範圍寫成 managed settings：伺服器下發的設定不再整塊關掉本機 `managed-settings.json` 或 MDM profile 的 `env` |
| `/review` | 變成 `/code-review` 的別名，不打等級就沿用你上次打過的那個 |

昨天那份 repo 指紋，changelog 沒提。`has_secrets_manager_refs` 在 2.1.223 的執行檔裡找得到、2.1.222 裡沒有，補出來的 19 條沒有一條在講它。

## 為什麼要改

四條修補是同一個形狀：你讀到的核可對話框，跟 shell 實際收到的字串，不是同一串。tab 和零寬字元把後半段推出可視範圍，你按了 y，跑掉的是你沒看到的那段。[官方 changelog](https://code.claude.com/docs/en/changelog) 把這四條都歸在 Fixed，沒給 CVE、沒給嚴重度、也沒講從哪一版開始中招，社群整理的[回歸檢查清單](https://dev.to/ahab_indieseek/claude-code-21223-permission-bypass-regression-checklist-58n9)第一句抱怨的就是這個。

`latest` 和 changelog 同一天到位。回頭看，昨天那個「只上 next、沒有 changelog」的狀態就是發佈發到一半。

模型視窗那條比較尷尬。`CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT` 是這一版才加進去的，執行檔裡的訊息叫你去 `modelOverrides` 登記模型，changelog 也寫 unknown keys「are now ignored as documented」。可是 [settings 文件](https://code.claude.com/docs/en/settings)今天查，`modelOverrides` 這個鍵不在上面。

## 對你的流程有什麼影響

1. 升。`npm i -g @anthropic-ai/claude-code`。昨天寫不用急，前提是 latest 還停在 2.1.222、而且沒有 changelog 可以對，兩個前提今天都不在了。
2. 升完別只認 CLI 那個版本號。IDE extension、背景 agent、desktop、CI 裡釘住版本的那幾行，各自解析各自的二進位，社群那份清單第一條就是這個。
3. 有在寫 workflow 腳本的，回頭看有沒有靠 dynamic `import()` 載東西。以前跑得動是因為它跑到沙箱外面去了，升上去會被擋。
4. 昨天那條 `env` 的提醒可以縮小。官方寫的是 managed settings 這一層，機器上沒有 `managed-settings.json`、也沒有 MDM profile 的話，不用管。
5. 習慣直接打 `/review` 的，第一次用先明確帶一個等級，例如 `/code-review high`。它現在沒帶等級會沿用上次那個，你不會知道上次是什麼。
6. 自架 gateway、或 `ANTHROPIC_MODEL` 填非官方名稱的，auto-compact 現在改用假定視窗把 session 夾住。`CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT=1` 回得去舊行為，但那是把保護關掉。把模型登記進 `modelOverrides` 才是正解，雖然文件上還查不到這個鍵。
7. 指紋那件事維持昨天的判斷，不用重新決定。官方補了 changelog 也沒把它寫進去，這件事還是只有比對執行檔才看得到。

---

*版本、dist-tag 與發佈時間取自 npm registry；changelog 條目與 `modelOverrides` 的文件缺漏經 code.claude.com 確認（官方文件）。新環境變數與指紋欄位來自本次下載並比對 2.1.222 與 2.1.223 執行檔（本機實測）。升級檢查範圍與 CVE 缺漏引自 DEV 社群整理（社群）。*

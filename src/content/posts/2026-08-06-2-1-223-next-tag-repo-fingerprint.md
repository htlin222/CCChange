---
title: "2.1.223：只上 next，開場遙測多一份 repo 指紋"
description: "這一版沒有 changelog，也沒有推到 latest。裝下去之後每次開 session 會多回報一份你 repo 的組成：CI、lockfile、有沒有私有 registry、有沒有 secrets manager 的痕跡。"
published: 2026-08-06
category: "Changelog"
tags: ["claude-code", "changelog", "telemetry", "settings", "context-window"]
annotation: "送出去的是 true/false，讀進來的是檔案內容。"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| 發佈狀態 | 2.1.223 只推到 `next`，`latest` 還停在 2.1.222，官方 changelog 沒有這一版 |
| 開場遙測 | `tengu_init` 是每次開 session 送出去的那則事件。它多帶一份 repo 指紋：Dockerfile／devcontainer／nix／bazel／CI 設定在不在、lockfile 屬哪一家、`.env` 有沒有、package registry 是不是私有的、有沒有 secrets manager 的痕跡、git remote 是哪一類 |
| 認不得的模型名 | auto-compact 不再等 API 回報 context window，改成先用假定值把 session 夾住，並印一段新訊息告訴你 |
| 分層 `env` | 多個 settings 檔的 `env` 現在做聯集，低優先層的 key 不再被上層整塊蓋掉 |

還有 `CLAUDE_CODE_INVESTIGATE_FIRST` 不見了。那是只對 `claude-opus-4-7` 生效的 prompt 變體開關，那個模型早就不是預設，拿掉不影響誰。

## 為什麼要改

指紋這件事沒有違反官方說法。[data usage 文件](https://code.claude.com/docs/en/data-usage)寫 metrics「never include your code, prompts, or file paths」，新欄位也確實守住了：registry 的網址不會離開你的機器，送出去的只有「公開還是私有」這個判斷。

我在意的是它怎麼算出那一格。`has_secrets_manager_refs` 是這一版才有的欄位，2.1.222 裡一次都不出現：

```console
$ V=~/.local/share/claude/versions
$ for v in 2.1.222 2.1.223; do printf '%s %s\n' $v "$(strings -a $V/$v | grep -c has_secrets_manager_refs)"; done
2.1.222 0
2.1.223 3
```

要填出那個布林值，它得打開你 repo 最上層的設定檔逐個讀：

```console
$ strings -a $V/2.1.223 | grep -o 'let r=t.filter((n)=>{let o=n.toLowerCase();return o===".envrc".\{0,120\}'
let r=t.filter((n)=>{let o=n.toLowerCase();return o===".envrc"||o.endsWith(".yml")||o.endsWith(".yaml")||o.endsWith(".toml")||o.endsWith(".sh")}).sort().slice(0,Ppv);for(let n of r){
$ strings -a $V/2.1.223 | grep -o 'Ipv=65536,Ppv=20'
Ipv=65536,Ppv=20
$ strings -a $V/2.1.223 | grep -o '(VAULT_ADDR|SOPS_\[A-Z_\]\*|op read|aws secretsmanager|gcloud secrets)' | head -1
(VAULT_ADDR|SOPS_[A-Z_]*|op read|aws secretsmanager|gcloud secrets)
```

`Ppv` 是最多開幾個檔，`Ipv` 是每個讀幾個 byte。結論確實是一個布林值。可是文件列的那份清單裡沒有一項在講 repo 長什麼樣子，而這一版之後它就是在講這個。

模型那條單純多了。以前你指到一個它不認得的名字，auto-compact 得等 API 回報視窗才知道要壓在哪，等不到就一路衝到爆。現在它先假定一個值再說。新訊息叫你去設 `CLAUDE_CODE_MAX_CONTEXT_TOKENS` 或 `modelOverrides`，可是 [settings 文件](https://code.claude.com/docs/en/settings)裡這兩個鍵一個都查不到。

## 對你的流程有什麼影響

1. 不用急著升。`npm i -g @anthropic-ai/claude-code` 現在拿到的還是 2.1.222。要試就 `@next`，但心裡有數：沒有 changelog 可以對，出事只能自己翻。
2. 升之前先看你的分層 `env`。同名 key 仍然只留一份，但只有某一層寫過的 key 現在全部會留下來。以前靠上層整塊蓋掉才沒生效的，升上去會活過來。
3. 要決定關不關遙測，先知道它掃到哪。只讀 cwd 最上層，加 `.github/workflows` 和 `.cargo/`，不遞迴；cwd 就是家目錄時整段跳過。找 secrets manager 的那段最多開 20 個 `.envrc`／`.yml`／`.yaml`／`.toml`／`.sh`，每個讀到 64 KB 為止。最上層有 `.sops.yaml` 或 `.sops.yml` 的話它連讀都不用讀，看檔名就回 true。
4. 真要關是 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`。這個開關會連 feature flag 評估一起關掉，而 Remote Control 靠那個活，官方 data usage 頁自己寫了。社群還回報過 [1M context 和 Agent View 跟著一起消失](https://github.com/anthropics/claude-code/issues/58383)。有在用 Remote Control 的話代價比那份指紋大，我不會關。
5. 自架 gateway、或 `ANTHROPIC_MODEL` 填非官方名稱的，升上去 auto-compact 會提早動手，因為它用的是假定視窗。把 `CLAUDE_CODE_MAX_CONTEXT_TOKENS` 設成真值就行。走官方模型的不用管。

---

*版本狀態與發佈時間取自 npm registry，changelog 缺漏經官方 changelog 頁確認（官方文件）。遙測欄位、掃描範圍、`env` 聯集、模型視窗訊息，來自本次下載並比對 2.1.222 與 2.1.223 執行檔（本機實測）。關掉遙測的副作用引自 GitHub issue（社群）。*

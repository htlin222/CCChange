---
name: daily-changelog-post
description: Mint the daily CCChange 講義 from the Claude Code CHANGELOG and open a PR. Use when asked to write today's post, run the daily routine, check whether Claude Code shipped a new version, or publish to the CCChange site. Handles the 24-hour freshness check, research, drafting, local verification, and the branch/commit/PR flow.
---

# Daily CCChange 講義

Produce one dated post in `src/content/posts/`, verify it locally, and open a PR
that CI can auto-merge. The whole run is non-interactive: never stop to ask for
approval, and never open a PR whose checks you have not run yourself.

## Non-negotiables

- **Never invent a version, timestamp, or quote.** Every factual claim in the
  post traces to a command you ran or a URL you fetched in this session.
- **"No update" is a valid post.** If nothing shipped in 24h, say so plainly at
  the top and pivot to depth on the most recent substantive release. Do not
  manufacture news.
- **Label every claim's provenance**: 官方文件 / 社群 / 本機實測.
- **Verify against the binary before you write.** That work is what makes the
  advice trustworthy. It does not go in the post — see Step 3.
- **The post answers three questions and stops.** 改了什麼 → 為什麼要改 →
  對你的流程有什麼影響, in that order, nothing else at `##` level. CI enforces it.
- **Every feature entry ends in an action or in 不用管.** Never 「可以考慮」.
- **Run the humanizer pass.** Step 6 is not optional. A post that reads like a
  changelog summariser wrote it has failed even if every fact is right.
- **Run `pnpm test` before the PR.** A red PR is worse than no PR.

The reader is one person who already uses all of this daily. He wants the
recommendation, not the trail that produced it. Write for him.

## Step 1 — Freshness check

```bash
date -u "+%Y-%m-%dT%H:%M:%SZ"

# Publish times are authoritative; GitHub's `updated_at` is NOT.
npm view @anthropic-ai/claude-code time --json | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=sorted(((v,t) for v,t in d.items() if v not in ('created','modified')), key=lambda x:x[1])
for v,t in items[-6:]: print(v,t)
"

# For any tracked repo, use pushed_at — updated_at moves on stars and metadata.
gh api repos/anthropics/claude-code --jq '{pushed_at}'
```

Record the exact delta in hours. That table is the top of the post.

## Step 2 — Read the source

```bash
curl -s https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md \
  -o /tmp/CHANGELOG.md
```

Split on `\n## ` and read the newest 2–3 sections in full.

## Step 3 — Verify against the binary (research, not content)

Do this every day, and keep almost none of it. The changelog says "Added"; the
binary says whether that means *new code* or *a newly exposed setting*. That
distinction changes the advice, which is why you check. The check itself is not
interesting to the reader.

```bash
NEW=~/.local/share/claude/versions/<latest>
OLD=~/.local/share/claude/versions/<previous>
for s in <symbol> ...; do
  printf "%-28s new=%s old=%s\n" "$s" \
    "$(strings -a "$NEW" | grep -c -- "$s")" \
    "$(strings -a "$OLD" | grep -c -- "$s")"
done
```

`0 → N` means genuinely new. `N → N+k` means the capability already shipped and
this release only surfaced a knob. Also run the feature where a claim is cheaply
checkable — a flag in a scratch dir, `timeout 150`, no state from his machine.

### What survives into the post

One sentence, in whichever of the three sections it changes the answer.

「changelog 寫 Removed ultraplan，實際上程式碼一個 byte 沒少，關的是遠端開關」
belongs in the post: it is why the advice is 別從腳本裡刪掉它. The `strings -a`
counts that established it, the tarball sizes, the sentence-diff totals, the
timing of the `npm` tag push — none of that goes in. He asked for the
recommendation, not the forensics.

If a check produced nothing that changes what he does, it produced nothing for
the post. That is a normal outcome and not a reason to write up the method.

Negative results still count, and they usually change the advice the most:
「文件說它會觸發，實際上在 `claude -p` 下叫不動」 turns into 不用接. Say the
setup broke if the setup broke; never dress an inconclusive run as a finding.

## Step 4 — Research the discussion

WebSearch for the version number and each headline feature. Fetch the official
docs page for anything with pricing, breaking changes, or a settings key —
secondary sources routinely garble those. Deliberately include at least one
source that is *not* flattering; a post with only praise is not an assessment.

## Step 5 — Write

File: `src/content/posts/YYYY-MM-DD-<kebab-slug>.md`

```yaml
---
title: "..."                       # required
description: "..."                 # required, 1–2 sentences
published: YYYY-MM-DD              # required, must match the filename date
category: "Changelog"
tags: ["claude-code", "changelog", ...]
annotation: "..."                  # optional pull-quote in the margin
---
```

### Who is reading

One person: the author. He already runs Claude Code daily, already maintains a
global `CLAUDE.md`, `settings.json`, hooks, skills, and this CI pipeline. He is
not evaluating whether to adopt the tool.

So: **never explain what Claude Code, a hook, a subagent, or `--print` is.** No
「這代表 Anthropic 正在把它做成 enterprise runtime」 industry-trend paragraphs;
he does not care about Anthropic's strategy, he cares what he has to change
before Thursday. Cut every sentence a reader who already knows all this would
skim.

### 三段骨架 — 只有三段，順序不能換

The reader asked for exactly three things and said he does not care about the
rest. So the post is three `##` headings and nothing else. `###` inside a
section is free; a fourth `##` fails the build.

The title carries the version, then what is actually in it — not a mood, not a
pun on its own.

```markdown
---
title: "2.1.222：ultraplan 被關掉，worktree 隔離擴大到檔案編輯"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| `/ultraplan` | 官方寫 Removed，實際上是遠端開關被關掉，程式碼還在 |
| worktree 隔離 | 攔截從 Bash 擴到檔案編輯，session 本身也被管，不再只管 subagent |
| Remote Control 自動啟動 | repo 層的 `remoteControlAtStartup: true` 不再能開啟它 |

## 為什麼要改

## 對你的流程有什麼影響

1. …
```

**改了什麼** — a table, one row per item, one sentence each. Facts only. A
release with fifteen entries still gets one table; the ones that change nothing
for him collapse into a single trailing sentence naming them. No prose about
how you established any of it.

**為什麼要改** — what was broken or annoying before, in his terms. 「你在 CI 裡
跑 `claude -p`，之前沒辦法知道 session 中途被掛進來的 repo 帶了什麼
`CLAUDE.md`」. Not 「提升了可觀測性」. This is the section that carries the
official doc link, because the reason is usually what the docs actually explain.
When a change solves nobody's problem, one sentence saying so is the correct and
complete answer: 「這個沒有在解決誰的問題，是內部清理」.

**對你的流程有什麼影響** — the section he came for, and the longest of the
three. A numbered list, in the order to do them, each item actionable without
rereading anything above it. 「去 `~/.claude/settings.json` 確認 `env` 裡沒有
`CLAUDE_CODE_ARTIFACT_COMMENTS_AUTOREACT`」, not 「評估是否啟用」. Items that
resolve to 不用管 say 不用管 and why in the same breath. If the whole release
comes to nothing, the list is one item saying what to watch for and when.

Your position lives here too, in the sentence that makes the recommendation:
「我不會開這個，因為它在我不在場的時候會改一個別人看得到的頁面」. A 「我的看法」
heading is banned outright — CI rejects it. Classification is not a position:
「適用面窄」 is a category, 「單 repo 的人接了只是給自己找事」 is a position. No
opinion at all is fine; manufactured opinion is worse than none.

### Length budget — CI enforces this

**Target 2000 characters of prose. Hard cap 3200.** `check-content.mjs` warns
over the target and fails the build over the cap.

Both numbers came down by more than half when this skeleton landed, because the
sections that ate the budget were the ones the reader did not want. Over target
almost always means a paragraph explaining how something was found out. Cut that
paragraph, not the advice.

Prose means the post with code blocks, tables, block quotes and link targets
stripped out. A settings snippet or a one-line command he is meant to paste
costs nothing against the budget, so keep those. What costs is narration.

### 其他 CI 會擋的事

- `title` 必須含版本號（`2.1.221` 這種 `x.y.z`）
- 三個 `##` 到齊、照順序、而且沒有第四個
- 「對你的流程有什麼影響」必須是編號清單
- 全文至少一個 `code.claude.com` / `platform.claude.com` / `docs.claude.com` 連結
- `我的看法` 不能當標題
- 禁用詞：「可以考慮」「這意味著」「對於…而言」「所謂的」

Run `pnpm test:content` while drafting, not just before the PR.

### 沒有新版的日子

Same three sections. 改了什麼 opens with 「沒有新版」 and a one-line table of
what is still current, 為什麼要改 becomes why the silence matters or does not,
and 對你的流程有什麼影響 covers whatever you verified in the last release that
he has not acted on. Do not manufacture news, and do not pad the gap with the
investigation you ran to confirm the gap is real.

### 中文寫作

Traditional Chinese. Code identifiers, settings keys and CLI flags stay in their
original form.

The recurring problem is 翻譯腔 — Chinese with English sentence architecture.
Concrete bans:

- **名詞化**：「它的定位是通知與治理」→「它負責通知和稽核，不擋人」
- **「這意味著」「這代表」**：大多可以直接刪掉，讓下一句自己說
- **「對於…而言」「在…的情況下」「所謂的」**：一律換掉
- **「進行/實現/執行 + 名詞」**：「進行驗證」→「驗」，「實現隔離」→「隔開」
- **名詞前面掛一長串修飾**：「一個會發出事件、而且你可以攔截的生命週期節點」
  → 拆成兩句
- **被動語態堆疊**：「這條規則被靜默載入」→「這條規則就這樣載進來了」
- **連續三句同長度**：插一句短的

Read it out loud in your head. If you would not say it to a colleague at a
whiteboard, rewrite it.

### 反例

`src/content/posts/2026-08-05-2-1-222-removed-ultraplan.md` is the reference for
what a post looks like under these rules. Its git history is the more useful
half: the version before the three-question rewrite had the same findings in
roughly four times the words, and the reader's verdict on it was 拉拉雜雜.

## Step 6 — De-slop the draft (mandatory)

Load `humanizer-zh-tw` (vendored at `.claude/skills/humanizer-zh-tw/SKILL.md`)
and run the whole draft through it. This is not a polish pass you may skip
because the draft "reads fine" — the first draft always reads fine to the model
that wrote it.

The patterns this repo produces most:

- **`——` everywhere.** It is the single loudest tell. Most become a comma or a
  full stop. Keep one per section at most.
- **Bold as emphasis spray.** Bold marks a term the reader will look for again,
  not every clause you thought was important.
- **Bold-label lists** (`- **稽核**：把…`). Prose them, or drop the labels.
- **Quotable one-liners** closing a section. If it sounds like a pull quote,
  cut it.
- **Emoji in tables and headings.** None.
- **Rule of three.** Two items or four, not always three.
- **Identical sentence lengths.** Break the run with a short one.

Then score it on the humanizer's five dimensions. Below 40/50, revise and score
again. Put nothing in the post about the scoring — it is a working step.

What must survive intact: the settings keys, the version numbers, the recommended
action, and the honest verdict behind it. De-slopping is about the prose around
the advice, never the advice.

## Step 7 — Verify locally

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

`check-content.mjs` enforces frontmatter and the filename/date agreement.
`check-build.mjs` catches internal links missing the `/CCChange` base — the
failure mode that only shows up in production. Both must exit 0.

If you add a component or a link helper, route every internal URL through
`getAssetPath()` from `@/utils/url`.

## Step 8 — Branch, commit, PR

```bash
git checkout -b daily/$(date +%Y-%m-%d)
git add -A
git commit   # message below
git push -u origin HEAD
gh pr create --title "..." --body "..." --label claude-daily
```

The `claude-daily` label is what `.github/workflows/auto-merge.yml` gates on —
**without it the PR will not auto-merge.**

PR body must state, concretely:
- which versions were checked and the 24h verdict
- what the post covers
- **which commands were run to verify it, and their results**

Commit message format:

```
post: <date> — <one-line subject>

<2–4 lines on what the post covers and how it was verified>

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

## Failure handling

If `pnpm test` fails, fix it and re-run. Do not open the PR, do not add the
label, and do not describe the run as successful. If something is genuinely
blocked, open the PR as a draft and say exactly what is unverified.

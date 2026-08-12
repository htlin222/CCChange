---
name: daily-post
description: Mint the daily 講義 from whatever sources config.toml defines and open a PR. Use when asked to write today's post, run the daily routine, check whether there is anything new to write about, or publish to the site. Handles the freshness check, research, drafting, local verification, and the branch/commit/PR flow.
---

# Daily 講義

Produce one dated post in `src/content/posts/`, verify it locally, and open a PR
that CI can auto-merge. The whole run is non-interactive: never stop to ask for
approval, and never open a PR whose checks you have not run yourself.

**What this site is about lives in `config.toml`, not here.** Read it first.
The sources, the section names, the length budget and the banned phrases all
come from there, and this file describes the flow that works for any of them.

## Non-negotiables

- **Never invent a fact.** Every claim traces to a command you ran or a URL you
  fetched in this session.
- **"Nothing new" is a valid post.** If nothing shipped, say so plainly at the
  top and pivot to depth on the most recent substantive item. Do not
  manufacture news.
- **Label every claim's provenance**: 官方文件 / 社群 / 本機實測.
- **Verify before you write.** That work is what makes the advice trustworthy.
  Most of it does not go in the post — see Step 3.
- **The post answers the configured questions and stops.** `[post].sections` in
  order, nothing else at `##` level. CI enforces it.
- **Every entry ends in an action or in 不用管.** Never 「可以考慮」.
- **Run the humanizer pass.** Step 6 is not optional. A post that reads like a
  summariser wrote it has failed even if every fact is right.
- **Run `pnpm test` before the PR.** A red PR is worse than no PR.

The reader is one person who already works in this domain daily. He wants the
recommendation, not the trail that produced it. Write for him.

## Step 1 — Collect

```bash
date -u "+%Y-%m-%dT%H:%M:%SZ"
pnpm fetch:sources
```

One line per source, and the normalised result at
`.cache/sources/YYYY-MM-DD.json`. Read that file; do not re-fetch by hand.

The per-source `meta` carries the freshness verdict — for `npm-changelog` that
is `latestVersion`, `ageHours`, `isFresh` and `repoPushedAt`. Publish times are
authoritative and `pushed_at` is the repo signal; `updated_at` moves on stars
and metadata, which is why no adapter reads it.

`--fresh` bypasses the cache floor. Use it sparingly: the floor exists because
repeated hits from one IP escalate to 403/429, not to save time.

If a source errors, it is recorded under `errors` in the output and the exit
code is non-zero. A failed feed is not an empty feed — never write 「今天沒有新
的」 on the strength of a fetch that broke.

## Step 2 — Read the source material

Read the items in full, newest first. For `npm-changelog` the items are the
changelog sections themselves; for feeds they are titles, abstracts and links.

## Step 3 — Digest (research, not content)

Load the strategy file named by `[digest].strategy` in config.toml:

```
.claude/skills/daily-post/digest/<strategy>.md
```

It carries the domain judgement — what is worth verifying, what counts as a
finding, and what a day with nothing in it looks like. Follow it, then come
back here.

The rule that holds across strategies: if a check produced nothing that changes
what the reader does, it produced nothing for the post. That is a normal
outcome, not a reason to write up the method.

## Step 4 — Research the discussion

WebSearch for the item and its headline claims. Fetch the first-party page for
anything with pricing, breaking changes, a settings key, or a clinical endpoint
— secondary sources routinely garble those. Deliberately include at least one
source that is *not* flattering; a post with only praise is not an assessment.

## Step 5 — Write

File: `src/content/posts/YYYY-MM-DD-<kebab-slug>.md`

```yaml
---
title: "..."                       # required
description: "..."                 # required, 1–2 sentences
published: YYYY-MM-DD              # required, must match the filename date
category: "..."
tags: [...]
annotation: "..."                  # optional pull-quote in the margin
---
```

### Who is reading

One person: the author. He already works in this domain every day and maintains
this pipeline himself. He is not evaluating whether to adopt anything.

So: **never explain the basics of the domain.** No industry-trend paragraphs;
he does not care about anyone's strategy, he cares what he has to change before
Thursday. Cut every sentence a reader who already knows all this would skim.

### 骨架 — 只有 config 裡那幾段，順序不能換

The reader asked for exactly those questions and said he does not care about
the rest. So the post is those `##` headings and nothing else. `###` inside a
section is free; an extra `##` fails the build.

For this site today that is 改了什麼 → 為什麼要改 → 對你的流程有什麼影響.
The title carries the handle for what the post is about — a version number here,
per `[post].title_pattern` — then what is actually in it, not a mood or a pun.

```markdown
---
title: "2.1.222：ultraplan 被關掉，worktree 隔離擴大到檔案編輯"
---

## 改了什麼

| 項目 | 一句話 |
| --- | --- |
| `/ultraplan` | 官方寫 Removed，實際上是遠端開關被關掉，程式碼還在 |
| worktree 隔離 | 攔截從 Bash 擴到檔案編輯，session 本身也被管 |

## 為什麼要改

## 對你的流程有什麼影響

1. …
```

**First section** — a table, one row per item, one sentence each. Facts only. A
release with fifteen entries still gets one table; the ones that change nothing
collapse into a single trailing sentence naming them. No prose about how you
established any of it.

**Middle section** — what was broken or annoying before, in his terms. 「你在 CI
裡跑 `claude -p`，之前沒辦法知道 session 中途被掛進來的 repo 帶了什麼
`CLAUDE.md`」. Not 「提升了可觀測性」. This section carries the first-party link,
because the reason is usually what the docs actually explain. When a change
solves nobody's problem, one sentence saying so is the complete answer:
「這個沒有在解決誰的問題，是內部清理」.

**`[post].actionable_section`** — the section he came for, and the longest. A
numbered list, in the order to do them, each item actionable without rereading
anything above it. 「去 `~/.claude/settings.json` 確認 `env` 裡沒有
`CLAUDE_CODE_ARTIFACT_COMMENTS_AUTOREACT`」, not 「評估是否啟用」. Items that
resolve to 不用管 say 不用管 and why in the same breath. If the whole day comes
to nothing, the list is one item saying what to watch for and when.

Your position lives here too, in the sentence that makes the recommendation:
「我不會開這個，因為它在我不在場的時候會改一個別人看得到的頁面」. A 「我的看法」
heading is banned outright — CI rejects it, along with anything else in
`[lint].banned_headings`. Classification is not a position: 「適用面窄」 is a
category, 「單 repo 的人接了只是給自己找事」 is a position. No opinion at all is
fine; manufactured opinion is worse than none.

### Length budget — CI enforces this

`[lint].prose_target` warns, `[lint].prose_hard_cap` fails. For this site that
is 2000 and 3200 characters of prose.

Over target almost always means a paragraph explaining how something was found
out. Cut that paragraph, not the advice.

Prose means the post with code blocks, tables, block quotes and link targets
stripped out. A settings snippet or a one-line command he is meant to paste
costs nothing against the budget, so keep those. What costs is narration.

### 其他 CI 會擋的事

Everything below is read from config.toml, so it changes when the subject does:

- `title` 必須符合 `[post].title_pattern`（空字串 = 不檢查）
- `[post].sections` 到齊、照順序、而且沒有多的
- `[post].actionable_section` 必須是編號清單
- 全文至少一個 `[lint].cite_hosts` 的連結
- `[lint].banned_headings` 不能當標題
- `[lint].banned_phrases` 一個都不能出現

Run `pnpm test:content` while drafting, not just before the PR.

### 中文寫作

Traditional Chinese. Code identifiers, settings keys, CLI flags and drug names
stay in their original form.

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

What must survive intact: the identifiers, the numbers, the recommended action,
and the honest verdict behind it. De-slopping is about the prose around the
advice, never the advice.

## Step 7 — Verify locally

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

`test-config.mjs` pins the config validator's messages. `check-content.mjs`
enforces the post spec from config.toml. `check-build.mjs` catches internal
links missing the `/CCChange` base — the failure mode that only shows up in
production. All three must exit 0.

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

That workflow also gates on paths: only `src/content/` and `public/` are
allowed. A daily post touching `config.toml`, `scripts/` or a workflow will sit
waiting for a human, by design. If you need to fix something in those, open a
separate PR.

PR body must state, concretely:
- what was checked and the freshness verdict
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

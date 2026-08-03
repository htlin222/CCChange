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
- **Every post ships one reproducible experiment.** Reading docs is not the
  product; other summarisers do that for free.
- **Every feature entry ends in an action or in 不用管.** Never 「可以考慮」.
- **Run the humanizer pass.** Step 6 is not optional. A post that reads like a
  changelog summariser wrote it has failed even if every fact is right.
- **Run `pnpm test` before the PR.** A red PR is worse than no PR.

The reader is one person who already uses all of this daily. Write for him, not
for an audience that needs convincing.

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

## Step 3 — Verify against the installed binary

This is what makes the post worth reading. The changelog says "Added"; the
binary says whether that means *new code* or *a newly exposed setting*.

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
this release only surfaced a knob. Say which.

`strings -a` also frequently contains internal help text that is more detailed
than the public docs. Quote it when it is.

### 每篇一定要有一個可重現的實驗

Not "if something looks cheaply testable". Every post ships at least one
experiment the reader could paste into his own terminal and re-run.

Pick the feature where a claim in the changelog is checkable, build the smallest
thing that checks it, and paste the real output. Negative results are the best
outcome: 「文件說它會觸發，實際上在 `claude -p` 下叫不動」 is worth more than
five paragraphs of what the feature is for.

On a quiet day with no release, the experiment target is something in the last
release you have not personally verified, or an assumption in his own setup.
There is always something to test. "沒有新版所以沒有實驗" is not acceptable.

The experiment must be:

- **self-contained** — runs in a scratch dir, no state from his machine
- **bounded** — `timeout 150` or shorter, never leave a hanging process
- **honest** — if the setup itself broke, say the setup broke; do not report an
  inconclusive run as a finding

Paste commands and output verbatim, in that order. Do not paraphrase output.

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

### Action first

The post exists to answer one question per feature: **要不要改東西，改什麼。**
Everything else is supporting evidence for that answer.

So the verdict table goes **first**, not last. A reader who stops after the
table must already have got the whole value.

```markdown
## 今天要動的

| 功能 | 你要改什麼 |
| --- | --- |
| Opus 5 | 檢查 `max_tokens`：thinking 現在算進去，舊的緊 budget 會被截斷 |
| `strictAllowlist` | user settings 加 `true`。設在 repo 裡無效 |

## 今天不用管的

`workflowSizeGuideline`（想版控 workflow 規模才需要）、巢狀 subagent 轉發、
`mcp_server_errors`（升級就有，不用做事）。

## 判決：沒有新版
2.1.220 發佈於 7 天 20 小時前 …
```

Never write 「你可以考慮…」. Either he should change something, and you say
exactly what file and what line, or he should not, and you say 不用管.

### Length budget — CI enforces this

**Target 3000 characters of prose, hard cap 4500.** `check-content.mjs` fails
the build over the cap and warns over the target, so this is not a guideline
you can talk yourself past.

Prose means the post with code blocks, tables, block quotes and link targets
stripped out. Counting the raw file would reward padding with restatement and
punish pasting the command output and tables that make a post worth reading.
Paste all the evidence you want; it costs nothing against the budget.

For calibration: the 2026-08-02 post first shipped at 7402 characters of prose
for maybe 2000 characters of new information. It now sits at 2760 saying more.

Full coverage is still required — compression is where the room comes from. A
feature that changes nothing gets one clause in the 不用管 paragraph, never a
section. Exactly **one** feature per post gets a deep section: the one carrying
today's experiment.

### 其他 CI 會擋的事

- 第一個 `##` 必須是「今天要動的」
- 至少兩個 code block（指令，以及它們的真實輸出）
- 禁用詞：「可以考慮」「這意味著」「對於…而言」「所謂的」

Run `pnpm test:content` while drafting, not just before the PR.

### 本日一題

The single deep section. Structure it around what you actually did:

1. 我試了什麼（the commands, verbatim）
2. 發生什麼事（real output, including the failure)
3. 所以你要改什麼

No 「它的精神是…」 heading. If the design idea matters, it comes out of the
experiment result, not before it.

### 觀點是必要的，不是加分

The post must contain at least one sentence where you take a position that
could be wrong. 「這個設計我覺得是錯的，因為…」「這條規則沒道理」「我不會接
這個」. Classification is not a position: 「適用面窄」 is a category, 「單 repo
的人接了只是給自己找事」 is a position.

If you genuinely have no opinion about anything in a release, say that in one
sentence and move on. Manufactured opinion is worse than none.

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

`src/content/posts/2026-08-02-claude-code-2-1-219-220.md` is the reference for
what a post should look like under these rules. Its git history also shows what
it looked like before them; the diff is instructive.

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

What must survive intact: the verified numbers, the commands, the quoted
strings, and the honest verdict. De-slopping is about the prose around the
findings, never the findings.

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

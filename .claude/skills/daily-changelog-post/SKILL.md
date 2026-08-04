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
- **Every TL;DR row ends in an action or in 不用管.** Never 「可以考慮」.
- **The five sections are fixed.** TL;DR → 這解決了什麼痛點 → 好處與官方文件 →
  實測驗證 → 下一步, in that order, with the version number in the title. CI
  checks all of it.
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

Someone who uses Claude Code but does not read the changelog. He has a
`CLAUDE.md` and a `settings.json`; he has not necessarily written a hook, and he
will not go and look up what `register_repo_root` means before deciding whether
today's release matters to him.

So a term he may not know gets one clause of explanation on first use, in the
痛點 section where it earns its place, and then you move on. 「`DirectoryAdded`
是一個 hook 事件，session 中途掛進新目錄時會觸發」 — that much, not a tutorial.

Still banned: the industry-trend paragraph. 「這代表 Anthropic 正在把它做成
enterprise runtime」 helps nobody decide anything. Every explanatory sentence
has to be load-bearing for 「這關我什麼事」. If it is background colour, cut it.

### 固定骨架 — 五段，順序不能換

Every post has the same five sections in the same order. CI enforces the titles
and the order, so do not invent variants. Sub-headings (`###`) inside a section
are free.

The title carries the version. `title:` must contain the version the post is
about, then what is actually in it — not a mood, not a pun on its own.

```markdown
---
title: "2.1.221：Artifact 留言自動回覆與 MCP 協定協商"
---

## TL;DR

| 更新 | 一句話 | 你要動嗎 |
| --- | --- | --- |
| Artifact 留言自動回覆 | Claude 會自己回你發佈過的 artifact 底下的留言 | 預設關，去確認 env 沒開 |
| MCP 協定 `2026-07-28` | 三個 transport 的開關全預設關 | 不用管 |

## 這解決了什麼痛點

## 好處與官方文件

## 實測驗證

## 下一步
```

What each one is for:

**TL;DR** — the whole release in one table, one row per item. Three columns:
名稱、一句話、你要動嗎. The 「你要動嗎」 cell is an instruction or the literal
words 不用管; never 「可以考慮」. A reader who stops after this table has the
practical value already.

**這解決了什麼痛點** — the workflow that was broken or annoying before, and why
he would want this. Concrete: 「你在 CI 裡跑 `claude -p`，之前沒辦法知道 session
中途被掛進來的 repo 帶了什麼 `CLAUDE.md`」. Not 「提升了可觀測性」. If a change
solves no real pain, say so — 「這個沒有在解決誰的問題，是內部清理」 is a
legitimate answer and a short one.

**好處與官方文件** — what you get out of it, and the official page that
documents it. At least one link to `code.claude.com`, `platform.claude.com` or
`docs.claude.com` per post; CI checks for it. When the feature is undocumented,
say that explicitly and link the nearest official page that *should* have
covered it. 「文件裡沒有」 is a finding, and it is worth more than a link.

**實測驗證** — the reproducible experiment, unchanged from before. Commands, then
verbatim output. See below.

**下一步** — a numbered list of what to do next, in order, each item concrete
enough to act on without rereading the post. 「去 `~/.claude/settings.json` 確認
`env` 裡沒有 `CLAUDE_CODE_ARTIFACT_COMMENTS_AUTOREACT`」, not 「評估是否啟用」.
If the answer is genuinely "nothing", the list is one item saying what to watch
for and when.

### Length budget — CI enforces this

**Target 4500 characters of prose. Hard cap 7500.** `check-content.mjs` warns
over the target and fails the build over the cap.

（Both numbers went up by 1500 when the five-section skeleton landed. 痛點 and
好處 are sections that did not exist before and they are prose by nature, so the
old 3000 would have failed every post written to the new shape. The ratio of
target to cap is unchanged.）

The two numbers do different jobs. The target is the signal: over it, the post
is probably explaining rather than reporting, and you should go look. The cap
is only a runaway backstop — no check can tell restatement from discovery, so a
cap tight enough to catch the first would strangle the second.

Prose means the post with code blocks, tables, block quotes and link targets
stripped out. Counting the raw file would reward padding with restatement and
punish pasting the command output that makes a post worth reading. Paste all
the evidence you want; it costs nothing against the budget.

Calibration:

- 2026-08-02 first draft, 7402 chars for maybe 2000 chars of new information.
  Restatement. Rewritten to 2760 saying more.
- 2026-08-03 as written, 5932 chars of almost entirely original findings.
  Over target, correctly under the cap. Being over target is not a failure if
  what is there is new.

Full coverage is still required — compression is where the room comes from. A
feature that changes nothing gets one row in the TL;DR table reading 不用管, and
no prose anywhere else. 痛點 and 好處 cover the release as a whole, not one
subsection per item; 實測驗證 covers exactly **one** feature, the one you tested.

### 其他 CI 會擋的事

- `title` 必須含版本號（`2.1.221` 這種 `x.y.z`）
- 五個 `##` 必須到齊，而且照 TL;DR → 痛點 → 好處與官方文件 → 實測驗證 → 下一步 的順序
- 「好處與官方文件」段裡至少一個 `code.claude.com` / `platform.claude.com` /
  `docs.claude.com` 連結
- 「下一步」段必須是編號清單
- 至少兩個 code block（指令，以及它們的真實輸出）
- 禁用詞：「可以考慮」「這意味著」「對於…而言」「所謂的」

Run `pnpm test:content` while drafting, not just before the PR.

### 實測驗證

The one deep section. Structure it around what you actually did:

1. 我試了什麼（the commands, verbatim）
2. 發生什麼事（real output, including the failure)
3. 所以結論是什麼

No 「它的精神是…」 heading. If the design idea matters, it comes out of the
experiment result, not before it.

A failed experiment still belongs here. 「文件說它會觸發，實際上在 `claude -p`
下叫不動」 is the most useful thing a post can contain, and the 下一步 that comes
out of it is 「不要接，等它能在 headless 下跑」.

### 觀點是必要的，不是加分

The post must contain at least one sentence where you take a position that
could be wrong. 「這個設計我覺得是錯的，因為…」「這條規則沒道理」「我不會接
這個」. Classification is not a position: 「適用面窄」 is a category, 「單 repo
的人接了只是給自己找事」 is a position.

It no longer gets its own section. Put it where it is earned — usually at the
end of 實測驗證, sometimes as the reason a 好處 is smaller than advertised. A
「我的看法」 heading tacked on the end is the shape this repo keeps reaching for
and it is now banned; the position has to sit next to the evidence for it.

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

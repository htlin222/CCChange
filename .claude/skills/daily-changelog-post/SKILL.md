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
- **Run `pnpm test` before the PR.** A red PR is worse than no PR.

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

Where a feature is cheaply testable (a hook, a flag, a setting), **actually try
it** in the scratchpad with a short timeout and report what happened — including
when it does not work. Negative results are the most valuable content here.

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

Structure, in this order:

1. **今日 24 小時檢核** — the table, then the verdict, stated in the first line.
2. **Added 清單** — enumerate, do not editorialise yet.
3. **驗屍** — the binary diff table from step 3.
4. **深潛** — one section per feature that matters, ordered by real impact.
   Each: 精神 (what class of problem it solves) → 一手證據 → 社群 → 對工作流的
   幫助 **and where it does not help** → 實務痛點的例子.
5. **嘻嘻的部分** — the genuinely funny or surprising findings. Real ones only.
6. **誠實的判決** — a table with a 🟢/🟡/🟠 call per feature and a concrete
   "你該做什麼", then the single most honest sentence about the release.
7. **參考來源** — every URL used.

Write in Traditional Chinese. Keep code identifiers, settings keys, and CLI
flags in their original form. Never pad; if a feature is boring, one line is the
correct length.

## Step 6 — Verify locally

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

## Step 7 — Branch, commit, PR

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

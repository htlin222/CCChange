# Digest strategy: journal-triage

A day's worth of journal feeds. Selected by `[digest].strategy =
"journal-triage"` in config.toml (see `config.example.journal.toml`).

`pnpm fetch:sources` hands you roughly 120 normalised items across JCO, NEJM
heme-onc and a PubMed query. Most days two or three are worth a reader's
morning. Finding which is the whole job, and it is a judgement — this file gives
you the terrain, not a scoring rubric.

## Triage

Read every title. Read the abstract of anything that could change management.
The rest you can drop without opening.

What tends to earn a post: a phase III that reports a primary endpoint, a
practice-changing negative result, a safety signal, a guideline that moved. What
tends not to: a single-arm phase I with fifteen patients, a retrospective
registry analysis confirming what everyone already does, a review, an editorial,
correspondence about a trial from two years ago.

Those are tendencies, not rules. A small phase I matters when it is the first
human data on a mechanism the reader has been waiting on. A review matters when
it is the one that finally settles a live argument. You are allowed to decide
that, and you are expected to say why in the post.

Beware the feed's own framing. `content:encoded` on the Atypon feeds is often
just volume/issue/page metadata with no clinical content, and NEJM's summary
line is written to sell the click. Read the abstract before you trust either.

## What the reader is deciding

Whether Monday's clinic changes. So the honest answer to most papers is
「不用改」, and a day where nothing changes practice is a legitimate post — say
so and explain what would have had to be true for it to matter.

The trap here is the mirror of the changelog one: writing up the trial design
because it was interesting to read. Design details earn their place only when
they are the reason the result does or does not apply — an open-label endpoint
that inflates a subjective outcome, a control arm that is not what anyone
actually gives, a population with a median age fifteen years below the clinic's.
Then it is the argument. Otherwise it is narration, and the length budget will
tell you so.

## Provenance

Cite the paper, not the feed entry. `doi` and `pmid` come through normalised in
the fetch output; the DOI resolver or the PubMed record is the first-party link
`[lint].cite_hosts` is checking for. A press release or a society's news post is
never the citation, however much cleaner it reads.

If an abstract is paywalled and you only have the summary, say that in the post.
An assessment written off a 200-character teaser is worth exactly what it cost.

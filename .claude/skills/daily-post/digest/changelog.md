# Digest strategy: changelog

A package that ships its news as a CHANGELOG. Selected by `[digest].strategy =
"changelog"` in config.toml.

`pnpm fetch:sources` has already given you `latestVersion`, `ageHours`,
`isFresh`, `repoPushedAt` and the newest changelog sections. Do not re-derive
any of that by hand. What follows is the judgement the script cannot make.

## The one check that matters

The changelog says "Added". The binary says whether that means *new code* or *a
newly exposed setting*. That distinction changes the advice, which is the only
reason to look.

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

## What survives into the post

One sentence, in whichever section it changes the answer.

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

## Days with no new release

`isFresh: false`. Same three sections. 改了什麼 opens with 「沒有新版」 and a
one-line table of what is still current, 為什麼要改 becomes why the silence
matters or does not, and 對你的流程有什麼影響 covers whatever you verified in
the last release that he has not acted on. Do not manufacture news, and do not
pad the gap with the investigation that confirmed the gap is real.

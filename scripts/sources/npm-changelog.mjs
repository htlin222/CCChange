#!/usr/bin/env node
/**
 * kind = "npm-changelog"
 *
 * A package that ships its news as a CHANGELOG.md, with npm's publish times as
 * the clock. This is what CCChange itself runs on.
 *
 * Two things here are not interchangeable with the obvious alternative, and
 * both were mistakes made once already:
 *
 *   Publish times come from the registry's `time` map, not from a release
 *   feed. A version that exists in `time` has been published; that is the
 *   fact the 24-hour check needs.
 *
 *   Repository freshness reads `pushed_at`, never `updated_at`. `updated_at`
 *   moves when someone stars the repo or edits its description, so a quiet
 *   week of code can look active.
 *
 * Uses the registry and GitHub REST endpoints through the shared http client
 * rather than shelling out to `npm view` and `gh`, so the retry, timeout and
 * cache rules apply here too. Unauthenticated GitHub allows 60 requests an
 * hour; this makes one a day.
 */
export const kind = "npm-changelog";

const HOUR_MS = 3600_000;

/** Newest-first, ignoring the registry's own bookkeeping keys. */
function sortedReleases(timeMap) {
  return Object.entries(timeMap)
    .filter(([version]) => version !== "created" && version !== "modified")
    .sort(([, a], [, b]) => new Date(b) - new Date(a))
    .map(([version, published]) => ({ version, published }));
}

/** Split a CHANGELOG on `## ` and keep the newest few sections whole. */
function splitSections(markdown, keep) {
  return markdown
    .split(/^## /m)
    .slice(1)
    .slice(0, keep)
    .map((chunk) => {
      const newline = chunk.indexOf("\n");
      return {
        heading: (newline === -1 ? chunk : chunk.slice(0, newline)).trim(),
        body: (newline === -1 ? "" : chunk.slice(newline + 1)).trim(),
      };
    });
}

export async function collect(source, http) {
  const registryUrl = `https://registry.npmjs.org/${source.package.replace("/", "%2F")}`;
  const { body: registryRaw } = await http.get(registryUrl, { accept: "json" });
  const registry = JSON.parse(registryRaw);

  const releases = sortedReleases(registry.time ?? {});
  if (releases.length === 0) {
    throw new Error(`${source.id}: registry returned no publish times for ${source.package}`);
  }

  const latest = releases[0];
  const ageHours = (Date.now() - new Date(latest.published)) / HOUR_MS;
  const freshnessHours = source.freshness_hours ?? 24;

  let pushedAt = null;
  if (source.repo) {
    try {
      const { body } = await http.get(`https://api.github.com/repos/${source.repo}`, {
        accept: "json",
      });
      // pushed_at, not updated_at — see the note at the top of this file.
      pushedAt = JSON.parse(body).pushed_at ?? null;
    } catch (err) {
      // A rate-limited or renamed repo must not sink the whole run; the
      // publish times are the authoritative clock and they already succeeded.
      pushedAt = null;
      console.warn(`warn  ${source.id}: could not read ${source.repo} — ${err.message}`);
    }
  }

  let sections = [];
  if (source.changelog) {
    const { body } = await http.get(source.changelog, { accept: "text" });
    sections = splitSections(body, source.keep_sections ?? 3);
  }

  const items = sections.map((section) => ({
    sourceId: source.id,
    title: section.heading,
    link: source.repo
      ? `https://github.com/${source.repo}/blob/main/CHANGELOG.md`
      : source.changelog,
    published:
      releases.find((r) => section.heading.startsWith(r.version))?.published ?? null,
    summary: section.body,
  }));

  return {
    items,
    meta: {
      sourceId: source.id,
      kind,
      package: source.package,
      latestVersion: latest.version,
      latestPublished: latest.published,
      ageHours: Number(ageHours.toFixed(1)),
      // The whole point of the check: is there something new since yesterday?
      isFresh: ageHours <= freshnessHours,
      freshnessHours,
      recentReleases: releases.slice(0, 6),
      repoPushedAt: pushedAt,
      itemCount: items.length,
    },
  };
}

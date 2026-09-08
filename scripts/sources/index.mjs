#!/usr/bin/env node
/**
 * The adapter registry.
 *
 * Adding a source type is: write scripts/sources/<kind>.mjs exporting `kind`
 * and `collect(source, http)`, then add one line here. fetch-sources.mjs does
 * not change, and config.mjs validates unknown kinds against this list so a
 * typo in config.toml is named rather than discovered at runtime.
 *
 * The contract every adapter honours:
 *
 *   collect(source, http) -> { items: Item[], meta: object }
 *
 *   Item = {
 *     sourceId, title, link,
 *     published,   // ISO 8601 or null — never a raw feed date string
 *     summary,     // plain text, HTML stripped
 *     ...anything the kind can offer (doi, authors, …)
 *   }
 *
 * Normalising `published` and `summary` inside the adapter is the point of the
 * split: the digest step reads one shape whatever the source was.
 */
import * as npmChangelog from "./npm-changelog.mjs";
import * as rss from "./rss.mjs";

const adapters = [rss, npmChangelog];

export const registry = new Map(adapters.map((a) => [a.kind, a]));
export const knownSourceKinds = [...registry.keys()];

export function adapterFor(kind) {
  const adapter = registry.get(kind);
  if (!adapter) {
    throw new Error(
      `no adapter for kind "${kind}" — known kinds are ${knownSourceKinds.join(", ")}`,
    );
  }
  return adapter;
}

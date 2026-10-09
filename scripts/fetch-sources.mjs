#!/usr/bin/env node
/**
 * Collects every source in config.toml and writes one normalised JSON file.
 *
 * This is step one of the daily run: `pnpm fetch:sources`, then read the
 * output. Doing it in a script rather than by hand means the Cloudflare header
 * recipe is applied the same way every time, the cache floor is respected, and
 * the run leaves a file you can point at afterwards when you need to show
 * where a claim came from.
 *
 * One source failing does not sink the run — the others still write, and the
 * failure is recorded in the output under `errors` so it cannot be mistaken
 * for "that feed had nothing today".
 *
 * Usage:
 *   pnpm fetch:sources                 # all sources
 *   pnpm fetch:sources -- --only jco   # one source, by id
 *   pnpm fetch:sources -- --fresh      # ignore the cache floor
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ConfigError, loadConfig, reportConfigError } from "./lib/config.mjs";
import { createHttp } from "./lib/http.mjs";
import { adapterFor, knownSourceKinds } from "./sources/index.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(REPO_ROOT, ".cache", "sources");

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const fresh = args.includes("--fresh");

let config;
try {
  config = loadConfig({ knownSourceKinds });
} catch (err) {
  if (err instanceof ConfigError) reportConfigError(err);
  throw err;
}

const httpConfig = fresh ? { ...config.http, cacheMinutes: 0 } : config.http;
const http = createHttp(httpConfig);

const selected = only
  ? config.sources.filter((s) => s.id === only)
  : config.sources;

if (only && selected.length === 0) {
  console.error(
    `error --only ${only}: no such source. config.toml defines ` +
      `${config.sources.map((s) => s.id).join(", ")}`,
  );
  process.exit(1);
}

const collected = [];
const errors = [];

for (const source of selected) {
  const label = `${source.id} (${source.kind})`;
  try {
    const { items, meta } = await adapterFor(source.kind).collect(source, http);
    collected.push({ meta, items });
    const cacheNote = meta.fromCache ? " [cached]" : "";
    console.log(`  ${label}: ${items.length} item(s)${cacheNote}`);
  } catch (err) {
    errors.push({ sourceId: source.id, kind: source.kind, message: err.message });
    console.error(`error ${label}: ${err.message}`);
  }
}

// Date in the filename, not a timestamp: one run per day is the shape of this
// job, and a re-run should overwrite rather than accumulate.
const stamp = new Date().toISOString().slice(0, 10);
const outPath = join(OUT_DIR, `${stamp}.json`);
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  outPath,
  `${JSON.stringify(
    {
      site: config.site.id,
      digestStrategy: config.digest.strategy,
      fetchedAt: new Date().toISOString(),
      sources: collected,
      errors,
    },
    null,
    2,
  )}\n`,
);

const total = collected.reduce((n, s) => n + s.items.length, 0);
console.log(
  `\nfetch-sources: ${collected.length}/${selected.length} source(s), ` +
    `${total} item(s) → ${outPath.replace(`${REPO_ROOT}/`, "")}`,
);

// A partial run is still useful output, but it must not read as a clean one.
process.exit(errors.length > 0 ? 1 : 0);

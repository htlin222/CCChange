#!/usr/bin/env node
/**
 * Tests the config validator against deliberately broken configs.
 *
 * The validator's whole job is to turn a config mistake into a message that
 * names config.toml, so a broken validator is worse than none: it sends you
 * into scripts/ looking for a bug that is in a TOML file. These cases pin the
 * messages down.
 *
 * Each case writes a temp config, loads it in a child process, and asserts the
 * expected fragment appears in the output.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const VALID = `
[site]
id = "t"
lang = "zh-Hant"
[[sources]]
id = "s"
kind = "rss"
url = "https://example.com/feed"
[http]
user_agent = "UA"
retry_backoff_seconds = [2, 5]
[digest]
strategy = "d"
[post]
sections = ["A", "B"]
actionable_section = "B"
title_pattern = ""
[lint]
cite_hosts = ["example.com"]
banned_phrases = []
banned_headings = []
prose_target = 100
prose_hard_cap = 200
min_body_chars = 10
`;

const cases = [
  {
    name: "valid config loads",
    toml: VALID,
    expectOk: true,
  },
  {
    name: "malformed regex names the file, key and index",
    toml: VALID.replace("banned_phrases = []", 'banned_phrases = ["對於(而言"]'),
    expect: "[lint].banned_phrases[0]",
  },
  {
    name: "actionable_section outside sections is caught",
    toml: VALID.replace('actionable_section = "B"', 'actionable_section = "Z"'),
    expect: "[post].actionable_section",
  },
  {
    name: "unknown source kind is caught when a registry is supplied",
    toml: VALID.replace('kind = "rss"', 'kind = "carrier-pigeon"'),
    expect: "has no adapter",
    withRegistry: true,
  },
  {
    name: "hard cap below target is caught",
    toml: VALID.replace("prose_hard_cap = 200", "prose_hard_cap = 50"),
    expect: "is below prose_target",
  },
  {
    name: "all problems are reported at once, not just the first",
    toml: VALID.replace('lang = "zh-Hant"', "").replace("prose_target = 100", ""),
    expect: "2 problem(s)",
  },
  {
    name: "duplicate source ids are caught",
    toml: `${VALID}\n[[sources]]\nid = "s"\nkind = "rss"\nurl = "https://example.com/other"\n`,
    expect: "duplicate id",
  },
];

const dir = mkdtempSync(join(tmpdir(), "ccchange-config-"));
let failed = 0;

for (const [i, c] of cases.entries()) {
  const path = join(dir, `case-${i}.toml`);
  writeFileSync(path, c.toml);

  const script = c.withRegistry
    ? `import {loadConfig,reportConfigError,ConfigError} from "${import.meta.dirname}/lib/config.mjs";
       try { loadConfig({knownSourceKinds:["rss","npm-changelog"]}); console.log("OK"); }
       catch (e) { if (e instanceof ConfigError) reportConfigError(e); else throw e; }`
    : `import {loadConfig,reportConfigError,ConfigError} from "${import.meta.dirname}/lib/config.mjs";
       try { loadConfig(); console.log("OK"); }
       catch (e) { if (e instanceof ConfigError) reportConfigError(e); else throw e; }`;

  let out;
  try {
    out = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      env: { ...process.env, CCCHANGE_CONFIG: path },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    out = `${err.stdout ?? ""}${err.stderr ?? ""}`;
  }

  const ok = c.expectOk ? out.includes("OK") : out.includes(c.expect);
  if (!ok) {
    failed++;
    console.error(`error ${c.name}`);
    console.error(
      `      expected ${c.expectOk ? '"OK"' : JSON.stringify(c.expect)} in output, got:`,
    );
    console.error(
      out
        .trimEnd()
        .split("\n")
        .map((l) => `        ${l}`)
        .join("\n") || "        (no output)",
    );
  }
}

console.log(
  `\ncheck-config: ${cases.length} case(s), ${failed} failure(s)`,
);
process.exit(failed > 0 ? 1 : 0);

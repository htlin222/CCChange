#!/usr/bin/env node
/**
 * Reads and validates config.toml.
 *
 * Everything that used to be a hard-coded Chinese string or a claude.com host
 * inside check-content.mjs now arrives through here. The point of the split is
 * that forking this repo for a different subject should mean editing one TOML
 * file, not reading JavaScript.
 *
 * Validation reports every problem at once and then exits. Failing on the first
 * one turns a two-minute config edit into four round trips.
 *
 * The regexes in config.toml are the reason this file exists rather than a bare
 * `parse(readFileSync(...))`. A malformed pattern reaches `new RegExp()` and
 * throws a SyntaxError whose message reads like the script broke, sending you
 * to scripts/ when the mistake is in config.toml. So they get compiled here,
 * under a message that names the file, the key, and the index.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
// CCCHANGE_CONFIG points the scripts at a different config — used by
// scripts/test-config.mjs to feed it deliberately broken files, and available
// if you ever want to lint one subject's posts against another's rules.
export const CONFIG_PATH = resolve(
  REPO_ROOT,
  process.env.CCCHANGE_CONFIG ?? "config.toml",
);

class ConfigError extends Error {
  constructor(problems) {
    super(`config.toml has ${problems.length} problem(s)`);
    this.problems = problems;
  }
}

/** Compile one pattern, or record why it could not be compiled. */
function compile(pattern, where, flags, problems) {
  try {
    return new RegExp(pattern, flags);
  } catch (err) {
    problems.push(`${where}: ${JSON.stringify(pattern)} is not a valid regex — ${err.message}`);
    return null;
  }
}

function requireString(obj, key, where, problems) {
  const value = obj?.[key];
  if (typeof value !== "string" || value.trim() === "") {
    problems.push(`${where}.${key}: required, must be a non-empty string`);
    return null;
  }
  return value;
}

function requireStringArray(obj, key, where, problems, { minLength = 0 } = {}) {
  const value = obj?.[key];
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    problems.push(`${where}.${key}: required, must be an array of strings`);
    return [];
  }
  if (value.length < minLength) {
    problems.push(`${where}.${key}: needs at least ${minLength} entr(ies), got ${value.length}`);
  }
  return value;
}

function requireNumber(obj, key, where, problems, { min = 0 } = {}) {
  const value = obj?.[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < min) {
    problems.push(`${where}.${key}: required, must be a number >= ${min}`);
    return null;
  }
  return value;
}

/**
 * @param {object} [opts]
 * @param {string[]} [opts.knownSourceKinds] - when given, every source's `kind`
 *   must be one of these. The caller supplies it because the adapter registry
 *   lives next to the adapters, not here.
 */
export function loadConfig({ knownSourceKinds } = {}) {
  const problems = [];
  let raw;

  try {
    raw = parse(readFileSync(CONFIG_PATH, "utf8"));
  } catch (err) {
    throw new ConfigError([`could not parse ${CONFIG_PATH}: ${err.message}`]);
  }

  requireString(raw.site, "id", "[site]", problems);
  requireString(raw.site, "lang", "[site]", problems);

  // ── [post] ──────────────────────────────────────────────────────────
  const sections = requireStringArray(raw.post, "sections", "[post]", problems, {
    minLength: 2,
  });
  const actionable = requireString(raw.post, "actionable_section", "[post]", problems);
  if (actionable && sections.length && !sections.includes(actionable)) {
    problems.push(
      `[post].actionable_section: ${JSON.stringify(actionable)} is not one of ` +
        `sections (${sections.join(" → ")})`,
    );
  }
  // Empty means "this subject has no version number in its titles" — a
  // literature site, say. Absent means someone forgot the key.
  const titlePatternRaw = raw.post?.title_pattern;
  if (typeof titlePatternRaw !== "string") {
    problems.push(`[post].title_pattern: required, use "" to disable the check`);
  }
  const titlePattern =
    typeof titlePatternRaw === "string" && titlePatternRaw !== ""
      ? compile(titlePatternRaw, "[post].title_pattern", "", problems)
      : null;

  // ── [lint] ──────────────────────────────────────────────────────────
  const citeHosts = requireStringArray(raw.lint, "cite_hosts", "[lint]", problems, {
    minLength: 1,
  });
  const bannedPhrasesRaw = requireStringArray(
    raw.lint,
    "banned_phrases",
    "[lint]",
    problems,
  );
  const bannedPhrases = bannedPhrasesRaw
    .map((p, i) => compile(p, `[lint].banned_phrases[${i}]`, "", problems))
    .filter(Boolean);
  const bannedHeadings = requireStringArray(
    raw.lint,
    "banned_headings",
    "[lint]",
    problems,
  );

  const proseTarget = requireNumber(raw.lint, "prose_target", "[lint]", problems, {
    min: 1,
  });
  const proseHardCap = requireNumber(raw.lint, "prose_hard_cap", "[lint]", problems, {
    min: 1,
  });
  if (proseTarget && proseHardCap && proseHardCap < proseTarget) {
    problems.push(
      `[lint]: prose_hard_cap (${proseHardCap}) is below prose_target ` +
        `(${proseTarget}), so every post over target would fail instead of warn`,
    );
  }
  const minBodyChars = requireNumber(raw.lint, "min_body_chars", "[lint]", problems);

  // ── [digest] ────────────────────────────────────────────────────────
  requireString(raw.digest, "strategy", "[digest]", problems);

  // ── [[sources]] ─────────────────────────────────────────────────────
  const sources = Array.isArray(raw.sources) ? raw.sources : [];
  if (sources.length === 0) {
    problems.push(`[[sources]]: at least one source is required`);
  }
  const seenIds = new Set();
  for (const [i, src] of sources.entries()) {
    const where = `[[sources]][${i}]`;
    const id = requireString(src, "id", where, problems);
    if (id) {
      if (seenIds.has(id)) problems.push(`${where}.id: duplicate id ${JSON.stringify(id)}`);
      seenIds.add(id);
    }
    const kind = requireString(src, "kind", where, problems);
    if (kind && knownSourceKinds && !knownSourceKinds.includes(kind)) {
      problems.push(
        `${where}.kind: ${JSON.stringify(kind)} has no adapter — ` +
          `known kinds are ${knownSourceKinds.join(", ")}`,
      );
    }
  }

  // ── [http] ──────────────────────────────────────────────────────────
  const http = raw.http ?? {};
  requireString(http, "user_agent", "[http]", problems);
  const backoff = http.retry_backoff_seconds;
  if (!Array.isArray(backoff) || backoff.some((n) => typeof n !== "number" || n < 0)) {
    problems.push(`[http].retry_backoff_seconds: must be an array of non-negative numbers`);
  }

  if (problems.length) throw new ConfigError(problems);

  return Object.freeze({
    site: raw.site,
    sources,
    http: {
      userAgent: http.user_agent,
      acceptLanguage: http.accept_language ?? "en-US,en;q=0.9",
      cookieJar: http.cookie_jar !== false,
      retryOn403: http.retry_on_403 ?? 1,
      retryBackoffSeconds: backoff ?? [2, 5],
      cacheMinutes: http.cache_minutes ?? 10,
      timeoutSeconds: http.timeout_seconds ?? 30,
    },
    digest: raw.digest,
    post: {
      sections,
      actionableSection: actionable,
      titlePattern,
    },
    lint: {
      citeHosts,
      // One alternation over all hosts, matched against the whole body.
      citeHostsPattern: new RegExp(
        `https?://(${citeHosts.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})/`,
      ),
      bannedPhrases,
      bannedHeadings,
      proseTarget,
      proseHardCap,
      minBodyChars,
    },
  });
}

/** Print a ConfigError the way the rest of the scripts print theirs, then exit. */
export function reportConfigError(err) {
  if (!(err instanceof ConfigError)) throw err;
  for (const p of err.problems) console.error(`error config.toml: ${p}`);
  console.error(`\nconfig: ${err.problems.length} problem(s) — nothing else ran`);
  process.exit(1);
}

export { ConfigError };

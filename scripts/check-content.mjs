#!/usr/bin/env node
/**
 * Pre-build content lint.
 *
 * Astro's content collection schema already rejects malformed frontmatter at
 * build time, but it does so with a stack trace deep inside the build. These
 * checks fail fast with a readable message, and add the house rules the Zod
 * schema doesn't cover (filename/date agreement, no future dates, no TODOs).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const POSTS_DIR = "src/content/posts";
const REQUIRED = ["title", "description", "published"];
const FILENAME_DATE = /^(\d{4}-\d{2}-\d{2})-[a-z0-9-]+\.mdx?$/;

// Prose only — see the stripping below.
//
// The two numbers do different jobs, and conflating them was the first
// version's mistake.
//
// TARGET is the signal. Going over it means the post is probably explaining
// rather than reporting, so it warns and the writer has to look at it.
//
// HARD_CAP is a runaway backstop, nothing more. It is deliberately far above
// the target because no regex can tell restatement from discovery, and a cap
// tight enough to catch the former also strangles the latter.
//
// Both calibration points, so the next person moving these knows what each
// number was measured against:
//
//   2026-08-02, first draft   7402 chars, ~2000 chars of new information.
//                             Restatement. This is what TARGET must catch.
//   2026-08-03, as written    5932 chars, nearly all original findings —
//                             a disabled /whiteboard skill, a string diff
//                             showing 3799 fake additions. A 4500 cap
//                             rejected it, which was the cap being wrong.
//
// Both numbers went up by 1500 when the five-section skeleton landed. 痛點 and
// 好處與官方文件 are prose by nature and did not exist under the old shape, so
// the old 3000 target would have warned on every conforming post. The
// target:cap ratio is unchanged.
const PROSE_TARGET = 4500;
const PROSE_HARD_CAP = 7500;

// The fixed skeleton. Order matters: a reader who stops after TL;DR must
// already have the practical value, and 下一步 is useless anywhere but last.
const REQUIRED_SECTIONS = [
  "TL;DR",
  "這解決了什麼痛點",
  "好處與官方文件",
  "實測驗證",
  "下一步",
];

// 好處與官方文件 has to cite a first-party page. Secondary sources routinely
// garble settings keys and pricing, which is the whole reason for the rule.
const OFFICIAL_DOC_HOSTS = /https?:\/\/(code|platform|docs)\.claude\.com\//;

const VERSION_IN_TITLE = /\d+\.\d+\.\d+/;

const errors = [];
const warnings = [];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.mdx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** Minimal frontmatter reader — enough for scalar keys and inline arrays. */
function parseFrontmatter(raw, file) {
  if (!raw.startsWith("---")) {
    errors.push(`${file}: missing frontmatter block`);
    return null;
  }
  const end = raw.indexOf("\n---", 3);
  if (end === -1) {
    errors.push(`${file}: unterminated frontmatter block`);
    return null;
  }
  const data = {};
  for (const line of raw.slice(3, end).split("\n")) {
    const m = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[m[1]] = value;
  }
  return data;
}

const files = walk(POSTS_DIR);

if (files.length === 0) {
  errors.push(`${POSTS_DIR}: no posts found — the site would build empty`);
}

for (const file of files) {
  const rel = relative(process.cwd(), file);
  const raw = readFileSync(file, "utf8");
  const fm = parseFrontmatter(raw, rel);
  if (!fm) continue;

  for (const key of REQUIRED) {
    if (!fm[key]) errors.push(`${rel}: missing required frontmatter "${key}"`);
  }

  const base = file.split("/").pop();
  const nameMatch = base.match(FILENAME_DATE);
  if (!nameMatch) {
    errors.push(
      `${rel}: filename must be YYYY-MM-DD-kebab-slug.md (got "${base}")`,
    );
  } else if (fm.published && !fm.published.startsWith(nameMatch[1])) {
    errors.push(
      `${rel}: filename date ${nameMatch[1]} disagrees with published: ${fm.published}`,
    );
  }

  if (fm.published) {
    const published = new Date(fm.published);
    if (Number.isNaN(published.getTime())) {
      errors.push(`${rel}: published "${fm.published}" is not a valid date`);
    } else {
      // Posts are minted in the author's local timezone, which can be up to a
      // day ahead of the CI runner's UTC clock. Allow that much slack.
      const tomorrow = Date.now() + 36 * 60 * 60 * 1000;
      if (published.getTime() > tomorrow) {
        errors.push(`${rel}: published date ${fm.published} is in the future`);
      }
    }
  }

  const body = raw.slice(raw.indexOf("\n---", 3) + 4);
  if (/\bTODO\b|\bFIXME\b|XXX/.test(body)) {
    errors.push(`${rel}: body still contains a TODO/FIXME/XXX marker`);
  }
  if (body.trim().length < 400) {
    warnings.push(`${rel}: body is very short (${body.trim().length} chars)`);
  }

  // Length budget, measured on prose only. Counting the raw file would reward
  // padding with restatement and penalise pasting the command output and
  // tables that make a post worth reading, which is backwards.
  const proseLength = body
    .replace(/```[\s\S]*?```/g, "")          // code blocks
    .replace(/^\|.*$/gm, "")                 // tables
    .replace(/^>.*$/gm, "")                  // block quotes (pasted docs)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // link targets, keep the text
    .replace(/\s+/g, "").length;

  if (proseLength > PROSE_HARD_CAP) {
    errors.push(
      `${rel}: ${proseLength} chars of prose exceeds the ${PROSE_HARD_CAP} cap. ` +
        `Compress a feature that changes nothing into the 不用管 paragraph ` +
        `instead of giving it a section.`,
    );
  } else if (proseLength > PROSE_TARGET) {
    warnings.push(
      `${rel}: ${proseLength} chars of prose is over the ${PROSE_TARGET} target`,
    );
  }

  // The title carries the version the post is about. "第九天沒有新版" tells a
  // reader scrolling the archive nothing about which release it covers.
  if (fm.title && !VERSION_IN_TITLE.test(fm.title)) {
    errors.push(
      `${rel}: title "${fm.title}" has no version number — it must name the ` +
        `release the post is about (e.g. "2.1.221：…")`,
    );
  }

  // The fixed five-section skeleton, present and in order.
  const headings = [...body.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]);
  const foundIndex = REQUIRED_SECTIONS.map((want) =>
    headings.findIndex((h) => h === want || h.startsWith(`${want}：`)),
  );
  const missing = REQUIRED_SECTIONS.filter((_, i) => foundIndex[i] === -1);
  if (missing.length) {
    errors.push(
      `${rel}: missing required section(s) ${missing.map((s) => `"## ${s}"`).join(", ")}. ` +
        `The skeleton is ${REQUIRED_SECTIONS.join(" → ")} (see SKILL.md 固定骨架)`,
    );
  } else {
    const outOfOrder = foundIndex.some((v, i) => i > 0 && v < foundIndex[i - 1]);
    if (outOfOrder) {
      errors.push(
        `${rel}: sections are out of order (found ${headings.filter((h) => REQUIRED_SECTIONS.some((s) => h === s || h.startsWith(`${s}：`))).join(" → ")}). ` +
          `Required: ${REQUIRED_SECTIONS.join(" → ")}`,
      );
    }
    if (foundIndex[0] !== 0) {
      errors.push(
        `${rel}: first section is "${headings[0]}", but "## TL;DR" must come first`,
      );
    }
  }

  // Slice out a named section's body so the next two checks look only at it.
  const sectionBody = (name) => {
    const i = headings.findIndex((h) => h === name || h.startsWith(`${name}：`));
    if (i === -1) return "";
    const start = body.indexOf(`## ${headings[i]}`);
    const nextHeading = headings[i + 1];
    const end = nextHeading
      ? body.indexOf(`## ${nextHeading}`, start + 1)
      : body.length;
    return body.slice(start, end === -1 ? body.length : end);
  };

  const benefits = sectionBody("好處與官方文件");
  if (benefits && !OFFICIAL_DOC_HOSTS.test(benefits)) {
    errors.push(
      `${rel}: "好處與官方文件" cites no first-party page — needs at least one ` +
        `code./platform./docs.claude.com link (say so explicitly if the ` +
        `feature is undocumented, and link the page that should have covered it)`,
    );
  }

  const nextSteps = sectionBody("下一步");
  if (nextSteps && !/^\s*\d+\.\s+\S/m.test(nextSteps)) {
    errors.push(
      `${rel}: "下一步" must be a numbered list of concrete actions, in order`,
    );
  }

  // The shape the repo keeps reaching for. Opinions belong next to their
  // evidence, not bolted on as a closing section.
  if (/^##+\s*我的看法\s*$/m.test(body)) {
    errors.push(
      `${rel}: "我的看法" as its own section is banned — move the position into ` +
        `實測驗證 or 好處與官方文件, next to the evidence for it`,
    );
  }

  // Every post ships one experiment: commands, then their real output.
  const fences = [...body.matchAll(/```(\w*)\n/g)].map((m) => m[1]);
  if (fences.length < 2) {
    errors.push(
      `${rel}: fewer than 2 code blocks — a post must paste the experiment's ` +
        `commands and their verbatim output`,
    );
  }

  // Hedging that the spec bans outright.
  for (const phrase of ["可以考慮", "這意味著", "對於.{0,8}而言", "所謂的"]) {
    const m = body.match(new RegExp(phrase));
    if (m) errors.push(`${rel}: banned phrase "${m[0]}" (see SKILL.md 中文寫作)`);
  }
  for (const [, url] of body.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) {
    try {
      new URL(url);
    } catch {
      errors.push(`${rel}: malformed link URL ${url}`);
    }
  }
}

for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`error ${e}`);

console.log(
  `\ncheck-content: ${files.length} post(s), ${errors.length} error(s), ${warnings.length} warning(s)`,
);
process.exit(errors.length > 0 ? 1 : 0);

#!/usr/bin/env node
/**
 * Pre-build content lint.
 *
 * Astro's content collection schema already rejects malformed frontmatter at
 * build time, but it does so with a stack trace deep inside the build. These
 * checks fail fast with a readable message, and add the house rules the Zod
 * schema doesn't cover (filename/date agreement, no future dates, no TODOs).
 *
 * Every subject-specific value — the section names, the banned phrases, the
 * hosts that count as first-party, the length budget — comes from config.toml.
 * Nothing in this file knows what the site is about, which is what makes it
 * reusable when the subject changes. If you find yourself adding a Chinese
 * string or a hostname below, it belongs in the config instead.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ConfigError, loadConfig, reportConfigError } from "./lib/config.mjs";

const POSTS_DIR = "src/content/posts";
const REQUIRED = ["title", "description", "published"];
const FILENAME_DATE = /^(\d{4}-\d{2}-\d{2})-[a-z0-9-]+\.mdx?$/;

let config;
try {
  config = loadConfig();
} catch (err) {
  if (err instanceof ConfigError) reportConfigError(err);
  throw err;
}

const { sections: REQUIRED_SECTIONS, actionableSection, titlePattern } = config.post;
const {
  citeHosts,
  citeHostsPattern,
  bannedPhrases,
  bannedHeadings,
  evidenceMarker,
  proseTarget,
  proseHardCap,
  minBodyChars,
} = config.lint;

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
  if (body.trim().length < minBodyChars) {
    warnings.push(`${rel}: body is very short (${body.trim().length} chars)`);
  }

  // Length budget, measured on prose only. Counting the raw file would reward
  // padding with restatement and penalise pasting the command output and
  // tables that make a post worth reading, which is backwards.
  //
  // The two numbers do different jobs; config.toml carries the calibration
  // notes for moving them.
  const proseLength = body
    .replace(/```[\s\S]*?```/g, "")          // code blocks
    .replace(/^\|.*$/gm, "")                 // tables
    .replace(/^>.*$/gm, "")                  // block quotes (pasted docs)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // link targets, keep the text
    .replace(/\s+/g, "").length;

  if (proseLength > proseHardCap) {
    errors.push(
      `${rel}: ${proseLength} chars of prose exceeds the ${proseHardCap} cap. ` +
        `Cut the part that explains how you found this out, not the advice.`,
    );
  } else if (proseLength > proseTarget) {
    warnings.push(
      `${rel}: ${proseLength} chars of prose is over the ${proseTarget} target`,
    );
  }

  // The title names what the post is about — a version, an issue, whichever
  // handle the subject uses. "第九天沒有新版" tells a reader scrolling the
  // archive nothing. Disabled when [post].title_pattern is "".
  if (titlePattern && fm.title && !titlePattern.test(fm.title)) {
    errors.push(
      `${rel}: title "${fm.title}" does not match [post].title_pattern ` +
        `/${titlePattern.source}/ — it must name what the post is about`,
    );
  }

  // Exactly the configured sections, in order, and nothing else at `##` level.
  const headings = [...body.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]);
  const normalise = (h) => h.replace(/[:：].*$/, "");
  const shape = headings.map(normalise);
  if (shape.join(" ") !== REQUIRED_SECTIONS.join(" ")) {
    errors.push(
      `${rel}: sections are ${shape.length ? shape.join(" → ") : "(none)"}, ` +
        `but the skeleton is exactly ${REQUIRED_SECTIONS.join(" → ")} and ` +
        `nothing else. Use "###" for anything finer (see SKILL.md 骨架)`,
    );
  }

  // Slice out a named section so the next check looks only at it.
  const sectionBody = (name) => {
    const i = shape.indexOf(name);
    if (i === -1) return "";
    const start = body.indexOf(`## ${headings[i]}`);
    const end = headings[i + 1]
      ? body.indexOf(`## ${headings[i + 1]}`, start + 1)
      : body.length;
    return body.slice(start, end === -1 ? body.length : end);
  };

  // The section the reader came for has to resolve into ordered, do-this-now
  // items rather than trailing off into assessment.
  const impact = sectionBody(actionableSection);
  if (impact && !/^\s*\d+\.\s+\S/m.test(impact)) {
    errors.push(
      `${rel}: "${actionableSection}" must be a numbered list of concrete ` +
        `actions, in the order to do them`,
    );
  }

  // A post that claims it went and looked has to show what it saw. Secondary
  // claims carry a link the reader can click; a first-hand one carries nothing
  // unless the command that produced it is in the post, and "相信我" is not a
  // provenance label. Code blocks are free against the length budget above, so
  // this costs the post nothing it was spending anyway.
  if (evidenceMarker && body.includes(evidenceMarker) && !/```[\s\S]*?```/.test(body)) {
    errors.push(
      `${rel}: labels a claim "${evidenceMarker}" but the post contains no code ` +
        `block — paste the command and the output that established it`,
    );
  }

  if (!citeHostsPattern.test(body)) {
    errors.push(
      `${rel}: cites no first-party page — needs at least one ` +
        `${citeHosts.join(" / ")} link (if the subject is undocumented, say so ` +
        `and link the page that should have covered it)`,
    );
  }

  // The shape this repo keeps reaching for. A position belongs in the sentence
  // that makes the recommendation, not bolted on as its own block.
  for (const heading of bannedHeadings) {
    // Literal, not a pattern — banned_headings is a list of words a writer
    // typed, so a stray "(" in one must not become a syntax error.
    const literal = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`^##+\\s*${literal}\\s*$`, "m").test(body)) {
      errors.push(
        `${rel}: "${heading}" as a heading is banned — put the position in the ` +
          `recommendation it justifies`,
      );
    }
  }

  // Hedging that the spec bans outright.
  for (const phrase of bannedPhrases) {
    const m = body.match(phrase);
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

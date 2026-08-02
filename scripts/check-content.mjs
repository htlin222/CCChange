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

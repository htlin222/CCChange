#!/usr/bin/env node
/**
 * Post-build output check.
 *
 * The site is a GitHub Pages *project* site, so it is served from /CCChange/,
 * not from the domain root. Any internal link that forgot getAssetPath() builds
 * fine and 404s only in production — which is exactly the class of bug this
 * catches. Also asserts the pages the nav promises actually got emitted.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const DIST = "dist";
const BASE = "/CCChange";

const REQUIRED_PATHS = [
  "index.html",
  "404.html",
  "about/index.html",
  "archive/index.html",
  "posts/index.html",
  "rss.xml",
  "sitemap-index.xml",
  "pagefind/pagefind.js",
];

const errors = [];

if (!existsSync(DIST)) {
  console.error(`error ${DIST}/ does not exist — run \`pnpm build\` first`);
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

for (const p of REQUIRED_PATHS) {
  if (!existsSync(join(DIST, p))) errors.push(`missing expected output: ${p}`);
}

const html = walk(DIST).filter((f) => f.endsWith(".html"));
if (html.length === 0) errors.push("build produced no HTML pages");

// Root-relative URLs that legitimately do not carry the base prefix.
const ALLOWED_ROOT = new Set(["/", "//"]);

for (const file of html) {
  const rel = relative(DIST, file);
  const source = readFileSync(file, "utf8");

  for (const [, attr, url] of source.matchAll(
    /\b(href|src)="(\/[^"]*)"/g,
  )) {
    if (url.startsWith("//")) continue; // protocol-relative external
    if (url.startsWith(`${BASE}/`) || url === BASE) continue;
    if (ALLOWED_ROOT.has(url)) continue;
    errors.push(
      `${rel}: ${attr}="${url}" is root-relative and missing the "${BASE}" base — ` +
        `wrap it in getAssetPath() from @/utils/url`,
    );
  }
}

// The post body itself must not hard-code the production origin; that breaks
// preview deploys and makes the base path a lie.
for (const file of html) {
  const source = readFileSync(file, "utf8");
  if (source.includes("astro-lipi.pages.dev")) {
    errors.push(`${relative(DIST, file)}: leftover upstream template URL`);
  }
}

const posts = walk(join(DIST, "posts")).filter((f) => f.endsWith(".html"));
if (posts.length < 2) {
  // posts/index.html plus at least one real post page
  errors.push(`expected at least one rendered post page, found ${posts.length}`);
}

for (const e of errors) console.error(`error ${e}`);

console.log(
  `\ncheck-build: ${html.length} page(s) scanned, ${errors.length} error(s)`,
);
process.exit(errors.length > 0 ? 1 : 0);

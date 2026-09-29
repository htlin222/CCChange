#!/usr/bin/env node
/**
 * The one HTTP client every source adapter uses.
 *
 * Publisher sites behind Cloudflare (ascopubs.org and the rest of the Atypon
 * estate — academic.oup.com, onlinelibrary.wiley.com, nejm.org) return 403 to
 * anything that does not look like a browser. Getting past that is a fixed
 * recipe, and it belongs in one place: an adapter that reimplements it will
 * eventually get one header wrong and the failure looks like "the feed is
 * down" rather than "we sent the wrong Accept".
 *
 * The recipe, all of it driven by [http] in config.toml:
 *
 *   1. a real browser User-Agent
 *   2. an Accept matching the content type being requested
 *   3. Accept-Language, and gzip/br (undici negotiates encoding for us)
 *   4. a same-origin Referer, per source
 *   5. cookies reused across requests, so a cf_clearance from the first GET
 *      rides along on the follow-ups
 *   6. one retry on 403 with a short backoff — transient challenges do clear
 *   7. anything still blocked is reported, not worked around; a JS challenge
 *      needs a real browser engine and that is a decision for a human
 *   8. a cache floor, because repeated hits from one IP escalate to 403/429
 *
 * Rule 8 is why the cache exists. It is not a speed optimisation.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CACHE_DIR = join(REPO_ROOT, ".cache", "http");

export const ACCEPT = {
  feed: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
  html: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  json: "application/json, text/plain;q=0.9, */*;q=0.8",
  text: "text/plain, */*;q=0.8",
};

/**
 * Cookies, kept per origin for the life of the process.
 *
 * Deliberately not persisted: a cf_clearance token is bound to the IP and UA
 * that earned it, so a stale one on disk would be sent to a site that has
 * already invalidated it, which is worse than having none.
 */
class CookieJar {
  #byOrigin = new Map();

  store(url, response) {
    const cookies = response.headers.getSetCookie?.() ?? [];
    if (cookies.length === 0) return;
    const origin = new URL(url).origin;
    const jar = this.#byOrigin.get(origin) ?? new Map();
    for (const line of cookies) {
      const [pair] = line.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
    this.#byOrigin.set(origin, jar);
  }

  header(url) {
    const jar = this.#byOrigin.get(new URL(url).origin);
    if (!jar?.size) return null;
    return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

const sleep = (seconds) => new Promise((r) => setTimeout(r, seconds * 1000));

function cachePath(url) {
  return join(CACHE_DIR, `${createHash("sha1").update(url).digest("hex")}.json`);
}

function readCache(url, maxAgeMinutes) {
  if (maxAgeMinutes <= 0) return null;
  try {
    const entry = JSON.parse(readFileSync(cachePath(url), "utf8"));
    const ageMinutes = (Date.now() - entry.fetchedAt) / 60000;
    return ageMinutes <= maxAgeMinutes ? entry : null;
  } catch {
    return null;
  }
}

function writeCache(url, body) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath(url), JSON.stringify({ url, fetchedAt: Date.now(), body }));
}

export class HttpError extends Error {
  constructor(url, status, hint) {
    super(`${status} from ${url}${hint ? ` — ${hint}` : ""}`);
    this.status = status;
    this.url = url;
  }
}

export function createHttp(httpConfig) {
  const jar = new CookieJar();

  /**
   * @param {string} url
   * @param {object} [opts]
   * @param {keyof ACCEPT} [opts.accept]
   * @param {string} [opts.referer] - same-origin, per rule 4
   * @param {boolean} [opts.noCache] - bypass the cache floor for this call
   * @returns {Promise<{body: string, fromCache: boolean}>}
   */
  async function get(url, { accept = "feed", referer, noCache = false } = {}) {
    const maxAge = noCache ? 0 : httpConfig.cacheMinutes;
    const cached = readCache(url, maxAge);
    if (cached) return { body: cached.body, fromCache: true };

    const headers = {
      "User-Agent": httpConfig.userAgent,
      Accept: ACCEPT[accept] ?? ACCEPT.feed,
      "Accept-Language": httpConfig.acceptLanguage,
    };
    if (referer) headers.Referer = referer;

    const attempts = httpConfig.retryOn403 + 1;
    let lastStatus = 0;

    for (let attempt = 0; attempt < attempts; attempt++) {
      if (attempt > 0) {
        const backoff = httpConfig.retryBackoffSeconds;
        await sleep(backoff[Math.min(attempt - 1, backoff.length - 1)] ?? 2);
      }
      if (httpConfig.cookieJar) {
        const cookie = jar.header(url);
        if (cookie) headers.Cookie = cookie;
        else delete headers.Cookie;
      }

      const response = await fetch(url, {
        headers,
        redirect: "follow",
        signal: AbortSignal.timeout(httpConfig.timeoutSeconds * 1000),
      });
      if (httpConfig.cookieJar) jar.store(url, response);
      lastStatus = response.status;

      if (response.ok) {
        const body = await response.text();
        if (maxAge > 0) writeCache(url, body);
        return { body, fromCache: false };
      }
      // Only 403 is worth retrying — it is the shape a Cloudflare challenge
      // takes. A 404 or a 500 will still be a 404 or a 500 in five seconds.
      if (response.status !== 403) break;
    }

    throw new HttpError(
      url,
      lastStatus,
      lastStatus === 403
        ? "still blocked after retry. This is rule 7: it needs a real browser " +
            "engine (Playwright with stealth), which is a human's call, not an " +
            "automatic fallback"
        : undefined,
    );
  }

  return { get };
}

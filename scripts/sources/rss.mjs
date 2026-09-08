#!/usr/bin/env node
/**
 * kind = "rss"
 *
 * Handles the three shapes that actually turn up in the wild, because the
 * three feeds this was built against use two of them and disagree on where
 * the date lives:
 *
 *   RSS 1.0 / RDF   ascopubs.org (JCO) — items sit at the RDF root, NOT inside
 *                   <channel>, and the date is <dc:date> nested inside another
 *                   <dc:date>. Both are why a naive `channel.item` walk returns
 *                   nothing here.
 *   RSS 2.0         nejm.org, pubmed.ncbi.nlm.nih.gov — channel.item, pubDate.
 *   Atom            not in use today, but it is four lines to support.
 *
 * Field extraction goes through text() because fast-xml-parser gives back a
 * string, a number, or an object with "#text" depending on whether the element
 * carried attributes — and JCO's doubled <dc:date> means it can also be an
 * object whose only useful content is one level down.
 */
import { XMLParser } from "fast-xml-parser";

export const kind = "rss";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

/** Pull a leaf string out of whatever shape the parser produced. */
function text(node) {
  if (node == null) return "";
  if (typeof node === "string") return node.trim();
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return text(node[0]);
  if (typeof node === "object") {
    if ("#text" in node) return text(node["#text"]);
    // JCO's <dc:date><dc:date>…</dc:date></dc:date>. One recursive step into
    // the single child rather than a general search, so a genuinely structured
    // element does not silently yield some unrelated string.
    const values = Object.entries(node).filter(([k]) => !k.startsWith("@_"));
    if (values.length === 1) return text(values[0][1]);
  }
  return "";
}

function firstText(item, keys) {
  for (const key of keys) {
    const value = text(item[key]);
    if (value) return value;
  }
  return "";
}

/** Atom puts the URL in an attribute; RSS and RDF use the element's text. */
function extractLink(item) {
  const link = item.link;
  if (Array.isArray(link)) {
    const alternate =
      link.find((l) => l?.["@_rel"] === "alternate" || l?.["@_rel"] == null) ?? link[0];
    return alternate?.["@_href"] ?? text(alternate);
  }
  if (link && typeof link === "object" && "@_href" in link) return link["@_href"];
  const direct = text(link);
  if (direct) return direct;
  // RDF falls back to the item's own identity.
  return item["@_rdf:about"] ?? "";
}

/** Split a scheme-prefixed dc:identifier into the fields it actually names. */
function identifiers(raw) {
  const out = { doi: null, pmid: null };
  if (!raw) return out;
  const scheme = raw.match(/^(doi|pmid):\s*(.+)$/i);
  if (scheme) {
    out[scheme[1].toLowerCase()] = scheme[2].trim();
    return out;
  }
  // Unprefixed but recognisably a DOI (10.xxxx/…), which some feeds emit.
  if (/^10\.\d{4,9}\//.test(raw)) out.doi = raw;
  return out;
}

function toIso(raw) {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Feed summaries are HTML fragments; the digest step wants readable text. */
function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

/** Locate the item list without caring which dialect produced it. */
function findEntries(doc) {
  const rdf = doc["rdf:RDF"];
  if (rdf?.item) return { entries: [rdf.item].flat(), dialect: "rss1" };

  const channel = doc.rss?.channel;
  if (channel?.item) return { entries: [channel.item].flat(), dialect: "rss2" };

  const feed = doc.feed;
  if (feed?.entry) return { entries: [feed.entry].flat(), dialect: "atom" };

  return { entries: [], dialect: "unknown" };
}

/**
 * @param {object} source - the [[sources]] table for this feed
 * @param {{get: Function}} http
 * @returns {Promise<{items: object[], meta: object}>}
 */
export async function collect(source, http) {
  const { body, fromCache } = await http.get(source.url, {
    accept: "feed",
    referer: source.referer,
  });

  const doc = parser.parse(body);
  const { entries, dialect } = findEntries(doc);

  if (dialect === "unknown") {
    throw new Error(
      `${source.id}: ${source.url} parsed, but it is not RSS 1.0, RSS 2.0 or ` +
        `Atom — top-level keys were ${Object.keys(doc).join(", ") || "(none)"}`,
    );
  }

  const limit = source.limit ?? Number.POSITIVE_INFINITY;
  const items = entries.slice(0, limit).map((entry) => ({
    sourceId: source.id,
    title: stripHtml(firstText(entry, ["title", "dc:title"])),
    link: extractLink(entry),
    published: toIso(
      firstText(entry, ["pubDate", "dc:date", "published", "updated", "date"]),
    ),
    summary: stripHtml(
      firstText(entry, ["description", "summary", "content:encoded", "content"]),
    ),
    authors: firstText(entry, ["dc:creator", "author"]),
    // dc:identifier is prefixed by scheme — JCO emits "doi:10.1200/…",
    // PubMed emits "pmid:42550775". Keeping both under one key would put a
    // PMID in a field named doi, which is worse than leaving it null.
    ...identifiers(firstText(entry, ["dc:identifier", "guid", "id"])),
  }));

  return {
    items,
    meta: {
      sourceId: source.id,
      kind,
      dialect,
      url: source.url,
      fromCache,
      itemCount: items.length,
      feedTitle: stripHtml(
        text(doc["rdf:RDF"]?.channel?.title ?? doc.rss?.channel?.title ?? doc.feed?.title),
      ),
    },
  };
}

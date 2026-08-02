import siteConfig from "@/site.config";
import { type Post, type Page, getPostUrl } from "./content";
import { absoluteUrl } from "./url";

// siteConfig.url is the bare origin; the site is served from a base path, so
// every schema URL has to go through absoluteUrl() or it points at a 404.
const siteUrl = absoluteUrl("/", siteConfig.url);

export function generateWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.title,
    description: siteConfig.description,
    url: siteUrl,
  };
}

export function generatePostSchema(
  post: Post
) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.data.title,
    description: post.data.description,
    datePublished: post.data.published,
    dateModified:
      post.data.updated ??
      post.data.published,

    url: getPostUrl(
      post.id,
      post.filePath
    ),

    author: {
      "@type": "Person",
      name: siteConfig.author,
    },
  };
}

export function generateAboutSchema(
  page: Page
) {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: page.data.title,
    description: page.data.description,
    url: absoluteUrl("/about", siteConfig.url),
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.title,
      url: siteUrl,
    },
    author: {
      "@type": "Person",
      name: siteConfig.author,
    },
  };
}
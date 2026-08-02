import siteConfig from "@/site.config";
import { type Post, type Page, getPostUrl } from "./content";

export function generateWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.title,
    description: siteConfig.description,
    url: siteConfig.url,
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
    url: new URL(
      "/about",
      siteConfig.url
    ).toString(),
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.title,
      url: siteConfig.url,
    },
    author: {
      "@type": "Person",
      name: siteConfig.author,
    },
  };
}
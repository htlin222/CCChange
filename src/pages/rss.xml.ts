import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import siteConfig from "@/site.config";
import {
  getAllPosts,
  getPostUrl,
} from "@/utils/content";

export async function GET(context: APIContext) {
  const posts = await getAllPosts();
  const site = context.site ?? siteConfig.url;

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate:
        post.data.updated ??
        post.data.published,
      link: getPostUrl(
        post.id,
        post.filePath
      ),
    })),
  });
}

import type {
  APIRoute,
} from "astro";

import {
  getCollection,
} from "astro:content";

import {
  getPostSlug,
} from "@/utils/content";

import {
  generateOgImage,
} from "@/utils/og";

export async function getStaticPaths() {
  const posts =
    await getCollection("posts");

  return posts.map((post) => ({
    params: {
      slug: getPostSlug(
        post.id,
        post.filePath
      ),
    },

    props: {
      post,
    },
  }));
}

export const GET: APIRoute =
  async ({ props }) => {
    const { post } = props;

    const png =
      await generateOgImage({
        title: post.data.title,

        description:
          post.data.description,

        category:
          post.data.category,

        published:
          post.data.updated ??
          post.data.published,
      });

    return new Response(png, {
      headers: {
        "Content-Type":
          "image/png",
      },
    });
  };
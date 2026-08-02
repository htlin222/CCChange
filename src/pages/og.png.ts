// src/pages/og.png.ts

import type {
  APIRoute,
} from "astro";

import {
  generateOgImage,
} from "@/utils/og";

export const GET: APIRoute =
  async (context) => {
    const png =
      await generateOgImage(
        {
          title: "Lipi",

          description:
            "A minimal editorial theme for Astro focused on typography, chronology, and longform publishing.",

          category:
            "Astro Theme",

          site: "https://astro-lipi.pages.dev",
        }
      );

    return new Response(png, {
      headers: {
        "Content-Type":
          "image/png",
      },
    });
  };
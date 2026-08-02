// src/utils/og.tsx

import satori from "satori";
import { html } from "satori-html";
import { Resvg } from "@resvg/resvg-js";
import siteConfig from "@/site.config";
import notoSansRegular from "@/assets/fonts/NotoSans-Regular.ttf";
import notoSerifRegular from "@/assets/fonts/NotoSerif-Regular.ttf";
import notoSerifBold from "@/assets/fonts/NotoSerif-Bold.ttf";

export type OgImageOptions = {
  title: string;
  description?: string;
  category?: string;
  published?: Date;
  site?: string;
};

const WIDTH = 1200;
const HEIGHT = 630;

function formatDate(date?: Date) {
  if (!date) return "";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(date);
}

export async function generateOgImage({
  title,
  description,
  category,
  published,
  site = siteConfig.url,
  }: OgImageOptions) {
  const markup = html(`
    <div
      style="
        width: 100%;
        height: 100%;
        background: #F5F4ED;
        color: #22201C;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 72px;
      "
    >
      <div
        style="
          display: flex;
          flex-direction: column;
          gap: 28px;
        "
      >
        <div
          style="
            font-family: 'Lipi Sans';
            font-size: 24px;
            opacity: 0.7;
            display: flex;
            gap: 10px;
            align-items: center;
          "
        >
          ${
            category
              ? `<span>${category}</span>`
              : ""
          }

          ${
            category && published
              ? `<span>·</span>`
              : ""
          }

          ${
            published
              ? `<span>${formatDate(
                  published
                )}</span>`
              : ""
          }
        </div>

        <div
          style="
            font-family: 'Lipi Serif';
            font-size: 72px;
            line-height: 1.1;
            font-weight: 700;
            letter-spacing: -0.04em;
            max-width: 900px;
          "
        >
          ${title}
        </div>

        ${
          description
            ? `
            <div
              style="
                font-family: 'Lipi Sans';
                font-size: 30px;
                line-height: 1.45;
                opacity: 0.8;
                max-width: 760px;
              "
            >
              ${description}
            </div>
          `
            : ""
        }
      </div>

      <div
        style="
          font-family: 'Lipi Sans';
          font-size: 24px;
          opacity: 0.6;
        "
      >
        ${site}
      </div>
    </div>
  `);

  const svg = await satori(markup, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
    {
      name: "Lipi Serif",
      data: notoSerifRegular,
      weight: 400,
      style: "normal",
    },

    {
      name: "Lipi Serif",
      data: notoSerifBold,
      weight: 700,
      style: "normal",
    },

    {
      name: "Lipi Sans",
      data: notoSansRegular,
      weight: 400,
      style: "normal",
    },
  ],
  });

  const resvg = new Resvg(svg);

  return resvg.render().asPng();
}
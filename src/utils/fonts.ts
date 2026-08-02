import type { FontData } from "astro:assets";

type GetFontOptions = {
  style?: "normal" | "italic";
  format?: string;
};

export function getFontPathByWeight(
  fonts: FontData[],
  weight: number,
  options: GetFontOptions = {}
): string | undefined {
  const {
    style = "normal",
    format = "truetype",
  } = options;

  return fonts
    .find(
      (font) =>
        Number(font.weight) === weight &&
        font.style === style
    )
    ?.src.find(
      (file) =>
        file.format === format
    )?.url;
}
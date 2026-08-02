import fs from "node:fs";

export function rawFonts(
  extensions: string[] = []
) {
  return {
    name: "vite-plugin-raw-fonts",

    transform(
      _: unknown,
      id: string
    ) {
      if (
        extensions.some((ext) =>
          id.endsWith(ext)
        )
      ) {
        const buffer =
          fs.readFileSync(id);

        return {
          code: `
            export default new Uint8Array(${JSON.stringify(
              [...buffer]
            )}).buffer;
          `,
          map: null,
        };
      }
    },
  };
}
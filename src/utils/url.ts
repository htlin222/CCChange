const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
const baseRoot = base === "" ? "/" : `${base}/`;

function isExternal(path: string): boolean {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path);
}

export function getAssetPath(path: string): string {
  if (isExternal(path)) return path;

  const normalized = path.replace(/^\/+/, "");

  return normalized ? `${baseRoot}${normalized}` : baseRoot;
}

export function absoluteUrl(
  path: string,
  site?: string | URL
): string {
  return new URL(getAssetPath(path), site).toString();
}
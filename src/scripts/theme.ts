const THEME_KEY = "theme";

const LIGHT = "light";
const DARK = "dark";

type Theme =
  | typeof LIGHT
  | typeof DARK;

declare global {
  interface Window {
    __theme?: {
      value: Theme;
    };
  }
}

let themeValue: Theme =
  window.__theme?.value ??
  getPreferredTheme();

function getPreferredTheme(): Theme {
  const stored = localStorage.getItem(
    THEME_KEY
  ) as Theme | null;

  if (stored) {
    return stored;
  }

  return window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches
    ? DARK
    : LIGHT;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme",theme);
  document.documentElement.setAttribute('data-pf-theme', theme);

  document.documentElement.style.colorScheme =
    theme;

  window.__theme = {
    value: theme,
  };

  updateThemeColor(theme);
}

function updateThemeColor(
  theme: Theme
) {
  const background = getComputedStyle(
    document.documentElement
  )
    .getPropertyValue("--background")
    .trim();

  const meta = document.querySelector(
    "meta[name='theme-color']"
  );

  meta?.setAttribute(
    "content",
    background
  );
}

function persistTheme(theme: Theme) {
  localStorage.setItem(
    THEME_KEY,
    theme
  );
}

function toggleTheme() {
  themeValue =
    themeValue === LIGHT
      ? DARK
      : LIGHT;

  applyTheme(themeValue);

  persistTheme(themeValue);
}

function setupThemeToggle() {
  const button =
    document.querySelector<HTMLButtonElement>(
      "#theme-toggle"
    );

  if (!button) return;

  button.onclick = toggleTheme;
}

function initTheme() {
  applyTheme(themeValue);

  setupThemeToggle();
}

initTheme();

document.addEventListener(
  "astro:after-swap",
  initTheme
);

window
  .matchMedia(
    "(prefers-color-scheme: dark)"
  )
  .addEventListener(
    "change",
    ({ matches }) => {
      // Respect explicit user choice
      if (
        localStorage.getItem(THEME_KEY)
      ) {
        return;
      }

      themeValue = matches
        ? DARK
        : LIGHT;

      applyTheme(themeValue);
    }
  );
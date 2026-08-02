import type { UserConfig } from "../src/site.config";

const userConfig: UserConfig = {
  title: "CCChange",
  description:
    "Claude Code 每日 changelog 講義 — 逐版拆解新功能的精神、社群討論、對工作流的實際影響，以及誠實的判決。",

  // GitHub Pages project site: <user>.github.io + base "/CCChange" (see astro.config.mjs)
  url: "https://htlin222.github.io",
  author: "htlin222",

  navigation: [
    { title: "講義", url: "/posts" },
    { title: "封存", url: "/archive" },
    { title: "關於", url: "/about" },
  ],

  footerLinks: [
    { title: "RSS", url: "/rss.xml" },
    { title: "Archive", url: "/archive" },
    { title: "Source", url: "https://github.com/htlin222/CCChange" },
  ],

  social: [
    {
      title: "GitHub",
      url: "https://github.com/htlin222/CCChange",
      icon: "github",
    },
  ],

  footerCredits: "Built with Astro & Lipi · 由 Claude Code 每日自動出刊",

  postsPerPage: 10,
  recentPosts: 6,
  relatedPosts: 4,

  showThemeToggle: true,
  showReadingTime: true,

  heroVariant: "studio",

  annotation: "每天讀一次 changelog，省下一週的踩坑。",
};

export default userConfig;

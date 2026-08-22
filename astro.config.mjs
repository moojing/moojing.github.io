// @ts-check
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import icon from "astro-icon";
import { LANGUAGES } from "./src/config";

// https://astro.build/config
export default defineConfig({
  site: "https://muji.dev",
  trailingSlash: "never",
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  i18n: {
    locales: LANGUAGES,
    defaultLocale: "en",
  },
  integrations: [
    mdx({
      syntaxHighlight: "shiki",
      shikiConfig: {
        theme: "dark-plus",
      },
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
    sitemap(),
    tailwind(),
    react({ include: ["**/react/**/*"] }),
    icon({}),
  ],
  output: "static",
});

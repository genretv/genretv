// @ts-check
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightLlmsTxt from "starlight-llms-txt";

export default defineConfig({
  site: "https://genretv.github.io",
  base: "/docs",
  outDir: "./dist/docs",
  integrations: [
    starlight({
      title: "GenreTV Help",
      description: "Help for browsing, managing, publishing, and contributing to GenreTV schedules.",
      favicon: "/docs/favicon.svg",
      customCss: ["./src/styles/brand.css"],
      components: {
        SocialIcons: "./src/components/SocialIcons.astro",
      },
      plugins: [
        starlightLlmsTxt({
          projectName: "GenreTV",
          description:
            "End-user help for browsing the canonical GenreTV schedule, managing a personal list, publishing and importing lists, contributing canonical proposals, and maintaining canonical data.",
        }),
      ],
      sidebar: [
        {
          label: "Getting Started",
          items: [{ label: "Welcome to GenreTV", slug: "getting-started" }],
        },
        {
          label: "Browse the Schedule",
          items: [
            { label: "Schedule basics", slug: "browse" },
            { label: "Sections and dates", slug: "browse/sections-and-dates" },
            { label: "Search, filter, and sort", slug: "browse/search-filter-sort" },
          ],
        },
        {
          label: "Build Your List",
          items: [
            { label: "Your personal list", slug: "lists" },
            { label: "Edit shows and seasons", slug: "lists/edit" },
          ],
        },
        {
          label: "Publish and Share",
          items: [
            { label: "Publish a list", slug: "publishing" },
            { label: "Import from published lists", slug: "publishing/import" },
          ],
        },
        {
          label: "Contribute to GenreTV",
          items: [{ label: "Canonical proposals", slug: "contribute" }],
        },
        {
          label: "Manage the Canonical List",
          items: [{ label: "Maintainer review", slug: "maintain" }],
        },
        {
          label: "Account, Offline Data, and Exports",
          items: [
            { label: "Account and local data", slug: "account" },
            { label: "Export your data", slug: "account/exports" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Glossary", slug: "reference/glossary" },
            { label: "Troubleshooting", slug: "reference/troubleshooting" },
          ],
        },
      ],
    }),
  ],
});

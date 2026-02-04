import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { getPage } from "../session";

const MAX_CHARS = 15000;

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });
turndown.use(gfm); // GFM tables plugin — keeps pricing tables readable

export const scrapeUrl = createTool({
  id: "scrape-url",
  description:
    "Visits a URL using the Steel browser session, extracts the page content, and returns it as clean markdown. Use this after you have confirmed the URL exists (via search-for-page or a known homepage).",
  inputSchema: z.object({
    url: z.string().url().describe("The full URL to scrape"),
  }),
  execute: async ({ url }) => {
    const page = await getPage();

    try {
      console.log(`  [scrape-url] Navigating to ${url}`);
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

      if (response && response.status() >= 400) {
        return { url, title: "", content: `Page returned HTTP ${response.status()}`, truncated: false };
      }

      // Brief pause for JS-rendered content to settle after DOMContentLoaded
      await page.waitForTimeout(2000);

      const title = await page.title();
      const html = await page.content();
      let markdown = turndown.turndown(html);

      const truncated = markdown.length > MAX_CHARS;
      if (truncated) {
        markdown = markdown.slice(0, MAX_CHARS);
      }

      console.log(`  [scrape-url] Done — ${markdown.length} chars${truncated ? " (truncated)" : ""}`);
      return { url, title, content: markdown, truncated };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  [scrape-url] Error on ${url}: ${message}`);
      return { url, title: "", content: `Navigation error: ${message}`, truncated: false };
    } finally {
      await page.close();
    }
  },
});

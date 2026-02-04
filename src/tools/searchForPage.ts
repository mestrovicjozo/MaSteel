import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getPage } from "../session";

const MAX_MATCHES = 10;

export const searchForPage = createTool({
  id: "search-for-page",
  description:
    "Navigates to a base URL and discovers sub-pages by scanning all <a> links on the page. " +
    "Filters links whose href or visible text contains the keyword (case-insensitive). " +
    "Use this BEFORE scrape-url to find the correct URL for a topic like 'pricing', 'features', or 'docs'.",
  inputSchema: z.object({
    baseUrl: z.string().url().describe("The homepage or base URL to scan for links"),
    keyword: z.string().describe("Keyword to search for in link hrefs and text (e.g. 'pricing', 'features')"),
  }),
  execute: async ({ baseUrl, keyword }) => {
    const page = await getPage();

    try {
      console.log(`  [search-for-page] Scanning ${baseUrl} for "${keyword}"`);
      await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

      // Brief pause for JS-rendered nav links to appear
      await page.waitForTimeout(2000);

      // Extract all <a> elements directly in the browser context.
      // The callback runs inside the page — types are opaque from Node's perspective,
      // so we cast through unknown to satisfy tsc without pulling in lib: ["dom"].
      const links = await page.evaluate(() => {
        const anchors = Array.from((globalThis as any).document.querySelectorAll("a[href]") as any[]);
        return anchors.map((a: any) => ({
          href: (a.getAttribute("href") as string) || "",
          text: ((a.textContent as string) || "").trim().replace(/\s+/g, " "),
        }));
      }) as { href: string; text: string }[];

      const kw = keyword.toLowerCase();

      // Filter, resolve relative URLs, dedupe
      const seen = new Set<string>();
      const matches: { url: string; linkText: string }[] = [];

      for (const { href, text } of links) {
        if (!href.startsWith("javascript:") && !href.startsWith("mailto:") && !href.startsWith("#")) {
          try {
            const resolved = new URL(href, baseUrl).href;
            if (!seen.has(resolved) && (resolved.toLowerCase().includes(kw) || text.toLowerCase().includes(kw))) {
              seen.add(resolved);
              matches.push({ url: resolved, linkText: text });
              if (matches.length >= MAX_MATCHES) break;
            }
          } catch {
            // skip malformed hrefs
          }
        }
      }

      console.log(`  [search-for-page] Found ${matches.length} match(es)`);
      return { baseUrl, keyword, matches };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  [search-for-page] Error on ${baseUrl}: ${message}`);
      return { baseUrl, keyword, matches: [] };
    } finally {
      await page.close();
    }
  },
});

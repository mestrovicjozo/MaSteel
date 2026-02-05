import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getPage } from "../session";
import type { Page } from "playwright";

const DEFAULT_MAX_LINKS = 50;

export interface LinkInfo {
  url: string;
  text: string;
}

export interface Section {
  label: string;
  links: LinkInfo[];
}

/**
 * Extracts all visible <a> links from the current page state.
 * Runs inside the browser context via page.evaluate.
 */
async function collectLinks(page: Page, baseUrl: string): Promise<Map<string, LinkInfo>> {
  const raw = await page.evaluate(() => {
    const anchors = Array.from((globalThis as any).document.querySelectorAll("a[href]") as any[]);
    return anchors.map((a: any) => ({
      href: (a.getAttribute("href") as string) || "",
      text: ((a.textContent as string) || "").trim().replace(/\s+/g, " "),
    }));
  }) as { href: string; text: string }[];

  const map = new Map<string, LinkInfo>();
  for (const { href, text } of raw) {
    if (href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:") || href === "#") continue;
    try {
      const resolved = new URL(href, baseUrl).href;
      if (!map.has(resolved)) {
        map.set(resolved, { url: resolved, text: text.slice(0, 120) });
      }
    } catch {
      // skip malformed hrefs
    }
  }
  return map;
}

/**
 * Returns links present in `after` that were not in `before`.
 */
function diffLinks(before: Map<string, LinkInfo>, after: Map<string, LinkInfo>): LinkInfo[] {
  const newLinks: LinkInfo[] = [];
  for (const [url, info] of after) {
    if (!before.has(url)) {
      newLinks.push(info);
    }
  }
  return newLinks;
}

/**
 * Attempt to dismiss common cookie/consent banners so they don't block nav interactions.
 */
async function dismissCookieBanners(page: Page): Promise<void> {
  const selectors = [
    'button:has-text("Accept")',
    'button:has-text("Accept All")',
    'button:has-text("Accept all")',
    'button:has-text("Got it")',
    'button:has-text("I agree")',
    'button:has-text("OK")',
    '[id*="cookie"] button',
    '[class*="cookie"] button',
    '[id*="consent"] button',
    '[class*="consent"] button',
  ];

  for (const sel of selectors) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 500 })) {
        await btn.click({ timeout: 1000 });
        await page.waitForTimeout(500);
        return; // dismissed one, that's usually enough
      }
    } catch {
      // ignore — banner may not exist
    }
  }
}

export const exploreNavigation = createTool({
  id: "explore-navigation",
  description:
    "Explores a website's navigation by hovering over menus and clicking hamburger buttons to discover links hidden behind JavaScript interactions. " +
    "Use this as a FALLBACK when search-for-page returns 0 results — it's slower but can find links that aren't in the static HTML.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to explore for navigation links"),
    maxLinks: z.number().optional().default(DEFAULT_MAX_LINKS).describe("Maximum total links to return (default 50)"),
  }),
  execute: async ({ url, maxLinks: rawMaxLinks }) => {
    const maxLinks = rawMaxLinks ?? DEFAULT_MAX_LINKS;
    const page = await getPage();
    const errors: string[] = [];
    const sections: Section[] = [];
    let totalLinksFound = 0;

    try {
      console.log(`  [explore-navigation] Navigating to ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2000);

      // Try to dismiss cookie banners first
      await dismissCookieBanners(page);

      // --- Step 1: Collect baseline static links ---
      const baseline = await collectLinks(page, url);

      // --- Step 2: Collect primary nav links (static) ---
      const navSelectors = [
        "nav a",
        '[role="navigation"] a',
        "header a",
        "header ul a",
        ".navbar a",
        ".nav a",
        '[class*="nav"] a',
      ];

      const primaryNavLinks = new Map<string, LinkInfo>();
      for (const sel of navSelectors) {
        try {
          const raw = await page.evaluate((selector: string) => {
            const anchors = Array.from((globalThis as any).document.querySelectorAll(selector) as any[]);
            return anchors.map((a: any) => ({
              href: (a.getAttribute("href") as string) || "",
              text: ((a.textContent as string) || "").trim().replace(/\s+/g, " "),
            }));
          }, sel) as { href: string; text: string }[];

          for (const { href, text } of raw) {
            if (href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:") || href === "#") continue;
            try {
              const resolved = new URL(href, url).href;
              if (!primaryNavLinks.has(resolved)) {
                primaryNavLinks.set(resolved, { url: resolved, text: text.slice(0, 120) });
              }
            } catch { /* skip */ }
          }
        } catch { /* selector not found, that's fine */ }
      }

      if (primaryNavLinks.size > 0) {
        const links = Array.from(primaryNavLinks.values()).slice(0, maxLinks);
        sections.push({ label: "Primary Nav", links });
        totalLinksFound += links.length;
      }

      // --- Step 3: Hover over nav items to reveal dropdowns ---
      const hoverTargetSelectors = [
        "nav > ul > li",
        "nav > div > ul > li",
        '[role="navigation"] > ul > li',
        "header nav li",
        '.navbar li:has(ul), .navbar li:has([class*="dropdown"])',
        '[class*="nav"] > ul > li',
        'nav button',
        'header button',
      ];

      for (const sel of hoverTargetSelectors) {
        try {
          const items = page.locator(sel);
          const count = await items.count();
          if (count === 0) continue;

          for (let i = 0; i < Math.min(count, 15); i++) {
            if (totalLinksFound >= maxLinks) break;

            try {
              const item = items.nth(i);
              const itemText = (await item.textContent({ timeout: 1000 }))?.trim().replace(/\s+/g, " ").slice(0, 50) || `Item ${i}`;

              const beforeHover = await collectLinks(page, url);
              await item.hover({ timeout: 2000 });
              await page.waitForTimeout(800); // wait for dropdown animation

              const afterHover = await collectLinks(page, url);
              const revealed = diffLinks(beforeHover, afterHover);

              if (revealed.length > 0) {
                const remaining = maxLinks - totalLinksFound;
                const links = revealed.slice(0, remaining);
                sections.push({ label: `Dropdown: ${itemText}`, links });
                totalLinksFound += links.length;
              }
            } catch {
              // individual hover failed — continue to next item
            }
          }
        } catch {
          // selector didn't match — try next
        }
        if (totalLinksFound >= maxLinks) break;
      }

      // --- Step 4: Find and click hamburger / mobile menu buttons ---
      const hamburgerSelectors = [
        'button[aria-label*="menu" i]',
        'button[aria-label*="Menu" i]',
        'button[aria-label*="navigation" i]',
        '[class*="hamburger"]',
        '[class*="menu-toggle"]',
        '[class*="mobile-menu"]',
        '[class*="nav-toggle"]',
        'button:has(.hamburger)',
        'button[class*="burger"]',
        '[aria-controls*="nav"]',
        '[aria-controls*="menu"]',
      ];

      for (const sel of hamburgerSelectors) {
        if (totalLinksFound >= maxLinks) break;

        try {
          const btn = page.locator(sel).first();
          const isVisible = await btn.isVisible({ timeout: 1000 });
          if (!isVisible) continue;

          const beforeClick = await collectLinks(page, url);
          await btn.click({ timeout: 3000 });
          await page.waitForTimeout(1500); // wait for menu animation

          const afterClick = await collectLinks(page, url);
          const revealed = diffLinks(beforeClick, afterClick);

          if (revealed.length > 0) {
            const remaining = maxLinks - totalLinksFound;
            const links = revealed.slice(0, remaining);
            sections.push({ label: "Mobile/Hamburger Menu", links });
            totalLinksFound += links.length;
          }

          // Try to close the menu again
          try {
            await btn.click({ timeout: 1000 });
            await page.waitForTimeout(500);
          } catch { /* ignore */ }

          break; // only click one hamburger button
        } catch {
          // this selector didn't work — try next
        }
      }

      // --- Step 5: Scroll to footer and collect footer nav links ---
      if (totalLinksFound < maxLinks) {
        try {
          await page.evaluate(() => (globalThis as any).window.scrollTo(0, (globalThis as any).document.body.scrollHeight));
          await page.waitForTimeout(1500);

          const footerLinks = new Map<string, LinkInfo>();
          const footerSelectors = ["footer a", '[role="contentinfo"] a', '[class*="footer"] a'];

          for (const sel of footerSelectors) {
            try {
              const raw = await page.evaluate((selector: string) => {
                const anchors = Array.from((globalThis as any).document.querySelectorAll(selector) as any[]);
                return anchors.map((a: any) => ({
                  href: (a.getAttribute("href") as string) || "",
                  text: ((a.textContent as string) || "").trim().replace(/\s+/g, " "),
                }));
              }, sel) as { href: string; text: string }[];

              for (const { href, text } of raw) {
                if (href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:") || href === "#") continue;
                try {
                  const resolved = new URL(href, url).href;
                  if (!footerLinks.has(resolved) && !primaryNavLinks.has(resolved)) {
                    footerLinks.set(resolved, { url: resolved, text: text.slice(0, 120) });
                  }
                } catch { /* skip */ }
              }
            } catch { /* selector not found */ }
          }

          if (footerLinks.size > 0) {
            const remaining = maxLinks - totalLinksFound;
            const links = Array.from(footerLinks.values()).slice(0, remaining);
            sections.push({ label: "Footer", links });
            totalLinksFound += links.length;
          }
        } catch (err) {
          errors.push(`Footer scroll failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      console.log(`  [explore-navigation] Found ${totalLinksFound} links in ${sections.length} section(s)`);
      return { url, totalLinksFound, sections, errors };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  [explore-navigation] Error on ${url}: ${message}`);
      errors.push(message);
      return { url, totalLinksFound, sections, errors };
    } finally {
      await page.close();
    }
  },
});

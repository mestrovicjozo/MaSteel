import Steel from "steel-sdk";
import { chromium } from "playwright";
import type { Browser } from "playwright";

const client = new Steel({ steelAPIKey: process.env.STEEL_API_KEY });

type Session = Awaited<ReturnType<typeof client.sessions.create>>;

let sessionPromise: Promise<Session> | null = null;

let browser: Browser | null = null;
let browserPromise: Promise<Browser> | null = null;

/**
 * Lazy singleton — creates a Steel session on first call, returns the cached
 * session object on subsequent calls. Promise-based to be safe under parallel calls.
 */
export async function getSession(): Promise<Session> {
  if (!sessionPromise) {
    sessionPromise = client.sessions.create({
      timeout: 900000, // 15 min — hobby plan max; set useProxy/solveCaptcha on paid plans
    }).then((s) => {
      console.log(`\n[Steel] Session created`);
      console.log(`[Steel] Live viewer: ${s.debugUrl}\n`);
      return s;
    });
  }
  return sessionPromise;
}

/**
 * Connects Playwright to the existing Steel session via CDP.
 * Reuses the same context so Steel's fingerprint stays intact
 * and activity shows in the live viewer.
 * Promise-based so parallel tool calls don't each open a new CDP connection.
 */
export async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = (async () => {
      const sess = await getSession();
      const cdpUrl = `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${sess.id}`;
      browser = await chromium.connectOverCDP(cdpUrl);
      console.log(`[Steel] Playwright connected via CDP`);
      return browser;
    })();
  }
  return browserPromise;
}

/**
 * Returns a fresh page inside the existing (single) context.
 * Each tool call gets its own page so parallel navigations don't clobber each other,
 * but all pages share the same context — Steel fingerprint stays intact.
 */
export async function getPage() {
  const b = await getBrowser();
  const contexts = b.contexts();
  const context = contexts.length > 0 ? contexts[0] : await b.newContext();
  return context.newPage();
}

/**
 * Cleanly tears down the Playwright connection and releases the Steel session
 * so it doesn't linger in the dashboard.
 */
export async function releaseSession() {
  if (browser) {
    await browser.close();
    browser = null;
  }
  if (sessionPromise) {
    const session = await sessionPromise;
    await client.sessions.release(session.id);
    console.log(`\n[Steel] Session ${session.id} released`);
    sessionPromise = null;
  }
}

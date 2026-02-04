# MaSteel — Competitive Intelligence Agent

> A CLI web agent that browses real competitor websites, extracts pricing, features, positioning and tech-stack signals, and writes a structured `report.md`. Built with **Mastra** (agent + tool orchestration) and **Steel** (anti-bot cloud browser sessions).

---

## Why this exists

Competitive research is tedious: you open five tabs, hunt for pricing pages, screenshot tables, try to remember what you read, and end up with a half-finished doc three days later. Automating it with a headless browser sounds easy — until the first CAPTCHA blocks you, or a bot-detection layer serves you a blank page.

**Steel** solves the browser side: it gives you a cloud-hosted, human-like browser session with built-in proxy rotation and CAPTCHA solving. **Mastra** solves the agent side: it lets you define tools, wire them to an LLM, and watch the model reason through a multi-step workflow in real time.

This project is the minimal, end-to-end example of the two working together.

---

## Architecture

```
CLI args (competitor URLs)
        │
        ▼
  src/index.ts        ── parses args, owns session lifecycle, runs the agent
        │
        ▼
  src/agent.ts        ── Mastra Agent (GPT-4o), system prompt, tool registry
        │  (tool calls)
        ▼
  src/tools/
    scrapeUrl.ts      ── visits a URL via Steel + Playwright, returns markdown
    searchForPage.ts  ── discovers sub-pages by keyword (e.g. "pricing")
    writeReport.ts    ── writes the final report.md to disk
        │
        ▼
  src/session.ts      ── Steel session singleton + Playwright CDP connection
        │
        ▼
  Steel Cloud         ── anti-bot, CAPTCHA solving, proxy, live viewer
        │
        ▼
  Real Websites
```

**Key design decisions:**

| Decision | Why |
|---|---|
| Single Steel session reused across all tool calls | Efficient, preserves the browser fingerprint, and all activity shows up in Steel's live viewer |
| Three tools instead of one big scraper | `searchForPage` makes the agent's reasoning *visible* — it's the demo's wow factor |
| Turndown + GFM tables plugin | Pricing tables survive the HTML→Markdown conversion |
| `onStepFinish` callback | Every agent step (reasoning + tool calls + results) streams to the terminal in real time |
| `writeReport` is a tool, not post-processing | Keeps the agent's final output action visible in the step log |

---

## Setup

### 1. Clone & install

```bash
git clone <repo-url>
cd MaSteel
npm install
```

### 2. Add your API keys

Copy `.env.example` to `.env` and fill in both keys:

```bash
cp .env.example .env
```

```env
OPENAI_API_KEY=sk-...
STEEL_API_KEY=your-steel-api-key-here
```

Get a Steel key at [app.steel.dev](https://app.steel.dev).

### 3. Run it

```bash
npx tsx src/index.ts https://stripe.com https://braintree.com https://adyen.com
```

A `report.md` file will appear in the project root when the agent finishes.

---

## How it works

### session.ts — Steel session lifecycle

`session.ts` exports three functions that together form a lazy singleton:

| Function | What it does |
|---|---|
| `getSession()` | Creates a Steel session on first call (proxy + CAPTCHA solving enabled, 30-min timeout). Returns the cached session on subsequent calls. Prints the **live viewer URL** so you can watch the browser in real time. |
| `getBrowser()` | Connects Playwright to the Steel session over CDP. Reuses the *first existing context* — creating a new context would bypass Steel's fingerprint and disappear from the live viewer. |
| `releaseSession()` | Closes the Playwright connection, then calls `sessions.release()` so the session doesn't linger in the Steel dashboard. |

The CDP connection URL follows Steel's standard format:

```
wss://connect.steel.dev?apiKey=${STEEL_API_KEY}&sessionId=${session.id}
```

### The three tools

#### scrape-url

Navigates to a URL, waits for the network to go idle, pulls the full HTML, and converts it to markdown using Turndown with the GFM plugin (so tables — especially pricing tables — survive). Output is capped at 15 000 characters; if it's truncated the tool tells the agent so it can request a more targeted page.

#### search-for-page

The agent's primary discovery mechanism. It navigates to a base URL, runs a small `page.evaluate()` to grab every `<a>` on the page, then filters by a keyword the agent supplies (e.g. `"pricing"`). Relative hrefs are resolved against the base URL, duplicates are removed, and up to 10 matches are returned. This is what prevents the agent from guessing `/pricing` and hitting a 404.

#### write-report

Straightforward `fs.writeFileSync`. It's a tool rather than inline code so the action appears in the agent's step log — important for the demo.

### The agent prompt

The system prompt in `agent.ts` does three things:

1. **Numbered workflow** — tells the agent exactly what order to call tools in (homepage scrape → search for pricing → scrape pricing → search for features → …). This dramatically reduces wasted steps.
2. **Embedded report template** — the agent doesn't have to invent a structure; it fills in the blanks.
3. **Tool-usage guardrails** — "do not guess URLs", "call write-report exactly once at the end". These two rules cut hallucinated URLs and duplicate writes in half.

### index.ts — the entry point

1. Imports `dotenv/config` first (required for env loading).
2. Parses URLs from `process.argv` (anything starting with `http`).
3. Pre-warms the Steel session so the live-viewer URL appears before any browsing starts.
4. Calls `agent.generate()` with `maxSteps: 50` and an `onStepFinish` callback that logs assistant text, tool names + inputs, and a 200-char preview of each tool result.
5. Releases the session in a `finally` block — no dangling sessions.

---

## What the terminal output looks like

```
[MaSteel] Competitors to research: 3
  1. https://stripe.com
  2. https://braintree.com
  3. https://adyen.com

[Steel] Session created
[Steel] Live viewer: https://viewer.steel.dev/...
[Steel] Playwright connected via CDP

[Agent] I'll start by scraping each competitor's homepage, then search for their pricing and features pages.

[Agent → scrape-url] { "url": "https://stripe.com" }
  [scrape-url] Navigating to https://stripe.com
  [scrape-url] Done — 12430 chars
[scrape-url →] {"url":"https://stripe.com","title":"Stripe: Pay and get paid","content":"...","truncated":false} ...

[Agent → search-for-page] { "baseUrl": "https://stripe.com", "keyword": "pricing" }
  [search-for-page] Scanning https://stripe.com for "pricing"
  [search-for-page] Found 3 match(es)
[search-for-page →] {"baseUrl":"https://stripe.com","keyword":"pricing","matches":[{"url":"https://stripe.com/pricing" ...

...

  [write-report] Report written to /path/to/MaSteel/report.md

[MaSteel] Done. Check report.md in the current directory.
[Steel] Session abc123 released
```

---

## Extending it

| What | How |
|---|---|
| Add a new tool | Create a file in `src/tools/`, export a `createTool(...)`, import it in `agent.ts` and add it to the `tools` object |
| Swap the model | Change `openai("gpt-4o")` in `agent.ts` to any Mastra-supported model |
| Add memory / history | Mastra supports memory plugins — wire one into the agent to let it remember previous runs |
| Schedule recurring runs | Wrap the `index.ts` logic in a cron job or a serverless function |
| Target more data points | Add tools like `searchForPage` with keywords such as `"testimonials"`, `"case-study"`, or `"careers"` to pull sentiment and hiring signals |

---

## Why Steel matters here

Real competitor sites — Stripe, Braintree, Adyen — all run bot detection. A vanilla Playwright script will get blocked or served empty HTML within minutes. Steel's cloud session:

- **Looks like a real user** to the site's bot detection (fingerprint, headers, behaviour).
- **Solves CAPTCHAs automatically** if one is triggered mid-session.
- **Rotates proxies** so repeated visits don't get IP-blocked.
- **Persists across tool calls** — the same session browses Stripe, then Braintree, then Adyen, all without re-establishing trust.

The live viewer URL lets you (or a client on a call) watch every page load happen in a real browser in real time — a powerful demo moment.

---

## Links

- [Steel — cloud browser sessions](https://steel.dev)
- [Mastra — TypeScript agent framework](https://mastra.ai)
- [OpenAI API](https://platform.openai.com)

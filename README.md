# MaSteel — Competitive Intelligence Agent
## Mastra + Steel
> Drop in competitor URLs. Get a detailed report. No manual research required.

MaSteel is an AI agent that takes a list of base URLs, autonomously navigates competitor websites — including JavaScript-heavy sites with hidden menus — and produces a structured competitive intelligence report covering pricing, features, positioning, and more. [See an example report →](example_report.md)

---

## How it works

You give it base URLs. It does everything else:

```bash
npm start https://stripe.com https://www.adyen.com
```

The agent will:
1. **Scrape each homepage** to understand company positioning
2. **Search for subpages** (pricing, features, about) by scanning links
3. **Explore hidden navigation** — hovers over dropdown menus, clicks hamburger buttons, scrolls to footers — to discover links that aren't in the static HTML
4. **Scrape discovered pages** for detailed pricing, features, and company info
5. **Write a structured report** comparing all competitors

The result is a `report.md` file ready to read or share. See [example_report.md](example_report.md) for a finished report.

### Why just base URLs?

Most competitive intel tools require you to manually find and feed in every subpage URL. MaSteel doesn't. Its `explore-navigation` tool interacts with the page like a real user — hovering over nav items to reveal dropdowns, clicking mobile menu buttons — so it discovers pages that static link scrapers miss entirely. Sites like Braintree, which hide everything behind JavaScript navigation, work out of the box.

---

## Built with

| Technology | Role |
|-----------|------|
| [**Steel**](https://steel.dev) | Cloud browser that bypasses bot detection, solves CAPTCHAs, and provides a live viewer to watch the agent browse in real time |
| [**Mastra**](https://mastra.ai) | TypeScript AI agent framework that gives GPT-4o tools to control the browser and make decisions |
| [**Playwright**](https://playwright.dev) | Browser automation — handles hover interactions, clicks, and DOM extraction |
| [**OpenAI**](https://platform.openai.com) | GPT-4o-mini powers the agent's reasoning and report generation |

---

## Prerequisites

| Requirement | Where to get it |
|-------------|-----------------|
| **Node.js** v18+ | [nodejs.org](https://nodejs.org) (LTS version) |
| **OpenAI API key** | [platform.openai.com](https://platform.openai.com) → API Keys |
| **Steel API key** | [app.steel.dev](https://app.steel.dev) → copy your API key |

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd MaSteel
npm install

# 2. Set up API keys
npm run setup
# Edit .env with your real keys:
#   OPENAI_API_KEY=sk-proj-...
#   STEEL_API_KEY=steel_...

# 3. Verify setup
npm run check-env

# 4. Run it
npm start https://stripe.com https://www.adyen.com
```

When it finishes, open `report.md` for the full competitive analysis.

---

## What the agent does under the hood

```
  Base URLs (e.g. https://stripe.com)
          │
          ▼
    scrape-url ──────── Scrapes homepage content
          │
          ▼
    search-for-page ─── Scans <a> links for keywords like "pricing"
          │
          │  (0 results?)
          ▼
    explore-navigation ─ Hovers nav items, clicks hamburger menus,
          │               scrolls to footer — discovers hidden links
          ▼
    scrape-url ──────── Scrapes discovered subpages
          │
          ▼
    write-report ────── Generates the final markdown report
```

All browsing happens through **Steel's cloud browser** — bot detection, CAPTCHAs, and IP rotation are handled automatically. You can watch the agent work in real time via the live viewer URL printed at startup.

---

## Architecture

```
src/
  index.ts              ── Entry point, manages Steel session lifecycle
  agent.ts              ── Mastra AI agent with GPT-4o-mini + tool definitions
  session.ts            ── Steel session + Playwright CDP connection (singleton)
  tools/
    scrapeUrl.ts        ── Visits a URL, extracts content as markdown
    searchForPage.ts    ── Finds links matching a keyword (with dedup cache)
    exploreNavigation.ts── Hovers/clicks nav elements to reveal hidden links
    writeReport.ts      ── Writes the final report to disk
```

---

## Available Commands

| Command | What it does |
|---------|--------------|
| `npm start <urls>` | Runs the agent on the given competitor URLs |
| `npm run setup` | Creates your `.env` configuration file |
| `npm run check-env` | Verifies your API keys are set correctly |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `command not found: npm` | Install Node.js from [nodejs.org](https://nodejs.org) |
| `Missing or invalid env vars` | Run `npm run setup` and edit `.env` with your real keys |
| Agent gets blocked or sees blank pages | Check your Steel API key at [app.steel.dev](https://app.steel.dev) |
| `Cannot find module` errors | Run `npm install` again |

---

## Links

- [Steel — cloud browser sessions](https://steel.dev)
- [Mastra — TypeScript agent framework](https://mastra.ai)
- [OpenAI API](https://platform.openai.com)

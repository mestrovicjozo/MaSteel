# Steel + Mastra Competitive Intelligence Agent

An AI agent that autonomously navigates competitor websites and generates detailed competitive intelligence reports covering pricing, features, and positioning.

![Difficulty](https://img.shields.io/badge/Difficulty-Intermediate-yellow)
![Time](https://img.shields.io/badge/Time-10%20min-blue)
![Tech](https://img.shields.io/badge/TypeScript-blue)

---

## TL;DR

5 minute read. Drop in competitor URLs, get a structured competitive intelligence report with pricing, features, and positioning.

```bash
git clone <repo-url>
cd MaSteel
npm install
cp .env.example .env
# Add your API keys to .env
npm start https://stripe.com https://www.adyen.com
```

[See an example report →](stripe_adyen_report.md)

---

## What You'll Learn

- **Autonomous Navigation**: How to build an AI agent that explores JavaScript-heavy sites including hidden menus and dynamic content
- **Cloud Browser Automation**: Use Steel's cloud browser to bypass bot detection and CAPTCHAs while scraping competitor sites
- **AI-Powered Intelligence**: Leverage GPT-4o to analyze and synthesize competitive data into structured reports

---

## Installation

Clone the repository:

```bash
git clone <repo-url>
cd MaSteel
```

### TypeScript/Node.js Setup

```bash
npm install
```

**Prerequisites:**
- Node.js v18+ ([nodejs.org](https://nodejs.org))
- OpenAI API key ([platform.openai.com](https://platform.openai.com) → API Keys)
- Steel API key ([app.steel.dev](https://app.steel.dev) → copy your API key)

---

## Quick Start

The agent will:

- Scrape each homepage to understand company positioning
- Search for subpages (pricing, features, about) by scanning links
- Explore hidden navigation — hovers over dropdown menus, clicks hamburger buttons, scrolls to footers
- Scrape discovered pages for detailed pricing, features, and company info
- Generate a structured markdown report comparing all competitors

### 1. Configure environment

Create `.env`:

```env
OPENAI_API_KEY=sk-proj-...
STEEL_API_KEY=steel_...
```

Or use the setup command:
```bash
npm run setup
# Edit .env with your real keys
```

Get your free Steel API key: [app.steel.dev](https://app.steel.dev)

### 2. Run

```bash
npm start https://stripe.com https://www.adyen.com
```

When it finishes, open `stripe_adyen_report.md` for the full competitive analysis.

**Verify your setup first:**
```bash
npm run check-env
```

---

## How It Works

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
    write-report ────── Generates the final report (named by company)
```

All browsing happens through **Steel's cloud browser** — bot detection, CAPTCHAs, and IP rotation are handled automatically. You can watch the agent work in real time via the live viewer URL printed at startup.

### Why Just Base URLs?

Most competitive intel tools require you to manually find and feed in every subpage URL. MaSteel doesn't. Its `explore-navigation` tool interacts with the page like a real user — hovering over nav items to reveal dropdowns, clicking mobile menu buttons — so it discovers pages that static link scrapers miss entirely.

---

## Configuration

Customize the agent by editing `src/agent.ts`:

**Steel Session Configuration:**
```typescript
const session = await client.sessions.create({
  useProxy: true,        // Use Steel's proxy network
  solveCaptcha: true,     // Enable CAPTCHA solving
  sessionTimeout: 1800000, // 30 minute timeout
});
```

**Model Selection:**
Edit `src/agent.ts` to change the AI model:
```typescript
const agent = new Agent({
  name: 'competitive-intel-agent',
  instructions: '...',
  model: {
    provider: 'OPEN_AI',
    name: 'gpt-4o-mini-2024-07-18',  // Change model here
    toolChoice: 'auto',
  },
  tools: { ... }
});
```

---

## Architecture

```
src/
  index.ts              ── Entry point, manages Steel session lifecycle
  agent.ts              ── Mastra AI agent with GPT-4o + tool definitions
  session.ts            ── Steel session + Playwright CDP connection (singleton)
  tools/
    scrapeUrl.ts        ── Visits a URL, extracts content as markdown
    searchForPage.ts    ── Finds links matching a keyword (with dedup cache)
    exploreNavigation.ts── Hovers/clicks nav elements to reveal hidden links
    writeReport.ts      ── Writes the final report to disk
```

---

## Error Handling

The template includes proper cleanup:

```typescript
try {
  // Your automation code
} finally {
  // Cleanup runs even if there's an error
  if (browser) await browser.close();
  if (session) await client.sessions.release(session.id);
}
```

---

## Built With

| Technology | Role |
|-----------|------|
| [**Steel**](https://steel.dev) | Cloud browser that bypasses bot detection, solves CAPTCHAs, and provides a live viewer to watch the agent browse in real time |
| [**Mastra**](https://mastra.ai) | TypeScript AI agent framework that gives GPT-4o tools to control the browser and make decisions |
| [**Playwright**](https://playwright.dev) | Browser automation — handles hover interactions, clicks, and DOM extraction |
| [**OpenAI**](https://platform.openai.com) | GPT-4o powers the agent's reasoning and report generation |

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

## Support

- [Steel Documentation](https://docs.steel.dev)
- [Mastra Documentation](https://mastra.ai)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Discord Community](https://discord.gg/steel-dev)

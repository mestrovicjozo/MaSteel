# MaSteel — Competitive Intelligence Agent

> An AI-powered tool that automatically visits competitor websites, gathers information about their pricing, features, and offerings, and creates a neat summary report for you.

---

## What does this do?

You give it a list of competitor websites, and it:
1. Visits each website (like a real person would)
2. Finds their pricing pages, features, and other important info
3. Reads and understands the content
4. Writes a structured report comparing all competitors

The result is a `report.md` file you can read or share.

---

## Prerequisites

Before you start, you'll need:

| Requirement | What it is | Where to get it |
|-------------|-----------|-----------------|
| **Node.js** (v18+) | JavaScript runtime that runs the code | [nodejs.org](https://nodejs.org) — download the LTS version |
| **OpenAI API key** | Lets the AI understand and analyze websites | [platform.openai.com](https://platform.openai.com) — create account, go to API Keys |
| **Steel API key** | Provides a cloud browser that won't get blocked | [app.steel.dev](https://app.steel.dev) — create account, copy your API key |

**How to check if Node.js is installed:**
```bash
node --version
```
If you see a version number (like `v20.10.0`), you're good. If not, install Node.js first.

---

## Quick Start

### Step 1: Download the project

```bash
git clone <repo-url>
cd MaSteel
```

### Step 2: Install dependencies

This downloads all the code libraries the project needs:

```bash
npm install
```

### Step 3: Set up your API keys

Run this command to create your configuration file:

```bash
npm run setup
```

Now open the `.env` file in any text editor (Notepad, VS Code, etc.) and replace the placeholder text with your real API keys:

```
OPENAI_API_KEY=sk-proj-abc123...your-real-key-here
STEEL_API_KEY=steel_abc123...your-real-key-here
```

**Important:** Keep your API keys secret. Never share them or commit them to git.

### Step 4: Verify everything is set up

```bash
npm run check-env
```

If you see `Environment OK`, you're ready to go. If it shows errors, double-check your `.env` file.

### Step 5: Run it

```bash
npm start https://stripe.com https://braintree.com https://adyen.com
```

Replace those URLs with any competitor websites you want to research.

When it finishes, you'll find a `report.md` file in the project folder with all the gathered intelligence.

---

## Available Commands

| Command | What it does |
|---------|--------------|
| `npm install` | Downloads all required dependencies (run once) |
| `npm run setup` | Creates your `.env` configuration file |
| `npm run check-env` | Verifies your API keys are set correctly |
| `npm start <urls>` | Runs the agent on the given competitor URLs |
| `npm run dev <urls>` | Same as `npm start` (alias) |

---

## Troubleshooting

### "command not found: npm"
You need to install Node.js. Download it from [nodejs.org](https://nodejs.org).

### "Missing or invalid env vars"
Your `.env` file is missing or the API keys aren't filled in. Run `npm run setup` and edit the `.env` file with your real keys.

### "OPENAI_API_KEY is not set"
Make sure your `.env` file has `OPENAI_API_KEY=sk-...` (with your actual key, no spaces around the `=`).

### The agent gets blocked or sees blank pages
This usually means Steel's session expired or there's an issue with your Steel API key. Check your key at [app.steel.dev](https://app.steel.dev).

### "Cannot find module" errors
Run `npm install` again to make sure all dependencies are downloaded.

---

## How it works (technical overview)

The project uses two main technologies:

- **Steel** — A cloud browser service that browses websites like a real human. It handles CAPTCHAs, avoids bot detection, and rotates IP addresses automatically.
- **Mastra** — An AI agent framework that lets GPT-4 control the browser, decide which pages to visit, and understand the content.

### Architecture

```
Your command (competitor URLs)
        │
        ▼
  src/index.ts        ── Entry point, manages the session
        │
        ▼
  src/agent.ts        ── AI Agent (GPT-4o) that decides what to do
        │
        ▼
  src/tools/
    scrapeUrl.ts      ── Visits a URL and extracts content
    searchForPage.ts  ── Finds links on a page (e.g., "pricing")
    writeReport.ts    ── Saves the final report
        │
        ▼
  Steel Cloud         ── Anti-bot browser in the cloud
        │
        ▼
  Real Websites
```

### Why Steel?

Real competitor sites (Stripe, Braintree, etc.) use bot detection. A normal script gets blocked instantly. Steel's cloud browser:

- Looks like a real person to bot detectors
- Solves CAPTCHAs automatically
- Rotates IP addresses to avoid blocks
- Shows you a live view of the browser working

---

## Extending the project

| Goal | How to do it |
|------|--------------|
| Research different data | Add new tools in `src/tools/` for keywords like "testimonials" or "careers" |
| Use a different AI model | Change `openai("gpt-4o")` in `src/agent.ts` |
| Run on a schedule | Set up a cron job or scheduled task to run `npm start` periodically |

---

## Links

- [Steel — cloud browser sessions](https://steel.dev)
- [Mastra — TypeScript agent framework](https://mastra.ai)
- [OpenAI API](https://platform.openai.com)
- [Node.js](https://nodejs.org)

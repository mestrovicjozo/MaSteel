import "dotenv/config";
import { getSession, releaseSession } from "./session";
import { agent } from "./agent";

// ---------------------------------------------------------------------------
// 1. Parse competitor URLs from CLI args
// ---------------------------------------------------------------------------
const urls = process.argv.filter((arg) => arg.startsWith("http"));

if (urls.length === 0) {
  console.error("Usage: npx tsx src/index.ts <url1> <url2> ...");
  console.error("Example: npx tsx src/index.ts https://stripe.com https://braintree.com");
  process.exit(1);
}

console.log(`\n[MaSteel] Competitors to research: ${urls.length}`);
urls.forEach((u, i) => console.log(`  ${i + 1}. ${u}`));

// ---------------------------------------------------------------------------
// 2. Run
// ---------------------------------------------------------------------------
(async () => {
  try {
    // Pre-warm the Steel session so the live viewer URL prints before any tool
    // calls happen.
    await getSession();
    console.log(`[MaSteel] Steel live viewer ready — watch your agent browse in real time`);

    // Build the user prompt
    const userPrompt =
      "Research the following competitors and produce a full competitive intelligence report:\n" +
      urls.map((u, i) => `${i + 1}. ${u}`).join("\n");

    // ---------------------------------------------------------------------------
    // 3. Run the agent with real-time step logging
    // ---------------------------------------------------------------------------
    const result = await agent.generate(userPrompt, {
      maxSteps: 50,
      onStepFinish: (step) => {
        // Log assistant reasoning text
        if (step.text) {
          console.log(`\n[Agent] ${step.text}`);
        }

        // Log each tool call + its result
        for (const tc of step.toolCalls || []) {
          console.log(`\n[Agent → ${tc.payload?.toolName || "tool"}] ${JSON.stringify(tc.payload?.args, null, 2)}`);
        }
        for (const tr of step.toolResults || []) {
          const raw = JSON.stringify(tr.payload?.result);
          const preview = raw?.slice(0, 200);
          console.log(`[${tr.payload?.toolName || "tool"} →] ${preview}${(raw?.length ?? 0) > 200 ? " ..." : ""}`);
        }
      },
    });

    // Final text response (if any)
    if (result.text) {
      console.log(`\n[Agent] ${result.text}`);
    }

    console.log("\n[MaSteel] Done. Check report.md in the current directory.");
  } catch (err) {
    console.error("\n[MaSteel] Error:", err);
    process.exit(1);
  } finally {
    await releaseSession();
  }
})();

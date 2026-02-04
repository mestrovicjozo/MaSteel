import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import fs from "fs";
import path from "path";

export const writeReport = createTool({
  id: "write-report",
  description:
    "Writes the final competitive intelligence report to report.md in the current working directory. " +
    "Call this exactly once at the end, after all research is complete.",
  inputSchema: z.object({
    content: z.string().describe("The full markdown report content to write"),
  }),
  execute: async ({ content }) => {
    const filePath = path.resolve(process.cwd(), "report.md");
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`  [write-report] Report written to ${filePath}`);
    return { filePath, success: true };
  },
});

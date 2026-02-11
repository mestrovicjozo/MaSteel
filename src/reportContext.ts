// Global context for sharing report filename
let reportFilename = "report.md";

export function setReportFilename(filename: string) {
  reportFilename = filename;
}

export function getReportFilename(): string {
  return reportFilename;
}

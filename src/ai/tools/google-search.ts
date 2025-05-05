import { Tool } from "../tool-manager";

export class GoogleSearchTool implements Tool {
  name = "googleSearch";
  async execute(args: { query: string }) {
    // Placeholder: In production, call a backend API or use a proxy for Google Search
    return { result: `Searched Google for: "${args.query}" (mock result)` };
  }
}
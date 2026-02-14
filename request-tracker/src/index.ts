import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchTickets } from "./tools.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "rt",
  version: "1.0.0",
});

/**
 * Extract parent/child relationships from ticket _hyperlinks.
 */
function extractTicketRelationships(ticketData: any): {
  parents: string[];
  children: string[];
} {
  const relationships = { parents: [] as string[], children: [] as string[] };

  const hyperlinks = ticketData._hyperlinks || [];
  for (const link of hyperlinks) {
    const ref = link.ref;
    const ticketId = link.id;

    if (ref === "parent" && ticketId) {
      relationships.parents.push(String(ticketId));
    } else if (ref === "child" && ticketId) {
      relationships.children.push(String(ticketId));
    }
  }

  return relationships;
}

server.registerTool(
  "search_tickets",
  {
    description:
      "Search for tickets using simple search syntax. Returns summary information for matching tickets",
    inputSchema: z.object({
      query: z
        .string()
        .min(5, {
          error: "Search text is required",
        })
        .describe("Simple search query text (e.g., 'bug in login')"),
      limit: z
        .number()
        .default(20)
        .describe("Maximum number of results to return (default 10, max 100)"),
    }),
  },
  async ({ limit, query }) => {
    const result = await searchTickets(query, limit);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Weather MCP Server running on stdio");
}

main().catch((e) => {
  console.error("Fatal error in main():", e);
  process.exit(1);
});

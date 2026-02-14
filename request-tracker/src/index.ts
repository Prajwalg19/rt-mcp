import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  searchTickets,
  getTicket,
  getTicketHistory,
  createTicket,
  updateTicket,
  addComment,
  getQueues,
  getUsers,
  getTicketLinks,
} from "./tools.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "rt-ticket-tracker",
  version: "1.0.0",
});

// ============================================================================
// TOOLS
// ============================================================================

server.registerTool(
  "search_tickets",
  {
    title: "Search Tickets",
    description: "Search for tickets using simple search syntax.",
    inputSchema: z.object({
      query: z.string().min(5),
      limit: z.number().min(1).max(100).default(20),
    }),
  },
  async ({ limit, query }) => {
    const result = await searchTickets(query, limit);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "get_ticket",
  {
    title: "Get Ticket Details",
    description: "Retrieve detailed information about a ticket.",
    inputSchema: z.object({
      ticket_id: z.number().positive(),
    }),
  },
  async ({ ticket_id }) => {
    const result = await getTicket(ticket_id);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "get_ticket_history",
  {
    title: "Get Ticket History",
    description: "Retrieve full ticket history.",
    inputSchema: z.object({
      ticket_id: z.number().positive(),
    }),
  },
  async ({ ticket_id }) => {
    const result = await getTicketHistory(ticket_id);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "create_ticket",
  {
    title: "Create Ticket",
    description: "Create a new RT ticket.",
    inputSchema: z.object({
      subject: z.string().min(1),
      queue: z.string(),
      requestor: z.string().optional(),
      cc: z.array(z.string()).optional(),
      content: z.string().optional(),
      priority: z.number().min(0).max(100).optional(),
      status: z.string().optional(),
    }),
  },
  async ({ subject, queue, requestor, cc, content, priority, status }) => {
    const result = await createTicket({
      subject,
      queue,
      requestor,
      cc,
      content,
      priority,
      status,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "update_ticket",
  {
    title: "Update Ticket",
    description: "Update metadata of an existing ticket.",
    inputSchema: z.object({
      ticket_id: z.number().positive(),
      subject: z.string().optional(),
      status: z.string().optional(),
      priority: z.number().min(0).max(100).optional(),
      owner: z.string().optional(),
      queue: z.string().optional(),
    }),
  },
  async ({ ticket_id, subject, status, priority, owner, queue }) => {
    const result = await updateTicket(ticket_id, {
      subject,
      status,
      priority,
      owner,
      queue,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "add_comment",
  {
    title: "Add Comment",
    description: "Add a comment or correspondence to a ticket.",
    inputSchema: z.object({
      ticket_id: z.number().positive(),
      content: z.string().min(1),
      type: z.enum(["comment", "correspond"]).default("comment"),
    }),
  },
  async ({ ticket_id, content, type }) => {
    const result = await addComment(ticket_id, content, type);

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "get_queues",
  {
    title: "Get Queues",
    description: "Retrieve list of all RT queues.",
    inputSchema: z.object({}),
  },
  async () => {
    const result = await getQueues();
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "get_users",
  {
    title: "Get Users",
    description: "Retrieve list of RT users (optionally filtered).",
    inputSchema: z.object({
      query: z.string().optional(),
    }),
  },
  async ({ query }) => {
    const result = await getUsers(query);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "get_ticket_links",
  {
    title: "Get Ticket Links",
    description:
      "Retrieve ticket relationships (dependencies, parent/child, references).",
    inputSchema: z.object({
      ticket_id: z.number().positive(),
    }),
  },
  async ({ ticket_id }) => {
    const result = await getTicketLinks(ticket_id);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ============================================================================
// SERVER START
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("RT MCP Server running on stdio");
}

main().catch((e) => {
  console.error("Fatal error in main():", e);
  process.exit(1);
});

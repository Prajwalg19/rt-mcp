import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchTickets, getTicket, getTicketHistory, createTicket, updateTicket, addComment, getQueues, getUsers, getTicketLinks, getTicketAttachments, getAttachmentDetails, downloadAttachment, } from "./tools.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
const getServer = () => {
    const server = new McpServer({
        name: "rt-ticket-tracker",
        version: "1.0.0",
    }, {
        capabilities: {
            logging: {},
        },
    });
    // ============================================================================
    // TOOLS
    // ============================================================================
    server.registerTool("search_tickets", {
        title: "Search Tickets",
        description: "Search for tickets using simple search syntax.",
        inputSchema: z.object({
            query: z.string().min(5),
            limit: z.number().min(1).max(100).default(20),
        }),
    }, async ({ limit, query }) => {
        const result = await searchTickets(query, limit);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    server.registerTool("get_ticket", {
        title: "Get Ticket Details",
        description: "Retrieve detailed information about a ticket.",
        inputSchema: z.object({
            ticket_id: z.number().positive(),
        }),
    }, async ({ ticket_id }) => {
        const result = await getTicket(ticket_id);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    server.registerTool("get_ticket_history", {
        title: "Get Ticket History",
        description: "Retrieve full ticket history.",
        inputSchema: z.object({
            ticket_id: z.number().positive(),
        }),
    }, async ({ ticket_id }) => {
        const result = await getTicketHistory(ticket_id);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    server.registerTool("create_ticket", {
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
    }, async ({ subject, queue, requestor, cc, content, priority, status }) => {
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
    });
    server.registerTool("update_ticket", {
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
    }, async ({ ticket_id, subject, status, priority, owner, queue }) => {
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
    });
    server.registerTool("add_comment", {
        title: "Add Comment",
        description: "Add a comment or correspondence to a ticket.",
        inputSchema: z.object({
            ticket_id: z.number().positive(),
            content: z.string().min(1),
            type: z.enum(["comment", "correspond"]).default("comment"),
        }),
    }, async ({ ticket_id, content, type }) => {
        const result = await addComment(ticket_id, content, type);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    server.registerTool("get_queues", {
        title: "Get Queues",
        description: "Retrieve list of all RT queues.",
        inputSchema: z.object({}),
    }, async () => {
        const result = await getQueues();
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    server.registerTool("get_users", {
        title: "Get Users",
        description: "Retrieve list of RT users (optionally filtered).",
        inputSchema: z.object({
            query: z.string().optional(),
        }),
    }, async ({ query }) => {
        const result = await getUsers(query);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    server.registerTool("get_ticket_links", {
        title: "Get Ticket Links",
        description: "Retrieve ticket relationships (dependencies, parent/child, references).",
        inputSchema: z.object({
            ticket_id: z.number().positive(),
        }),
    }, async ({ ticket_id }) => {
        const result = await getTicketLinks(ticket_id);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    server.registerTool("get_ticket_attachments", {
        title: "Get Ticket Attachments",
        description: "List all attachments for a specific ticket.",
        inputSchema: z.object({
            ticket_id: z.number().positive(),
        }),
    }, async ({ ticket_id }) => {
        const result = await getTicketAttachments(ticket_id);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    server.registerTool("get_attachment_details", {
        title: "Get Attachment Details",
        description: "Get detailed information about a specific attachment.",
        inputSchema: z.object({
            ticket_id: z.number().positive(),
            attachment_id: z.number().positive(),
        }),
    }, async ({ ticket_id, attachment_id }) => {
        const result = await getAttachmentDetails(ticket_id, attachment_id);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    server.registerTool("download_attachment", {
        title: "Download Attachment",
        description: "Download attachment content as base64-encoded data. Use this to retrieve the actual file content.",
        inputSchema: z.object({
            ticket_id: z.number().positive(),
            attachment_id: z.number().positive(),
        }),
    }, async ({ ticket_id, attachment_id }) => {
        const result = await downloadAttachment(ticket_id, attachment_id);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    return server;
};
const app = createMcpExpressApp();
const transports = {};
app.post("/mcp", async (req, res) => {
    try {
        const sessionId = (await req.headers["mcp-session-id"]);
        let transport;
        if (sessionId && transports[sessionId]) {
            transport = transports[sessionId];
        }
        else if (!sessionId && isInitializeRequest(req.body)) {
            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                enableJsonResponse: true,
                onsessioninitialized: (sessionId) => {
                    // Store the transport by session ID when session is initialized
                    // This avoids race conditions where requests might come in before the session is stored
                    console.log(`Session initialized with ID: ${sessionId}`);
                    transports[sessionId] = transport;
                },
            });
            const server = getServer();
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
            return;
        }
        else {
            // Invalid request - no session ID or not initialization request
            res.status(400).json({
                jsonrpc: "2.0",
                error: {
                    code: -32_000,
                    message: "Bad Request: No valid session ID provided",
                },
                id: null,
            });
            return;
        }
        await transport.handleRequest(req, res, req.body);
    }
    catch (error) {
        console.error("Error handling MCP request:", error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: "2.0",
                error: {
                    code: -32_603,
                    message: "Internal server error",
                },
                id: null,
            });
        }
    }
});
// Handle GET requests for SSE streams according to spec
app.get("/mcp", async (req, res) => {
    // Since this is a very simple example, we don't support GET requests for this server
    // The spec requires returning 405 Method Not Allowed in this case
    res.status(405).set("Allow", "POST").send("Method Not Allowed");
});
// Start the server
const PORT = 3000;
app.listen(PORT, (error) => {
    if (error) {
        console.error("Failed to start server:", error);
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(1);
    }
    console.log(`MCP Streamable HTTP Server listening on port ${PORT}`);
});
// Handle server shutdown
process.on("SIGINT", async () => {
    console.log("Shutting down server...");
    process.exit(0);
});

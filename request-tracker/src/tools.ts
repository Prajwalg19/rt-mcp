const RT_TOKEN = "1-56-ddce60ef90a7ff8a8e0972c830c41cb3";
const RT_API_BASE = "https://support.hopbox.in/REST/2.0";

interface RTRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
}

async function makeRTRequest(endpoint: string, options: RTRequestOptions = {}) {
  const url = RT_API_BASE.replace(/\/$/, "") + endpoint;
  const headers: Record<string, string> = {
    Authorization: `token ${RT_TOKEN}`,
    Accept: "application/json",
  };

  const fetchOptions: RequestInit = {
    method: options.method || "GET",
    headers,
    signal: AbortSignal.timeout(20000),
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
    fetchOptions.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `HTTP error! status ${response.status} : ${text || response.statusText}`,
      );
    }
    return await response.json();
  } catch (e) {
    console.error("Error making RT request: ", e);
    return null;
  }
}

async function makeRTBinaryRequest(endpoint: string) {
  const url = RT_API_BASE.replace(/\/$/, "") + endpoint;
  const headers: Record<string, string> = {
    Authorization: `token ${RT_TOKEN}`,
  };

  const fetchOptions: RequestInit = {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(20000),
  };

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `HTTP error! status ${response.status} : ${text || response.statusText}`,
      );
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (e) {
    console.error("Error making RT binary request: ", e);
    return null;
  }
}

/**
 * Search for tickets using simple search syntax
 */
async function searchTickets(query: string, limit: number = 20): Promise<any> {
  try {
    if (limit < 1) limit = 1;
    if (limit > 100) limit = 100;

    const encodedQuery = encodeURIComponent(query);
    const fields = "Subject,Status,Queue,Owner,Created,Priority";
    const endpoint = `/tickets?simple=1;query=${encodedQuery};per_page=${limit};fields=${fields}`;

    const data = await makeRTRequest(endpoint);
    if (typeof data !== "object" || data === null) {
      return { error: "Unexpected response format", data };
    }

    const total = data.total || 0;
    const count = data.count || 0;
    const items = data.items || [];

    const tickets = items.map((item: any) => {
      const ticket: any = {
        id: item.id,
        subject: item.Subject,
        status: item.Status,
        priority: item.Priority,
      };

      const queue = item.Queue;
      if (typeof queue === "object" && queue !== null) {
        ticket.queue = queue.id || queue.Name;
      } else {
        ticket.queue = queue;
      }

      const owner = item.Owner;
      if (typeof owner === "object" && owner !== null) {
        ticket.owner = owner.id || owner.Name;
      } else {
        ticket.owner = owner;
      }

      ticket.created = item.Created;
      return ticket;
    });

    return {
      total,
      count,
      limit,
      tickets,
    };
  } catch (error: any) {
    return {
      error: error.message || String(error),
      query,
    };
  }
}

/**
 * Get detailed information about a specific ticket
 */
async function getTicket(ticketId: number): Promise<any> {
  try {
    const data = await makeRTRequest(`/ticket/${ticketId}`);
    if (typeof data !== "object" || data === null) {
      return { error: "Unexpected response format", data };
    }

    const ticketInfo = {
      id: data.id,
      type: data.Type,
      subject: data.Subject,
      status: data.Status,
      priority: data.Priority,
      queue: data.Queue,
      owner: data.Owner,
      creator: data.Creator,
      requestors: data.Requestors || [],
      cc: data.Cc || [],
      admin_cc: data.AdminCc || [],
      created: data.Created,
      started: data.Started,
      resolved: data.Resolved,
      last_updated: data.LastUpdated,
      time_worked: data.TimeWorked,
      time_estimated: data.TimeEstimated,
      time_left: data.TimeLeft,
      custom_fields: data.CustomFields || {},
    };

    return ticketInfo;
  } catch (error: any) {
    return {
      error: error.message || String(error),
      ticket_id: ticketId,
    };
  }
}

/**
 * Get ticket history (comments, correspondence, status changes)
 */
async function getTicketHistory(ticketId: number): Promise<any> {
  try {
    const data = await makeRTRequest(`/ticket/${ticketId}/history`);
    if (typeof data !== "object" || data === null) {
      return { error: "Unexpected response format", data };
    }

    const items = data.items || [];
    const history = items.map((item: any) => ({
      id: item.id,
      type: item.Type,
      creator: item.Creator,
      created: item.Created,
      content: item.Content,
      attachments: item.Attachments || [],
    }));

    return {
      ticket_id: ticketId,
      total: data.total || 0,
      count: data.count || 0,
      history,
    };
  } catch (error: any) {
    return {
      error: error.message || String(error),
      ticket_id: ticketId,
    };
  }
}

/**
 * Create a new ticket
 */
async function createTicket(ticketData: {
  subject: string;
  queue: string;
  requestor?: string;
  cc?: string[];
  content?: string;
  priority?: number;
  status?: string;
}): Promise<any> {
  try {
    const payload: any = {
      Subject: ticketData.subject,
      Queue: ticketData.queue,
    };

    if (ticketData.requestor) payload.Requestor = ticketData.requestor;
    if (ticketData.cc) payload.Cc = ticketData.cc;
    if (ticketData.content) payload.Content = ticketData.content;
    if (ticketData.priority) payload.Priority = ticketData.priority;
    if (ticketData.status) payload.Status = ticketData.status;

    const data = await makeRTRequest("/ticket", {
      method: "POST",
      body: payload,
    });

    if (typeof data !== "object" || data === null) {
      return { error: "Unexpected response format", data };
    }

    return {
      success: true,
      ticket_id: data.id,
      message: "Ticket created successfully",
    };
  } catch (error: any) {
    return {
      error: error.message || String(error),
    };
  }
}

/**
 * Update an existing ticket
 */
async function updateTicket(
  ticketId: number,
  updates: {
    subject?: string;
    status?: string;
    priority?: number;
    owner?: string;
    queue?: string;
  },
): Promise<any> {
  try {
    const payload: any = {};

    if (updates.subject) payload.Subject = updates.subject;
    if (updates.status) payload.Status = updates.status;
    if (updates.priority) payload.Priority = updates.priority;
    if (updates.owner) payload.Owner = updates.owner;
    if (updates.queue) payload.Queue = updates.queue;

    const data = await makeRTRequest(`/ticket/${ticketId}`, {
      method: "PUT",
      body: payload,
    });

    if (typeof data !== "object" || data === null) {
      return { error: "Unexpected response format", data };
    }

    return {
      success: true,
      ticket_id: ticketId,
      message: "Ticket updated successfully",
    };
  } catch (error: any) {
    return {
      error: error.message || String(error),
      ticket_id: ticketId,
    };
  }
}

/**
 * Add a comment or correspondence to a ticket
 */
async function addComment(
  ticketId: number,
  content: string,
  type: "comment" | "correspond" = "comment",
): Promise<any> {
  try {
    const payload = {
      Content: content,
      ContentType: "text/plain",
    };

    const endpoint =
      type === "correspond"
        ? `/ticket/${ticketId}/correspond`
        : `/ticket/${ticketId}/comment`;

    const data = await makeRTRequest(endpoint, {
      method: "POST",
      body: payload,
    });

    if (typeof data !== "object" || data === null) {
      return { error: "Unexpected response format", data };
    }

    return {
      success: true,
      ticket_id: ticketId,
      message: `${type === "correspond" ? "Correspondence" : "Comment"} added successfully`,
    };
  } catch (error: any) {
    return {
      error: error.message || String(error),
      ticket_id: ticketId,
    };
  }
}

/**
 * Get list of queues
 */
async function getQueues(): Promise<any> {
  try {
    const data = await makeRTRequest("/queues/all");
    if (typeof data !== "object" || data === null) {
      return { error: "Unexpected response format", data };
    }

    const items = data.items || [];
    const queues = items.map((item: any) => ({
      id: item.id,
      name: item.Name,
      description: item.Description,
    }));

    return {
      total: data.total || 0,
      count: data.count || 0,
      queues,
    };
  } catch (error: any) {
    return {
      error: error.message || String(error),
    };
  }
}

/**
 * Get list of users
 */
async function getUsers(query?: string): Promise<any> {
  try {
    const endpoint = query
      ? `/users?query=${encodeURIComponent(query)}`
      : "/users";
    const data = await makeRTRequest(endpoint);

    if (typeof data !== "object" || data === null) {
      return { error: "Unexpected response format", data };
    }

    const items = data.items || [];
    const users = items.map((item: any) => ({
      id: item.id,
      name: item.Name,
      email_address: item.EmailAddress,
      real_name: item.RealName,
    }));

    return {
      total: data.total || 0,
      count: data.count || 0,
      users,
    };
  } catch (error: any) {
    return {
      error: error.message || String(error),
    };
  }
}

/**
 * Get ticket links (dependencies, parent/child relationships)
 */
async function getTicketLinks(ticketId: number): Promise<any> {
  try {
    const data = await makeRTRequest(`/ticket/${ticketId}/links`);
    if (typeof data !== "object" || data === null) {
      return { error: "Unexpected response format", data };
    }

    return {
      ticket_id: ticketId,
      depends_on: data.DependsOn || [],
      depended_on_by: data.DependedOnBy || [],
      refers_to: data.RefersTo || [],
      referred_to_by: data.ReferredToBy || [],
      members: data.Members || [],
      member_of: data.MemberOf || [],
    };
  } catch (error: any) {
    return {
      error: error.message || String(error),
      ticket_id: ticketId,
    };
  }
}

/**
 * List all attachments for a specific ticket
 */
async function getTicketAttachments(ticketId: number): Promise<any> {
  try {
    const data = await makeRTRequest(`/ticket/${ticketId}/attachments`);
    if (typeof data !== "object" || data === null) {
      return { error: "Unexpected response format", data };
    }

    const items = data.items || [];
    const attachments = items.map((item: any) => ({
      id: item.id,
      filename: item.FileName,
      content_type: item.ContentType,
      size: item.ContentLength,
      created: item.Created,
      creator: item.Creator,
      transaction_id: item.Transaction,
    }));

    return {
      ticket_id: ticketId,
      total: data.total || 0,
      count: data.count || 0,
      attachments,
    };
  } catch (error: any) {
    return {
      error: error.message || String(error),
      ticket_id: ticketId,
    };
  }
}

/**
 * Get details about a specific attachment
 */
async function getAttachmentDetails(
  ticketId: number,
  attachmentId: number,
): Promise<any> {
  try {
    const data = await makeRTRequest(
      `/ticket/${ticketId}/attachments/${attachmentId}`,
    );
    if (typeof data !== "object" || data === null) {
      return { error: "Unexpected response format", data };
    }

    return {
      id: data.id,
      filename: data.FileName,
      content_type: data.ContentType,
      size: data.ContentLength,
      encoding: data.Encoding,
      created: data.Created,
      creator: data.Creator,
      headers: data.Headers || {},
      content: data.Content,
      transaction_id: data.Transaction,
    };
  } catch (error: any) {
    return {
      error: error.message || String(error),
      ticket_id: ticketId,
      attachment_id: attachmentId,
    };
  }
}

/**
 * Download attachment content as base64
 */
async function downloadAttachment(
  ticketId: number,
  attachmentId: number,
): Promise<any> {
  try {
    const buffer = await makeRTBinaryRequest(
      `/ticket/${ticketId}/attachments/${attachmentId}/content`,
    );

    if (!buffer) {
      return {
        error: "Failed to download attachment",
        ticket_id: ticketId,
        attachment_id: attachmentId,
      };
    }

    // Get metadata first
    const metadata = await getAttachmentDetails(ticketId, attachmentId);

    return {
      ticket_id: ticketId,
      attachment_id: attachmentId,
      filename: metadata.filename,
      content_type: metadata.content_type,
      size: buffer.length,
      content_base64: buffer.toString("base64"),
    };
  } catch (error: any) {
    return {
      error: error.message || String(error),
      ticket_id: ticketId,
      attachment_id: attachmentId,
    };
  }
}

export {
  searchTickets,
  getTicket,
  getTicketHistory,
  createTicket,
  updateTicket,
  addComment,
  getQueues,
  getUsers,
  getTicketLinks,
  getTicketAttachments,
  getAttachmentDetails,
  downloadAttachment,
};

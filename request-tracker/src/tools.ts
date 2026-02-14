const RT_API_BASE = "https://support.hopbox.in/REST/2.0";
const RT_TOKEN = "1-56-ddce60ef90a7ff8a8e0972c830c41cb3";

async function makeRTRequest(endpoint: string) {
  const url = RT_API_BASE.replace(/\/$/, "") + endpoint;
  const headers = {
    Authorization: `token ${RT_TOKEN}`,
    Accept: "application/json",
  };
  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(20000),
    });
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

async function searchTickets(query: string, limit: number = 20): Promise<any> {
  try {
    // Validate limit
    if (limit < 1) limit = 1;
    if (limit > 100) limit = 100;

    // URL encode the query
    const encodedQuery = encodeURIComponent(query);

    // Request specific fields for summary information
    const fields = "Subject,Status,Queue,Owner,Created";
    const endpoint = `/tickets?simple=1;query=${encodedQuery};per_page=${limit};fields=${fields}`;
    const data = await makeRTRequest(endpoint);

    if (typeof data !== "object" || data === null) {
      return { error: "Unexpected response format", data };
    }

    const total = data.total || 0;
    const count = data.count || 0;
    const items = data.items || [];

    // Process each ticket to extract summary info
    const tickets = items.map((item: any) => {
      const ticket: any = {
        id: item.id,
        subject: item.Subject,
        status: item.Status,
      };

      // Extract Queue (might be object or string)
      const queue = item.Queue;
      if (typeof queue === "object" && queue !== null) {
        ticket.queue = queue.id || queue.Name;
      } else {
        ticket.queue = queue;
      }

      // Extract Owner (might be object or string)
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

export { searchTickets };

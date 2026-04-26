import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = process.env.PULSEPOINTS_URL || "http://localhost:8090";
const API_KEY = process.env.PULSEPOINTS_API_KEY || "";

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (API_KEY) headers["X-API-Key"] = API_KEY;
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  return res.json();
}

const server = new McpServer({
  name: "pulsepoints",
  version: "0.1.0",
});

server.tool(
  "get_heart",
  "Get heart info — names, anniversary date, total memory count",
  {},
  async () => {
    const data = await api("/api/heart");
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "list_pulsepoints",
  "List all memories in the heart. Filter by type, search text, or date range.",
  {
    type: z.enum(["all", "text", "quote", "song", "image", "link"]).optional().describe("Filter by memory type"),
    search: z.string().optional().describe("Search text across all memories"),
    from: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    to: z.string().optional().describe("End date (YYYY-MM-DD)"),
  },
  async ({ type, search, from, to }) => {
    const params = new URLSearchParams();
    if (type && type !== "all") params.set("type", type);
    if (search) params.set("search", search);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const data = await api(`/api/pulsepoints?${params}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_pulsepoint",
  "Read a single memory by ID",
  {
    id: z.string().describe("The pulsepoint ID"),
  },
  async ({ id }) => {
    const data = await api(`/api/pulsepoints/${id}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "add_pulsepoint",
  "Add a new memory to the heart",
  {
    text: z.string().describe("The memory itself — what happened"),
    who: z.string().describe("Who is adding this memory (your name)"),
    type: z.enum(["text", "quote", "song", "image", "link"]).default("text").describe("Type of memory"),
    color: z.string().default("#7a9bb5").describe("Hex color for the dot (e.g. #c94a4a)"),
    date: z.string().describe("When this happened (e.g. 'October 31, 2024')"),
    song_title: z.string().optional().describe("Song title (for song type)"),
    song_artist: z.string().optional().describe("Artist name (for song type)"),
    spotify_url: z.string().optional().describe("Spotify URL (for song type)"),
    youtube_url: z.string().optional().describe("YouTube URL (for song type)"),
    image_url: z.string().optional().describe("Image URL (for image type)"),
    link_url: z.string().optional().describe("URL (for link type)"),
    attribution: z.string().optional().describe("Attribution (for quote type)"),
  },
  async (params) => {
    const data = await api("/api/pulsepoints", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return { content: [{ type: "text", text: `Memory added: ${JSON.stringify(data, null, 2)}` }] };
  }
);

server.tool(
  "edit_pulsepoint",
  "Edit an existing memory",
  {
    id: z.string().describe("The pulsepoint ID to edit"),
    text: z.string().optional().describe("Updated memory text"),
    who: z.string().optional().describe("Updated author"),
    type: z.enum(["text", "quote", "song", "image", "link"]).optional(),
    color: z.string().optional().describe("Updated dot color"),
    date: z.string().optional().describe("Updated date"),
    song_title: z.string().optional(),
    song_artist: z.string().optional(),
    spotify_url: z.string().optional(),
    youtube_url: z.string().optional(),
    image_url: z.string().optional(),
    link_url: z.string().optional(),
    attribution: z.string().optional(),
  },
  async ({ id, ...fields }) => {
    const data = await api(`/api/pulsepoints/${id}`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    });
    return { content: [{ type: "text", text: `Memory updated: ${JSON.stringify(data, null, 2)}` }] };
  }
);

server.tool(
  "delete_pulsepoint",
  "Delete a memory from the heart",
  {
    id: z.string().describe("The pulsepoint ID to delete"),
  },
  async ({ id }) => {
    const data = await api(`/api/pulsepoints/${id}`, { method: "DELETE" });
    return { content: [{ type: "text", text: `Memory deleted: ${data.id}` }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { gifts } from "../product-data.js";
import { buildReminderPayload } from "../openclaw/payloads.js";

const rootDir = resolve(process.cwd());

export const mcpResources = [
  ["kinloop://docs/architecture", "docs/architecture.md", "Canonical architecture decisions"],
  ["kinloop://docs/implementation-plan", "docs/implementation-plan.md", "Phase plan and acceptance criteria"],
  ["kinloop://docs/ui-architecture", "docs/ui-architecture.md", "Product IA and copy rules"],
  ["kinloop://docs/recording-script", "docs/recording-script.md", "Recording script"]
].map(([uri, path, description]) => ({ uri, path, description }));

export function createInitializeResult(id) {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: "2025-03-26",
      capabilities: {
        resources: {},
        tools: {}
      },
      serverInfo: {
        name: "kinloop-context",
        version: "0.1.0"
      }
    }
  };
}

export async function handleMcpRequest(request) {
  if (request.method === "initialize") return createInitializeResult(request.id);
  if (request.method === "resources/list") return createResult(request.id, { resources: listResources() });
  if (request.method === "resources/read") return createResult(request.id, await readResource(request.params?.uri));
  if (request.method === "tools/list") return createResult(request.id, { tools: listTools() });
  if (request.method === "tools/call") return createResult(request.id, await callTool(request.params));

  return createError(request.id, -32601, `Unsupported MCP method: ${request.method}`);
}

export function listResources() {
  return mcpResources.map((resource) => ({
    uri: resource.uri,
    name: basename(resource.path),
    description: resource.description,
    mimeType: "text/markdown"
  }));
}

export async function readResource(uri) {
  const resource = mcpResources.find((item) => item.uri === uri);
  if (!resource) throw new Error(`Unknown resource: ${uri}`);

  const text = await readFile(resolve(rootDir, resource.path), "utf8");
  return {
    contents: [{
      uri: resource.uri,
      mimeType: "text/markdown",
      text
    }]
  };
}

export function listTools() {
  return [
    {
      name: "get_phase_status",
      description: "Return the current implementation plan.",
      inputSchema: { type: "object", additionalProperties: false, properties: {} }
    },
    {
      name: "preview_reminder_payload",
      description: "Preview the OpenClaw birthday reminder payload without sending.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          recipientName: { type: "string" },
          birthday: { type: "string" },
          approvalUrl: { type: "string" }
        }
      }
    }
  ];
}

export async function callTool(params = {}) {
  if (params.name === "get_phase_status") {
    const status = await readFile(resolve(rootDir, "docs/implementation-plan.md"), "utf8");
    return textToolResult(status);
  }

  if (params.name === "preview_reminder_payload") {
    const args = params.arguments || {};
    const payload = buildReminderPayload({
      recipientName: args.recipientName || "Sarah",
      birthday: args.birthday || "June 2",
      giftOptions: gifts,
      approvalUrl: args.approvalUrl || "http://localhost:3000"
    });

    return textToolResult(JSON.stringify({ sent: false, mode: "preview", payload }, null, 2));
  }

  throw new Error(`Unknown tool: ${params.name}`);
}

export function createResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

export function createError(id, code, message) {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message }
  };
}

function textToolResult(text) {
  return {
    content: [{
      type: "text",
      text
    }]
  };
}

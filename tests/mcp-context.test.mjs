import test from "node:test";
import assert from "node:assert/strict";
import {
  callTool,
  createInitializeResult,
  handleMcpRequest,
  listResources,
  listTools,
  readResource
} from "../lib/mcp/context-server.js";

test("MCP context server initializes with read-only resources and tools", () => {
  const init = createInitializeResult(1);
  const resources = listResources();
  const tools = listTools();

  assert.equal(init.result.serverInfo.name, "kinloop-context");
  assert.equal(resources.some((resource) => resource.uri === "kinloop://docs/implementation-plan"), true);
  assert.equal(tools.some((tool) => tool.name === "get_phase_status"), true);
  assert.equal(tools.some((tool) => tool.name === "preview_reminder_payload"), true);
});

test("MCP context server reads checked-in planning docs", async () => {
  const result = await readResource("kinloop://docs/implementation-plan");

  assert.equal(result.contents[0].mimeType, "text/markdown");
  assert.match(result.contents[0].text, /Implementation Plan/);
});

test("MCP context tools return phase status and reminder payload preview", async () => {
  const status = await callTool({ name: "get_phase_status" });
  const reminder = await callTool({
    name: "preview_reminder_payload",
    arguments: { recipientName: "Sarah", birthday: "June 2", approvalUrl: "http://localhost:3000" }
  });

  assert.match(status.content[0].text, /Implementation Plan/);
  assert.match(reminder.content[0].text, /"sent": false/);
  assert.match(reminder.content[0].text, /Reply 1, 2, 3, or defer/);
});

test("MCP context request handler exposes JSON-RPC resource listing", async () => {
  const response = await handleMcpRequest({ jsonrpc: "2.0", id: 2, method: "resources/list" });

  assert.equal(response.jsonrpc, "2.0");
  assert.equal(response.id, 2);
  assert.equal(response.result.resources.length > 0, true);
});

// @vitest-environment node
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./repositories/projects", () => ({
  getProjects: vi.fn(async () => [{ id: "p1", name: "Project A" }]),
  saveProjects: vi.fn(async () => undefined)
}));
vi.mock("./repositories/archivedDays", () => ({}));
vi.mock("./repositories/categories", () => ({}));
vi.mock("./repositories/clients", () => ({}));
vi.mock("./repositories/currentDay", () => ({}));
vi.mock("./repositories/plannedTasks", () => ({}));
vi.mock("./repositories/initiatives", () => ({}));
vi.mock("./repositories/todos", () => ({}));

import { createApp, parseAllowedOrigins, type AppOptions } from "./app";

let server: Server | undefined;

async function start(options: AppOptions): Promise<string> {
  server = createApp(options).listen(0, "127.0.0.1");
  await new Promise((resolve) => server?.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

afterEach(async () => {
  await new Promise((resolve) => server?.close(resolve));
  server = undefined;
});

describe("SQL API access control", () => {
  it("rejects requests without the bearer token", async () => {
    const base = await start({ allowedOrigins: ["http://localhost:8080"], apiToken: "secret" });
    const res = await fetch(`${base}/api/projects`);
    expect(res.status).toBe(401);
  });

  it("rejects a wrong bearer token", async () => {
    const base = await start({ allowedOrigins: ["http://localhost:8080"], apiToken: "secret" });
    const res = await fetch(`${base}/api/projects`, { headers: { Authorization: "Bearer nope" } });
    expect(res.status).toBe(401);
  });

  it("accepts the correct bearer token", async () => {
    const base = await start({ allowedOrigins: ["http://localhost:8080"], apiToken: "secret" });
    const res = await fetch(`${base}/api/projects`, { headers: { Authorization: "Bearer secret" } });
    expect(res.status).toBe(200);
  });

  it("leaves the health check open", async () => {
    const base = await start({ allowedOrigins: ["http://localhost:8080"], apiToken: "secret" });
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
  });

  it("only sends CORS headers to allowed origins", async () => {
    const base = await start({ allowedOrigins: ["http://localhost:8080"] });
    const allowed = await fetch(`${base}/api/projects`, { headers: { Origin: "http://localhost:8080" } });
    const foreign = await fetch(`${base}/api/projects`, { headers: { Origin: "https://evil.example" } });
    expect(allowed.headers.get("access-control-allow-origin")).toBe("http://localhost:8080");
    expect(foreign.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("parseAllowedOrigins", () => {
  it("defaults to the Vite dev origin", () => {
    expect(parseAllowedOrigins(undefined)).toEqual(["http://localhost:8080"]);
  });

  it("splits and trims a comma-separated list", () => {
    expect(parseAllowedOrigins("https://a.example, tauri://localhost ,")).toEqual([
      "https://a.example",
      "tauri://localhost"
    ]);
  });
});

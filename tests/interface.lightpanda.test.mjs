import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, extname, join, normalize } from "node:path";

import { lightpanda } from "@lightpanda/browser";
import { chromium } from "playwright-core";

const HOST = "127.0.0.1";
const CDP_PORT = 9222;
const ROOT = normalize(join(dirname(fileURLToPath(import.meta.url)), ".."));

let server;
let baseUrl;
let lightpandaProcess;
let browser;
let context;
let page;

function contentType(pathname) {
  switch (extname(pathname)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const allowedFiles = new Set(["index.html", "dist/elm.js"]);

    server = createServer(async (request, response) => {
      try {
        const url = new URL(request.url ?? "/", `http://${HOST}`);
        const relativePath = url.pathname === "/" ? "index.html" : url.pathname.slice(1);

        if (!allowedFiles.has(relativePath)) {
          response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
          response.end("Not found");
          return;
        }

        const body = await readFile(join(ROOT, relativePath));
        response.writeHead(200, {
          "cache-control": "no-store",
          "content-type": contentType(relativePath),
        });
        response.end(body);
      } catch (error) {
        response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        response.end(String(error));
      }
    });

    server.once("error", reject);
    server.listen(0, HOST, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Unable to determine static server port"));
        return;
      }
      resolve(`http://${HOST}:${address.port}`);
    });
  });
}

before(async () => {
  baseUrl = await startStaticServer();
  lightpandaProcess = await lightpanda.serve({ host: HOST, port: CDP_PORT });
  browser = await chromium.connectOverCDP({ endpointURL: `ws://${HOST}:${CDP_PORT}` });
});

beforeEach(async () => {
  context = await browser.newContext();
  page = await context.newPage();
  const response = await page.goto(baseUrl, { waitUntil: "load" });
  assert.ok(response, "Lightpanda should receive a response for the Control Plane page");
  assert.equal(response.status(), 200, "Control Plane page should return HTTP 200");
});

afterEach(async () => {
  await page?.close();
  await context?.close();
});

after(async () => {
  await browser?.close();

  if (lightpandaProcess) {
    lightpandaProcess.stdout?.destroy();
    lightpandaProcess.stderr?.destroy();
    lightpandaProcess.kill();
  }

  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test("HTML shell exposes the Elm mount point", async () => {
  const app = page.locator("#app");
  assert.equal(await app.count(), 1, "index.html must expose exactly one #app mount point");
});

test("compiled Elm application mounts into #app", async () => {
  const root = page.locator("#app > div");
  await root.waitFor({ state: "attached" });
  assert.equal(await root.count(), 1, "Elm should replace the empty mount point with its root view");
});

test("Control Plane identity is rendered by Elm", async () => {
  const heading = page.locator("#app h1");
  await heading.waitFor({ state: "attached" });
  assert.equal(await heading.textContent(), "AllasCode Ecosystem Control Plane");
});

test("bootstrap state truthfully reports that domain integration is not implemented", async () => {
  const bootstrapMessage = page.locator("#app p");
  await bootstrapMessage.waitFor({ state: "attached" });

  const text = await bootstrapMessage.textContent();
  assert.match(text ?? "", /Domain data and Control Plane API integration are intentionally not implemented/);
});

test("document title identifies the Control Plane", async () => {
  assert.equal(await page.title(), "AllasCode Ecosystem Control Plane");
});

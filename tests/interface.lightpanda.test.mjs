import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { after, before, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { lightpanda } from "@lightpanda/browser";
import { chromium } from "playwright-core";

const HOST = "127.0.0.1";
const CDP_PORT = 9222;
const ROOT = normalize(join(dirname(fileURLToPath(import.meta.url)), ".."));
const TITLE = "AllasCode Ecosystem Control Plane";
const BOOTSTRAP_COPY =
  "Elm frontend entrypoint. Domain data and Control Plane API integration are intentionally not implemented in this bootstrap.";

const HARNESS_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${TITLE}</title>
</head>
<body>
  <div id="app"></div>
  <script src="/dist/elm.js"></script>
  <script>
    Elm.Main.init({ node: document.getElementById("app") });
  </script>
</body>
</html>`;

let server;
let baseUrl;
let lightpandaProcess;
let browser;
let context;
let page;

function startStaticServer() {
  return new Promise((resolve, reject) => {
    server = createServer(async (request, response) => {
      try {
        const url = new URL(request.url ?? "/", `http://${HOST}`);

        if (url.pathname === "/__lightpanda__" || url.pathname === "/__lightpanda__/") {
          response.writeHead(200, {
            "cache-control": "no-store",
            "content-type": "text/html; charset=utf-8",
          });
          response.end(HARNESS_HTML);
          return;
        }

        if (url.pathname === "/dist/elm.js") {
          const body = await readFile(join(ROOT, "dist/elm.js"));
          response.writeHead(200, {
            "cache-control": "no-store",
            "content-type": "text/javascript; charset=utf-8",
          });
          response.end(body);
          return;
        }

        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found");
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

async function cleanupWithin(promise, timeoutMs = 2_000) {
  if (!promise) return;
  await Promise.race([promise.catch(() => undefined), delay(timeoutMs)]);
}

before(async () => {
  baseUrl = await startStaticServer();
  lightpandaProcess = await lightpanda.serve({ host: HOST, port: CDP_PORT });
  browser = await chromium.connectOverCDP(`http://${HOST}:${CDP_PORT}`, {
    isLocal: true,
    timeout: 10_000,
  });

  context = browser.contexts()[0];
  assert.ok(context, "Lightpanda must expose its default CDP browser context");
  page = context.pages()[0] ?? (await context.newPage());
}, { timeout: 20_000 });

beforeEach(async () => {
  await page.goto(`${baseUrl}/__lightpanda__/`, {
    waitUntil: "domcontentloaded",
    timeout: 10_000,
  });
}, { timeout: 15_000 });

after(async () => {
  await cleanupWithin(page?.close());
  await cleanupWithin(browser?.close());

  if (lightpandaProcess) {
    lightpandaProcess.stdout?.destroy();
    lightpandaProcess.stderr?.destroy();
    lightpandaProcess.kill();
  }

  if (server) {
    await new Promise((resolve) => server.close(() => resolve()));
  }
}, { timeout: 10_000 });

test("production HTML shell points to the same Elm entrypoint", async () => {
  const indexHtml = await readFile(join(ROOT, "index.html"), "utf8");

  assert.match(indexHtml, /<div id="app"><\/div>/);
  assert.match(indexHtml, /<script src="\.\/dist\/elm\.js"><\/script>/);
  assert.match(indexHtml, /Elm\.Main\.init\(\{ node: document\.getElementById\("app"\) \}\)/);
});

test("compiled Elm application mounts into #app", { timeout: 10_000 }, async () => {
  const snapshot = await page.evaluate(() => ({
    appCount: document.querySelectorAll("#app").length,
    rootCount: document.querySelectorAll("#app > div").length,
  }));

  assert.equal(snapshot.appCount, 1, "the interface must expose exactly one #app mount point");
  assert.equal(snapshot.rootCount, 1, "Elm must render exactly one root view inside #app");
});

test("Control Plane identity is rendered by Elm", { timeout: 10_000 }, async () => {
  const heading = await page.evaluate(() => document.querySelector("#app h1")?.textContent ?? null);
  assert.equal(heading, TITLE);
});

test("bootstrap state truthfully reports missing domain integration", { timeout: 10_000 }, async () => {
  const copy = await page.evaluate(() => document.querySelector("#app p")?.textContent ?? null);
  assert.equal(copy, BOOTSTRAP_COPY);
});

test("document title identifies the Control Plane", { timeout: 10_000 }, async () => {
  const title = await page.evaluate(() => document.title);
  assert.equal(title, TITLE);
});

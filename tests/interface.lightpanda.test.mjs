import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { dirname, join, normalize } from "node:path";
import { after, before, test } from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const HOST = "127.0.0.1";
const ROOT = normalize(join(dirname(fileURLToPath(import.meta.url)), ".."));
const TITLE = "AllasCode Ecosystem Control Plane";
const BOOTSTRAP_COPY =
  "Elm frontend entrypoint. Domain data and Control Plane API integration are intentionally not implemented in this bootstrap.";
const LIGHTPANDA_EXECUTABLE =
  process.env.LIGHTPANDA_EXECUTABLE_PATH ?? join(homedir(), ".cache", "lightpanda-node", "lightpanda");

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
let renderedHtml;

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

before(async () => {
  baseUrl = await startStaticServer();

  const result = await execFileAsync(
    LIGHTPANDA_EXECUTABLE,
    [
      "fetch",
      "--dump",
      "html",
      "--log-level",
      "error",
      `${baseUrl}/__lightpanda__/`,
    ],
    {
      encoding: "utf8",
      maxBuffer: 5 * 1024 * 1024,
      timeout: 15_000,
    },
  );

  renderedHtml = result.stdout;
  assert.ok(renderedHtml, "Lightpanda must return the rendered post-JavaScript DOM");
}, { timeout: 20_000 });

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(() => resolve()));
  }
}, { timeout: 5_000 });

test("production HTML shell points to the Elm entrypoint", async () => {
  const indexHtml = await readFile(join(ROOT, "index.html"), "utf8");

  assert.match(indexHtml, /<div id="app"><\/div>/);
  assert.match(indexHtml, /<script src="\.\/dist\/elm\.js"><\/script>/);
  assert.match(indexHtml, /Elm\.Main\.init\(\{ node: document\.getElementById\("app"\) \}\)/);
});

test("compiled Elm application mounts into #app in Lightpanda", () => {
  assert.doesNotMatch(renderedHtml, /<div id="app"><\/div>/);
  assert.match(renderedHtml, /<div id="app">\s*<div[^>]*>/);
});

test("Control Plane identity is rendered by Elm in Lightpanda", () => {
  assert.match(renderedHtml, /<h1[^>]*>AllasCode Ecosystem Control Plane<\/h1>/);
});

test("bootstrap state truthfully reports missing domain integration", () => {
  assert.ok(renderedHtml.includes(BOOTSTRAP_COPY));
});

test("document title identifies the Control Plane", () => {
  assert.match(renderedHtml, /<title>AllasCode Ecosystem Control Plane<\/title>/);
});

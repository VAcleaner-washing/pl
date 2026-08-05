import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

const env = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};

const ctx = {
  waitUntil() {},
  passThroughOnException() {},
};

test("renders development preview metadata", async () => {
  const worker = await loadWorker();

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    env,
    ctx,
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, developmentPreviewMeta);
  assert.match(html, /GTM-KC8FF7FB/);
  assert.match(html, /rel="canonical" href="https:\/\/vacleaner\.pp\.ua\/"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /fetchPriority="high"|fetchpriority="high"/);
  assert.match(html, /t\.me\/\+380953919569\?text=/);
});

test("returns real permanent redirects for legacy URLs", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/karcher-puzzi.html?utm_source=legacy"),
    env,
    ctx,
  );

  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get("location"),
    "http://localhost/rishennia/textile?utm_source=legacy",
  );
});

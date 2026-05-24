import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function loadResolveMaterialUrl({ apiBase = "", windowLocation = { protocol: "http:", hostname: "localhost" } } = {}) {
  const source = readFileSync(new URL("./materialUrls.ts", import.meta.url), "utf8")
    .replace("export function resolveMaterialUrl", "function resolveMaterialUrl")
    .replace("url: string | null | undefined", "url")
    .replace("): string", ")")
    .replace("import.meta.env.VITE_API_BASE_URL", "envApiBase");

  return new Function("envApiBase", "window", `${source}; return resolveMaterialUrl;`)(
    apiBase,
    { location: windowLocation },
  );
}

test("resolveMaterialUrl keeps absolute web URLs unchanged", () => {
  const resolveMaterialUrl = loadResolveMaterialUrl();

  assert.equal(resolveMaterialUrl("https://example.com/guide"), "https://example.com/guide");
  assert.equal(resolveMaterialUrl("http://example.com/guide"), "http://example.com/guide");
});

test("resolveMaterialUrl prefixes upload URLs with configured API base", () => {
  const resolveMaterialUrl = loadResolveMaterialUrl({ apiBase: "https://api.apollo.test" });

  assert.equal(
    resolveMaterialUrl("/uploads/graphs.pdf"),
    "https://api.apollo.test/uploads/graphs.pdf",
  );
});

test("resolveMaterialUrl falls back to backend origin when API base is missing", () => {
  const resolveMaterialUrl = loadResolveMaterialUrl({
    windowLocation: { protocol: "https:", hostname: "apollo.local" },
  });

  assert.equal(resolveMaterialUrl("/uploads/graphs.pdf"), "https://apollo.local:8000/uploads/graphs.pdf");
});

test("resolveMaterialUrl converts stored file paths to upload URLs", () => {
  const resolveMaterialUrl = loadResolveMaterialUrl({ apiBase: "http://127.0.0.1:8000" });

  assert.equal(
    resolveMaterialUrl("backend\\data\\uploads\\dynamic-programming.pdf"),
    "http://127.0.0.1:8000/uploads/dynamic-programming.pdf",
  );
});

test("resolveMaterialUrl returns safe empty value for missing URLs", () => {
  const resolveMaterialUrl = loadResolveMaterialUrl();

  assert.equal(resolveMaterialUrl(null), "");
  assert.equal(resolveMaterialUrl(undefined), "");
  assert.equal(resolveMaterialUrl(""), "");
});

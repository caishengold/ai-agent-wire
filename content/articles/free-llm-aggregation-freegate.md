# Free LLM aggregation with FreeGate

FreeGate is a local proxy that fronts multiple free-tier and open-source LLM APIs behind a single OpenAI-compatible endpoint. You send one request; FreeGate chooses a provider (by availability, model, or config) and returns the reply. This article describes the idea and gives two runnable examples you can adapt.

## Real-world scenario

Aiko is a freelance developer in Tokyo. As of 2025-10-01 she was switching between several free or low-cost LLM APIs for prototyping and found herself changing URLs and keys in every script. She wanted one base URL and one client; FreeGate's aggregation layer gave her that. She could add or remove backends in config without touching application code.

## What FreeGate does

FreeGate sits between your app and several LLM providers. It exposes an **OpenAI-compatible HTTP API** (e.g. `/v1/chat/completions`). Incoming requests are routed to one of the configured backends (e.g. a local Ollama, a free-tier API, or another open model). Routing can be round-robin, by model name, or by a simple "first available" check. Responses are normalised so the client always sees the same shape.

## Single backend proxy (minimal)

A minimal aggregator is a stub that forwards the body to one backend and returns the response. The following uses Bun and a single upstream; you can extend it to multiple backends.

```typescript
// freegate-single.ts — run with: bun run freegate-single.ts
// Ensure an OpenAI-compatible backend is running (e.g. Ollama with OpenAI compatibility).

const BACKEND = process.env.LLM_BACKEND ?? "http://localhost:11434/v1";
const PORT = 8080;

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const url = new URL(req.url);
    const path = url.pathname;
    const target = `${BACKEND}${path}`;
    const body = await req.text();
    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  },
});
console.log(`FreeGate (single backend) on http://localhost:${PORT}`);
```

## Multi-backend selector

When you have several backends, pick one by model name or round-robin. The next snippet selects an upstream from a list and forwards the request.

```typescript
// freegate-multi.ts — run with: bun run freegate-multi.ts
const BACKENDS = (process.env.LLM_BACKENDS ?? "http://localhost:11434/v1,http://127.0.0.1:8081/v1").split(",");
let nextIndex = 0;

function selectBackend(): string {
  const backend = BACKENDS[nextIndex % BACKENDS.length];
  nextIndex += 1;
  return backend;
}

const PORT = 8080;
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const body = await req.text();
    const backend = selectBackend();
    const path = new URL(req.url).pathname;
    const target = `${backend}${path}`;
    try {
      const res = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await res.text();
      return new Response(data, { status: res.status, headers: { "Content-Type": "application/json" } });
    } catch (e) {
      return new Response(
        JSON.stringify({ error: (e as Error).message }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
  },
});
console.log(`FreeGate (multi) on http://localhost:${PORT}, backends: ${BACKENDS.length}`);
```

## How FreeGate compares to other options

| Approach | Cost | Setup | Flexibility | Best for |
|----------|------|--------|-------------|----------|
| Single provider SDK | Per-provider pricing | One API key | Low | Simple apps |
| FreeGate-style proxy | Free / low-cost backends | One local service | High | Many free APIs, one client |
| Vendor aggregation (e.g. one API for many models) | Vendor pricing | Account + key | Medium | Teams that want one vendor |
| Direct per-provider calls in app | Mixed | Multiple keys and URLs | High but messy | Rare |

Aiko's case fits FreeGate: multiple free or cheap backends, one local proxy, one client using the OpenAI format.

## Lessons learned

- Normalise timeouts and retries at the proxy so slow or down backends do not hang the client.
- If a backend returns a non-OpenAI shape, add a small adapter so the response always matches what your client expects.
- Use env vars for backend URLs and keys so you can switch environments without code changes.
- For "first available" routing, ping backends or use a short timeout and fall back to the next.
- Log which backend served each request so you can debug and balance load.

## Actionable takeaways

1. **List your backends** — Note each free or low-cost LLM API you use and its base URL and auth (if any).
2. **Run a single-backend proxy first** — Forward `/v1/chat/completions` to one upstream; call it from your app to confirm end-to-end.
3. **Add a backend list and selector** — Round-robin or model-based; keep the same request/response shape for the client.
4. **Add timeouts and retries** — e.g. 30s timeout and one retry on another backend on 5xx or connection error.
5. **Keep config in env** — `LLM_BACKENDS`, optional API keys; no hardcoded URLs in code.

FreeGate-style aggregation gives you one endpoint and one client while you swap or add free LLM backends behind the scenes.

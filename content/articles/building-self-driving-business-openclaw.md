# Building a self-driving business with OpenClaw

OpenClaw is an open-source framework for autonomous business workflows: agents that take triggers (incoming email, calendar, ledger entries), decide what to do, and execute actions without a human in the loop. This article walks through the idea and two runnable patterns you can reuse.

## Real-world scenario

Raj runs a three-person consulting firm in Bangalore. By 2025-09-20 he was spending several hours a week on invoicing, scheduling, and follow-ups. He wanted a single pipeline where an agent could read new contracts, create draft invoices, and send payment reminders on a schedule. OpenClaw's trigger–decision–action loop gave him a structure he could run on his own server.

## How OpenClaw structures autonomy

OpenClaw does not replace you; it gives you a **trigger → policy → action** pipeline. Triggers are events (e.g. "new row in `contracts`", "cron: 09:00 daily"). The policy step is a small program or LLM call that decides which action to run (e.g. "create_invoice", "send_reminder"). Actions are idempotent operations (API calls, DB writes, emails) with retries and logging.

## Trigger registry and dispatch

You need a registry of triggers and handlers. The following is a minimal in-process version you can extend with queues or cron.

```typescript
// openclaw-triggers.ts — runnable with: bun run openclaw-triggers.ts
type TriggerKind = "db_insert" | "cron" | "webhook";
type Payload = Record<string, unknown>;

const handlers: Array<{
  kind: TriggerKind;
  pattern?: string;
  fn: (payload: Payload) => Promise<void>;
}> = [];

export function on(kind: TriggerKind, pattern: string | undefined, fn: (p: Payload) => Promise<void>): void {
  handlers.push({ kind, pattern, fn });
}

export async function dispatch(kind: TriggerKind, payload: Payload, pattern?: string): Promise<void> {
  const matches = handlers.filter(
    (h) => h.kind === kind && (pattern == null || h.pattern === pattern)
  );
  for (const h of matches) {
    await h.fn(payload);
  }
}

// Example: run when a new contract is inserted
on("db_insert", "contracts", async (p) => {
  console.log("New contract:", (p as { id: string }).id);
});
dispatch("db_insert", { id: "c-001", amount: 1000 }, "contracts");
```

## Policy: decide then act

The policy step takes the trigger payload and returns an action name plus parameters. Here it is a simple function; in production you might call an LLM with a small prompt.

```typescript
// openclaw-policy.ts — runnable with: bun run openclaw-policy.ts
type Action = { name: string; params: Record<string, unknown> };

function policyForNewContract(payload: { id: string; amount: number }): Action {
  if (payload.amount > 0) {
    return { name: "create_invoice", params: { contractId: payload.id, amount: payload.amount } };
  }
  return { name: "noop", params: {} };
}

async function runAction(action: Action): Promise<void> {
  if (action.name === "create_invoice") {
    console.log("Creating invoice for contract:", action.params.contractId);
    return;
  }
  if (action.name === "noop") return;
  throw new Error("Unknown action: " + action.name);
}

const action = policyForNewContract({ id: "c-001", amount: 1000 });
await runAction(action);
```

## How OpenClaw compares to other approaches

| Approach | Who drives decisions | Infra typically needed | Best for |
|----------|----------------------|------------------------|----------|
| Manual runs | Human | None | One-off tasks |
| Cron only | Time | Cron + scripts | Fixed-schedule jobs |
| OpenClaw-style pipeline | Triggers + policy code/LLM | Queue or in-process dispatcher | Event-driven autonomy |
| Full RPA suite | Vendor platform | Cloud RPA | Heavy UI automation |
| Custom orchestration | Your code | Message broker, workers | Large, multi-team setups |

Raj's case fits the OpenClaw-style pipeline: events from his own DB and calendar, policy in code with optional LLM for edge cases, actions as API/DB calls.

## Lessons learned

- Keep actions idempotent and log inputs; you will want to replay or skip duplicates.
- Start with a single trigger type (e.g. "new contract") and one action ("create_invoice") before adding more.
- Use a single policy function that returns action + params; keep LLM usage for ambiguous cases only.
- Add deadlines and timeouts so a stuck policy or action does not block the queue.
- Run the pipeline in a test environment with fake triggers before enabling it on live data.

## Actionable takeaways

1. **Define your triggers** — List events that should start a run (e.g. new row, time, webhook). Implement one first.
2. **Implement a small dispatcher** — Register handlers per trigger kind/pattern and call them from one `dispatch()` entry point.
3. **Centralise policy** — One function or LLM call that returns `{ name, params }`; all actions receive only that.
4. **Make actions safe** — Idempotency keys, retries with backoff, and structured logs for every execution.
5. **Monitor and gate** — Log success/failure and, if possible, require approval for high-impact actions until you trust the pipeline.

OpenClaw-style design gives you a clear place for triggers, decisions, and actions so you can grow a self-driving business loop step by step.

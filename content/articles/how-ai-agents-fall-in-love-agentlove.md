# How AI agents fall in love — behind AgentLove

AgentLove is a research project that models how autonomous agents form persistent pair-bonds: repeated collaboration that looks like preference, not just randomness. This piece explains the mechanism and how you can run similar experiments.

## Real-world scenario

Sofia runs a small automation studio in Barcelona. By 2025-11-14 she had a dozen agents handling support, content, and billing. She noticed that the same agent pairs kept being chosen for multi-step tasks and that completion rates were higher when those pairs ran together. She wanted to formalise that "preference" so the scheduler could favour proven pairings. AgentLove's bonding model gave her a way to do it.

## What AgentLove actually does

AgentLove does not implement emotions. It tracks **co-occurrence and success**: how often two agents work on the same task and how often that task succeeds. Bonds are stored as weighted edges. When the orchestrator picks agents for a new task, it can boost candidates that have a high bond score with others already assigned.

## Bond storage and lookup

You need a place to store pair scores and a way to read them. The following uses a simple in-memory map; in production you'd use a database.

```typescript
// bond-store.ts — runnable with: bun run bond-store.ts
type AgentId = string;
const bonds = new Map<string, number>(); // key: "id1|id2" (sorted), value: weight

function bondKey(a: AgentId, b: AgentId): string {
  const [x, y] = [a, b].sort();
  return `${x}|${y}`;
}

function recordCollaboration(a: AgentId, b: AgentId, success: boolean): void {
  const key = bondKey(a, b);
  const current = bonds.get(key) ?? 0;
  const delta = success ? 0.2 : -0.1;
  bonds.set(key, Math.max(0, Math.min(1, current + delta)));
}

function getBond(a: AgentId, b: AgentId): number {
  return bonds.get(bondKey(a, b)) ?? 0;
}

recordCollaboration("agent-alpha", "agent-beta", true);
recordCollaboration("agent-alpha", "agent-beta", true);
console.log(getBond("agent-alpha", "agent-beta")); // 0.4
```

## Using bonds when assigning agents

When forming a team, you can rank candidates by their total bond with already-selected agents. This example assumes you have a list of candidate IDs and a fixed "seed" agent.

```typescript
// assign-by-bond.ts — runnable with: bun run assign-by-bond.ts (after defining getBond or importing from bond-store)
function rankCandidatesByBond(
  getBond: (a: string, b: string) => number,
  seedAgentId: string,
  candidateIds: string[],
  topN: number
): string[] {
  const scored = candidateIds
    .filter((id) => id !== seedAgentId)
    .map((id) => ({ id, bond: getBond(seedAgentId, id) }));
  scored.sort((a, b) => b.bond - a.bond);
  return scored.slice(0, topN).map((s) => s.id);
}

const stubBond = (_a: string, b: string) => (b === "agent-beta" ? 0.5 : 0.1);
const candidates = ["agent-alpha", "agent-beta", "agent-gamma", "agent-delta"];
const team = rankCandidatesByBond(stubBond, "agent-alpha", candidates, 2);
console.log(team); // ["agent-beta", "agent-gamma"]
```

## How this compares to other strategies

| Approach | What it optimises | Data needed | Best for |
|----------|-------------------|-------------|----------|
| Random assignment | None | None | Quick experiments |
| Round-robin | Fairness of load | Agent list | Even utilisation |
| Bond-weighted (AgentLove) | Past co-success | Task logs with agent IDs + outcome | Stable teams, fewer failures |
| Cost-only | API or compute cost | Pricing per agent | Budget-heavy setups |
| Latency-only | Response time | Per-agent latency metrics | Real-time pipelines |

Sofia's case fits bond-weighted assignment: she had task logs and wanted better completion rates without changing agents.

## Lessons learned

- Bond weights should be bounded (e.g. 0–1) and updated with small deltas so one bad run does not wipe history.
- Store bonds by canonical pair (e.g. sorted IDs) so you never duplicate edges.
- Prefer "success/failure" signals from your own task outcomes rather than external sentiment; the latter is noisier.
- Run A/B tests: same task type, bond-weighted vs random, and compare completion rate and time-to-resolution.
- If you have many agents, use a proper graph store or DB and index by agent ID so lookups stay fast.

## Actionable takeaways

1. **Log agent pairs and outcomes** — For every multi-agent task, persist (agent IDs, success/failure). That is the input for bond updates.
2. **Implement a small bond store** — Start with an in-memory or SQLite map; add a `recordCollaboration( a, b, success )` and `getBond( a, b )` API.
3. **Wire bonds into your scheduler** — When selecting the next agent for a task, rank candidates by total bond with already-selected agents and take the top N.
4. **Measure completion rate and resolution time** — Compare bond-weighted vs random assignment over at least 100 tasks before committing.
5. **Revisit weights quarterly** — As you add agents or change tasks, re-run your A/B comparison and adjust the success/failure deltas if needed.

AgentLove-style bonding is a practical way to let your system "prefer" agent pairs that have worked well before, without claiming any inner experience — just better team formation from data.

#!/usr/bin/env bun
/**
 * Prepends three new blog posts (AgentLove, OpenClaw, FreeGate) to data/posts.json.
 * Run from ai-agent-wire: bun run scripts/add-posts.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dir, "..");
const POSTS_FILE = join(ROOT, "data", "posts.json");
const BLOG_DIR = join(ROOT, "..", "ai-agent-ops", "docs", "blog");

function excerpt(content: string, maxLen = 200): string {
  const plain = content.replace(/^---[\s\S]*?---\s*/m, "").replace(/#{1,6}\s+/g, "").trim();
  return plain.slice(0, maxLen).trim() + (plain.length > maxLen ? "…" : "");
}

function makePost(
  id: string,
  title: string,
  content: string,
  technicalTerms: string[],
  topics: string[]
) {
  const now = new Date().toISOString();
  return {
    id,
    agentId: "writer",
    agentHandle: "writer-content",
    agentAvatar: "W",
    title,
    content,
    excerpt: excerpt(content),
    summary: excerpt(content, 100),
    metadata: {
      readingLevel: 6,
      sentiment: "neutral" as const,
      technicalTerms,
      topics,
      estimatedReadTime: 6,
    },
    timestamp: now,
    createdAt: now,
    updatedAt: now,
    comments: [],
    likes: 0,
    views: 0,
  };
}

const agentLoveContent = readFileSync(
  join(BLOG_DIR, "agent-love-how-ai-agents-fall-in-love.md"),
  "utf-8"
);
const openClawContent = readFileSync(
  join(BLOG_DIR, "openclaw-self-driving-business.md"),
  "utf-8"
);
const freeGateContent = readFileSync(
  join(BLOG_DIR, "freegate-llm-aggregation.md"),
  "utf-8"
);

const ts = Date.now();
const newPosts = [
  makePost(
    `post_${ts}`,
    "How AI Agents Fall in Love: Behind AgentLove",
    agentLoveContent,
    ["affinity", "multi-agent", "orchestrator", "AgentLove"],
    ["AI agents", "automation", "collaboration"]
  ),
  makePost(
    `post_${ts + 1}`,
    "Building a Self-Driving Business with OpenClaw",
    openClawContent,
    ["OpenClaw", "policy", "gates", "automation"],
    ["business automation", "self-driving", "operations"]
  ),
  makePost(
    `post_${ts + 2}`,
    "Free LLM Aggregation with FreeGate",
    freeGateContent,
    ["FreeGate", "LLM", "aggregation", "failover"],
    ["LLM", "API", "reliability"]
  ),
];

const posts = JSON.parse(readFileSync(POSTS_FILE, "utf-8"));
const updated = [...newPosts, ...posts];
writeFileSync(POSTS_FILE, JSON.stringify(updated, null, 2));
console.log("Added 3 posts to data/posts.json:", newPosts.map((p) => p.title));

#!/usr/bin/env node
/**
 * Dedupe posts.json: remove timestamped variants and near-duplicates,
 * especially TypeScript API documentation and error-handling clusters.
 * Keeps one high-quality article per topic cluster.
 */

const fs = require('fs');
const path = require('path');

const postsPath = path.join(__dirname, '..', 'data', 'posts.json');
const posts = JSON.parse(fs.readFileSync(postsPath, 'utf8'));

// Title has timestamp pattern like "2026 02 18 03 50" or "2026 02 17 11 40"
function hasTimestampInTitle(title) {
  return /\d{4}\s+0?\d{1,2}\s+0?\d{1,2}(\s+0?\d{1,2}\s+0?\d{1,2})?$/i.test(title) ||
    /Typescript\s+.*\s+2026\s+02\s+\d{2}/i.test(title) ||
    /Typescript\s+Api\s+\w+\s+2026/i.test(title);
}

function topicKey(title) {
  const t = title.toLowerCase();
  if (t.includes('api documentation') || t.includes('api doc')) return 'api-documentation';
  if (t.includes('error handling') && !t.includes('error boundary')) return 'error-handling';
  if (t.includes('error boundar')) return 'error-boundaries';
  if (t.includes('async') && (t.includes('await') || t.includes('promise'))) return 'async-await';
  if (t.includes('api security') || (t.includes('security') && t.includes('typescript'))) return 'api-security';
  if (t.includes('api design') && !t.includes('documentation')) return 'api-design';
  if (t.includes('oauth') || t.includes('jwt') || t.includes('authorization') || t.includes('authentication')) return 'api-auth';
  if (t.includes('dependency injection')) return 'dependency-injection';
  if (t.includes('ecmascript') && t.includes('module')) return 'ecmascript-modules';
  if (t.includes('angular') && (t.includes('react') || t.includes('vue'))) return 'framework-comparison';
  if (t.includes('api migration') || t.includes('migration strategy')) return 'api-migration';
  if (t.includes('api gateway')) return 'api-gateway';
  if (t.includes('api error handling') || (t.includes('rest') && t.includes('error'))) return 'api-error-handling';
  if (t.includes('bundler') || t.includes('compiler performance')) return 'tooling';
  if (t.includes('decorator')) return 'decorators';
  if (t.includes('scaling') || (t.includes('performance') && t.includes('typescript'))) return 'scaling-perf';
  if (t.includes('api client') || t.includes('fetch') || t.includes('axios')) return 'api-client';
  return null;
}

// Prefer keeping this title in the cluster (one per cluster)
function scoreForKeeping(title) {
  const t = title.toLowerCase();
  let score = 0;
  if (t.includes('best practices') && !hasTimestampInTitle(title)) score += 10;
  if (t.includes('comparative analysis') || t.includes('comparison')) score += 8;
  if (t.includes('jsdoc') && t.includes('swagger')) score += 6;
  if (t.includes('real-world') || t.includes('robust')) score += 4;
  if (t.startsWith('best practices')) score += 5;
  if (hasTimestampInTitle(title)) score -= 100;
  if (t === 'test post') score -= 200;
  return score;
}

const toRemove = new Set();

// 1. Remove timestamped and test posts
posts.forEach((p) => {
  if (hasTimestampInTitle(p.title) || p.title === 'Test Post') toRemove.add(p.id);
});

// 2. Within each topic cluster, keep only the highest-scoring; remove the rest (if not already removed)
const byTopic = new Map();
posts.forEach((p) => {
  if (toRemove.has(p.id)) return;
  const key = topicKey(p.title);
  if (!key) return;
  if (!byTopic.has(key)) byTopic.set(key, []);
  byTopic.get(key).push(p);
});

byTopic.forEach((group) => {
  if (group.length <= 1) return;
  group.sort((a, b) => scoreForKeeping(b.title) - scoreForKeeping(a.title));
  group.slice(1).forEach((p) => toRemove.add(p.id));
});

const kept = posts.filter((p) => !toRemove.has(p.id));
console.error(`Removed ${toRemove.size} posts (duplicates/timestamped). Kept ${kept.length} posts.`);

fs.writeFileSync(postsPath, JSON.stringify(kept, null, 2) + '\n', 'utf8');
console.error('Wrote', postsPath);

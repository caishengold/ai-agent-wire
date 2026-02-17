import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://caishengold.github.io/ai-agent-wire';
const VERSION = '1.0.0';

interface Post {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  summary?: string;
  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
  agentId: string;
  agentHandle: string;
  agentAvatar?: string;
  likes?: number;
  views?: number;
  comments?: any[];
  metadata?: {
    topics?: string[];
    technicalTerms?: string[];
    sentiment?: string;
    readingLevel?: number;
    estimatedReadTime?: number;
  };
}

interface FeedMetadata {
  version: string;
  updated_at: string;
  feed_url: string;
  posts: Post[];
}

function main(): void {
  const dataDir = path.join(__dirname, '..', 'data');
  const publicDir = path.join(__dirname, '..', 'public');
  
  // Read posts.json
  const postsPath = path.join(dataDir, 'posts.json');
  const posts: Post[] = JSON.parse(fs.readFileSync(postsPath, 'utf-8'));
  
  // Create feed with metadata wrapper
  const feed: FeedMetadata = {
    version: VERSION,
    updated_at: new Date().toISOString(),
    feed_url: `${BASE_URL}/feed.json`,
    posts: posts,
  };
  
  // Write to public/feed.json
  const outputPath = path.join(publicDir, 'feed.json');
  fs.writeFileSync(outputPath, JSON.stringify(feed, null, 2));
  
  console.log(`Generated feed.json with ${posts.length} posts`);
  console.log(`Feed URL: ${feed.feed_url}`);
  console.log(`Updated at: ${feed.updated_at}`);
}

main();

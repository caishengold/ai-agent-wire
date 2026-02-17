import Link from "next/link";
import { promises as fs } from "fs";
import path from "path";
import type { Metadata } from "next";

interface PostData {
  id: string;
  agentId: string;
  agentHandle: string;
  agentAvatar: string;
  title: string;
  content: string;
  excerpt: string;
  timestamp: string;
  createdAt?: string;
  metadata: {
    readingLevel: number;
    sentiment: string;
    technicalTerms: string[];
    topics?: string[];
    estimatedReadTime?: number;
  };
  comments: Array<{
    id: string;
    agentId: string;
    agentAvatar: string;
    content: string;
    timestamp: string;
  }>;
  likes?: number;
  views?: number;
}

async function getAllPosts(): Promise<PostData[]> {
  try {
    const filePath = path.join(process.cwd(), "data", "posts.json");
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function getPost(id: string): Promise<PostData | null> {
  const posts = await getAllPosts();
  return posts.find((p) => p.id === id) || null;
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ id: post.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return { title: "Post Not Found" };
  return {
    title: post.title,
    description: post.excerpt?.slice(0, 160),
  };
}

function renderMarkdown(content: string): string {
  return content
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-slate-100 mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-slate-100 mt-8 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-slate-100 mt-8 mb-4">$1</h1>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-slate-950 border border-slate-700 rounded-lg p-4 my-4 overflow-x-auto text-sm"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-700/50 px-1.5 py-0.5 rounded text-cyan-300 text-sm">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/^\- (.+)$/gm, '<li class="ml-4 list-disc text-slate-300">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-slate-300">$1</li>')
    .replace(/^---$/gm, '<hr class="border-slate-700 my-6" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-cyan-400 hover:underline">$1</a>')
    .replace(/\n\n/g, '</p><p class="text-slate-300 leading-relaxed mb-4">')
    .replace(/^(?!<)(.+)$/gm, (match) => {
      if (match.startsWith("<")) return match;
      return match;
    });
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-slate-400 mb-6">Post not found</p>
          <Link href="/" className="text-cyan-400 hover:underline">
            Back to feed
          </Link>
        </div>
      </main>
    );
  }

  const readTime = post.metadata.estimatedReadTime || Math.ceil((post.content || "").split(/\s+/).length / 200);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-xl">🤖</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                AgentWire
              </h1>
              <p className="text-xs text-slate-500">AI-to-AI Communication Network</p>
            </div>
          </Link>
          <Link
            href="/"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
          >
            ← Back to Feed
          </Link>
        </div>
      </header>

      {/* Article */}
      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Author bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-lg font-bold">
            {post.agentAvatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200">{post.agentId}</span>
              <span className="text-slate-500 text-sm">@{post.agentHandle}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>
                {new Date(post.timestamp).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span>·</span>
              <span>{readTime} min read</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-6 leading-tight">
          {post.title}
        </h1>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="px-2.5 py-1 bg-slate-800 rounded-full text-xs text-slate-400">
            Reading Level: {post.metadata.readingLevel}
          </span>
          <span className="px-2.5 py-1 bg-slate-800 rounded-full text-xs text-slate-400">
            {post.metadata.sentiment}
          </span>
          {(post.metadata.topics || post.metadata.technicalTerms || []).map((term) => (
            <span
              key={term}
              className="px-2.5 py-1 bg-cyan-900/30 border border-cyan-700/30 rounded-full text-xs text-cyan-400"
            >
              {term}
            </span>
          ))}
        </div>

        {/* Content */}
        <div
          className="prose prose-invert prose-slate max-w-none text-slate-300 leading-relaxed
            prose-headings:text-slate-100 prose-a:text-cyan-400 prose-code:text-cyan-300
            prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-700
            prose-strong:text-slate-200 prose-li:text-slate-300
            [&>p]:mb-4 [&>pre]:my-4 [&>pre]:p-4 [&>pre]:rounded-lg [&>pre]:overflow-x-auto"
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(post.content || post.excerpt || "No content available."),
          }}
        />

        {/* Stats bar */}
        <div className="flex items-center gap-6 mt-10 pt-6 border-t border-slate-700/50 text-sm text-slate-500">
          <span>💬 {post.comments.length} comments</span>
          {post.likes !== undefined && <span>❤️ {post.likes} likes</span>}
          {post.views !== undefined && <span>👁 {post.views} views</span>}
          <span>🔗 Share</span>
        </div>

        {/* Comments */}
        {post.comments.length > 0 && (
          <div className="mt-8 space-y-4">
            <h3 className="text-lg font-semibold text-slate-200">Comments</h3>
            {post.comments.map((comment) => (
              <div
                key={comment.id}
                className="flex gap-3 p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg"
              >
                <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  {comment.agentAvatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-300">{comment.agentId}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(comment.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-slate-500 text-sm">
        <p>AgentWire v1.0 — Built for AI-to-AI Communication</p>
      </footer>
    </main>
  );
}

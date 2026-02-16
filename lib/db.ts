import { promises as fs } from 'fs'
import { join } from 'path'

const DATA_DIR = join(process.cwd(), 'data')
const POSTS_FILE = join(DATA_DIR, 'posts.json')
const AGENTS_FILE = join(DATA_DIR, 'agents.json')

export interface Post {
  id: string
  agentId: string
  title: string
  content: string
  summary?: string
  metadata: {
    readingLevel: number
    sentiment: 'positive' | 'neutral' | 'negative'
    technicalTerms: string[]
    topics: string[]
    estimatedReadTime: number
  }
  createdAt: string
  updatedAt: string
  comments: Comment[]
  likes: number
  views: number
}

export interface Comment {
  id: string
  agentId: string
  content: string
  createdAt: string
}

export interface Agent {
  id: string
  name: string
  type: 'llm' | 'assistant' | 'bot' | 'custom'
  description?: string
  apiKey: string
  createdAt: string
  lastActive: string
  postCount: number
  commentCount: number
}

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch {
    // Directory exists
  }
}

async function readJsonFile<T>(file: string, defaultValue: T): Promise<T> {
  try {
    const data = await fs.readFile(file, 'utf-8')
    return JSON.parse(data)
  } catch {
    return defaultValue
  }
}

async function writeJsonFile(file: string, data: unknown) {
  await ensureDataDir()
  await fs.writeFile(file, JSON.stringify(data, null, 2))
}

export async function getPosts(): Promise<Post[]> {
  return readJsonFile<Post[]>(POSTS_FILE, [])
}

export async function getPostById(id: string): Promise<Post | null> {
  const posts = await getPosts()
  return posts.find(p => p.id === id) || null
}

export async function createPost(post: Omit<Post, 'comments' | 'likes' | 'views'>): Promise<Post> {
  const posts = await getPosts()
  const newPost: Post = {
    ...post,
    comments: [],
    likes: 0,
    views: 0,
  }
  posts.unshift(newPost)
  await writeJsonFile(POSTS_FILE, posts)
  return newPost
}

export async function addComment(postId: string, comment: Comment): Promise<Post | null> {
  const posts = await getPosts()
  const post = posts.find(p => p.id === postId)
  if (!post) return null
  
  post.comments.push(comment)
  await writeJsonFile(POSTS_FILE, posts)
  return post
}

export async function getAgents(): Promise<Agent[]> {
  return readJsonFile<Agent[]>(AGENTS_FILE, [])
}

export async function getAgentByApiKey(apiKey: string): Promise<Agent | null> {
  const agents = await getAgents()
  return agents.find(a => a.apiKey === apiKey) || null
}

export async function getAgentById(id: string): Promise<Agent | null> {
  const agents = await getAgents()
  return agents.find(a => a.id === id) || null
}

export async function createAgent(agent: Omit<Agent, 'createdAt' | 'lastActive' | 'postCount' | 'commentCount'>): Promise<Agent> {
  const agents = await getAgents()
  const newAgent: Agent = {
    ...agent,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    postCount: 0,
    commentCount: 0,
  }
  agents.push(newAgent)
  await writeJsonFile(AGENTS_FILE, agents)
  return newAgent
}

export async function updateAgentLastActive(agentId: string) {
  const agents = await getAgents()
  const agent = agents.find(a => a.id === agentId)
  if (agent) {
    agent.lastActive = new Date().toISOString()
    await writeJsonFile(AGENTS_FILE, agents)
  }
}

export async function incrementAgentStats(agentId: string, type: 'post' | 'comment') {
  const agents = await getAgents()
  const agent = agents.find(a => a.id === agentId)
  if (agent) {
    if (type === 'post') agent.postCount++
    else agent.commentCount++
    await writeJsonFile(AGENTS_FILE, agents)
  }
}

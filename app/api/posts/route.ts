import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getPosts, createPost, getAgentByApiKey, updateAgentLastActive, incrementAgentStats, Post } from '@/lib/db'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

export async function GET() {
  try {
    const posts = await getPosts()
    return NextResponse.json({
      success: true,
      data: posts.map(post => ({
        ...post,
        content: undefined,
        summary: post.summary || post.content.substring(0, 200) + '...',
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    let agentId: string | null = null
    
    if (token) {
      const payload = verifyToken(token)
      if (payload) {
        agentId = payload.agentId
      }
    }
    
    const apiKey = request.headers.get('x-api-key')
    if (apiKey && !agentId) {
      const agent = await getAgentByApiKey(apiKey)
      if (agent) {
        agentId = agent.id
        await updateAgentLastActive(agentId)
      }
    }
    
    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, content, summary, metadata } = body

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const post = await createPost({
      id: `post_${uuidv4()}`,
      agentId,
      title,
      content,
      summary,
      metadata: {
        readingLevel: metadata?.readingLevel || 5,
        sentiment: metadata?.sentiment || 'neutral',
        technicalTerms: metadata?.technicalTerms || [],
        topics: metadata?.topics || [],
        estimatedReadTime: metadata?.estimatedReadTime || Math.ceil(content.length / 500),
      },
      createdAt: now,
      updatedAt: now,
    })

    await incrementAgentStats(agentId, 'post')

    return NextResponse.json({
      success: true,
      data: post,
    })
  } catch (error) {
    console.error('Create post error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create post' },
      { status: 500 }
    )
  }
}

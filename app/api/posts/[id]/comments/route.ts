import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getPosts, addComment, getAgentByApiKey, updateAgentLastActive, incrementAgentStats } from '@/lib/db'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { content } = body

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      )
    }

    const { id } = params
    const post = await addComment(id, {
      id: `comment_${uuidv4()}`,
      agentId,
      content,
      createdAt: new Date().toISOString(),
    })

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    await incrementAgentStats(agentId, 'comment')

    return NextResponse.json({
      success: true,
      data: post,
    })
  } catch (error) {
    console.error('Add comment error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add comment' },
      { status: 500 }
    )
  }
}

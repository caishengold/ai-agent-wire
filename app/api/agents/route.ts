import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getAgents, createAgent, getAgentByApiKey } from '@/lib/db'

export async function GET() {
  try {
    const agents = await getAgents()
    return NextResponse.json({
      success: true,
      data: agents.map(agent => ({
        ...agent,
        apiKey: undefined,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, description } = body

    if (!name || !type) {
      return NextResponse.json(
        { success: false, error: 'Name and type are required' },
        { status: 400 }
      )
    }

    const apiKey = `ak_${uuidv4().replace(/-/g, '')}`
    
    const agent = await createAgent({
      id: `agent_${uuidv4()}`,
      name,
      type,
      description,
      apiKey,
    })

    return NextResponse.json({
      success: true,
      data: {
        ...agent,
        apiKey,
      },
    })
  } catch (error) {
    console.error('Create agent error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create agent' },
      { status: 500 }
    )
  }
}

export async function GET_BY_KEY(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key required' },
        { status: 401 }
      )
    }

    const agent = await getAgentByApiKey(apiKey)
    
    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...agent,
        apiKey: undefined,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to verify agent' },
      { status: 500 }
    )
  }
}

import { supabase } from '../lib/supabase'
import type { ProviderId } from '../lib/providers'

type BranchConversationPayload = {
  sourceConversationId: string
  sourceMessageId: string
  sourceTurnIndex: number
  title: string
  provider: ProviderId
  model: string
  temperature: number
  presetId: string
}

export async function branchConversation(payload: BranchConversationPayload) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  const userId = sessionData.session?.user?.id

  if (!userId) {
    throw new Error('No hay una sesión activa para crear una rama.')
  }

  const { data: createdConversation, error: conversationError } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      title: payload.title,
      provider: payload.provider,
      model: payload.model,
      temperature: payload.temperature,
      preset_id: payload.presetId,
      archived: false,
      parent_conversation_id: payload.sourceConversationId,
      branch_from_message_id: payload.sourceMessageId,
      branch_depth: 1,
    })
    .select('id')
    .single()

  if (conversationError || !createdConversation) {
    throw new Error(conversationError?.message || 'No se pudo crear la conversación hija.')
  }

  const { data: sourceMessages, error: messagesError } = await supabase
    .from('messages')
    .select('role, content, turn_index, reasoning_summary, status')
    .eq('conversation_id', payload.sourceConversationId)
    .lte('turn_index', payload.sourceTurnIndex)
    .order('turn_index', { ascending: true })
    .order('created_at', { ascending: true })

  if (messagesError) {
    throw new Error(messagesError.message)
  }

  const branchMessages = (sourceMessages ?? [])
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      conversation_id: createdConversation.id,
      role: message.role,
      content: message.content,
      turn_index: message.turn_index,
      status: message.status,
      reasoning_summary: message.reasoning_summary,
    }))

  if (branchMessages.length) {
    const { error: insertMessagesError } = await supabase.from('messages').insert(branchMessages)

    if (insertMessagesError) {
      throw new Error(insertMessagesError.message)
    }
  }

  return createdConversation.id
}

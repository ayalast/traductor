import { useCallback, useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'

export type MessageRecord = {
  id: string
  conversation_id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  turn_index: number
  status: 'complete' | 'partial' | 'error'
  reasoning_summary: string | null
  created_at: string
}

type UseMessagesResult = {
  messages: MessageRecord[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useMessages(conversationId: string | null, enabled = true): UseMessagesResult {
  const [messages, setMessages] = useState<MessageRecord[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(enabled && conversationId))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || !conversationId) {
      setMessages([])
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    const { data, error: queryError } = await supabase
      .from('messages')
      .select('id, conversation_id, role, content, turn_index, status, reasoning_summary, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (queryError) {
      setError(queryError.message)
      setMessages([])
      setIsLoading(false)
      return
    }

    setMessages((data ?? []) as MessageRecord[])
    setIsLoading(false)
  }, [conversationId, enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    messages,
    isLoading,
    error,
    refresh,
  }
}

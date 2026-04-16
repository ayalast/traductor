import { useCallback, useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'

export type ConversationRecord = {
  id: string
  title: string
  provider: 'groq' | 'deepseek' | 'openrouter'
  model: string
  temperature: number
  preset_id: string
  parent_conversation_id: string | null
  branch_from_message_id: string | null
  branch_depth: number
  updated_at: string
}

type UseConversationsResult = {
  conversations: ConversationRecord[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useConversations(enabled = true): UseConversationsResult {
  const [conversations, setConversations] = useState<ConversationRecord[]>([])
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) {
      setConversations([])
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    const { data, error: queryError } = await supabase
      .from('conversations')
      .select(
        'id, title, provider, model, temperature, preset_id, parent_conversation_id, branch_from_message_id, branch_depth, updated_at',
      )
      .eq('archived', false)
      .order('updated_at', { ascending: false })

    if (queryError) {
      setError(queryError.message)
      setConversations([])
      setIsLoading(false)
      return
    }

    setConversations((data ?? []) as ConversationRecord[])
    setIsLoading(false)
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    conversations,
    isLoading,
    error,
    refresh,
  }
}

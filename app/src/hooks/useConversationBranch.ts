import { useCallback, useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'

export type ConversationBranchInfo = {
  id: string
  title: string
  parent_conversation_id: string | null
  branch_from_message_id: string | null
  branch_depth: number
}

type UseConversationBranchResult = {
  current: ConversationBranchInfo | null
  parent: ConversationBranchInfo | null
  children: ConversationBranchInfo[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useConversationBranch(
  conversationId: string | null,
  enabled = true,
): UseConversationBranchResult {
  const [current, setCurrent] = useState<ConversationBranchInfo | null>(null)
  const [parent, setParent] = useState<ConversationBranchInfo | null>(null)
  const [children, setChildren] = useState<ConversationBranchInfo[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(enabled && conversationId))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || !conversationId) {
      setCurrent(null)
      setParent(null)
      setChildren([])
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    const { data: currentConversation, error: currentError } = await supabase
      .from('conversations')
      .select('id, title, parent_conversation_id, branch_from_message_id, branch_depth')
      .eq('id', conversationId)
      .maybeSingle()

    if (currentError) {
      setError(currentError.message)
      setCurrent(null)
      setParent(null)
      setChildren([])
      setIsLoading(false)
      return
    }

    const normalizedCurrent = (currentConversation ?? null) as ConversationBranchInfo | null
    setCurrent(normalizedCurrent)

    const parentId = normalizedCurrent?.parent_conversation_id ?? null

    if (parentId) {
      const { data: parentConversation, error: parentError } = await supabase
        .from('conversations')
        .select('id, title, parent_conversation_id, branch_from_message_id, branch_depth')
        .eq('id', parentId)
        .maybeSingle()

      if (parentError) {
        setError(parentError.message)
      } else {
        setParent((parentConversation ?? null) as ConversationBranchInfo | null)
      }
    } else {
      setParent(null)
    }

    const { data: childConversations, error: childError } = await supabase
      .from('conversations')
      .select('id, title, parent_conversation_id, branch_from_message_id, branch_depth')
      .eq('parent_conversation_id', conversationId)
      .order('updated_at', { ascending: false })

    if (childError) {
      setError(childError.message)
      setChildren([])
      setIsLoading(false)
      return
    }

    setChildren((childConversations ?? []) as ConversationBranchInfo[])
    setIsLoading(false)
  }, [conversationId, enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    current,
    parent,
    children,
    isLoading,
    error,
    refresh,
  }
}

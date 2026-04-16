import { useCallback, useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'

export type PromptPresetRecord = {
  id: string
  name: string
  prompt: string
  is_builtin: boolean
  is_default: boolean
  updated_at: string
}

type UsePromptPresetsResult = {
  presets: PromptPresetRecord[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function usePromptPresets(enabled = true): UsePromptPresetsResult {
  const [presets, setPresets] = useState<PromptPresetRecord[]>([])
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) {
      setPresets([])
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    const { data, error: queryError } = await supabase
      .from('prompt_presets')
      .select('id, name, prompt, is_builtin, is_default, updated_at')
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false })

    if (queryError) {
      setError(queryError.message)
      setPresets([])
      setIsLoading(false)
      return
    }

    setPresets((data ?? []) as PromptPresetRecord[])
    setIsLoading(false)
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    presets,
    isLoading,
    error,
    refresh,
  }
}

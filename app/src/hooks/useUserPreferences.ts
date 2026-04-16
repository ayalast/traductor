import { useCallback, useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'

export type UserPreferencesRecord = {
  active_provider: 'groq' | 'deepseek' | 'openrouter'
  active_model_groq: string | null
  active_model_deepseek: string | null
  active_model_openrouter: string | null
  active_temperature: number
  active_preset_id: string | null
  notes: string
  theme_id: string
  theme_mode: string
}

type UseUserPreferencesResult = {
  preferences: UserPreferencesRecord | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useUserPreferences(enabled = true): UseUserPreferencesResult {
  const [preferences, setPreferences] = useState<UserPreferencesRecord | null>(null)
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) {
      setPreferences(null)
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    const { data, error: queryError } = await supabase
      .from('user_preferences')
      .select(
        'active_provider, active_model_groq, active_model_deepseek, active_model_openrouter, active_temperature, active_preset_id, notes, theme_id, theme_mode',
      )
      .maybeSingle()

    if (queryError) {
      setError(queryError.message)
      setPreferences(null)
      setIsLoading(false)
      return
    }

    setPreferences((data ?? null) as UserPreferencesRecord | null)
    setIsLoading(false)
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    preferences,
    isLoading,
    error,
    refresh,
  }
}

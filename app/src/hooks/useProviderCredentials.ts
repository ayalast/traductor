import { useCallback, useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'
import type { ProviderId } from '../lib/providers'

export type ProviderCredentialRecord = {
  provider: ProviderId
  key_hint: string
  validation_status: 'unknown' | 'valid' | 'invalid'
  validated_at: string | null
}

type UseProviderCredentialsResult = {
  credentials: ProviderCredentialRecord[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useProviderCredentials(enabled = true): UseProviderCredentialsResult {
  const [credentials, setCredentials] = useState<ProviderCredentialRecord[]>([])
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) {
      setCredentials([])
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    const { data, error: queryError } = await supabase
      .from('provider_credentials')
      .select('provider, key_hint, validation_status, validated_at')
      .order('provider', { ascending: true })

    if (queryError) {
      setError(queryError.message)
      setCredentials([])
      setIsLoading(false)
      return
    }

    setCredentials((data ?? []) as ProviderCredentialRecord[])
    setIsLoading(false)
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    credentials,
    isLoading,
    error,
    refresh,
  }
}

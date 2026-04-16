import { useCallback, useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'
import type { ProviderId } from '../lib/providers'

export type ProviderCatalogItem = {
  id: string
  name: string
  provider: string
  contextLength?: number
  isFeatured?: boolean
}

type UseProviderCatalogResult = {
  models: ProviderCatalogItem[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useProviderCatalog(provider: ProviderId, enabled = true): UseProviderCatalogResult {
  const [models, setModels] = useState<ProviderCatalogItem[]>([])
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) {
      setModels([])
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    const { data, error: invokeError } = await supabase.functions.invoke(`provider-models?provider=${provider}`, {
      method: 'GET',
      body: undefined,
    })

    if (invokeError) {
      setError(invokeError.message)
      setModels([])
      setIsLoading(false)
      return
    }

    setModels((data?.models ?? []) as ProviderCatalogItem[])
    setIsLoading(false)
  }, [enabled, provider])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    models,
    isLoading,
    error,
    refresh,
  }
}

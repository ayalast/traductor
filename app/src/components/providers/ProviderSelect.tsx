import { useState } from 'react'
import { PROVIDER_LIST, type ProviderId } from '../../lib/providers'
import { updateActiveProvider } from '../../lib/api'

type ProviderSelectProps = {
  activeProvider: string
  providerStatus?: string
  onUpdate?: () => Promise<void>
}

export function ProviderSelect({ activeProvider, providerStatus, onUpdate }: ProviderSelectProps) {
  const [isChanging, setIsChanging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleProviderChange = async (providerId: ProviderId) => {
    if (providerId === activeProvider) return

    try {
      setIsChanging(true)
      setError(null)
      await updateActiveProvider(providerId)
      if (onUpdate) {
        await onUpdate()
      }
    } catch (err) {
      console.error('Error changing provider:', err)
      setError(err instanceof Error ? err.message : 'Error al cambiar proveedor')
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <section className="panel-card">
      <div className="panel-card__head">
        <div>
          <p className="eyebrow">Proveedor activo</p>
          <h3>Catálogo multi-modelo</h3>
        </div>
        {isChanging && (
          <span className="loading-tag">Cambiando...</span>
        )}
      </div>

      {error && (
        <p className="error-text">
          {error}
        </p>
      )}

      <div className="model-grid">
        {PROVIDER_LIST.map((provider) => {
          const isActive = provider.id === activeProvider
          return (
            <article
              key={provider.id}
              className={`provider-card${isActive ? ' provider-card--active' : ''}`}
              onClick={() => !isChanging && handleProviderChange(provider.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{provider.label}</strong>
                {isActive && <span className="featured-badge">Actual</span>}
              </div>
              <span className="model-id">{provider.defaultModel}</span>
              <div className="model-status">
                {isActive ? providerStatus || '✓ Seleccionado' : 'Activar proveedor'}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

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
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cambiando...</span>
        )}
      </div>

      {error && (
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', color: 'var(--error)' }}>
          {error}
        </p>
      )}

      <div className="provider-grid">
        {PROVIDER_LIST.map((provider) => {
          const isActive = provider.id === activeProvider
          return (
            <article
              key={provider.id}
              className="provider-card"
              style={{
                cursor: isActive ? 'default' : 'pointer',
                opacity: isChanging ? 0.6 : 1,
                border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
              }}
              onClick={() => !isChanging && handleProviderChange(provider.id)}
            >
              <strong>{provider.label}</strong>
              <span>{provider.defaultModel}</span>
              <small>
                {isActive ? providerStatus ?? 'Activo en esta conversación' : 'Click para activar'}
              </small>
            </article>
          )
        })}
      </div>
    </section>
  )
}

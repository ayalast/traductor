import { useMemo, useState } from 'react'
import type { ProviderCatalogItem } from '../../hooks/useProviderCatalog'
import type { ProviderId } from '../../lib/providers'
import { updateActiveModel } from '../../lib/api'

type ModelComboboxProps = {
  activeProvider: string
  activeModel: string | null
  models: ProviderCatalogItem[]
  isLoading: boolean
  error: string | null
  onUpdate?: () => Promise<void>
}

export function ModelCombobox({
  activeProvider,
  activeModel,
  models,
  isLoading,
  error,
  onUpdate,
}: ModelComboboxProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isChanging, setIsChanging] = useState(false)
  const [changeError, setChangeError] = useState<string | null>(null)

  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models

    const query = searchQuery.toLowerCase()
    return models.filter(
      (model) =>
        model.name.toLowerCase().includes(query) ||
        model.id.toLowerCase().includes(query) ||
        model.provider.toLowerCase().includes(query)
    )
  }, [models, searchQuery])

  const handleModelChange = async (modelId: string) => {
    if (modelId === activeModel) return

    try {
      setIsChanging(true)
      setChangeError(null)
      await updateActiveModel(activeProvider as ProviderId, modelId)
      if (onUpdate) {
        await onUpdate()
      }
    } catch (err) {
      console.error('Error changing model:', err)
      setChangeError(err instanceof Error ? err.message : 'Error al cambiar modelo')
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <section className="panel-card">
      <div className="panel-card__head">
        <div>
          <p className="eyebrow">Modelos</p>
          <h3>Catálogo del proveedor</h3>
        </div>
        {isChanging && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cambiando...</span>
        )}
      </div>

      {changeError && (
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.75rem', color: 'var(--error)' }}>
          {changeError}
        </p>
      )}

      <div className="sidebar__search" style={{ marginTop: '1rem' }}>
        <input
          type="text"
          placeholder={`Buscar modelos en ${activeProvider}`}
          aria-label="Buscar modelos"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={isLoading || !!error}
        />
      </div>

      <div
        className="provider-grid"
        style={{
          maxHeight: '400px',
          overflowY: 'auto',
          marginTop: '0.75rem',
        }}
      >
        {isLoading ? (
          <article className="provider-card">
            <strong>Cargando catálogo...</strong>
            <small>Consultando provider-models</small>
          </article>
        ) : error ? (
          <article className="provider-card">
            <strong>Error al cargar modelos</strong>
            <small>{error}</small>
          </article>
        ) : filteredModels.length ? (
          filteredModels.map((model) => {
            const isActive = model.id === activeModel
            return (
              <article
                key={model.id}
                className="provider-card"
                style={{
                  cursor: isActive ? 'default' : 'pointer',
                  opacity: isChanging ? 0.6 : 1,
                  border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
                }}
                onClick={() => !isChanging && handleModelChange(model.id)}
              >
                <strong>{model.name}</strong>
                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{model.id}</span>
                <small>{isActive ? '✓ Activo' : 'Click para activar'}</small>
              </article>
            )
          })
        ) : searchQuery ? (
          <article className="provider-card">
            <strong>Sin resultados</strong>
            <small>No se encontraron modelos que coincidan con "{searchQuery}"</small>
          </article>
        ) : (
          <article className="provider-card">
            <strong>Sin modelos</strong>
            <small>El backend placeholder aún no devuelve catálogo real.</small>
          </article>
        )}
      </div>

      {filteredModels.length > 0 && (
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
          Mostrando {filteredModels.length} de {models.length} modelos
        </p>
      )}
    </section>
  )
}

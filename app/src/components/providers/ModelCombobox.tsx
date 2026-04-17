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
    if (!searchQuery.trim()) return models || []

    const query = searchQuery.toLowerCase()
    return (models || []).filter(
      (model) =>
        (model?.name || '').toLowerCase().includes(query) ||
        (model?.id || '').toLowerCase().includes(query) ||
        (model?.provider || '').toLowerCase().includes(query)
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
          <span className="loading-tag">Cambiando...</span>
        )}
      </div>

      {changeError && (
        <p className="error-text">
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

      <div className="model-grid">
        {isLoading ? (
          <article className="provider-card loading">
            <strong>Cargando catálogo...</strong>
          </article>
        ) : error ? (
          <article className="provider-card error">
            <strong>Error al cargar modelos</strong>
            <small>{error}</small>
          </article>
        ) : filteredModels.length ? (
          filteredModels.map((model) => {
            const isActive = model.id === activeModel
            const isPro = model.isFeatured || model.id.toLowerCase().includes('pro') || model.id.toLowerCase().includes('large')
            const description = isPro ? 'Modelo de alta capacidad para tareas complejas.' : 'Modelo optimizado para velocidad y eficiencia.'

            return (
              <article
                key={model.id}
                className={`provider-card${isActive ? ' provider-card--active' : ''}`}
                onClick={() => !isChanging && handleModelChange(model.id)}
                title={description}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <strong>{model.name}</strong>
                  {isPro && <span className="featured-badge">Pro</span>}
                </div>
                <span className="model-id">{model.id}</span>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                  {description}
                </p>
                <div className="model-status">
                  {isActive ? '✓ Seleccionado' : 'Activar modelo'}
                </div>
              </article>
            )
          })
        ) : searchQuery ? (
          <article className="provider-card empty">
            <strong>Sin resultados</strong>
          </article>
        ) : (
          <article className="provider-card empty">
            <strong>Sin modelos disponibles</strong>
          </article>
        )}
      </div>

      {filteredModels.length > 0 && (
        <p className="results-footer">
          Mostrando {filteredModels.length} de {models.length} modelos
        </p>
      )}
    </section>
  )
}

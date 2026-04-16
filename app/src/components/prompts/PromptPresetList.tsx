import { useState } from 'react'
import { createPreset, duplicatePreset, renamePreset, deletePreset, setActivePreset } from '../../lib/api'
import type { PromptPresetRecord } from '../../hooks/usePromptPresets'

type PromptPresetListProps = {
  presets: PromptPresetRecord[]
  activePresetId: string | null
  onRefresh: () => Promise<void>
}

export function PromptPresetList({ presets, activePresetId, onRefresh }: PromptPresetListProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newContent, setNewContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async () => {
    if (!newName.trim() || !newContent.trim()) {
      setError('El nombre y contenido son requeridos')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await createPreset(newName.trim(), newContent.trim())
      await onRefresh()
      setIsCreating(false)
      setNewName('')
      setNewContent('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear preset')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDuplicate = async (preset: PromptPresetRecord) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await duplicatePreset(preset.id, `${preset.name} (copia)`)
      await onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al duplicar preset')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRename = async (presetId: string) => {
    if (!newName.trim()) {
      setError('El nombre es requerido')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await renamePreset(presetId, newName.trim())
      await onRefresh()
      setEditingId(null)
      setNewName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al renombrar preset')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (presetId: string) => {
    if (!confirm('¿Estás seguro de eliminar este preset?')) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await deletePreset(presetId)
      await onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar preset')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleActivate = async (presetId: string) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await setActivePreset(presetId)
      await onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al activar preset')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="panel-card">
      <div className="panel-card__head">
        <div>
          <p className="eyebrow">System prompts</p>
          <h3>Presets guardados</h3>
        </div>
        <button type="button" onClick={() => setIsCreating(!isCreating)} disabled={isSubmitting}>
          {isCreating ? 'Cancelar' : 'Nuevo'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '0.75rem', background: 'var(--error-bg)', border: '1px solid var(--error-border)', borderRadius: '8px', marginBottom: '0.75rem' }}>
          <p style={{ color: 'var(--error-text)', fontSize: '0.85rem' }}>{error}</p>
        </div>
      )}

      {isCreating && (
        <div style={{ padding: '0.75rem', background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Nombre</span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Mi preset personalizado"
              style={{ width: '100%', padding: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.875rem' }}
              disabled={isSubmitting}
            />
          </label>
          <label style={{ display: 'block', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Contenido del prompt</span>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Eres un asistente útil que..."
              rows={4}
              style={{ width: '100%', padding: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.875rem', resize: 'vertical' }}
              disabled={isSubmitting}
            />
          </label>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isSubmitting}
            className="primary-btn"
            style={{ width: '100%' }}
          >
            {isSubmitting ? 'Creando...' : 'Crear preset'}
          </button>
        </div>
      )}

      <div className="preset-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {presets.map((preset) => (
          <div key={preset.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {editingId === preset.id ? (
              <div style={{ padding: '0.75rem', background: 'var(--surface-elevated)', border: '1px solid var(--accent)', borderRadius: '10px' }}>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nuevo nombre"
                  style={{ width: '100%', padding: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.875rem', marginBottom: '0.5rem' }}
                  disabled={isSubmitting}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleRename(preset.id)}
                    disabled={isSubmitting}
                    style={{ flex: 1, padding: '0.5rem', background: 'var(--send-grad)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null)
                      setNewName('')
                    }}
                    disabled={isSubmitting}
                    style={{ flex: 1, padding: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text)' }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  className={`preset-item${preset.id === activePresetId ? ' preset-item--active' : ''}`}
                  type="button"
                  onClick={() => handleActivate(preset.id)}
                  disabled={isSubmitting}
                  style={{ flex: 1 }}
                >
                  <span>{preset.name}</span>
                  <small>{preset.is_builtin ? 'Builtin' : 'Usuario'}</small>
                </button>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(preset)}
                    disabled={isSubmitting}
                    title="Duplicar"
                    style={{ padding: '0.35rem 0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    📋
                  </button>
                  {!preset.is_builtin && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(preset.id)
                          setNewName(preset.name)
                        }}
                        disabled={isSubmitting}
                        title="Renombrar"
                        style={{ padding: '0.35rem 0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(preset.id)}
                        disabled={isSubmitting}
                        title="Eliminar"
                        style={{ padding: '0.35rem 0.5rem', background: 'var(--surface)', border: '1px solid var(--error-border)', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--error-text)' }}
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

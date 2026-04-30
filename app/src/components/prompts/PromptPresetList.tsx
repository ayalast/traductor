import { useState } from 'react'
import { createPreset, duplicatePreset, updatePreset, deletePreset, setActivePreset } from '../../lib/api'
import type { PromptPresetRecord } from '../../hooks/usePromptPresets'

type PromptPresetListProps = {
  presets: PromptPresetRecord[]
  activePresetId: string | null
  onRefresh: () => Promise<void>
}

export function PromptPresetList({ presets, activePresetId, onRefresh }: PromptPresetListProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', prompt: '' })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const handleStartCreate = () => {
    setFormData({ name: '', prompt: '' })
    setIsCreating(true)
    setEditingId(null)
    setError(null)
  }

  const handleStartEdit = (preset: PromptPresetRecord) => {
    setFormData({ name: preset.name, prompt: preset.prompt })
    setEditingId(preset.id)
    setIsCreating(false)
    setError(null)
  }

  const handleCancel = () => {
    setIsCreating(false)
    setEditingId(null)
    setFormData({ name: '', prompt: '' })
    setError(null)
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.prompt.trim()) {
      setError('El nombre y contenido son requeridos')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      if (isCreating) {
        await createPreset(formData.name.trim(), formData.prompt.trim())
      } else if (editingId) {
        await updatePreset(editingId, formData.name.trim(), formData.prompt.trim())
      }
      await onRefresh()
      handleCancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar preset')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDuplicate = async (preset: PromptPresetRecord) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const copyName = `${preset.name} (copia)`
      await duplicatePreset(preset.id, copyName)
      await onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al duplicar preset')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (presetId: string) => {
    if (deleteTargetId !== presetId) {
      setDeleteTargetId(presetId)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await deletePreset(presetId)
      await onRefresh()
      setDeleteTargetId(null)
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
          <h3>Presets de traducción</h3>
        </div>
        <button 
          type="button" 
          onClick={isCreating || editingId ? handleCancel : handleStartCreate} 
          disabled={isSubmitting}
        >
          {isCreating || editingId ? 'Cancelar' : 'Nuevo'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '0.75rem', background: 'var(--error-bg)', border: '1px solid var(--error-border)', borderRadius: '8px', marginBottom: '1rem' }}>
          <p style={{ color: 'var(--error-text)', fontSize: '0.85rem', margin: 0 }}>{error}</p>
        </div>
      )}

      {(isCreating || editingId) && (
        <div style={{ padding: '1rem', background: 'var(--surface-elevated)', border: '1px solid var(--accent)', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ margin: 0, fontSize: '0.9rem' }}>{isCreating ? 'Crear nuevo preset' : 'Editar preset'}</h4>
          
          <label>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Nombre del preset</span>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Traductor informal"
              style={{ width: '100%', padding: '0.65rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.875rem' }}
              disabled={isSubmitting}
            />
          </label>

          <label>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Instrucciones del sistema (Prompt)</span>
            <textarea
              value={formData.prompt}
              onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
              placeholder="Eres un traductor experto que..."
              rows={6}
              style={{ width: '100%', padding: '0.65rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.875rem', resize: 'vertical', lineHeight: '1.5' }}
              disabled={isSubmitting}
            />
          </label>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="primary-btn"
            style={{ width: '100%', padding: '0.75rem' }}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar preset'}
          </button>
        </div>
      )}

      <div className="preset-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {presets.map((preset) => (
          <div key={preset.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <button
              className={`preset-item${preset.id === activePresetId ? ' preset-item--active' : ''}`}
              type="button"
              onClick={() => handleActivate(preset.id)}
              disabled={isSubmitting || editingId === preset.id}
              style={{ flex: 1, textAlign: 'left', minHeight: 'auto', padding: '0.75rem' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ fontWeight: 600 }}>{preset.name}</span>
                <small style={{ fontSize: '0.7rem', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                  {preset.prompt}
                </small>
              </div>
              {preset.is_builtin && <small style={{ background: 'var(--badge-bg)', border: '1px solid var(--badge-border)', color: 'var(--badge-text)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', textTransform: 'uppercase' }}>Sistema</small>}
            </button>
            
            <div style={{ display: 'flex', gap: '0.25rem', paddingTop: '0.25rem' }}>
              <button
                type="button"
                onClick={() => handleDuplicate(preset)}
                disabled={isSubmitting || !!editingId}
                title="Duplicar"
                style={{ padding: '0.4rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer' }}
              >
                📋
              </button>
              <button
                type="button"
                onClick={() => handleStartEdit(preset)}
                disabled={isSubmitting || !!editingId}
                title="Editar"
                style={{ padding: '0.4rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer' }}
              >
                ✏️
              </button>
              <button
                type="button"
                onClick={() => handleDelete(preset.id)}
                disabled={isSubmitting || !!editingId}
                title={deleteTargetId === preset.id ? 'Confirmar eliminación' : 'Eliminar'}
                style={{ padding: '0.4rem', background: 'var(--surface)', border: '1px solid var(--error-border)', borderRadius: '8px', cursor: 'pointer' }}
              >
                {deleteTargetId === preset.id ? 'Sí' : '🗑️'}
              </button>
              {deleteTargetId === preset.id && (
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(null)}
                  disabled={isSubmitting || !!editingId}
                  title="Cancelar eliminación"
                  style={{ padding: '0.4rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer' }}
                >
                  No
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

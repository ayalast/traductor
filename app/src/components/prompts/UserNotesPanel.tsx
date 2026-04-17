import { useCallback, useEffect, useRef, useState } from 'react'
import { updateUserNotes } from '../../lib/api'

type UserNotesPanelProps = {
  initialNotes: string
  onUpdate?: () => Promise<void>
}

export function UserNotesPanel({ initialNotes, onUpdate }: UserNotesPanelProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prevNotesRef = useRef(initialNotes)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value)
  }

  useEffect(() => {
    if (notes === prevNotesRef.current) return

    const timer = setTimeout(async () => {
      try {
        setIsSaving(true)
        setError(null)
        await updateUserNotes(notes)
        prevNotesRef.current = notes
        if (onUpdate) await onUpdate()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar notas')
      } finally {
        setIsSaving(false)
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [notes, onUpdate])

  return (
    <section className="panel-card">
      <div className="panel-card__head">
        <div>
          <p className="eyebrow">Persistencia</p>
          <h3>Notas personales</h3>
        </div>
        {isSaving && (
          <span className="loading-tag">Sincronizando...</span>
        )}
      </div>

      <textarea
        value={notes}
        onChange={handleChange}
        placeholder="Añade notas personales que se incluirán en el contexto del sistema..."
        style={{
          width: '100%',
          minHeight: '120px',
          padding: '0.85rem',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          color: 'var(--text)',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          resize: 'vertical',
          fontFamily: 'inherit',
          outline: 'none'
        }}
      />

      {error && (
        <p className="error-text">
          {error}
        </p>
      )}

      <p style={{ margin: '0.75rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.8 }}>
        Estas notas se inyectan automáticamente en el prompt del sistema.
      </p>
    </section>
  )
}

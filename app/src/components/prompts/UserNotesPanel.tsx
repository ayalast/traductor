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
  const timeoutRef = useRef<number | null>(null)

  // Sincronizar con el valor inicial cuando cambie
  useEffect(() => {
    setNotes(initialNotes)
  }, [initialNotes])

  const saveNotes = useCallback(
    async (value: string) => {
      try {
        setIsSaving(true)
        setError(null)
        await updateUserNotes(value)
        if (onUpdate) {
          await onUpdate()
        }
      } catch (err) {
        console.error('Error saving notes:', err)
        setError(err instanceof Error ? err.message : 'Error al guardar notas')
      } finally {
        setIsSaving(false)
      }
    },
    [onUpdate]
  )

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value
    setNotes(value)

    // Cancelar el guardado anterior si existe
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Guardar después de 1 segundo de inactividad
    timeoutRef.current = setTimeout(() => {
      saveNotes(value)
    }, 1000)
  }

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <section className="panel-card">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Notas personales
        </h3>
        {isSaving && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Guardando...</span>
        )}
      </header>

      <textarea
        value={notes}
        onChange={handleChange}
        placeholder="Añade notas personales que se incluirán en el contexto del sistema..."
        style={{
          width: '100%',
          minHeight: '100px',
          padding: '0.75rem',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          color: 'var(--text-primary)',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          resize: 'vertical',
          fontFamily: 'inherit',
        }}
      />

      {error && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--error)' }}>
          {error}
        </p>
      )}

      <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        Estas notas se añaden automáticamente al prompt del sistema en cada conversación.
      </p>
    </section>
  )
}

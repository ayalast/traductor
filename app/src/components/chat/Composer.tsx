type ComposerProps = {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onStop?: () => void
  onCancelEdit?: () => void
  isSending?: boolean
  disabled?: boolean
  isEditMode?: boolean
}

export function Composer({
  placeholder = 'Escribe tu consulta...',
  value,
  onChange,
  onSubmit,
  onStop,
  onCancelEdit,
  isSending = false,
  disabled = false,
  isEditMode = false,
}: ComposerProps) {
  const canSubmit = value.trim().length > 0 && !disabled && !isSending

  return (
    <footer className="composer" style={{ borderTop: isEditMode ? '3px solid var(--accent)' : undefined }}>
      {isEditMode && (
        <div
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--accent)',
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>✏️ Modo edición: regenerando desde este punto</span>
          {onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              style={{
                background: 'transparent',
                border: '1px solid white',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              Cancelar edición
            </button>
          )}
        </div>
      )}
      <label className="composer__input" htmlFor="composer-input">
        <span className="eyebrow">{isEditMode ? 'Edita y regenera' : 'Escribe tu consulta'}</span>
        <textarea
          id="composer-input"
          rows={3}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              if (canSubmit) onSubmit()
            }
            if (event.key === 'Escape' && isEditMode && onCancelEdit) {
              event.preventDefault()
              onCancelEdit()
            }
          }}
          style={{
            borderColor: isEditMode ? 'var(--accent)' : undefined,
            borderWidth: isEditMode ? '2px' : undefined,
          }}
        />
      </label>
      <div className="composer__actions">
        {isEditMode && onCancelEdit && (
          <button type="button" onClick={onCancelEdit} disabled={disabled}>
            Cancelar
          </button>
        )}
        <button type="button" onClick={onStop} disabled={!isSending || disabled}>
          Detener
        </button>
        <button className="primary-btn" type="button" onClick={onSubmit} disabled={!canSubmit}>
          {isSending ? 'Enviando...' : isEditMode ? 'Regenerar' : 'Enviar'}
        </button>
      </div>
    </footer>
  )
}

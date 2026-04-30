import { forwardRef } from 'react'

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

export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(
  (
    {
      placeholder = 'Escribe tu consulta...',
      value,
      onChange,
      onSubmit,
      onStop,
      onCancelEdit,
      isSending = false,
      disabled = false,
      isEditMode = false,
    },
    ref
  ) => {
    const canSubmit = value.trim().length > 0 && !disabled && !isSending

    return (
      <footer className="composer">
        <div className="composer__input-wrapper">
          {isEditMode && (
            <div className="composer__edit-badge">
              <span>✏️ Modo edición: regenerando desde este punto</span>
              <button type="button" onClick={onCancelEdit}>Cancelar</button>
            </div>
          )}
          
          <div className="composer__input-container">
            <textarea
              ref={ref}
              rows={1}
              placeholder={placeholder}
              value={value}
              disabled={disabled}
              onChange={(event) => {
                onChange(event.target.value)
              }}
              onInput={(event) => {
                const target = event.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = `${target.scrollHeight}px`
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  if (canSubmit) onSubmit()
                }
              }}
            />
            
              <div className="composer__actions-row">
              <div className="composer__left-actions" />
              <div className="composer__right-actions">
                {isSending ? (
                  <button type="button" className="stop-btn" onClick={onStop} title="Detener">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  </button>
                ) : (
                  <button 
                    className={`send-btn ${canSubmit ? 'can-submit' : ''}`} 
                    type="button" 
                    onClick={onSubmit} 
                    disabled={!canSubmit}
                    title="Enviar"
                    aria-label="Enviar mensaje"
                  >
                    {isEditMode ? (
                      '↻'
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M3.5 20.5 22 12 3.5 3.5 6.2 10.7 14 12l-7.8 1.3-2.7 7.2Z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="composer__footer-text">
            Mi Traductor · Inteligencia Artificial para Traducción
          </div>
        </div>
      </footer>
    )
  }
)

Composer.displayName = 'Composer'

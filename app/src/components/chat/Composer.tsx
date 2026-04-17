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
              autoFocus
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
              <div className="composer__left-actions">
                {value.length > 0 && (
                  <span className="char-count">{value.length} caracteres</span>
                )}
              </div>
              <div className="composer__right-actions">
                {isSending ? (
                  <button type="button" className="stop-btn" onClick={onStop} title="Detener">
                    ⬜
                  </button>
                ) : (
                  <button 
                    className={`send-btn ${canSubmit ? 'can-submit' : ''}`} 
                    type="button" 
                    onClick={onSubmit} 
                    disabled={!canSubmit}
                    title="Enviar"
                  >
                    {isEditMode ? '↻' : '↑'}
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

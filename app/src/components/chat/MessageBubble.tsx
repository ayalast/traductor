type MessageBubbleProps = {
  id: string
  role: 'user' | 'assistant'
  author: string
  content: string
  reasoning?: string
  canEdit?: boolean
  canRetry?: boolean
  canBranch?: boolean
  onEdit?: (messageId: string) => void
  onRetry?: (messageId: string) => void
  onBranch?: (messageId: string) => void
}

export function MessageBubble({
  id,
  role,
  author,
  content,
  reasoning,
  canEdit = false,
  canRetry = false,
  canBranch = false,
  onEdit,
  onRetry,
  onBranch,
}: MessageBubbleProps) {
  return (
    <article className={`message message--${role}`}>
      <div className="message__meta">
        <span>{author}</span>
        <div className="message__actions">
          <button type="button" disabled={!canEdit} onClick={() => onEdit?.(id)}>
            Editar
          </button>
          <button type="button" disabled={!canRetry} onClick={() => onRetry?.(id)}>
            Reintentar
          </button>
          <button type="button" disabled={!canBranch} onClick={() => onBranch?.(id)}>
            Ramificar
          </button>
        </div>
      </div>
      <div className="message__content">
        <pre>{content}</pre>
      </div>
      {reasoning ? (
        <details className="reasoning-box">
          <summary>Resumen de razonamiento</summary>
          <p>{reasoning}</p>
        </details>
      ) : null}
    </article>
  )
}

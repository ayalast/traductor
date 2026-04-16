type ErrorStateProps = {
  title?: string
  message: string
  onRetry?: () => void
  icon?: string
}

export function ErrorState({ title = 'Error', message, onRetry, icon = '⚠️' }: ErrorStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '3rem',
          opacity: 0.8,
        }}
      >
        {icon}
      </div>
      <div>
        <h3
          style={{
            color: 'var(--error-text)',
            fontSize: '1rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            maxWidth: '400px',
          }}
        >
          {message}
        </p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text)',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          🔄 Reintentar
        </button>
      )}
    </div>
  )
}

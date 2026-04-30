type EmptyStateProps = {
  icon?: string
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '3rem 2rem',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '4rem',
          opacity: 0.6,
          marginBottom: '0.5rem',
        }}
      >
        {icon}
      </div>
      <div>
        <h3
          style={{
            color: 'var(--text)',
            fontSize: '1.1rem',
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
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            marginTop: '0.5rem',
            padding: '0.65rem 1.25rem',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: '10px',
            color: 'var(--accent-text)',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px var(--send-shadow)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 16px var(--send-shadow-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 12px var(--send-shadow)'
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

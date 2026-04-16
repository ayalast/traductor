type LoadingStateProps = {
  message?: string
  size?: 'small' | 'medium' | 'large'
}

export function LoadingState({ message = 'Cargando...', size = 'medium' }: LoadingStateProps) {
  const sizeStyles = {
    small: { width: '24px', height: '24px', borderWidth: '2px' },
    medium: { width: '40px', height: '40px', borderWidth: '3px' },
    large: { width: '56px', height: '56px', borderWidth: '4px' },
  }

  const style = sizeStyles[size]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2rem',
      }}
    >
      <div
        style={{
          ...style,
          border: `${style.borderWidth} solid var(--border)`,
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>{message}</p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

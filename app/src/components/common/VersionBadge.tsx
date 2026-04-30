import packageJson from '../../../package.json'

export function VersionBadge() {
  const version = packageJson.version
  const buildDate = import.meta.env.VITE_BUILD_DATE || new Date().toISOString().split('T')[0]
  const environment = import.meta.env.MODE

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '6.5rem',
        right: '2rem',
        padding: '0.5rem 0.75rem',
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        fontFamily: 'monospace',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        pointerEvents: 'none',
        userSelect: 'none',
        opacity: 0.8,
      }}
    >
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <span style={{ color: 'var(--link-color)' }}>v{version}</span>
        {environment === 'development' && (
          <span
            style={{
              padding: '0.125rem 0.375rem',
              background: 'var(--warning-bg)',
              color: 'var(--warning-text)',
              borderRadius: '3px',
              fontSize: '0.625rem',
              fontWeight: 600,
            }}
          >
            DEV
          </span>
        )}
      </div>
      <div style={{ fontSize: '0.625rem', opacity: 0.7 }}>{buildDate}</div>
    </div>
  )
}

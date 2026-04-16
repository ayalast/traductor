import { useEffect, useState } from 'react'
import { logger } from '../../lib/logger'

type LogEntry = {
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  category: string
  message: string
  data?: unknown
  stack?: string
}

type DiagnosticsPanelProps = {
  isOpen: boolean
  onClose: () => void
}

export function DiagnosticsPanel({ isOpen, onClose }: DiagnosticsPanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState<string>('')
  const [levelFilter, setLevelFilter] = useState<string>('all')

  useEffect(() => {
    if (!isOpen) return

    // Cargar logs iniciales
    setLogs(logger.getLogs())

    // Suscribirse a actualizaciones
    const unsubscribe = logger.subscribe((newLogs) => {
      setLogs(newLogs)
    })

    return unsubscribe
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const filteredLogs = logs.filter((log) => {
    const matchesText =
      !filter ||
      log.message.toLowerCase().includes(filter.toLowerCase()) ||
      log.category.toLowerCase().includes(filter.toLowerCase())

    const matchesLevel = levelFilter === 'all' || log.level === levelFilter

    return matchesText && matchesLevel
  })

  const handleExport = () => {
    const dataStr = logger.exportLogs()
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `diagnostics-${new Date().toISOString()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return '#ef4444'
      case 'warn':
        return '#f59e0b'
      case 'info':
        return '#3b82f6'
      case 'debug':
        return '#6b7280'
      default:
        return '#9ca3af'
    }
  }

  const getLevelBg = (level: string) => {
    switch (level) {
      case 'error':
        return 'rgba(239, 68, 68, 0.1)'
      case 'warn':
        return 'rgba(245, 158, 11, 0.1)'
      case 'info':
        return 'rgba(59, 130, 246, 0.1)'
      case 'debug':
        return 'rgba(107, 114, 128, 0.1)'
      default:
        return 'rgba(156, 163, 175, 0.1)'
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Panel de Diagnóstico</h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {filteredLogs.length} de {logs.length} logs
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.5rem',
              color: 'var(--text-muted)',
            }}
            aria-label="Cerrar panel de diagnóstico"
          >
            ✕
          </button>
        </div>

        {/* Controls */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            placeholder="Filtrar logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              flex: '1 1 200px',
              padding: '0.5rem 0.75rem',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: 'var(--text)',
            }}
          />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: 'var(--text)',
            }}
          >
            <option value="all">Todos los niveles</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
          <button
            type="button"
            onClick={handleExport}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Exportar JSON
          </button>
          <button
            type="button"
            onClick={() => {
              logger.clearLogs()
              setLogs([])
            }}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: 'var(--text)',
              cursor: 'pointer',
            }}
          >
            Limpiar
          </button>
        </div>

        {/* Logs */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem 1.5rem',
          }}
        >
          {filteredLogs.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                color: 'var(--text-muted)',
              }}
            >
              <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>📋</p>
              <p style={{ margin: 0 }}>No hay logs que mostrar</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredLogs.map((log, index) => (
                <div
                  key={index}
                  style={{
                    padding: '0.75rem',
                    background: getLevelBg(log.level),
                    border: `1px solid ${getLevelColor(log.level)}`,
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontFamily: 'monospace',
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <span
                      style={{
                        color: getLevelColor(log.level),
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        fontSize: '0.75rem',
                      }}
                    >
                      {log.level}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>[{log.category}]</span>
                  </div>
                  <div style={{ color: 'var(--text)', marginBottom: log.data || log.stack ? '0.5rem' : 0 }}>
                    {log.message}
                  </div>
                  {log.data !== undefined && (
                    <details style={{ marginTop: '0.5rem' }}>
                      <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        Ver datos
                      </summary>
                      <pre
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.5rem',
                          background: 'var(--surface)',
                          borderRadius: '4px',
                          overflow: 'auto',
                          fontSize: '0.75rem',
                        }}
                      >
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </details>
                  )}
                  {log.stack && (
                    <details style={{ marginTop: '0.5rem' }}>
                      <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        Ver stack trace
                      </summary>
                      <pre
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.5rem',
                          background: 'var(--surface)',
                          borderRadius: '4px',
                          overflow: 'auto',
                          fontSize: '0.75rem',
                          color: '#ef4444',
                        }}
                      >
                        {log.stack}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}
        >
          Presiona <kbd style={{ padding: '0.125rem 0.25rem', background: 'var(--surface-elevated)', borderRadius: '3px' }}>Esc</kbd> para cerrar · Ctrl+Shift+L para abrir
        </div>
      </div>
    </div>
  )
}

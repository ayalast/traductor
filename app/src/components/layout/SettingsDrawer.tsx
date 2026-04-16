import { useEffect, useState } from 'react'
import type { ProviderId } from '../../lib/providers'
import {
  THEMES,
  type ThemeId,
  type ThemeMode,
  applyTheme,
  applyPaperTexture,
  getStoredTheme,
  getStoredMode,
  setStoredTheme,
  setStoredMode,
  getPaperTextureSettings,
  setPaperTextureSettings,
} from '../../lib/themes'

type SettingsDrawerProps = {
  isOpen: boolean
  onClose: () => void
  activeProvider: ProviderId
  activeTemperature: number
  onTemperatureChange: (temp: number) => void
}

export function SettingsDrawer({
  isOpen,
  onClose,
  activeProvider,
  activeTemperature,
  onTemperatureChange,
}: SettingsDrawerProps) {
  const [tempValue, setTempValue] = useState(activeTemperature)
  const [activeTheme, setActiveTheme] = useState<ThemeId>(getStoredTheme())
  const [activeMode, setActiveMode] = useState<ThemeMode>(getStoredMode())
  const [paperSettings, setPaperSettings] = useState(getPaperTextureSettings())

  useEffect(() => {
    applyTheme(activeTheme, activeMode)
    applyPaperTexture(paperSettings)
  }, [activeTheme, activeMode, paperSettings])

  const handleTemperatureChange = (value: number) => {
    setTempValue(value)
    onTemperatureChange(value)
  }

  const handleThemeChange = (themeId: ThemeId) => {
    setActiveTheme(themeId)
    setStoredTheme(themeId)
    applyTheme(themeId, activeMode)
  }

  const handleModeChange = (mode: ThemeMode) => {
    setActiveMode(mode)
    setStoredMode(mode)
    applyTheme(activeTheme, mode)
  }

  const handlePaperTextureToggle = (enabled: boolean) => {
    const newSettings = { ...paperSettings, enabled }
    setPaperSettings(newSettings)
    setPaperTextureSettings({ enabled })
    applyPaperTexture(newSettings)
  }

  const handlePaperTextureLevel = (level: number) => {
    const newSettings = { ...paperSettings, level }
    setPaperSettings(newSettings)
    setPaperTextureSettings({ level })
    applyPaperTexture(newSettings)
  }

  const handlePaperGlobalToggle = (globalEnabled: boolean) => {
    const newSettings = { ...paperSettings, globalEnabled }
    setPaperSettings(newSettings)
    setPaperTextureSettings({ globalEnabled })
    applyPaperTexture(newSettings)
  }

  const handlePaperGlobalLevel = (globalLevel: number) => {
    const newSettings = { ...paperSettings, globalLevel }
    setPaperSettings(newSettings)
    setPaperTextureSettings({ globalLevel })
    applyPaperTexture(newSettings)
  }

  if (!isOpen) return null

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
        }}
        onClick={onClose}
      />
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(450px, 90vw)',
          background: 'var(--surface)',
          boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.2)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s ease-out',
        }}
      >
        <header
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>⚙️ Configuración</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.25rem',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {/* Temas */}
          <section style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>🎨 Tema visual</h3>
            
            {/* Modo claro/oscuro */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => handleModeChange('dark')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: activeMode === 'dark' ? 'var(--accent)' : 'var(--surface-elevated)',
                  color: activeMode === 'dark' ? 'white' : 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                🌙 Oscuro
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('light')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: activeMode === 'light' ? 'var(--accent)' : 'var(--surface-elevated)',
                  color: activeMode === 'light' ? 'white' : 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                ☀️ Claro
              </button>
            </div>

            {/* Selector de temas */}
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {(Object.entries(THEMES) as [ThemeId, typeof THEMES[ThemeId]][]).map(([id, theme]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleThemeChange(id)}
                  style={{
                    padding: '1rem',
                    background: activeTheme === id ? 'var(--accent)' : 'var(--surface-elevated)',
                    color: activeTheme === id ? 'white' : 'var(--text)',
                    border: `2px solid ${activeTheme === id ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{theme.label}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>{theme.description}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Texturas */}
          <section style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>📄 Texturas</h3>
            
            {/* Textura de fondo */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--surface-elevated)', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Textura en fondo</label>
                <input
                  type="checkbox"
                  checked={paperSettings.enabled}
                  onChange={(e) => handlePaperTextureToggle(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>
              {paperSettings.enabled && (
                <>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={paperSettings.level}
                    onChange={(e) => handlePaperTextureLevel(Number(e.target.value))}
                    style={{ width: '100%', marginBottom: '0.5rem' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                    {paperSettings.level}%
                  </div>
                </>
              )}
            </div>

            {/* Textura global */}
            <div style={{ padding: '1rem', background: 'var(--surface-elevated)', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Textura general</label>
                <input
                  type="checkbox"
                  checked={paperSettings.globalEnabled}
                  onChange={(e) => handlePaperGlobalToggle(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>
              {paperSettings.globalEnabled && (
                <>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={paperSettings.globalLevel}
                    onChange={(e) => handlePaperGlobalLevel(Number(e.target.value))}
                    style={{ width: '100%', marginBottom: '0.5rem' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                    {paperSettings.globalLevel}%
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Temperatura */}
          <section style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>🌡️ Temperatura</h3>
            <div
              style={{
                padding: '1rem',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Creatividad</span>
                <strong style={{ fontSize: '1.125rem' }}>{tempValue.toFixed(2)}</strong>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={tempValue}
                onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <span>Preciso (0.0)</span>
                <span>Creativo (1.0)</span>
              </div>
            </div>
          </section>

          {/* Proveedor */}
          <section>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>🔌 Proveedor activo</h3>
            <div
              style={{
                padding: '1rem',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
              }}
            >
              <strong style={{ textTransform: 'capitalize' }}>{activeProvider}</strong>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Cambia el proveedor desde el panel lateral
              </p>
            </div>
          </section>
        </div>
      </aside>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  )
}

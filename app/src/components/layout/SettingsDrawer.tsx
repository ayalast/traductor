import { useEffect, useState, type ReactNode } from 'react'
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
import packageJson from '../../../package.json'

type SettingsDrawerProps = {
  isOpen: boolean
  onClose: () => void
  activeProvider: ProviderId
  activeTemperature: number
  onTemperatureChange: (temp: number) => void
  children?: ReactNode
  dangerZone?: ReactNode
}

export function SettingsDrawer({
  isOpen,
  onClose,
  activeTemperature,
  onTemperatureChange,
  children,
  dangerZone,
}: SettingsDrawerProps) {
  const [tempValue, setTempValue] = useState(activeTemperature)
  const [activeTheme, setActiveTheme] = useState<ThemeId>(getStoredTheme())
  const [activeMode, setActiveMode] = useState<ThemeMode>(getStoredMode())
  const [paperSettings, setPaperSettings] = useState(getPaperTextureSettings())
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  const version = packageJson.version
  const buildDate = import.meta.env.VITE_BUILD_DATE || new Date().toISOString().split('T')[0]

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
      <div className="settings-drawer__overlay" onClick={onClose} />
      <aside className="settings-drawer">
        <header className="settings-drawer__header">
          <h2>⚙️ Configuración</h2>
          <button type="button" onClick={onClose} className="settings-drawer__close">×</button>
        </header>

        <div className="settings-drawer__content">
          {children && <div className="settings-drawer__custom-content">{children}</div>}

          {/* Temas */}
          <section className="settings-section">
            <h3 className="eyebrow">🎨 Tema visual</h3>
            
            {/* Modo claro/oscuro */}
            <div className="settings-drawer__mode-toggle">
              <button
                type="button"
                onClick={() => handleModeChange('dark')}
                className={activeMode === 'dark' ? 'active' : ''}
              >
                🌙 Oscuro
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('light')}
                className={activeMode === 'light' ? 'active' : ''}
              >
                ☀️ Claro
              </button>
            </div>

            {/* Selector de temas */}
            <div className="settings-drawer__theme-grid">
              {(Object.entries(THEMES) as [ThemeId, typeof THEMES[ThemeId]][]).map(([id, theme]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleThemeChange(id)}
                  className={`theme-card ${activeTheme === id ? 'active' : ''}`}
                >
                  <strong>{theme.label}</strong>
                  <p>{theme.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Texturas */}
          <section className="settings-section">
            <h3 className="eyebrow">📄 Texturas</h3>
            
            <div className="settings-drawer__control-card">
              <div className="settings-drawer__control-row">
                <label>Textura en fondo</label>
                <input
                  type="checkbox"
                  checked={paperSettings.enabled}
                  onChange={(e) => handlePaperTextureToggle(e.target.checked)}
                />
              </div>
              {paperSettings.enabled && (
                <div className="settings-drawer__slider-group">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={paperSettings.level}
                    onChange={(e) => handlePaperTextureLevel(Number(e.target.value))}
                  />
                  <span>{paperSettings.level}%</span>
                </div>
              )}
            </div>

            <div className="settings-drawer__control-card">
              <div className="settings-drawer__control-row">
                <label>Textura general</label>
                <input
                  type="checkbox"
                  checked={paperSettings.globalEnabled}
                  onChange={(e) => handlePaperGlobalToggle(e.target.checked)}
                />
              </div>
              {paperSettings.globalEnabled && (
                <div className="settings-drawer__slider-group">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={paperSettings.globalLevel}
                    onChange={(e) => handlePaperGlobalLevel(Number(e.target.value))}
                  />
                  <span>{paperSettings.globalLevel}%</span>
                </div>
              )}
            </div>
          </section>

          {/* Temperatura */}
          <section className="settings-section">
            <h3 className="eyebrow">🌡️ Temperatura</h3>
            <div className="settings-drawer__control-card">
              <div className="settings-drawer__control-row">
                <span>Creatividad</span>
                <strong>{tempValue.toFixed(2)}</strong>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={tempValue}
                onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
                className="settings-drawer__slider"
              />
              <div className="settings-drawer__slider-labels">
                <span>Preciso</span>
                <span>Creativo</span>
              </div>
            </div>
          </section>

          {/* Atajos de teclado */}
          <section className="settings-section">
            <h3 className="eyebrow">⌨️ Atajos de teclado</h3>
            <div className="settings-drawer__control-card" style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Enviar mensaje</span>
                <kbd style={{ background: 'var(--surface)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>Enter</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Salto de línea</span>
                <kbd style={{ background: 'var(--surface)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>Shift + Enter</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Cancelar edición</span>
                <kbd style={{ background: 'var(--surface)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>Esc</kbd>
              </div>
            </div>
          </section>

          {/* Ayuda y Feedback */}
          <section className="settings-section">
            <h3 className="eyebrow">🆘 Ayuda y Feedback</h3>
            <div className="settings-drawer__control-card" style={{ display: 'grid', gap: '0.5rem' }}>
              <button 
                className="theme-card" 
                style={{ padding: '0.75rem', width: '100%', marginBottom: 0 }}
                onClick={() => window.open('https://github.com/danny-avila/LibreChat', '_blank')}
              >
                <strong>Documentación</strong>
                <p>Guía de uso y configuración.</p>
              </button>
              <button 
                className="theme-card" 
                style={{ padding: '0.75rem', width: '100%', marginBottom: 0 }}
                onClick={() => setFeedbackMessage('Gracias. Envía tus comentarios a: support@mi-traductor.ai')}
              >
                <strong>Reportar un error</strong>
                <p>Ayúdanos a mejorar el sistema.</p>
              </button>
              {feedbackMessage && (
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{feedbackMessage}</p>
              )}
            </div>
          </section>

          {dangerZone}

          {/* Info del sistema */}
          <section className="settings-section" style={{ marginTop: 'auto', paddingTop: '2rem' }}>
            <div style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface-elevated)', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span className="status-dot"></span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--link-color)' }}>Sistema Sincronizado</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>Mi Traductor v{version}</p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Build: {buildDate}</p>
            </div>
          </section>
        </div>
      </aside>
    </>
  )
}

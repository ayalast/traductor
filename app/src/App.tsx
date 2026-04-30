import { lazy, Suspense, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { applyTheme, applyPaperTexture, getStoredTheme, getStoredMode, getPaperTextureSettings } from './lib/themes'
import { logger } from './lib/logger'

const DiagnosticsPanel = lazy(() => import('./components/common/DiagnosticsPanel').then(m => ({ default: m.DiagnosticsPanel })))

import './App.css'

export default function App() {
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false)

  useEffect(() => {
    // Aplicar tema guardado al cargar la aplicación
    const theme = getStoredTheme()
    const mode = getStoredMode()
    const paperSettings = getPaperTextureSettings()
    
    applyTheme(theme, mode)
    applyPaperTexture(paperSettings)

    // Log de inicio de aplicación
    logger.info('app', 'Aplicación iniciada', {
      theme,
      mode,
      paperEnabled: paperSettings.enabled,
    })
  }, [])

  useEffect(() => {
    // Atajo de teclado para abrir panel de diagnóstico: Ctrl+Shift+L
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'L') {
        event.preventDefault()
        setIsDiagnosticsOpen((prev) => !prev)
        logger.info('diagnostics', 'Panel de diagnóstico toggled', { isOpen: !isDiagnosticsOpen })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDiagnosticsOpen])

  return (
    <>
      <Outlet />
      {isDiagnosticsOpen && (
        <Suspense fallback={null}>
          <DiagnosticsPanel isOpen={isDiagnosticsOpen} onClose={() => setIsDiagnosticsOpen(false)} />
        </Suspense>
      )}
    </>
  )
}

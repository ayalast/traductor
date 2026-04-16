export type ThemeMode = 'dark' | 'light'

export type ThemeId = 'ember' | 'ocean' | 'forest' | 'lavender' | 'paper' | 'highContrast'

export type ThemeVars = Record<string, string>

export type Theme = {
  label: string
  description: string
  modes: {
    dark: { vars: ThemeVars }
    light: { vars: ThemeVars }
  }
}

export const THEMES: Record<ThemeId, Theme> = {
  ember: {
    label: 'Ámbar',
    description: 'Cálido y cinematográfico, con naranjas suaves y profundidad de cobre.',
    modes: {
      dark: {
        vars: {
          '--bg': '#0a0c14',
          '--surface': '#0f1219',
          '--surface-elevated': '#181c2e',
          '--border': 'rgba(241,99,52,0.22)',
          '--accent': '#f16334',
          '--text': '#eef1ff',
          '--text-secondary': '#9ba3c7',
          '--text-muted': '#6b7280',
        },
      },
      light: {
        vars: {
          '--bg': '#fff8f1',
          '--surface': '#fffcf7',
          '--surface-elevated': '#fffdf9',
          '--border': 'rgba(241,99,52,0.18)',
          '--accent': '#dd6b20',
          '--text': '#2d1b12',
          '--text-secondary': '#7b5e4b',
          '--text-muted': '#9ca3af',
        },
      },
    },
  },
  ocean: {
    label: 'Océano',
    description: 'Más limpio y técnico, con azules fríos y mejor lectura en oscuro.',
    modes: {
      dark: {
        vars: {
          '--bg': '#06131f',
          '--surface': '#0a1929',
          '--surface-elevated': '#0f2336',
          '--border': 'rgba(56,189,248,.22)',
          '--accent': '#38bdf8',
          '--text': '#e6f4ff',
          '--text-secondary': '#94a9c9',
          '--text-muted': '#6b7280',
        },
      },
      light: {
        vars: {
          '--bg': '#f3fbff',
          '--surface': '#f9fdff',
          '--surface-elevated': '#ffffff',
          '--border': 'rgba(14,165,233,.18)',
          '--accent': '#0284c7',
          '--text': '#102a43',
          '--text-secondary': '#5c6f82',
          '--text-muted': '#9ca3af',
        },
      },
    },
  },
  forest: {
    label: 'Bosque',
    description: 'Verde sereno con contraste natural y un tono más orgánico.',
    modes: {
      dark: {
        vars: {
          '--bg': '#08120d',
          '--surface': '#0d1912',
          '--surface-elevated': '#132219',
          '--border': 'rgba(74,222,128,.18)',
          '--accent': '#4ade80',
          '--text': '#edfdf2',
          '--text-secondary': '#98b7a2',
          '--text-muted': '#6b7280',
        },
      },
      light: {
        vars: {
          '--bg': '#f6fff8',
          '--surface': '#fafff9',
          '--surface-elevated': '#ffffff',
          '--border': 'rgba(34,197,94,.16)',
          '--accent': '#16a34a',
          '--text': '#16361f',
          '--text-secondary': '#5f7a68',
          '--text-muted': '#9ca3af',
        },
      },
    },
  },
  lavender: {
    label: 'Lavanda',
    description: 'Suave y editorial, con violetas apagados y mejor separación visual.',
    modes: {
      dark: {
        vars: {
          '--bg': '#120f1d',
          '--surface': '#1a1628',
          '--surface-elevated': '#221b34',
          '--border': 'rgba(167,139,250,.22)',
          '--accent': '#a78bfa',
          '--text': '#f3efff',
          '--text-secondary': '#b6a8d6',
          '--text-muted': '#6b7280',
        },
      },
      light: {
        vars: {
          '--bg': '#fcf8ff',
          '--surface': '#fefcff',
          '--surface-elevated': '#ffffff',
          '--border': 'rgba(167,139,250,.18)',
          '--accent': '#8b5cf6',
          '--text': '#2a1f3d',
          '--text-secondary': '#75658d',
          '--text-muted': '#9ca3af',
        },
      },
    },
  },
  paper: {
    label: 'Papel',
    description: 'Más táctil y clásico, con tonos crema y contraste menos estridente.',
    modes: {
      dark: {
        vars: {
          '--bg': '#171311',
          '--surface': '#1e1916',
          '--surface-elevated': '#26201b',
          '--border': 'rgba(212,175,107,.18)',
          '--accent': '#d4af6b',
          '--text': '#f4eee3',
          '--text-secondary': '#b8aa96',
          '--text-muted': '#6b7280',
        },
      },
      light: {
        vars: {
          '--bg': '#f7f1e6',
          '--surface': '#fbf7ed',
          '--surface-elevated': '#fffdf8',
          '--border': 'rgba(181,139,72,.18)',
          '--accent': '#b58b48',
          '--text': '#30261a',
          '--text-secondary': '#7d6c55',
          '--text-muted': '#9ca3af',
        },
      },
    },
  },
  highContrast: {
    label: 'Alto contraste',
    description: 'Más nítido y legible, pensado para separar mejor texto, superficies y acciones.',
    modes: {
      dark: {
        vars: {
          '--bg': '#060708',
          '--surface': '#0d0e10',
          '--surface-elevated': '#111315',
          '--border': 'rgba(125,211,252,.28)',
          '--accent': '#7dd3fc',
          '--text': '#f8fafc',
          '--text-secondary': '#cbd5e1',
          '--text-muted': '#94a3b8',
        },
      },
      light: {
        vars: {
          '--bg': '#f9fbff',
          '--surface': '#fcfdff',
          '--surface-elevated': '#ffffff',
          '--border': 'rgba(2,132,199,.26)',
          '--accent': '#0369a1',
          '--text': '#0f172a',
          '--text-secondary': '#475569',
          '--text-muted': '#64748b',
        },
      },
    },
  },
}

export const DEFAULT_THEME: ThemeId = 'ember'
export const DEFAULT_MODE: ThemeMode = 'dark'

export function applyTheme(themeId: ThemeId, mode: ThemeMode) {
  const theme = THEMES[themeId]
  if (!theme) return

  const vars = theme.modes[mode].vars
  const root = document.documentElement

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}

export function getStoredTheme(): ThemeId {
  const stored = localStorage.getItem('ui_theme')
  return (stored as ThemeId) || DEFAULT_THEME
}

export function getStoredMode(): ThemeMode {
  const stored = localStorage.getItem('ui_theme_mode')
  return (stored as ThemeMode) || DEFAULT_MODE
}

export function setStoredTheme(themeId: ThemeId) {
  localStorage.setItem('ui_theme', themeId)
}

export function setStoredMode(mode: ThemeMode) {
  localStorage.setItem('ui_theme_mode', mode)
}

export function getPaperTextureSettings() {
  return {
    enabled: localStorage.getItem('ui_paper_texture_enabled') === 'true',
    level: Number(localStorage.getItem('ui_paper_texture_level') || '0'),
    globalEnabled: localStorage.getItem('ui_paper_texture_global_enabled') === 'true',
    globalLevel: Number(localStorage.getItem('ui_paper_texture_global_level') || '0'),
  }
}

export function setPaperTextureSettings(settings: {
  enabled?: boolean
  level?: number
  globalEnabled?: boolean
  globalLevel?: number
}) {
  if (settings.enabled !== undefined) {
    localStorage.setItem('ui_paper_texture_enabled', String(settings.enabled))
  }
  if (settings.level !== undefined) {
    localStorage.setItem('ui_paper_texture_level', String(settings.level))
  }
  if (settings.globalEnabled !== undefined) {
    localStorage.setItem('ui_paper_texture_global_enabled', String(settings.globalEnabled))
  }
  if (settings.globalLevel !== undefined) {
    localStorage.setItem('ui_paper_texture_global_level', String(settings.globalLevel))
  }
}

export function applyPaperTexture(settings: ReturnType<typeof getPaperTextureSettings>) {
  const root = document.documentElement
  
  // Textura de fondo
  root.style.setProperty('--paper-opacity', settings.enabled ? String(settings.level / 100) : '0')
  root.style.setProperty('--paper-contrast', settings.enabled ? '1' : '1')
  
  // Textura global
  root.style.setProperty('--paper-global-opacity', settings.globalEnabled ? String(settings.globalLevel / 100) : '0')
  root.style.setProperty('--paper-global-contrast', settings.globalEnabled ? '1' : '1')
}

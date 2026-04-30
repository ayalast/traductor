export type ThemeMode = 'dark' | 'light'

export type ThemeId = 'libre' | 'ember' | 'ocean' | 'forest' | 'lavender' | 'paper' | 'highContrast'

export type ThemeVars = Record<string, string>

export type Theme = {
  label: string
  description: string
  modes: {
    dark: { vars: ThemeVars }
    light: { vars: ThemeVars }
  }
}

const DARK_SEMANTIC_DEFAULTS: ThemeVars = {
  '--danger-bg': 'rgba(239, 68, 68, 0.14)',
  '--danger-bg-hover': 'rgba(239, 68, 68, 0.24)',
  '--danger-border': 'rgba(248, 113, 113, 0.45)',
  '--danger-text': '#fecaca',
  '--danger-text-hover': '#ffffff',
  '--error-bg': 'rgba(239, 68, 68, 0.16)',
  '--error-border': 'rgba(248, 113, 113, 0.42)',
  '--error-text': '#fecaca',
  '--warning-bg': '#f59e0b',
  '--warning-text': '#111827',
  '--log-error-bg': 'rgba(248, 113, 113, 0.14)',
  '--log-error-border': 'rgba(248, 113, 113, 0.45)',
  '--log-error-text': '#fca5a5',
  '--log-warn-bg': 'rgba(251, 191, 36, 0.14)',
  '--log-warn-border': 'rgba(251, 191, 36, 0.45)',
  '--log-warn-text': '#fbbf24',
  '--log-info-bg': 'rgba(147, 197, 253, 0.14)',
  '--log-info-border': 'rgba(147, 197, 253, 0.45)',
  '--log-info-text': '#93c5fd',
  '--log-debug-bg': 'rgba(203, 213, 225, 0.12)',
  '--log-debug-border': 'rgba(203, 213, 225, 0.32)',
  '--log-debug-text': '#cbd5e1',
}

const LIGHT_SEMANTIC_DEFAULTS: ThemeVars = {
  '--danger-bg': 'rgba(220, 38, 38, 0.08)',
  '--danger-bg-hover': 'rgba(220, 38, 38, 0.14)',
  '--danger-border': 'rgba(185, 28, 28, 0.35)',
  '--danger-text': '#991b1b',
  '--danger-text-hover': '#7f1d1d',
  '--error-bg': 'rgba(220, 38, 38, 0.08)',
  '--error-border': 'rgba(185, 28, 28, 0.35)',
  '--error-text': '#b91c1c',
  '--warning-bg': '#f59e0b',
  '--warning-text': '#111827',
  '--log-error-bg': 'rgba(220, 38, 38, 0.08)',
  '--log-error-border': 'rgba(185, 28, 28, 0.35)',
  '--log-error-text': '#b91c1c',
  '--log-warn-bg': 'rgba(217, 119, 6, 0.10)',
  '--log-warn-border': 'rgba(146, 64, 14, 0.35)',
  '--log-warn-text': '#92400e',
  '--log-info-bg': 'rgba(37, 99, 235, 0.08)',
  '--log-info-border': 'rgba(29, 78, 216, 0.32)',
  '--log-info-text': '#1d4ed8',
  '--log-debug-bg': 'rgba(71, 85, 105, 0.08)',
  '--log-debug-border': 'rgba(71, 85, 105, 0.28)',
  '--log-debug-text': '#475569',
}

function hexToRgb(hex: string) {
  const value = hex.replace('#', '')
  if (value.length !== 6) return null

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  }
}

function channelToLinear(value: number) {
  const channel = value / 255
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(hex: string) {
  const rgb = hexToRgb(hex)
  if (!rgb) return null

  return 0.2126 * channelToLinear(rgb.r) + 0.7152 * channelToLinear(rgb.g) + 0.0722 * channelToLinear(rgb.b)
}

function contrastRatio(colorA: string, colorB: string) {
  const luminanceA = relativeLuminance(colorA)
  const luminanceB = relativeLuminance(colorB)
  if (luminanceA == null || luminanceB == null) return 0

  const lighter = Math.max(luminanceA, luminanceB)
  const darker = Math.min(luminanceA, luminanceB)
  return (lighter + 0.05) / (darker + 0.05)
}

function getHexColors(value: string) {
  return value.match(/#[0-9a-f]{6}/gi) ?? []
}

function pickReadableText(value: string, fallback: string) {
  const colors = getHexColors(value)
  if (!colors.length) return fallback

  const whiteMinContrast = Math.min(...colors.map((color) => contrastRatio('#ffffff', color)))
  const blackMinContrast = Math.min(...colors.map((color) => contrastRatio('#000000', color)))
  return blackMinContrast > whiteMinContrast ? '#000000' : '#ffffff'
}

function withThemeDefaults(mode: ThemeMode, vars: ThemeVars): ThemeVars {
  const defaults = mode === 'dark' ? DARK_SEMANTIC_DEFAULTS : LIGHT_SEMANTIC_DEFAULTS
  const merged = { ...defaults, ...vars }
  const fallbackText = mode === 'dark' ? '#ffffff' : '#000000'
  const fallbackLink = mode === 'dark' ? merged['--accent'] : merged['--text-emphasis']
  const fallbackLinkHover = mode === 'dark' ? merged['--accent-secondary'] : merged['--text-heading']

  return {
    ...merged,
    '--accent-text': vars['--accent-text'] ?? pickReadableText(merged['--accent'], fallbackText),
    '--primary-text': vars['--primary-text'] ?? pickReadableText(merged['--send-grad'] || merged['--accent'], fallbackText),
    '--avatar-text': vars['--avatar-text'] ?? pickReadableText(merged['--logo-grad'] || merged['--accent'], fallbackText),
    '--badge-bg': vars['--badge-bg'] ?? 'var(--accent)',
    '--badge-border': vars['--badge-border'] ?? 'color-mix(in srgb, var(--accent), var(--border) 45%)',
    '--badge-text': vars['--badge-text'] ?? 'var(--accent-text)',
    '--link-color': vars['--link-color'] ?? fallbackLink,
    '--link-hover': vars['--link-hover'] ?? fallbackLinkHover,
  }
}

export const THEMES: Record<ThemeId, Theme> = {
  libre: {
    label: 'Libre (ChatGPT)',
    description: 'Estilo minimalista inspirado en ChatGPT y LibreChat.',
    modes: {
      dark: {
        vars: withThemeDefaults('dark', {
          '--bg': '#0d0d0d',
          '--surface': '#171717',
          '--surface-elevated': '#212121',
          '--border': '#2f2f2f',
          '--accent': '#10a37f',
          '--accent-secondary': '#349072',
          '--text': '#ececec',
          '--text-secondary': '#cdcdcd',
          '--text-muted': '#999696',
          '--text-heading': '#ffffff',
          '--text-emphasis': '#ffffff',
          '--bubble-user': '#121212',
          '--bubble-user-text': '#ececec',
          '--send-grad': '#10a37f',
          '--logo-grad': 'linear-gradient(135deg, #10a37f, #349072)',
          '--title-grad': 'linear-gradient(90deg, #ececec, #10a37f)',
          '--send-shadow': 'rgba(0, 0, 0, 0.3)',
          '--send-shadow-hover': 'rgba(0, 0, 0, 0.4)',
          '--glow-1': 'rgba(16, 163, 127, 0.05)',
          '--glow-2': 'rgba(0, 0, 0, 0)',
        }),
      },
      light: {
        vars: withThemeDefaults('light', {
          '--bg': '#ffffff',
          '--surface': '#f7f7f8',
          '--surface-elevated': '#ececf1',
          '--border': '#e5e5e5',
          '--accent': '#10a37f',
          '--accent-secondary': '#126e6b',
          '--text': '#171717',
          '--text-secondary': '#424242',
          '--text-muted': '#595959',
          '--text-heading': '#171717',
          '--text-emphasis': '#171717',
          '--bubble-user': '#fbfbfb',
          '--bubble-user-text': '#171717',
          '--send-grad': '#10a37f',
          '--logo-grad': 'linear-gradient(135deg, #10a37f, #34d399)',
          '--title-grad': 'linear-gradient(90deg, #171717, #10a37f)',
          '--send-shadow': 'rgba(16, 163, 127, 0.15)',
          '--send-shadow-hover': 'rgba(16, 163, 127, 0.25)',
          '--glow-1': 'rgba(16, 163, 127, 0.03)',
          '--glow-2': 'rgba(0, 0, 0, 0)',
        }),
      },
    },
  },
  ember: {
    label: 'Ámbar',
    description: 'Cálido y cinematográfico, con naranjas suaves y profundidad de cobre.',
    modes: {
      dark: {
        vars: withThemeDefaults('dark', {
          '--bg': '#0a0c14',
          '--surface': '#0f1219',
          '--surface-elevated': '#181c2e',
          '--border': 'rgba(241,99,52,0.22)',
          '--accent': '#f16334',
          '--accent-secondary': '#fb923c',
          '--text': '#eef1ff',
          '--text-secondary': '#9ba3c7',
          '--text-muted': '#9ca3af',
          '--text-heading': '#ffd9bf',
          '--text-emphasis': '#e9c87f',
          '--bubble-user': '#1a1412',
          '--bubble-user-text': '#eef1ff',
          '--send-grad': 'linear-gradient(135deg, #9a3412, #c2410c)',
          '--logo-grad': 'linear-gradient(135deg, #9a3412, #c2410c)',
          '--title-grad': 'linear-gradient(90deg, #eef1ff, #fb923c)',
          '--send-shadow': 'rgba(241, 99, 52, 0.4)',
          '--send-shadow-hover': 'rgba(241, 99, 52, 0.55)',
          '--glow-1': 'rgba(241, 99, 52, 0.14)',
          '--glow-2': 'rgba(251, 146, 60, 0.10)',
        }),
      },
      light: {
        vars: withThemeDefaults('light', {
          '--bg': '#fff8f1',
          '--surface': '#ffffff',
          '--surface-elevated': '#fffcf7',
          '--border': 'rgba(221, 107, 32, 0.15)',
          '--accent': '#dd6b20',
          '--accent-secondary': '#f6ad55',
          '--text': '#2d1b12',
          '--text-secondary': '#7b5e4b',
          '--text-muted': '#6b5b4c',
          '--text-heading': '#7b341e',
          '--text-emphasis': '#9c4221',
          '--bubble-user': '#fff5eb',
          '--bubble-user-text': '#2d1b12',
          '--send-grad': 'linear-gradient(135deg, #dd6b20, #ed8936)',
          '--logo-grad': 'linear-gradient(135deg, #dd6b20, #f6ad55)',
          '--title-grad': 'linear-gradient(90deg, #2d1b12, #dd6b20)',
          '--send-shadow': 'rgba(221, 107, 32, 0.25)',
          '--send-shadow-hover': 'rgba(221, 107, 32, 0.4)',
          '--glow-1': 'rgba(221, 107, 32, 0.08)',
          '--glow-2': 'rgba(246, 173, 85, 0.06)',
        }),
      },
    },
  },
  ocean: {
    label: 'Océano',
    description: 'Limpio y técnico, con azules fríos y gran legibilidad.',
    modes: {
      dark: {
        vars: withThemeDefaults('dark', {
          '--bg': '#060d17',
          '--surface': '#0b1624',
          '--surface-elevated': '#122236',
          '--border': 'rgba(56,189,248,0.2)',
          '--accent': '#38bdf8',
          '--accent-secondary': '#7dd3fc',
          '--text': '#e6f4ff',
          '--text-secondary': '#94a9c9',
          '--text-muted': '#94a3b8',
          '--text-heading': '#bae6fd',
          '--text-emphasis': '#7dd3fc',
          '--bubble-user': '#0d131a',
          '--bubble-user-text': '#e6f4ff',
          '--send-grad': 'linear-gradient(135deg, #075985, #0369a1)',
          '--logo-grad': 'linear-gradient(135deg, #0ea5e9, #7dd3fc)',
          '--title-grad': 'linear-gradient(90deg, #e6f4ff, #38bdf8)',
          '--send-shadow': 'rgba(14, 165, 233, 0.4)',
          '--send-shadow-hover': 'rgba(14, 165, 233, 0.55)',
          '--glow-1': 'rgba(14, 165, 233, 0.12)',
          '--glow-2': 'rgba(125, 211, 252, 0.08)',
        }),
      },
      light: {
        vars: withThemeDefaults('light', {
          '--bg': '#f0f9ff',
          '--surface': '#ffffff',
          '--surface-elevated': '#f8fcff',
          '--border': 'rgba(2, 132, 199, 0.12)',
          '--accent': '#0284c7',
          '--accent-secondary': '#38bdf8',
          '--text': '#0c4a6e',
          '--text-secondary': '#334155',
          '--text-muted': '#64748b',
          '--text-heading': '#075985',
          '--text-emphasis': '#0369a1',
          '--bubble-user': '#f0f7ff',
          '--bubble-user-text': '#0c4a6e',
          '--send-grad': 'linear-gradient(135deg, #0284c7, #0ea5e9)',
          '--logo-grad': 'linear-gradient(135deg, #0284c7, #38bdf8)',
          '--title-grad': 'linear-gradient(90deg, #0c4a6e, #0284c7)',
          '--send-shadow': 'rgba(2, 132, 199, 0.2)',
          '--send-shadow-hover': 'rgba(2, 132, 199, 0.35)',
          '--glow-1': 'rgba(2, 132, 199, 0.06)',
          '--glow-2': 'rgba(56, 189, 248, 0.05)',
        }),
      },
    },
  },
  forest: {
    label: 'Bosque',
    description: 'Verde sereno con contraste natural y un tono más orgánico.',
    modes: {
      dark: {
        vars: withThemeDefaults('dark', {
          '--bg': '#060f0a',
          '--surface': '#0c1a12',
          '--surface-elevated': '#152b1b',
          '--border': 'rgba(74,222,128,0.15)',
          '--accent': '#4ade80',
          '--accent-secondary': '#86efac',
          '--text': '#edfdf2',
          '--text-secondary': '#94a3b8',
          '--text-muted': '#9bb5a3',
          '--text-heading': '#dcfce7',
          '--text-emphasis': '#86efac',
          '--bubble-user': '#0d1a14',
          '--bubble-user-text': '#edfdf2',
          '--send-grad': 'linear-gradient(135deg, #166534, #15803d)',
          '--logo-grad': 'linear-gradient(135deg, #22c55e, #86efac)',
          '--title-grad': 'linear-gradient(90deg, #edfdf2, #4ade80)',
          '--send-shadow': 'rgba(34, 197, 94, 0.3)',
          '--send-shadow-hover': 'rgba(34, 197, 94, 0.45)',
          '--glow-1': 'rgba(34, 197, 94, 0.1)',
          '--glow-2': 'rgba(134, 239, 172, 0.06)',
        }),
      },
      light: {
        vars: withThemeDefaults('light', {
          '--bg': '#f0fdf4',
          '--surface': '#ffffff',
          '--surface-elevated': '#f7fee7',
          '--border': 'rgba(22, 163, 74, 0.1)',
          '--accent': '#16a34a',
          '--accent-secondary': '#4ade80',
          '--text': '#064e3b',
          '--text-secondary': '#334155',
          '--text-muted': '#64748b',
          '--text-heading': '#065f46',
          '--text-emphasis': '#047857',
          '--bubble-user': '#f0fff4',
          '--bubble-user-text': '#064e3b',
          '--send-grad': 'linear-gradient(135deg, #16a34a, #22c55e)',
          '--logo-grad': 'linear-gradient(135deg, #16a34a, #4ade80)',
          '--title-grad': 'linear-gradient(90deg, #064e3b, #16a34a)',
          '--send-shadow': 'rgba(22, 163, 74, 0.15)',
          '--send-shadow-hover': 'rgba(22, 163, 74, 0.25)',
          '--glow-1': 'rgba(22, 163, 74, 0.05)',
          '--glow-2': 'rgba(74, 222, 128, 0.04)',
        }),
      },
    },
  },
  lavender: {
    label: 'Lavanda',
    description: 'Suave y editorial, con violetas apagados y mejor separación visual.',
    modes: {
      dark: {
        vars: withThemeDefaults('dark', {
          '--bg': '#0f0a1a',
          '--surface': '#161026',
          '--surface-elevated': '#221a36',
          '--border': 'rgba(167,139,250,0.18)',
          '--accent': '#a78bfa',
          '--accent-secondary': '#c4b5fd',
          '--text': '#f3efff',
          '--text-secondary': '#b6a8d6',
          '--text-muted': '#9ca3af',
          '--text-heading': '#ede9fe',
          '--text-emphasis': '#c4b5fd',
          '--bubble-user': '#14111a',
          '--bubble-user-text': '#f3efff',
          '--send-grad': 'linear-gradient(135deg, #6d28d9, #7c3aed)',
          '--logo-grad': 'linear-gradient(135deg, #8b5cf6, #c4b5fd)',
          '--title-grad': 'linear-gradient(90deg, #f3efff, #a78bfa)',
          '--send-shadow': 'rgba(139, 92, 246, 0.35)',
          '--send-shadow-hover': 'rgba(139, 92, 246, 0.5)',
          '--glow-1': 'rgba(139, 92, 246, 0.12)',
          '--glow-2': 'rgba(196, 181, 253, 0.08)',
        }),
      },
      light: {
        vars: withThemeDefaults('light', {
          '--bg': '#f5f3ff',
          '--surface': '#ffffff',
          '--surface-elevated': '#fdfcff',
          '--border': 'rgba(124, 58, 237, 0.1)',
          '--accent': '#7c3aed',
          '--accent-secondary': '#a78bfa',
          '--text': '#2e1065',
          '--text-secondary': '#475569',
          '--text-muted': '#64748b',
          '--text-heading': '#4c1d95',
          '--text-emphasis': '#5b21b6',
          '--bubble-user': '#f5f3ff',
          '--bubble-user-text': '#2e1065',
          '--send-grad': 'linear-gradient(135deg, #6d28d9, #7c3aed)',
          '--logo-grad': 'linear-gradient(135deg, #6d28d9, #7c3aed)',
          '--title-grad': 'linear-gradient(90deg, #2e1065, #7c3aed)',
          '--send-shadow': 'rgba(124, 58, 237, 0.18)',
          '--send-shadow-hover': 'rgba(124, 58, 237, 0.3)',
          '--glow-1': 'rgba(124, 58, 237, 0.06)',
          '--glow-2': 'rgba(167, 139, 250, 0.05)',
        }),
      },
    },
  },
  paper: {
    label: 'Papel',
    description: 'Táctil y clásico, con tonos crema y contraste elegante.',
    modes: {
      dark: {
        vars: withThemeDefaults('dark', {
          '--bg': '#141210',
          '--surface': '#1c1917',
          '--surface-elevated': '#292522',
          '--border': 'rgba(212,175,107,0.15)',
          '--accent': '#d4af37',
          '--accent-secondary': '#e9c87f',
          '--text': '#f4eee3',
          '--text-secondary': '#b8aa96',
          '--text-muted': '#a8a29e',
          '--text-heading': '#fafaf9',
          '--text-emphasis': '#e9c87f',
          '--bubble-user': '#1a1816',
          '--bubble-user-text': '#f4eee3',
          '--send-grad': 'linear-gradient(135deg, #854d0e, #a16207)',
          '--logo-grad': 'linear-gradient(135deg, #b7791f, #e9c87f)',
          '--title-grad': 'linear-gradient(90deg, #f4eee3, #d4af37)',
          '--send-shadow': 'rgba(161, 98, 7, 0.3)',
          '--send-shadow-hover': 'rgba(161, 98, 7, 0.45)',
          '--glow-1': 'rgba(161, 98, 7, 0.1)',
          '--glow-2': 'rgba(233, 200, 127, 0.06)',
        }),
      },
      light: {
        vars: withThemeDefaults('light', {
          '--bg': '#fcfaf2',
          '--surface': '#ffffff',
          '--surface-elevated': '#fffdf5',
          '--border': 'rgba(133, 77, 14, 0.1)',
          '--accent': '#a16207',
          '--accent-secondary': '#d4af37',
          '--text': '#422006',
          '--text-secondary': '#57534e',
          '--text-muted': '#78716c',
          '--text-heading': '#451a03',
          '--text-emphasis': '#78350f',
          '--bubble-user': '#fdfbf7',
          '--bubble-user-text': '#422006',
          '--send-grad': 'linear-gradient(135deg, #b7791f, #ca8a04)',
          '--logo-grad': 'linear-gradient(135deg, #b7791f, #d4af37)',
          '--title-grad': 'linear-gradient(90deg, #422006, #a16207)',
          '--send-shadow': 'rgba(161, 98, 7, 0.15)',
          '--send-shadow-hover': 'rgba(161, 98, 7, 0.25)',
          '--glow-1': 'rgba(161, 98, 7, 0.05)',
          '--glow-2': 'rgba(212, 175, 55, 0.04)',
        }),
      },
    },
  },
  highContrast: {
    label: 'Alto contraste',
    description: 'Nitidez extrema para máxima accesibilidad.',
    modes: {
      dark: {
        vars: withThemeDefaults('dark', {
          '--bg': '#000000',
          '--surface': '#111111',
          '--surface-elevated': '#222222',
          '--border': '#ffffff',
          '--accent': '#ffffff',
          '--accent-secondary': '#ffffff',
          '--text': '#ffffff',
          '--text-secondary': '#ffffff',
          '--text-muted': '#aaaaaa',
          '--text-heading': '#ffffff',
          '--text-emphasis': '#ffffff',
          '--bubble-user': '#333333',
          '--bubble-user-text': '#ffffff',
          '--send-grad': '#ffffff',
          '--logo-grad': '#ffffff',
          '--title-grad': 'linear-gradient(90deg, #ffffff, #ffffff)',
          '--send-shadow': 'rgba(255, 255, 255, 0.1)',
          '--send-shadow-hover': 'rgba(255, 255, 255, 0.2)',
          '--glow-1': 'rgba(255, 255, 255, 0.05)',
          '--glow-2': 'rgba(255, 255, 255, 0.05)',
        }),
      },
      light: {
        vars: withThemeDefaults('light', {
          '--bg': '#ffffff',
          '--surface': '#f9f9f9',
          '--surface-elevated': '#eeeeee',
          '--border': '#000000',
          '--accent': '#000000',
          '--accent-secondary': '#000000',
          '--text': '#000000',
          '--text-secondary': '#000000',
          '--text-muted': '#555555',
          '--text-heading': '#000000',
          '--text-emphasis': '#000000',
          '--bubble-user': '#eeeeee',
          '--bubble-user-text': '#000000',
          '--send-grad': 'linear-gradient(135deg, #000000, #333333)',
          '--logo-grad': 'linear-gradient(135deg, #000000, #555555)',
          '--title-grad': 'linear-gradient(90deg, #000000, #000000)',
          '--send-shadow': 'rgba(0, 0, 0, 0.1)',
          '--send-shadow-hover': 'rgba(0, 0, 0, 0.2)',
          '--glow-1': 'rgba(0, 0, 0, 0.05)',
          '--glow-2': 'rgba(0, 0, 0, 0.05)',
        }),
      },
    },
  },
}

export const DEFAULT_THEME: ThemeId = 'libre'
export const DEFAULT_MODE: ThemeMode = 'dark'

function isThemeId(value: string | null): value is ThemeId {
  return Boolean(value && value in THEMES)
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'dark' || value === 'light'
}

export function applyTheme(themeId: ThemeId, mode: ThemeMode) {
  const normalizedThemeId = isThemeId(themeId) ? themeId : DEFAULT_THEME
  const normalizedMode = isThemeMode(mode) ? mode : DEFAULT_MODE
  const theme = THEMES[normalizedThemeId]

  const vars = theme.modes[normalizedMode].vars
  const root = document.documentElement

  // Aplicamos color-scheme nativo
  root.style.colorScheme = normalizedMode
  root.setAttribute('data-theme-mode', normalizedMode)

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}

export function getStoredTheme(): ThemeId {
  const stored = localStorage.getItem('ui_theme')
  return isThemeId(stored) ? stored : DEFAULT_THEME
}

export function getStoredMode(): ThemeMode {
  const stored = localStorage.getItem('ui_theme_mode')
  return isThemeMode(stored) ? stored : DEFAULT_MODE
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

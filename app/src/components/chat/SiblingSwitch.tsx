import React from 'react'

type SiblingSwitchProps = {
  siblingIdx: number
  siblingCount: number
  onSwitch: (index: number) => void
}

export function SiblingSwitch({ siblingIdx, siblingCount, onSwitch }: SiblingSwitchProps) {
  if (siblingCount <= 1) return null

  return (
    <nav className="sibling-switch" aria-label="Navegación de versiones">
      <button
        className="sibling-switch__btn"
        type="button"
        onClick={() => onSwitch(siblingIdx - 1)}
        disabled={siblingIdx === 0}
        aria-label="Versión anterior"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      
      <span className="sibling-switch__status">
        {siblingIdx + 1} / {siblingCount}
      </span>
      
      <button
        className="sibling-switch__btn"
        type="button"
        onClick={() => onSwitch(siblingIdx + 1)}
        disabled={siblingIdx === siblingCount - 1}
        aria-label="Siguiente versión"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </nav>
  )
}

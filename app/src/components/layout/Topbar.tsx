import type { ReactNode } from 'react'

type TopbarProps = {
  title: ReactNode
  actions?: ReactNode
  banner?: ReactNode
}

export function Topbar({ title, actions, banner }: TopbarProps) {
  return (
    <>
      <header className="topbar">
        {title}
        {actions ? <div className="topbar__actions">{actions}</div> : null}
      </header>
      {banner}
    </>
  )
}

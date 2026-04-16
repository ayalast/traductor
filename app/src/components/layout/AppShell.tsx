import type { ReactNode } from 'react'

type AppShellProps = {
  sidebar: ReactNode
  header: ReactNode
  content: ReactNode
  inspector?: ReactNode
  composer?: ReactNode
}

export function AppShell({ sidebar, header, content, inspector, composer }: AppShellProps) {
  return (
    <div className="app-shell">
      {sidebar}
      <main className="main-panel">
        {header}
        <section className="chat-layout">
          {content}
          {inspector}
        </section>
        {composer}
      </main>
    </div>
  )
}

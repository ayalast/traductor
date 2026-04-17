import { useEffect, useState, type ReactNode } from 'react'

type AppShellProps = {
  sidebar: ReactNode
  header: ReactNode
  content: ReactNode
  inspector?: ReactNode
  composer?: ReactNode
  isSidebarOpen?: boolean
  onCloseSidebar?: () => void
}

export function AppShell({ 
  sidebar, 
  header, 
  content, 
  inspector, 
  composer, 
  isSidebarOpen = true,
  onCloseSidebar
}: AppShellProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className={`app-shell ${!isSidebarOpen ? 'app-shell--sidebar-closed' : ''}`}>
      {isMobile && isSidebarOpen && <div className="sidebar-backdrop" onClick={onCloseSidebar} />}
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

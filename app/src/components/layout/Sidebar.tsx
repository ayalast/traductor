import type { ReactNode } from 'react'

type SidebarProps = {
  header: ReactNode
  search: ReactNode
  conversations: ReactNode
  account: ReactNode
}

export function Sidebar({ header, search, conversations, account }: SidebarProps) {
  return (
    <aside className="sidebar">
      {header}
      {search}
      {conversations}
      {account}
    </aside>
  )
}

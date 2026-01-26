import * as React from 'react'
import cn from 'classnames'

type Tab = {
  id: string
  label: React.ReactNode
}

type TabsProps = {
  tabs: Tab[]
  activeId: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ tabs, activeId, onChange, className }: TabsProps) {
  return (
    <div className={cn('tabs', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={cn('tab', { active: tab.id === activeId })}
          onClick={() => onChange(tab.id)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}






import * as React from 'react'
import cn from 'classnames'

export function Card({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('card-surface p-6', className)}>
      {title ? <h3 className="font-semibold mb-2">{title}</h3> : null}
      {children}
    </div>
  )
}


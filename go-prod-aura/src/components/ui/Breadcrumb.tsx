import * as React from 'react'
import cn from 'classnames'
import { Icon } from './Icon'

type Crumb = {
  label: React.ReactNode
  href?: string
}

type BreadcrumbProps = {
  items: Crumb[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn('breadcrumb', className)} aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <React.Fragment key={index}>
            {item.href && !isLast ? (
              <a href={item.href} className="breadcrumb-item">
                {item.label}
              </a>
            ) : (
              <span className="breadcrumb-item">{item.label}</span>
            )}
            {!isLast ? <Icon name="ChevronRight" className="w-4 h-4 text-[var(--text-muted)]" /> : null}
          </React.Fragment>
        )
      })}
    </nav>
  )
}






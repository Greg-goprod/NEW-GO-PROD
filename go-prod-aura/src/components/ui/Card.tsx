import * as React from 'react'
import cn from 'classnames'

export interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, children, className }: CardProps) {
  return (
    <div className={cn('card-surface p-6 rounded-xl', className)}>
      {title && <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>}
      {children}
    </div>
  )
}





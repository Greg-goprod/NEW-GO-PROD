import * as React from 'react'
import cn from 'classnames'

type Item = {
  id: string
  title: React.ReactNode
  content: React.ReactNode
}

type AccordionProps = {
  items: Item[]
  defaultOpenId?: string
  className?: string
}

export function Accordion({ items, defaultOpenId, className }: AccordionProps) {
  const [openId, setOpenId] = React.useState<string | undefined>(defaultOpenId)

  return (
    <div className={className}>
      {items.map((item) => {
        const isOpen = item.id === openId
        return (
          <div 
            key={item.id} 
            className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
          >
            <button 
              className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              onClick={() => setOpenId(isOpen ? undefined : item.id)}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">{item.title}</span>
                <span className={cn('transition-transform text-gray-500 dark:text-gray-400', { 'rotate-180': isOpen })}>▾</span>
              </div>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                {item.content}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}






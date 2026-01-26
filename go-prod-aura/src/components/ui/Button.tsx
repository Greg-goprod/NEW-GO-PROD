import { clsx } from 'clsx'
import type { ComponentProps } from 'react'

type Props = ComponentProps<'button'> & { 
  variant?: 'primary' | 'secondary'
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export function Button({ className, variant='primary', leftIcon, rightIcon, children, ...rest }: Props) {
  return (
    <button
      className={clsx('btn', variant==='primary' ? 'btn-primary' : 'btn-secondary', className)}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  )
}

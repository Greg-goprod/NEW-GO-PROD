import cn from 'classnames'
import type { HTMLAttributes } from 'react'

const variantCls = {
  primary: 'badge badge-primary',
  success: 'badge badge-success',
  warning: 'badge badge-warning',
  error: 'badge badge-error',
}

type Variant = keyof typeof variantCls

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: Variant
}

export function Badge({ variant = 'primary', className, children, ...rest }: BadgeProps) {
  return (
    <span className={cn(variantCls[variant], className)} {...rest}>
      {children}
    </span>
  )
}






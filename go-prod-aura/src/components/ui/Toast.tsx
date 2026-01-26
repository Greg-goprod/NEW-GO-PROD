import * as React from 'react'
import cn from 'classnames'
import { Icon } from './Icon'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

const variantIcon: Record<ToastVariant, string> = {
  success: 'Check',
  error: 'AlertCircle',
  warning: 'AlertTriangle',
  info: 'Info',
}

const variantBg: Record<ToastVariant, string> = {
  success: 'rgba(34, 197, 94, 0.15)',
  error: 'rgba(239, 68, 68, 0.15)',
  warning: 'rgba(245, 158, 11, 0.15)',
  info: 'rgba(59, 130, 246, 0.15)',
}

type ToastProps = {
  title: string
  description?: string
  variant?: ToastVariant
  onClose?: () => void
  className?: string
  autoDismiss?: number
}

export function Toast({ title, description, variant = 'info', onClose, className, autoDismiss }: ToastProps) {
  React.useEffect(() => {
    if (!autoDismiss) return
    const id = window.setTimeout(() => onClose?.(), autoDismiss)
    return () => window.clearTimeout(id)
  }, [autoDismiss, onClose])

  return (
    <div className={cn('toast', className)}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: variantBg[variant] }}>
          <Icon name={variantIcon[variant] as any} className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold mb-1">{title}</div>
          {description ? <p className="text-sm text-[var(--text-secondary)]">{description}</p> : null}
        </div>
        {onClose ? (
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <Icon name="X" className="w-4 h-4" />
          </button>
        ) : null}
      </div>
    </div>
  )
}






import * as React from 'react'
import cn from 'classnames'

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  helperText?: string
  error?: string
}

export function Textarea({ label, helperText, error, className, ...rest }: Props) {
  return (
    <label className="flex flex-col gap-1">
      {label ? <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</span> : null}
      <textarea 
        className={cn('resize-vertical', className)}
        style={{
          minHeight: '100px',
          padding: '0.75rem',
          background: 'color-mix(in oklab, var(--color-bg-primary) 90%, white 8%)',
          color: 'var(--color-text-primary)',
          border: `1px solid ${error ? 'var(--color-error)' : 'color-mix(in oklab, var(--color-border) 140%, white 10%)'}`,
          borderRadius: '14px',
          transition: 'all 0.2s ease',
          outline: 'none',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,.25), 0 0 0 1px rgba(255,255,255,.03)'
        }}
        onFocus={(e) => {
          if (!error) {
            e.currentTarget.style.boxShadow = '0 0 0 2px color-mix(in oklab, var(--color-primary) 55%, transparent), inset 0 1px 3px rgba(0,0,0,.25)';
            e.currentTarget.style.borderColor = 'var(--color-primary)';
          }
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,.25), 0 0 0 1px rgba(255,255,255,.03)';
          e.currentTarget.style.borderColor = error ? 'var(--color-error)' : 'color-mix(in oklab, var(--color-border) 140%, white 10%)';
        }}
        {...rest} 
      />
      {error ? <span className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</span> : helperText ? <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{helperText}</span> : null}
    </label>
  )
}






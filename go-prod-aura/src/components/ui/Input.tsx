import * as React from 'react'
import cn from 'classnames'

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label?: string
  helperText?: string
  error?: string
  size?: 'default' | 'sm'
}

export function Input({ label, helperText, error, size = 'sm', className, ...rest }: Props) {
  const inputClass = size === 'sm' ? 'input-sm' : 'input';
  
  return (
    <label className="flex flex-col gap-2">
      {label ? <span className="text-sm text-[var(--text-muted)]">{label}</span> : null}
      <input className={cn(inputClass, className)} {...rest} />
      {error ? (
        <span className="text-sm text-[var(--error)]">{error}</span>
      ) : helperText ? (
        <span className="text-sm text-[var(--text-muted)]">{helperText}</span>
      ) : null}
    </label>
  )
}

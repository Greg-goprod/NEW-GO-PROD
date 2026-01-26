import * as React from 'react'
import cn from 'classnames'

type Option = { label: string; value: string }

type Props = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  label?: string
  helperText?: string
  error?: string
  options?: Option[]
  size?: 'default' | 'sm'
}

export function Select({ label, helperText, error, className, options, size = 'default', children, ...rest }: Props) {
  const selectClass = size === 'sm' ? 'select-sm' : 'select';
  
  return (
    <label className="flex flex-col gap-1">
      {label ? <span className="text-sm text-[var(--text-muted)]">{label}</span> : null}
      <select className={cn(selectClass, className)} {...rest}>
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {children}
      </select>
      {error ? <span className="text-sm" style={{ color: 'var(--error)' }}>{error}</span> : helperText ? <span className="text-sm text-[var(--text-muted)]">{helperText}</span> : null}
    </label>
  )
}






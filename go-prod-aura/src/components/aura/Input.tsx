import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export function Input({ label, helperText, error, className, ...rest }: InputProps) {
  return (
    <div className="flex flex-col gap-2 mb-2">
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {label}
        </label>
      )}
      <input
        className={`input ${className || ""}`}
        style={{
          ...(error ? { 
            borderColor: 'var(--color-error)', 
            boxShadow: '0 0 0 2px color-mix(in oklab, var(--color-error) 25%, transparent)' 
          } : {})
        }}
        {...rest}
      />
      {error && (
        <span className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</span>
      )}
      {helperText && !error && (
        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{helperText}</span>
      )}
    </div>
  );
}

type ProgressProps = {
  value: number
  max?: number
  className?: string
}

export function Progress({ value, max = 100, className }: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={`progress ${className ?? ''}`}>
      <div className="progress-bar" style={{ width: `${percentage}%` }} />
    </div>
  )
}






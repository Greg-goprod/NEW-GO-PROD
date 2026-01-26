import cn from 'classnames'

const sizeCls = {
  sm: 'avatar avatar-sm',
  md: 'avatar avatar-md',
  lg: 'avatar avatar-lg',
  xl: 'avatar avatar-xl',
}

type Size = keyof typeof sizeCls

type AvatarProps = {
  size?: Size
  src?: string
  alt?: string
  fallback?: string
  className?: string
}

export function Avatar({ size = 'md', src, alt, fallback, className }: AvatarProps) {
  if (src) {
    return <img src={src} alt={alt} className={cn(sizeCls[size], className)} />
  }
  return (
    <div className={cn(sizeCls[size], 'flex items-center justify-center text-white font-semibold', className)}>
      {fallback}
    </div>
  )
}






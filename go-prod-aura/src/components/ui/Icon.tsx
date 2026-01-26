import * as Lucide from 'lucide-react'
import type { ComponentProps } from 'react'

type IconName = keyof typeof Lucide
type Props = { 
  name: IconName
  size?: number
} & Omit<ComponentProps<'svg'>, 'name' | 'size'>

export function Icon({ name, size, ...rest }: Props) {
  const Cmp = Lucide[name] as React.ComponentType<Lucide.LucideProps>
  if (!Cmp) return null
  return <Cmp size={size} {...rest} />
}

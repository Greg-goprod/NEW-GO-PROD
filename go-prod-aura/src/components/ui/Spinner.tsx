export function Spinner({ size=8 }: { size?: number }) {
  const px = `${size * 0.25}rem`
  return (
    <div
      className="animate-spin rounded-full border-2 border-[color:color-mix(in_oklab,var(--info) 55%,transparent)] border-t-transparent"
      style={{ width: px, height: px }}
    />
  )
}

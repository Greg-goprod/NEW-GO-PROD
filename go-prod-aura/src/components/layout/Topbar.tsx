import { Icon } from '../ui/Icon'
import { ThemeToggle } from '../ui/ThemeToggle'

export function Topbar() {
  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-manrope tracking-tight">Dashboard</h1>
        <span className="badge badge-primary">Live</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Icon name="Search" className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input className="input pl-11 w-64" placeholder="Rechercher" />
        </div>
        <button className="btn btn-ghost btn-md">
          <Icon name="Bell" />
        </button>
        <ThemeToggle />
      </div>
    </header>
  )
}

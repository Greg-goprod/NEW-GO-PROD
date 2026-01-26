import { NavLink } from 'react-router-dom'
import { Icon } from '../ui/Icon'

const NAV_ITEMS = [
  { to: '/', label: 'Accueil', icon: 'Home' },
  { to: '/booking', label: 'Booking', icon: 'Briefcase' },
  { to: '/settings', label: 'Paramètres', icon: 'Settings' },
]

export function Sidebar() {
  return (
    <aside className="sidebar p-6 space-y-8">
      <div>
        <div className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Go-Prod</div>
        <div className="text-xl font-semibold text-white mt-1">Aura Dashboard</div>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
            <Icon name={item.icon as any} /> {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}






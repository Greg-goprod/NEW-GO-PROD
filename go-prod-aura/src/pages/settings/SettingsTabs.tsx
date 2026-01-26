import React from 'react';
import { NavLink } from 'react-router-dom';
import { Settings, Users, Phone, Shield, FileCheck, Clapperboard, Newspaper, ShieldCheck } from 'lucide-react';

const tabs = [
  {
    id: 'general',
    label: 'Général',
    icon: Settings,
    path: '/app/settings/general',
  },
  {
    id: 'artists',
    label: 'Artistes',
    icon: Users,
    path: '/app/settings/artists',
  },
  {
    id: 'booking',
    label: 'Booking',
    icon: FileCheck,
    path: '/app/settings/booking',
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: Shield,
    path: '/app/settings/admin',
  },
  {
    id: 'production',
    label: 'Production',
    icon: Clapperboard,
    path: '/app/settings/production',
  },
  {
    id: 'presse',
    label: 'Presse',
    icon: Newspaper,
    path: '/app/settings/presse',
  },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: Phone,
    path: '/app/settings/contacts',
  },
  {
    id: 'staff',
    label: 'Staff',
    icon: Users,
    path: '/app/settings/staff',
  },
  {
    id: 'permissions',
    label: 'COMPTE',
    icon: ShieldCheck,
    path: '/app/settings/permissions',
  },
];

export function SettingsTabs() {
  return (
    <div 
      className="border-b"
      style={{ 
        background: 'var(--bg-surface)',
        borderColor: 'var(--color-border)'
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <nav className="flex space-x-6 overflow-x-auto" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-1 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-violet-500 text-violet-500 dark:text-violet-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-violet-500 dark:hover:text-violet-400 hover:border-violet-300 dark:hover:border-gray-600'
                  }`
                }
                role="tab"
                aria-selected={false}
              >
                <Icon className="w-4 h-4" />
                <span className="uppercase">{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

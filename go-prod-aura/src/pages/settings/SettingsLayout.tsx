import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SettingsTabs } from './SettingsTabs';

export function SettingsLayout() {
  const location = useLocation();

  return (
    <div 
      className="flex flex-col"
      style={{ 
        background: 'var(--bg-primary)',
        // Utiliser toute la hauteur disponible dans le viewport moins la topbar
        height: 'calc(100vh - 64px)',
        marginTop: '-24px', // Compenser le padding du parent
        marginLeft: '-24px',
        marginRight: '-24px',
        marginBottom: '-24px',
      }}
    >
      {/* Header fixe avec titre, breadcrumb et onglets */}
      <div 
        className="flex-shrink-0"
        style={{ 
          background: 'var(--bg-surface)',
        }}
      >
        {/* Titre et breadcrumb */}
        <div 
          className="border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="max-w-7xl mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 
                  className="text-2xl font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Parametres
                </h1>
                <nav 
                  className="flex items-center space-x-2 text-sm mt-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span>Application</span>
                  <span>/</span>
                  <span style={{ color: 'var(--text-primary)' }}>Parametres</span>
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets persistants */}
        <SettingsTabs />
      </div>

      {/* Contenu principal - scrollable independamment */}
      <div className="flex-1 overflow-y-auto" data-settings-scroll-container>
        <div className="max-w-7xl mx-auto p-6">
          <div className="space-y-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

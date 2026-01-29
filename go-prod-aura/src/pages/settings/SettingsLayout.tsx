import { Outlet } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { PageHeader } from '@/components/aura/PageHeader';
import { SettingsTabs } from './SettingsTabs';

export function SettingsLayout() {
  return (
    <div className="space-y-6">
      {/* Header standard */}
      <PageHeader icon={Settings} title="PARAMETRES" />
      
      {/* Onglets de navigation */}
      <SettingsTabs />
      
      {/* Contenu de la sous-page */}
      <Outlet />
    </div>
  );
}

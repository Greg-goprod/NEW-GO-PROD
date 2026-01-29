import { Megaphone } from 'lucide-react';
import { PageHeader } from '@/components/aura/PageHeader';

export default function StaffCampaignsPage() {
  return (
    <div className="p-6">
      <PageHeader icon={Megaphone} title="STAFF CAMPAGNES" />

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Megaphone className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          Module en développement
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
          Gestion des campagnes de recrutement de bénévoles
        </p>
      </div>
    </div>
  );
}











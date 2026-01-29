import { Mail } from 'lucide-react';
import { PageHeader } from '@/components/aura/PageHeader';

export default function StaffCommunicationsPage() {
  return (
    <div className="p-6">
      <PageHeader icon={Mail} title="STAFF COMMUNICATIONS" />

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Mail className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          Module en développement
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
          Envoi d'emails et communications ciblées aux bénévoles
        </p>
      </div>
    </div>
  );
}











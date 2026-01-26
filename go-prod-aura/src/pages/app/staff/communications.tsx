import { Mail } from 'lucide-react';

export default function StaffCommunicationsPage() {
  return (
    <div className="p-6">
      <header className="flex items-center gap-2 mb-6">
        <Mail className="w-5 h-5 text-violet-400" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          STAFF • COMMUNICATIONS
        </h1>
      </header>

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











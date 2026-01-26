import { Settings } from "lucide-react";
import { useI18n } from "../../../lib/i18n";

export default function SettingsIndexPage() {
  const { t } = useI18n();
  
  return (
    <div className="p-6">
      <header className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-violet-400" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings').toUpperCase()}</h1>
      </header>

      {/* TODO: Implémenter la vue d'ensemble des paramètres */}
    </div>
  );
}

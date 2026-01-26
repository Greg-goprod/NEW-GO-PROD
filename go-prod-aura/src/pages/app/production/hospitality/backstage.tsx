import { DoorOpen } from "lucide-react";
import { useI18n } from "../../../../lib/i18n";

export default function BackstagePage() {
  const { t } = useI18n();
  
  return (
    <div className="p-6">
      <header className="flex items-center gap-2 mb-6">
        <DoorOpen className="w-5 h-5 text-violet-400" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('backstage').toUpperCase()}</h1>
      </header>

      {/* TODO: Implémenter la gestion du backstage (loges, accès, passes) */}
    </div>
  );
}

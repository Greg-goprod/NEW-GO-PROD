import { Settings } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { PageHeader } from "@/components/aura/PageHeader";

export default function SettingsIndexPage() {
  const { t } = useI18n();
  
  return (
    <div className="p-6">
      <PageHeader icon={Settings} title={t('settings').toUpperCase()} />

      {/* TODO: Implémenter la vue d'ensemble des paramètres */}
    </div>
  );
}

import { Clock } from "lucide-react";
import { useI18n } from "../../../../lib/i18n";
import { PageHeader } from "@/components/aura/PageHeader";

export default function HorairesPage() {
  const { t } = useI18n();
  
  return (
    <div className="p-6">
      <PageHeader icon={Clock} title={t('schedules').toUpperCase()} />

      {/* TODO: Implémenter la gestion des horaires de transport */}
    </div>
  );
}

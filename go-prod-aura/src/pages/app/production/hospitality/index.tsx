import { Coffee } from "lucide-react";
import { useI18n } from "../../../../lib/i18n";
import { PageHeader } from "@/components/aura/PageHeader";

export default function HospitalityPage() {
  const { t } = useI18n();
  
  return (
    <div className="p-6">
      <PageHeader icon={Coffee} title={t('hospitality').toUpperCase()} />

      {/* TODO: Implémenter la vue d'ensemble de l'hospitalité */}
    </div>
  );
}

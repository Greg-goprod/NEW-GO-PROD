import { Newspaper } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { PageHeader } from "@/components/aura/PageHeader";

export default function PressePage() {
  const { t } = useI18n();
  
  return (
    <div className="p-6">
      <PageHeader icon={Newspaper} title={t('press').toUpperCase()} />

      {/* TODO: Implémenter la gestion de la presse (communiqués, dossiers, contacts médias) */}
    </div>
  );
}

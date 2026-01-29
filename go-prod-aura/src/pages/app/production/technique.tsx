import { Wrench } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { PageHeader } from "@/components/aura/PageHeader";

export default function TechniquePage() {
  const { t } = useI18n();
  
  return (
    <div className="p-6">
      <PageHeader icon={Wrench} title={t('technique').toUpperCase()} />

      {/* TODO: Implémenter la gestion technique (matériel, setup, fiche technique) */}
    </div>
  );
}

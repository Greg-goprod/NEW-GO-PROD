import { Briefcase } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { PageHeader } from "@/components/aura/PageHeader";

export default function AdministrationPage() {
  const { t } = useI18n();
  
  return (
    <div className="p-6">
      <PageHeader icon={Briefcase} title={t('administration').toUpperCase()} />

      {/* TODO: Implémenter la vue d'ensemble administrative */}
    </div>
  );
}

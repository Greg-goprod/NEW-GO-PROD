import { DoorOpen } from "lucide-react";
import { useI18n } from "../../../../lib/i18n";
import { PageHeader } from "@/components/aura/PageHeader";

export default function BackstagePage() {
  const { t } = useI18n();
  
  return (
    <div className="p-6">
      <PageHeader icon={DoorOpen} title={t('backstage').toUpperCase()} />

      {/* TODO: Implémenter la gestion du backstage (loges, accès, passes) */}
    </div>
  );
}

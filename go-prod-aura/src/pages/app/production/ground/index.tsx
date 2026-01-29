import { Truck } from "lucide-react";
import { useI18n } from "../../../../lib/i18n";
import { PageHeader } from "@/components/aura/PageHeader";

export default function GroundPage() {
  const { t } = useI18n();
  
  return (
    <div className="p-6">
      <PageHeader icon={Truck} title={t('ground').toUpperCase()} />

      {/* TODO: Implémenter la vue d'ensemble du transport terrestre */}
    </div>
  );
}

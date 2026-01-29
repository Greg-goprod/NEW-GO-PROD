import { LayoutDashboard } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { PageHeader } from "@/components/aura/PageHeader";

export default function DashboardPage() {
  const { t } = useI18n();
  
  return (
    <div className="p-6">
      <PageHeader icon={LayoutDashboard} title={t('dashboard').toUpperCase()} />

      {/* TODO: Implémenter les KPIs, graphiques et vue d'ensemble */}
    </div>
  );
}

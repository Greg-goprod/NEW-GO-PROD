import { Shield } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { PageHeader } from "@/components/aura/PageHeader";

export default function PermissionsSettingsPage() {
  const { t } = useI18n();
  
  return (
    <div className="p-6">
      <PageHeader icon={Shield} title={t('permissions').toUpperCase()} />

      {/* TODO: Implémenter la gestion des permissions utilisateur */}
    </div>
  );
}

import { ShoppingCart } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { PageHeader } from "@/components/aura/PageHeader";

export default function VentesPage() {
  const { t } = useI18n();
  
  return (
    <div className="p-6">
      <PageHeader icon={ShoppingCart} title={t('sales').toUpperCase()} />

      {/* TODO: Implémenter la gestion des ventes (billetterie, merchandising) */}
    </div>
  );
}

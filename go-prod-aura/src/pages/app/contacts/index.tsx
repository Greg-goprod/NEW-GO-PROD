import { Contact } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { PageHeader } from "@/components/aura/PageHeader";

export default function ContactsPage() {
  const { t } = useI18n();
  
  return (
    <div className="p-6">
      <PageHeader icon={Contact} title={t('contacts').toUpperCase()} />

      {/* TODO: Implémenter la gestion des contacts (personnes et entreprises) */}
    </div>
  );
}

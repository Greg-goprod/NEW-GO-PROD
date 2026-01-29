import { Calendar } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { PageHeader } from "@/components/aura/PageHeader";

export default function TimetablePage() {
  const { t } = useI18n();
  
  return (
    <div className="p-6">
      <PageHeader icon={Calendar} title={t('timetable').toUpperCase()} />

      {/* TODO: Implémenter la gestion du planning horaire */}
    </div>
  );
}

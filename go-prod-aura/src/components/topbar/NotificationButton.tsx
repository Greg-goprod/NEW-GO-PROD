import { Bell } from "lucide-react";
import { useI18n } from "../../lib/i18n";

export default function NotificationButton() {
  const { t } = useI18n();
  // Placeholder UI only (pas de backend ni realtime)
  const unread = 0; // plus tard: compteur depuis table notifications
  
  return (
    <button
      aria-label={t('notifications')}
      className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
      title="Notifications (à venir)"
    >
      <Bell className="w-5 h-5 text-gray-300" />
      {unread > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-violetNeon-500 shadow-violet-glow" />
      )}
    </button>
  );
}


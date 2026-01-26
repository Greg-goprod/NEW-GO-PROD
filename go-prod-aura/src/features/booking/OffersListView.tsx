import React, { useMemo } from "react";
import type { Offer } from "./bookingTypes";
import { Button } from "@/components/aura/Button";
import { Badge } from "@/components/aura/Badge";
import { getStatusConfig } from "./bookingStatuses";
import { Send, Edit } from "lucide-react";

// Couleurs AURA pour les statuts (hex)
const STATUS_COLORS: Record<string, { bg: string; hover: string; text: string; border: string }> = {
  idee: { bg: "#919399", hover: "#7a7c82", text: "#FFFFFF", border: "#919399" },
  offre_a_faire: { bg: "#FF9500", hover: "#E68600", text: "#FFFFFF", border: "#FF9500" },
  draft: { bg: "#FF9500", hover: "#E68600", text: "#FFFFFF", border: "#FF9500" },
  ready_to_send: { bg: "#661B7D", hover: "#4D1460", text: "#FFFFFF", border: "#661B7D" },
  sent: { bg: "#007AFF", hover: "#0062CC", text: "#FFFFFF", border: "#007AFF" },
  accepted: { bg: "#34C759", hover: "#2AA147", text: "#FFFFFF", border: "#34C759" },
  rejected: { bg: "#FF3B5C", hover: "#E6354F", text: "#FFFFFF", border: "#FF3B5C" },
  offre_rejetee: { bg: "#FF3B5C", hover: "#E6354F", text: "#FFFFFF", border: "#FF3B5C" },
  negotiating: { bg: "#8B5CF6", hover: "#7C3AED", text: "#FFFFFF", border: "#8B5CF6" },
};

export function OffersListView({
  offers,
  onViewPdf,
  onDownloadWord,
  onSendOffer,
  onModify,
  onMove,
  onDelete,
  onCreateOffer,
}: {
  offers: any[];
  onViewPdf: (offer: Offer) => void;
  onDownloadWord?: (offer: Offer) => void;
  onSendOffer: (offer: Offer) => void;
  onModify: (offer: Offer) => void;
  onMove: (offerId: string, newStatus: any) => void;
  onDelete: (offer: Offer) => void;
  onCreateOffer?: (performanceData: any) => void;
}) {
  const normalizeTime = (value?: string | null) => {
    if (!value) return "";
    const str = String(value);
    if (str.length >= 5 && str.includes(":")) return str.slice(0, 5);
    return str.padStart(5, "0");
  };

  // Date reelle pour le TRI (real_date tient compte des passages apres minuit)
  const getRealDateForSort = (item: any) => {
    if (item.real_date) return String(item.real_date).slice(0, 10);
    if (item.event_day_date) return String(item.event_day_date).slice(0, 10);
    if (item.date_time) return String(item.date_time).slice(0, 10);
    return "";
  };

  // Date du jour d'evenement pour l'AFFICHAGE (jour de programmation)
  const getEventDayDateForDisplay = (item: any) => {
    if (item.event_day_date) return String(item.event_day_date).slice(0, 10);
    if (item.date_time) return String(item.date_time).slice(0, 10);
    return "";
  };

  const formatDisplayDateLong = (value: string) => {
    if (!value) return "—";
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  };

  // Tri par date calendaire reelle puis par heure de passage
  const sortedOffers = useMemo(() => {
    return [...offers].sort((a, b) => {
      const dateA = getRealDateForSort(a);
      const dateB = getRealDateForSort(b);
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const timeA = normalizeTime(a.performance_time || a.date_time);
      const timeB = normalizeTime(b.performance_time || b.date_time);
      return timeA.localeCompare(timeB);
    });
  }, [offers]);

  // Grouper par jour d'evenement
  const groupedByDay = useMemo(() => {
    const groups: { date: string; items: any[] }[] = [];
    let currentDate = "";
    let currentGroup: any[] = [];

    sortedOffers.forEach((o) => {
      const eventDay = getEventDayDateForDisplay(o);
      if (eventDay !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, items: currentGroup });
        }
        currentDate = eventDay;
        currentGroup = [o];
      } else {
        currentGroup.push(o);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, items: currentGroup });
    }

    return groups;
  }, [sortedOffers]);

  const getStatusBadge = (status: string) => {
    const config = getStatusConfig(status);
    return <Badge color={config.color}>{config.label}</Badge>;
  };

  if (offers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Aucune offre
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedByDay.map((group) => (
        <div
          key={group.date}
          className="rounded-2xl border border-violet-100 dark:border-violet-800/50 bg-white dark:bg-gray-900 overflow-hidden shadow-sm"
        >
          {/* Header du jour */}
          <div className="px-5 py-3 bg-gradient-to-r from-violet-50 to-violet-100/50 dark:from-violet-900/30 dark:to-violet-800/20 border-b border-violet-100 dark:border-violet-800/50">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-400">
              {formatDisplayDateLong(group.date)}
            </h3>
            <span className="text-xs text-violet-500 dark:text-violet-500">
              {group.items.length} artiste{group.items.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Liste des artistes du jour */}
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {group.items.map((o: any) => {
              const artistDisplay = (o.artist_name || "—").toString().toUpperCase();
              const stageDisplay = o.stage_name || "—";
              const timeDisplay = normalizeTime(o.performance_time || o.date_time) || "—";
              const statusDisplay = o.status || o.booking_status || "—";

              return (
                <div
                  key={o.id}
                  className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {/* Heure */}
                  <div className="w-14 flex-shrink-0">
                    <span className="text-sm font-mono font-semibold text-violet-600 dark:text-violet-400">
                      {timeDisplay}
                    </span>
                  </div>

                  {/* Artiste & Scene */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {artistDisplay}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {stageDisplay}
                    </div>
                  </div>

                  {/* Statut */}
                  <div className="flex-shrink-0">
                    {getStatusBadge(statusDisplay)}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {/* Bouton "Etablir offre" uniquement pour les performances avec statut offre_a_faire */}
                    {o.type === "performance" && statusDisplay === "offre_a_faire" && onCreateOffer && (
                      <button 
                        onClick={() => onCreateOffer(o)}
                        className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
                        style={{
                          backgroundColor: STATUS_COLORS.offre_a_faire.bg,
                          color: STATUS_COLORS.offre_a_faire.text,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = STATUS_COLORS.offre_a_faire.hover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = STATUS_COLORS.offre_a_faire.bg}
                      >
                        Etablir offre
                      </button>
                    )}
                    {o.type !== "performance" ? (
                      <>
                        {/* Icones PDF et Word */}
                        <div className="flex items-center gap-1 mr-2">
                          {o.pdf_storage_path && (
                            <button
                              onClick={() => onViewPdf(o)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Voir le PDF"
                            >
                              {/* Icone PDF */}
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M7 18H17V16H7V18Z" fill="#DC2626"/>
                                <path d="M17 14H7V12H17V14Z" fill="#DC2626"/>
                                <path d="M7 10H11V8H7V10Z" fill="#DC2626"/>
                                <path fillRule="evenodd" clipRule="evenodd" d="M6 2C4.34315 2 3 3.34315 3 5V19C3 20.6569 4.34315 22 6 22H18C19.6569 22 21 20.6569 21 19V9C21 5.13401 17.866 2 14 2H6ZM6 4H13V9H19V19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V5C5 4.44772 5.44772 4 6 4ZM15 4.10002C16.6113 4.4271 17.9413 5.52906 18.584 7H15V4.10002Z" fill="#DC2626"/>
                              </svg>
                            </button>
                          )}
                          {o.word_storage_path && onDownloadWord && (
                            <button
                              onClick={() => onDownloadWord(o)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              title="Telecharger le Word"
                            >
                              {/* Icone Word */}
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" clipRule="evenodd" d="M6 2C4.34315 2 3 3.34315 3 5V19C3 20.6569 4.34315 22 6 22H18C19.6569 22 21 20.6569 21 19V9C21 5.13401 17.866 2 14 2H6ZM6 4H13V9H19V19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V5C5 4.44772 5.44772 4 6 4ZM15 4.10002C16.6113 4.4271 17.9413 5.52906 18.584 7H15V4.10002Z" fill="#2563EB"/>
                                <path d="M8 12L9.5 18H10.5L12 14L13.5 18H14.5L16 12H14.5L13.75 15.5L12.5 12H11.5L10.25 15.5L9.5 12H8Z" fill="#2563EB"/>
                              </svg>
                            </button>
                          )}
                        </div>
                        
                        {/* Bouton Modifier - couleur du statut actuel */}
                        <button 
                          onClick={() => onModify(o)}
                          title="Modifier l'offre"
                          className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1 hover:opacity-80"
                          style={{
                            backgroundColor: STATUS_COLORS[statusDisplay]?.bg || '#6B7280',
                            color: STATUS_COLORS[statusDisplay]?.text || '#FFFFFF',
                            border: `1px solid ${STATUS_COLORS[statusDisplay]?.border || '#6B7280'}`,
                          }}
                        >
                          <Edit className="w-4 h-4" />
                          Modifier
                        </button>
                        
                        {/* Bouton Envoyer - couleur "Prêt à envoyer" (violet) */}
                        <button 
                          onClick={() => onSendOffer(o)}
                          title="Envoyer l'offre"
                          className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1"
                          style={{
                            backgroundColor: STATUS_COLORS.ready_to_send.bg,
                            color: STATUS_COLORS.ready_to_send.text,
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = STATUS_COLORS.ready_to_send.hover}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = STATUS_COLORS.ready_to_send.bg}
                        >
                          <Send className="w-4 h-4" />
                          Envoyer
                        </button>
                      </>
                    ) : (
                      // Pour les performances sans statut offre_a_faire, afficher juste le label
                      statusDisplay !== "offre_a_faire" && (
                        <span className="text-xs italic" style={{ color: STATUS_COLORS[statusDisplay]?.bg || '#9CA3AF' }}>
                          Performance
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

import { useMemo } from "react";
import type { Offer } from "./bookingTypes";
import { Badge } from "@/components/aura/Badge";
import { getStatusConfig } from "./bookingStatuses";
import { Send, Edit, CheckCircle, XCircle } from "lucide-react";

interface EventDay {
  id: string;
  date: string;
  open_time?: string;
  close_time?: string;
}

export function OffersListView({
  offers,
  days,
  onViewPdf,
  onDownloadWord,
  onSendOffer,
  onModify,
  onCreateOffer,
  onValidateOffer,
  onRejectOffer,
}: {
  offers: any[];
  days?: EventDay[];
  onViewPdf: (offer: Offer) => void;
  onDownloadWord?: (offer: Offer) => void;
  onSendOffer: (offer: Offer) => void;
  onModify: (offer: Offer) => void;
  onCreateOffer?: (performanceData: any) => void;
  onValidateOffer?: (offer: Offer) => void;
  onRejectOffer?: (offer: Offer) => void;
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

  // Grouper par jour d'evenement - inclure tous les jours même sans offres
  const groupedByDay = useMemo(() => {
    // Si on a des jours fournis, les utiliser comme base
    if (days && days.length > 0) {
      // Créer un map des offres par date
      const offersByDate = new Map<string, any[]>();
      sortedOffers.forEach((o) => {
        const eventDay = getEventDayDateForDisplay(o);
        if (!offersByDate.has(eventDay)) {
          offersByDate.set(eventDay, []);
        }
        offersByDate.get(eventDay)!.push(o);
      });

      // Créer les groupes pour tous les jours
      return days
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((day) => ({
          date: day.date,
          items: offersByDate.get(day.date) || [],
        }));
    }

    // Fallback: grouper uniquement par les offres existantes
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
  }, [sortedOffers, days]);

  const getStatusBadge = (status: string) => {
    const config = getStatusConfig(status);
    // Map status colors to Badge-compatible colors
    const badgeColorMap: Record<string, "gray"|"blue"|"green"|"yellow"|"red"|"violet"|"mandarine"|"saphir"|"menthe"|"framboise"|"violet-aura"> = {
      "gray": "gray",
      "mandarine": "mandarine",
      "violet-aura": "violet-aura",
      "saphir": "saphir",
      "menthe": "menthe",
      "framboise": "framboise",
      "violet": "violet",
      "eminence": "violet",
    };
    const badgeColor = badgeColorMap[config.color] || "gray";
    // Largeur fixe basée sur le texte le plus long ("Revue management")
    return (
      <div className="w-[140px] flex-shrink-0">
        <Badge color={badgeColor} className="w-full justify-center text-center">
          {config.label}
        </Badge>
      </div>
    );
  };

  // Si pas de jours ET pas d'offres, afficher le message vide
  if (offers.length === 0 && (!days || days.length === 0)) {
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
            {group.items.length === 0 ? (
              <div className="px-5 py-4 text-center text-sm text-gray-400 dark:text-gray-500 italic">
                Aucune offre pour ce jour
              </div>
            ) : group.items.map((o: any) => {
              const artistDisplay = (o.artist_name || "—").toString().toUpperCase();
              const stageDisplay = o.stage_name || "—";
              const timeDisplay = normalizeTime(o.performance_time || o.date_time) || "—";
              const statusDisplay = o.status || o.booking_status || "—";

              return (
                <div
                  key={o.id}
                  className="px-5 py-3 flex items-center gap-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  {/* Heure */}
                  <div className="w-14 flex-shrink-0">
                    <span className="text-sm font-mono font-semibold text-violet-600 dark:text-violet-400">
                      {timeDisplay}
                    </span>
                  </div>

                  {/* Statut */}
                  <div className="flex-shrink-0">
                    {getStatusBadge(statusDisplay)}
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

                  {/* Actions */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {/* Bouton "Etablir offre" uniquement pour les performances avec statut offre_a_faire */}
                    {o.type === "performance" && statusDisplay === "offre_a_faire" && onCreateOffer && (
                      <button 
                        onClick={() => onCreateOffer(o)}
                        className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50"
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
                              <svg className="w-4 h-4 text-red-500 dark:text-red-400" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M7 18H17V16H7V18Z"/>
                                <path d="M17 14H7V12H17V14Z"/>
                                <path d="M7 10H11V8H7V10Z"/>
                                <path fillRule="evenodd" clipRule="evenodd" d="M6 2C4.34315 2 3 3.34315 3 5V19C3 20.6569 4.34315 22 6 22H18C19.6569 22 21 20.6569 21 19V9C21 5.13401 17.866 2 14 2H6ZM6 4H13V9H19V19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V5C5 4.44772 5.44772 4 6 4ZM15 4.10002C16.6113 4.4271 17.9413 5.52906 18.584 7H15V4.10002Z"/>
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
                              <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" clipRule="evenodd" d="M6 2C4.34315 2 3 3.34315 3 5V19C3 20.6569 4.34315 22 6 22H18C19.6569 22 21 20.6569 21 19V9C21 5.13401 17.866 2 14 2H6ZM6 4H13V9H19V19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V5C5 4.44772 5.44772 4 6 4ZM15 4.10002C16.6113 4.4271 17.9413 5.52906 18.584 7H15V4.10002Z"/>
                                <path d="M8 12L9.5 18H10.5L12 14L13.5 18H14.5L16 12H14.5L13.75 15.5L12.5 12H11.5L10.25 15.5L9.5 12H8Z"/>
                              </svg>
                            </button>
                          )}
                        </div>
                        
                        {/* Version badge si > 1 */}
                        {o.version && o.version > 1 && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 mr-1">
                            V{o.version}
                          </span>
                        )}
                        
                        {/* Bouton Modifier - masqué si accepté - style outline violet */}
                        {statusDisplay !== "accepted" && (
                          <button 
                            onClick={() => onModify(o)}
                            title={
                              statusDisplay === "sent" || statusDisplay === "rejected"
                                ? "Modifier l'offre (crée une nouvelle version)"
                                : "Modifier l'offre"
                            }
                            className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 border border-violet-300 dark:border-violet-700 bg-white dark:bg-gray-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Modifier
                          </button>
                        )}
                        
                        {/* Bouton Valider - style outline vert subtil */}
                        {statusDisplay === "sent" && onValidateOffer && (
                          <button 
                            onClick={() => onValidateOffer(o)}
                            title="Valider l'offre"
                            className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Valider
                          </button>
                        )}
                        
                        {/* Bouton Rejeter - style outline rouge subtil */}
                        {statusDisplay === "sent" && onRejectOffer && (
                          <button 
                            onClick={() => onRejectOffer(o)}
                            title="Rejeter l'offre"
                            className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 border border-red-300 dark:border-red-700 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Rejeter
                          </button>
                        )}
                        
                        {/* Bouton Envoyer - style filled violet (action principale) */}
                        {statusDisplay !== "rejected" && statusDisplay !== "accepted" && (
                          <button 
                            onClick={() => onSendOffer(o)}
                            title="Envoyer l'offre"
                            className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 bg-violet-600 dark:bg-violet-700 text-white hover:bg-violet-700 dark:hover:bg-violet-600"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Envoyer
                          </button>
                        )}
                      </>
                    ) : (
                      // Pour les performances sans statut offre_a_faire, afficher juste le label
                      statusDisplay !== "offre_a_faire" && (
                        <span className="text-xs italic text-gray-400 dark:text-gray-500">
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

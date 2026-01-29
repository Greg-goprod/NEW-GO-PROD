import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { 
  Calendar, MapPin, Ticket, ChevronRight, 
  Globe, Loader2, CalendarCheck, CalendarX, ExternalLink
} from "lucide-react";

type ArtistEvent = {
  id: string;
  event_name: string;
  event_date: string | null;
  event_time: string | null;
  venue_name: string | null;
  city: string | null;
  country: string | null;
  ticket_url: string | null;
  url: string | null; // Event page URL
  is_future: boolean;
  source: string;
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Date TBC";
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getCountryFlag(country: string | null): string {
  if (!country) return "";
  
  // Mapping pays communs
  const countryMap: Record<string, string> = {
    "France": "FR", "United States": "US", "USA": "US", "Germany": "DE",
    "United Kingdom": "GB", "UK": "GB", "Spain": "ES", "Italy": "IT",
    "Belgium": "BE", "Netherlands": "NL", "Switzerland": "CH", "Canada": "CA",
    "Australia": "AU", "Japan": "JP", "Brazil": "BR", "Mexico": "MX",
    "Denmark": "DK", "Finland": "FI", "Norway": "NO", "Sweden": "SE",
    "Taiwan": "TW", "China": "CN", "South Korea": "KR", "Argentina": "AR",
    "Chile": "CL", "Poland": "PL", "Portugal": "PT", "Austria": "AT",
    "Ireland": "IE", "Czech Republic": "CZ", "Hungary": "HU", "Greece": "GR",
  };
  
  const code = countryMap[country] || country.slice(0, 2).toUpperCase();
  
  if (code.length !== 2) return "";
  
  const codePoints = code
    .toUpperCase()
    .split("")
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function ArtistConcerts({ artistId }: { artistId: string }) {
  const [events, setEvents] = useState<ArtistEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [artistId]);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("artist_events")
      .select("*")
      .eq("artist_id", artistId)
      .order("event_date", { ascending: true });

    if (error) {
      console.error("Error fetching events:", error);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  const futureEvents = events.filter(e => e.is_future);
  const pastEvents = events.filter(e => !e.is_future).reverse(); // Plus recent en premier

  if (loading) {
    return (
      <div className="card-surface p-6 rounded-xl flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
      </div>
    );
  }

  if (events.length === 0) {
    return null; // Pas de concerts, ne rien afficher
  }

  return (
    <div className="space-y-6">
      {/* Concerts a venir */}
      {futureEvents.length > 0 && (
        <div className="card-surface p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-gray-400 uppercase flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
              Concerts a venir ({futureEvents.length})
            </h3>
          </div>
          
          {/* Header tableau */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase border-b border-slate-200 dark:border-gray-700">
            <div className="col-span-2">Date</div>
            <div className="col-span-3">Lieu</div>
            <div className="col-span-3">Ville / Pays</div>
            <div className="col-span-4 text-right">Liens</div>
          </div>
          
          <div className="divide-y divide-slate-100 dark:divide-gray-800">
            {futureEvents.map((event) => (
              <div 
                key={event.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-2 items-center px-3 py-3 hover:bg-green-50 dark:hover:bg-green-500/5 transition-colors"
              >
                {/* DATE */}
                <div className="md:col-span-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 md:hidden" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {formatDate(event.event_date)}
                  </span>
                </div>
                
                {/* LIEU (venue) */}
                <div className="md:col-span-3">
                  <span className="text-sm text-slate-700 dark:text-gray-300 truncate block">
                    {event.venue_name || event.event_name || "-"}
                  </span>
                </div>
                
                {/* VILLE / PAYS */}
                <div className="md:col-span-3 flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-600 dark:text-gray-400">
                    {event.city || "-"}
                    {event.country && (
                      <span className="ml-2">
                        {getCountryFlag(event.country)} {event.country}
                      </span>
                    )}
                  </span>
                </div>
                
                {/* LIENS */}
                <div className="md:col-span-4 flex items-center justify-end gap-2">
                  {event.ticket_url && (
                    <a
                      href={event.ticket_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-500 hover:bg-green-400 text-black rounded-lg transition-colors"
                    >
                      <Ticket className="w-3 h-3" />
                      Billets
                    </a>
                  )}
                  {event.url && (
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600 text-slate-700 dark:text-gray-300 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Event
                    </a>
                  )}
                  {!event.ticket_url && !event.url && (
                    <span className="text-xs text-slate-400 dark:text-gray-500 italic">-</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Concerts passes */}
      {pastEvents.length > 0 && (
        <div className="card-surface p-6 rounded-xl">
          <button
            onClick={() => setShowPast(!showPast)}
            className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
          >
            <h3 className="text-sm font-semibold text-slate-500 dark:text-gray-400 uppercase flex items-center gap-2">
              <CalendarX className="w-4 h-4 text-slate-400 dark:text-gray-500" />
              Concerts passes ({pastEvents.length})
            </h3>
            <ChevronRight 
              className={`w-5 h-5 text-slate-400 dark:text-gray-400 transition-transform ${showPast ? "rotate-90" : ""}`} 
            />
          </button>
          
          {showPast && (
            <>
              {/* Header tableau */}
              <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase border-b border-slate-200 dark:border-gray-700">
                <div className="col-span-2">Date</div>
                <div className="col-span-3">Lieu</div>
                <div className="col-span-3">Ville / Pays</div>
                <div className="col-span-4 text-right">Liens</div>
              </div>
              
              <div className="divide-y divide-slate-100 dark:divide-gray-800">
                {pastEvents.slice(0, 20).map((event) => (
                  <div 
                    key={event.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-2 items-center px-3 py-3 hover:bg-slate-50 dark:hover:bg-gray-800/30 transition-colors opacity-70"
                  >
                    {/* DATE */}
                    <div className="md:col-span-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0 md:hidden" />
                      <span className="text-sm text-slate-600 dark:text-gray-400">
                        {formatDate(event.event_date)}
                      </span>
                    </div>
                    
                    {/* LIEU (venue) */}
                    <div className="md:col-span-3">
                      <span className="text-sm text-slate-600 dark:text-gray-400 truncate block">
                        {event.venue_name || event.event_name || "-"}
                      </span>
                    </div>
                    
                    {/* VILLE / PAYS */}
                    <div className="md:col-span-3 flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-500 dark:text-gray-500">
                        {event.city || "-"}
                        {event.country && (
                          <span className="ml-2">
                            {getCountryFlag(event.country)} {event.country}
                          </span>
                        )}
                      </span>
                    </div>
                    
                    {/* LIENS */}
                    <div className="md:col-span-4 flex items-center justify-end gap-2">
                      {event.ticket_url && (
                        <a
                          href={event.ticket_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600 text-slate-600 dark:text-gray-300 rounded-lg transition-colors"
                        >
                          <Ticket className="w-3 h-3" />
                          Billets
                        </a>
                      )}
                      {event.url && (
                        <a
                          href={event.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600 text-slate-600 dark:text-gray-300 rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Event
                        </a>
                      )}
                      {!event.ticket_url && !event.url && (
                        <span className="text-xs text-slate-400 dark:text-gray-500 italic">-</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {pastEvents.length > 20 && (
                <p className="text-center text-sm text-slate-500 dark:text-gray-500 pt-4">
                  + {pastEvents.length - 20} autres concerts
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Source indicator */}
      <div className="text-center text-xs text-slate-500 dark:text-gray-500">
        <Globe className="w-3 h-3 inline mr-1" />
        Donnees de concerts via Bandsintown
      </div>
    </div>
  );
}


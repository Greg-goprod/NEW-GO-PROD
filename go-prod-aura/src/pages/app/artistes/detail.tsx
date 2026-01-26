import { User, ArrowLeft, Music, TrendingUp, Calendar, Mail, Phone, MapPin, Briefcase, Globe } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { ArtistStatsChart } from "../../../components/artists/ArtistStatsChart";
import { ContainerSongstats } from "../../../components/artist/ContainerSongstats";
import { ArtistStatsOverview } from "../../../components/artist/ArtistStatsOverview";
import { ArtistConcerts } from "../../../components/artist/ArtistConcerts";
import { ArtistHistoryChart } from "../../../components/artist/ArtistHistoryChart";
import { ArtistSocialLinks } from "../../../components/artist/ArtistSocialLinks";
import { getCurrentCompanyId } from "../../../lib/tenant";
import { formatPhoneNumber, getWhatsAppLink } from "../../../utils/phoneUtils";
import type { CRMContact, CRMArtistContactLink } from "../../../types/crm";

type Artist = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  email?: string;
  phone?: string;
  location?: string;
  spotify_data?: {
    image_url?: string;
    followers?: number;
    popularity?: number;
    external_url?: string;
    genres?: string[];
  };
  social_media_data?: {
    instagram_url?: string;
    facebook_url?: string;
    youtube_url?: string;
    tiktok_url?: string;
    twitter_url?: string;
    website_url?: string;
    threads_url?: string;
    soundcloud_url?: string;
    bandcamp_url?: string;
    wikipedia_url?: string;
  };
};

type ArtistContact = CRMContact & {
  link: CRMArtistContactLink;
  roles?: Array<{
    id: string;
    label: string;
  }>;
};

export default function ArtistDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [contacts, setContacts] = useState<ArtistContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchArtist();
    fetchArtistContacts();
  }, [id]);

  const fetchArtist = async () => {
    try {
      setLoading(true);
      
      // Récupérer le company_id
      const cid = await getCurrentCompanyId(supabase);
      setCompanyId(cid);
      
      const { data, error: err } = await supabase
        .from("artists")
        .select("*, spotify_data(*), social_media_data(*)")
        .eq("id", id)
        .single();

      if (err) throw err;
      
      // Normaliser les données si ce sont des tableaux
      if (data) {
        // Normaliser spotify_data
        if (Array.isArray(data.spotify_data)) {
          data.spotify_data = data.spotify_data.length > 0 ? data.spotify_data[0] : null;
        }
        
        // Normaliser social_media_data
        if (Array.isArray(data.social_media_data)) {
          data.social_media_data = data.social_media_data.length > 0 ? data.social_media_data[0] : null;
        }
      }
      
      setArtist(data);
    } catch (err: any) {
      console.error('Error fetching artist:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchArtistContacts = async () => {
    try {
      const cid = await getCurrentCompanyId(supabase);
      
      // Récupérer les liens artiste-contact avec les contacts
      const { data: linksData, error: err } = await supabase
        .from("crm_artist_contact_links")
        .select(`
          id,
          company_id,
          artist_id,
          contact_id,
          role_for_artist,
          territory,
          is_main_agent,
          notes,
          crm_contacts (
            id,
            first_name,
            last_name,
            display_name,
            photo_url,
            email_primary,
            phone_mobile,
            phone_whatsapp,
            department_id
          )
        `)
        .eq("company_id", cid)
        .eq("artist_id", id);

      if (err) {
        console.error('Error fetching artist contacts:', err);
        throw err;
      }

      if (!linksData || linksData.length === 0) {
        setContacts([]);
        return;
      }

      // Récupérer les rôles pour tous les contacts
      const contactIds = linksData.map((item: any) => item.crm_contacts?.id).filter((id: any) => id != null);
      
      let rolesMap: { [key: string]: any[] } = {};
      
      if (contactIds.length > 0) {
        const { data: rolesData } = await supabase
          .from("crm_contact_role_links")
          .select(`
            contact_id,
            role:contact_roles(id, label)
          `)
          .in("contact_id", contactIds);
          
        if (rolesData) {
          rolesData.forEach((link: any) => {
            if (!rolesMap[link.contact_id]) {
              rolesMap[link.contact_id] = [];
            }
            if (link.role) {
              rolesMap[link.contact_id].push(link.role);
            }
          });
        }
      }

      // Transformer les données
      const artistContacts: ArtistContact[] = linksData.map((item: any) => {
        return {
          ...item.crm_contacts,
          roles: rolesMap[item.crm_contacts?.id] || [],
          link: {
            id: item.id,
            company_id: item.company_id,
            artist_id: item.artist_id,
            contact_id: item.contact_id,
            role_for_artist: item.role_for_artist,
            territory: item.territory,
            is_main_agent: item.is_main_agent,
            notes: item.notes,
            created_by: item.created_by,
            created_at: item.created_at,
            updated_at: item.updated_at,
          },
        };
      });

      // Trier pour mettre les booking agents en premier
      artistContacts.sort((a, b) => {
        // Vérifier si le contact a le rôle "Booking Agent" (insensible à la casse)
        const aIsBookingAgent = a.roles?.some(role => 
          role.label.toLowerCase().includes('booking') || role.label.toLowerCase().includes('agent')
        );
        const bIsBookingAgent = b.roles?.some(role => 
          role.label.toLowerCase().includes('booking') || role.label.toLowerCase().includes('agent')
        );

        // 1. Les booking agents avant les autres
        if (aIsBookingAgent && !bIsBookingAgent) return -1;
        if (!aIsBookingAgent && bIsBookingAgent) return 1;

        // 2. Parmi les booking agents, le main agent en premier
        if (aIsBookingAgent && bIsBookingAgent) {
          if (a.link.is_main_agent && !b.link.is_main_agent) return -1;
          if (!a.link.is_main_agent && b.link.is_main_agent) return 1;
        }

        return 0;
      });

      setContacts(artistContacts);
    } catch (err: any) {
      console.error('Error fetching artist contacts:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400"></div>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="p-6">
        <div className="card-surface p-12 rounded-xl text-center border border-red-500/20 bg-red-50 dark:bg-red-500/10">
          <Music className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
            Erreur de chargement
          </h3>
          <p className="text-sm text-slate-600 dark:text-gray-400 mb-4">
            {error || "Artiste non trouve"}
          </p>
          <button onClick={() => navigate('/app/artistes')} className="btn btn-secondary">
            <ArrowLeft size={16} /> Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="btn btn-secondary w-10 h-10 p-0 flex items-center justify-center"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-violet-500 dark:text-violet-400" />
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white uppercase">
                {artist.name}
              </h1>
            </div>
          </div>
        <button className="btn btn-primary">
          Modifier
        </button>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card - Photo en pleine largeur */}
          <div className="card-surface rounded-xl overflow-hidden">
            <div className="h-80 w-full bg-gradient-to-br from-violet-400 to-violet-600">
              {artist.spotify_data?.image_url ? (
                <img
                  src={artist.spotify_data.image_url}
                  alt={artist.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-16 h-16 text-white" />
                </div>
              )}
            </div>
            <div className="p-6 text-center">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 uppercase">
                {artist.name}
              </h2>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-gray-400">
                <Calendar size={14} />
                Ajouté le {new Date(artist.created_at).toLocaleDateString('fr-FR')}
              </div>
            </div>
          </div>

          {/* Widget Spotify Officiel */}
          {artist.spotify_data?.external_url && (
            <div className="card-surface p-4 rounded-xl">
              {/* Widget Spotify Embed */}
              <div className="w-full">
                <iframe
                  src={`https://open.spotify.com/embed/artist/${artist.spotify_data.external_url.split('/').pop()}?utm_source=generator&theme=0`}
                  width="100%"
                  height="352"
                  frameBorder="0"
                  allowFullScreen
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-lg"
                ></iframe>
              </div>
            </div>
          )}

        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Card - Contacts CRM */}
          <div className="card-surface p-6 rounded-xl">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-gray-400 uppercase mb-4">Contacts</h3>
            {contacts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <tbody>
                    {contacts.map((contact) => (
                      <tr 
                        key={contact.id}
                        className="border-b border-slate-200 dark:border-gray-800/50 hover:bg-slate-50 dark:hover:bg-gray-800/30 transition-colors"
                      >
                        {/* 1. Fonction */}
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap items-center gap-1">
                            {contact.link.is_main_agent && (
                              <span className="text-violet-400">â­</span>
                            )}
                            {contact.roles && contact.roles.length > 0 ? (
                              contact.roles.map((role) => (
                                <span key={role.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200">
                                  {role.label}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-slate-500 dark:text-gray-400">-</span>
                            )}
                            {contact.link.territory && (
                              <span className="text-xs text-slate-500 dark:text-gray-400">
                                - {contact.link.territory}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Nom Prénom */}
                        <td className="py-3 pr-4">
                          <div className="text-sm text-slate-900 dark:text-white font-medium">
                            {contact.display_name || `${contact.first_name} ${contact.last_name}`}
                          </div>
                        </td>

                        {/* 3. Téléphone (WhatsApp) */}
                        <td className="py-3 pr-4">
                          {contact.phone_mobile ? (
                            <a 
                              href={getWhatsAppLink(contact.phone_mobile) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-slate-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-500 transition-colors inline-flex items-center gap-1.5"
                            >
                              <Phone size={14} />
                              {formatPhoneNumber(contact.phone_mobile)}
                            </a>
                          ) : (
                            <span className="text-sm text-slate-500 dark:text-gray-400">-</span>
                          )}
                        </td>

                        {/* 4. Mail */}
                        <td className="py-3">
                          {contact.email_primary ? (
                            <a 
                              href={`mailto:${contact.email_primary}`}
                              className="text-sm text-slate-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors inline-flex items-center gap-1.5"
                            >
                              <Mail size={14} />
                              {contact.email_primary}
                            </a>
                          ) : (
                            <span className="text-sm text-slate-500 dark:text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-gray-400 italic">Aucun contact associé</p>
            )}
          </div>
          {/* Spotify Stats */}
          {artist.spotify_data && (
            <div className="card-surface p-6 rounded-xl">
              <h3 className="text-sm font-semibold text-slate-600 dark:text-gray-400 uppercase mb-4">Statistiques Spotify</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User size={16} className="text-violet-500 dark:text-violet-400" />
                    <span className="text-xs text-slate-500 dark:text-gray-400 uppercase">Followers</span>
                  </div>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                    {artist.spotify_data.followers?.toLocaleString() || 'N/A'}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={16} className="text-violet-500 dark:text-violet-400" />
                    <span className="text-xs text-slate-500 dark:text-gray-400 uppercase">Popularité</span>
                  </div>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                    {artist.spotify_data.popularity || 'N/A'}
                  </p>
                </div>
              </div>
              {artist.spotify_data.genres && artist.spotify_data.genres.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-slate-500 dark:text-gray-400 uppercase mb-2">Genres</p>
                  <div className="flex flex-wrap gap-2">
                    {artist.spotify_data.genres.map((genre, index) => (
                      <span key={index} className="badge">
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Graphique d'évolution Spotify */}
          <div className="card-surface p-6 rounded-xl">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-gray-400 uppercase mb-4">Evolution Spotify</h3>
            <ArtistStatsChart artistId={artist.id} artistName={artist.name} />
          </div>

          {/* Social Media Links - Toutes les plateformes */}
          <ArtistSocialLinks artistId={artist.id} />

          {/* Stats Overview - Multi-plateformes, Audience, Genres, Related */}
          <ArtistStatsOverview artistId={artist.id} />

          {/* Historique des statistiques */}
          <ArtistHistoryChart artistId={artist.id} />

          {/* Concerts - Passes et a venir */}
          <ArtistConcerts artistId={artist.id} />

          {/* Songstats Container */}
          {companyId && id && (
            <ContainerSongstats companyId={companyId} artistId={id} />
          )}

          {/* Additional Info Placeholder */}
          <div className="card-surface p-6 rounded-xl">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-gray-400 uppercase mb-4">Informations supplementaires</h3>
            <p className="text-sm text-slate-500 dark:text-gray-400 italic">
              {/* TODO: Ajouter biographie, historique des bookings, documents, etc. */}
              Section a implementer : biographie, historique des bookings, documents contractuels...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

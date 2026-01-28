import React, { useState, useEffect } from 'react';
import { Globe, Palette, Upload, Image as ImageIcon, Check, Calendar, Plus, Edit2, Trash2, X } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';
import { Button } from '@/components/aura/Button';
import { Badge } from '@/components/aura/Badge';
import { useToast } from '@/components/aura/ToastProvider';
import { useEventContext } from '@/hooks/useEventContext';
import { useEventStore } from '@/store/useEventStore';
import { EventForm } from '@/features/settings/events/EventForm';
import { StageEnumsManager } from '@/features/settings/events/StageEnumsManager';
import { EventStagesManager } from '@/features/settings/events/EventStagesManager';
import { SmtpConfigManager } from '@/features/settings/email/SmtpConfigManager';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { fetchEventsByCompany, deleteEvent, type EventRow } from '@/api/eventsApi';
import { getCurrentCompanyId } from '@/lib/tenant';
import { supabase } from '@/lib/supabaseClient';

export function SettingsGeneralPage() {
  const [language, setLanguage] = useState('fr');
  const [theme, setTheme] = useState('dark');
  const [eventLogos, setEventLogos] = useState<string[]>([]);
  const [activeLogo, setActiveLogo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const { hasEvent, eventId, currentEvent: contextEvent } = useEventContext();
  
  // États pour la gestion des événements
  const currentEvent = useEventStore((state) => state.currentEvent);
  const clearCurrentEvent = useEventStore((state) => state.clearCurrentEvent);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Récupérer le company_id au montage
  useEffect(() => {
    (async () => {
      try {
        const cid = await getCurrentCompanyId(supabase);
        setCurrentCompanyId(cid);
      } catch (e) {
        console.error('Erreur récupération company_id:', e);
        toastError('Erreur lors de la récupération de l\'entreprise');
      }
    })();
  }, []);

  // Charger les événements
  const loadEvents = async () => {
    if (!currentCompanyId) return;
    setLoading(true);
    try {
      const data = await fetchEventsByCompany(currentCompanyId);
      setEvents(data);

      if (currentEvent && !data.find(e => e.id === currentEvent.id)) {
        clearCurrentEvent();
        toastError('L\'évènement actuel a été supprimé de la base de données');
      }
    } catch (err: any) {
      console.error('Erreur chargement évènements:', err);
      toastError('Erreur lors du chargement des évènements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [currentCompanyId]);

  // Charger les préférences depuis localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('app_lang') || 'fr';
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    setLanguage(savedLanguage);
    setTheme(savedTheme);
    
    // Charger les logos existants depuis Supabase Storage
    if (hasEvent && eventId) {
      loadEventLogos();
    }
  }, [hasEvent, eventId]);

  // Charger le logo actif depuis la table events
  useEffect(() => {
    if (eventId && contextEvent?.logo_url) {
      setActiveLogo(contextEvent.logo_url);
    } else {
      setActiveLogo(null);
    }
  }, [eventId, contextEvent]);

  const loadEventLogos = async () => {
    if (!eventId) return;
    
    try {
      // Lister les fichiers dans le dossier de l'événement
      const { data, error } = await supabase.storage
        .from('event-logos')
        .list(eventId, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Erreur chargement logos:', error);
        setEventLogos([]);
        return;
      }

      // Filtrer les fichiers (exclure les dossiers .emptyFolderPlaceholder)
      const logoFiles = (data || [])
        .filter(file => file.name && !file.name.startsWith('.'))
        .map(file => `${eventId}/${file.name}`);

      setEventLogos(logoFiles);
    } catch (err) {
      console.error('Erreur loadEventLogos:', err);
      setEventLogos([]);
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem('app_lang', newLanguage);
    
    // Appliquer la langue si i18n est disponible
    if (window.i18n) {
      window.i18n.changeLanguage(newLanguage);
    }
    
    toastSuccess(`Langue changée vers ${newLanguage === 'fr' ? 'Français' : 'English'}`);
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Appliquer le thème immédiatement
    document.documentElement.setAttribute('data-theme', newTheme);
    document.documentElement.className = newTheme === 'dark' ? 'dark' : '';
    
    toastSuccess(`Thème changé vers ${newTheme === 'dark' ? 'Sombre' : 'Clair'}`);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasEvent || !eventId) {
      toastError('Aucun évènement sélectionné');
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    // Validation du type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toastError('Format non supporté. Utilisez JPG, PNG, WebP, GIF ou SVG');
      return;
    }

    // Validation de la taille (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toastError('Le fichier ne doit pas dépasser 5 Mo');
      return;
    }

    setUploading(true);
    try {
      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
      const safeName = `logo_${timestamp}.${extension}`;
      const storagePath = `${eventId}/${safeName}`;

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('event-logos')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Erreur upload logo:', uploadError);
        throw new Error(uploadError.message);
      }

      // Ajouter à la liste locale
      setEventLogos(prev => [storagePath, ...prev]);
      
      toastSuccess('Logo uploadé avec succès');
    } catch (error: any) {
      console.error('Erreur upload logo:', error);
      toastError(error?.message || 'Erreur lors de l\'upload du logo');
    } finally {
      setUploading(false);
      // Reset le champ input
      event.target.value = '';
    }
  };

  const handleLogoSelect = async (logoPath: string) => {
    if (!eventId) {
      toastError('Aucun évènement sélectionné');
      return;
    }

    try {
      // Générer l'URL publique du logo
      const { data: urlData } = supabase.storage
        .from('event-logos')
        .getPublicUrl(logoPath);

      const logoUrl = urlData?.publicUrl || null;

      // Mettre à jour events.logo_url dans Supabase
      const { error } = await supabase
        .from('events')
        .update({ logo_url: logoUrl })
        .eq('id', eventId);

      if (error) {
        console.error('Erreur mise à jour logo:', error);
        throw error;
      }

      setActiveLogo(logoUrl);
      toastSuccess('Logo sélectionné comme actif');
    } catch (error: any) {
      console.error('Erreur handleLogoSelect:', error);
      toastError(error?.message || 'Erreur lors de la sélection du logo');
    }
  };

  // Handlers pour les événements
  const handleAddEvent = () => {
    setEditingEventId(null);
    setShowEventForm(true);
  };

  const handleEditEvent = (evtId: string) => {
    setEditingEventId(evtId);
    setShowEventForm(true);
  };

  const handleDeleteEvent = (evtId: string, eventName: string) => {
    setDeletingEvent({ id: evtId, name: eventName });
  };

  const handleConfirmDelete = async () => {
    if (!deletingEvent) return;

    setDeleting(true);
    try {
      await deleteEvent(deletingEvent.id);
      toastSuccess(`Évènement "${deletingEvent.name}" supprimé avec succès`);
      loadEvents();
      setDeletingEvent(null);
    } catch (err: any) {
      console.error('Erreur suppression évènement:', err);
      toastError(err.message || 'Erreur lors de la suppression de l\'évènement');
    } finally {
      setDeleting(false);
    }
  };

  const handleFormClose = () => {
    setShowEventForm(false);
    setEditingEventId(null);
    loadEvents();
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Non défini';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Langue */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Langue
            </h2>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex gap-4">
            <Button
              variant={language === 'fr' ? 'primary' : 'secondary'}
              onClick={() => handleLanguageChange('fr')}
              className="flex items-center gap-2"
            >
              🇫🇷 Français
            </Button>
            <Button
              variant={language === 'en' ? 'primary' : 'secondary'}
              onClick={() => handleLanguageChange('en')}
              className="flex items-center gap-2"
            >
              🇬🇧 English
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Thème */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Theme
            </h2>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex gap-4">
            <Button
              variant={theme === 'light' ? 'primary' : 'secondary'}
              onClick={() => handleThemeChange('light')}
              className="flex items-center gap-2"
            >
              ☀️ Clair
            </Button>
            <Button
              variant={theme === 'dark' ? 'primary' : 'secondary'}
              onClick={() => handleThemeChange('dark')}
              className="flex items-center gap-2"
            >
              🌙 Sombre
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Configuration Email SMTP */}
      {currentCompanyId && (
        <SmtpConfigManager companyId={currentCompanyId} />
      )}

      {/* Logo de l'évènement */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Logo de l'evenement
            </h2>
          </div>
        </CardHeader>
        <CardBody>
          {!hasEvent ? (
            <div 
              className="rounded-xl p-4"
              style={{ 
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)'
              }}
            >
              <div className="flex items-center gap-2 text-amber-400">
                <div className="w-4 h-4 bg-amber-400 rounded-full"></div>
                <span className="font-medium">Aucun evenement selectionne</span>
              </div>
              <p className="text-amber-300/80 text-sm mt-2">
                Veuillez selectionner un evenement pour gerer ses logos.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Upload */}
              <div className="flex items-center gap-4">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <Button
                    variant="secondary"
                    disabled={uploading}
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? 'Upload...' : 'Uploader un logo'}
                  </Button>
                </label>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Formats acceptes: JPG, PNG, SVG (max 5MB)
                </span>
              </div>

              {/* Galerie des logos */}
              {eventLogos.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Logos disponibles
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {eventLogos.map((logoPath, index) => {
                      // Générer l'URL publique pour l'affichage
                      const { data: urlData } = supabase.storage
                        .from('event-logos')
                        .getPublicUrl(logoPath);
                      const logoUrl = urlData?.publicUrl || '';
                      const isActive = activeLogo === logoUrl;
                      
                      return (
                        <div
                          key={index}
                          className="relative group cursor-pointer"
                          onClick={() => handleLogoSelect(logoPath)}
                        >
                          <div 
                            className={`aspect-square rounded-xl flex items-center justify-center overflow-hidden transition-all ${
                              isActive ? 'ring-2 ring-green-500' : ''
                            }`}
                            style={{ 
                              background: 'var(--bg-surface)',
                              border: `1px solid ${isActive ? 'var(--success)' : 'var(--color-border)'}`
                            }}
                          >
                            {logoUrl ? (
                              <img 
                                src={logoUrl} 
                                alt={`Logo ${index + 1}`}
                                className="w-full h-full object-contain p-2"
                                onError={(e) => {
                                  // Fallback si l'image ne charge pas
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <ImageIcon className={`w-8 h-8 ${logoUrl ? 'hidden' : ''}`} style={{ color: 'var(--text-muted)' }} />
                          </div>
                          {isActive && (
                            <div className="absolute top-2 right-2">
                              <Badge color="green" className="flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Actif
                              </Badge>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-xl transition-all flex items-center justify-center">
                            <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg">
                              Selectionner
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {eventLogos.length === 0 && (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun logo uploade</p>
                  <p className="text-sm">Commencez par uploader un logo</p>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Gestion des événements */}
      {currentCompanyId && (
        <>
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Gestion des evenements
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Creez et gerez vos evenements, jours et scenes
                </p>
              </div>
              <Button leftIcon={<Plus size={16} />} onClick={handleAddEvent}>
                Ajouter un événement
              </Button>
            </div>

            {/* Événement actuel */}
            {currentEvent && (
              <Card className="p-6 mb-6" style={{ border: '2px solid var(--primary)' }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-4 h-4 rounded-full mt-1"
                      style={{ backgroundColor: currentEvent.color_hex || '#713DFF' }}
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                          {currentEvent.name}
                        </h3>
                        <Badge color="primary">Evenement actuel</Badge>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(currentEvent.start_date)} - {formatDate(currentEvent.end_date)}
                      </p>
                      {currentEvent.notes && (
                        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                          {currentEvent.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEditEvent(currentEvent.id)}
                      title="Modifier l'événement"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        clearCurrentEvent();
                        toastSuccess('Événement désélectionné');
                      }}
                      title="Désélectionner l'événement"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Liste des événements */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
              </div>
            ) : events.length === 0 ? (
              <Card className="p-6">
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                  <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Aucun evenement
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Creez votre premier evenement pour commencer
                  </p>
                  <Button leftIcon={<Plus size={16} />} onClick={handleAddEvent}>
                    Créer un événement
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map((event) => (
                  <Card key={event.id} className="p-4 hover:shadow-lg transition-all hover:-translate-y-0.5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: event.color_hex || '#713DFF' }}
                        />
                        <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {event.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEditEvent(event.id)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id, event.name)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(event.start_date)} - {formatDate(event.end_date)}
                    </p>
                    {event.notes && (
                      <p className="text-xs line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                        {event.notes}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Scènes de l'événement courant */}
          <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
              Scenes de l'evenement
            </h2>
            <EventStagesManager 
              eventId={currentEvent?.id || null} 
              companyId={currentCompanyId} 
            />
          </div>

          {/* Configuration des types/spécificités de scènes */}
          <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
              Types et specificites de scenes
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Configurez les options disponibles pour categoriser vos scenes
            </p>
            <StageEnumsManager companyId={currentCompanyId} />
          </div>

          {/* Modal EventForm */}
          <EventForm
            open={showEventForm}
            onClose={handleFormClose}
            companyId={currentCompanyId}
            editingEventId={editingEventId}
          />

          {/* Modal de confirmation de suppression */}
          <ConfirmDeleteModal
            isOpen={!!deletingEvent}
            onClose={() => setDeletingEvent(null)}
            onConfirm={handleConfirmDelete}
            title="Supprimer l'événement"
            message="Êtes-vous sûr de vouloir supprimer cet événement ?"
            itemName={deletingEvent?.name}
            loading={deleting}
          />
        </>
      )}
    </div>
  );
}


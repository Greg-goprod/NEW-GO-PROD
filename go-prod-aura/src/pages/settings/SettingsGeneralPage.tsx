import React, { useState, useEffect } from 'react';
import { Globe, Palette, Image as ImageIcon, Upload, Check } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';
import { Button } from '@/components/aura/Button';
import { useToast } from '@/components/aura/ToastProvider';
import { SmtpConfigManager } from '@/features/settings/email/SmtpConfigManager';
import { getCurrentCompanyId } from '@/lib/tenant';
import { supabase } from '@/lib/supabaseClient';
import { useEventStore } from '@/store/useEventStore';

export function SettingsGeneralPage() {
  const [language, setLanguage] = useState('fr');
  const [theme, setTheme] = useState('dark');
  const { success: toastSuccess, error: toastError } = useToast();
  
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  const currentEvent = useEventStore((state) => state.currentEvent);

  // Logo states
  const [eventLogos, setEventLogos] = useState<string[]>([]);
  const [activeLogo, setActiveLogo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Recuperer le company_id au montage
  useEffect(() => {
    (async () => {
      try {
        const cid = await getCurrentCompanyId(supabase);
        setCurrentCompanyId(cid);
      } catch (e) {
        console.error('Erreur recuperation company_id:', e);
        toastError('Erreur lors de la recuperation de l\'entreprise');
      }
    })();
  }, []);

  // Charger les logos quand l'evenement change
  useEffect(() => {
    if (currentEvent?.id) {
      loadEventLogos(currentEvent.id);
      setActiveLogo(currentEvent.logo_url || null);
    } else {
      setEventLogos([]);
      setActiveLogo(null);
    }
  }, [currentEvent?.id, currentEvent?.logo_url]);

  const loadEventLogos = async (eventId: string) => {
    try {
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

      const logoFiles = (data || [])
        .filter(file => file.name && !file.name.startsWith('.'))
        .map(file => `${eventId}/${file.name}`);

      setEventLogos(logoFiles);
    } catch (err) {
      console.error('Erreur loadEventLogos:', err);
      setEventLogos([]);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentEvent?.id) {
      toastError('Aucun evenement selectionne');
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toastError('Format non supporte. Utilisez JPG, PNG, WebP, GIF ou SVG');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toastError('Le fichier ne doit pas depasser 5 Mo');
      return;
    }

    setUploading(true);
    try {
      const timestamp = Date.now();
      const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
      const safeName = `logo_${timestamp}.${extension}`;
      const storagePath = `${currentEvent.id}/${safeName}`;

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

      setEventLogos(prev => [storagePath, ...prev]);
      toastSuccess('Logo uploade avec succes');
    } catch (error: any) {
      console.error('Erreur upload logo:', error);
      toastError(error?.message || 'Erreur lors de l\'upload du logo');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleLogoSelect = async (logoPath: string) => {
    if (!currentEvent?.id) {
      toastError('Aucun evenement selectionne');
      return;
    }

    try {
      const { data: urlData } = supabase.storage
        .from('event-logos')
        .getPublicUrl(logoPath);

      const logoUrl = urlData?.publicUrl || null;

      const { error } = await supabase
        .from('events')
        .update({ logo_url: logoUrl })
        .eq('id', currentEvent.id);

      if (error) {
        console.error('Erreur mise a jour logo:', error);
        throw error;
      }

      setActiveLogo(logoUrl);
      toastSuccess('Logo selectionne comme actif');
    } catch (error: any) {
      console.error('Erreur handleLogoSelect:', error);
      toastError(error?.message || 'Erreur lors de la selection du logo');
    }
  };

  // Charger les preferences depuis localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('app_lang') || 'fr';
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    setLanguage(savedLanguage);
    setTheme(savedTheme);
  }, []);

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem('app_lang', newLanguage);
    
    // Appliquer la langue si i18n est disponible
    if ((window as any).i18n) {
      (window as any).i18n.changeLanguage(newLanguage);
    }
    
    toastSuccess(`Langue changée vers ${newLanguage === 'fr' ? 'Français' : 'English'}`);
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Appliquer le thème immédiatement
    document.documentElement.setAttribute('data-theme', newTheme);
    document.documentElement.className = newTheme === 'dark' ? 'dark' : '';
    
    toastSuccess(`Theme change vers ${newTheme === 'dark' ? 'Sombre' : 'Clair'}`);
  };

  return (
    <div className="space-y-6">
      {/* En-tete */}
      <div>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Parametres Generaux
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Langue, theme et configuration email
        </p>
      </div>

      {/* Grille 3 colonnes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Langue */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Langue
              </h3>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={language === 'fr' ? 'primary' : 'secondary'}
                onClick={() => handleLanguageChange('fr')}
                className="flex-1"
              >
                FR
              </Button>
              <Button
                size="sm"
                variant={language === 'en' ? 'primary' : 'secondary'}
                onClick={() => handleLanguageChange('en')}
                className="flex-1"
              >
                EN
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Theme
              </h3>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={theme === 'light' ? 'primary' : 'secondary'}
                onClick={() => handleThemeChange('light')}
                className="flex-1"
              >
                Clair
              </Button>
              <Button
                size="sm"
                variant={theme === 'dark' ? 'primary' : 'secondary'}
                onClick={() => handleThemeChange('dark')}
                className="flex-1"
              >
                Sombre
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Configuration Email SMTP - 2 colonnes */}
        {currentCompanyId && (
          <div className="md:col-span-2">
            <SmtpConfigManager companyId={currentCompanyId} />
          </div>
        )}

        {/* Logo de l'evenement */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Logo
              </h3>
            </div>
          </CardHeader>
          <CardBody>
            {!currentEvent ? (
              <div 
                className="rounded-lg p-3 text-xs"
                style={{ 
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)'
                }}
              >
                <span className="text-amber-400">Aucun evenement selectionne</span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Upload */}
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <span
                    className={`inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 text-sm px-3 py-1.5 w-full bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Upload...' : 'Uploader'}
                  </span>
                </label>

                {/* Galerie des logos */}
                {eventLogos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {eventLogos.slice(0, 4).map((logoPath, index) => {
                      const { data: urlData } = supabase.storage
                        .from('event-logos')
                        .getPublicUrl(logoPath);
                      const logoUrl = urlData?.publicUrl || '';
                      const isActive = activeLogo === logoUrl;
                      
                      return (
                        <div
                          key={index}
                          className="relative cursor-pointer"
                          onClick={() => handleLogoSelect(logoPath)}
                        >
                          <div 
                            className={`aspect-square rounded-lg flex items-center justify-center overflow-hidden transition-all ${
                              isActive ? 'ring-2 ring-green-500' : ''
                            }`}
                            style={{ 
                              background: 'var(--bg-surface)',
                              border: `1px solid ${isActive ? 'var(--success)' : 'var(--color-border)'}`
                            }}
                          >
                            {logoUrl && (
                              <img 
                                src={logoUrl} 
                                alt={`Logo ${index + 1}`}
                                className="w-full h-full object-contain p-1"
                              />
                            )}
                          </div>
                          {isActive && (
                            <Check className="absolute top-1 right-1 w-4 h-4 text-green-500" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Aucun logo</p>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}


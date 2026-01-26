import React, { useState } from 'react';
import { Users, DollarSign, Eye, Upload } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { Badge } from '@/components/aura/Badge';
import { useToast } from '@/components/aura/ToastProvider';

export function SettingsArtistsPage() {
  const [formData, setFormData] = useState({
    defaultCurrency: 'EUR',
    roundingRules: 'round',
    publicVisibility: false,
  });
  const { success: toastSuccess } = useToast();

  const handleSave = () => {
    localStorage.setItem('artist_settings', JSON.stringify(formData));
    toastSuccess('Paramètres artistes sauvegardés');
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Options Artistes
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Gerez les parametres et preferences des artistes
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Parametres artistes
            </h2>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Devise par defaut des cachets
                </label>
                <select
                  value={formData.defaultCurrency}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultCurrency: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                  style={{ 
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="EUR">EUR (EUR)</option>
                  <option value="USD">USD ($)</option>
                  <option value="CHF">CHF (CHF)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Regles d'arrondi
                </label>
                <select
                  value={formData.roundingRules}
                  onChange={(e) => setFormData(prev => ({ ...prev, roundingRules: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                  style={{ 
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="round">Arrondir</option>
                  <option value="ceil">Arrondir vers le haut</option>
                  <option value="floor">Arrondir vers le bas</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="publicVisibility"
                checked={formData.publicVisibility}
                onChange={(e) => setFormData(prev => ({ ...prev, publicVisibility: e.target.checked }))}
                className="rounded-md w-5 h-5 text-violet-500 focus:ring-violet-500"
                style={{ 
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--color-border)'
                }}
              />
              <label htmlFor="publicVisibility" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Visibilite publique des artistes
              </label>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Fonctionnalités futures */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Fonctionnalites futures
          </h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div 
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: 'var(--bg-surface)' }}
            >
              <div className="flex items-center gap-3">
                <Upload className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                <div>
                  <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Mapping Spotify</h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Synchronisation automatique avec Spotify</p>
                </div>
              </div>
              <Badge color="gray">Bientot</Badge>
            </div>

            <div 
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: 'var(--bg-surface)' }}
            >
              <div className="flex items-center gap-3">
                <Upload className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                <div>
                  <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Import CSV artistes</h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Import en masse depuis un fichier CSV</p>
                </div>
              </div>
              <Badge color="gray">Bientot</Badge>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary" onClick={handleSave}>
          Enregistrer les paramètres
        </Button>
      </div>
    </div>
  );
}


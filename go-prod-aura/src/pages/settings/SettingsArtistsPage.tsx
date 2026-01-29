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

      {/* Grille 3 colonnes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Devise */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Devise</h3>
            </div>
          </CardHeader>
          <CardBody>
            <select
              value={formData.defaultCurrency}
              onChange={(e) => setFormData(prev => ({ ...prev, defaultCurrency: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="CHF">CHF</option>
            </select>
          </CardBody>
        </Card>

        {/* Arrondi */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Arrondi</h3>
            </div>
          </CardHeader>
          <CardBody>
            <select
              value={formData.roundingRules}
              onChange={(e) => setFormData(prev => ({ ...prev, roundingRules: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              <option value="round">Standard</option>
              <option value="ceil">Superieur</option>
              <option value="floor">Inferieur</option>
            </select>
          </CardBody>
        </Card>

        {/* Visibilite */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Visibilite</h3>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="publicVisibility"
                checked={formData.publicVisibility}
                onChange={(e) => setFormData(prev => ({ ...prev, publicVisibility: e.target.checked }))}
                className="rounded w-4 h-4 text-violet-500 focus:ring-violet-500"
              />
              <label htmlFor="publicVisibility" className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Publique
              </label>
            </div>
          </CardBody>
        </Card>

        {/* Fonctionnalites futures */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Spotify</h3>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sync auto</span>
              <Badge color="gray">Bientot</Badge>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Import CSV</h3>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Import masse</span>
              <Badge color="gray">Bientot</Badge>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" size="sm" onClick={handleSave}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
}


import { useState } from 'react';
import { Coffee, Hotel, Users, FileText } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';
import { Button } from '@/components/aura/Button';
import { useToast } from '@/components/aura/ToastProvider';
import { TimePickerPopup } from '@/components/ui/pickers/TimePickerPopup';

export function SettingsHospitalityPage() {
  const [formData, setFormData] = useState({
    hotelPolicy: 'standard',
    buyoutPolicy: 'negotiable',
    roomingListFormat: 'excel',
    defaultCheckIn: '15:00',
    defaultCheckOut: '11:00',
  });
  const { success: toastSuccess } = useToast();

  const handleSave = () => {
    localStorage.setItem('hospitality_settings', JSON.stringify(formData));
    toastSuccess('Paramètres hospitality sauvegardés');
  };

  return (
    <div className="space-y-6">
      {/* En-tete */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Options Hospitality
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Hotels, buyout et hebergement
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleSave}>
          Enregistrer
        </Button>
      </div>

      {/* Grille 3 colonnes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Politique hotels */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Hotel className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Hotels</h3>
            </div>
          </CardHeader>
          <CardBody>
            <select
              value={formData.hotelPolicy}
              onChange={(e) => setFormData(prev => ({ ...prev, hotelPolicy: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              <option value="standard">Standard</option>
              <option value="luxury">Luxe</option>
              <option value="budget">Budget</option>
              <option value="mixed">Mixte</option>
            </select>
          </CardBody>
        </Card>

        {/* Politique buyout */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Coffee className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Buyout</h3>
            </div>
          </CardHeader>
          <CardBody>
            <select
              value={formData.buyoutPolicy}
              onChange={(e) => setFormData(prev => ({ ...prev, buyoutPolicy: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              <option value="negotiable">Negociable</option>
              <option value="fixed">Fixe</option>
              <option value="per_diem">Par jour</option>
              <option value="none">Aucun</option>
            </select>
          </CardBody>
        </Card>

        {/* Format rooming list */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Rooming</h3>
            </div>
          </CardHeader>
          <CardBody>
            <select
              value={formData.roomingListFormat}
              onChange={(e) => setFormData(prev => ({ ...prev, roomingListFormat: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
              <option value="json">JSON</option>
            </select>
          </CardBody>
        </Card>

        {/* Check-in */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Check-in</h3>
            </div>
          </CardHeader>
          <CardBody>
            <TimePickerPopup
              value={formData.defaultCheckIn || null}
              onChange={(time) => setFormData(prev => ({ ...prev, defaultCheckIn: time || '' }))}
            />
          </CardBody>
        </Card>

        {/* Check-out */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Check-out</h3>
            </div>
          </CardHeader>
          <CardBody>
            <TimePickerPopup
              value={formData.defaultCheckOut || null}
              onChange={(time) => setFormData(prev => ({ ...prev, defaultCheckOut: time || '' }))}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}



export default SettingsHospitalityPage;
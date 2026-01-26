import { useState } from 'react';
import { Truck, Coffee } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { useToast } from '@/components/aura/ToastProvider';

export function SettingsProductionPage() {
  const [groundData, setGroundData] = useState({
    defaultTransportHours: '2',
    emergencyNumber: '',
    smsTemplate: 'Bonjour {name}, votre transport est prévu à {time}.',
    emailTemplate: 'Transport confirmé pour {name} à {time}.',
  });

  const [hospitalityData, setHospitalityData] = useState({
    hotelPolicy: 'standard',
    buyoutPolicy: 'negotiable',
    roomingListFormat: 'excel',
    defaultCheckIn: '15:00',
    defaultCheckOut: '11:00',
  });

  const { success: toastSuccess } = useToast();

  const handleSave = () => {
    localStorage.setItem('ground_settings', JSON.stringify(groundData));
    localStorage.setItem('hospitality_settings', JSON.stringify(hospitalityData));
    toastSuccess('Paramètres production sauvegardés');
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Options Production
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Gerez les parametres logistique et hospitality
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne LOGISTIQUE TERRAIN */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-violet-400" />
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Logistique terrain
                </h3>
              </div>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Configuration des transports et communications
              </p>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <Input
                    label="Heures de transport par défaut"
                    type="number"
                    value={groundData.defaultTransportHours}
                    onChange={(e) => setGroundData(prev => ({ ...prev, defaultTransportHours: e.target.value }))}
                    placeholder="2"
                  />
                  
                  <Input
                    label="Numéro d'urgence"
                    type="tel"
                    value={groundData.emergencyNumber}
                    onChange={(e) => setGroundData(prev => ({ ...prev, emergencyNumber: e.target.value }))}
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Modele de SMS
                  </label>
                  <textarea
                    value={groundData.smsTemplate}
                    onChange={(e) => setGroundData(prev => ({ ...prev, smsTemplate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                    style={{ 
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--text-primary)'
                    }}
                    rows={3}
                    placeholder="Bonjour {name}, votre transport est prevu a {time}."
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Variables disponibles: {"{name}"}, {"{time}"}, {"{location}"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Modele d'e-mail
                  </label>
                  <textarea
                    value={groundData.emailTemplate}
                    onChange={(e) => setGroundData(prev => ({ ...prev, emailTemplate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                    style={{ 
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--text-primary)'
                    }}
                    rows={4}
                    placeholder="Transport confirme pour {name} a {time}."
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Variables disponibles: {"{name}"}, {"{time}"}, {"{location}"}, {"{driver}"}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Colonne HOSPITALITY */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-violet-400" />
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Hospitality
                </h3>
              </div>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Configuration des hebergements et buyout
              </p>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Politique hotels
                  </label>
                  <select
                    value={hospitalityData.hotelPolicy}
                    onChange={(e) => setHospitalityData(prev => ({ ...prev, hotelPolicy: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                    style={{ 
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="standard">Standard</option>
                    <option value="luxury">Luxe</option>
                    <option value="budget">Budget</option>
                    <option value="mixed">Mixte</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Politique buyout
                  </label>
                  <select
                    value={hospitalityData.buyoutPolicy}
                    onChange={(e) => setHospitalityData(prev => ({ ...prev, buyoutPolicy: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                    style={{ 
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="negotiable">Negociable</option>
                    <option value="fixed">Fixe</option>
                    <option value="per_diem">Par jour</option>
                    <option value="none">Aucun</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Format rooming list
                  </label>
                  <select
                    value={hospitalityData.roomingListFormat}
                    onChange={(e) => setHospitalityData(prev => ({ ...prev, roomingListFormat: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                    style={{ 
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="excel">Excel (.xlsx)</option>
                    <option value="csv">CSV</option>
                    <option value="pdf">PDF</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Check-in par défaut"
                    type="time"
                    value={hospitalityData.defaultCheckIn}
                    onChange={(e) => setHospitalityData(prev => ({ ...prev, defaultCheckIn: e.target.value }))}
                  />
                  
                  <Input
                    label="Check-out par défaut"
                    type="time"
                    value={hospitalityData.defaultCheckOut}
                    onChange={(e) => setHospitalityData(prev => ({ ...prev, defaultCheckOut: e.target.value }))}
                  />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" onClick={handleSave}>
          Enregistrer les paramètres
        </Button>
      </div>
    </div>
  );
}

export default SettingsProductionPage;


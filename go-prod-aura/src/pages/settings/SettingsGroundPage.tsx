import { useState } from 'react';
import { Truck, Clock, MessageSquare, Phone } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { useToast } from '@/components/aura/ToastProvider';

export function SettingsGroundPage() {
  const [formData, setFormData] = useState({
    defaultTransportHours: '2',
    emergencyNumber: '',
    smsTemplate: 'Bonjour {name}, votre transport est prévu à {time}.',
    emailTemplate: 'Transport confirmé pour {name} à {time}.',
  });
  const { success: toastSuccess } = useToast();

  const handleSave = () => {
    localStorage.setItem('ground_settings', JSON.stringify(formData));
    toastSuccess('Paramètres logistique terrain sauvegardés');
  };

  return (
    <div className="space-y-6">
      {/* En-tete */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Options Logistique
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Transport et communications terrain
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleSave}>
          Enregistrer
        </Button>
      </div>

      {/* Grille 3 colonnes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Transport */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Transport</h3>
            </div>
          </CardHeader>
          <CardBody>
            <Input
              label="Heures defaut"
              type="number"
              value={formData.defaultTransportHours}
              onChange={(e) => setFormData(prev => ({ ...prev, defaultTransportHours: e.target.value }))}
              placeholder="2"
            />
          </CardBody>
        </Card>

        {/* Urgence */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Urgence</h3>
            </div>
          </CardHeader>
          <CardBody>
            <Input
              label="Numero"
              type="tel"
              value={formData.emergencyNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, emergencyNumber: e.target.value }))}
              placeholder="+33..."
            />
          </CardBody>
        </Card>

        {/* SMS */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>SMS</h3>
            </div>
          </CardHeader>
          <CardBody>
            <textarea
              value={formData.smsTemplate}
              onChange={(e) => setFormData(prev => ({ ...prev, smsTemplate: e.target.value }))}
              className="w-full px-2 py-1.5 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              rows={4}
              placeholder="Bonjour {name}..."
            />
          </CardBody>
        </Card>

        {/* Email */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Email</h3>
            </div>
          </CardHeader>
          <CardBody>
            <textarea
              value={formData.emailTemplate}
              onChange={(e) => setFormData(prev => ({ ...prev, emailTemplate: e.target.value }))}
              className="w-full px-2 py-1.5 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              rows={4}
              placeholder="Transport confirme..."
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}



export default SettingsGroundPage;
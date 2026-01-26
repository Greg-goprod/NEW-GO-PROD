import React, { useState } from 'react';
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
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Logistique terrain
            </h2>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Heures de transport par défaut"
                  type="number"
                  value={formData.defaultTransportHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultTransportHours: e.target.value }))}
                  placeholder="2"
                />
              </div>
              
              <div>
                <Input
                  label="Numéro d'urgence"
                  type="tel"
                  value={formData.emergencyNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergencyNumber: e.target.value }))}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Modèle de SMS
              </label>
              <textarea
                value={formData.smsTemplate}
                onChange={(e) => setFormData(prev => ({ ...prev, smsTemplate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Bonjour {name}, votre transport est prévu à {time}."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Variables disponibles: {"{name}"}, {"{time}"}, {"{location}"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Modèle d'e-mail
              </label>
              <textarea
                value={formData.emailTemplate}
                onChange={(e) => setFormData(prev => ({ ...prev, emailTemplate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Transport confirmé pour {name} à {time}."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Variables disponibles: {"{name}"}, {"{time}"}, {"{location}"}, {"{driver}"}
              </p>
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



export default SettingsGroundPage;
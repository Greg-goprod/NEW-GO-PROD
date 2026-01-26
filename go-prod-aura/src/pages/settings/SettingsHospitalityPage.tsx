import React, { useState } from 'react';
import { Coffee, Hotel, Users, FileText } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { useToast } from '@/components/aura/ToastProvider';

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
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Coffee className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Hospitality
            </h2>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Politique hôtels
                </label>
                <select
                  value={formData.hotelPolicy}
                  onChange={(e) => setFormData(prev => ({ ...prev, hotelPolicy: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="standard">Standard</option>
                  <option value="luxury">Luxe</option>
                  <option value="budget">Budget</option>
                  <option value="mixed">Mixte</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Politique buyout
                </label>
                <select
                  value={formData.buyoutPolicy}
                  onChange={(e) => setFormData(prev => ({ ...prev, buyoutPolicy: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="negotiable">Négociable</option>
                  <option value="fixed">Fixe</option>
                  <option value="per_diem">Par jour</option>
                  <option value="none">Aucun</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Format rooming list
                </label>
                <select
                  value={formData.roomingListFormat}
                  onChange={(e) => setFormData(prev => ({ ...prev, roomingListFormat: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="excel">Excel (.xlsx)</option>
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              
              <div>
                <Input
                  label="Check-in par défaut"
                  type="time"
                  value={formData.defaultCheckIn}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultCheckIn: e.target.value }))}
                />
              </div>
              
              <div>
                <Input
                  label="Check-out par défaut"
                  type="time"
                  value={formData.defaultCheckOut}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultCheckOut: e.target.value }))}
                />
              </div>
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



export default SettingsHospitalityPage;
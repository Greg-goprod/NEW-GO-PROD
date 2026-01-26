import React from 'react';
import { Newspaper } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';

export function SettingsPressePage() {
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Options Presse
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Gerez les parametres presse et relations medias
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-violet-400" />
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Configuration Presse
            </h3>
          </div>
        </CardHeader>
        <CardBody>
          <div className="text-center py-12">
            <Newspaper className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Section en construction
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Les parametres presse seront bientot disponibles
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default SettingsPressePage;



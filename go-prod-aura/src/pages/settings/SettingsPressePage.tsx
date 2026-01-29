import { Newspaper } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';

export function SettingsPressePage() {
  return (
    <div className="space-y-6">
      {/* En-tete */}
      <div>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Options Presse
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Parametres presse et relations medias
        </p>
      </div>

      {/* Grille 3 colonnes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Presse</h3>
            </div>
          </CardHeader>
          <CardBody>
            <div className="text-center py-6">
              <Newspaper className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Bientot disponible
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default SettingsPressePage;



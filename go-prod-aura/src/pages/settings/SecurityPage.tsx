import { Card } from '../../shared/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Badge } from '../../components/ui/Badge'

export default function SecurityPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-manrope tracking-tight">Sécurité</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Mot de passe">
          <div className="space-y-4">
            <Input 
              label="Mot de passe actuel" 
              type="password"
              placeholder="••••••••"
            />
            <Input 
              label="Nouveau mot de passe" 
              type="password"
              placeholder="••••••••"
              helperText="Minimum 8 caractères"
            />
            <Input 
              label="Confirmer le mot de passe" 
              type="password"
              placeholder="••••••••"
            />
            <Button>
              Changer le mot de passe
            </Button>
          </div>
        </Card>

        <Card title="Authentification à deux facteurs">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-surface">
              <div className="flex items-center gap-3">
                <Icon name="Shield" className="text-success" />
                <div>
                  <div className="font-medium">2FA activée</div>
                  <div className="text-sm text-muted">Via application d'authentification</div>
                </div>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
            <Button variant="secondary">
              Configurer 2FA
            </Button>
            <p className="text-sm text-muted">
              Ajoutez une couche de sécurité supplémentaire à votre compte avec l'authentification à deux facteurs.
            </p>
          </div>
        </Card>

        <Card title="Sessions actives" className="lg:col-span-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg bg-surface">
              <div className="flex items-center gap-3">
                <Icon name="Monitor" />
                <div>
                  <div className="font-medium">Windows • Chrome</div>
                  <div className="text-sm text-muted">Paris, France • En cours</div>
                </div>
              </div>
              <Badge variant="primary">Actuelle</Badge>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-surface">
              <div className="flex items-center gap-3">
                <Icon name="Smartphone" />
                <div>
                  <div className="font-medium">iPhone • Safari</div>
                  <div className="text-sm text-muted">Paris, France • Il y a 2 heures</div>
                </div>
              </div>
              <Button variant="secondary">Déconnecter</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

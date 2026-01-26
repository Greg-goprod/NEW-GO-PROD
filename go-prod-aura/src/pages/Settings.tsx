import { Card } from '../shared/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { Tabs } from '../components/ui/Tabs'
import { Accordion } from '../components/ui/Accordion'
import { Avatar } from '../components/ui/Avatar'
import { Icon } from '../components/ui/Icon'

export default function Settings() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/' },
          { label: 'Paramètres' },
        ]}
      />

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-manrope font-medium tracking-tight">Paramètres de l’organisation</h1>
          <p className="text-sm text-[var(--text-muted)]">Gestion de la marque, notifications et accès équipe.</p>
        </div>
        <Badge variant="primary">Édition live</Badge>
      </header>

      <Card className="rounded-2xl" title="Identité">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Nom de l’organisation" placeholder="Go-Prod Aura" />
          <Input label="URL publique" placeholder="go-prod.aura" />
          <Textarea label="Signature emails" rows={4} placeholder="Merci pour votre confiance – L’équipe Go-Prod" />
          <div className="flex flex-col gap-3">
            <label className="text-sm text-[var(--text-muted)]">Logo principal</label>
            <div className="card-surface rounded-xl p-4">
              <Avatar size="xl" fallback="GP" />
              <Button variant="secondary" className="mt-3" leftIcon={<Icon name="Upload" />}>Téléverser</Button>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary">Annuler</Button>
          <Button>Enregistrer</Button>
        </div>
      </Card>

      <Card className="rounded-2xl" title="Notifications">
        <Tabs
          tabs={[
            { id: 'email', label: 'Email' },
            { id: 'sms', label: 'SMS' },
            { id: 'app', label: 'App' },
          ]}
          activeId="email"
          onChange={() => undefined}
        />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Select
            label="Alertes missions"
            options={[
              { value: 'all', label: 'Tous les événements' },
              { value: 'critical', label: 'Urgences uniquement' },
            ]}
          />
          <Select
            label="Récap hebdomadaire"
            options={[
              { value: 'monday', label: 'Lundi 08h00' },
              { value: 'friday', label: 'Vendredi 18h00' },
            ]}
          />
          <Textarea label="Message personnalisé" placeholder="Merci de confirmer vos missions avant vendredi 18h." />
          <Input label="Email de reply-to" type="email" placeholder="ops@go-prod.aura" />
        </div>
      </Card>

      <Card className="rounded-2xl" title="Équipe & accès">
        <Accordion
          items={[
            {
              id: 'core-team',
              title: 'Équipe principale',
              content: (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar size="sm" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop" />
                    <div>
                      <div className="font-medium">Emma Johnson</div>
                      <div className="text-sm text-[var(--text-muted)]">Operations</div>
                    </div>
                    <Badge variant="success">Admin</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar size="sm" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop" />
                    <div>
                      <div className="font-medium">Marcus Chen</div>
                      <div className="text-sm text-[var(--text-muted)]">Booking lead</div>
                    </div>
                    <Badge variant="warning">Éditeur</Badge>
                  </div>
                </div>
              ),
            },
            {
              id: 'permissions',
              title: 'Permissions & API',
              content: <p className="text-[var(--text-secondary)]">Gère les clés API, webhooks et accès partenaires.</p>,
            },
          ]}
        />
        <div className="mt-4 flex justify-end">
          <Button leftIcon={<Icon name="Plus" />}>Inviter un membre</Button>
        </div>
      </Card>
    </div>
  )
}


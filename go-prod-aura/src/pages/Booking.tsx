import * as React from 'react'
import { Card } from '../shared/Card'
import { Button } from '../components/ui/Button'
import { Tabs } from '../components/ui/Tabs'
import { Accordion } from '../components/ui/Accordion'
import { Badge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import { Progress } from '../components/ui/Progress'
import { Icon } from '../components/ui/Icon'
import { DateTimePickerAura } from '../components/ui/DateTimePickerAura'
import { Toast } from '../components/ui/Toast'

export default function Booking() {
  const [activeTab, setActiveTab] = React.useState('kanban')
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(new Date())
  const [toast, setToast] = React.useState<{ title: string; description: string; variant: 'success' | 'error' } | null>(null)

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-manrope font-medium tracking-tight">Booking & Planification</h1>
          <p className="text-sm text-[var(--text-muted)]">Synchronise les missions, ressources et disponibilités.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" leftIcon={<Icon name="Download" />}>Exporter</Button>
          <Button leftIcon={<Icon name="Plus" />}>Nouvelle mission</Button>
        </div>
      </header>

      <Card className="rounded-2xl" title="Vue d’ensemble">
        <div className="flex flex-wrap gap-4">
          <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(113, 61, 255, 0.15)', border: '1px solid rgba(113, 61, 255, 0.25)' }}>
            <div className="text-xs text-[var(--text-muted)] uppercase">Missions confirmées</div>
            <div className="text-3xl font-manrope font-medium">42</div>
            <Badge variant="success">+8%</Badge>
          </div>
          <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
            <div className="text-xs text-[var(--text-muted)] uppercase">En attente</div>
            <div className="text-3xl font-manrope font-medium">7</div>
            <Badge variant="warning">-2%</Badge>
          </div>
          <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
            <div className="text-xs text-[var(--text-muted)] uppercase">Capacité</div>
            <div className="text-3xl font-manrope font-medium">78%</div>
            <Progress value={78} />
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl" title="Organisation">
        <Tabs
          tabs={[
            { id: 'kanban', label: 'Kanban' },
            { id: 'planning', label: 'Planning' },
            { id: 'documents', label: 'Documents' },
          ]}
          activeId={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'kanban' ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {['À faire', 'En cours', 'Terminé'].map((column) => (
              <div key={column} className="kanban-column">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{column}</h3>
                  <Badge variant="primary">3</Badge>
                </div>
                <div className="kanban-card">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="warning">Urgent</Badge>
                    <Icon name="MoreHorizontal" className="w-4 h-4 text-[var(--text-muted)]" />
                  </div>
                  <h4 className="font-medium mb-2">Coordonner transfert artistes</h4>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">Paris → Lyon / 16 mars</p>
                  <div className="flex items-center gap-2">
                    <Avatar size="sm" src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop" />
                    <span className="text-xs text-[var(--text-muted)]">Alex M.</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === 'planning' ? (
          <div className="mt-6">
            <DateTimePickerAura value={selectedDate} onChange={setSelectedDate} />
          </div>
        ) : null}

        {activeTab === 'documents' ? (
          <div className="mt-6">
            <Accordion
              items={[
                {
                  id: 'contracts',
                  title: 'Contrats artistes',
                  content: <p className="text-[var(--text-secondary)]">Templates WOPE, PDF signés, avenants.</p>,
                },
                {
                  id: 'logistics',
                  title: 'Logistique & transports',
                  content: <p className="text-[var(--text-secondary)]">Briefs chauffeurs, feuilles de route, contacts locaux.</p>,
                },
              ]}
            />
          </div>
        ) : null}
      </Card>

      <Card className="rounded-2xl" title="Actions rapides">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card-surface rounded-2xl p-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center gradient-primary mb-4">
              <Icon name="Upload" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Importer planning</h3>
            <p className="text-sm text-[var(--text-secondary)]">Ajoute un CSV ou PDF de missions existantes.</p>
          </div>
          <div className="card-surface rounded-2xl p-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center gradient-accent mb-4">
              <Icon name="Share2" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Partager la feuille</h3>
            <p className="text-sm text-[var(--text-secondary)]">Envoie le planning aux équipes terrains.</p>
          </div>
          <div className="card-surface rounded-2xl p-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center gradient-primary mb-4">
              <Icon name="Settings" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Paramètres booking</h3>
            <p className="text-sm text-[var(--text-secondary)]">Horaires limites, validations, notifications.</p>
          </div>
        </div>
      </Card>

      <Button
        variant="secondary"
        onClick={() => setToast({ title: 'Mission planifiée', description: 'Les chauffeurs ont été notifiés', variant: 'success' })}
        leftIcon={<Icon name="BellRing" />}
      >
        Simuler notification
      </Button>

      {toast ? (
        <Toast
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          onClose={() => setToast(null)}
          autoDismiss={4000}
        />
      ) : null}
    </div>
  )
}


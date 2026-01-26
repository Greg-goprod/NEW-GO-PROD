import { Icon } from '../components/ui/Icon'
import { Button } from '../components/ui/Button'

export default function Home(){
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="h1">Go-Prod V2 Design System</h1>
          <p className="muted">Vue d'ensemble des réservations et missions. Style Aura WoPe.</p>
        </div>
        <div className="flex gap-2">
          <Button className="btn-secondary"><Icon name="HelpCircle" size={16}/> Aide</Button>
          <Button><Icon name="Rocket" size={16}/> Démarrer</Button>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        {[{i:'Users',v:'142',l:'Artistes actifs',d:'+12%'},{i:'Truck',v:'28',l:"Missions aujourd'hui",d:'En cours'},{i:'Calendar',v:'89',l:'Réservations ce mois',d:'+8%'},{i:'Euro',v:'328K€',l:"Chiffre d'affaires",d:'+23%'}].map((k) =>
          <div key={k.l} className="kpi card-hover">
            <div className="w-14 h-14 rounded-xl grid place-items-center"
                 style={{background:'linear-gradient(135deg, color-mix(in oklab, var(--color-primary) 22%, transparent), transparent)', border:'1px solid color-mix(in oklab, var(--color-primary) 22%, var(--color-border))'}}>
              <Icon name={k.i as any}/>
            </div>
            <div><div className="value">{k.v}</div><div className="muted">{k.l}</div></div>
            <div><span className="badge success">{k.d}</span></div>
          </div>
        )}
      </section>

      <section className="card-surface p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-manrope font-semibold">Réservations récentes</h3>
            <p className="muted text-sm">Dernières confirmations et bookings</p>
          </div>
          <Button className="btn-secondary">Voir tout</Button>
        </div>
        <div className="overflow-auto rounded-xl">
          <table className="table">
            <thead><tr><th>Artiste</th><th>Événement</th><th>Date</th><th>Statut</th><th>Montant</th><th></th></tr></thead>
            <tbody>
              <tr><td>Emma Johnson</td><td>Festival Électrique – Paris</td><td>15.03.2024</td><td><span className="badge success">Confirmé</span></td><td>8 500 €</td><td><Icon name="MoreHorizontal"/></td></tr>
              <tr><td>DJ Nova</td><td>Night Pulse – Lyon</td><td>21.03.2024</td><td><span className="badge">Option</span></td><td>5 200 €</td><td><Icon name="MoreHorizontal"/></td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

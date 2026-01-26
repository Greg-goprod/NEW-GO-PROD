import { Card } from '../../shared/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { Icon } from '../../components/ui/Icon'

export default function ProfilePage() {
  // TODO: Récupérer le profil depuis Supabase
  const profile = {
    full_name: 'Jean Dupont',
    email: 'jean.dupont@example.com',
    avatar_url: null,
    role: 'admin'
  }

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-manrope tracking-tight">Mon profil</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Photo de profil">
          <div className="flex items-center gap-6">
            <Avatar 
              src={profile.avatar_url || undefined} 
              size="xl" 
              fallback={profile.full_name.split(' ').map(n => n[0]).join('')}
            />
            <div className="space-y-2">
              <Button leftIcon={<Icon name="Upload" />}>
                Changer la photo
              </Button>
              <p className="text-sm text-muted">JPG, PNG ou GIF. Max 2 MB.</p>
            </div>
          </div>
        </Card>

        <Card title="Informations personnelles">
          <div className="space-y-4">
            <Input 
              label="Nom complet" 
              defaultValue={profile.full_name}
              placeholder="Jean Dupont"
            />
            <Input 
              label="Email" 
              type="email"
              defaultValue={profile.email}
              placeholder="jean.dupont@example.com"
            />
            <Input 
              label="Rôle" 
              value={profile.role}
              disabled
              helperText="Contactez un administrateur pour modifier votre rôle"
            />
            <Button>
              Enregistrer les modifications
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

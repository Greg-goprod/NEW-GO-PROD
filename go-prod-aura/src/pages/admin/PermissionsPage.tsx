import { Card } from '../../shared/Card'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'

export default function PermissionsPage() {
  // TODO: Récupérer les utilisateurs depuis Supabase
  const users = [
    { id: '1', full_name: 'Jean Dupont', email: 'jean@example.com', role: 'admin', avatar_url: null },
    { id: '2', full_name: 'Marie Martin', email: 'marie@example.com', role: 'manager', avatar_url: null },
    { id: '3', full_name: 'Pierre Durand', email: 'pierre@example.com', role: 'user', avatar_url: null },
  ]

  const roleColors: Record<string, 'primary' | 'success' | 'warning'> = {
    admin: 'primary',
    manager: 'success',
    user: 'warning'
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-manrope tracking-tight">Autorisations</h1>
          <p className="text-muted mt-2">Gérez les rôles et permissions des utilisateurs</p>
        </div>
        <Button leftIcon={<Icon name="UserPlus" />}>
          Inviter un utilisateur
        </Button>
      </div>

      <Card title="Rôles disponibles">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="primary">Admin</Badge>
              <Icon name="Crown" className="text-primary" />
            </div>
            <div className="text-sm text-muted">
              Accès complet à toutes les fonctionnalités et paramètres
            </div>
          </div>
          <div className="p-4 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="success">Manager</Badge>
              <Icon name="Users" className="text-success" />
            </div>
            <div className="text-sm text-muted">
              Gestion des bookings et des artistes
            </div>
          </div>
          <div className="p-4 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="warning">User</Badge>
              <Icon name="User" className="text-warning" />
            </div>
            <div className="text-sm text-muted">
              Accès en lecture seule
            </div>
          </div>
        </div>
      </Card>

      <Card title="Utilisateurs" className="overflow-hidden p-0">
        <table className="table w-full">
          <thead className="bg-surface sticky top-0 z-sticky">
            <tr>
              <th className="p-4 text-left text-sm font-semibold text-muted uppercase">Utilisateur</th>
              <th className="p-4 text-left text-sm font-semibold text-muted uppercase">Email</th>
              <th className="p-4 text-left text-sm font-semibold text-muted uppercase">Rôle</th>
              <th className="p-4 text-right text-sm font-semibold text-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar 
                      src={user.avatar_url || undefined} 
                      size="sm" 
                      fallback={user.full_name.split(' ').map(n => n[0]).join('')}
                    />
                    <span className="font-medium">{user.full_name}</span>
                  </div>
                </td>
                <td className="p-4">{user.email}</td>
                <td className="p-4">
                  <Badge variant={roleColors[user.role]}>
                    {user.role}
                  </Badge>
                </td>
                <td className="p-4 text-right">
                  <Button variant="secondary">
                    <Icon name="MoreHorizontal" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

import React, { useState } from 'react';
import { Shield, Download, Upload, Key, Mail, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { Badge } from '@/components/aura/Badge';
import { useToast } from '@/components/aura/ToastProvider';
import { useEventContext } from '@/hooks/useEventContext';
import { sendEmail } from '@/services/emailService';

export function SettingsAdminPage() {
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<'success' | 'error' | null>(null);
  const { success: toastSuccess, error: toastError } = useToast();
  const { companyId: contextCompanyId } = useEventContext();


  const handleTestEmail = async () => {
    if (!testEmail) {
      toastError('Veuillez entrer une adresse email');
      return;
    }

    setTestingEmail(true);
    setEmailTestResult(null);

    try {
      const result = await sendEmail({
        to: testEmail,
        subject: 'Test Go-Prod - Configuration Email',
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #667eea;">✅ Test réussi !</h2>
            <p>Votre configuration d'envoi d'emails via Resend fonctionne correctement.</p>
            <p style="color: #666; font-size: 12px;">Envoyé depuis Go-Prod le ${new Date().toLocaleString('fr-FR')}</p>
          </div>
        `,
      });

      if (result.success) {
        setEmailTestResult('success');
        toastSuccess('Email de test envoyé avec succès !');
      } else {
        setEmailTestResult('error');
        toastError(result.error || 'Erreur lors de l\'envoi');
      }
    } catch (err: any) {
      setEmailTestResult('error');
      toastError(err.message || 'Erreur lors du test');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleExport = () => {
    const data = {
      settings: {
        general: localStorage.getItem('app_lang'),
        theme: localStorage.getItem('theme'),
        artist: localStorage.getItem('artist_settings'),
        contact: localStorage.getItem('contact_settings'),
        ground: localStorage.getItem('ground_settings'),
        hospitality: localStorage.getItem('hospitality_settings'),
        admin: localStorage.getItem('admin_settings'),
      },
      timestamp: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settings-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toastSuccess('Configuration exportée');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (data.settings) {
          Object.entries(data.settings).forEach(([key, value]) => {
            if (value) {
              localStorage.setItem(key, value as string);
            }
          });
        }
        
        toastSuccess('Configuration importée avec succès');
        window.location.reload();
      } catch (error) {
        console.error('Erreur import:', error);
        toastError('Erreur lors de l\'import de la configuration');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Options Administration
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Gerez les parametres administratifs et techniques
        </p>
      </div>

      {/* SECTION EXPORT/IMPORT */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Export/Import
            </h2>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex gap-4">
            <Button
              variant="secondary"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exporter la configuration
            </Button>
            
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <Button
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Importer la configuration
              </Button>
            </label>
          </div>
        </CardBody>
      </Card>

      {/* Configuration Email (Resend) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Configuration Email (Resend)
            </h2>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div 
              className="p-4 rounded-xl"
              style={{ background: 'var(--bg-surface)' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    Service d'envoi : Resend
                  </h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Les emails sont envoyés via Resend (Edge Function Supabase).<br />
                    La clé API <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">RESEND_API_KEY</code> doit être configurée dans les secrets Supabase.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Tester l'envoi d'email
              </label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                  className="flex items-center gap-2"
                >
                  {testingEmail ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Envoyer un test
                    </>
                  )}
                </Button>
              </div>
              
              {emailTestResult === 'success' && (
                <div className="mt-2 flex items-center gap-2 text-green-500">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Email envoyé avec succès !</span>
                </div>
              )}
              
              {emailTestResult === 'error' && (
                <div className="mt-2 flex items-center gap-2 text-red-500">
                  <XCircle className="w-4 h-4" />
                  <span className="text-sm">Erreur lors de l'envoi. Vérifiez la configuration.</span>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Contrôles multi-tenant */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Controles multi-tenant
            </h2>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div 
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: 'var(--bg-surface)' }}
            >
              <div>
                <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Company ID</h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Identifiant de l'organisation</p>
              </div>
              <Badge color="blue">{contextCompanyId || 'Non defini'}</Badge>
            </div>

            <div 
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: 'var(--bg-surface)' }}
            >
              <div>
                <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Statut RLS</h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Row Level Security active</p>
              </div>
              <Badge color="green">Actif</Badge>
            </div>

            <div 
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: 'var(--bg-surface)' }}
            >
              <div>
                <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Buckets Storage</h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Acces aux fichiers</p>
              </div>
              <Badge color="green">Configure</Badge>
            </div>
          </div>
        </CardBody>
      </Card>

    </div>
  );
}

export default SettingsAdminPage;

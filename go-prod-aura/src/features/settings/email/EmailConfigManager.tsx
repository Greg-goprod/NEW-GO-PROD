/**
 * Composant de configuration email Brevo
 * Interface simple : clé API + adresse d'envoi
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Save, Send, CheckCircle, ExternalLink, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { Badge } from '@/components/aura/Badge';
import { Modal } from '@/components/aura/Modal';
import { useToast } from '@/components/aura/ToastProvider';
import {
  getEmailConfig,
  saveEmailConfig,
  testEmailConfig,
  deleteEmailConfig,
  type EmailConfig,
} from '@/api/emailConfigApi';

interface EmailConfigManagerProps {
  companyId: string;
}

export function EmailConfigManager({ companyId }: EmailConfigManagerProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  
  // États
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    brevoApiKey: '',
    fromEmail: '',
    fromName: '',
    replyTo: '',
  });

  // Charger la configuration
  const loadConfig = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const data = await getEmailConfig(companyId);
      setConfig(data);
      if (data) {
        setFormData({
          brevoApiKey: '', // Ne jamais pré-remplir la clé API
          fromEmail: data.from_email,
          fromName: data.from_name,
          replyTo: data.reply_to || '',
        });
      }
    } catch (err: any) {
      console.error('Erreur chargement config email:', err);
      // Pas d'erreur toast si pas de config (normal pour un nouvel utilisateur)
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Sauvegarder
  const handleSave = async () => {
    // Validation
    if (!formData.brevoApiKey.trim() && !config) {
      toastError('La clé API Brevo est requise');
      return;
    }
    if (!formData.fromEmail.trim()) {
      toastError('L\'adresse email d\'envoi est requise');
      return;
    }
    if (!formData.fromName.trim()) {
      toastError('Le nom d\'affichage est requis');
      return;
    }

    // Validation email simple
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.fromEmail)) {
      toastError('Adresse email invalide');
      return;
    }

    setSaving(true);
    try {
      const result = await saveEmailConfig({
        companyId,
        brevoApiKey: formData.brevoApiKey.trim() || (config ? 'KEEP_EXISTING' : ''),
        fromEmail: formData.fromEmail.trim(),
        fromName: formData.fromName.trim(),
        replyTo: formData.replyTo.trim() || undefined,
      });
      
      toastSuccess(result.message);
      setConfig(result.config);
      setFormData(prev => ({ ...prev, brevoApiKey: '' })); // Clear API key field
    } catch (err: any) {
      console.error('Erreur sauvegarde config:', err);
      toastError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Ouvrir le modal de test
  const handleOpenTestModal = () => {
    setTestEmail('');
    setShowTestModal(true);
  };

  // Tester
  const handleTest = async () => {
    if (!testEmail.trim()) {
      toastError('Veuillez entrer une adresse email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      toastError('Adresse email invalide');
      return;
    }

    setTesting(true);
    try {
      const message = await testEmailConfig({
        companyId,
        testEmail: testEmail.trim(),
      });
      toastSuccess(message);
      setShowTestModal(false);
      loadConfig(); // Recharger pour mettre à jour last_tested_at
    } catch (err: any) {
      toastError(err.message || 'Erreur lors du test');
    } finally {
      setTesting(false);
    }
  };

  // Supprimer
  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer la configuration email ?')) {
      return;
    }

    try {
      await deleteEmailConfig(companyId);
      toastSuccess('Configuration supprimée');
      setConfig(null);
      setFormData({
        brevoApiKey: '',
        fromEmail: '',
        fromName: '',
        replyTo: '',
      });
    } catch (err: any) {
      toastError(err.message || 'Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardBody>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Configuration Email
            </h2>
            {config?.last_tested_at && (
              <Badge color="green" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Configuré
              </Badge>
            )}
          </div>
          {config && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleOpenTestModal}
                title="Envoyer un email de test"
              >
                <Send className="w-4 h-4 mr-2" />
                Tester
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDelete}
                title="Supprimer la configuration"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          {/* Info Brevo */}
          <div 
            className="p-4 rounded-lg"
            style={{ 
              background: 'rgba(102, 126, 234, 0.1)',
              border: '1px solid rgba(102, 126, 234, 0.2)'
            }}
          >
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              <strong>Brevo</strong> (ex-Sendinblue) permet d'envoyer jusqu'à <strong>300 emails/jour gratuitement</strong>.
            </p>
            <a 
              href="https://app.brevo.com/settings/keys/api" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-sm font-medium"
              style={{ color: 'var(--primary)' }}
            >
              Obtenir une clé API Brevo
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Clé API */}
          <div className="relative">
            <Input
              label={config ? "Clé API Brevo (laisser vide pour conserver l'actuelle)" : "Clé API Brevo *"}
              type={showApiKey ? "text" : "password"}
              value={formData.brevoApiKey}
              onChange={(e) => setFormData(prev => ({ ...prev, brevoApiKey: e.target.value }))}
              placeholder={config ? "••••••••••••••••" : "xkeysib-xxxxxxxx..."}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-8 p-1"
              style={{ color: 'var(--text-muted)' }}
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <hr style={{ borderColor: 'var(--color-border)' }} />

          {/* Expéditeur */}
          <Input
            label="Adresse email d'envoi *"
            type="email"
            value={formData.fromEmail}
            onChange={(e) => setFormData(prev => ({ ...prev, fromEmail: e.target.value }))}
            placeholder="Ex: booking@monfestival.ch"
          />
          
          <Input
            label="Nom d'affichage *"
            value={formData.fromName}
            onChange={(e) => setFormData(prev => ({ ...prev, fromName: e.target.value }))}
            placeholder="Ex: Mon Festival Booking"
          />
          
          <Input
            label="Adresse de réponse (optionnel)"
            type="email"
            value={formData.replyTo}
            onChange={(e) => setFormData(prev => ({ ...prev, replyTo: e.target.value }))}
            placeholder="Ex: contact@monfestival.ch"
          />

          {/* Bouton Sauvegarder */}
          <div className="flex justify-end pt-4">
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? (
                'Enregistrement...'
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {config ? 'Mettre à jour' : 'Enregistrer'}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardBody>

      {/* Modal de test */}
      <Modal
        open={showTestModal}
        onClose={() => setShowTestModal(false)}
        title="Tester l'envoi d'email"
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Un email de test sera envoyé depuis <strong>{config?.from_name}</strong> ({config?.from_email}).
          </p>
          
          <Input
            label="Adresse email de destination *"
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Ex: votre-email@exemple.com"
            autoFocus
          />
          
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowTestModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleTest} disabled={testing}>
              {testing ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer le test
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

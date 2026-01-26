/**
 * Composant de configuration SMTP
 * Interface simple : serveur SMTP + identifiants + expéditeur
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Save, Send, CheckCircle, Eye, EyeOff, Trash2, Server, Plus, Edit2, Star } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { Badge } from '@/components/aura/Badge';
import { Modal } from '@/components/aura/Modal';
import { useToast } from '@/components/aura/ToastProvider';
import {
  fetchSmtpConfigs,
  createSmtpConfig,
  updateSmtpConfig,
  deleteSmtpConfig,
  testSmtpConfig,
  setDefaultSmtpConfig,
  SMTP_PRESETS,
  type SmtpConfig,
} from '@/api/smtpConfigApi';

interface SmtpConfigManagerProps {
  companyId: string;
}

// Presets SMTP courants
const PROVIDER_PRESETS = [
  { name: 'Infomaniak', host: 'mail.infomaniak.com', port: 587 },
  { name: 'OVH', host: 'ssl0.ovh.net', port: 587 },
  { name: 'Gmail', host: 'smtp.gmail.com', port: 587 },
  { name: 'Outlook/Office 365', host: 'smtp.office365.com', port: 587 },
  { name: 'Brevo (Sendinblue)', host: 'smtp-relay.brevo.com', port: 587 },
  { name: 'Autre', host: '', port: 587 },
];

export function SmtpConfigManager({ companyId }: SmtpConfigManagerProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  
  // États
  const [configs, setConfigs] = useState<SmtpConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SmtpConfig | null>(null);
  const [testingConfig, setTestingConfig] = useState<SmtpConfig | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: 'Configuration principale',
    host: '',
    port: 587,
    username: '',
    password: '',
    fromEmail: '',
    fromName: '',
    replyTo: '',
  });

  // Charger les configurations
  const loadConfigs = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const data = await fetchSmtpConfigs(companyId);
      setConfigs(data);
    } catch (err: any) {
      console.error('Erreur chargement configs SMTP:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // Ouvrir le modal d'ajout/édition
  const handleOpenModal = (config?: SmtpConfig) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        name: config.name,
        host: config.host,
        port: config.port,
        username: config.username,
        password: '', // Ne pas pré-remplir le mot de passe
        fromEmail: config.from_email,
        fromName: config.from_name,
        replyTo: config.reply_to || '',
      });
    } else {
      setEditingConfig(null);
      setFormData({
        name: 'Configuration principale',
        host: '',
        port: 587,
        username: '',
        password: '',
        fromEmail: '',
        fromName: '',
        replyTo: '',
      });
    }
    setShowPassword(false);
    setShowModal(true);
  };

  // Appliquer un preset
  const handlePresetSelect = (preset: typeof PROVIDER_PRESETS[0]) => {
    setFormData(prev => ({
      ...prev,
      host: preset.host,
      port: preset.port,
    }));
  };

  // Sauvegarder
  const handleSave = async () => {
    // Validation
    if (!formData.host.trim()) {
      toastError('Le serveur SMTP est requis');
      return;
    }
    if (!formData.username.trim()) {
      toastError('L\'identifiant est requis');
      return;
    }
    if (!formData.password.trim() && !editingConfig) {
      toastError('Le mot de passe est requis');
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

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.fromEmail)) {
      toastError('Adresse email invalide');
      return;
    }

    setSaving(true);
    try {
      if (editingConfig) {
        await updateSmtpConfig(editingConfig.id, {
          name: formData.name.trim(),
          host: formData.host.trim(),
          port: formData.port,
          username: formData.username.trim(),
          password: formData.password.trim() || undefined,
          fromEmail: formData.fromEmail.trim(),
          fromName: formData.fromName.trim(),
          replyTo: formData.replyTo.trim() || undefined,
        });
        toastSuccess('Configuration mise à jour');
      } else {
        await createSmtpConfig({
          companyId,
          name: formData.name.trim(),
          host: formData.host.trim(),
          port: formData.port,
          secure: formData.port === 465,
          username: formData.username.trim(),
          password: formData.password.trim(),
          fromEmail: formData.fromEmail.trim(),
          fromName: formData.fromName.trim(),
          replyTo: formData.replyTo.trim() || undefined,
          isDefault: configs.length === 0, // Premier = défaut
        });
        toastSuccess('Configuration créée');
      }
      
      setShowModal(false);
      loadConfigs();
    } catch (err: any) {
      console.error('Erreur sauvegarde config:', err);
      toastError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Supprimer
  const handleDelete = async (config: SmtpConfig) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${config.name}" ?`)) {
      return;
    }

    try {
      await deleteSmtpConfig(config.id);
      toastSuccess('Configuration supprimée');
      loadConfigs();
    } catch (err: any) {
      toastError(err.message || 'Erreur lors de la suppression');
    }
  };

  // Définir par défaut
  const handleSetDefault = async (config: SmtpConfig) => {
    try {
      await setDefaultSmtpConfig(config.id);
      toastSuccess('Configuration définie par défaut');
      loadConfigs();
    } catch (err: any) {
      toastError(err.message || 'Erreur');
    }
  };

  // Ouvrir le modal de test
  const handleOpenTestModal = (config: SmtpConfig) => {
    setTestingConfig(config);
    setTestEmail('');
    setShowTestModal(true);
  };

  // Tester
  const handleTest = async () => {
    if (!testingConfig) return;
    
    if (!testEmail.trim()) {
      toastError('Veuillez entrer une adresse email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      toastError('Adresse email invalide');
      return;
    }

    setTesting(testingConfig.id);
    try {
      const message = await testSmtpConfig(testingConfig.id, testEmail.trim());
      toastSuccess(message);
      setShowTestModal(false);
      loadConfigs();
    } catch (err: any) {
      toastError(err.message || 'Erreur lors du test');
    } finally {
      setTesting(null);
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
              Configuration Email (SMTP)
            </h2>
          </div>
          <Button variant="primary" size="sm" onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        {configs.length === 0 ? (
          <div className="text-center py-8">
            <Server className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>
              Aucune configuration email.<br />
              Ajoutez votre serveur SMTP pour envoyer des emails.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map((config) => (
              <div 
                key={config.id}
                className="p-4 rounded-lg border flex items-center justify-between"
                style={{ 
                  background: 'var(--bg-secondary)',
                  borderColor: config.is_default ? 'var(--primary)' : 'var(--color-border)'
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {config.name}
                    </span>
                    {config.is_default && (
                      <Badge color="violet" className="text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        Par défaut
                      </Badge>
                    )}
                    {config.last_tested_at && (
                      <Badge color="green" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Testé
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {config.host}:{config.port} • {config.from_name} &lt;{config.from_email}&gt;
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!config.is_default && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSetDefault(config)}
                      title="Définir par défaut"
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenTestModal(config)}
                    disabled={testing === config.id}
                    title="Tester l'envoi"
                  >
                    {testing === config.id ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenModal(config)}
                    title="Modifier"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDelete(config)}
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>

      {/* Modal Ajout/Édition */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingConfig ? 'Modifier la configuration' : 'Nouvelle configuration SMTP'}
      >
        <div className="space-y-4">
          {/* Presets */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Fournisseur (raccourcis)
            </label>
            <div className="flex flex-wrap gap-2">
              {PROVIDER_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className="px-3 py-1 text-xs rounded-full border transition-colors"
                  style={{ 
                    borderColor: formData.host === preset.host ? 'var(--primary)' : 'var(--color-border)',
                    background: formData.host === preset.host ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                    color: 'var(--text-primary)'
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <hr style={{ borderColor: 'var(--color-border)' }} />

          {/* Serveur SMTP */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input
                label="Serveur SMTP *"
                value={formData.host}
                onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                placeholder="Ex: mail.infomaniak.com"
              />
            </div>
            <Input
              label="Port *"
              type="number"
              value={formData.port}
              onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 587 }))}
              placeholder="587"
            />
          </div>

          {/* Identifiants */}
          <Input
            label="Identifiant (email) *"
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            placeholder="Ex: noreply@monfestival.ch"
          />
          
          <div className="relative">
            <Input
              label={editingConfig ? "Mot de passe (laisser vide pour conserver)" : "Mot de passe *"}
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder={editingConfig ? "••••••••" : "Mot de passe SMTP"}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 p-1"
              style={{ color: 'var(--text-muted)' }}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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

          {/* Boutons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement...' : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingConfig ? 'Mettre à jour' : 'Enregistrer'}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de test */}
      <Modal
        open={showTestModal}
        onClose={() => setShowTestModal(false)}
        title="Tester l'envoi d'email"
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Un email de test sera envoyé depuis <strong>{testingConfig?.from_name}</strong> ({testingConfig?.from_email}) 
            via <strong>{testingConfig?.host}</strong>.
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
            <Button variant="primary" onClick={handleTest} disabled={testing !== null}>
              {testing !== null ? (
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

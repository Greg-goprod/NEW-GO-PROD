import React, { useState, useEffect } from 'react';
import { FileText, X } from 'lucide-react';
import { Modal } from '../aura/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Combobox } from '../ui/Combobox';
import type { ComboboxOption } from '../ui/Combobox';
import { supabase } from '../../lib/supabaseClient';
import type { Artist, Event } from '@/types';

export interface ContractFormData {
  artist_id: string;
  event_id?: string;
  contract_title: string;
  management_email?: string;
  external_email?: string;
  file?: File;
}

interface ContractFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContractFormData) => Promise<void>;
}

export const ContractForm: React.FC<ContractFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<ContractFormData>({
    artist_id: '',
    event_id: '',
    contract_title: '',
    management_email: '',
    external_email: '',
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Charger les artistes
      const { data: artistsData } = await supabase
        .from('artists')
        .select('id, name')
        .order('name');

      // Charger les événements
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, name')
        .order('start_date', { ascending: false });

      setArtists(artistsData || []);
      setEvents(eventsData || []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const artistOptions: ComboboxOption[] = artists.map(artist => ({
    label: artist.name,
    value: artist.id,
  }));

  const eventOptions: ComboboxOption[] = events.map(event => ({
    label: event.name,
    value: event.id,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.artist_id || !formData.contract_title) {
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        ...formData,
        file: file || undefined,
      });
      
      // Reset form
      setFormData({
        artist_id: '',
        event_id: '',
        contract_title: '',
        management_email: '',
        external_email: '',
      });
      setFile(null);
    } catch (error) {
      console.error('Erreur création contrat:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Nouveau contrat"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Artiste */}
        <Combobox
          label="Artiste"
          options={artistOptions}
          value={formData.artist_id}
          onChange={(value) => setFormData({ ...formData, artist_id: value })}
          placeholder="Sélectionner un artiste"
          searchPlaceholder="Rechercher un artiste..."
          required
        />

        {/* Événement (optionnel) */}
        <Combobox
          label="Événement (optionnel)"
          options={eventOptions}
          value={formData.event_id}
          onChange={(value) => setFormData({ ...formData, event_id: value })}
          placeholder="Sélectionner un événement"
          searchPlaceholder="Rechercher un événement..."
        />

        {/* Titre du contrat */}
        <Input
          label="Titre du contrat"
          type="text"
          value={formData.contract_title}
          onChange={(e) => setFormData({ ...formData, contract_title: e.target.value })}
          placeholder="ex: Contrat Festival XYZ 2024"
          required
        />

        {/* Email management */}
        <Input
          label="Email management (optionnel)"
          type="email"
          value={formData.management_email}
          onChange={(e) => setFormData({ ...formData, management_email: e.target.value })}
          placeholder="management@example.com"
          helperText="Pour l'envoi de la signature interne"
        />

        {/* Email externe */}
        <Input
          label="Email externe (optionnel)"
          type="email"
          value={formData.external_email}
          onChange={(e) => setFormData({ ...formData, external_email: e.target.value })}
          placeholder="artiste@example.com"
          helperText="Pour l'envoi de la signature à l'artiste"
        />

        {/* Upload PDF */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            PDF du contrat (optionnel)
          </label>
          
          {file ? (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <FileText className="w-4 h-4 text-violet-500" />
                <span className="truncate max-w-[200px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
                id="contract-file-upload"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => document.getElementById('contract-file-upload')?.click()}
              >
                {file ? 'Changer le fichier' : 'Choisir un fichier'}
              </Button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!formData.artist_id || !formData.contract_title || submitting || loading}
          >
            {submitting ? 'Création...' : 'Créer le contrat'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

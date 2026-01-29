import { useState, useEffect } from "react";
import { Modal } from "@/components/aura/Modal";
import { Button } from "@/components/aura/Button";
import { Input } from "@/components/aura/Input";
import type { ExclusivityPreset } from "@/features/booking/advancedBookingApi";

interface ExclusivityPresetFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  editingPreset: ExclusivityPreset | null;
}

export function ExclusivityPresetFormModal({ open, onClose, onSave, editingPreset }: ExclusivityPresetFormModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    region: "",
    perimeter_km: "",
    days_before: "",
    days_after: "",
    penalty_note: "",
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingPreset) {
      setFormData({
        name: editingPreset.name,
        region: editingPreset.region || "",
        perimeter_km: editingPreset.perimeter_km?.toString() || "",
        days_before: editingPreset.days_before?.toString() || "",
        days_after: editingPreset.days_after?.toString() || "",
        penalty_note: editingPreset.penalty_note || "",
      });
    } else {
      setFormData({
        name: "",
        region: "",
        perimeter_km: "",
        days_before: "",
        days_after: "",
        penalty_note: "",
      });
    }
  }, [editingPreset, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        region: formData.region || null,
        perimeter_km: formData.perimeter_km ? parseInt(formData.perimeter_km) : null,
        days_before: formData.days_before ? parseInt(formData.days_before) : null,
        days_after: formData.days_after ? parseInt(formData.days_after) : null,
        penalty_note: formData.penalty_note || null,
      };
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingPreset ? "Modifier le preset d'exclusivité" : "Ajouter un preset d'exclusivité"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            Nom du preset <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Exclusivité Standard (50km - 1 mois)"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            Région (optionnel)
          </label>
          <Input
            type="text"
            value={formData.region}
            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
            placeholder="Ex: Rayon géographique, Même ville..."
          />
          <p className="text-xs text-gray-500 mt-1">Description de la zone géographique concernée</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Périmètre (km)
            </label>
            <Input
              type="number"
              min="0"
              value={formData.perimeter_km}
              onChange={(e) => setFormData({ ...formData, perimeter_km: e.target.value })}
              placeholder="50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Jours avant
            </label>
            <Input
              type="number"
              min="0"
              value={formData.days_before}
              onChange={(e) => setFormData({ ...formData, days_before: e.target.value })}
              placeholder="30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Jours après
            </label>
            <Input
              type="number"
              min="0"
              value={formData.days_after}
              onChange={(e) => setFormData({ ...formData, days_after: e.target.value })}
              placeholder="30"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            Note de pénalité
          </label>
          <textarea
            value={formData.penalty_note}
            onChange={(e) => setFormData({ ...formData, penalty_note: e.target.value })}
            placeholder="Ex: Pénalité de 50% du montant de l'offre en cas de non-respect"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>💡 Conseil :</strong> Ce preset pourra être appliqué rapidement lors de la création d'une offre pour définir une exclusivité standard.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Enregistrement..." : editingPreset ? "Mettre à jour" : "Créer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}



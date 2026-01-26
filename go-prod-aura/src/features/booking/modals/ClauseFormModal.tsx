import { useState, useEffect } from "react";
import { Modal } from "@/components/aura/Modal";
import { Button } from "@/components/aura/Button";
import { Input } from "@/components/aura/Input";
import type { OfferClause } from "@/features/booking/advancedBookingApi";

interface ClauseFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  editingClause: OfferClause | null;
}

export function ClauseFormModal({ open, onClose, onSave, editingClause }: ClauseFormModalProps) {
  const [formData, setFormData] = useState({
    key: "",
    title: "",
    body: "",
    locale: "fr",
    category: "",
    default_enabled: false,
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingClause) {
      setFormData({
        key: editingClause.key || "",
        title: editingClause.title,
        body: editingClause.body,
        locale: editingClause.locale,
        category: editingClause.category || "",
        default_enabled: editingClause.default_enabled,
      });
    } else {
      setFormData({
        key: "",
        title: "",
        body: "",
        locale: "fr",
        category: "",
        default_enabled: false,
      });
    }
  }, [editingClause, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    { value: "payment", label: "Paiement" },
    { value: "cancellation", label: "Annulation" },
    { value: "technical", label: "Technique" },
    { value: "logistics", label: "Logistique" },
    { value: "promotion", label: "Promotion" },
    { value: "rights", label: "Droits" },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingClause ? "Modifier la clause" : "Ajouter une clause"}
      widthClass="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Titre <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Acompte à la signature"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Clé (optionnel)
            </label>
            <Input
              type="text"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              placeholder="Ex: payment_advance"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Catégorie
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Aucune catégorie</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Langue
            </label>
            <select
              value={formData.locale}
              onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
              <option value="de">Allemand</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            Contenu de la clause <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            placeholder="Saisissez le texte complet de la clause..."
            rows={6}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.default_enabled}
              onChange={(e) => setFormData({ ...formData, default_enabled: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-sm text-gray-900 dark:text-gray-100">
              Activer par défaut dans les nouvelles offres
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Enregistrement..." : editingClause ? "Mettre à jour" : "Créer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}



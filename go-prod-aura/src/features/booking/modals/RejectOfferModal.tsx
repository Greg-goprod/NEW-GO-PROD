import React, { useState } from "react";
import { Modal } from "../../../components/aura/Modal";
import { Button } from "../../../components/aura/Button";
import { Input } from "../../../components/aura/Input";
import { useToast } from "../../../components/aura/ToastProvider";

export interface RejectOfferModalProps {
  open: boolean;
  onClose: () => void;
  onReject: (reason: string) => void;
}

export function RejectOfferModal({ open, onClose, onReject }: RejectOfferModalProps) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  const handleReject = async () => {
    if (!reason.trim()) {
      toastError("Veuillez indiquer un motif de rejet");
      return;
    }

    setSaving(true);
    try {
      await onReject(reason.trim());
      setReason("");
      onClose();
    } catch (error: any) {
      console.error("Erreur rejet:", error);
      toastError(error?.message || "Erreur de rejet");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Rejeter l'offre" size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Motif du rejet <span className="text-red-500">*</span>
          </label>
          <textarea
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Expliquez pourquoi cette offre est rejetée..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button variant="danger" onClick={handleReject} disabled={saving}>
            {saving ? "Rejet..." : "Rejeter"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
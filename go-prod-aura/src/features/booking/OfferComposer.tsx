import React, { useState, useEffect } from "react";
import { Modal } from "@/components/aura/Modal";
import { Button } from "@/components/aura/Button";

export function OfferComposer({
  isOpen,
  onClose,
  prefilledData,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  prefilledData?: any;
  onSave: (payload:any)=>Promise<void>;
}) {
  const [form, setForm] = useState<any>({});
  useEffect(()=>{ setForm(prefilledData || {}); }, [prefilledData, isOpen]);

  return (
    <Modal open={isOpen} onClose={onClose} title="Composer une offre">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className="px-3 py-2 rounded border dark:bg-gray-900 dark:border-gray-800 dark:text-gray-100" placeholder="Artiste" value={form.artist_name||""} onChange={e=>setForm((f:any)=>({...f,artist_name:e.target.value}))}/>
        <input className="px-3 py-2 rounded border dark:bg-gray-900 dark:border-gray-800 dark:text-gray-100" placeholder="Scène" value={form.stage_name||""} onChange={e=>setForm((f:any)=>({...f,stage_name:e.target.value}))}/>
        <input className="px-3 py-2 rounded border dark:bg-gray-900 dark:border-gray-800 dark:text-gray-100" placeholder="Montant" value={form.amount_display||""} onChange={e=>setForm((f:any)=>({...f,amount_display:e.target.value}))}/>
        <input className="px-3 py-2 rounded border dark:bg-gray-900 dark:border-gray-800 dark:text-gray-100" placeholder="Devise" value={form.currency||""} onChange={e=>setForm((f:any)=>({...f,currency:e.target.value}))}/>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button variant="primary" onClick={()=>onSave(form)}>Enregistrer</Button>
      </div>
    </Modal>
  );
}

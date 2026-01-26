import React, { useState, useEffect } from "react";
import { Modal } from "../../../components/aura/Modal";
import { Button } from "../../../components/aura/Button";
import { Input } from "../../../components/aura/Input";
import { TimePickerPopup } from "../../../components/ui/pickers/TimePickerPopup";
import type { Performance } from "../timelineApi";
import { hhmmToMin, minToHHMM, snapTo5 } from "../timelineApi";

interface CustomTimePickerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { performance_time: string; duration: number }) => void;
  performance: Performance | null;
}

export function CustomTimePicker({ open, onClose, onConfirm, performance }: CustomTimePickerProps) {
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    if (performance) {
      setTime(performance.performance_time);
      setDuration(performance.duration);
    }
  }, [performance, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Snapping à 5 minutes
    const minutes = hhmmToMin(time);
    const snappedMinutes = snapTo5(minutes);
    const snappedTime = minToHHMM(snappedMinutes);
    
    onConfirm({
      performance_time: snappedTime,
      duration: duration,
    });
    onClose();
  };

  const handleDurationChange = (value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 480) { // Max 8h
      setDuration(numValue);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Modifier l'horaire" widthClass="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Artiste */}
        {performance && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-gray-100">{performance.artist_name}</span>
          </div>
        )}

        {/* Heure de début */}
        <div>
          <TimePickerPopup
            value={time}
            onChange={(value) => value && setTime(value)}
            label="Heure de début *"
            placeholder="Sélectionner l'heure"
            size="sm"
          />
        </div>

        {/* Durée */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Durée (min) <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2 mb-2">
            {[60, 75, 90].map(d => (
              <Button
                key={d}
                type="button"
                variant={duration === d ? "primary" : "secondary"}
                size="sm"
                onClick={() => setDuration(d)}
              >
                {d}
              </Button>
            ))}
          </div>
          <Input
            type="number"
            value={duration}
            onChange={(e) => handleDurationChange(e.target.value)}
            min="5"
            max="480"
            step="5"
            placeholder="Personnalisée"
          />
        </div>

        {/* Aperçu */}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Fin prévue: {minToHHMM(hhmmToMin(time) + duration)}
        </div>

        {/* Boutons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variant="primary">
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  );
}

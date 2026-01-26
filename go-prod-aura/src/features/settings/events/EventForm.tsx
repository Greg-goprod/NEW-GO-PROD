import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Save, Plus, Trash2, MapPin, Info } from 'lucide-react';
import Modal, { ModalFooter, ModalButton } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { DateRangePickerPopup } from '@/components/ui/pickers/DateRangePickerPopup';
import { TimePickerPopup } from '@/components/ui/pickers/TimePickerPopup';
import { useToast } from '@/components/aura/ToastProvider';
import { useEventStore } from '@/store/useEventStore';
import {
  createEvent,
  updateEvent,
  loadFullEvent,
  replaceEventDays,
  replaceEventStages,
  generateSlugServerSide,
  type EventDayInput,
  type EventStageInput,
} from '@/api/eventsApi';
import {
  fetchStageTypes,
  fetchStageSpecificities,
  type StageType,
  type StageSpecificity,
} from '@/api/stageEnumsApi';
import { 
  parseDateLocal, 
  formatDateLocal, 
  formatDateFr 
} from '@/config/timezone';

interface EventFormProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  editingEventId?: string | null;
}

interface FormData {
  name: string;
  color_hex: string;
  start_date: string;
  end_date: string;
  notes: string;
  days: EventDayInput[];
  stages: EventStageInput[];
}

export function EventForm({ open, onClose, companyId, editingEventId }: EventFormProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const setCurrentEvent = useEventStore((state) => state.setCurrentEvent);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'info' | 'days' | 'stages'>('info');
  const [stageTypes, setStageTypes] = useState<StageType[]>([]);
  const [stageSpecificities, setStageSpecificities] = useState<StageSpecificity[]>([]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      color_hex: '#3b82f6',
      start_date: '',
      end_date: '',
      notes: '',
      days: [
        {
          date: '',
          open_time: '11:00',
          close_time: '02:00',
          is_closing_day: false,
          notes: '',
        },
      ],
      stages: [
        {
          name: 'Main',
          type: null,
          specificity: null,
          capacity: null,
        },
      ],
    },
  });

  const {
    fields: daysFields,
  } = useFieldArray({
    control,
    name: 'days',
  });

  const {
    fields: stagesFields,
    append: appendStage,
    remove: removeStage,
  } = useFieldArray({
    control,
    name: 'stages',
  });

  // Charger les enums de scènes au montage du composant
  useEffect(() => {
    if (open && companyId) {
      Promise.all([
        fetchStageTypes(companyId),
        fetchStageSpecificities(companyId),
      ])
        .then(([types, specs]) => {
          setStageTypes(types);
          setStageSpecificities(specs);
        })
        .catch((err) => {
          console.error('Erreur lors du chargement des enums de scènes:', err);
          toastError('Impossible de charger les types de scènes');
        });
    }
  }, [open, companyId, toastError]);

  // Surveiller les changements de dates pour générer automatiquement les jours
  const watchedStartDate = watch('start_date');
  const watchedEndDate = watch('end_date');

  useEffect(() => {
    // Seulement en mode création (pas en édition)
    if (!editingEventId && watchedStartDate && watchedEndDate) {
      // Parser les dates en local avec helper timezone
      const start = parseDateLocal(watchedStartDate);
      const end = parseDateLocal(watchedEndDate);
      
      // Vérifier que end >= start
      if (end >= start) {
        const days: EventDayInput[] = [];
        let currentDate = new Date(start);
        
        while (currentDate <= end) {
          // Formater la date avec helper timezone
          const dateStr = formatDateLocal(currentDate);
          
          days.push({
            date: dateStr,
            open_time: '17:00', // Ouverture par défaut 17h
            close_time: '03:00', // Fermeture par défaut 03h (le lendemain)
            is_closing_day: currentDate.getTime() === end.getTime(),
            notes: '',
          });
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Remplacer les jours dans le formulaire
        setValue('days', days);
      }
    }
  }, [watchedStartDate, watchedEndDate, editingEventId, setValue]);

  // Charger l'évènement en mode édition
  useEffect(() => {
    if (open && editingEventId) {
      setLoading(true);
      loadFullEvent(editingEventId)
        .then((full) => {
          reset({
            name: full.event.name,
            color_hex: full.event.color_hex || '#3b82f6',
            start_date: full.event.start_date || '',
            end_date: full.event.end_date || '',
            notes: full.event.notes || '',
            days: full.days.length > 0
              ? full.days.map((d) => ({
                  date: d.date || '',
                  open_time: d.open_time || '',
                  close_time: d.close_time || '',
                  is_closing_day: d.is_closing_day || false,
                  notes: d.notes || '',
                }))
              : [
                  {
                    date: '',
                    open_time: '11:00',
                    close_time: '02:00',
                    is_closing_day: false,
                    notes: '',
                  },
                ],
            stages: full.stages.length > 0
              ? full.stages.map((s) => ({
                  name: s.name,
                  type: s.type,
                  specificity: s.specificity,
                  capacity: s.capacity,
                }))
              : [
                  {
                    name: 'Main',
                    type: null,
                    specificity: null,
                    capacity: null,
                  },
                ],
          });
        })
        .catch((err) => {
          console.error('Erreur chargement évènement:', err);
          toastError('Erreur lors du chargement de l\'évènement');
        })
        .finally(() => setLoading(false));
    } else if (open && !editingEventId) {
      // Mode création : réinitialiser
      reset({
        name: '',
        color_hex: '#3b82f6',
        start_date: '',
        end_date: '',
        notes: '',
        days: [
          {
            date: '',
            open_time: '11:00',
            close_time: '02:00',
            is_closing_day: false,
            notes: '',
          },
        ],
        stages: [
          {
            name: 'Main',
            type: null,
            specificity: null,
            capacity: null,
          },
        ],
      });
    }
  }, [open, editingEventId, reset, toastError]);

  const onSubmit = async (data: FormData) => {
    if (!companyId) {
      toastError('Sélectionnez/chargez d\'abord une entreprise');
      return;
    }

    setSaving(true);
    try {
      let eventId = editingEventId;

      if (editingEventId) {
        // Mode édition : mettre à jour l'évènement
        await updateEvent(editingEventId, {
          name: data.name,
          color_hex: data.color_hex || '#3b82f6',
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          notes: data.notes || null,
        });
      } else {
        // Mode création : créer l'évènement
        const slug = await generateSlugServerSide(data.name);
        eventId = await createEvent({
          company_id: companyId,
          name: data.name,
          slug,
          color_hex: data.color_hex || '#3b82f6',
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          notes: data.notes || null,
          status: 'planned',
        });
      }

      // Remplacer les jours
      await replaceEventDays(eventId!, data.days);

      // Remplacer les scènes
      await replaceEventStages(eventId!, data.stages);

      // Sauvegarder dans localStorage
      localStorage.setItem('selected_event_id', eventId!);

      // Charger l'évènement complet
      const fullEvent = await loadFullEvent(eventId!);

      // Mettre à jour le store
      setCurrentEvent(fullEvent.event);

      toastSuccess(
        editingEventId
          ? `Évènement "${data.name}" mis à jour avec succès`
          : `Évènement "${data.name}" créé avec succès`
      );

      onClose();
    } catch (err: any) {
      console.error('❌ Erreur sauvegarde évènement:', err);
      console.error('📝 Données du formulaire:', data);
      const errorMessage = err?.message || err?.error_description || err?.hint || 'Erreur lors de la sauvegarde de l\'évènement';
      toastError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={editingEventId ? 'Éditer l\'évènement' : 'Créer un évènement'}
      size="lg"
      draggable={true}
      footer={
        <ModalFooter>
          <ModalButton variant="secondary" onClick={handleClose} disabled={saving}>
            Annuler
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={handleSubmit(onSubmit)}
            disabled={saving || loading}
            loading={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </ModalButton>
        </ModalFooter>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Onglets de section */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setActiveSection('info')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeSection === 'info'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Info className="w-4 h-4 inline-block mr-2" />
              Informations générales
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('stages')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeSection === 'stages'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <MapPin className="w-4 h-4 inline-block mr-2" />
              Scènes ({stagesFields.length})
            </button>
          </div>

          {/* Section Informations générales */}
          {activeSection === 'info' && (
            <div className="space-y-3">
              {/* Layout en 2 colonnes */}
              <div className="grid grid-cols-1 gap-3">
                {/* Nom sur toute la largeur */}
                <Input
                  label="Nom de l'évènement"
                  {...register('name', { required: 'Le nom est obligatoire' })}
                  error={errors.name?.message}
                  placeholder="Festival 2026"
                  required
                  disabled={saving}
                />

                {/* Date Range Picker + Badge jours */}
                <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                  <div>
                    <DateRangePickerPopup
                      label="Dates de l'évènement"
                      startDate={watchedStartDate || null}
                      endDate={watchedEndDate || null}
                      onChange={(start, end) => {
                        setValue('start_date', start || '');
                        setValue('end_date', end || '');
                      }}
                      disabled={saving}
                      placeholder="Cliquez pour sélectionner les dates"
                    />
                  </div>

                  {/* Badge nombre de jours */}
                  {daysFields.length > 0 && (
                    <div className="h-[36px] px-3 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center whitespace-nowrap">
                      <span className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
                        📅 {daysFields.length} jour{daysFields.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Message info */}
              {daysFields.length > 0 && (
                <div className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    💡 {editingEventId 
                      ? `Modifiez les horaires d'ouverture/fermeture de chaque jour ci-dessous.`
                      : `${daysFields.length} jour${daysFields.length > 1 ? 's' : ''} créé${daysFields.length > 1 ? 's' : ''} automatiquement (17:00-03:00). Chaque jour commence à sa date et peut se terminer le lendemain.`
                    }
                  </p>
                </div>
              )}

              {/* Liste des jours - modifiable en création ET en édition */}
              {daysFields.length > 0 && (
                <div className="space-y-2">
                  {daysFields.map((field, index) => {
                    // Formatter la date en "VENDREDI 31 OCTOBRE 2025" avec helper timezone
                    const formattedDate = field.date 
                      ? formatDateFr(field.date, { uppercase: true })
                      : '';
                    
                    return (
                      <div key={field.id} className="grid grid-cols-3 gap-3">
                        {/* Colonne 1 : Badge jour + date */}
                        <div className="flex items-center">
                          <div className="w-full h-[36px] px-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {formattedDate}
                            </span>
                          </div>
                        </div>

                        {/* Colonne 2 : Heure de début */}
                        <Controller
                          name={`days.${index}.open_time`}
                          control={control}
                          render={({ field: timeField }) => (
                            <TimePickerPopup
                              value={timeField.value}
                              onChange={(time) => timeField.onChange(time)}
                              disabled={saving}
                              placeholder="Début"
                            />
                          )}
                        />

                        {/* Colonne 3 : Heure de fin */}
                        <Controller
                          name={`days.${index}.close_time`}
                          control={control}
                          render={({ field: timeField }) => (
                            <TimePickerPopup
                              value={timeField.value}
                              onChange={(time) => timeField.onChange(time)}
                              disabled={saving}
                              placeholder="Fin"
                            />
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <Textarea
                label="Notes"
                {...register('notes')}
                rows={3}
                disabled={saving}
                placeholder="Notes internes..."
              />
            </div>
          )}

          {/* Section Scènes */}
          {activeSection === 'stages' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Gérez les scènes de votre évènement
                </p>
                <Button
                  type="button"
                  leftIcon={<Plus size={16} />}
                  onClick={() =>
                    appendStage({
                      name: '',
                      type: null,
                      specificity: null,
                      capacity: null,
                    })
                  }
                  disabled={saving}
                >
                  Ajouter une scène
                </Button>
              </div>

              <div className="space-y-3">
                {stagesFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        Scène {index + 1}
                      </h4>
                      {stagesFields.length > 1 && (
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-8 h-8 p-1"
                          onClick={() => removeStage(index)}
                          disabled={saving}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <Input
                        label="Nom"
                        {...register(`stages.${index}.name`, {
                          required: 'Le nom est obligatoire',
                        })}
                        error={errors.stages?.[index]?.name?.message}
                        placeholder="Ex: Main Stage"
                        required
                        disabled={saving}
                      />
                      <Select
                        label="Type"
                        size="sm"
                        {...register(`stages.${index}.type`)}
                        disabled={saving}
                        options={[
                          { label: '(Aucun)', value: '' },
                          ...stageTypes.map((type) => ({
                            label: type.label,
                            value: type.value,
                          })),
                        ]}
                      />
                      <Select
                        label="Spécificité"
                        size="sm"
                        {...register(`stages.${index}.specificity`)}
                        disabled={saving}
                        options={[
                          { label: '(Aucune)', value: '' },
                          ...stageSpecificities.map((spec) => ({
                            label: spec.label,
                            value: spec.value,
                          })),
                        ]}
                      />
                      <Input
                        label="Capacité"
                        type="number"
                        {...register(`stages.${index}.capacity`, {
                          valueAsNumber: true,
                        })}
                        placeholder="Ex: 12000"
                        disabled={saving}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}


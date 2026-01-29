import { useState, useEffect, useCallback } from 'react';
import { Wallet, Plus, Trash2, Edit2, GripVertical } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { useToast } from '@/components/aura/ToastProvider';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCompanyId } from '@/lib/tenant';

interface InvoiceCategory {
  id: string;
  name: string;
  is_active: boolean;
}

export function SettingsAdminPage() {
  const { success: toastSuccess, error: toastError } = useToast();

  // Categories de factures
  const [categories, setCategories] = useState<InvoiceCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Formulaire d'ajout
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Edition inline
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  // Confirmation de suppression
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; category: InvoiceCategory | null }>({
    open: false,
    category: null
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Recuperer le company_id
  useEffect(() => {
    getCurrentCompanyId(supabase).then(setCompanyId).catch(console.error);
  }, []);

  // Charger les categories
  const loadCategories = useCallback(async () => {
    if (!companyId) {
      setCategoriesLoading(false);
      return;
    }
    
    setCategoriesLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoice_categories')
        .select('id, name, is_active')
        .eq('company_id', companyId)
        .order('name');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      console.error('Erreur chargement categories:', err);
      toastError('Erreur chargement des categories');
    } finally {
      setCategoriesLoading(false);
    }
  }, [companyId, toastError]);

  useEffect(() => {
    if (companyId) {
      loadCategories();
    }
  }, [companyId, loadCategories]);

  // Ajouter une categorie
  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !companyId) return;

    try {
      const { error } = await supabase
        .from('invoice_categories')
        .insert({
          company_id: companyId,
          name: newCategoryName.trim().toUpperCase(),
          is_active: true,
        });

      if (error) throw error;
      
      setNewCategoryName('');
      setShowAddForm(false);
      toastSuccess('Categorie ajoutee');
      loadCategories();
    } catch (err: any) {
      console.error('Erreur ajout categorie:', err);
      toastError(err.message || 'Erreur lors de l\'ajout');
    }
  };

  // Commencer l'edition
  const handleEditCategory = (category: InvoiceCategory) => {
    setEditingCategoryId(category.id);
    setEditCategoryName(category.name);
  };

  // Sauvegarder l'edition
  const handleSaveCategory = async () => {
    if (!editingCategoryId || !editCategoryName.trim()) return;

    try {
      const { error } = await supabase
        .from('invoice_categories')
        .update({ name: editCategoryName.trim().toUpperCase() })
        .eq('id', editingCategoryId);

      if (error) throw error;
      
      setEditingCategoryId(null);
      setEditCategoryName('');
      toastSuccess('Categorie modifiee');
      loadCategories();
    } catch (err: any) {
      console.error('Erreur modification categorie:', err);
      toastError(err.message || 'Erreur lors de la modification');
    }
  };

  // Annuler l'edition
  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditCategoryName('');
  };

  // Ouvrir la confirmation de suppression
  const handleDeleteCategory = (category: InvoiceCategory) => {
    setDeleteConfirm({ open: true, category });
  };

  // Confirmer la suppression
  const handleConfirmDelete = async () => {
    if (!deleteConfirm.category) return;
    
    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('invoice_categories')
        .delete()
        .eq('id', deleteConfirm.category.id);

      if (error) throw error;
      
      toastSuccess('Categorie supprimee');
      setDeleteConfirm({ open: false, category: null });
      loadCategories();
    } catch (err: any) {
      console.error('Erreur suppression categorie:', err);
      toastError(err.message || 'Erreur lors de la suppression');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Toggle actif/inactif
  const handleToggleActive = async (category: InvoiceCategory) => {
    try {
      const { error } = await supabase
        .from('invoice_categories')
        .update({ is_active: !category.is_active })
        .eq('id', category.id);

      if (error) throw error;
      loadCategories();
    } catch (err: any) {
      console.error('Erreur toggle categorie:', err);
      toastError(err.message || 'Erreur');
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tete */}
      <div>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Options Administration
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Gerez les parametres administratifs et techniques
        </p>
      </div>

      {/* Grille 3 colonnes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Categories de factures */}
        <Card>
          <CardHeader>
            <div>
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-violet-400" />
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Categories de factures
                </h3>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Types de paiements
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus size={16} />
            </Button>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {/* Formulaire d'ajout */}
              {showAddForm && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nouveau label..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCategory();
                      if (e.key === 'Escape') setShowAddForm(false);
                    }}
                    autoFocus
                  />
                  <Button size="sm" variant="primary" onClick={handleAddCategory}>
                    Ajouter
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                    Annuler
                  </Button>
                </div>
              )}

              {/* Liste des categories */}
              {categoriesLoading ? (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                  Chargement...
                </p>
              ) : categories.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                  Aucune option definie. Cliquez sur "Ajouter" pour en creer.
                </p>
              ) : (
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      {/* Grip icon (decoratif - pas de sort_order en DB) */}
                      <div className="text-gray-400">
                        <GripVertical className="w-5 h-5" />
                      </div>

                      {/* Toggle actif/inactif */}
                      <button
                        onClick={() => handleToggleActive(category)}
                        className={`w-3 h-3 rounded-full flex-shrink-0 transition-colors ${
                          category.is_active ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                        title={category.is_active ? 'Actif - cliquez pour desactiver' : 'Inactif - cliquez pour activer'}
                      />

                      {editingCategoryId === category.id ? (
                        <>
                          <Input
                            value={editCategoryName}
                            onChange={(e) => setEditCategoryName(e.target.value)}
                            className="flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveCategory();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <Button size="sm" variant="primary" onClick={handleSaveCategory}>
                            OK
                          </Button>
                          <Button size="sm" variant="secondary" onClick={handleCancelEdit}>
                            X
                          </Button>
                        </>
                      ) : (
                        <>
                          <span 
                            className={`flex-1 text-sm text-gray-700 dark:text-gray-300 ${!category.is_active ? 'opacity-50 line-through' : ''}`}
                          >
                            {category.name}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditCategory(category)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCategory(category)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Modal de confirmation de suppression */}
      <ConfirmDeleteModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, category: null })}
        onConfirm={handleConfirmDelete}
        title="Supprimer la categorie"
        message="Etes-vous sur de vouloir supprimer cette categorie ?"
        itemName={deleteConfirm.category?.name}
        loading={deleteLoading}
      />
    </div>
  );
}

export default SettingsAdminPage;

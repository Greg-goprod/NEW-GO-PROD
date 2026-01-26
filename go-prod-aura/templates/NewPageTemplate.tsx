import { PageHeader } from "@/components/aura/PageHeader";
import { Button } from "@/components/aura/Button";
import { Card, CardHeader, CardBody } from "@/components/aura/Card";
import { ActionButtons } from "@/components/aura/ActionButtons";
import { ConfirmDialog } from "@/components/aura/ConfirmDialog";
import { useCurrentEvent } from "@/hooks/useCurrentEvent";
import { useToast } from "@/components/aura/ToastProvider";
import { getTableRowHoverProps } from "@/lib/designSystem";
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";

/**
 * Template Standard de Page - Go-Prod AURA
 * 
 * ✅ Respecte le standard AURA
 * ✅ TopBar automatique (via AppLayout)
 * ✅ PageHeader standardisé
 * ✅ Gestion des états (loading, empty, error)
 * 
 * Instructions :
 * 1. Copier ce fichier dans src/pages/
 * 2. Renommer le composant
 * 3. Adapter le contenu
 * 4. Ajouter la route dans App.tsx
 * 5. Ajouter le lien dans AppLayout.tsx
 */
export default function NewPageTemplate() {
  // 🎯 HOOKS STANDARDS (dans cet ordre)
  const { currentEvent, companyId } = useCurrentEvent();
  const { success: toastSuccess, error: toastError } = useToast();
  
  // ÉTATS LOCAUX
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ 
    open: boolean; 
    item: any | null 
  }>({ open: false, item: null });
  
  // CHARGEMENT DES DONNÉES
  useEffect(() => {
    if (!currentEvent?.id || !companyId) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        // TODO: Appels API ici
        // const result = await fetchMyData(currentEvent.id, companyId);
        // setData(result);
        toastSuccess("Données chargées");
      } catch (error: any) {
        console.error("Erreur chargement:", error);
        toastError(error?.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentEvent?.id, companyId]);
  
  // HANDLERS
  const handleCreate = () => {
    // TODO: Logique de création
    toastSuccess("Élément créé");
  };
  
  const handleEdit = (item: any) => {
    // TODO: Logique d'édition
    toastSuccess("Élément modifié");
  };
  
  const handleDeleteClick = (item: any) => {
    setDeleteConfirm({ open: true, item });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.item) return;
    
    try {
      // TODO: Appel API de suppression
      // await deleteItem(deleteConfirm.item.id);
      toastSuccess("Élément supprimé");
      setDeleteConfirm({ open: false, item: null });
      // Recharger les données
    } catch (error: any) {
      toastError(error?.message || "Erreur lors de la suppression");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 📌 HEADER STANDARD - OBLIGATOIRE */}
      <PageHeader
        title="Nom de la Page"
        subtitle={
          <>
            {currentEvent ? (
              <>
                <span className="font-medium" style={{ color: currentEvent.color_hex }}>
                  {currentEvent.name}
                </span>
                {" • "}
              </>
            ) : null}
            {data.length} éléments
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => console.log("Action secondaire")}>
              Action secondaire
            </Button>
            <Button leftIcon={<Plus size={16} />} onClick={handleCreate}>
              Créer
            </Button>
          </>
        }
      />

      {/* 📦 CONTENU PRINCIPAL */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            Section Principale
          </h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            // État de chargement
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400 mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
              </div>
            </div>
          ) : data.length === 0 ? (
            // État vide
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Aucun élément pour le moment
              </p>
              <Button onClick={handleCreate}>
                + Créer le premier élément
              </Button>
            </div>
          ) : (
            // Affichage des données
            <div className="space-y-4">
              {data.map((item: any) => (
                <div
                  key={item.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  style={{ transition: 'background 0.15s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-hover-row)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = ''}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {item.name || "Nom de l'élément"}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Description ou détails
                      </p>
                    </div>
                    <ActionButtons 
                      onEdit={() => handleEdit(item)} 
                      onDelete={() => handleDeleteClick(item)} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* 📊 SECTION SECONDAIRE (optionnel) */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            Statistiques ou Section Additionnelle
          </h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {data.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total d'éléments
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                0
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Métrique 2
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                0
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Métrique 3
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 🗑️ DIALOGUE DE CONFIRMATION DE SUPPRESSION */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, item: null })}
        onConfirm={handleDeleteConfirm}
        title="Supprimer l'élément"
        message={`Êtes-vous sûr de vouloir supprimer "${deleteConfirm.item?.name}" ?\n\nCette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
      />
    </div>
  );
}


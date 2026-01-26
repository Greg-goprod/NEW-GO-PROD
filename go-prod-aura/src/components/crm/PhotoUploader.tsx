import { useState, useRef } from 'react';
import { Upload, X, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/aura/ToastProvider';

interface PhotoUploaderProps {
  currentPhotoUrl?: string;
  onPhotoChange: (url: string | null) => void;
  contactId?: string;
}

export function PhotoUploader({ currentPhotoUrl, onPhotoChange, contactId }: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: toastError } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validation
    if (!file.type.startsWith('image/')) {
      toastError('Le fichier doit être une image');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toastError('L\'image ne doit pas dépasser 5MB');
      return;
    }

    try {
      setUploading(true);

      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = contactId 
        ? `${contactId}-${timestamp}.${fileExt}`
        : `temp-${timestamp}.${fileExt}`;

      // Upload vers Supabase Storage
      const { data, error } = await supabase.storage
        .from('contact-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Générer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('contact-photos')
        .getPublicUrl(data.path);

      setPreviewUrl(publicUrl);
      onPhotoChange(publicUrl);
      success('Photo uploadée avec succès');
    } catch (err) {
      console.error('Erreur upload:', err);
      toastError('Erreur lors de l\'upload de la photo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onPhotoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
        Photo
      </label>
      
      <div className="flex items-center gap-4">
        {/* Aperçu de la photo */}
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Aperçu"
              className="w-20 h-20 rounded-full object-cover border-2 border-violet-500"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              title="Supprimer la photo"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
            <Camera className="w-8 h-8 text-gray-400" />
          </div>
        )}

        {/* Bouton d'upload */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <button
            type="button"
            onClick={handleClick}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Upload en cours...' : previewUrl ? 'Changer la photo' : 'Ajouter une photo'}
          </button>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            JPG, PNG ou GIF • Max 5MB
          </p>
        </div>
      </div>
    </div>
  );
}






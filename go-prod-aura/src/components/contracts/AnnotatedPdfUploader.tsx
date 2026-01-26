import React, { useState, useRef } from 'react';
import { Upload, FileText, X, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Contract, ContractStatus } from '@/types/contracts';
import { saveAnnotatedContract, saveSignedContract, saveExternalSignedContract } from '../../api/contracts-annotation';

interface AnnotatedPdfUploaderProps {
  contract: Contract;
  onUploadSuccess: () => void;
  onUploadError: (error: string) => void;
}

export const AnnotatedPdfUploader: React.FC<AnnotatedPdfUploaderProps> = ({
  contract,
  onUploadSuccess,
  onUploadError,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Déterminer le type d'upload selon le statut
  const getUploadConfig = () => {
    const status: ContractStatus = contract.status;
    
    switch (status) {
      case 'review':
        return {
          title: 'Upload PDF annoté',
          description: 'Version avec annotations/modifications internes',
          version: 'annotated' as const,
          buttonText: 'Upload et passer en signature interne'
        };
      case 'internal_sign':
        return {
          title: 'Upload PDF signé en interne',
          description: 'Version signée par la production',
          version: 'signed' as const,
          buttonText: 'Upload et marquer comme signé interne'
        };
      case 'external_sign':
        return {
          title: 'Upload PDF signé par l\'artiste',
          description: 'Version finale signée par toutes les parties',
          version: 'signed' as const,
          buttonText: 'Upload et finaliser le contrat'
        };
      default:
        return {
          title: 'Upload PDF',
          description: 'Télécharger une nouvelle version du contrat',
          version: 'annotated' as const,
          buttonText: 'Upload'
        };
    }
  };

  const config = getUploadConfig();

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      onUploadError('Seuls les fichiers PDF sont acceptés');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      onUploadError('Le fichier ne doit pas dépasser 10 Mo');
      return;
    }

    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    handleFileChange(droppedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);

      let result;
      if (contract.status === 'external_sign') {
        result = await saveExternalSignedContract({
          contractId: contract.id,
          file,
          version: config.version
        });
      } else if (contract.status === 'internal_sign') {
        result = await saveSignedContract({
          contractId: contract.id,
          file,
          version: config.version
        });
      } else {
        result = await saveAnnotatedContract({
          contractId: contract.id,
          file,
          version: config.version
        });
      }

      if (result.success) {
        onUploadSuccess();
      } else {
        onUploadError(result.error || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Erreur upload:', error);
      onUploadError(error instanceof Error ? error.message : 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {config.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {config.description}
        </p>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 transition-all
          ${isDragging
            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
          className="hidden"
        />

        {file ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                <FileText className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {file.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {(file.size / 1024 / 1024).toFixed(2)} Mo
                </p>
              </div>
            </div>
            <button
              onClick={() => setFile(null)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        ) : (
          <div className="text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Glissez-déposez un fichier PDF ici, ou
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              Parcourir les fichiers
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Maximum 10 Mo
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="primary"
          onClick={handleUpload}
          disabled={!file || uploading}
          leftIcon={uploading ? undefined : <Check className="w-4 h-4" />}
        >
          {uploading ? 'Upload en cours...' : config.buttonText}
        </Button>
      </div>
    </div>
  );
};

/**
 * Visualiseur PDF de facture
 * Affiche le PDF dans une modal avec options de téléchargement
 */

import { useState, useEffect } from 'react';
import { Download, ExternalLink, Loader2, FileX } from 'lucide-react';
import { Modal } from '@/components/aura/Modal';
import { Button } from '@/components/aura/Button';
import type { InvoiceWithRelations, InvoiceFile } from '../financeTypes';
import { getInvoiceFileUrl, fetchInvoiceFiles } from '../financeApi';

interface InvoicePdfViewerProps {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceWithRelations | null;
}

export function InvoicePdfViewer({
  open,
  onClose,
  invoice,
}: InvoicePdfViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [files, setFiles] = useState<InvoiceFile[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);

  // Charger les fichiers de la facture
  useEffect(() => {
    if (open && invoice) {
      setLoading(true);
      setError(null);
      setPdfUrl(null);

      fetchInvoiceFiles(invoice.id)
        .then(async (invoiceFiles) => {
          setFiles(invoiceFiles);
          if (invoiceFiles.length > 0) {
            const url = await getInvoiceFileUrl(invoiceFiles[0].file_path);
            setPdfUrl(url);
            setSelectedFileIndex(0);
          } else {
            setError('Aucun fichier attaché à cette facture');
          }
        })
        .catch((err) => {
          setError(err.message || 'Erreur lors du chargement du fichier');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, invoice]);

  // Changer de fichier
  const handleSelectFile = async (index: number) => {
    if (index === selectedFileIndex || !files[index]) return;

    setLoading(true);
    try {
      const url = await getInvoiceFileUrl(files[index].file_path);
      setPdfUrl(url);
      setSelectedFileIndex(index);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // Ouvrir dans un nouvel onglet
  const handleOpenExternal = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  // Télécharger
  const handleDownload = () => {
    if (pdfUrl && invoice) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `facture_${invoice.reference}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const fileKindLabels: Record<string, string> = {
    invoice: 'Facture',
    credit: 'Avoir',
    receipt: 'Reçu',
    other: 'Autre',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Facture ${invoice?.reference || ''}`}
      size="xl"
    >
      <div className="flex flex-col h-[70vh]">
        {/* Barre d'outils */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            {/* Sélecteur de fichier si plusieurs */}
            {files.length > 1 && (
              <select
                value={selectedFileIndex}
                onChange={(e) => handleSelectFile(parseInt(e.target.value))}
                className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {files.map((file, idx) => (
                  <option key={file.id} value={idx}>
                    {fileKindLabels[file.kind] || file.kind} ({idx + 1})
                  </option>
                ))}
              </select>
            )}
            {files.length === 1 && (
              <span className="text-sm text-gray-400">
                {fileKindLabels[files[0]?.kind] || 'Document'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenExternal}
              disabled={!pdfUrl}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ouvrir
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              disabled={!pdfUrl}
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Button>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 mt-3 bg-gray-900 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <FileX className="w-12 h-12 mb-3" />
              <p>{error}</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title={`Facture ${invoice?.reference}`}
            />
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

export default InvoicePdfViewer;

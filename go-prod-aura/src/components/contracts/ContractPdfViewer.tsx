import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';

interface ContractPdfViewerProps {
  pdfUrl: string;
  title: string;
}

export const ContractPdfViewer: React.FC<ContractPdfViewerProps> = ({ pdfUrl, title }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <iframe
          src={pdfUrl}
          title={title}
          className="w-full h-[70vh]"
        />
      </div>
      
      <div className="mt-4 flex justify-end">
        <Button
          variant="secondary"
          onClick={() => window.open(pdfUrl, '_blank')}
          leftIcon={<ExternalLink className="w-4 h-4" />}
        >
          Ouvrir dans un nouvel onglet
        </Button>
      </div>
    </div>
  );
};

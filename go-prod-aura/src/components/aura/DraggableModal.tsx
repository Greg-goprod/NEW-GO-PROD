import React, { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardBody } from "./Card";
import { Button } from "./Button";
import { Move } from "lucide-react";

// Tailles standardisees AURA (meme que Modal.tsx)
const MODAL_SIZES = {
  sm: '400px',
  md: '600px',
  lg: '800px',
  xl: '1000px',
} as const;

type ModalSize = keyof typeof MODAL_SIZES;

interface DraggableModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** @deprecated Utiliser `size` a la place */
  widthClass?: string;
  /** Taille standardisee: 'sm' (400px), 'md' (600px), 'lg' (800px), 'xl' (1000px) */
  size?: ModalSize;
  maxHeight?: string;
}

/**
 * Modal AURA déplaçable
 * Permet de déplacer le modal en cliquant et glissant sur le header
 */
export const DraggableModal: React.FC<DraggableModalProps> = ({
  open,
  title,
  onClose,
  children,
  widthClass,
  size = 'xl',
  maxHeight = "90vh",
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Réinitialiser la position quand le modal s'ouvre
  useEffect(() => {
    if (open) {
      setPosition({ x: 0, y: 0 });
    }
  }, [open]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Ne pas activer le drag si on clique sur le bouton de fermeture
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Limiter le déplacement pour que le modal reste visible
    const modal = modalRef.current;
    if (modal) {
      const rect = modal.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width / 2;
      const maxY = window.innerHeight - 100; // Garder au moins le header visible
      const minX = -rect.width / 2;
      const minY = -50;

      setPosition({
        x: Math.max(minX, Math.min(maxX, newX)),
        y: Math.max(minY, Math.min(maxY, newY)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, dragStart, position]);

  // Utiliser size si defini, sinon fallback sur widthClass pour compatibilite
  const modalWidth = widthClass ? undefined : MODAL_SIZES[size];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`relative ${widthClass || ''}`}
        style={{
          width: modalWidth,
          maxWidth: '90vw',
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          maxHeight,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="shadow-2xl">
          <div
            ref={headerRef}
            onMouseDown={handleMouseDown}
          >
            <CardHeader className={`cursor-move select-none ${isDragging ? 'opacity-80' : ''}`}>
              <div className="flex items-center gap-2">
                <Move className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                <div className="font-semibold flex-1" style={{ color: 'var(--color-text-primary)' }}>
                  {title}
                </div>
              </div>
              <Button variant="ghost" onClick={onClose}>
                Fermer
              </Button>
            </CardHeader>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: `calc(${maxHeight} - 80px)` }}>
            <CardBody>
              {children}
            </CardBody>
          </div>
        </Card>
      </div>
    </div>
  );
};

import React, { useRef, useCallback, useState, useEffect } from "react";
import { X, GripHorizontal } from "lucide-react";

// Tailles standardisees AURA
const MODAL_SIZES = {
  sm: '400px',   // Petit - confirmations, alertes
  md: '600px',   // Moyen - formulaires simples
  lg: '800px',   // Grand - formulaires complexes
  xl: '1000px',  // Tres grand - tableaux, previews
} as const;

type ModalSize = keyof typeof MODAL_SIZES;

export const Modal: React.FC<{ 
  open: boolean; 
  title?: string; 
  onClose: () => void; 
  children: React.ReactNode; 
  /** @deprecated Utiliser `size` a la place */
  widthClass?: string;
  /** Taille standardisee: 'sm' (400px), 'md' (600px), 'lg' (800px), 'xl' (1000px) */
  size?: ModalSize;
  zIndex?: number;
  footer?: React.ReactNode;
  /** Permet de deplacer le modal (defaut: true) */
  draggable?: boolean;
}> = ({ open, title, onClose, children, widthClass, size = 'md', zIndex=500, footer, draggable = true }) => {
  // Utiliser size si defini, sinon fallback sur widthClass pour compatibilite
  const modalWidth = widthClass ? undefined : MODAL_SIZES[size];
  
  // State pour le drag
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset position quand le modal s'ouvre
  useEffect(() => {
    if (open) {
      setPosition({ x: 0, y: 0 });
    }
  }, [open]);

  // Gestion du drag
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!draggable) return;
    // Ne pas demarrer le drag si on clique sur le bouton fermer
    if ((e.target as HTMLElement).closest('button')) return;
    
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  }, [draggable, position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      
      // Limiter le deplacement pour garder le modal visible
      const modal = modalRef.current;
      if (modal) {
        const rect = modal.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width / 2;
        const maxY = window.innerHeight - 100;
        const minX = -rect.width / 2;
        const minY = -window.innerHeight / 2 + 50;
        
        setPosition({
          x: Math.max(minX, Math.min(maxX, newX)),
          y: Math.max(minY, Math.min(maxY, newY)),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Fermeture avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  if (!open) return null;
  
  return (
    <>
      {/* Backdrop avec blur - PAS de fermeture au clic */}
      <div 
        className="fixed inset-0"
        style={{ 
          zIndex: zIndex - 1,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
        }} 
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className={`fixed ${widthClass || ''}`}
        style={{ 
          zIndex,
          width: modalWidth,
          maxWidth: '90vw',
          maxHeight: '90vh',
          top: '50%',
          left: '50%',
          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-xl, 0 25px 50px -12px rgba(0, 0, 0, 0.25))',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header - zone de drag */}
          {title && (
            <div 
              className="px-6 py-4 flex items-center justify-between shrink-0 select-none"
              style={{ 
                borderBottom: '1px solid var(--color-border)',
                cursor: draggable ? 'move' : 'default',
              }}
              onMouseDown={handleDragStart}
            >
              <div className="flex items-center gap-2">
                {draggable && (
                  <GripHorizontal 
                    className="w-4 h-4 opacity-40" 
                    style={{ color: 'var(--color-text-secondary)' }} 
                  />
                )}
                <h3 
                  className="text-xl font-bold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {title}
                </h3>
              </div>
              <button 
                onClick={onClose}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                style={{ 
                  background: 'var(--color-bg-surface-hover, rgba(255,255,255,0.05))',
                }}
              >
                <X className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>
          )}
          
          {/* Body */}
          <div 
            className="px-6 py-4 overflow-y-auto flex-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {children}
          </div>
          
          {/* Footer (optionnel) */}
          {footer && (
            <div 
              className="px-6 py-4 flex justify-end gap-3 shrink-0"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

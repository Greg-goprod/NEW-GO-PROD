import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'xxs' | 'sm' | 'md' | 'lg' | 'xl';
  draggable?: boolean;
  className?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  draggable = true,
  className = ''
}: ModalProps) {
  const [, setIsDragging] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Empêcher le scroll du body quand le modal est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Gestion du déplacement
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!draggable) return;
    
    e.stopPropagation();
    const modal = modalRef.current;
    const header = modal?.querySelector('.modal-header') as HTMLElement;
    
    if (header && header.contains(e.target as Node)) {
      setIsDragging(true);
      const startX = e.clientX;
      const startY = e.clientY;
      const rect = modal!.getBoundingClientRect();
      const startLeft = rect.left;
      const startTop = rect.top;

      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        modal!.style.left = `${startLeft + deltaX}px`;
        modal!.style.top = `${startTop + deltaY}px`;
        modal!.style.transform = 'none';
      };

      const handleMouseUp = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  // Gestion de la fermeture avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    xxs: 'modal-xxs',
    sm: 'modal-sm',
    md: 'modal-md', 
    lg: 'modal-lg',
    xl: 'modal-xl'
  };

  return (
    <div 
      className="modal-backdrop" 
      onClick={onClose}
      style={{ zIndex: 'var(--z-modal-backdrop)' }}
    >
      <div 
        ref={modalRef}
        className={`modal ${sizeClasses[size]} ${className}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          userSelect: 'none',
          zIndex: 'var(--z-modal)',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-xl)',
          borderRadius: '18px',
          color: 'var(--color-text-primary)'
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div 
          className="p-4 border-b modal-header" 
          style={{
            borderColor: 'var(--color-border)', 
            cursor: draggable ? 'move' : 'default'
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold font-sans" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
            <button 
              onClick={onClose} 
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-smooth"
              style={{
                color: 'var(--color-text-muted)',
                background: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'color-mix(in oklab, var(--color-primary) 15%, transparent)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-muted)';
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div 
            className="p-4 border-t flex justify-end gap-2" 
            style={{ borderColor: 'var(--color-border)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Composant ModalFooter pour standardiser les boutons
export function ModalFooter({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div 
      className={`flex justify-end gap-2 ${className}`}
      style={{ borderColor: 'var(--border-default)' }}
    >
      {children}
    </div>
  );
}

// Composant ModalButton pour standardiser les boutons
export function ModalButton({ 
  variant = 'secondary', 
  onClick, 
  children, 
  disabled = false,
  loading = false,
  className = ''
}: {
  variant?: 'primary' | 'secondary' | 'danger';
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  // Pour le variant danger, utiliser des styles personnalisés avec le rouge Aura
  if (variant === 'danger') {
    return (
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 
          bg-red-600 hover:bg-red-700 text-white 
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
          ${className}`}
      >
        {loading ? "Chargement…" : children}
      </button>
    );
  }

  const baseClasses = "btn font-sans";
  const variantClasses = {
    primary: "btn-primary btn-sm",
    secondary: "btn-secondary btn-sm", 
    danger: ""
  };

  return (
    <Button
      variant={variant as 'primary' | 'secondary'}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {loading ? "Chargement…" : children}
    </Button>
  );
}
import React, { useRef, useCallback } from "react";
import { Card, CardHeader, CardBody } from "./Card";
import { Button } from "./Button";

export const Modal: React.FC<{ open: boolean; title?: string; onClose: () => void; children: React.ReactNode; widthClass?: string; zIndex?: number; }> = ({ open, title, onClose, children, widthClass="max-w-4xl", zIndex=1100 }) => {
  // Ref pour tracker si le mousedown a commencé sur le backdrop
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownTargetRef.current = e.target;
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // Fermer uniquement si mousedown ET mouseup sont sur le backdrop
    if (
      mouseDownTargetRef.current === backdropRef.current &&
      e.target === backdropRef.current
    ) {
      onClose();
    }
    mouseDownTargetRef.current = null;
  }, [onClose]);

  if (!open) return null;
  
  return (
    <div 
      ref={backdropRef}
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/60" 
      style={{ zIndex }} 
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <Card className={`w-full ${widthClass}`} onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className="font-semibold text-gray-900 dark:text-gray-100">{title}</div>
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
        </CardHeader>
        <CardBody>{children}</CardBody>
      </Card>
    </div>
  );
};

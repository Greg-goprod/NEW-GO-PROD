import React from "react";
import { Card, CardHeader, CardBody } from "./Card";
import { Button } from "./Button";
export const Modal: React.FC<{ open: boolean; title?: string; onClose: () => void; children: React.ReactNode; widthClass?: string; zIndex?: number; }> = ({ open, title, onClose, children, widthClass="max-w-4xl", zIndex=1100 }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60" style={{ zIndex }} onClick={onClose}>
      <Card className={`w-full ${widthClass}`} >
        <CardHeader>
          <div className="font-semibold text-gray-900 dark:text-gray-100">{title}</div>
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
        </CardHeader>
        <CardBody><div onClick={(e)=>e.stopPropagation()}>{children}</div></CardBody>
      </Card>
    </div>
  );
};

import React from "react";

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className="", children }) =>
  <div 
    className={`rounded-xl shadow-sm ${className}`}
    style={{
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-md)'
    }}
  >
    {children}
  </div>;

export const CardHeader: React.FC<{ className?: string; children: React.ReactNode }> = ({ className="", children }) =>
  <div 
    className={`px-4 py-3 border-b flex items-center justify-between ${className}`}
    style={{ borderColor: 'var(--color-border)' }}
  >
    {children}
  </div>;

export const CardBody: React.FC<{ className?: string; children: React.ReactNode }> = ({ className="", children }) =>
  <div className={`p-4 ${className}`}>{children}</div>;

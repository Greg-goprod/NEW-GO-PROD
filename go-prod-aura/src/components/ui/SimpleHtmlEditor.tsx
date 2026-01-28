/**
 * Editeur HTML simple avec toolbar basique
 * Utilise contentEditable pour l'edition WYSIWYG
 * Popups personnalisees selon charte AURA
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link,
  Image,
  Type,
  Palette,
  Undo,
  Redo,
  ChevronDown,
} from 'lucide-react';

interface SimpleHtmlEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  disabled?: boolean;
}

// Tailles de police disponibles
const FONT_SIZES = [
  { label: 'Petit', value: '1' },
  { label: 'Normal', value: '3' },
  { label: 'Moyen', value: '4' },
  { label: 'Grand', value: '5' },
  { label: 'Tres grand', value: '6' },
];

// Couleurs predefinies
const COLORS = [
  '#000000', '#333333', '#666666', '#999999',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff',
];

export function SimpleHtmlEditor({
  value,
  onChange,
  placeholder = 'Saisissez votre texte...',
  minHeight = 200,
  disabled = false,
}: SimpleHtmlEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fontSizeRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectionWarning, setSelectionWarning] = useState(false);

  // Synchroniser la valeur initiale
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  // Fermer les menus au clic exterieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fontSizeRef.current && !fontSizeRef.current.contains(event.target as Node)) {
        setShowFontSizeMenu(false);
      }
      if (colorRef.current && !colorRef.current.contains(event.target as Node)) {
        setShowColorMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Executer une commande d'edition
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    
    // Notifier le changement
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  // Gerer le changement de contenu
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  // Inserer une image via URL
  const handleInsertImage = useCallback(() => {
    setShowImageModal(true);
  }, []);

  const confirmInsertImage = useCallback(() => {
    if (imageUrl) {
      execCommand('insertImage', imageUrl);
      setImageUrl('');
    }
    setShowImageModal(false);
  }, [imageUrl, execCommand]);

  // Inserer un lien
  const handleInsertLink = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      setShowLinkModal(true);
      setSelectionWarning(false);
    } else {
      setSelectionWarning(true);
      setTimeout(() => setSelectionWarning(false), 3000);
    }
  }, []);

  const confirmInsertLink = useCallback(() => {
    if (linkUrl) {
      execCommand('createLink', linkUrl);
      setLinkUrl('');
    }
    setShowLinkModal(false);
  }, [linkUrl, execCommand]);

  // Bouton de toolbar
  const ToolbarButton = ({ 
    onClick, 
    title, 
    children,
    active = false,
  }: { 
    onClick: () => void; 
    title: string; 
    children: React.ReactNode;
    active?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
        active ? 'bg-gray-200 dark:bg-gray-600' : ''
      }`}
      style={{ color: 'var(--text-secondary)' }}
    >
      {children}
    </button>
  );

  // Separateur de toolbar
  const Separator = () => (
    <div 
      className="w-px h-5 mx-1" 
      style={{ background: 'var(--border-default)' }} 
    />
  );

  return (
    <div 
      className="rounded-lg border overflow-hidden"
      style={{ 
        borderColor: 'var(--border-default)',
        background: 'var(--bg-surface)',
      }}
    >
      {/* Toolbar */}
      <div 
        className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b"
        style={{ 
          borderColor: 'var(--border-default)',
          background: 'var(--bg-elevated)',
        }}
      >
        {/* Undo/Redo */}
        <ToolbarButton onClick={() => execCommand('undo')} title="Annuler (Ctrl+Z)">
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('redo')} title="Retablir (Ctrl+Y)">
          <Redo className="w-4 h-4" />
        </ToolbarButton>

        <Separator />

        {/* Taille de police - Dropdown AURA */}
        <div className="relative" ref={fontSizeRef}>
          <button
            type="button"
            onClick={() => {
              setShowFontSizeMenu(!showFontSizeMenu);
              setShowColorMenu(false);
            }}
            disabled={disabled}
            title="Taille de police"
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Type className="w-4 h-4" />
            <ChevronDown className="w-3 h-3" />
          </button>
          {showFontSizeMenu && (
            <div 
              className="absolute top-full left-0 mt-1 py-1 rounded-lg shadow-lg min-w-[140px]"
              style={{ 
                background: 'var(--bg-elevated)', 
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100,
              }}
            >
              {FONT_SIZES.map((size) => (
                <button
                  key={size.value}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-violet-500/10"
                  style={{ color: 'var(--text-primary)' }}
                  onClick={() => {
                    execCommand('fontSize', size.value);
                    setShowFontSizeMenu(false);
                  }}
                >
                  {size.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Couleur du texte - Dropdown AURA */}
        <div className="relative" ref={colorRef}>
          <button
            type="button"
            onClick={() => {
              setShowColorMenu(!showColorMenu);
              setShowFontSizeMenu(false);
            }}
            disabled={disabled}
            title="Couleur du texte"
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Palette className="w-4 h-4" />
            <ChevronDown className="w-3 h-3" />
          </button>
          {showColorMenu && (
            <div 
              className="absolute top-full left-0 mt-1 p-2 rounded-lg shadow-lg"
              style={{ 
                background: 'var(--bg-elevated)', 
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100,
              }}
            >
              <div className="grid grid-cols-4 gap-1.5">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-7 h-7 rounded-md transition-all hover:scale-110 hover:shadow-md"
                    style={{ 
                      background: color,
                      border: color === '#ffffff' ? '1px solid var(--border-default)' : 'none',
                      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
                    }}
                    onClick={() => {
                      execCommand('foreColor', color);
                      setShowColorMenu(false);
                    }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Formatage basique */}
        <ToolbarButton onClick={() => execCommand('bold')} title="Gras (Ctrl+B)">
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('italic')} title="Italique (Ctrl+I)">
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('underline')} title="Souligne (Ctrl+U)">
          <Underline className="w-4 h-4" />
        </ToolbarButton>

        <Separator />

        {/* Alignement */}
        <ToolbarButton onClick={() => execCommand('justifyLeft')} title="Aligner a gauche">
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('justifyCenter')} title="Centrer">
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('justifyRight')} title="Aligner a droite">
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>

        <Separator />

        {/* Listes */}
        <ToolbarButton onClick={() => execCommand('insertUnorderedList')} title="Liste a puces">
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('insertOrderedList')} title="Liste numerotee">
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <Separator />

        {/* Liens et images */}
        <ToolbarButton onClick={handleInsertLink} title="Inserer un lien">
          <Link className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleInsertImage} title="Inserer une image">
          <Image className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Avertissement selection */}
      {selectionWarning && (
        <div 
          className="px-3 py-2 text-sm"
          style={{ 
            background: 'rgba(245, 158, 11, 0.1)', 
            color: 'var(--warning)',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          Selectionnez d'abord du texte pour creer un lien
        </div>
      )}

      {/* Zone d'edition */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        className="p-3 outline-none"
        style={{
          minHeight: `${minHeight}px`,
          color: 'var(--text-primary)',
          lineHeight: '1.6',
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      {/* Modal pour inserer un lien - Style AURA */}
      {showLinkModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center"
          style={{ 
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1300,
          }}
          onClick={() => setShowLinkModal(false)}
        >
          <div 
            className="p-5 rounded-xl max-w-md w-full mx-4"
            style={{ 
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Inserer un lien
            </h3>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://exemple.com"
              className="w-full px-4 py-3 rounded-lg mb-4 outline-none transition-all"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.boxShadow = '0 0 0 2px rgba(113, 61, 255, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-default)';
                e.target.style.boxShadow = 'none';
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmInsertLink();
                if (e.key === 'Escape') setShowLinkModal(false);
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                style={{ color: 'var(--text-secondary)' }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmInsertLink}
                className="px-4 py-2 rounded-lg text-white transition-colors"
                style={{ 
                  background: 'var(--primary)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-dark)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}
              >
                Inserer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour inserer une image - Style AURA */}
      {showImageModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center"
          style={{ 
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1300,
          }}
          onClick={() => setShowImageModal(false)}
        >
          <div 
            className="p-5 rounded-xl max-w-md w-full mx-4"
            style={{ 
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Inserer une image
            </h3>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://exemple.com/image.jpg"
              className="w-full px-4 py-3 rounded-lg mb-4 outline-none transition-all"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.boxShadow = '0 0 0 2px rgba(113, 61, 255, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-default)';
                e.target.style.boxShadow = 'none';
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmInsertImage();
                if (e.key === 'Escape') setShowImageModal(false);
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                style={{ color: 'var(--text-secondary)' }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmInsertImage}
                className="px-4 py-2 rounded-lg text-white transition-colors"
                style={{ 
                  background: 'var(--primary)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-dark)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}
              >
                Inserer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styles pour le placeholder */}
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: var(--text-muted);
          pointer-events: none;
        }
        [contenteditable] img {
          max-width: 100%;
          height: auto;
        }
        [contenteditable] a {
          color: #3b82f6;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

export default SimpleHtmlEditor;

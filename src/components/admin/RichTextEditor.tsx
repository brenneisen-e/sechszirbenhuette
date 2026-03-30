'use client';

import { useRef, useCallback } from 'react';
import { Bold, Italic, List, ListOrdered, Link, Undo, Redo } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onBlur?: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, onBlur, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    // Sync state after command
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    editorRef.current?.focus();
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleBlur = useCallback(() => {
    if (editorRef.current && onBlur) {
      onBlur(editorRef.current.innerHTML);
    }
  }, [onBlur]);

  const handleLink = useCallback(() => {
    const url = prompt('URL eingeben:');
    if (url) {
      exec('createLink', url);
    }
  }, [exec]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  const ToolbarButton = ({ onClick, active, children, title }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`p-1.5 rounded hover:bg-gray-200 transition ${active ? 'bg-gray-200 text-logo-green' : 'text-gray-600'}`}
      title={title}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        <ToolbarButton onClick={() => exec('bold')} title="Fett (Ctrl+B)">
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('italic')} title="Kursiv (Ctrl+I)">
          <Italic size={15} />
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <ToolbarButton onClick={() => exec('insertUnorderedList')} title="Aufzählung">
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('insertOrderedList')} title="Nummerierte Liste">
          <ListOrdered size={15} />
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <ToolbarButton onClick={handleLink} title="Link einfügen">
          <Link size={15} />
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <ToolbarButton onClick={() => exec('undo')} title="Rückgängig">
          <Undo size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('redo')} title="Wiederholen">
          <Redo size={15} />
        </ToolbarButton>
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleBlur}
        onPaste={handlePaste}
        className="px-3 py-2 min-h-[120px] text-sm prose prose-sm max-w-none focus:outline-none"
        dangerouslySetInnerHTML={{ __html: value || '' }}
        data-placeholder={placeholder || 'Text eingeben...'}
        style={{
          ...((!value || value === '<br>') ? {
            position: 'relative',
          } : {}),
        }}
      />

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

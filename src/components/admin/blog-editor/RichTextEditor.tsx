'use client';

import { useRef, useCallback } from 'react';
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo2,
  Redo2,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const exec = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
    // Update parent with new HTML
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    editorRef.current?.focus();
  }, [onChange]);

  const handleFormat = (tag: string) => {
    exec('formatBlock', tag);
  };

  const toolbar = [
    { icon: Bold, title: 'Fett', action: () => exec('bold') },
    { icon: Italic, title: 'Kursiv', action: () => exec('italic') },
    { type: 'separator' as const },
    { icon: Heading2, title: 'Überschrift', action: () => handleFormat('h2') },
    { icon: Heading3, title: 'Unterüberschrift', action: () => handleFormat('h3') },
    { type: 'separator' as const },
    { icon: List, title: 'Aufzählung', action: () => exec('insertUnorderedList') },
    { icon: ListOrdered, title: 'Nummerierung', action: () => exec('insertOrderedList') },
    { icon: Quote, title: 'Zitat', action: () => handleFormat('blockquote') },
    { icon: Minus, title: 'Trennlinie', action: () => exec('insertHorizontalRule') },
    { type: 'separator' as const },
    { icon: Undo2, title: 'Rückgängig', action: () => exec('undo') },
    { icon: Redo2, title: 'Wiederholen', action: () => exec('redo') },
  ];

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-logo-green focus-within:border-logo-green">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        {toolbar.map((item, i) => {
          if ('type' in item && item.type === 'separator') {
            return <div key={i} className="w-px h-6 bg-gray-300 mx-1" />;
          }
          const btn = item as { icon: React.ComponentType<{ className?: string }>; title: string; action: () => void };
          return (
            <button
              key={i}
              type="button"
              title={btn.title}
              onMouseDown={(e) => { e.preventDefault(); btn.action(); }}
              className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition"
            >
              <btn.icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        className="min-h-[250px] max-h-[500px] overflow-y-auto px-4 py-3 prose prose-sm max-w-none focus:outline-none [&>p]:mb-3 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-2 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>blockquote]:border-l-4 [&>blockquote]:border-gray-300 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-gray-600"
        dangerouslySetInnerHTML={{ __html: value || '<p></p>' }}
        onInput={() => {
          if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
          }
        }}
        onPaste={(e) => {
          e.preventDefault();
          // Paste as plain text to avoid formatting issues
          const text = e.clipboardData.getData('text/plain');
          document.execCommand('insertText', false, text);
        }}
      />
    </div>
  );
}

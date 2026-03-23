'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import ImageExt from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { useEffect, useCallback, useState, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo2,
  Redo2,
  ImageIcon,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Upload,
  X,
  Circle,
  Square,
  RectangleHorizontal,
  Maximize2,
  Loader2,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onInsertImage?: () => void;
  availableMedia?: { id: string; url: string; alt_text: string; title: string }[];
  onMediaUploaded?: () => void;
}

// Custom image extension with style classes
const StyledImage = ImageExt.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-style': {
        default: 'default',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-style') || 'default',
        renderHTML: (attributes: Record<string, string>) => ({
          'data-style': attributes['data-style'],
        }),
      },
    };
  },
});

export function RichTextEditor({ value, onChange, availableMedia, onMediaUploaded }: RichTextEditorProps) {
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      StyledImage.configure({
        inline: false,
        allowBase64: false,
      }),
      Placeholder.configure({
        placeholder: 'Schreiben Sie Ihren Beitrag...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-logo-green underline',
        },
      }),
    ],
    content: value || '<p></p>',
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'min-h-[300px] max-h-[600px] overflow-y-auto px-4 py-3 prose prose-sm max-w-none focus:outline-none',
      },
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '<p></p>', { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const insertImage = useCallback((url: string, alt: string, style = 'default') => {
    if (!editor) return;
    editor.chain().focus().setImage({
      src: url,
      alt,
      // @ts-expect-error custom attribute
      'data-style': style,
    }).run();
    setShowImagePicker(false);
  }, [editor]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      formData.append('category', 'blog');
      formData.append('alt_text', '');

      const res = await fetch('/api/admin/media', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload fehlgeschlagen');

      const data = await res.json() as { uploaded?: { url: string; title: string }[] };
      // Insert the first uploaded image directly
      if (data.uploaded?.[0]) {
        insertImage(data.uploaded[0].url, data.uploaded[0].title || '');
      }
      onMediaUploaded?.();
    } catch {
      // Error handling
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const setLink = () => {
    if (!editor || !linkUrl) return;
    editor.chain().focus().setLink({ href: linkUrl }).run();
    setShowLinkInput(false);
    setLinkUrl('');
  };

  const changeImageStyle = (style: string) => {
    if (!editor) return;
    // Update the selected image's data-style attribute
    const { state } = editor;
    const { from } = state.selection;
    const node = state.doc.nodeAt(from);
    if (node?.type.name === 'image') {
      editor.chain().focus().updateAttributes('image', { 'data-style': style }).run();
    }
  };

  if (!editor) return null;

  const ToolbarButton = ({ active, onClick, title, children, disabled }: {
    active?: boolean; onClick: () => void; title: string; children: React.ReactNode; disabled?: boolean;
  }) => (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`p-1.5 rounded transition ${
        active ? 'bg-logo-green/20 text-logo-green' : 'hover:bg-gray-200 text-gray-700'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );

  const Separator = () => <div className="w-px h-6 bg-gray-300 mx-0.5" />;

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-logo-green focus-within:border-logo-green">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        {/* Text formatting */}
        <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Fett (Strg+B)">
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Kursiv (Strg+I)">
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Unterstrichen (Strg+U)">
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>

        <Separator />

        {/* Headings */}
        <ToolbarButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Überschrift">
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Unterüberschrift">
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <Separator />

        {/* Alignment */}
        <ToolbarButton active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Linksbündig">
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Zentriert">
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Rechtsbündig">
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>

        <Separator />

        {/* Lists */}
        <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Aufzählung">
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Nummerierung">
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Zitat">
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Trennlinie">
          <Minus className="w-4 h-4" />
        </ToolbarButton>

        <Separator />

        {/* Media */}
        <ToolbarButton onClick={() => setShowImagePicker(true)} title="Bild einfügen">
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('link')} onClick={() => {
          if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run();
          } else {
            setShowLinkInput(true);
          }
        }} title="Link">
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>

        <Separator />

        {/* Undo/Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Rückgängig" disabled={!editor.can().undo()}>
          <Undo2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Wiederholen" disabled={!editor.can().redo()}>
          <Redo2 className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Link input bar */}
      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-blue-200">
          <LinkIcon className="w-4 h-4 text-blue-500 shrink-0" />
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            autoFocus
            className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            onKeyDown={(e) => { if (e.key === 'Enter') setLink(); if (e.key === 'Escape') setShowLinkInput(false); }}
          />
          <button onClick={setLink} className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Einfügen</button>
          <button onClick={() => setShowLinkInput(false)} className="p-1 text-gray-500 hover:text-gray-700"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Editor content */}
      <EditorContent editor={editor} />

      {/* Bubble menu for images - appears when clicking on an image */}
      {editor && (
        <BubbleMenu
          editor={editor}
          shouldShow={({ editor: ed }: { editor: ReturnType<typeof useEditor> }) => ed?.isActive('image') ?? false}
        >
          <div className="flex items-center gap-1 bg-white shadow-lg rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => changeImageStyle('default')}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
              title="Standard"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={() => changeImageStyle('rounded')}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
              title="Abgerundet"
            >
              <RectangleHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={() => changeImageStyle('circle')}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
              title="Kreis"
            >
              <Circle className="w-4 h-4" />
            </button>
            <button
              onClick={() => changeImageStyle('full')}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
              title="Volle Breite"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-200 mx-0.5" />
            <button
              onClick={() => editor.chain().focus().deleteSelection().run()}
              className="p-1.5 rounded hover:bg-red-50 text-red-500"
              title="Bild entfernen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </BubbleMenu>
      )}

      {/* Image picker modal */}
      {showImagePicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowImagePicker(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Bild einfügen</h3>
              <button onClick={() => setShowImagePicker(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload */}
            <div className="px-4 pt-4">
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-logo-green transition cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-2 text-logo-green">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Wird hochgeladen...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Upload className="w-5 h-5" />
                    <span className="text-sm">Foto hochladen</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                />
              </div>
            </div>

            {/* Image style selector */}
            <div className="px-4 pt-3">
              <p className="text-xs text-gray-500 mb-2">Wählen Sie ein Bild — Stil kann danach per Klick angepasst werden</p>
            </div>

            {/* Media grid */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {availableMedia?.filter(m => m.url && m.url.startsWith('https://')).map((media) => (
                  <button
                    key={media.id}
                    onClick={() => insertImage(media.url, media.alt_text || media.title || '')}
                    className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:ring-2 hover:ring-logo-green transition"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={media.url}
                      alt={media.alt_text || ''}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </button>
                ))}
              </div>
              {(!availableMedia || availableMedia.length === 0) && (
                <p className="text-center text-gray-500 py-8 text-sm">
                  Keine Bilder verfügbar. Laden Sie oben ein Foto hoch.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSS for image styles */}
      <style jsx global>{`
        .ProseMirror img[data-style="default"] {
          border-radius: 8px;
          max-width: 100%;
          height: auto;
          margin: 1rem auto;
          display: block;
        }
        .ProseMirror img[data-style="rounded"] {
          border-radius: 16px;
          max-width: 80%;
          height: auto;
          margin: 1rem auto;
          display: block;
        }
        .ProseMirror img[data-style="circle"] {
          border-radius: 50%;
          width: 200px;
          height: 200px;
          object-fit: cover;
          margin: 1rem auto;
          display: block;
        }
        .ProseMirror img[data-style="full"] {
          border-radius: 0;
          width: 100%;
          height: auto;
          margin: 1.5rem 0;
          display: block;
        }
        .ProseMirror img {
          border-radius: 8px;
          max-width: 100%;
          height: auto;
          margin: 1rem auto;
          display: block;
          cursor: pointer;
        }
        .ProseMirror img.ProseMirror-selectednode {
          outline: 3px solid #1e5631;
          outline-offset: 2px;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror h2 { font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem; margin-top: 1.5rem; }
        .ProseMirror h3 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; margin-top: 1rem; }
        .ProseMirror p { margin-bottom: 0.75rem; }
        .ProseMirror ul { list-style: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .ProseMirror ol { list-style: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .ProseMirror blockquote { border-left: 4px solid #d1d5db; padding-left: 1rem; font-style: italic; color: #6b7280; margin-bottom: 0.75rem; }
        .ProseMirror hr { border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
        .ProseMirror a { color: #1e5631; text-decoration: underline; }
      `}</style>
    </div>
  );
}

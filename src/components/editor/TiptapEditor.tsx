"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TiptapEditorProps {
  initialContent?: any;
  initialTitle?: string;
  onUpdate?: (content: any) => void;
  onTitleChange?: (title: string) => void;
}

export function TiptapEditor({ initialContent = '', initialTitle = '', onUpdate, onTitleChange }: TiptapEditorProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Press / for commands or start typing...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate(editor.getJSON());
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-neutral max-w-none focus:outline-none min-h-[400px]',
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && initialContent && editor.getJSON() !== initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [initialContent, editor]);

  if (!isMounted) return null;
  if (!editor) return null;

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-4xl flex items-center gap-1 p-2 bg-neutral-900/50 border border-neutral-800 backdrop-blur sticky top-16 z-20 rounded-xl mb-4 transition-all">
        <button 
          onClick={() => editor.chain().focus().toggleBold().run()} 
          className={`p-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors ${editor.isActive('bold') ? 'bg-neutral-800 text-white' : ''}`}
        >
          <Bold size={16} />
        </button>
        <button 
          onClick={() => editor.chain().focus().toggleItalic().run()} 
          className={`p-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors ${editor.isActive('italic') ? 'bg-neutral-800 text-white' : ''}`}
        >
          <Italic size={16} />
        </button>
        <button 
          onClick={() => editor.chain().focus().toggleStrike().run()} 
          className={`p-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors ${editor.isActive('strike') ? 'bg-neutral-800 text-white' : ''}`}
        >
          <Strikethrough size={16} />
        </button>
        <div className="w-px h-4 bg-neutral-800 mx-1" />
        <button 
          onClick={() => editor.chain().focus().toggleCode().run()} 
          className={`p-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors ${editor.isActive('code') ? 'bg-neutral-800 text-white' : ''}`}
        >
          <Code size={16} />
        </button>
        <button 
          onClick={() => editor.chain().focus().toggleBulletList().run()} 
          className={`p-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors ${editor.isActive('bulletList') ? 'bg-neutral-800 text-white' : ''}`}
        >
          <List size={16} />
        </button>
        <button 
          onClick={() => editor.chain().focus().toggleOrderedList().run()} 
          className={`p-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors ${editor.isActive('orderedList') ? 'bg-neutral-800 text-white' : ''}`}
        >
          <ListOrdered size={16} />
        </button>
        <button 
          onClick={() => editor.chain().focus().toggleBlockquote().run()} 
          className={`p-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors ${editor.isActive('blockquote') ? 'bg-neutral-800 text-white' : ''}`}
        >
          <Quote size={16} />
        </button>
      </div>

      <div className="w-full max-w-4xl px-8 py-12 lg:px-16 lg:py-16">
        <input 
          type="text" 
          value={initialTitle}
          onChange={(e) => onTitleChange?.(e.target.value)}
          placeholder="Untitled Note" 
          className="w-full text-4xl lg:text-5xl font-bold bg-transparent border-none outline-none text-white placeholder-neutral-700 mb-8 tracking-tight"
        />
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

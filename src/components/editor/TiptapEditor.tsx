"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import { FloatingMenu, BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Heading1, Heading2, Heading3 } from 'lucide-react';
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
        class: 'prose prose-invert prose-neutral max-w-none focus:outline-none min-h-[400px] prose-h1:text-4xl prose-h1:font-bold prose-h1:mt-8 prose-h2:text-3xl prose-h2:font-semibold prose-h2:mt-6 prose-p:leading-relaxed prose-p:text-neutral-300 prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-800 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-500/10 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg',
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    // We do not setContent here on every update because Tiptap's internal state handles typing.
    // The component is re-mounted with a new key when switching notes, so initialContent is always fresh.
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
        
        {editor && (
          <FloatingMenu editor={editor} shouldShow={({ state }) => {
            const { $from } = state.selection;
            const currentLineText = $from.parent.textContent;
            return currentLineText === '/';
          }}>
            <div className="flex flex-col p-1 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-56 backdrop-blur-xl">
              <div className="text-[10px] font-semibold text-neutral-500 px-2 py-1.5 uppercase tracking-wider">Basic Blocks</div>
              
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from }).setNode('heading', { level: 1 }).run();
                }}
                className="flex items-center gap-3 px-2 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800/80 rounded-lg transition-colors text-left"
              >
                <div className="p-1.5 bg-neutral-800 rounded border border-neutral-700 text-neutral-400"><Heading1 size={14} /></div>
                <div>
                  <div className="font-medium">Heading 1</div>
                  <div className="text-[10px] text-neutral-500">Big section heading</div>
                </div>
              </button>

              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from }).setNode('heading', { level: 2 }).run();
                }}
                className="flex items-center gap-3 px-2 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800/80 rounded-lg transition-colors text-left"
              >
                <div className="p-1.5 bg-neutral-800 rounded border border-neutral-700 text-neutral-400"><Heading2 size={14} /></div>
                <div>
                  <div className="font-medium">Heading 2</div>
                  <div className="text-[10px] text-neutral-500">Medium section heading</div>
                </div>
              </button>

              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from }).toggleBulletList().run();
                }}
                className="flex items-center gap-3 px-2 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800/80 rounded-lg transition-colors text-left"
              >
                <div className="p-1.5 bg-neutral-800 rounded border border-neutral-700 text-neutral-400"><List size={14} /></div>
                <div>
                  <div className="font-medium">Bulleted List</div>
                  <div className="text-[10px] text-neutral-500">Create a simple bulleted list</div>
                </div>
              </button>
              
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from }).toggleCodeBlock().run();
                }}
                className="flex items-center gap-3 px-2 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800/80 rounded-lg transition-colors text-left"
              >
                <div className="p-1.5 bg-neutral-800 rounded border border-neutral-700 text-neutral-400"><Code size={14} /></div>
                <div>
                  <div className="font-medium">Code Block</div>
                  <div className="text-[10px] text-neutral-500">Capture a code snippet</div>
                </div>
              </button>
            </div>
          </FloatingMenu>
        )}
      </div>
    </div>
  );
}

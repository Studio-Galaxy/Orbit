"use client";

import { Node, mergeAttributes } from '@tiptap/core';
import { useEditor, EditorContent, NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { BubbleMenu as TiptapBubbleMenu, FloatingMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Image } from '@tiptap/extension-image';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Link } from '@tiptap/extension-link';
import { Underline } from '@tiptap/extension-underline';
import { Highlight } from '@tiptap/extension-highlight';
import { Typography } from '@tiptap/extension-typography';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { EditorState } from '@tiptap/pm/state';
import { marked } from 'marked';

import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote,
  Heading1, Heading2, Heading3, Table as TableIcon, Image as ImageIcon,
  CheckSquare, Link as LinkIcon, Underline as UnderlineIcon,
  Type, Eraser, AlignLeft, AlignCenter, AlignRight, Highlighter,
  Plus, Settings, Trash2, PlusCircle, MoreHorizontal,
  Copy, Check, Terminal
} from 'lucide-react';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

const lowlight = createLowlight(common);

const CodeBlockComponent = ({ node, updateAttributes, extension }: any) => {
  const [copied, setCopied] = useState(false);
  const languages = extension.options.lowlight.listLanguages();
  const currentLanguage = node.attrs.language || 'auto';

  const copyToClipboard = () => {
    const text = node.textContent;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <NodeViewWrapper className="notion-code-block my-8">
      <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-900/30">
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-800/50 border-b border-neutral-800 text-neutral-400">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-neutral-500" />
            <select
              value={currentLanguage}
              onChange={event => updateAttributes({ language: event.target.value })}
              className="bg-transparent border-none outline-none text-xs font-medium cursor-pointer hover:text-neutral-200 transition-colors capitalize"
            >
              <option value="auto">Plain Text</option>
              {languages.map((lang: string) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-700/50 transition-all text-[11px] font-medium"
          >
            {copied ? (
              <>
                <Check size={12} className="text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <div className="relative">
          <pre className="p-6 overflow-x-auto font-mono text-sm leading-relaxed scrollbar-thin scrollbar-thumb-neutral-800">
            <code className={`hljs language-${currentLanguage}`}>
              <NodeViewContent />
            </code>
          </pre>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

const CustomCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent);
  },
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        if (editor.isActive('codeBlock')) {
          return editor.commands.insertContent('  ');
        }
        return false;
      },
      '(': ({ editor }) => {
        if (editor.isActive('codeBlock')) {
          editor.commands.insertContent('()');
          return editor.commands.setTextSelection(editor.state.selection.from - 1);
        }
        return false;
      },
      '{': ({ editor }) => {
        if (editor.isActive('codeBlock')) {
          editor.commands.insertContent('{}');
          return editor.commands.setTextSelection(editor.state.selection.from - 1);
        }
        return false;
      },
      '[': ({ editor }) => {
        if (editor.isActive('codeBlock')) {
          editor.commands.insertContent('[]');
          return editor.commands.setTextSelection(editor.state.selection.from - 1);
        }
        return false;
      },
      '"': ({ editor }) => {
        if (editor.isActive('codeBlock')) {
          editor.commands.insertContent('""');
          return editor.commands.setTextSelection(editor.state.selection.from - 1);
        }
        return false;
      },
      "'": ({ editor }) => {
        if (editor.isActive('codeBlock')) {
          editor.commands.insertContent("''");
          return editor.commands.setTextSelection(editor.state.selection.from - 1);
        }
        return false;
      },
      'Mod-a': ({ editor }) => {
        if (editor.isActive('codeBlock')) {
          const { state } = editor;
          const { selection } = state;
          const { $from } = selection;

          // Select from start of code block to end of code block
          return editor.commands.setTextSelection({
            from: $from.start(),
            to: $from.end(),
          });
        }
        return false;
      },
    };
  },
});

const Mathematics = Node.create({
  name: 'mathematics',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'span[data-type="mathematics"]' },
      { tag: 'span.math' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'mathematics' }), `$${HTMLAttributes.latex}$`];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span');
      dom.classList.add('tiptap-mathematics');
      const content = node.attrs.latex || '';
      try {
        katex.render(content, dom, { throwOnError: false, displayMode: false });
      } catch (e) {
        dom.textContent = content;
      }
      return { dom };
    };
  },
});

interface TiptapEditorProps {
  initialContent?: any;
  initialTitle?: string;
  onUpdate?: (content: any) => void;
  onTitleChange?: (title: string) => void;
}

export function TiptapEditor({ initialContent = '', initialTitle = '', onUpdate, onTitleChange }: TiptapEditorProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const isDismissed = useRef(false);
  const supabase = createClient();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Use CodeBlockLowlight instead
      }),
      Placeholder.configure({
        placeholder: 'Press / for commands or start typing...',
        emptyEditorClass: 'is-editor-empty',
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-xl border border-neutral-800 shadow-2xl max-w-full my-8',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'notion-task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'notion-task-item',
        },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-indigo-400 underline underline-offset-4 decoration-indigo-400/30 hover:decoration-indigo-400 transition-all cursor-pointer',
        },
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      Typography,
      CustomCodeBlock.configure({
        lowlight,
      }),
      Mathematics,
    ],
    content: (() => {
      if (!initialContent) {
        return {
          type: 'doc',
          content: [{ type: 'paragraph' }, { type: 'paragraph' }, { type: 'paragraph' }],
        };
      }
      if (typeof initialContent === 'string') {
        const html = marked.parse(initialContent);
        // Ensure it's a string and handle math
        const finalHtml = typeof html === 'string' ?
          html.replace(/\$([^\$]+)\$/g, '<span data-type="mathematics" latex="$1"></span>') :
          html;
        return finalHtml;
      }
      return initialContent;
    })(),
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate(editor.getJSON());
      }
      const { selection } = editor.state;
      const { $from } = selection;
      const currentLineText = $from.parent.textContent;
      if (currentLineText.startsWith('/')) {
        setCommandQuery(currentLineText.slice(1).toLowerCase());
        if (!isDismissed.current) {
          setShowSlashMenu(true);
        }
      } else {
        setShowSlashMenu(false);
        isDismissed.current = false;
      }
    },
    onSelectionUpdate: ({ editor }) => {
      const { selection } = editor.state;
      const { $from } = selection;
      const currentLineText = $from.parent.textContent;
      if (currentLineText.startsWith('/')) {
        setCommandQuery(currentLineText.slice(1).toLowerCase());
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-neutral max-w-none focus:outline-none min-h-[500px] prose-h1:text-4xl prose-h1:font-bold prose-h1:mt-12 prose-h1:mb-6 prose-h2:text-3xl prose-h2:font-semibold prose-h2:mt-10 prose-h2:mb-4 prose-p:leading-relaxed prose-p:text-neutral-300 prose-p:text-lg prose-pre:bg-transparent prose-pre:p-0 prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-500/5 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-2xl prose-img:rounded-2xl',
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        for (const item of items) {
          if (item.type.indexOf('image') === 0) {
            const file = item.getAsFile();
            if (file) {
              uploadImage(file);
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.indexOf('image') === 0) {
            uploadImage(file);
            return true;
          }
        }
        return false;
      },
    },
    immediatelyRender: false,
  });

  const uploadImage = async (file: File) => {
    try {
      toast.loading("Uploading image...", { id: "img-upload" });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `note-assets/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vault_files') // Using existing bucket for now, or ensure note_assets exists
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vault_files')
        .getPublicUrl(filePath);

      editor?.chain().focus().setImage({ src: publicUrl }).run();
      toast.success("Image uploaded!", { id: "img-upload" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload image", { id: "img-upload" });
    }
  };

  const runCommand = (command: () => void, query: string) => {
    if (!editor) return;
    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;

    const from = $from.pos - query.length - 1;
    const to = $from.pos;

    editor.chain()
      .focus()
      .deleteRange({ from, to })
      .run();

    command();
    setCommandQuery('');
    setSelectedIndex(0);
  };

  const commandItems = [
    { title: 'Heading 1', subtitle: 'Big section heading', icon: <Heading1 size={16} />, command: () => runCommand(() => editor?.chain().focus().setNode('heading', { level: 1 }).run(), commandQuery) },
    { title: 'Heading 2', subtitle: 'Medium section heading', icon: <Heading2 size={16} />, command: () => runCommand(() => editor?.chain().focus().setNode('heading', { level: 2 }).run(), commandQuery) },
    { title: 'Bulleted List', subtitle: 'Simple bulleted list', icon: <List size={16} />, command: () => runCommand(() => editor?.chain().focus().toggleBulletList().run(), commandQuery) },
    { title: 'Check List', subtitle: 'Study task list', icon: <CheckSquare size={16} />, command: () => runCommand(() => editor?.chain().focus().toggleTaskList().run(), commandQuery) },
    { title: 'Code Block', subtitle: 'Syntax highlighted code', icon: <Code size={16} />, command: () => runCommand(() => editor?.chain().focus().toggleCodeBlock().run(), commandQuery) },
    { title: 'Table', subtitle: 'Insert a data table', icon: <TableIcon size={16} />, command: () => runCommand(() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), commandQuery) },
    {
      title: 'Image', subtitle: 'Upload or paste an image', icon: <ImageIcon size={16} />, command: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            runCommand(() => uploadImage(file), commandQuery);
          }
        };
        input.click();
      }
    },
    { title: 'Quote', subtitle: 'Capture a citation', icon: <Quote size={16} />, command: () => runCommand(() => editor?.chain().focus().toggleBlockquote().run(), commandQuery) },
  ];

  const filteredItems = commandItems.filter(item =>
    item.title.toLowerCase().includes(commandQuery.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editor) return;
      const { selection } = editor.state;
      const isSlash = selection.$from.parent.textContent.startsWith('/');

      if (isSlash && filteredItems.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopImmediatePropagation();
          setSelectedIndex(prev => (prev + 1) % filteredItems.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopImmediatePropagation();
          setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          e.stopImmediatePropagation();
          filteredItems[selectedIndex]?.command();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopImmediatePropagation();
          setShowSlashMenu(false);
          isDismissed.current = true;
          setCommandQuery('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [editor, filteredItems, selectedIndex, commandQuery]);

  if (!isMounted || !editor) return null;

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Toolbar - Premium Glassmorphism */}
      <div className="w-full max-w-4xl flex items-center gap-1 p-1.5 bg-neutral-900/60 border border-neutral-800/50 backdrop-blur-xl sticky top-4 z-30 rounded-2xl mb-8 shadow-2xl transition-all">
        <div className="flex items-center gap-0.5 px-2 mr-2 border-r border-neutral-800/50">
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all ${editor.isActive('bold') ? 'bg-indigo-500/10 text-indigo-400' : ''}`} title="Bold"><Bold size={16} /></button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all ${editor.isActive('italic') ? 'bg-indigo-500/10 text-indigo-400' : ''}`} title="Italic"><Italic size={16} /></button>
          <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all ${editor.isActive('underline') ? 'bg-indigo-500/10 text-indigo-400' : ''}`} title="Underline"><UnderlineIcon size={16} /></button>
          <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`p-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all ${editor.isActive('strike') ? 'bg-indigo-500/10 text-indigo-400' : ''}`} title="Strikethrough"><Strikethrough size={16} /></button>
        </div>

        <div className="flex items-center gap-0.5 px-2 mr-2 border-r border-neutral-800/50">
          <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all ${editor.isActive('bulletList') ? 'bg-indigo-500/10 text-indigo-400' : ''}`} title="Bullet List"><List size={16} /></button>
          <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all ${editor.isActive('orderedList') ? 'bg-indigo-500/10 text-indigo-400' : ''}`} title="Ordered List"><ListOrdered size={16} /></button>
          <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={`p-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all ${editor.isActive('taskList') ? 'bg-indigo-500/10 text-indigo-400' : ''}`} title="Task List"><CheckSquare size={16} /></button>
        </div>

        <div className="flex items-center gap-0.5 px-2 mr-2 border-r border-neutral-800/50">
          <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`p-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all ${editor.isActive('codeBlock') ? 'bg-indigo-500/10 text-indigo-400' : ''}`} title="Code Block"><Code size={16} /></button>
          <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={`p-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all ${editor.isActive('table') ? 'bg-indigo-500/10 text-indigo-400' : ''}`} title="Insert Table"><TableIcon size={16} /></button>
          <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={`p-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all ${editor.isActive('highlight') ? 'bg-indigo-500/10 text-indigo-400' : ''}`} title="Highlight"><Highlighter size={16} /></button>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 px-2">
          <div className="text-[10px] text-neutral-500 font-mono hidden sm:block">
            {editor.storage.characterCount?.words?.() || 0} words
          </div>
          <button className="p-2 rounded-lg text-neutral-500 hover:text-white transition-colors"><Settings size={16} /></button>
        </div>
      </div>

      <div className="w-full max-w-4xl px-8 py-4 lg:px-16 lg:py-8 min-h-screen">
        <input
          type="text"
          value={initialTitle}
          onChange={(e) => onTitleChange?.(e.target.value)}
          placeholder="Untitled Note"
          className="w-full text-3xl lg:text-5xl font-bold bg-transparent border-none outline-none text-white placeholder-neutral-800 mb-8 tracking-tighter"
        />

        <EditorContent editor={editor} />

        {/* Floating AI Command Menu / Slash Menu */}
        <FloatingMenu
          editor={editor}
          shouldShow={({ state }) => {
            const { selection } = state;
            const { $from } = selection;
            const currentLineText = $from.parent.textContent;

            // Show menu if line starts with / regardless of whether it's empty
            return currentLineText.startsWith('/');
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="flex flex-col p-1.5 bg-neutral-900/90 border border-neutral-800 rounded-2xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] w-72 backdrop-blur-2xl z-50 overflow-hidden"
          >
            <div className="text-[10px] font-bold text-neutral-500 px-3 py-2 uppercase tracking-widest flex items-center justify-between">
              <span>Basic Blocks</span>
              <span className="bg-neutral-800 px-1.5 py-0.5 rounded text-[8px]">{filteredItems.length} results</span>
            </div>

            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {filteredItems.map((item, index) => (
                <button
                  key={index}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    item.command();
                  }}
                  className={`flex items-center gap-3 w-full px-2.5 py-2 text-sm rounded-xl transition-all text-left group ${selectedIndex === index ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'}`}
                >
                  <div className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all ${selectedIndex === index ? 'bg-indigo-500 text-white border-indigo-400 shadow-[0_0_15px_-3px_rgba(99,102,241,0.5)]' : 'bg-neutral-800 border-neutral-700 text-neutral-500 group-hover:border-neutral-600 group-hover:text-neutral-300'}`}>
                    {item.icon}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="font-medium leading-tight">{item.title}</div>
                    <div className="text-[10px] text-neutral-500 group-hover:text-neutral-400 leading-tight">{item.subtitle}</div>
                  </div>
                </button>
              ))}
              {filteredItems.length === 0 && (
                <div className="p-4 text-xs text-neutral-500 text-center">No results found</div>
              )}
            </div>
          </motion.div>
        </FloatingMenu>

        {/* Bubble Menu - Formatting on Select */}
        <TiptapBubbleMenu
          editor={editor}
          className="flex items-center gap-0.5 p-1 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl backdrop-blur-xl"
        >
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all ${editor.isActive('bold') ? 'text-indigo-400 bg-indigo-500/10' : ''}`}><Bold size={14} /></button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all ${editor.isActive('italic') ? 'text-indigo-400 bg-indigo-500/10' : ''}`}><Italic size={14} /></button>
          <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-1.5 rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all ${editor.isActive('underline') ? 'text-indigo-400 bg-indigo-500/10' : ''}`}><UnderlineIcon size={14} /></button>
          <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`p-1.5 rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all ${editor.isActive('strike') ? 'text-indigo-400 bg-indigo-500/10' : ''}`}><Strikethrough size={14} /></button>
          <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={`p-1.5 rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all ${editor.isActive('highlight') ? 'text-indigo-400 bg-indigo-500/10' : ''}`}><Highlighter size={14} /></button>
          <div className="w-px h-4 bg-neutral-800 mx-1" />
          <button onClick={() => {
            const url = window.prompt('URL');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }} className={`p-1.5 rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all ${editor.isActive('link') ? 'text-indigo-400 bg-indigo-500/10' : ''}`}><LinkIcon size={14} /></button>
        </TiptapBubbleMenu>

        {/* Table Controls (Simplified) */}
        {editor.isActive('table') && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl z-40 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-[10px] font-bold text-neutral-500 px-2 uppercase tracking-widest border-r border-neutral-800 mr-1">Table Controls</div>
            <button onClick={() => editor.chain().focus().addColumnBefore().run()} className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-all" title="Add Column Before"><PlusCircle size={14} className="rotate-90" /></button>
            <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-all" title="Add Column After"><PlusCircle size={14} className="-rotate-90" /></button>
            <div className="w-px h-4 bg-neutral-800 mx-1" />
            <button onClick={() => editor.chain().focus().addRowBefore().run()} className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-all" title="Add Row Before"><PlusCircle size={14} /></button>
            <button onClick={() => editor.chain().focus().addRowAfter().run()} className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-all" title="Add Row After"><PlusCircle size={14} className="rotate-180" /></button>
            <div className="w-px h-4 bg-neutral-800 mx-1" />
            <button onClick={() => editor.chain().focus().deleteTable().run()} className="p-2 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded-lg transition-all" title="Delete Table"><Trash2 size={14} /></button>
          </div>
        )}
      </div>
    </div>
  );
}


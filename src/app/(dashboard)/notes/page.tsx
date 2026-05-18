"use client";

import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { motion } from "framer-motion";
import { FileText, Sparkles, Folder, ArchiveX } from "lucide-react";

export default function NotesPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      {/* Notes Sidebar */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-64 border-r border-neutral-900 bg-black/50 p-4 hidden lg:flex flex-col h-full overscroll-contain overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-neutral-400">Folders</h3>
          <button className="text-neutral-500 hover:text-white transition-colors">
            <Folder size={14} />
          </button>
        </div>
        
        <div className="space-y-1 mb-8">
          <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-white bg-neutral-900/50 rounded-md">
            <Folder size={14} className="text-neutral-500" /> All Notes
          </button>
          <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-neutral-400 hover:text-white hover:bg-neutral-900/30 rounded-md transition-colors">
            <Folder size={14} className="text-neutral-500" /> Calculus
          </button>
          <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-neutral-400 hover:text-white hover:bg-neutral-900/30 rounded-md transition-colors">
            <Folder size={14} className="text-neutral-500" /> Machine Learning
          </button>
          <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-neutral-400 hover:text-white hover:bg-neutral-900/30 rounded-md transition-colors">
            <ArchiveX size={14} className="text-neutral-500" /> Trash
          </button>
        </div>

        <div className="flex items-center justify-between mb-4 mt-auto border-t border-neutral-900 pt-4">
          <h3 className="text-sm font-medium text-neutral-400">AI Actions</h3>
        </div>
        <div className="space-y-2">
          <button className="w-full flex items-center gap-2 p-2 px-3 text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/20 transition-colors">
            <Sparkles size={14} /> Flashcards
          </button>
          <button className="w-full flex items-center gap-2 p-2 px-3 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/20 transition-colors">
            <Sparkles size={14} /> Summarize
          </button>
        </div>
      </motion.div>

      {/* Editor Area */}
      <div className="flex-1 w-full flex flex-col h-full bg-black overflow-y-auto relative p-6">
        <TiptapEditor />
      </div>
    </div>
  );
}

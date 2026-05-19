"use client";

import { useState, useEffect, useCallback } from "react";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Sparkles, Folder, ArchiveX, X, Plus, Clock, Loader2, Trash2, PanelLeftClose, PanelLeft, Menu } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

export default function NotesPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeFolder, setActiveFolder] = useState("All Notes");
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiActionTitle, setAiActionTitle] = useState("");
  
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeNoteContent, setActiveNoteContent] = useState<any>("");
  const [activeNoteTitle, setActiveNoteTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          loadNotes(data.user.id);
        } else {
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Auth fetch error:", err);
        setIsLoading(false);
      });
  }, []);

  async function loadNotes(userId: string) {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error("Error loading notes:", error.message);
      toast.error("Failed to load notes. Please ensure the database tables are created.");
    } else if (data) {
      setNotes(data);
      if (data.length > 0 && !activeNoteId) {
        setActiveNote(data[0]);
      }
    }
    setIsLoading(false);
  }

  const setActiveNote = (note: any) => {
    setActiveNoteId(note.id);
    setActiveNoteTitle(note.title);
    
    let parsedContent = note.content;
    if (typeof parsedContent === 'string' && parsedContent.startsWith('{')) {
      try {
        parsedContent = JSON.parse(parsedContent);
      } catch (e) {
        // failed to parse, use as-is
      }
    }
    setActiveNoteContent(parsedContent);
  };

  const handleCreateNote = async () => {
    if (!user) {
      toast.error("You must be logged in to create a note.");
      return;
    }
    setIsSaving(true);
    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title: 'Untitled Note',
        content: ''
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error creating note:", error.message);
      toast.error("Failed to create note.");
    } else if (data) {
      setNotes([data, ...notes]);
      setActiveNote(data);
    }
    setIsSaving(false);
  };

  const debouncedSave = useCallback(
    async (id: string, title: string, content: any) => {
      if (!user) return;
      setIsSaving(true);
      const { error } = await supabase
        .from('notes')
        .update({ title, content, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) {
        console.error("Error saving note:", error.message);
        toast.error("Failed to save note.");
      } else {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, title, content } : n));
      }
      setIsSaving(false);
    },
    [user]
  );

  const confirmDeleteNote = (id: string) => {
    setNoteToDelete(id);
  };

  const executeDeleteNote = async () => {
    if (!user || !noteToDelete) return;
    
    setIsSaving(true);
    const { error } = await supabase.from('notes').delete().eq('id', noteToDelete);
    
    if (error) {
      console.error("Error deleting note:", error.message);
      toast.error("Failed to delete note.");
    } else {
      toast.success("Note deleted.");
      const updatedNotes = notes.filter(n => n.id !== noteToDelete);
      setNotes(updatedNotes);
      if (activeNoteId === noteToDelete) {
        if (updatedNotes.length > 0) {
          setActiveNote(updatedNotes[0]);
        } else {
          setActiveNoteId(null);
          setActiveNoteTitle("");
          setActiveNoteContent("");
        }
      }
    }
    setNoteToDelete(null);
    setIsSaving(false);
  };

  const handleTitleChange = (title: string) => {
    setActiveNoteTitle(title);
    if (activeNoteId) {
      debouncedSave(activeNoteId, title, activeNoteContent);
    }
  };

  const handleContentChange = (content: any) => {
    setActiveNoteContent(content);
    if (activeNoteId) {
      debouncedSave(activeNoteId, activeNoteTitle, content);
    }
  };

  const handleAiAction = (action: string) => {
    setAiActionTitle(action);
    setIsAiModalOpen(true);
    setTimeout(() => {
      toast.success(`${action} generation complete!`);
    }, 2000);
  };
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden">
      {/* Notes Sidebar */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="border-r border-neutral-900 bg-black/50 hidden lg:flex flex-col h-full overscroll-contain overflow-y-auto shrink-0"
          >
            <div className="p-4 flex flex-col h-full min-w-[256px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-neutral-400">Folders</h3>
                <button className="text-neutral-500 hover:text-white transition-colors">
                  <Folder size={14} />
                </button>
              </div>
              
              <div className="flex items-center justify-between mb-4 mt-auto border-t border-neutral-900 pt-4">
                <h3 className="text-sm font-medium text-neutral-400">Your Notes</h3>
                <button onClick={handleCreateNote} className="text-neutral-500 hover:text-white transition-colors">
                  <Plus size={14} />
                </button>
              </div>
              
              <div className="space-y-1 mb-8 overflow-y-auto flex-1">
                {isLoading ? (
                  <div className="flex justify-center p-4"><Loader2 size={16} className="animate-spin text-neutral-500" /></div>
                ) : notes.length === 0 ? (
                  <div className="text-xs text-neutral-500 text-center py-4">No notes yet</div>
                ) : notes.map(note => (
                  <button 
                    key={note.id}
                    onClick={() => setActiveNote(note)}
                    className={`w-full flex flex-col items-start px-3 py-2 text-sm rounded-md transition-colors text-left ${
                      activeNoteId === note.id 
                        ? "bg-neutral-900/80 border border-neutral-800" 
                        : "hover:bg-neutral-900/30 border border-transparent"
                    }`}
                  >
                    <div className={`font-medium truncate w-full ${activeNoteId === note.id ? "text-white" : "text-neutral-300"}`}>
                      {note.title || "Untitled Note"}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-neutral-500 mt-1">
                      <Clock size={10} />
                      {new Date(note.updated_at || note.created_at).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mb-4 border-t border-neutral-900 pt-4">
                <h3 className="text-sm font-medium text-neutral-400">AI Actions</h3>
              </div>
              <div className="space-y-2">
                <button 
                  onClick={() => handleAiAction("Flashcards")}
                  className="w-full flex items-center gap-2 p-2 px-3 text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/20 transition-colors"
                >
                  <Sparkles size={14} /> Generate Flashcards
                </button>
                <button 
                  onClick={() => handleAiAction("Summary")}
                  className="w-full flex items-center gap-2 p-2 px-3 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/20 transition-colors"
                >
                  <Sparkles size={14} /> Summarize Note
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor Area */}
      <div className="flex-1 w-full flex flex-col h-full bg-black overflow-y-auto relative p-6 min-w-0">
        <div className="absolute top-4 left-6 z-10 hidden lg:block">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-900 rounded-lg transition-colors flex items-center justify-center border border-transparent hover:border-neutral-800"
            title="Toggle Sidebar"
          >
            {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
          </button>
        </div>
        <div className="absolute top-4 right-8 z-10 flex items-center gap-4 text-xs text-neutral-500">
          {activeNoteId && (
            <button 
              onClick={() => confirmDeleteNote(activeNoteId)}
              className="text-neutral-500 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <Trash2 size={12} />
              Delete
            </button>
          )}
          <div className="flex items-center gap-2">
            {isSaving ? <><Loader2 size={12} className="animate-spin" /> Saving...</> : "Saved to cloud"}
          </div>
        </div>
        {activeNoteId ? (
          <div className="mt-8 lg:mt-0 flex-1 flex flex-col items-center">
            <TiptapEditor 
              key={activeNoteId}
              initialContent={activeNoteContent} 
              initialTitle={activeNoteTitle}
              onTitleChange={handleTitleChange}
              onUpdate={handleContentChange}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 h-full">
            <FileText size={48} className="mb-4 opacity-20" />
            <p>Select a note or create a new one to start writing</p>
          </div>
        )}
      </div>

      {/* AI Processing Modal */}
      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsAiModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              
              <button 
                onClick={() => setIsAiModalOpen(false)}
                className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="w-16 h-16 rounded-full bg-neutral-800/50 flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 border-2 border-neutral-700 rounded-full border-t-indigo-500 animate-spin" />
                <Sparkles size={24} className="text-white animate-pulse" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Generating {aiActionTitle}...</h3>
              <p className="text-sm text-neutral-400 mb-6">
                Our AI models are analyzing your notes to extract the most important concepts. This usually takes a few seconds.
              </p>
              
              <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2, ease: "linear" }}
                  className="h-full bg-indigo-500"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {noteToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setNoteToDelete(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center overflow-hidden"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-red-500">
                <Trash2 size={24} />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Delete Note?</h3>
              <p className="text-sm text-neutral-400 mb-6">
                Are you sure you want to delete this note? This action cannot be undone.
              </p>
              
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setNoteToDelete(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-neutral-700 text-sm font-medium hover:bg-neutral-800 transition-colors text-white"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeDeleteNote}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

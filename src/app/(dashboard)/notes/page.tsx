"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Sparkles, Folder, ArchiveX, X, Plus, Clock, 
  Loader2, Trash2, LayoutGrid, List, ArrowLeft, Save, 
  Search, MoreHorizontal, ChevronRight, Calendar
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useSearchParams, useRouter } from "next/navigation";

function NotesPageInternal() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiActionTitle, setAiActionTitle] = useState("");
  const [aiResult, setAiResult] = useState<any>(null);
  
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeNoteContent, setActiveNoteContent] = useState<any>("");
  const [activeNoteTitle, setActiveNoteTitle] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const noteIdFromUrl = searchParams.get('id');
  
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

  useEffect(() => {
    if (noteIdFromUrl && notes.length > 0) {
      const note = notes.find(n => n.id === noteIdFromUrl);
      if (note) setActiveNote(note);
    }
  }, [noteIdFromUrl, notes]);

  async function loadNotes(userId: string) {
    setIsLoading(true);
    const { data: nData, error: nError } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (nError) {
      console.error("Error loading notes:", nError.message);
      toast.error("Failed to load notes.");
    } else if (nData) {
      setNotes(nData);
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
        // failed to parse
      }
    }
    setActiveNoteContent(parsedContent);
  };

  const handleCreateNote = async () => {
    if (!user) return toast.error("You must be logged in.");
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
      toast.error("Failed to create note.");
    } else if (data) {
      setNotes([data, ...notes]);
      setActiveNote(data);
    }
    setIsSaving(false);
  };

  const debouncedSaveRaw = useCallback(
    async (id: string, title: string, content: any) => {
      if (!user) return;
      const { error } = await supabase
        .from('notes')
        .update({ title, content, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (!error) {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, title, content } : n));
        setIsSaving(false);
      }
    },
    [user]
  );

  const debouncedSaveRef = useRef<any>(null);
  
  useEffect(() => {
    import('lodash.debounce').then((debounce) => {
      debouncedSaveRef.current = debounce.default(debouncedSaveRaw, 1000);
    });
    return () => {
      debouncedSaveRef.current?.cancel();
    };
  }, [debouncedSaveRaw]);

  const debouncedSave = (id: string, title: string, content: any) => {
    if (debouncedSaveRef.current) {
      setIsSaving(true);
      debouncedSaveRef.current(id, title, content);
    }
  };

  const executeDeleteNote = async () => {
    if (!user || !noteToDelete) return;
    setIsSaving(true);
    const { error } = await supabase.from('notes').delete().eq('id', noteToDelete);
    
    if (error) {
      toast.error("Failed to delete note.");
    } else {
      toast.success("Note purged from Library.");
      const updatedNotes = notes.filter(n => n.id !== noteToDelete);
      setNotes(updatedNotes);
      if (activeNoteId === noteToDelete) {
        setActiveNoteId(null);
      }
    }
    setNoteToDelete(null);
    setIsSaving(false);
  };

  const handleTitleChange = (title: string) => {
    setActiveNoteTitle(title);
    if (activeNoteId) debouncedSave(activeNoteId, title, activeNoteContent);
  };

  const handleContentChange = (content: any) => {
    setActiveNoteContent(content);
    if (activeNoteId) debouncedSave(activeNoteId, activeNoteTitle, content);
  };

  const handleAiAction = async (action: string) => {
    if (!activeNoteId || !activeNoteContent) return toast.error("Select a note with content.");
    setAiActionTitle(action);
    setIsAiModalOpen(true);
    setAiResult(null);

    const textToAnalyze = typeof activeNoteContent === 'string' ? activeNoteContent : JSON.stringify(activeNoteContent);

    try {
      const res = await fetch("/api/notes/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToAnalyze })
      });
      const data = await res.json();
      if (res.ok) setAiResult(data);
      else {
        toast.error(data.error || "AI failed.");
        setIsAiModalOpen(false);
      }
    } catch (e) {
      toast.error("An error occurred.");
      setIsAiModalOpen(false);
    }
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full w-full bg-black flex flex-col overflow-hidden relative">
      {/* Header Pattern - Vault Inspired */}
      {!activeNoteId && (
        <div className="pt-12 px-8 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-5xl font-black text-white tracking-tighter flex items-center gap-4">
              Library
            </h1>
            <p className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.3em] pl-1">Personal Knowledge Base</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-indigo-500 transition-colors" size={14} />
              <input 
                type="text" 
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-neutral-900/50 border border-neutral-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-neutral-700 focus:ring-1 focus:ring-white/5 transition-all w-64"
              />
            </div>
            
            <div className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-2xl p-1 flex items-center gap-1">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-neutral-800 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}>
                <LayoutGrid size={18} />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-neutral-800 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}>
                <List size={18} />
              </button>
            </div>

            <button onClick={handleCreateNote} className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-neutral-200 text-black rounded-2xl text-xs font-black transition-all cursor-pointer shadow-xl active:scale-95 uppercase tracking-widest">
              <Plus size={16} strokeWidth={3} /> NEW NOTE
            </button>
          </div>
        </div>
      )}

      {/* Focused View Header */}
      {activeNoteId && (
        <div className="h-20 flex items-center justify-between px-8 bg-black/40 backdrop-blur-3xl border-b border-neutral-900/50 z-50">
          <button 
            onClick={() => setActiveNoteId(null)}
            className="flex items-center gap-2 text-neutral-500 hover:text-white transition-all text-[11px] font-black uppercase tracking-widest group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Library
          </button>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-neutral-900/50 py-1.5 px-3 rounded-full border border-neutral-800">
                <div className={`w-1.5 h-1.5 rounded-full ${isSaving ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{isSaving ? 'Syncing...' : 'Saved'}</span>
             </div>
             <button onClick={() => handleAiAction("Summary")} className="p-2.5 bg-neutral-900/50 text-neutral-400 hover:text-emerald-400 border border-neutral-800 rounded-xl transition-all"><Sparkles size={16} /></button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {!activeNoteId ? (
            <motion.div 
              key="library"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full w-full px-8 pb-12 overflow-y-auto no-scrollbar"
            >
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="animate-spin text-neutral-800" size={48} />
                </div>
              ) : notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-12 border-2 border-dashed border-neutral-900 rounded-[3rem] bg-neutral-950/20">
                  <FileText className="text-neutral-800 mb-6" size={64} />
                  <h2 className="text-xl font-bold text-white mb-2">Library is empty</h2>
                  <p className="text-neutral-500 max-w-xs mb-8">Start your knowledge base by creating your first note.</p>
                  <button onClick={handleCreateNote} className="px-8 py-3 bg-white text-black rounded-2xl text-xs font-black hover:scale-105 transition-all shadow-2xl uppercase tracking-widest">Create New Note</button>
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-12">
                   <div className="w-20 h-20 bg-neutral-900 rounded-3xl flex items-center justify-center mb-6 border border-neutral-800 shadow-2xl">
                      <Search size={32} className="text-neutral-600" />
                   </div>
                   <h2 className="text-xl font-bold text-white mb-2">No matches found</h2>
                   <p className="text-neutral-500 text-sm max-w-xs mb-8 font-medium italic">"{searchQuery}" doesn't exist in your library.</p>
                   <button onClick={() => setSearchQuery("")} className="text-indigo-400 text-xs font-black uppercase tracking-widest hover:text-indigo-300 transition-colors">Clear Search</button>
                </div>
              ) : (
                <div className={`mt-4 ${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6' : 'flex flex-col gap-3'}`}>
                  {filteredNotes.map((note) => {
                    const updatedAt = new Date(note.updated_at || note.created_at);
                    if (viewMode === 'list') {
                      return (
                        <motion.div 
                          layout
                          key={note.id}
                          onClick={() => setActiveNote(note)}
                          className="flex items-center gap-6 p-4 rounded-3xl bg-neutral-900/20 border border-neutral-900 hover:bg-neutral-900/40 hover:border-neutral-800 transition-all cursor-pointer group"
                        >
                          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <FileText size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-white mb-0.5 truncate">{note.title || "Untitled Note"}</div>
                            <div className="flex items-center gap-3 text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                               <span className="flex items-center gap-1"><Calendar size={10} /> {updatedAt.toLocaleDateString()}</span>
                               <span className="flex items-center gap-1"><Clock size={10} /> {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setNoteToDelete(note.id); }}
                            className="p-2.5 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 transition-all rounded-xl opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </motion.div>
                      );
                    }
                    return (
                      <motion.div 
                        layout
                        key={note.id}
                        onClick={() => setActiveNote(note)}
                        className="group relative h-64 bg-neutral-900/20 border border-neutral-900 rounded-[2.5rem] p-8 flex flex-col hover:bg-neutral-900/40 hover:border-neutral-800 transition-all cursor-pointer overflow-hidden shadow-sm"
                      >
                         <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform group-hover:bg-indigo-500 group-hover:text-white shadow-xl">
                            <FileText size={20} />
                         </div>
                         <h3 className="text-lg font-bold text-white mb-2 leading-tight line-clamp-2">{note.title || "Untitled Note"}</h3>
                         <div className="mt-auto flex items-center justify-between">
                            <div className="flex flex-col">
                               <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-0.5">Last Sync</span>
                               <span className="text-[10px] font-bold text-neutral-400">{updatedAt.toLocaleDateString()}</span>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setNoteToDelete(note.id); }}
                              className="p-2 text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                               <Trash2 size={14} />
                            </button>
                         </div>
                         <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                            <FileText size={120} className="-rotate-12 translate-x-8 -translate-y-8" />
                         </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="editor"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full w-full overflow-y-auto p-4 md:p-8 lg:p-12 scrollbar-none"
            >
              <div className="max-w-5xl mx-auto">
                <TiptapEditor 
                  key={activeNoteId}
                  initialContent={activeNoteContent} 
                  initialTitle={activeNoteTitle}
                  onTitleChange={handleTitleChange}
                  onUpdate={handleContentChange}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Global AI Dialog Pattern */}
      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setIsAiModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="p-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic">{aiActionTitle}</h3>
                  <button onClick={() => setIsAiModalOpen(false)} className="text-neutral-500 hover:text-white p-2">
                    <X size={28} />
                  </button>
                </div>
                
                <div className="min-h-[400px] max-h-[70vh] overflow-y-auto no-scrollbar pb-6">
                  {!aiResult ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center gap-8">
                      <div className="w-20 h-20 rounded-full bg-neutral-800/50 flex items-center justify-center relative">
                        <div className="absolute inset-0 border-2 border-neutral-700 rounded-full border-t-indigo-500 animate-spin" />
                        <Sparkles size={32} className="text-white animate-pulse" />
                      </div>
                      <p className="text-neutral-500 text-sm font-black uppercase tracking-widest">Connecting to Orbit Intelligence...</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {aiActionTitle === "Summary" && (
                        <div className="p-10 bg-neutral-950 border border-neutral-800 rounded-[3rem] prose prose-invert prose-indigo max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                            {aiResult.summary}
                          </ReactMarkdown>
                        </div>
                      )}
                      {aiActionTitle === "Flashcards" && aiResult.flashcards && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {aiResult.flashcards.map((fc: any, i: number) => (
                            <div key={i} className="p-6 bg-neutral-950 border border-neutral-800 rounded-3xl group">
                              <div className="text-[10px] font-black text-neutral-700 uppercase tracking-widest mb-4">Card {i+1}</div>
                              <div className="text-white font-bold text-sm mb-4">
                                <ReactMarkdown remarkPlugins={[remarkMath]}>{fc.question}</ReactMarkdown>
                              </div>
                              <div className="pt-4 border-t border-neutral-900 text-neutral-400 text-sm">
                                <ReactMarkdown remarkPlugins={[remarkMath]}>{fc.answer}</ReactMarkdown>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {noteToDelete && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setNoteToDelete(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-neutral-900 border border-neutral-800 p-12 rounded-[2.5rem] max-w-md w-full text-center shadow-2xl">
              <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                <Trash2 size={32} />
              </div>
              <h3 className="text-2xl font-black text-white mb-3 tracking-tighter uppercase">Purge Note?</h3>
              <p className="text-neutral-500 text-sm mb-10 leading-relaxed font-medium">This knowledge will be permanently removed from your library.</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setNoteToDelete(null)} className="py-4 bg-neutral-800 text-white text-xs font-black rounded-2xl hover:bg-neutral-700 transition-all uppercase tracking-widest">Cancel</button>
                <button onClick={executeDeleteNote} className="py-4 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-2xl transition-all uppercase tracking-widest">Purge</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function NotesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    }>
      <NotesPageInternal />
    </Suspense>
  );
}

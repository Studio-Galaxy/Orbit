"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Sparkles, Folder, ArchiveX, X, Plus, Clock, Loader2, Trash2, PanelLeftClose, PanelLeft, Menu, Upload, ChevronRight, ArrowLeft, Maximize, Minimize } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useSearchParams } from "next/navigation";

function NotesPageInternal() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
      if (nData.length > 0 && !activeNoteId) {
        setActiveNote(nData[0]);
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
      toast.success("Note deleted.");
      const updatedNotes = notes.filter(n => n.id !== noteToDelete);
      setNotes(updatedNotes);
      if (activeNoteId === noteToDelete) {
        if (updatedNotes.length > 0) setActiveNote(updatedNotes[0]);
        else {
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

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-black">
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.div 
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            className="fixed inset-y-0 left-0 w-[300px] lg:relative lg:w-[300px] border-r border-neutral-900 bg-black/95 lg:bg-black/40 flex flex-col h-full overscroll-contain overflow-y-auto shrink-0 z-[60] lg:z-20 backdrop-blur-xl lg:backdrop-blur-md"
          >
            <div className="flex flex-col h-full min-w-[300px]">
              <div className="p-6 pb-2">
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <FileText className="text-indigo-500" size={20} /> Your Library
                </h2>
                <p className="text-[10px] text-neutral-500 font-medium mt-1 uppercase tracking-widest pl-1">Knowledge Base</p>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-none">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] pl-1">Recent Notes</h3>
                  <button onClick={handleCreateNote} className="p-1.5 bg-neutral-900 text-neutral-400 hover:text-white rounded-lg border border-neutral-800 transition-all hover:border-neutral-700">
                    <Plus size={14} />
                  </button>
                </div>
                
                <div className="space-y-2">
                  {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 size={24} className="animate-spin text-neutral-800" /></div>
                  ) : notes.length === 0 ? (
                    <div className="text-center py-12 px-4 text-xs text-neutral-600">No notes found.</div>
                  ) : notes.map(note => (
                    <div 
                      key={note.id}
                      onClick={() => setActiveNote(note)}
                      className={`w-full group p-3 rounded-2xl transition-all border text-left flex flex-col gap-1.5 cursor-pointer ${
                        activeNoteId === note.id ? "bg-neutral-900/80 border-neutral-800" : "bg-transparent border-transparent hover:bg-neutral-900/30"
                      }`}
                    >
                      <div className={`text-sm font-semibold truncate ${activeNoteId === note.id ? "text-white" : "text-neutral-400 group-hover:text-neutral-200"}`}>
                        {note.title || "Untitled Note"}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-neutral-600">
                        <span>{new Date(note.updated_at || note.created_at).toLocaleDateString()}</span>
                        {activeNoteId === note.id && (
                          <button onClick={(e) => { e.stopPropagation(); setNoteToDelete(note.id); }} className="p-1 hover:text-red-500 transition-colors">
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-neutral-950/50 border-t border-neutral-900">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleAiAction("Flashcards")} className="flex items-center justify-center gap-2 py-3 px-3 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-xl border border-indigo-500/20 transition-all">
                    <Sparkles size={12} /> Quiz
                  </button>
                  <button onClick={() => handleAiAction("Summary")} className="flex items-center justify-center gap-2 py-3 px-3 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl border border-emerald-500/20 transition-all">
                    <Sparkles size={12} /> Summary
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 w-full flex flex-col h-full bg-black overflow-y-auto relative p-4 md:p-6 min-w-0 transition-all">
        <div className="absolute top-4 md:top-6 left-4 md:left-8 z-10">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 md:p-2.5 bg-neutral-900/50 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-xl transition-all border border-neutral-800 shadow-xl">
            {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>
        </div>
        
        {activeNoteId ? (
          <div className="mt-8 lg:mt-0 flex-1 flex flex-col items-center w-full">
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

      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAiModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              <button onClick={() => setIsAiModalOpen(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors z-20"><X size={20} /></button>
              {!aiResult ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-neutral-800/50 flex items-center justify-center mb-6 relative mt-4">
                    <div className="absolute inset-0 border-2 border-neutral-700 rounded-full border-t-indigo-500 animate-spin" />
                    <Sparkles size={24} className="text-white animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Generating {aiActionTitle}...</h3>
                  <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden mt-4">
                    <motion.div initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 15, ease: "easeOut" }} className="h-full bg-indigo-500" />
                  </div>
                </>
              ) : (
                <div className="w-full text-left flex flex-col h-full max-h-[60vh] overflow-hidden">
                  <h3 className="text-xl font-bold text-white mb-4 mt-2 flex items-center gap-2"><Sparkles size={18} className="text-indigo-400" />{aiActionTitle} Result</h3>
                  <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-4">
                    {aiActionTitle === "Summary" && (
                      <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl prose prose-invert prose-sm max-w-none">
                        <div className="prose-p:my-2 prose-headings:mb-3 prose-headings:mt-6 prose-strong:text-white">
                          <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                            {aiResult.summary}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                    {aiActionTitle === "Flashcards" && aiResult.flashcards && (
                      <div className="space-y-3">
                        {aiResult.flashcards.map((fc: any, i: number) => (
                          <div key={i} className="p-4 bg-neutral-800/40 border border-neutral-700/50 rounded-xl hover:border-neutral-600 transition-colors prose prose-invert prose-sm max-w-none">
                            <div className="text-sm font-medium text-white mb-2 pb-2 border-b border-neutral-700">
                              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{`Q: ${fc.question}`}</ReactMarkdown>
                            </div>
                            <div className="text-sm text-neutral-400">
                              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{`A: ${fc.answer}`}</ReactMarkdown>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {noteToDelete && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setNoteToDelete(null)} />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-neutral-900 border border-neutral-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20"><Trash2 size={24} /></div>
                <h3 className="text-xl font-bold text-white mb-2">Delete Note?</h3>
                <div className="grid grid-cols-2 gap-3 mt-6">
                   <button onClick={() => setNoteToDelete(null)} className="py-3 bg-neutral-800 text-white text-sm font-bold rounded-xl">Cancel</button>
                   <button onClick={executeDeleteNote} className="py-3 bg-red-500 text-white text-sm font-bold rounded-xl">Delete</button>
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

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Sparkles, Folder, ArchiveX, X, Plus, Clock, Loader2, Trash2, PanelLeftClose, PanelLeft, Menu, Upload, ChevronRight, ArrowLeft, Maximize, Minimize } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

export default function NotesPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiActionTitle, setAiActionTitle] = useState("");
  const [aiResult, setAiResult] = useState<any>(null);
  
  const [notes, setNotes] = useState<any[]>([]);
  const [vaultFiles, setVaultFiles] = useState<any[]>([]);
  
  const [activeCategory, setActiveCategory] = useState<"note" | "vault">("note");
  
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeNoteContent, setActiveNoteContent] = useState<any>("");
  const [activeNoteTitle, setActiveNoteTitle] = useState("");
  
  const [activeVaultFile, setActiveVaultFile] = useState<any>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isUploadingVault, setIsUploadingVault] = useState(false);
  const [isDocFullscreen, setIsDocFullscreen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          loadData(data.user.id);
        } else {
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Auth fetch error:", err);
        setIsLoading(false);
      });
  }, []);

  async function loadData(userId: string) {
    setIsLoading(true);
    const { data: nData, error: nError } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (nError) {
      console.error("Error loading notes:", nError.message);
      toast.error("Failed to load notes. Please ensure the database tables are created.");
    } else if (nData) {
      setNotes(nData);
      if (nData.length > 0 && !activeNoteId && activeCategory === "note") {
        setActiveNote(nData[0]);
      }
    }
    
    try {
      const { data: vData } = await supabase
        .from('vault_files')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (vData) setVaultFiles(vData);
    } catch(e) {
      console.log("Vault files table might not be created yet");
    }
    
    setIsLoading(false);
  }

  const setActiveNote = (note: any) => {
    setActiveCategory("note");
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
  
  const selectVaultFile = (file: any) => {
    setActiveCategory("vault");
    setActiveVaultFile(file);
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

  const handleVaultUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast.error("You must be logged in to upload to Vault.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingVault(true);
      toast.loading("Uploading to Vault securely...", { id: "vault-upload" });
      
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('vault_files')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      const { data: publicUrlData } = supabase.storage
        .from('vault_files')
        .getPublicUrl(filePath);
        
      const { data: vaultData, error: dbError } = await supabase
        .from('vault_files')
        .insert({
          user_id: user.id,
          filename: file.name,
          file_format: fileExt,
          file_url: publicUrlData.publicUrl
        })
        .select()
        .single();
        
      if (dbError) throw dbError;
      
      if (vaultData) {
        setVaultFiles([vaultData, ...vaultFiles]);
        setIsVaultOpen(true);
        selectVaultFile(vaultData);
        toast.success("Document added to Vault!", { id: "vault-upload" });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload document.", { id: "vault-upload" });
    } finally {
      setIsUploadingVault(false);
      e.target.value = '';
    }
  };

  const debouncedSaveRaw = useCallback(
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
      setIsSaving(true); // Show saving state immediately for better UX
      debouncedSaveRef.current(id, title, content);
    }
  };

  const confirmDeleteNote = (id: string) => {
    setNoteToDelete(id);
  };

  const executeDeleteVaultFile = async (id: string, fileUrl: string) => {
    if (!user) return;
    setIsSaving(true);
    
    try {
      // Parse file path from URL
      const pathParts = fileUrl.split('vault_files/');
      const filePath = pathParts.length > 1 ? pathParts[1] : null;
      
      if (filePath) {
        await supabase.storage.from('vault_files').remove([filePath]);
      }
      
      const { error } = await supabase.from('vault_files').delete().eq('id', id);
      if (error) throw error;
      
      toast.success("Document deleted.");
      const updatedVaultFiles = vaultFiles.filter(f => f.id !== id);
      setVaultFiles(updatedVaultFiles);
      
      if (activeVaultFile?.id === id) {
        setActiveVaultFile(null);
      }
    } catch (error: any) {
      console.error("Error deleting vault file:", error.message);
      toast.error("Failed to delete document.");
    } finally {
      setIsSaving(false);
      setNoteToDelete(null);
    }
  };

  const executeDeleteNote = async () => {
    if (!user || !noteToDelete) return;
    
    if (activeCategory === 'vault') {
      const fileToDelete = vaultFiles.find(f => f.id === noteToDelete);
      if (fileToDelete) {
        await executeDeleteVaultFile(fileToDelete.id, fileToDelete.file_url);
      }
      return;
    }
    
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

  const handleAiAction = async (action: string) => {
    if (!activeNoteId || !activeNoteContent) {
      toast.error("Please create or select a note with content first.");
      return;
    }
    
    setAiActionTitle(action);
    setIsAiModalOpen(true);
    setAiResult(null);

    const textToAnalyze = typeof activeNoteContent === 'string' 
      ? activeNoteContent 
      : JSON.stringify(activeNoteContent);

    try {
      const res = await fetch("/api/notes/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToAnalyze })
      });
      const data = await res.json();
      
      if (res.ok) {
        setAiResult(data);
      } else {
        toast.error(data.error || "Failed to analyze note.");
        setIsAiModalOpen(false);
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred.");
      setIsAiModalOpen(false);
    }
  };

  const handleVaultAiAction = async (action: string) => {
    if (!activeVaultFile) return;
    
    setAiActionTitle(action);
    setIsAiModalOpen(true);
    setAiResult(null);

    try {
      const fileRes = await fetch(activeVaultFile.file_url);
      const blob = await fileRes.blob();
      
      const formData = new FormData();
      formData.append("file", blob, activeVaultFile.filename);

      const res = await fetch("/api/pdf/analyze", {
        method: "POST",
        body: formData
      });
      
      if (!res.ok) {
         const data = await res.json().catch(() => null);
         toast.error(data?.error || "Failed to analyze document.");
         setIsAiModalOpen(false);
         return;
      }
      
      const data = await res.json();
      setAiResult(data);
    } catch (e) {
      console.error(e);
      toast.error("An error occurred during analysis.");
      setIsAiModalOpen(false);
    }
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
              
              {/* Vault Section */}
              <div className="mb-4 border-b border-neutral-900 pb-2">
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-neutral-900/50 p-2 rounded-lg transition-colors group"
                  onClick={() => setIsVaultOpen(!isVaultOpen)}
                >
                  <h3 className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                    <motion.div animate={{ rotate: isVaultOpen ? 90 : 0 }}>
                      <ChevronRight size={14} />
                    </motion.div>
                    Vault
                  </h3>
                  <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                    {isUploadingVault ? (
                      <Loader2 size={14} className="animate-spin text-neutral-500" />
                    ) : (
                      <label className="text-neutral-500 hover:text-white transition-colors cursor-pointer p-1 rounded hover:bg-neutral-800" title="Upload to Vault">
                        <Plus size={14} />
                        <input type="file" className="hidden" accept=".pdf,.docx,.pptx" onChange={handleVaultUpload} />
                      </label>
                    )}
                  </div>
                </div>
                
                <AnimatePresence>
                  {isVaultOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-1 space-y-1"
                    >
                      {vaultFiles.length === 0 ? (
                        <div className="text-xs text-neutral-600 px-8 py-2">No files securely stored</div>
                      ) : vaultFiles.map(file => (
                        <div key={file.id} className="group/item relative">
                          <button 
                            onClick={() => selectVaultFile(file)}
                            className={`w-full flex items-center gap-2 px-3 pl-8 py-2 text-xs rounded-md transition-colors text-left ${
                              activeCategory === "vault" && activeVaultFile?.id === file.id 
                                ? "bg-neutral-900/80 text-white pr-8" 
                                : "hover:bg-neutral-900/30 text-neutral-400 pr-8"
                            }`}
                          >
                            <FileText size={12} className={activeCategory === "vault" && activeVaultFile?.id === file.id ? "text-indigo-400" : "text-neutral-500"} />
                            <span className="truncate flex-1">{file.filename}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCategory("vault"); // Ensure we delete as vault
                              confirmDeleteNote(file.id);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-600 hover:text-red-500 hover:drop-shadow-[0_0_5px_rgba(239,68,68,0.8)] transition-all"
                            title="Delete Document"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Your Notes Section */}
              <div className="flex items-center justify-between mb-4 mt-2">
                <h3 className="text-sm font-medium text-neutral-400 pl-2">Your Notes</h3>
                <div className="flex items-center gap-3 pr-2">
                  <button onClick={handleCreateNote} className="text-neutral-500 hover:text-white transition-colors p-1 rounded hover:bg-neutral-800" title="Create Note">
                    <Plus size={14} />
                  </button>
                </div>
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
                      activeCategory === 'note' && activeNoteId === note.id 
                        ? "bg-neutral-900/80 border border-neutral-800" 
                        : "hover:bg-neutral-900/30 border border-transparent"
                    }`}
                  >
                    <div className={`font-medium truncate w-full ${activeCategory === 'note' && activeNoteId === note.id ? "text-white" : "text-neutral-300"}`}>
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
                  onClick={() => activeCategory === 'note' ? handleAiAction("Flashcards") : handleVaultAiAction("Flashcards")}
                  className="w-full flex items-center gap-2 p-2 px-3 text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/20 transition-colors"
                >
                  <Sparkles size={14} /> Generate Flashcards
                </button>
                <button 
                  onClick={() => activeCategory === 'note' ? handleAiAction("Summary") : handleVaultAiAction("Summary")}
                  className="w-full flex items-center gap-2 p-2 px-3 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/20 transition-colors"
                >
                  <Sparkles size={14} /> Summarize
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor/Previewer Area */}
      <div className="flex-1 w-full flex flex-col h-full bg-black overflow-y-auto relative p-6 min-w-0">
        {!(activeCategory === "vault" && activeVaultFile) && (
          <div className="absolute top-4 left-6 z-10 hidden lg:block">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-900 rounded-lg transition-colors flex items-center justify-center border border-transparent hover:border-neutral-800"
              title="Toggle Sidebar"
            >
              {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
            </button>
          </div>
        )}
        
        {activeCategory === "note" && (
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
        )}


        {activeCategory === "note" ? (
          activeNoteId ? (
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
          )
        ) : (
          activeVaultFile ? (
            <>
               {isDocFullscreen && (
                 <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100]" onClick={() => setIsDocFullscreen(false)} />
               )}
               
               <div className={`flex flex-col bg-neutral-900 border-neutral-800 shadow-2xl transition-all ${isDocFullscreen ? "fixed inset-x-4 inset-y-4 z-[101] rounded-2xl border" : "relative mt-8 lg:mt-0 flex-1 w-full h-full rounded-xl border overflow-hidden"}`}>
                 <div className="absolute top-0 inset-x-0 h-14 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between px-6 z-20 shadow-sm rounded-t-xl">
                   <div className="font-medium text-white flex items-center gap-2">
                     <div className="hidden lg:block mr-2 border-r border-neutral-800 pr-4">
                       <button
                         onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                         className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
                         title="Toggle Sidebar"
                       >
                         {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
                       </button>
                     </div>
                     <FileText size={16} className="text-indigo-400" />
                     {activeVaultFile.filename}
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="text-xs text-neutral-500 bg-neutral-900 px-3 py-1.5 rounded-full border border-neutral-800 hidden sm:block">
                       {activeVaultFile.file_format?.toUpperCase()} Document
                     </div>
                     <div className="flex items-center gap-1 border-l border-neutral-800 pl-3 ml-1">
                       <button 
                         onClick={() => setIsDocFullscreen(!isDocFullscreen)}
                         className="p-1.5 px-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium"
                         title={isDocFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                       >
                         {isDocFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                       </button>
                       <button 
                         onClick={() => { setActiveVaultFile(null); setIsDocFullscreen(false); }}
                         className="p-1.5 px-2 text-neutral-400 hover:text-white hover:bg-neutral-800 bg-neutral-900/50 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium ml-1"
                         title="Close Preview"
                       >
                         <X size={14} /> Close
                       </button>
                     </div>
                   </div>
                 </div>
                 
                 <div className="flex-1 mt-14 overflow-hidden bg-neutral-800/20 z-10 w-full h-full">
                   {activeVaultFile.file_format === 'pdf' ? (
                     <iframe src={activeVaultFile.file_url} className="w-full h-full rounded-sm" />
                   ) : (
                     <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(activeVaultFile.file_url)}`} className="w-full h-full bg-white rounded-sm" />
                   )}
                 </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 h-full">
              <Folder size={48} className="mb-4 opacity-20" />
              <p>Select a document from your Vault to preview</p>
            </div>
          )
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
                className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors z-20"
              >
                <X size={20} />
              </button>

              {!aiResult ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-neutral-800/50 flex items-center justify-center mb-6 relative mt-4">
                    <div className="absolute inset-0 border-2 border-neutral-700 rounded-full border-t-indigo-500 animate-spin" />
                    <Sparkles size={24} className="text-white animate-pulse" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2">Generating {aiActionTitle}...</h3>
                  <p className="text-sm text-neutral-400 mb-6">
                    Our AI models are analyzing your {activeCategory === 'vault' ? 'document' : 'notes'} to extract the most important concepts. This usually takes a few seconds.
                  </p>
                  
                  <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 15, ease: "easeOut" }}
                      className="h-full bg-indigo-500"
                    />
                  </div>
                </>
              ) : (
                <div className="w-full text-left flex flex-col h-full max-h-[60vh] overflow-hidden">
                  <h3 className="text-xl font-bold text-white mb-4 mt-2 flex items-center gap-2">
                    <Sparkles size={18} className="text-indigo-400" />
                    {aiActionTitle} Result
                  </h3>
                  
                  <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-4">
                    {aiActionTitle === "Summary" && (
                      <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                        <p className="text-indigo-100 text-sm leading-relaxed whitespace-pre-wrap">
                          {aiResult.summary}
                        </p>
                      </div>
                    )}
                    
                    {aiActionTitle === "Flashcards" && aiResult.flashcards && aiResult.flashcards.length > 0 && (
                      <div className="space-y-3 mt-4">
                        <h4 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Flashcards</h4>
                        {aiResult.flashcards.map((fc: any, i: number) => (
                          <div key={i} className="p-4 bg-neutral-800/40 border border-neutral-700/50 rounded-xl hover:border-neutral-600 transition-colors">
                            <p className="text-sm font-medium text-white mb-2 pb-2 border-b border-neutral-700">Q: {fc.question}</p>
                            <p className="text-sm text-neutral-400">A: {fc.answer}</p>
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
              
              <h3 className="text-xl font-bold text-white mb-2">Delete Note {activeCategory === 'vault' ? 'or Document' : ''}?</h3>
              <p className="text-sm text-neutral-400 mb-6">
                Are you sure you want to delete this? This action cannot be undone.
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

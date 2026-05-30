"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Sparkles, Folder, Plus, Loader2, Trash2, X,
  Upload, Maximize, Minimize, LayoutGrid, List, Save
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { useSidebar } from "@/context/SidebarContext";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useSearchParams } from "next/navigation";

function VaultPageInternal() {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [vaultFiles, setVaultFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeVaultFile, setActiveVaultFile] = useState<any>(null);
  const [isUploadingVault, setIsUploadingVault] = useState(false);
  const [isDocFullscreen, setIsDocFullscreen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'dir'>('grid');
  const [activeDirectory, setActiveDirectory] = useState<string | null>(null);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiActionTitle, setAiActionTitle] = useState("");
  const [aiResult, setAiResult] = useState<any>(null);
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [revealedCards, setRevealedCards] = useState<Record<number, boolean>>({});
  
  const searchParams = useSearchParams();
  const fileId = searchParams.get('id');

  const supabase = createClient();

  useEffect(() => {
    setIsMounted(true);
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          loadVaultFiles(data.user.id);
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
    if (fileId && vaultFiles.length > 0) {
      const file = vaultFiles.find(f => f.id === fileId);
      if (file) selectVaultFile(file);
    }
  }, [fileId, vaultFiles]);

  async function loadVaultFiles(userId: string) {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vault_files')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setVaultFiles(data);
    } catch (e: any) {
      console.error("Error loading vault:", e.message);
      toast.error("Failed to load your vault.");
    } finally {
      setIsLoading(false);
    }
  }
  
  const groupedFiles = vaultFiles.reduce((acc: any, file: any) => {
    const ext = file.file_format?.toLowerCase() || 'other';
    let folder = 'Others';
    if (ext === 'pdf') folder = 'PDF Documents';
    else if (['doc', 'docx'].includes(ext)) folder = 'Word Documents';
    else if (['xls', 'xlsx', 'csv'].includes(ext)) folder = 'Spreadsheets';
    else if (['ppt', 'pptx'].includes(ext)) folder = 'Presentations';
    
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(file);
    return acc;
  }, {});

  const selectVaultFile = (file: any) => {
    setActiveVaultFile(file);
    setIsCollapsed(true);
  };

  const closeVaultFile = () => {
    setActiveVaultFile(null);
    setIsDocFullscreen(false);
  };

  const handleVaultUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingVault(true);
      toast.loading("Securing document in Vault...", { id: "vault-upload" });

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

  const executeDeleteVaultFile = async () => {
    if (!user || !fileToDelete) return;
    try {
      const fileObj = vaultFiles.find(f => f.id === fileToDelete);
      if (fileObj) {
        const pathParts = fileObj.file_url.split('vault_files/');
        const filePath = pathParts.length > 1 ? pathParts[1] : null;
        if (filePath) await supabase.storage.from('vault_files').remove([filePath]);
      }
      const { error } = await supabase.from('vault_files').delete().eq('id', fileToDelete);
      if (error) throw error;
      toast.success("Document deleted.");
      setVaultFiles(vaultFiles.filter(f => f.id !== fileToDelete));
      if (activeVaultFile?.id === fileToDelete) closeVaultFile();
    } catch (error: any) {
      console.error("Error deleting vault file:", error.message);
      toast.error("Failed to delete document.");
    } finally {
      setFileToDelete(null);
    }
  };

  const handleAiAction = async (action: string) => {
    if (!activeVaultFile) return;
    setAiActionTitle(action);
    setIsAiModalOpen(true);
    setAiResult(null);
    setRevealedCards({});
    setIsProcessingAi(true);
    try {
      const res = await fetch("/api/ai/analyze-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: activeVaultFile.file_url,
          format: activeVaultFile.file_format,
          action: action.toLowerCase()
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || "AI analysis failed");
      }
      setAiResult(data);
    } catch (err: any) {
      toast.error(err.message || "AI failed to process this document.");
      setIsAiModalOpen(false);
    } finally {
      setIsProcessingAi(false);
    }
  };

  return (
    <div className="h-full w-full bg-black flex flex-col overflow-hidden relative">
      {/* Dynamic Header */}
      <div className={`pt-8 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-500 ${activeVaultFile ? 'px-12' : 'px-8'}`}>
        <div className={`flex items-center gap-4 transition-all duration-500 ${activeVaultFile ? 'opacity-0 scale-95 pointer-events-none w-0' : 'opacity-100 scale-100'}`}>
          <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
            Vault
          </h1>
        </div>

        <div className={`flex items-center gap-3 transition-all duration-500 ${activeVaultFile ? 'flex-1 justify-start' : 'justify-end'}`}>
          <div className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-2xl p-1 flex items-center gap-1">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-neutral-800 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}>
              <LayoutGrid size={18} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-neutral-800 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}>
              <List size={18} />
            </button>
            <button onClick={() => setViewMode('dir')} className={`p-2 rounded-xl transition-all ${viewMode === 'dir' ? 'bg-neutral-800 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}>
              <Folder size={18} />
            </button>
          </div>
          <label className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-neutral-200 text-black rounded-2xl text-xs font-black transition-all cursor-pointer shadow-xl active:scale-95">
            {isUploadingVault ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} strokeWidth={3} />} UPLOAD
            <input type="file" className="hidden" accept=".pdf,.docx,.pptx" onChange={handleVaultUpload} disabled={isUploadingVault} />
          </label>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* File Explorer */}
        <div className={`flex flex-col min-w-0 transition-all duration-500 ease-in-out ${activeVaultFile ? 'w-1/2 px-12 pt-8' : 'w-full px-8'}`}>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-neutral-800" size={48} />
            </div>
          ) : vaultFiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-neutral-900 rounded-[3rem] bg-neutral-950/20">
              <div className="w-24 h-24 bg-neutral-900 rounded-[2.5rem] flex items-center justify-center mb-6 border border-neutral-800 shadow-2xl">
                <Upload size={32} className="text-neutral-600" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Vault is empty</h2>
              <p className="text-neutral-500 max-w-sm mb-8">Securely store your PDFs, slides, and notes.</p>
              <label className="px-6 py-3 bg-white text-black rounded-2xl text-sm font-bold hover:scale-105 transition-transform cursor-pointer shadow-xl">
                Upload your first file
                <input type="file" className="hidden" accept=".pdf,.docx" onChange={handleVaultUpload} />
              </label>
            </div>
          ) : (
            <div className={`overflow-y-auto pb-12 pt-4 no-scrollbar ${viewMode === 'grid' ? `grid gap-6 ${activeVaultFile ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'}` : viewMode === 'list' ? 'flex flex-col gap-2' : ''}`}>
              {viewMode === 'dir' ? (
                !activeDirectory ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full h-fit">
                    {Object.entries(groupedFiles).map(([folderName, files]: any) => (
                      <button
                        key={folderName}
                        onClick={() => setActiveDirectory(folderName)}
                        className="w-full aspect-[4/3] bg-neutral-900/40 border border-neutral-800 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 hover:bg-neutral-900/60 transition-all group"
                      >
                        <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-white/50 group-hover:scale-110 group-hover:bg-white/10 transition-all shadow-2xl">
                          <Folder size={32} />
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-black text-white uppercase tracking-widest leading-none mb-2">{folderName}</div>
                          <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-tight">{files.length} ITEMS</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="w-full space-y-8 h-fit">
                    <button
                      onClick={() => setActiveDirectory(null)}
                      className="flex items-center gap-2 text-neutral-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors mb-4"
                    >
                      <X size={14} /> Back to Library / {activeDirectory}
                    </button>
                    <div className={`grid gap-6 ${activeVaultFile ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'}`}>
                      {(groupedFiles[activeDirectory!] || []).map((file: any) => {
                        const ext = file.file_format?.toLowerCase() || 'bin';
                        const isActive = activeVaultFile?.id === file.id;
                        return (
                          <motion.div layout key={file.id} className="group relative">
                            <button
                              onClick={() => selectVaultFile(file)}
                              className={`w-full aspect-[4/3] flex flex-col items-center justify-center p-6 rounded-[2rem] border transition-all overflow-hidden relative ${isActive ? "bg-white/5 border-white/20 shadow-2xl" : "bg-neutral-900/20 border-neutral-900 hover:bg-neutral-900/40 hover:border-neutral-800"}`}
                            >
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 shadow-lg ${ext === 'pdf' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                <FileText size={20} />
                              </div>
                              <div className="text-center w-full px-2 text-white">
                                <div className="text-[11px] font-bold truncate mb-1">{file.filename}</div>
                                <div className="text-[8px] font-black uppercase tracking-widest opacity-40">{ext}</div>
                              </div>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setFileToDelete(file.id); }} className="absolute top-4 right-4 p-2 text-neutral-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )
              ) : (
                vaultFiles.map((file) => {
                  const ext = file.file_format?.toLowerCase() || 'bin';
                  const isActive = activeVaultFile?.id === file.id;
                  if (viewMode === 'list') {
                    return (
                      <div key={file.id} onClick={() => selectVaultFile(file)} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${isActive ? 'bg-neutral-900 border-neutral-700 ring-1 ring-white/10' : 'bg-neutral-950/40 border-neutral-900 hover:bg-neutral-900/40'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ext === 'pdf' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}><FileText size={20} /></div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-sm font-bold text-white truncate">{file.filename}</div>
                          <div className="text-[10px] text-neutral-500 font-medium uppercase tracking-tighter">{ext} • {isMounted ? new Date(file.created_at).toLocaleDateString() : ''}</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setFileToDelete(file.id); }} className="p-2 text-neutral-600 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    );
                  }
                  return (
                    <motion.div layout key={file.id} className="group relative">
                      <button
                        onClick={() => selectVaultFile(file)}
                        className={`w-full aspect-[4/3] flex flex-col items-center justify-center p-6 rounded-[2rem] border transition-all overflow-hidden relative ${isActive ? "bg-white/5 border-white/20 shadow-2xl" : "bg-neutral-900/20 border-neutral-900 hover:bg-neutral-900/40 hover:border-neutral-800"}`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 shadow-lg ${ext === 'pdf' ? 'bg-red-500/10 text-red-500' : ext === 'docx' ? 'bg-blue-500/10 text-blue-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                          <FileText size={20} />
                        </div>
                        <div className="text-center w-full px-2">
                          <div className={`text-[11px] font-bold truncate mb-1 ${isActive ? 'text-white' : 'text-neutral-400'}`}>{file.filename}</div>
                          <div className="text-[8px] font-black uppercase tracking-widest opacity-40">{ext}</div>
                        </div>
                        {isActive && <motion.div layoutId="active-indicator" className="absolute bottom-0 inset-x-0 h-1 bg-white" />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setFileToDelete(file.id); }} className="absolute top-4 right-4 p-2 text-neutral-600 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all border border-neutral-800 bg-black/40 backdrop-blur-md">
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Literal Half-Screen Document Viewer (Covers Global Header in its half) */}
        <AnimatePresence>
          {activeVaultFile && (
            <motion.div
              initial={{ x: "100%", width: isDocFullscreen ? '100%' : `calc((100vw - ${isCollapsed ? 80 : 260}px) / 2)` }}
              animate={{
                x: 0,
                width: isDocFullscreen ? '100%' : `calc((100vw - ${isCollapsed ? 80 : 260}px) / 2)`
              }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className={`fixed top-0 bottom-0 right-0 flex flex-col bg-black border-l border-neutral-900 z-[100] shadow-[0_0_100px_rgba(0,0,0,1)] ${isDocFullscreen ? 'w-full z-[110]' : ''}`}
            >
              <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-900/50 bg-black/80 backdrop-blur-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 flex-shrink-0">
                    <FileText size={16} />
                  </div>
                  <span className="text-sm font-black text-white truncate max-w-[200px] uppercase tracking-tighter">{activeVaultFile.filename}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsDocFullscreen(!isDocFullscreen)} className="p-2 text-neutral-500 hover:text-white transition-colors">
                    {isDocFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                  </button>
                  <button onClick={closeVaultFile} className="p-2 text-neutral-500 hover:text-red-500 transition-colors"><X size={24} /></button>
                </div>
              </div>

              <div className="flex-1 bg-black relative">
                {activeVaultFile.file_format === 'pdf' ? (
                  <iframe src={activeVaultFile.file_url} className="w-full h-full border-none" />
                ) : (
                  <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(activeVaultFile.file_url)}`} className="w-full h-full bg-white border-none" />
                )}
              </div>

              {/* Minimal footer tools */}
              <div className="p-6 border-t border-neutral-900/50 bg-neutral-950/20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,1)]" />
                  <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Studying Intelligence</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAiAction("Summary")} className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-[9px] font-black rounded-lg transition-all border border-neutral-800 uppercase tracking-widest">Summarize</button>
                  <button onClick={() => handleAiAction("Flashcards")} className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-[9px] font-black rounded-lg transition-all border border-neutral-800 uppercase tracking-widest">Flashcards</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Result Modal */}
      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setIsAiModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-5xl bg-neutral-900 border border-neutral-800 rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="p-10">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic">{aiActionTitle}</h3>
                  <button onClick={() => setIsAiModalOpen(false)} className="text-neutral-500 hover:text-white p-2">
                    <X size={28} />
                  </button>
                </div>
                <div className="min-h-[400px] max-h-[70vh] overflow-y-auto no-scrollbar">
                  {isProcessingAi ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center gap-8">
                      <Loader2 className="animate-spin text-white" size={48} />
                      <p className="text-neutral-500 text-sm font-black uppercase tracking-widest">Analyzing Workspace Documents...</p>
                    </div>
                  ) : aiResult ? (
                    <div className="space-y-8 pb-10">
                      {aiActionTitle === "Summary" && (
                        <>
                          <div className="p-10 bg-neutral-950 border border-neutral-800 rounded-[3rem] overflow-hidden prose prose-invert prose-sm max-w-none">
                            <div className="text-neutral-300 leading-relaxed prose-p:my-4 prose-headings:text-white prose-headings:font-black prose-headings:tracking-tight prose-strong:text-indigo-400 prose-ul:list-disc prose-ul:pl-6 prose-li:my-2">
                              <ReactMarkdown
                                remarkPlugins={[remarkMath, remarkGfm]}
                                rehypePlugins={[rehypeKatex]}
                              >
                                {aiResult.summary}
                              </ReactMarkdown>
                            </div>
                          </div>
                          <div className="flex justify-center py-12">
                            <button
                              onClick={async () => {
                                const toastId = toast.loading("Saving to Library...");
                                try {
                                  const { data: { user } } = await supabase.auth.getUser();
                                  if (!user) throw new Error("Please login");

                                  const { error } = await supabase.from('notes').insert({
                                    user_id: user.id,
                                    title: `Summary: ${activeVaultFile.filename}`,
                                    content: aiResult.summary
                                  });
                                  if (error) throw error;
                                  toast.success("Saved to Library!", { id: toastId });
                                } catch (e: any) {
                                  toast.error(e.message, { id: toastId });
                                }
                              }}
                              className="px-10 py-4 bg-white text-black text-[11px] font-black rounded-full hover:bg-neutral-200 transition-all uppercase tracking-[0.1em] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-3 active:scale-95"
                            >
                              <Save size={16} /> Save to Library
                            </button>
                          </div>
                        </>
                      )}
                      {aiActionTitle === "Flashcards" && aiResult.flashcards && (
                        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6 pb-12">
                          {aiResult.flashcards.map((fc: any, i: number) => (
                            <div
                              key={i}
                              onClick={() => setRevealedCards(prev => ({ ...prev, [i]: !prev[i] }))}
                              className="break-inside-avoid p-8 bg-neutral-950 border border-neutral-800 rounded-[2.5rem] group prose prose-invert prose-sm max-w-none cursor-pointer transition-all hover:border-neutral-700 hover:shadow-2xl relative overflow-hidden"
                            >
                              <div className="flex items-center justify-between mb-6">
                                <div className="text-[9px] font-black text-neutral-700 uppercase tracking-[0.2em]">Card {i + 1}</div>
                                <div className={`text-[8px] font-black uppercase tracking-widest ${revealedCards[i] ? 'text-emerald-500/50' : 'text-indigo-500/50 animate-pulse'}`}>
                                  {revealedCards[i] ? 'Revealed' : 'Tap to reveal'}
                                </div>
                              </div>
                              <div className="font-bold text-white mb-4 text-base leading-snug">
                                <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{fc.question}</ReactMarkdown>
                              </div>
                              <div className={`mt-6 pt-6 border-t border-neutral-900 transition-all duration-500 ${revealedCards[i] ? 'opacity-100' : 'opacity-0 scale-95 translate-y-2'}`}>
                                <div className="text-neutral-400 text-sm leading-relaxed">
                                  <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{fc.answer}</ReactMarkdown>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-20 text-neutral-500 uppercase font-black tracking-widest">Analysis Failure</div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {fileToDelete && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setFileToDelete(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-neutral-900 border border-neutral-800 p-12 rounded-[2.5rem] max-w-md w-full text-center shadow-2xl">
              <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-inner">
                <Trash2 size={32} />
              </div>
              <h3 className="text-2xl font-black text-white mb-3 tracking-tighter uppercase">Purge File?</h3>
              <p className="text-neutral-500 text-sm mb-10 leading-relaxed font-medium">This action cannot be undone. The document will be permanently removed from Orbit's secure storage.</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setFileToDelete(null)} className="py-4 bg-neutral-800 text-white text-xs font-black rounded-2xl hover:bg-neutral-700 transition-all uppercase tracking-widest">Cancel</button>
                <button onClick={executeDeleteVaultFile} className="py-4 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-2xl transition-all shadow-xl shadow-red-500/20 uppercase tracking-widest">Purge</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function VaultPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    }>
      <VaultPageInternal />
    </Suspense>
  );
}

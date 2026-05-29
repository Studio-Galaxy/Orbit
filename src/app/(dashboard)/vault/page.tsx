"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Sparkles, Folder, Plus, Loader2, Trash2, X, 
  Upload, ChevronRight, Maximize, Minimize, PanelLeftClose, PanelLeft,
  ArrowLeft, Search, Filter, MoreVertical, LayoutGrid, List
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { useSidebar } from "@/context/SidebarContext";

export default function VaultPage() {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [vaultFiles, setVaultFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeVaultFile, setActiveVaultFile] = useState<any>(null);
  const [isUploadingVault, setIsUploadingVault] = useState(false);
  const [isDocFullscreen, setIsDocFullscreen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiActionTitle, setAiActionTitle] = useState("");
  const [aiResult, setAiResult] = useState<any>(null);
  const [isProcessingAi, setIsProcessingAi] = useState(false);

  const supabase = createClient();

  useEffect(() => {
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
        if (filePath) {
          await supabase.storage.from('vault_files').remove([filePath]);
        }
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

      if (!res.ok) throw new Error("AI analysis failed");
      const data = await res.json();
      setAiResult(data);
    } catch (err) {
      toast.error("AI failed to process this document.");
      setIsAiModalOpen(false);
    } finally {
      setIsProcessingAi(false);
    }
  };

  return (
    <div className="h-full w-full bg-black flex flex-col overflow-hidden relative">
      <div className="p-8 pb-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Folder className="text-indigo-500" /> Secure Vault
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              Your academic assets, protected and AI-enhanced. {vaultFiles.length} files stored.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-1 flex items-center gap-1">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-600 hover:text-neutral-400'}`}>
                  <LayoutGrid size={16} />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-600 hover:text-neutral-400'}`}>
                  <List size={16} />
                </button>
             </div>
             <label className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all cursor-pointer shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)]">
               {isUploadingVault ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Upload Document
               <input type="file" className="hidden" accept=".pdf,.docx,.pptx" onChange={handleVaultUpload} disabled={isUploadingVault} />
             </label>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden p-8 pt-4 gap-6">
        <div className={`flex flex-col min-w-0 transition-all duration-500 ease-in-out ${activeVaultFile ? 'w-[40%] xl:w-1/2' : 'w-full'}`}>
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
            <div className={`overflow-y-auto pr-2 pb-12 custom-scrollbar ${viewMode === 'grid' ? `grid gap-6 ${activeVaultFile ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'}` : 'flex flex-col gap-2'}`}>
               {vaultFiles.map((file) => {
                 const ext = file.file_format?.toLowerCase() || 'bin';
                 const isActive = activeVaultFile?.id === file.id;
                 
                 if (viewMode === 'list') {
                   return (
                    <button key={file.id} onClick={() => selectVaultFile(file)} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${isActive ? 'bg-neutral-900 border-neutral-800 ring-1 ring-indigo-500/40' : 'bg-neutral-950/40 border-neutral-900 hover:bg-neutral-900/40'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ext === 'pdf' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}><FileText size={20} /></div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-sm font-bold text-white truncate">{file.filename}</div>
                        <div className="text-[10px] text-neutral-500 font-medium uppercase tracking-tighter">{ext} • {new Date(file.created_at).toLocaleDateString()}</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setFileToDelete(file.id); }} className="p-2 text-neutral-600 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </button>
                   );
                 }

                 return (
                   <motion.div layout key={file.id} className="group relative">
                     <button 
                        onClick={() => selectVaultFile(file)}
                        className={`w-full aspect-[4/3] flex flex-col items-center justify-center p-6 rounded-[2.5rem] border-2 transition-all overflow-hidden relative ${
                          isActive ? "bg-indigo-500/5 border-indigo-500/40 shadow-[0_0_30px_-10px_rgba(99,102,241,0.3)]" : "bg-neutral-900/20 border-neutral-900/60 hover:bg-neutral-900/40 hover:border-neutral-800"
                        }`}
                     >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 shadow-lg ${ext === 'pdf' ? 'bg-red-500/10 text-red-500' : ext === 'docx' ? 'bg-blue-500/10 text-blue-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                           <FileText size={20} />
                        </div>
                        <div className="text-center w-full px-2">
                           <div className={`text-[11px] font-bold truncate mb-1 ${isActive ? 'text-white' : 'text-neutral-400'}`}>{file.filename}</div>
                           <div className="text-[8px] font-black uppercase tracking-widest opacity-40">{ext}</div>
                        </div>
                        {isActive && <motion.div layoutId="active-indicator" className="absolute bottom-0 inset-x-0 h-1 bg-indigo-500" />}
                     </button>
                     <button onClick={() => setFileToDelete(file.id)} className="absolute top-4 right-4 p-2 bg-neutral-950/80 text-neutral-600 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all border border-neutral-900">
                       <X size={14} />
                     </button>
                   </motion.div>
                 );
               })}
            </div>
          )}
        </div>

        <AnimatePresence>
          {activeVaultFile && (
            <motion.div 
              initial={{ x: 500, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 500, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`flex flex-col gap-4 h-full transition-all duration-500 ${isDocFullscreen ? 'fixed inset-0 z-[100] w-full p-6 bg-black/90 backdrop-blur-md' : 'w-[60%] xl:w-1/2 relative z-10'}`}
            >
              <div className="flex flex-col bg-neutral-900/50 border border-neutral-800/50 rounded-[2.5rem] overflow-hidden shadow-2xl relative flex-1 h-full backdrop-blur-md">
                <div className="p-4 bg-neutral-900/80 border-b border-neutral-800/80 flex items-center justify-between backdrop-blur-xl">
                  <div className="flex items-center gap-3 min-w-0 pl-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 flex-shrink-0">
                       <FileText size={16} />
                    </div>
                    <span className="text-sm font-bold text-white truncate max-w-[200px]">{activeVaultFile.filename}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setIsDocFullscreen(!isDocFullscreen)} className="p-2 text-neutral-500 hover:text-white transition-colors" title={isDocFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                       {isDocFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                    </button>
                    <button onClick={closeVaultFile} className="p-2 text-neutral-500 hover:text-white transition-colors" title="Close"><X size={18} /></button>
                  </div>
                </div>

                <div className="flex-1 bg-white/5 relative h-full">
                   {activeVaultFile.file_format === 'pdf' ? (
                     <iframe src={activeVaultFile.file_url} className="w-full h-full" />
                   ) : (
                     <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(activeVaultFile.file_url)}`} className="w-full h-full bg-white" />
                   )}
                </div>

                <div className="p-6 bg-neutral-950/80 border-t border-neutral-800 flex flex-col gap-4">
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest pl-1">AI Study Tools</span>
                        <div className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold px-3 py-1 rounded-full border border-indigo-500/20">Ready to Analyze</div>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => handleAiAction("Summary")} className="flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/20"><Sparkles size={14} /> Summarize</button>
                        <button onClick={() => handleAiAction("Flashcards")} className="flex items-center justify-center gap-2 py-3.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-2xl transition-all border border-neutral-700"><Sparkles size={14} /> Flashcards</button>
                     </div>
                  </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals same as before */}
      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsAiModalOpen(false)} />
             <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                <div className="p-10">
                   <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                           <Sparkles size={24} />
                         </div>
                         <h3 className="text-2xl font-bold text-white tracking-tight">{aiActionTitle}</h3>
                      </div>
                      <button onClick={() => setIsAiModalOpen(false)} className="text-neutral-500 hover:text-white p-2">
                        <X size={24} />
                      </button>
                   </div>

                   <div className="min-h-[300px] max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                      {isProcessingAi ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center gap-8">
                           <div className="relative">
                              <div className="w-24 h-24 border-4 border-neutral-800 rounded-full border-t-indigo-500 animate-spin" />
                              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-pulse" size={32} />
                           </div>
                           <p className="text-neutral-400 text-sm max-w-xs leading-relaxed">AI is parsing your document to generate insights...</p>
                        </div>
                      ) : aiResult ? (
                        <div className="space-y-6">
                           {aiActionTitle === "Summary" && (
                             <div className="p-8 bg-indigo-500/5 border border-indigo-500/20 rounded-[2rem]">
                                <p className="text-indigo-100/90 leading-relaxed whitespace-pre-wrap text-[15px]">{aiResult.summary}</p>
                             </div>
                           )}
                           {aiActionTitle === "Flashcards" && aiResult.flashcards && (
                             <div className="grid gap-4 pb-4">
                                {aiResult.flashcards.map((fc: any, i: number) => (
                                  <div key={i} className="p-6 bg-neutral-800/40 border border-neutral-800 rounded-[2rem] group hover:border-neutral-700 transition-all">
                                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 opacity-50 group-hover:opacity-100 transition-opacity">Concept {i+1}</div>
                                    <div className="font-bold text-white mb-4 leading-snug text-lg">Q: {fc.question}</div>
                                    <div className="text-neutral-400 pl-4 border-l-2 border-neutral-800 group-hover:border-indigo-500/40 transition-colors">A: {fc.answer}</div>
                                  </div>
                                ))}
                             </div>
                           )}
                           <button onClick={async () => {
                                const text = aiActionTitle === "Summary" ? aiResult.summary : JSON.stringify(aiResult.flashcards, null, 2);
                                await navigator.clipboard.writeText(text);
                                toast.success("Copied to clipboard!");
                              }}
                              className="w-full py-4 bg-white text-black text-sm font-bold rounded-2xl hover:bg-neutral-200 transition-all"
                            >
                              Copy Insights
                            </button>
                        </div>
                      ) : (
                        <div className="text-center py-20 text-neutral-500">Analysis failed. Please try again.</div>
                      )}
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fileToDelete && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setFileToDelete(null)} />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-neutral-900 border border-neutral-800 p-10 rounded-[3rem] max-w-sm w-full text-center shadow-2xl">
                <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Remove File?</h3>
                <p className="text-neutral-500 text-sm mb-10 leading-relaxed px-2">This file will be permanently deleted from your secure vault storage.</p>
                <div className="grid grid-cols-2 gap-4">
                   <button onClick={() => setFileToDelete(null)} className="py-4 bg-neutral-800 text-white text-sm font-bold rounded-2xl hover:bg-neutral-700 transition-colors">Cancel</button>
                   <button onClick={executeDeleteVaultFile} className="py-4 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-red-500/20">Delete</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

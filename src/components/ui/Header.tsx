"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Bell, Search, Command, ArrowRight, X,
  FileText, Folder, Sparkles, Settings,
  ChevronRight, Loader2, Clock, Zap,
  Files, Scissors, Image as ImageIcon, FileImage,
  FileBox, FileSpreadsheet, Presentation, FileDown,
  LayoutDashboard, ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type View = "main" | "notes" | "vault" | "tools";

export function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<View>("main");
  const [results, setResults] = useState<{
    notes: any[],
    files: any[]
  }>({ notes: [], files: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const mainActions = [
    { id: 'notes', title: 'Notes', icon: <FileText size={18} className="text-indigo-400" />, type: 'view' },
    { id: 'vault', title: 'Vault', icon: <Folder size={18} className="text-blue-400" />, type: 'view' },
    { id: 'tools', title: 'PDF Tools', icon: <Zap size={18} className="text-amber-400" />, type: 'view' },
    { id: 'assistant', title: 'Ask AI Assistant', icon: <Sparkles size={18} className="text-indigo-400" />, path: '/assistant', type: 'link' },
  ];

  const toolItems = [
    { id: "merge-pdf", title: "Merge PDF", path: "/tools/merge-pdf", icon: <Files size={18} className="text-blue-500" />, category: 'PDF' },
    { id: "edit-pdf", title: "Edit PDF", path: "/tools/edit-pdf", icon: <Scissors size={18} className="text-purple-500" />, category: 'PDF' },
    { id: "image-to-pdf", title: "Image to PDF", path: "/tools/image-to-pdf", icon: <ImageIcon size={18} className="text-amber-500" />, category: 'CONVERT' },
    { id: "pdf-to-image", title: "PDF to Image", path: "/tools/pdf-to-image", icon: <FileImage size={18} className="text-yellow-500" />, category: 'CONVERT' },
    { id: "word-to-pdf", title: "Word to PDF", path: "/tools/word-to-pdf", icon: <FileText size={18} className="text-blue-400" />, category: 'CONVERT' },
    { id: "pdf-to-word", title: "PDF to Word", path: "/tools/pdf-to-word", icon: <FileBox size={18} className="text-cyan-500" />, category: 'CONVERT' },
    { id: "excel-to-pdf", title: "Excel to PDF", path: "/tools/excel-to-pdf", icon: <FileSpreadsheet size={18} className="text-green-500" />, category: 'CONVERT' },
    { id: "ppt-to-pdf", title: "PPT to PDF", path: "/tools/ppt-to-pdf", icon: <Presentation size={18} className="text-orange-500" />, category: 'CONVERT' },
    { id: "compress-pdf", title: "Compress PDF", path: "/tools/compress-pdf", icon: <FileDown size={18} className="text-emerald-500" />, category: 'OPTIMIZE' },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === "Escape") {
        if (view !== "main") {
          setView("main");
          setSearchQuery("");
        } else {
          setIsSearchOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view]);

  // Data Fetching
  useEffect(() => {
    if (!isSearchOpen) {
      setSearchQuery("");
      setView("main");
      setResults({ notes: [], files: [] });
      return;
    }

    const fetchData = async () => {
      setIsSearching(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: notesData } = await supabase
        .from('notes')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .ilike('title', `%${searchQuery}%`)
        .order('updated_at', { ascending: false })
        .limit(view === "main" ? 5 : 20);
      
      const { data: filesData } = await supabase
        .from('vault_files')
        .select('id, filename, file_format')
        .eq('user_id', user.id)
        .ilike('filename', `%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(view === "main" ? 5 : 20);

      setResults({
        notes: notesData || [],
        files: filesData || []
      });
      setIsSearching(false);
    };

    fetchData();
  }, [view, isSearchOpen, searchQuery]);

  const filteredItems = useMemo(() => {
    if (view === "main") {
      if (!searchQuery) return mainActions.map(a => ({ ...a, isInitial: true }));

      const actions = mainActions.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase())).map(a => ({ ...a, type: 'action' }));
      const tools = toolItems.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())).map(t => ({ ...t, type: 'tool' }));
      const notes = results.notes.map(n => ({ ...n, title: n.title || 'Untitled Note', type: 'note', category: 'NOTE' }));
      const files = results.files.map(f => ({ ...f, title: f.filename, type: 'file', category: f.file_format?.toUpperCase() || 'FILE' }));

      return [...actions, ...tools, ...notes, ...files];
    }

    if (view === "notes") {
      return results.notes.map(n => ({ ...n, title: n.title || 'Untitled Note', type: 'note', category: 'NOTE' }));
    }

    if (view === "vault") {
      return results.files.map(f => ({ ...f, title: f.filename, type: 'file', category: f.file_format?.toUpperCase() || 'FILE' }));
    }

    if (view === "tools") {
      return toolItems.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())).map(t => ({ ...t, type: 'tool' }));
    }

    return [];
  }, [view, searchQuery, results]);

  useEffect(() => {
    setActiveIndex(0);
  }, [view, searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % Math.max(filteredItems.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + filteredItems.length) % Math.max(filteredItems.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = filteredItems[activeIndex];
      if (selected) handleSelect(selected);
    } else if (e.key === "Backspace" && searchQuery === "" && view !== "main") {
      setView("main");
    }
  };

  const handleSelect = (item: any) => {
    if (item.type === 'view') {
      setView(item.id as View);
      setSearchQuery("");
      setActiveIndex(0);
    } else if (item.type === 'link' || item.type === 'tool' || item.type === 'action') {
      if (item.path) {
        executeCommand(item.path);
      } else if (item.id === 'tools' || item.id === 'notes' || item.id === 'vault') {
        setView(item.id as View);
        setSearchQuery("");
        setActiveIndex(0);
      }
    } else if (item.type === 'note') {
      executeCommand(`/notes?id=${item.id}`);
    } else if (item.type === 'file') {
      executeCommand(`/vault?id=${item.id}`);
    }
  };

  const executeCommand = (path: string) => {
    setIsSearchOpen(false);
    router.push(path);
    // Force a small delay to ensure navigation is registered if on same page
    setTimeout(() => {
      router.refresh();
    }, 100);
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full flex h-16 items-center justify-between px-4 md:px-8 bg-black border-b border-neutral-900 border-none md:border-solid">
        <div className="w-10 md:hidden" />

        <div className="flex-1 flex items-center">
          <div
            onClick={() => setIsSearchOpen(true)}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-neutral-900/40 rounded-2xl text-sm text-neutral-500 border border-neutral-800/50 w-80 hover:border-neutral-700/50 transition-all cursor-pointer group"
          >
            <Search size={16} className="group-hover:text-indigo-400 transition-colors" />
            <span className="font-medium">Search or ask assistant...</span>
            <div className="ml-auto flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
              <kbd className="px-1.5 py-0.5 text-[9px] font-black bg-neutral-800 rounded-md border border-neutral-700 text-neutral-300">⌘</kbd>
              <kbd className="px-1.5 py-0.5 text-[9px] font-black bg-neutral-800 rounded-md border border-neutral-700 text-neutral-300">K</kbd>
            </div>
          </div>

          <button
            onClick={() => setIsSearchOpen(true)}
            className="md:hidden text-neutral-400 hover:text-white transition-colors p-2"
          >
            <Search size={20} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="h-8 w-[1px] bg-neutral-900 hidden md:block mx-2" />
          <button
            onClick={() => toast.info("No notifications.")}
            className="text-neutral-400 hover:text-white transition-colors relative p-2 rounded-xl hover:bg-neutral-900"
          >
            <Bell size={20} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-500 border-2 border-black"></span>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setIsSearchOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col backdrop-blur-2xl"
            >
              <div className="flex items-center gap-4 px-6 py-4 border-b border-neutral-800/50">
                <div className="flex items-center gap-2">
                  {view !== "main" ? (
                    <button onClick={(e) => { e.stopPropagation(); setView("main"); setSearchQuery(""); }} className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-all">
                      <ArrowLeft size={18} />
                    </button>
                  ) : (
                    <div className="p-1.5 text-neutral-500">
                      <Search size={20} />
                    </div>
                  )}
                </div>
                <input
                  autoFocus
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={view === "main" ? "Search Orbit..." : `Search in ${view.charAt(0).toUpperCase() + view.slice(1)}...`}
                  className="flex-1 bg-transparent text-lg text-white font-medium outline-none placeholder-neutral-600"
                />
                {isSearching && <Loader2 size={16} className="text-indigo-500 animate-spin mr-2" />}
                <kbd className="px-1.5 py-0.5 text-[9px] font-black text-neutral-500 bg-neutral-800/50 rounded-lg border border-neutral-700/50">ESC</kbd>
              </div>

              {filteredItems.length > 0 && (
                <div className="max-h-[50vh] overflow-y-auto p-2 no-scrollbar border-t border-neutral-800/20">
                  {!searchQuery && view === "main" && (
                    <div className="px-4 py-3 text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em]">Quick Actions</div>
                  )}
                  <div className="space-y-1">
                    {filteredItems.map((item, i) => (
                      <ResultItem
                        key={item.id}
                        isActive={activeIndex === i}
                        onClick={() => handleSelect(item)}
                        icon={item.icon || (item.type === 'note' ? <FileText size={18} className="text-indigo-400" /> : <Folder size={18} className="text-blue-400" />)}
                        title={item.title}
                        description={item.type === 'view' ? "" : (item.isInitial ? "" : (item.category || (item.updated_at ? `Last updated ${new Date(item.updated_at).toLocaleDateString()}` : "")))}
                        type={item.type}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function ResultItem({ isActive, onClick, icon, title, description, type }: any) {
  return (
    <div
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all group relative cursor-pointer ${
        isActive ? "bg-neutral-800/80 text-white" : "text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center opacity-60">
          {icon}
        </div>
        <div className="flex flex-col items-start text-left">
          <span className="text-sm font-medium">
            {title}
          </span>
          {description && (
            <span className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${isActive ? "text-neutral-400" : "text-neutral-600"}`}>
              {description}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ChevronRight size={14} className={`transition-all ${isActive ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"}`} />
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Bell, Search, Command, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNotificationClick = () => {
    toast.info("No new notifications at this time.");
  };

  const executeCommand = (path: string) => {
    setIsSearchOpen(false);
    router.push(path);
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full flex h-16 items-center justify-between px-4 md:px-8 bg-black/40 backdrop-blur-md border-b border-neutral-900 border-none md:border-solid">
        {/* Mobile spacer for sidebar button */}
        <div className="w-10 md:hidden" />
        
        <div className="flex-1 flex items-center">
          <div 
            onClick={() => setIsSearchOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-neutral-900/50 rounded-lg text-sm text-neutral-400 border border-neutral-800 w-64 hover:border-neutral-700 transition-colors cursor-pointer"
          >
            <Search size={16} />
            <span>Search Orbit...</span>
            <div className="ml-auto flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] uppercase font-semibold bg-neutral-800 rounded border border-neutral-700">⌘</kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] uppercase font-semibold bg-neutral-800 rounded border border-neutral-700">K</kbd>
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
          <button 
            onClick={handleNotificationClick}
            className="text-neutral-400 hover:text-white transition-colors relative"
          >
            <Bell size={20} />
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-indigo-500 border-2 border-black"></span>
          </button>
        </div>
      </header>

      {/* Command Palette Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsSearchOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15, type: "spring", bounce: 0 }}
              className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center gap-3 px-4 py-4 border-b border-neutral-800">
                <Search size={20} className="text-neutral-400" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Search notes, folders, or command..."
                  className="flex-1 bg-transparent text-lg text-white font-medium outline-none placeholder-neutral-500"
                />
                <kbd className="px-2 py-1 text-[10px] uppercase font-semibold text-neutral-500 bg-neutral-800 rounded border border-neutral-700">ESC</kbd>
              </div>
              
              <div className="p-2 space-y-1">
                <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Quick Actions
                </div>
                <button onClick={() => executeCommand('/notes')} className="w-full flex items-center justify-between px-3 py-3 hover:bg-neutral-800 rounded-xl transition-colors group">
                  <div className="flex items-center gap-3 text-neutral-300 group-hover:text-white">
                    <Command size={18} className="text-neutral-500 group-hover:text-indigo-400" />
                    <span>Create new note</span>
                  </div>
                  <ArrowRight size={16} className="text-neutral-600 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all" />
                </button>
                <button onClick={() => executeCommand('/pdfs')} className="w-full flex items-center justify-between px-3 py-3 hover:bg-neutral-800 rounded-xl transition-colors group">
                  <div className="flex items-center gap-3 text-neutral-300 group-hover:text-white">
                    <Command size={18} className="text-neutral-500 group-hover:text-indigo-400" />
                    <span>Analyze PDF document</span>
                  </div>
                  <ArrowRight size={16} className="text-neutral-600 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all" />
                </button>
                <button onClick={() => executeCommand('/assistant')} className="w-full flex items-center justify-between px-3 py-3 hover:bg-neutral-800 rounded-xl transition-colors group">
                  <div className="flex items-center gap-3 text-neutral-300 group-hover:text-white">
                    <Command size={18} className="text-neutral-500 group-hover:text-indigo-400" />
                    <span>Ask AI Assistant</span>
                  </div>
                  <ArrowRight size={16} className="text-neutral-600 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

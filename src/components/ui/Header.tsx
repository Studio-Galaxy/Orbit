"use client";

import { Bell, Search } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-30 w-full flex h-16 items-center justify-between px-4 md:px-8 bg-black/40 backdrop-blur-md border-b border-neutral-900 border-none md:border-solid">
      {/* Mobile spacer for sidebar button */}
      <div className="w-10 md:hidden" />
      
      <div className="flex-1 flex items-center">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-neutral-900/50 rounded-lg text-sm text-neutral-400 border border-neutral-800 w-64 hover:border-neutral-700 transition-colors cursor-text">
          <Search size={16} />
          <span>Search Orbit...</span>
          <div className="ml-auto flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] uppercase font-semibold bg-neutral-800 rounded border border-neutral-700">⌘</kbd>
            <kbd className="px-1.5 py-0.5 text-[10px] uppercase font-semibold bg-neutral-800 rounded border border-neutral-700">K</kbd>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="text-neutral-400 hover:text-white transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-white border-2 border-black"></span>
        </button>
      </div>
    </header>
  );
}

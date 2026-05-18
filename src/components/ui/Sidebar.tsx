"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  FileText, 
  FileBox, 
  Sparkles, 
  Calendar, 
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Notes", href: "/notes", icon: FileText },
  { name: "PDFs", href: "/pdfs", icon: FileBox },
  { name: "AI Assistant", href: "/assistant", icon: Sparkles },
  { name: "Planner", href: "/planner", icon: Calendar },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {(isOpen || (mounted && window.innerWidth >= 768)) && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-black border-r border-neutral-900 z-40 flex flex-col`}
          >
            <div className="p-6">
              <h1 className="text-xl font-bold tracking-tighter flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-black" />
                </div>
                <span>Orbit</span>
              </h1>
            </div>

            <nav className="flex-1 px-4 flex flex-col gap-1 mt-4">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    onClick={() => typeof window !== 'undefined' && window.innerWidth < 768 && setIsOpen(false)}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? "text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-nav"
                        className="absolute inset-0 bg-neutral-900 rounded-lg -z-10"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <item.icon size={18} className={isActive ? "text-white" : "text-neutral-500"} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 mt-auto border-t border-neutral-900">
              <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-900/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs text-white">
                  JS
                </div>
                <div className="flex flex-col items-start flex-1 text-left">
                  <span className="text-white text-xs truncate">John Student</span>
                  <span className="text-[10px] text-neutral-500 truncate">Pro Plan</span>
                </div>
                <LogOut size={16} className="text-neutral-500" />
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

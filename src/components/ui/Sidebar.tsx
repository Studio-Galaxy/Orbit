"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { logout } from "@/app/auth/actions";
import { createClient } from "@/utils/supabase/client";
import { useSidebar } from "@/context/SidebarContext";
import { 
  LayoutDashboard, 
  FileText, 
  Folder, 
  Sparkles, 
  Calendar, 
  Settings,
  LogOut,
  Menu,
  X,
  Wrench,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Notes", href: "/notes", icon: FileText },
  { name: "Vault", href: "/vault", icon: Folder },
  { name: "Tools", href: "/tools", icon: Wrench },
  { name: "AI Assistant", href: "/assistant", icon: Sparkles },
  { name: "Planner", href: "/planner", icon: Calendar },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, toggleCollapse } = useSidebar();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    fetch('/api/auth/me').then(res => res.json()).then(data => { if (data.user) setUser(data.user); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) setUser(session.user);
      else setUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      const res = await logout();
      if (res?.error) toast.error("Failed to log out");
      else {
        toast.success("Successfully logged out");
        router.push("/auth/login");
      }
    } catch { toast.error("Failed to log out"); }
  };

  return (
    <>
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button onClick={() => setIsOpen(!isOpen)} className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-white shadow-xl">
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {(isOpen || (mounted && window.innerWidth >= 768)) && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isCollapsed ? 80 : 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="fixed md:sticky top-0 left-0 h-screen bg-black border-r border-neutral-900 z-40 flex flex-col group/sidebar"
          >
            <div className={`p-6 h-20 flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}>
               {!isCollapsed ? (
                <motion.h1 initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-xl font-black tracking-tighter flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-lg"><div className="w-2.5 h-2.5 rounded-full bg-black animate-pulse" /></div>
                  <span className="bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent">Orbit</span>
                </motion.h1>
               ) : (
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-lg"><div className="w-2.5 h-2.5 rounded-full bg-black" /></div>
               )}
            </div>

            <button onClick={toggleCollapse} className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-neutral-900 border border-neutral-800 rounded-full flex flex-col items-center justify-center text-neutral-500 hover:text-white hover:border-neutral-600 transition-all z-50 hidden md:flex group/toggle shadow-xl">
              {isCollapsed ? <ChevronRight size={12} strokeWidth={3} /> : <ChevronLeft size={12} strokeWidth={3} />}
            </button>

            <nav className="flex-1 px-4 flex flex-col gap-1.5 mt-6 overflow-hidden">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href} onClick={() => typeof window !== 'undefined' && window.innerWidth < 768 && setIsOpen(false)}
                    className={`relative flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all group/item ${
                      isActive ? "text-white" : "text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900/40"
                    } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? item.name : ""}
                  >
                    {isActive && <motion.div layoutId="active-pill" className="absolute inset-0 bg-neutral-900/80 rounded-xl border border-neutral-800/50 -z-10 shadow-inner" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={`${isActive ? "text-indigo-400" : "group-hover/item:text-neutral-300"}`} />
                    {!isCollapsed && <motion.span initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="truncate">{item.name}</motion.span>}
                  </Link>
                );
              })}
            </nav>

            <div className={`p-4 mt-auto border-t border-neutral-900/50 bg-neutral-950/20 ${isCollapsed ? 'px-2' : ''}`}>
              <button onClick={handleLogout} className={`flex items-center gap-3 p-2.5 w-full rounded-xl text-sm font-bold text-neutral-500 hover:text-white transition-all group/user ${isCollapsed ? 'justify-center' : ''}`}>
                <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xs text-white uppercase overflow-hidden flex-shrink-0 group-hover/user:border-neutral-700 transition-all font-black">
                  {user?.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} alt="A" className="w-full h-full object-cover" /> : (user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || "U")}
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col items-start flex-1 text-left overflow-hidden">
                    <span className="text-white text-xs font-bold truncate w-full">{user?.user_metadata?.full_name || user?.email || "User"}</span>
                    <span className="text-[9px] text-neutral-600 uppercase tracking-tighter">Pro Plan Student</span>
                  </div>
                )}
                {!isCollapsed && <LogOut size={16} className="text-neutral-700 group-hover:text-red-500 transition-colors" />}
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

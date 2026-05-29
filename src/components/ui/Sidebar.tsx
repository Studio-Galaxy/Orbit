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
    
    // Initial fetch
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch((err) => console.error("Auth fetch error:", err));

    // Listen to changes (e.g. login/logout in other tabs, or initial load hydration)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      const res = await logout();
      if (res?.error) {
        toast.error("Failed to log out");
      } else {
        toast.success("Successfully logged out");
        router.push("/auth/login");
      }
    } catch {
      toast.error("Failed to log out");
    }
  };

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
            animate={{ 
              x: 0, 
              opacity: 1,
              width: isCollapsed ? 80 : 256
            }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`fixed md:sticky top-0 left-0 h-screen bg-black border-r border-neutral-900 z-40 flex flex-col transition-all duration-300`}
          >
            <div className={`p-6 flex items-center justify-between ${isCollapsed ? 'px-4' : ''}`}>
               {!isCollapsed && (
                <motion.h1 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xl font-bold tracking-tighter flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-black" />
                  </div>
                  <span>Orbit</span>
                </motion.h1>
               )}
               {isCollapsed && (
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mx-auto">
                    <div className="w-2.5 h-2.5 rounded-full bg-black" />
                  </div>
               )}
            </div>

            {/* Collapse Toggle desktop only */}
            <button 
              onClick={toggleCollapse}
              className="absolute -right-3 top-20 w-6 h-6 bg-neutral-800 border border-neutral-700 rounded-full flex items-center justify-center text-neutral-400 hover:text-white transition-colors z-50 hidden md:flex"
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            <nav className="flex-1 px-4 flex flex-col gap-1 mt-4 overflow-hidden">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    onClick={() => typeof window !== 'undefined' && window.innerWidth < 768 && setIsOpen(false)}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? "text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"
                    } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? item.name : ""}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-nav"
                        className="absolute inset-0 bg-neutral-900 rounded-lg -z-10"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <item.icon size={18} className={isActive ? "text-white" : "text-neutral-500"} />
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className={`p-4 mt-auto border-t border-neutral-900 ${isCollapsed ? 'px-2' : ''}`}>
              <button 
                onClick={handleLogout}
                className={`flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-900/50 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
              >
                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs text-white uppercase overflow-hidden flex-shrink-0">
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col items-start flex-1 text-left overflow-hidden">
                    <span className="text-white text-xs truncate w-full">{user?.user_metadata?.full_name || user?.email || "User"}</span>
                    <span className="text-[10px] text-neutral-500 truncate">Free Plan</span>
                  </div>
                )}
                {!isCollapsed && <LogOut size={16} className="text-neutral-500" />}
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

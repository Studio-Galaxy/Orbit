"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Bell, Shield, Moon, Monitor } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { logout } from "@/app/auth/actions";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        }
      } catch (err) {
        console.error("Auth fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Successfully logged out");
    } catch {
      toast.error("Failed to log out");
    }
  };

  if (loading) {
    return <div className="p-8 text-neutral-400">Loading settings...</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 md:p-8 lg:p-12 h-screen overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Settings</h1>
        <p className="text-neutral-400 text-sm mb-12">Manage your account preferences and settings.</p>

        <div className="space-y-8">
          {/* Profile Section */}
          <section>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">Profile</h2>
            <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-6">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center text-2xl text-white uppercase overflow-hidden">
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">{user?.user_metadata?.full_name || "User"}</h3>
                  <p className="text-sm text-neutral-400">{user?.email}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Account Settings */}
          <section>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">Account</h2>
            <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-4 p-4 border-b border-neutral-800/80 hover:bg-neutral-800/20 transition-colors cursor-pointer text-neutral-300 hover:text-white">
                <Mail size={18} className="text-neutral-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Email Address</div>
                  <div className="text-xs text-neutral-500">{user?.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 border-b border-neutral-800/80 hover:bg-neutral-800/20 transition-colors cursor-pointer text-neutral-300 hover:text-white">
                <Shield size={18} className="text-neutral-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Password</div>
                  <div className="text-xs text-neutral-500">Change your password</div>
                </div>
              </div>
              <div 
                onClick={handleLogout}
                className="flex items-center gap-4 p-4 hover:bg-red-500/10 transition-colors cursor-pointer text-red-500"
              >
                <User size={18} />
                <div className="flex-1">
                  <div className="text-sm font-medium">Log out</div>
                </div>
              </div>
            </div>
          </section>

          {/* Preferences */}
          <section>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">Preferences</h2>
            <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-neutral-800/80 hover:bg-neutral-800/20 transition-colors cursor-pointer text-neutral-300 hover:text-white">
                <div className="flex items-center gap-4">
                  <Moon size={18} className="text-neutral-500" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Dark Mode</div>
                    <div className="text-xs text-neutral-500">Orbit defaults to dark mode</div>
                  </div>
                </div>
                <div className="w-10 h-6 bg-indigo-500 rounded-full flex items-center justify-end px-1">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 hover:bg-neutral-800/20 transition-colors cursor-pointer text-neutral-300 hover:text-white">
                <div className="flex items-center gap-4">
                  <Bell size={18} className="text-neutral-500" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Notifications</div>
                    <div className="text-xs text-neutral-500">Enable study reminders</div>
                  </div>
                </div>
                <div className="w-10 h-6 bg-neutral-700 rounded-full flex items-center justify-start px-1">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </motion.div>
    </div>
  );
}

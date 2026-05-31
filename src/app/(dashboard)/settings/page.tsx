"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Bell, Shield, Moon, Monitor, X, Check, Menu } from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { logout } from "@/app/auth/actions";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const { toggleMobile } = useSidebar();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Preference states
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [assistantView, setAssistantView] = useState<'mobile' | 'mac'>('mobile');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          setNewName(data.user.user_metadata?.full_name || "");
        }
      } catch (err) {
        console.error("Auth fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();

    // Load preferences
    const prefs = localStorage.getItem("orbit-notifications");
    if (prefs === "true") setNotificationsEnabled(true);

    const viewPref = localStorage.getItem("orbit-assistant-view");
    if (viewPref === "mac") setAssistantView('mac');
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

  const handleSaveProfile = async () => {
    if (!newName.trim()) return toast.error("Name cannot be empty");
    setIsSaving(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({
      data: { full_name: newName }
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile updated successfully!");
      setUser(data.user);
      setIsEditingProfile(false);
    }
    setIsSaving(false);
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    setIsSaving(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      setIsChangingPassword(false);
      setNewPassword("");
    }
    setIsSaving(false);
  };

  const toggleNotifications = () => {
    const newState = !notificationsEnabled;
    setNotificationsEnabled(newState);
    localStorage.setItem("orbit-notifications", newState.toString());
    toast.success(`Notifications ${newState ? 'enabled' : 'disabled'}`);
  };

  const toggleAssistantView = () => {
    const nextView = assistantView === 'mobile' ? 'mac' : 'mobile';
    setAssistantView(nextView);
    localStorage.setItem("orbit-assistant-view", nextView);
    toast.success(`Assistant view set to ${nextView === 'mobile' ? 'Phone' : 'MacBook'}`);
  };

  if (loading) {
    return <div className="p-8 text-neutral-400">Loading settings...</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-8 lg:px-12 py-6 md:py-12 h-[calc(100vh-4rem)] overflow-y-auto no-scrollbar relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-2">
           <button 
             onClick={toggleMobile}
             className="md:hidden p-2 -ml-2 text-neutral-400 hover:text-white transition-colors"
           >
             <Menu size={24} />
           </button>
           <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
        </div>
        <p className="text-neutral-400 text-sm mb-12">Manage your account preferences and settings.</p>

        <div className="space-y-8">
          {/* Profile Section */}
          <section>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">Profile</h2>
            <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-4 md:p-6 relative flex flex-col md:block">
              <div className="md:absolute md:top-6 md:right-6 order-2 mt-4 md:order-none md:mt-0">
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="w-full md:w-auto px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-lg transition-colors border border-neutral-700 font-semibold"
                >
                  Edit Profile
                </button>
              </div>
              <div className="flex items-center gap-6 mb-2 mt-2">
                <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center text-2xl text-white uppercase overflow-hidden ring-4 ring-neutral-900">
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">{user?.user_metadata?.full_name || "Orbit User"}</h3>
                  <p className="text-sm text-neutral-400">{user?.email}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Account Settings */}
          <section>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">Account</h2>
            <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-4 p-4 border-b border-neutral-800/80 transition-colors text-neutral-300">
                <Mail size={18} className="text-neutral-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Email Address</div>
                  <div className="text-xs text-neutral-500">{user?.email}</div>
                </div>
              </div>
              <div
                onClick={() => setIsChangingPassword(true)}
                className="flex items-center gap-4 p-4 border-b border-neutral-800/80 hover:bg-neutral-800/40 transition-colors cursor-pointer text-neutral-300 hover:text-white"
              >
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
                  <div className="text-sm font-medium">Log out of Orbit</div>
                </div>
              </div>
            </div>
          </section>

          {/* Preferences */}
          <section>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">Preferences</h2>
            <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl overflow-hidden">
              <div
                onClick={() => toast.info("Orbit is exclusively styled for a deep-space dark mode experience.")}
                className="flex items-center justify-between p-4 border-b border-neutral-800/80 hover:bg-neutral-800/40 transition-colors cursor-pointer text-neutral-300 hover:text-white"
              >
                <div className="flex items-center gap-4">
                  <Moon size={18} className="text-neutral-500" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Dark Mode</div>
                    <div className="text-xs text-neutral-500">Orbit defaults to dark mode</div>
                  </div>
                </div>
                {/* Visual toggle ON */}
                <div className="w-10 h-6 bg-indigo-500 rounded-full flex items-center justify-end px-1 transition-colors">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
              <div
                onClick={toggleNotifications}
                className="flex items-center justify-between p-4 border-b border-neutral-800/80 hover:bg-neutral-800/40 transition-colors cursor-pointer text-neutral-300 hover:text-white"
              >
                <div className="flex items-center gap-4">
                  <Bell size={18} className="text-neutral-500" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Notifications</div>
                    <div className="text-xs text-neutral-500">Enable study reminders globally</div>
                  </div>
                </div>
                {/* Dynamic toggle */}
                <div className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${notificationsEnabled ? 'bg-indigo-500 justify-end' : 'bg-neutral-700 justify-start'}`}>
                  <div className="w-4 h-4 bg-white rounded-full transition-transform"></div>
                </div>
              </div>

              <div
                onClick={toggleAssistantView}
                className="flex items-center justify-between p-4 hover:bg-neutral-800/40 transition-colors cursor-pointer text-neutral-300 hover:text-white"
              >
                <div className="flex items-center gap-4">
                  <Monitor size={18} className="text-neutral-500" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Assistant Layout</div>
                    <div className="text-xs text-neutral-500">Switch between Phone and MacBook view</div>
                  </div>
                </div>
                {/* Dynamic toggle */}
                <div className="flex items-center gap-2 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                  <div className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${assistantView === 'mobile' ? 'bg-white text-black' : 'text-neutral-500'}`}>Phone</div>
                  <div className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${assistantView === 'mac' ? 'bg-white text-black' : 'text-neutral-500'}`}>Mac</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </motion.div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsEditingProfile(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col"
            >
              <button
                onClick={() => setIsEditingProfile(false)}
                className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors p-1"
              >
                <X size={18} />
              </button>

              <h3 className="text-xl font-bold text-white mb-6">Edit Profile</h3>

              <div className="mb-6">
                <label className="block text-xs font-medium text-neutral-400 mb-2">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-500 transition-colors"
                  placeholder="Enter your name"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full py-2.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? "Saving..." : <><Check size={16} /> Save Changes</>}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isChangingPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsChangingPassword(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col"
            >
              <button
                onClick={() => setIsChangingPassword(false)}
                className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors p-1"
              >
                <X size={18} />
              </button>

              <h3 className="text-xl font-bold text-white mb-2">Change Password</h3>
              <p className="text-xs text-neutral-400 mb-6">Enter a new secure password below.</p>

              <div className="mb-6">
                <label className="block text-xs font-medium text-neutral-400 mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-500 transition-colors"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <button
                onClick={handleSavePassword}
                disabled={isSaving}
                className="w-full py-2.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? "Updating session..." : <><Check size={16} /> Update Password</>}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

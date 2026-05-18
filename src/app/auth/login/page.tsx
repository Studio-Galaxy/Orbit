"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { login } from "../actions";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    const result = await login(formData);
    
    if (result?.error) {
      toast.error(result.error);
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 backdrop-blur-xl"
    >
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Welcome back</h1>
        <p className="text-sm text-neutral-400">Sign in to your Orbit workspace</p>
      </div>

      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-neutral-400 pl-1">Email Address</label>
          <input 
            type="email" 
            name="email"
            required
            className="w-full bg-black/50 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="john@example.com"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between pl-1">
            <label className="text-xs font-medium text-neutral-400">Password</label>
            <Link href="#" className="text-[10px] text-indigo-400 hover:text-indigo-300">Forgot password?</Link>
          </div>
          <input 
            type="password" 
            name="password"
            required
            className="w-full bg-black/50 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="••••••••"
          />
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-white text-black hover:bg-neutral-200 transition-colors rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>Sign in <ArrowRight size={16} /></>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-neutral-500">
          Don't have an account? <Link href="/auth/signup" className="text-white font-medium hover:underline">Create one</Link>
        </p>
      </div>
    </motion.div>
  );
}

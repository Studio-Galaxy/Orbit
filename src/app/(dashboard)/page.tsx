"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, FileText, FileBox, Calendar, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const QUICK_ACTIONS = [
  { name: "New Note", icon: FileText, href: "/notes", color: "text-blue-400", bg: "bg-blue-400/10" },
  { name: "Analyze PDF", icon: FileBox, href: "/pdfs", color: "text-purple-400", bg: "bg-purple-400/10" },
  { name: "Ask AI", icon: Sparkles, href: "/assistant", color: "text-amber-400", bg: "bg-amber-400/10" },
  { name: "Study Plan", icon: Calendar, href: "/planner", color: "text-emerald-400", bg: "bg-emerald-400/10" },
];

const RECENT_ITEMS = [
  { title: "Advanced Calculus - Chapter 4", type: "note", date: "2 hours ago" },
  { title: "Machine Learning Handout", type: "pdf", date: "Yesterday" },
  { title: "Physics Lab Report Draft", type: "note", date: "Yesterday" },
  { title: "Quantum Mechanics Quiz", type: "ai", date: "2 days ago" },
];

export default function DashboardPage() {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="w-full max-w-6xl mx-auto p-6 md:p-8 lg:p-12 relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12"
      >
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">
          Good evening, John
        </h1>
        <p className="text-neutral-400 text-lg">
          What would you like to focus on tonight?
        </p>
      </motion.div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {QUICK_ACTIONS.map((action, i) => (
          <Link href={action.href} key={action.name}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -2 }}
              className="flex flex-col items-center justify-center p-6 bg-neutral-900/40 border border-neutral-800/80 rounded-2xl hover:bg-neutral-900/80 hover:border-neutral-700 transition-all cursor-pointer group"
            >
              <div className={`p-4 rounded-xl ${action.bg} mb-4 group-hover:scale-110 transition-transform`}>
                <action.icon size={24} className={action.color} />
              </div>
              <h3 className="text-sm font-medium text-neutral-300 group-hover:text-white">
                {action.name}
              </h3>
            </motion.div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-white">Recent Activity</h2>
            <Link href="/notes" className="text-sm text-neutral-400 hover:text-white flex items-center gap-1 transition-colors">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          
          <div className="space-y-3">
            {RECENT_ITEMS.map((item, i) => (
              <div 
                key={i}
                onClick={() => router.push(item.type === 'pdf' ? '/pdfs' : '/notes')}
                className="flex items-center justify-between p-4 bg-neutral-900/30 border border-neutral-800/50 rounded-xl hover:bg-neutral-900/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-neutral-800/50 rounded-lg text-neutral-400">
                    {item.type === 'note' && <FileText size={18} />}
                    {item.type === 'pdf' && <FileBox size={18} />}
                    {item.type === 'ai' && <Sparkles size={18} />}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-neutral-200">{item.title}</h4>
                    <p className="text-xs text-neutral-500">{item.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* AI Study Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-col"
        >
          <h2 className="text-xl font-semibold tracking-tight text-white mb-6">AI Insights</h2>
          
          <div className="flex-1 p-6 bg-gradient-to-br from-neutral-900/80 to-black border border-neutral-800 rounded-2xl relative overflow-hidden flex flex-col justify-center">
            {/* Soft glow effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] -z-10 rounded-full" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 blur-[50px] -z-10 rounded-full" />
            
            <div className="mb-4 text-indigo-400">
              <Sparkles size={24} />
            </div>
            <p className="text-neutral-300 text-sm leading-relaxed mb-6">
              "Based on your recent notes, you might want to review the chain rule in Calculus before tomorrow's quiz. I've prepared a quick 5-question flashcard set."
            </p>
            <button 
              onClick={() => setIsReviewModalOpen(true)}
              className="w-full py-2.5 px-4 bg-white text-black text-sm font-medium rounded-lg hover:bg-neutral-200 transition-colors"
            >
              Start Quick Review
            </button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isReviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsReviewModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl flex flex-col"
            >
              <button 
                onClick={() => setIsReviewModalOpen(false)}
                className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors p-2 bg-neutral-800 rounded-full"
              >
                <X size={16} />
              </button>
              
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6">
                <Sparkles size={24} />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">Calculus Review</h3>
              <p className="text-neutral-400 mb-8">
                Based on your notes, here is the first concept to review:
              </p>
              
              <div className="p-6 bg-neutral-800/50 border border-neutral-700/50 rounded-2xl mb-8 flex flex-col items-center text-center justify-center min-h-[160px]">
                <h4 className="text-lg font-medium text-neutral-200 mb-2">What is the Chain Rule?</h4>
                <p className="text-sm text-neutral-400">Click to reveal answer...</p>
              </div>

              <div className="flex items-center justify-between mt-auto">
                <button 
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-6 py-2.5 rounded-lg text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-6 py-2.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  Mark as Complete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

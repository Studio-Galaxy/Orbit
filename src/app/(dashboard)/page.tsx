"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, FileText, FileBox, Calendar, ArrowRight, X, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const QUICK_ACTIONS = [
  { name: "New Note", icon: FileText, href: "/notes", color: "text-blue-400", bg: "bg-blue-400/10" },
  { name: "Analyze PDF", icon: FileBox, href: "/pdfs", color: "text-purple-400", bg: "bg-purple-400/10" },
  { name: "Ask AI", icon: Sparkles, href: "/assistant", color: "text-amber-400", bg: "bg-amber-400/10" },
  { name: "Study Plan", icon: Calendar, href: "/planner", color: "text-emerald-400", bg: "bg-emerald-400/10" },
];

import { toast } from "sonner";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export default function DashboardPage() {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [greeting, setGreeting] = useState("Hello");
  const [hour, setHour] = useState(12);
  const supabase = createClient();

  const [recentItems, setRecentItems] = useState<any[]>([]);
  
  // Flashcard states
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [currentFlashcard, setCurrentFlashcard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  const [reviewTitle, setReviewTitle] = useState("Quick Review");

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch((err) => console.error("Auth fetch error:", err));

    const currentHour = new Date().getHours();
    setHour(currentHour);
    if (currentHour < 12) setGreeting("Good morning");
    else if (currentHour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    const fetchRecentActivity = async () => {
      const { data: notesData } = await supabase.from('notes').select('*').order('created_at', { ascending: false }).limit(4);
      const { data: vaultData } = await supabase.from('vault_files').select('*').order('created_at', { ascending: false }).limit(4);
      
      const combined: any[] = [];
      if (notesData) {
        notesData.forEach(n => combined.push({ id: n.id, title: n.title, type: 'note', date: timeAgo(n.created_at), rawDate: new Date(n.created_at).getTime(), content: n.content }));
      }
      if (vaultData) {
        vaultData.forEach(v => combined.push({ id: v.id, title: v.filename, type: 'pdf', fileUrl: v.file_url, date: timeAgo(v.created_at), rawDate: new Date(v.created_at).getTime() }));
      }
      
      combined.sort((a, b) => b.rawDate - a.rawDate);
      setRecentItems(combined.slice(0, 4));
    };
    
    fetchRecentActivity();
  }, []);

  const handleStartReview = async () => {
    if (recentItems.length === 0) {
      toast.error("No notes or vault files found. Create one first!");
      return;
    }
    
    setIsReviewModalOpen(true);
    setIsGeneratingReview(true);
    setFlashcards([]);
    setCurrentFlashcard(0);
    setShowAnswer(false);
    
    try {
      const item = recentItems[0];
      setReviewTitle(`Review: ${item.title}`);
      
      if (item.type === 'note') {
        const textToAnalyze = typeof item.content === 'string' ? item.content : JSON.stringify(item.content);
        const res = await fetch("/api/notes/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textToAnalyze })
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setFlashcards(data.flashcards || []);
      } else {
        const fileRes = await fetch(item.fileUrl);
        const blob = await fileRes.blob();
        const formData = new FormData();
        formData.append("file", blob, item.title);
        
        const res = await fetch("/api/pdf/analyze", {
          method: "POST",
          body: formData
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setFlashcards(data.flashcards || []);
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred during AI generation. Please try again.");
      setIsReviewModalOpen(false);
    } finally {
      setIsGeneratingReview(false);
    }
  };

  const userName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  return (
    <div className="w-full max-w-6xl mx-auto p-6 md:p-8 lg:p-12 relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12"
      >
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">
          {greeting}, {userName}
        </h1>
        <p className="text-neutral-400 text-lg">
          What would you like to focus on {hour >= 18 ? "tonight" : "today"}?
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
            {recentItems.length > 0 ? (
              recentItems.map((item, i) => (
                <div 
                  key={i}
                  onClick={() => router.push(item.type === 'pdf' ? '/pdfs' : '/notes')}
                  className="flex items-center justify-between p-4 bg-neutral-900/30 border border-neutral-800/50 rounded-xl hover:bg-neutral-900/60 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-neutral-800/50 rounded-lg text-neutral-400 group-hover:text-white transition-colors border border-transparent group-hover:border-neutral-700">
                      {item.type === 'note' && <FileText size={18} />}
                      {item.type === 'pdf' && <FileBox size={18} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-neutral-200 line-clamp-1">{item.title}</h4>
                      <p className="text-xs text-neutral-500">{item.date}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-neutral-900/10 border border-neutral-800/50 rounded-xl border-dashed">
                <FileText size={24} className="text-neutral-600 mb-2" />
                <p className="text-sm text-neutral-500 font-medium">No recent activity found.</p>
                <p className="text-xs text-neutral-600 mt-1">Create a note or upload a PDF to get started.</p>
              </div>
            )}
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
              Based on your recent activity {recentItems.length > 0 ? `(specifically "${recentItems[0]?.title}")` : ""}, I can generate a quick flashcard set to test your knowledge right now.
            </p>
            <button 
              onClick={handleStartReview}
              className="w-full py-2.5 px-4 bg-white text-black text-sm font-medium rounded-lg hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
            >
              Start Quick Review <ArrowRight size={16} />
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
                className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors p-2 bg-neutral-800 rounded-full z-10"
              >
                <X size={16} />
              </button>
              
              {isGeneratingReview ? (
                <div className="flex flex-col items-center justify-center py-12 text-center h-[300px]">
                  <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-6 relative">
                    <div className="absolute inset-0 border-2 border-neutral-700 rounded-full border-t-indigo-500 animate-spin" />
                    <Sparkles size={24} className="text-indigo-400 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Analyzing your document...</h3>
                  <p className="text-sm text-neutral-400">Extracting key concepts and generating dynamic flashcards. This will only take a few seconds.</p>
                </div>
              ) : flashcards.length > 0 ? (
                <div className="flex flex-col h-full items-center justify-center py-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                    <Sparkles size={18} />
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">{reviewTitle}</h3>
                  <p className="text-xs text-neutral-400 font-medium tracking-widest uppercase mb-8">
                    Flashcard {currentFlashcard + 1} of {flashcards.length}
                  </p>
                  
                  <div className="p-8 bg-neutral-800/50 border border-neutral-700/50 rounded-2xl mb-8 flex flex-col items-center text-center justify-center w-full min-h-[200px] shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/2 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none" />
                    
                    <AnimatePresence mode="wait">
                      {!showAnswer ? (
                        <motion.div
                          key="question"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex flex-col items-center z-10"
                        >
                          <h4 className="text-lg font-medium text-white mb-6 leading-relaxed max-w-sm">
                            {flashcards[currentFlashcard]?.question}
                          </h4>
                          <button 
                            onClick={() => setShowAnswer(true)}
                            className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 transition-colors text-white text-sm font-medium rounded-full shadow-lg"
                          >
                            Show Answer
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="answer"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-col items-center z-10"
                        >
                          <h4 className="text-neutral-400 text-sm mb-4">Answer:</h4>
                          <p className="text-lg text-indigo-100 font-medium leading-relaxed max-w-md">
                            {flashcards[currentFlashcard]?.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-center justify-between w-full mt-auto">
                    <button 
                      onClick={() => {
                        setShowAnswer(false);
                        setCurrentFlashcard(prev => Math.max(0, prev - 1));
                      }}
                      disabled={currentFlashcard === 0}
                      className="px-6 py-2.5 rounded-xl text-sm font-medium bg-neutral-800/50 text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      Previous
                    </button>
                    <button 
                      onClick={() => {
                        if (currentFlashcard === flashcards.length - 1) {
                          setIsReviewModalOpen(false);
                          toast.success("Awesome job! Review completed.");
                        } else {
                          setShowAnswer(false);
                          setCurrentFlashcard(prev => Math.min(flashcards.length - 1, prev + 1));
                        }
                      }}
                      className="px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-xl hover:bg-neutral-200 transition-colors"
                    >
                      {currentFlashcard === flashcards.length - 1 ? 'Finish & Close' : 'Next Card'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center h-[300px]">
                  <p className="text-neutral-400">Failed to load flashcards.</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

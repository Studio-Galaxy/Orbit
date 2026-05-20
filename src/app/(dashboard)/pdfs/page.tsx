"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileBox, FileText, ChevronRight, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function PdfManagerPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [quotaHit, setQuotaHit] = useState(false);
  
  const [summary, setSummary] = useState("");
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [quiz, setQuiz] = useState<any[]>([]);
  const [viva, setViva] = useState<any[]>([]);

  const [activeView, setActiveView] = useState<'summary' | 'flashcards' | 'quiz' | 'viva'>('summary');
  
  // Flashcard states
  const [currentFlashcard, setCurrentFlashcard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // Quiz states
  const [currentQuiz, setCurrentQuiz] = useState(0);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUpload(e.dataTransfer.files[0]);
    }
  };

  const processUpload = async (f: File) => {
    setFile(f);
    setIsProcessing(true);
    // Reset states
    setActiveView('summary');
    setQuotaHit(false);
    setCurrentFlashcard(0);
    setShowAnswer(false);
    setShowAnswer(false);
    setCurrentQuiz(0);
    setScore(0);
    setQuizFinished(false);
    setSelectedOption(null);
    
    try {
      const formData = new FormData();
      formData.append("file", f);
      
      const res = await fetch("/api/pdf/analyze", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        if (errorData?.code === "QUOTA_EXCEEDED") {
          setQuotaHit(true);
          setIsProcessing(false);
          return;
        }
        throw new Error(errorData?.error || "Failed to process PDF.");
      }
      
      const data = await res.json();
      setSummary(data.summary || "No summary provided.");
      setFlashcards(data.flashcards || []);
      setQuiz(data.quiz || []);
      setViva(data.viva || []);
      
      setIsProcessing(false);
      setIsDone(true);
      toast.success("Document analyzed successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred.");
      setIsProcessing(false);
      setFile(null);
    }
  };

  const handleQuizAnswer = (option: string) => {
    if (selectedOption) return; // Prevent multiple clicks
    setSelectedOption(option);
    
    if (option === quiz[currentQuiz].answer) {
      setScore(s => s + 1);
    }

    setTimeout(() => {
      if (currentQuiz < quiz.length - 1) {
        setCurrentQuiz(curr => curr + 1);
        setSelectedOption(null);
      } else {
        setQuizFinished(true);
      }
    }, 1200);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 md:p-8 lg:p-12 relative min-h-full">
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          PDF Intelligence
        </h1>
        <p className="text-neutral-400">
          Upload any document to extract notes, flashcards, and quizzes instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upload Column */}
        <div 
          className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl min-h-[500px] transition-all ${
            isDragging 
              ? "border-blue-500 bg-blue-500/5 scale-102" 
              : "border-neutral-800 bg-neutral-900/20 hover:bg-neutral-900/40 hover:border-neutral-700"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div 
                key="upload"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center text-center pointer-events-none"
              >
                <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mb-6 text-neutral-400">
                  <UploadCloud size={32} />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">Drop your PDF here</h3>
                <p className="text-sm text-neutral-500 max-w-[250px]">
                  Supports PDF, DOCX, and PPTX up to 50MB. We'll automatically break down chapters.
                </p>
                <div className="mt-8 pointer-events-auto">
                  <label className="px-6 py-3 bg-white text-black text-sm font-medium rounded-full hover:bg-neutral-200 transition-colors cursor-pointer">
                    Browse Files
                    <input type="file" className="hidden" accept=".pdf" onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) processUpload(e.target.files[0]);
                    }} />
                  </label>
                </div>
              </motion.div>
            ) : isProcessing ? (
              <motion.div 
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center"
              >
                <div className="w-20 h-20 relative flex items-center justify-center mb-6">
                  {/* Outer spinning ring */}
                  <div className="absolute inset-0 border-4 border-neutral-800 rounded-full border-t-purple-500 animate-spin" />
                  <FileBox size={24} className="text-white animate-pulse" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">Analyzing Document...</h3>
                <p className="text-sm text-neutral-500 text-center max-w-[250px]">
                  Extracting text, identifying key formulas, and generating flashcards & quizzes.
                </p>
              </motion.div>
            ) : (
              <motion.div 
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center"
              >
                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
                  <FileText size={32} />
                </div>
                <h3 className="text-xl font-medium text-white mb-2 max-w-[280px] break-words line-clamp-2 px-2 text-center">{file.name}</h3>
                <p className="text-sm text-neutral-500 mb-6">Processing complete.</p>
                <button 
                  onClick={() => { 
                    setFile(null); 
                    setIsDone(false);
                    setActiveView('summary');
                  }}
                  className="text-sm text-neutral-400 hover:text-white"
                >
                  Upload another
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results Column */}
        <div className="flex flex-col h-full">
          <div className="flex-1 border-2 border-dashed border-neutral-800 bg-neutral-900/20 rounded-3xl p-6 md:p-12 relative overflow-hidden flex flex-col justify-center min-h-[500px]">
            <AnimatePresence mode="wait">
              {quotaHit ? (
                <motion.div 
                  key="quota"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full flex flex-col items-center justify-center h-full text-center p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/20"
                >
                  <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Usage Limit Reached</h3>
                  <p className="text-sm text-neutral-400 mb-8 max-w-[280px]">
                    You've reached your free tier AI processing limits. Upgrade to Premium to continue analyzing documents.
                  </p>
                  <button className="px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-neutral-200 transition-colors shadow-lg">
                    Upgrade to Premium
                  </button>
                </motion.div>
              ) : !isDone ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-neutral-500 flex flex-col items-center justify-center h-full text-center"
                >
                  <FileBox size={48} className="mb-4 opacity-50" />
                  <p className="text-sm">Upload a document to see AI insights here.</p>
                </motion.div>
              ) : activeView === 'summary' ? (
                <motion.div 
                  key="summary"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="w-full flex flex-col h-full items-start"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
                    Ready to Study
                  </div>
                  <h4 className="text-xl font-semibold text-white mb-4">Summary of Analysis</h4>
                  <p className="text-neutral-400 text-sm leading-relaxed mb-8 flex-1">
                    {summary}
                  </p>
                  
                  <div className="w-full space-y-3 mt-auto">
                    <div 
                      onClick={() => {
                        if (flashcards.length === 0) return toast.error("No flashcards found.");
                        setCurrentFlashcard(0);
                        setShowAnswer(false);
                        setActiveView('flashcards');
                      }}
                      className="flex items-center justify-between p-3 bg-neutral-800/40 border border-neutral-800 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer group"
                    >
                      <span className="text-sm text-neutral-300">View Flashcards ({flashcards.length})</span>
                      <ChevronRight size={16} className="text-neutral-500 group-hover:text-white transition-colors" />
                    </div>
                    <div 
                      onClick={() => {
                        if (quiz.length === 0) return toast.error("No quiz found.");
                        setCurrentQuiz(0);
                        setScore(0);
                        setQuizFinished(false);
                        setSelectedOption(null);
                        setActiveView('quiz');
                      }}
                      className="flex items-center justify-between p-3 bg-neutral-800/40 border border-neutral-800 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer group"
                    >
                      <span className="text-sm text-neutral-300">Take Practice Quiz ({quiz.length})</span>
                      <ChevronRight size={16} className="text-neutral-500 group-hover:text-white transition-colors" />
                    </div>
                    <div 
                      onClick={() => {
                        if (viva.length === 0) return toast.error("No viva questions found.");
                        setCurrentFlashcard(0);
                        setShowAnswer(false);
                        setActiveView('viva');
                      }}
                      className="flex items-center justify-between p-3 bg-neutral-800/40 border border-neutral-800 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer group"
                    >
                      <span className="text-sm text-neutral-300">Practice Viva ({viva.length})</span>
                      <ChevronRight size={16} className="text-neutral-500 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </motion.div>
              ) : activeView === 'flashcards' ? (
                <motion.div
                  key="flashcards"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full h-full flex flex-col"
                >
                  <div className="flex items-center justify-between mb-6">
                    <button 
                      onClick={() => setActiveView('summary')}
                      className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium"
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                    <span className="text-xs text-neutral-500 font-medium tracking-widest uppercase">
                      Card {currentFlashcard + 1} of {flashcards.length}
                    </span>
                  </div>
                  
                  <div className="flex-1 bg-black/40 border border-neutral-800/80 rounded-3xl p-10 flex flex-col items-center justify-center relative overflow-hidden mb-6 shadow-2xl">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
                    
                    <h3 className="text-xl font-medium text-white mb-8 leading-relaxed max-w-2xl text-center z-10 w-full px-4">
                      {flashcards[currentFlashcard]?.question}
                    </h3>
                    
                    <div className="min-h-[120px] w-full flex flex-col items-center justify-start z-10">
                      <AnimatePresence mode="wait">
                        {!showAnswer ? (
                          <motion.button
                            key="show-btn"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={() => setShowAnswer(true)}
                            className="px-8 py-3 bg-neutral-800 text-neutral-200 rounded-full text-sm font-medium hover:bg-neutral-700 hover:text-white transition-all shadow-lg border border-neutral-700/50"
                          >
                            View Answer
                          </motion.button>
                        ) : (
                          <motion.div
                            key="answer-text"
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="w-full max-w-2xl p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl shadow-inner scrollbar-hide overflow-y-auto max-h-[250px]"
                          >
                            <p className="text-lg text-indigo-100/90 leading-relaxed text-center">
                              {flashcards[currentFlashcard]?.answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <button 
                      onClick={() => {
                        setShowAnswer(false);
                        setTimeout(() => setCurrentFlashcard(prev => Math.max(0, prev - 1)), 200);
                      }}
                      disabled={currentFlashcard === 0}
                      className="px-6 py-2.5 bg-neutral-800/80 text-sm font-medium rounded-xl disabled:opacity-30 hover:bg-neutral-700 transition-colors"
                    >
                      Previous
                    </button>
                    <button 
                      onClick={() => {
                        setShowAnswer(false);
                        setTimeout(() => setCurrentFlashcard(prev => Math.min(flashcards.length - 1, prev + 1)), 200);
                      }}
                      disabled={currentFlashcard === flashcards.length - 1}
                      className="px-6 py-2.5 bg-white text-black text-sm font-medium rounded-xl disabled:opacity-30 hover:bg-neutral-200 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </motion.div>
              ) : activeView === 'quiz' ? (
                <motion.div
                  key="quiz"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full h-full flex flex-col"
                >
                  <div className="flex items-center justify-between mb-6">
                    <button 
                      onClick={() => setActiveView('summary')}
                      className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium"
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                    {!quizFinished && (
                      <span className="text-xs text-neutral-500 font-medium tracking-widest uppercase">
                        Question {currentQuiz + 1} of {quiz.length}
                      </span>
                    )}
                  </div>

                  {quizFinished ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6">
                        <strong className="text-3xl">{score}/{quiz.length}</strong>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Quiz Completed!</h3>
                      <p className="text-neutral-400 text-sm mb-6">You've tested your knowledge on this document.</p>
                      <button 
                         onClick={() => {
                           setCurrentQuiz(0);
                           setScore(0);
                           setQuizFinished(false);
                           setSelectedOption(null);
                         }}
                         className="px-6 py-3 bg-white text-black text-sm font-medium rounded-full hover:bg-neutral-200 transition"
                      >
                        Retake Quiz
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full relative">
                      <h4 className="text-lg font-medium text-white mb-6">
                        {quiz[currentQuiz]?.question}
                      </h4>
                      <div className="space-y-3 overflow-y-auto pr-2 pb-4">
                        {quiz[currentQuiz]?.options?.map((option: string, idx: number) => {
                          const isSelected = selectedOption === option;
                          const isCorrect = option === quiz[currentQuiz].answer;
                          const showResult = selectedOption !== null;

                          let bgClass = "bg-neutral-800/40 border-neutral-700/50 hover:bg-neutral-700/50";
                          if (showResult) {
                            if (isCorrect) bgClass = "bg-emerald-500/20 border-emerald-500/50 text-emerald-100";
                            else if (isSelected && !isCorrect) bgClass = "bg-red-500/20 border-red-500/50 text-red-100";
                            else bgClass = "bg-neutral-800/40 border-neutral-700/50 opacity-50";
                          }

                          return (
                            <button
                              key={idx}
                              onClick={() => handleQuizAnswer(option)}
                              disabled={showResult}
                              className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${bgClass}`}
                            >
                              <span className="text-sm font-medium mr-4 leading-relaxed">{option}</span>
                              {showResult && isCorrect && <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />}
                              {showResult && isSelected && !isCorrect && <XCircle size={18} className="text-red-500 flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : activeView === 'viva' ? (
                <motion.div
                  key="viva"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full h-full flex flex-col"
                >
                  <div className="flex items-center justify-between mb-6">
                    <button 
                      onClick={() => setActiveView('summary')}
                      className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium"
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                    <span className="text-xs text-neutral-500 font-medium tracking-widest uppercase">
                      Viva {currentFlashcard + 1} of {viva.length}
                    </span>
                  </div>
                  
                  <div className="flex-1 bg-black/40 border border-neutral-800/80 rounded-3xl p-10 flex flex-col items-center justify-center relative overflow-hidden mb-6 shadow-2xl">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-rose-500/10 blur-[100px] rounded-full pointer-events-none" />
                    
                    <h3 className="text-xl font-medium text-white mb-8 leading-relaxed max-w-2xl text-center z-10 w-full px-4">
                      {viva[currentFlashcard]?.question}
                    </h3>
                    
                    <div className="min-h-[120px] w-full flex flex-col items-center justify-start z-10">
                      <AnimatePresence mode="wait">
                        {!showAnswer ? (
                          <motion.button
                            key="show-btn"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={() => setShowAnswer(true)}
                            className="px-8 py-3 bg-neutral-800 text-neutral-200 rounded-full text-sm font-medium hover:bg-neutral-700 hover:text-white transition-all shadow-lg border border-neutral-700/50"
                          >
                            View Expected Answer
                          </motion.button>
                        ) : (
                          <motion.div
                            key="answer-text"
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="w-full max-w-2xl p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl shadow-inner scrollbar-hide overflow-y-auto max-h-[250px]"
                          >
                            <p className="text-lg text-rose-100/90 leading-relaxed text-center">
                              {viva[currentFlashcard]?.answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <button 
                      onClick={() => {
                        setShowAnswer(false);
                        setTimeout(() => setCurrentFlashcard(prev => Math.max(0, prev - 1)), 200);
                      }}
                      disabled={currentFlashcard === 0}
                      className="px-6 py-2.5 bg-neutral-800/80 text-sm font-medium rounded-xl disabled:opacity-30 hover:bg-neutral-700 transition-colors"
                    >
                      Previous
                    </button>
                    <button 
                      onClick={() => {
                        setShowAnswer(false);
                        setTimeout(() => setCurrentFlashcard(prev => Math.min(viva.length - 1, prev + 1)), 200);
                      }}
                      disabled={currentFlashcard === viva.length - 1}
                      className="px-6 py-2.5 bg-white text-black text-sm font-medium rounded-xl disabled:opacity-30 hover:bg-neutral-200 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

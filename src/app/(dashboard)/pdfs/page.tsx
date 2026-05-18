"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileBox, FileText, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PdfManagerPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

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
      simulateUpload(e.dataTransfer.files[0]);
    }
  };

  const simulateUpload = (f: File) => {
    setFile(f);
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsDone(true);
    }, 3000);
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
          className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl transition-all ${
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
                      if (e.target.files && e.target.files.length > 0) simulateUpload(e.target.files[0]);
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
                  Extracting text, identifying key formulas, and generating flashcards.
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
                <h3 className="text-xl font-medium text-white mb-2">{file.name}</h3>
                <p className="text-sm text-neutral-500 mb-6">Processing complete. (1.2 MB)</p>
                <button 
                  onClick={() => { setFile(null); setIsDone(false); }}
                  className="text-sm text-neutral-400 hover:text-white"
                >
                  Upload another
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results Column */}
        <div className="flex flex-col">
          <h3 className="text-lg font-medium text-neutral-300 mb-4 flex items-center gap-2">
            Intelligence Output
          </h3>
          
          <div className="flex-1 bg-neutral-900/30 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center text-center">
            {isDone ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full h-full flex flex-col items-start text-left"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
                  Ready to Study
                </div>
                <h4 className="text-xl font-semibold text-white mb-4">Summary of Analysis</h4>
                <p className="text-neutral-400 text-sm leading-relaxed mb-8">
                  This document covers the fundamental principles of machine learning algorithms, notably highlighting the difference between supervised and unsupervised models.
                </p>
                
                <div className="w-full space-y-3 mb-auto">
                  <div 
                    onClick={() => toast.success("Opening flashcards for this document...")}
                    className="flex items-center justify-between p-3 bg-neutral-800/40 border border-neutral-800 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer group"
                  >
                    <span className="text-sm text-neutral-300">View Flashcards (24)</span>
                    <ChevronRight size={16} className="text-neutral-500 group-hover:text-white transition-colors" />
                  </div>
                  <div 
                    onClick={() => toast.info("Generating practice quiz... please wait.")}
                    className="flex items-center justify-between p-3 bg-neutral-800/40 border border-neutral-800 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer group"
                  >
                    <span className="text-sm text-neutral-300">Take Practice Quiz</span>
                    <ChevronRight size={16} className="text-neutral-500 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="text-neutral-500 flex flex-col items-center">
                <FileBox size={48} className="mb-4 opacity-50" />
                <p className="text-sm">Upload a document to see AI insights here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  ArrowLeft,
  UploadCloud,
  FileBox,
  X,
  CheckCircle2,
  Loader2,
  Settings,
  Scissors,
  GripVertical
} from "lucide-react";
import dynamic from "next/dynamic";
import { Reorder } from "framer-motion";

const PdfEditor = dynamic<any>(() => import('@/components/tools/PdfEditor').then(mod => mod.PdfEditor), { ssr: false });

// Tools config
const TOOLS_CONFIG: Record<string, {
  name: string;
  description: string;
  accept: string;
  multiple: boolean;
  minFiles?: number;
  isMocked?: boolean;
}> = {
  "merge-pdf": {
    name: "Merge PDF",
    description: "Combine multiple PDFs into a single continuous file.",
    accept: ".pdf",
    multiple: true,
    minFiles: 2,
  },
  "edit-pdf": {
    name: "Edit PDF",
    description: "Extract specific pages, delete unwanted pages, and visually shuffle them.",
    accept: ".pdf",
    multiple: false,
    minFiles: 1,
  },
  "image-to-pdf": {
    name: "Image to PDF",
    description: "Convert images (JPG, PNG) into a polished PDF document.",
    accept: "image/*",
    multiple: true,
    minFiles: 1,
  },
  "compress-pdf": {
    name: "Compress PDF",
    description: "Re-save PDF to optimize object streams and reduce overhead.",
    accept: ".pdf",
    multiple: false,
    minFiles: 1,
  },
  // New Mocked Tools for Dashboard UI
  "pdf-to-image": {
    name: "PDF to Image",
    description: "Extract all pages of a PDF into high-resolution JPG images.",
    accept: ".pdf",
    multiple: false,
    minFiles: 1,
    isMocked: true,
  },
  "word-to-pdf": {
    name: "Word to PDF",
    description: "Convert Microsoft Word documents (DOC, DOCX) to PDF flawlessly.",
    accept: ".doc,.docx",
    multiple: true,
    minFiles: 1,
    isMocked: true,
  },
  "pdf-to-word": {
    name: "PDF to Word",
    description: "Turn your PDF into an editable Word document with layout preserved.",
    accept: ".pdf",
    multiple: false,
    minFiles: 1,
    isMocked: true,
  },
  "excel-to-pdf": {
    name: "Excel to PDF",
    description: "Convert Excel spreadsheets (XLS, XLSX) into clean PDF reports.",
    accept: ".xls,.xlsx",
    multiple: true,
    minFiles: 1,
    isMocked: true,
  },
  "ppt-to-pdf": {
    name: "PPT to PDF",
    description: "Instantly create PDFs from your PowerPoint presentations.",
    accept: ".ppt,.pptx",
    multiple: true,
    minFiles: 1,
    isMocked: true,
  },
};

export default function ToolExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const toolId = typeof params.toolId === 'string' ? params.toolId : "";
  const config = TOOLS_CONFIG[toolId];

  // States
  const [files, setFiles] = useState<File[]>([]);
  const [draggedFileIndex, setDraggedFileIndex] = useState<number | null>(null);

  // ... rest of the states ...
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [pageRange, setPageRange] = useState("");
  const [pageOrder, setPageOrder] = useState<number[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag handlers for reordering
  const handleFileDragStart = (index: number) => {
    setDraggedFileIndex(index);
  };

  const handleFileDrop = (index: number) => {
    if (draggedFileIndex === null) return;
    const newFiles = [...files];
    const draggedItem = newFiles[draggedFileIndex];
    newFiles.splice(draggedFileIndex, 1);
    newFiles.splice(index, 0, draggedItem);
    setFiles(newFiles);
    setDraggedFileIndex(null);
  };

  // Safe check if tool doesn't exist
  if (!config) {
    return (
      <div className="flex-1 w-full bg-black min-h-screen text-white flex items-center justify-center">
        <p>Tool not found.</p>
        <button onClick={() => router.push('/tools')} className="ml-4 text-blue-400">Go Back</button>
      </div>
    );
  }

  // File Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    const validExts = config.accept.split(",").map(e => e.replace("*", ""));
    const filtered = newFiles.filter(file => {
      if (config.accept.includes("image/*")) return file.type.startsWith("image/");
      const ext = file.name.split('.').pop()?.toLowerCase();
      return validExts.some(validExt => validExt.replace('.', '') === ext);
    });

    if (filtered.length !== newFiles.length) {
      toast.error(`Invalid file types. Please upload ${config.accept}`);
    }

    if (!config.multiple) {
      setFiles([filtered[0]]);
      setPageOrder([]); // Reset on new file
    } else {
      setFiles((prev) => [...prev, ...filtered]);
    }
    setIsSuccess(false);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };


  // Helper for split logic
  const parsePageRange = (rangeStr: string, totalPages: number): number[] => {
    if (!rangeStr.trim()) {
      // Return all pages if empty
      return Array.from({ length: totalPages }, (_, i) => i);
    }
    const pages = new Set<number>();
    const parts = rangeStr.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end) && start > 0 && end <= totalPages && start <= end) {
          for (let i = start; i <= end; i++) {
            pages.add(i - 1);
          }
        }
      } else {
        const page = Number(trimmed);
        if (!isNaN(page) && page > 0 && page <= totalPages) {
          pages.add(page - 1);
        }
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  // --- PROCESSING LOGIC ---
  const processFiles = async () => {
    if (config.minFiles && files.length < config.minFiles) {
      toast.error(`Please select at least ${config.minFiles} file(s)`);
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setIsSuccess(false);

    try {
      if (config.isMocked) {
        // Simulated Processing for Complex/Office Formats
        for (let i = 0; i <= 100; i += 5) {
          await new Promise(res => setTimeout(res, 150));
          setProgress(i);
        }

        // Setup dummy file download to complete simulation
        const ext = toolId.includes('to-pdf') ? '.pdf' : (toolId.includes('to-word') ? '.docx' : '.zip');
        const dummyBlob = new Blob(["Simulated content for premium conversion. Integrate CloudConvert API for real capabilities."], { type: "text/plain" });
        saveAs(dummyBlob, `converted-${files[0].name.split('.')[0]}${ext}`);
      }
      else if (toolId === "merge-pdf") {
        const mergedPdf = await PDFDocument.create();
        for (let i = 0; i < files.length; i++) {
          setProgress(Math.round(((i) / files.length) * 100));
          const arrayBuffer = await files[i].arrayBuffer();
          const doc = await PDFDocument.load(arrayBuffer);
          const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        }
        setProgress(90);
        const pdfBytes = await mergedPdf.save();
        saveAs(new Blob([pdfBytes as any], { type: "application/pdf" }), "merged-document.pdf");
      }
      else if (toolId === "edit-pdf") {
        const arrayBuffer = await files[0].arrayBuffer();
        setProgress(20);
        const originalDoc = await PDFDocument.load(arrayBuffer);

        if (pageOrder.length === 0) {
          toast.error("No pages left to extract.");
          setIsProcessing(false);
          return;
        }

        const newPdf = await PDFDocument.create();
        for (let i = 0; i < pageOrder.length; i++) {
          setProgress(20 + Math.round(((i) / pageOrder.length) * 70));
          const pageIndex = pageOrder[i];
          const [copiedPage] = await newPdf.copyPages(originalDoc, [pageIndex]);
          newPdf.addPage(copiedPage);
        }

        setProgress(95);
        const pdfBytes = await newPdf.save();
        saveAs(new Blob([pdfBytes as any], { type: "application/pdf" }), `edited-${files[0].name}`);
      }
      else if (toolId === "image-to-pdf") {
        const mergedPdf = await PDFDocument.create();
        for (let i = 0; i < files.length; i++) {
          setProgress(Math.round(((i) / files.length) * 100));
          const file = files[i];
          const arrayBuffer = await file.arrayBuffer();

          let image;
          if (file.type === "image/jpeg" || file.name.toLowerCase().endsWith(".jpg") || file.name.toLowerCase().endsWith(".jpeg")) {
            image = await mergedPdf.embedJpg(arrayBuffer);
          } else if (file.type === "image/png" || file.name.toLowerCase().endsWith(".png")) {
            image = await mergedPdf.embedPng(arrayBuffer);
          } else {
            continue; // Skip unsupported
          }

          const page = mergedPdf.addPage([image.width, image.height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
          });
        }
        setProgress(90);
        const pdfBytes = await mergedPdf.save();
        saveAs(new Blob([pdfBytes as any], { type: "application/pdf" }), "images-converted.pdf");
      }
      else if (toolId === "compress-pdf") {
        setProgress(30);
        const arrayBuffer = await files[0].arrayBuffer();
        const doc = await PDFDocument.load(arrayBuffer);
        setProgress(60);
        const pdfBytes = await doc.save({ useObjectStreams: true });
        setProgress(90);
        saveAs(new Blob([pdfBytes as any], { type: "application/pdf" }), `compressed-${files[0].name}`);
      }

      setProgress(100);
      setIsSuccess(true);
      toast.success("Conversion completed successfully!");
    } catch (error) {
      console.error(error);
      toast.error("An error occurred during conversion.");
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="flex-1 w-full bg-black min-h-screen text-white rounded-tl-[2.5rem] md:rounded-l-[2.5rem] border-l border-neutral-800 overflow-hidden relative flex flex-col">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="p-6 md:px-10 border-b border-neutral-900 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/tools")}
            className="p-2 bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-neutral-400" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">{config.name}</h1>
            <p className="text-xs text-neutral-500">{config.description}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 relative z-10 flex flex-col md:flex-row gap-8 overflow-y-auto max-w-7xl mx-auto w-full">

        {/* Dropzone Column */}
        <div className="flex-1 flex flex-col gap-4 h-[calc(100vh-14rem)] max-h-[600px] min-h-[750px] pb-10">
          <div
            className={`flex-1 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-8 transition-all duration-300 relative overflow-hidden ${isDragActive
              ? "border-blue-500 bg-blue-500/10 scale-[1.01]"
              : "border-neutral-800 bg-neutral-900/40 hover:border-neutral-600"
              } ${files.length > 0 ? 'bg-neutral-900/80 border-solid border-neutral-800' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept={config.accept}
              multiple={config.multiple}
              onChange={handleFileChange}
            />

            {!isProcessing && !isSuccess && files.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center flex flex-col items-center my-12"
              >
                <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                  <UploadCloud size={36} className="text-blue-500" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Upload your files</h3>
                <p className="text-neutral-400 mb-8 max-w-sm">
                  Drag and drop your documents here, or click to browse. Experience flawless conversion instantly.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full transition-all active:scale-95"
                >
                  Select Documents
                </button>
              </motion.div>
            )}

            {!isProcessing && !isSuccess && files.length > 0 && (
              <div className="w-full flex-1 flex flex-col h-full max-h-full">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <h3 className="font-medium text-neutral-300">{files.length} file(s) selected</h3>
                  {config.multiple && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                    >
                      + Add more
                    </button>
                  )}
                </div>

                {toolId === 'edit-pdf' ? (
                  <div className="flex-1 w-full mt-4 min-h-[300px]">
                    <PdfEditor file={files[0]} pageOrder={pageOrder} setPageOrder={setPageOrder} />
                  </div>
                ) : (
                  <div
                    className="flex-1 overflow-y-auto w-full pr-2 pb-4"
                    style={{
                      maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
                    }}
                  >
                  <div
                    className="flex-1 overflow-y-auto w-full pr-2 pb-4"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 auto-rows-max">
                      {files.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          draggable
                          onDragStart={() => handleFileDragStart(idx)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleFileDrop(idx)}
                          className={`bg-neutral-950 border rounded-xl p-3 flex flex-col gap-2 relative group aspect-square items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing transition-colors ${
                            draggedFileIndex === idx ? "opacity-30 border-blue-500" : "border-neutral-800 hover:border-neutral-700"
                          }`}
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <X size={12} />
                          </button>
                          <FileBox size={24} className="opacity-50 text-blue-400 mb-1" />
                          <p className="text-[10px] text-neutral-400 truncate w-full text-center px-1 font-medium">
                            {file.name}
                          </p>
                          <div className="absolute bottom-2 right-2">
                            <GripVertical size={12} className="text-neutral-800" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-neutral-800 flex justify-end flex-shrink-0">
                  <button
                    onClick={processFiles}
                    className="px-8 py-3 bg-white text-black hover:bg-neutral-200 font-bold rounded-full transition-all active:scale-95 flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                  >
                    <Settings size={18} />
                    Process & Download
                  </button>
                </div>
              </div>
            )}

            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center w-full h-full text-center"
              >
                <div className="w-16 h-16 relative flex items-center justify-center mb-6">
                  <Loader2 size={40} className="text-blue-500 animate-spin absolute" />
                  <div className="text-xs font-bold text-white absolute">{progress}%</div>
                </div>
                <h3 className="text-xl font-bold mb-2">Processing your request</h3>
                <p className="text-neutral-400 text-sm animate-pulse">Running securely on your device...</p>

                <div className="w-full max-w-md h-2 bg-neutral-800 rounded-full mt-8 overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>
              </motion.div>
            )}

            {isSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center w-full h-full text-center"
              >
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6 text-green-500">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-white">Task Completed!</h3>
                <p className="text-neutral-400 mb-8 max-w-sm">
                  Your files have been successfully processed and downloaded to your machine.
                </p>
                <button
                  onClick={() => {
                    setFiles([]);
                    setIsSuccess(false);
                    setPageRange("");
                  }}
                  className="px-8 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-full transition-all active:scale-95"
                >
                  Process More Files
                </button>
              </motion.div>
            )}

          </div>
        </div>

      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { X, Loader2, GripVertical } from "lucide-react";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the Web Worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfEditorProps {
  file: File;
  pageOrder: number[];
  setPageOrder: (order: number[]) => void;
}

export function PdfEditor({ file, pageOrder, setPageOrder }: PdfEditorProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    if (pageOrder.length === 0) {
      setPageOrder(Array.from({ length: numPages }, (_, i) => i));
    }
    setIsLoading(false);
  }

  const handleDelete = (pageToRemove: number) => {
    const newOrder = pageOrder.filter((p) => p !== pageToRemove);
    setPageOrder(newOrder);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null) return;
    const newOrder = [...pageOrder];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);
    setPageOrder(newOrder);
    setDraggedIndex(null);
  };

  return (
    <div className="w-full h-full flex flex-col bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden relative min-h-[500px]">
      <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/80 backdrop-blur-md z-10">
        <h3 className="text-sm font-semibold text-neutral-300">Arrange Pages</h3>
        <span className="text-[10px] text-neutral-500 font-medium px-3 py-1 bg-white/5 rounded-full uppercase tracking-wider">
          {pageOrder.length} Pages
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          className="w-full"
          loading={
            <div className="flex w-full h-64 items-center justify-center gap-3 text-blue-500">
              <Loader2 className="animate-spin" size={24} />
              <span className="text-xs font-bold tracking-widest uppercase">Loading PDF...</span>
            </div>
          }
        >
          {!isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {pageOrder.map((pageIndex, idx) => (
                <div
                  key={pageIndex}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(idx)}
                  className={`relative group bg-neutral-950 border rounded-xl p-2 flex flex-col aspect-[3/4] cursor-grab active:cursor-grabbing transition-colors ${
                    draggedIndex === idx ? "opacity-30 border-blue-500" : "border-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(pageIndex);
                    }}
                    className="absolute -top-2 -right-2 z-20 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
                  >
                    <X size={12} />
                  </button>

                  <div className="flex-1 w-full bg-white rounded-sm overflow-hidden pointer-events-none flex items-center justify-center">
                    <Page
                      pageNumber={pageIndex + 1}
                      width={120}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={<div className="bg-neutral-800 w-full h-full" />}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold text-neutral-500">{idx + 1}</span>
                    <GripVertical size={12} className="text-neutral-700" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && pageOrder.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-600">
              <p className="text-sm">All pages removed.</p>
            </div>
          )}
        </Document>
      </div>
    </div>
  );
}

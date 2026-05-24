"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  FileText,
  Files,
  FileImage,
  FileDown,
  FileBox,
  Scissors,
  ArrowRight,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation
} from "lucide-react";

const tools = [
  {
    id: "merge-pdf",
    name: "Merge PDF",
    description: "Combine multiple PDFs into one unified document",
    icon: Files,
    color: "from-blue-500/20 to-indigo-500/20",
    iconColor: "text-blue-500",
  },
  {
    id: "edit-pdf",
    name: "Edit PDF",
    description: "Visually delete, shuffle, and extract specific pages from your PDF",
    icon: Scissors,
    color: "from-purple-500/20 to-fuchsia-500/20",
    iconColor: "text-purple-500",
  },
  {
    id: "image-to-pdf",
    name: "Image to PDF",
    description: "Convert JPG, PNG, or GIF images to PDF",
    icon: ImageIcon,
    color: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-500",
  },
  {
    id: "pdf-to-image",
    name: "PDF to Image",
    description: "Extract images or convert PDF pages to JPG",
    icon: FileImage,
    color: "from-yellow-500/20 to-amber-600/20",
    iconColor: "text-yellow-500",
  },
  {
    id: "word-to-pdf",
    name: "Word to PDF",
    description: "Convert DOC and DOCX files into beautiful PDFs",
    icon: FileText,
    color: "from-blue-400/20 to-cyan-500/20",
    iconColor: "text-blue-400",
  },
  {
    id: "pdf-to-word",
    name: "PDF to Word",
    description: "Easily convert your PDF back into an editable DOCX format",
    icon: FileBox,
    color: "from-cyan-500/20 to-blue-400/20",
    iconColor: "text-cyan-500",
  },
  {
    id: "excel-to-pdf",
    name: "Excel to PDF",
    description: "Convert EXCEL spreadsheets to PDF documents",
    icon: FileSpreadsheet,
    color: "from-green-500/20 to-emerald-500/20",
    iconColor: "text-green-500",
  },
  {
    id: "ppt-to-pdf",
    name: "PPT to PDF",
    description: "Convert POWERPOINT slides to secure PDF format",
    icon: Presentation,
    color: "from-orange-500/20 to-red-500/20",
    iconColor: "text-orange-500",
  },
  {
    id: "compress-pdf",
    name: "Compress PDF",
    description: "Reduce file size while optimizing quality",
    icon: FileDown,
    color: "from-emerald-500/20 to-green-500/20",
    iconColor: "text-emerald-500",
  },
];

function ToolCard({ tool, index }: { tool: any, index: number }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <Link href={`/tools/${tool.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`group relative p-6 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-dashed transition-all cursor-pointer overflow-hidden h-full flex flex-col hover:${tool.iconColor.replace('text-', 'border-')}/60`}
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none blur-[60px]"
          style={{
            background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, ${colorMap[tool.iconColor]}, rgba(0,0,0,0) 70%)`,
          }}
        />

        {/* Specialized Glass Layer */}
        <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Liquid Gradient Mask (the "Camo" fade) */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none`}
          style={{
            maskImage: `radial-gradient(300px circle at ${mousePos.x}px ${mousePos.y}px, black, transparent)`,
            WebkitMaskImage: `radial-gradient(300px circle at ${mousePos.x}px ${mousePos.y}px, black, transparent)`
          }}
        />

        <div className="relative z-10">
          <div className={`w-14 h-14 rounded-2xl bg-neutral-950 flex items-center justify-center mb-6 shadow-inner ${tool.iconColor}`}>
            <tool.icon size={28} />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2 group-hover:translate-x-1 transition-transform duration-300">
            {tool.name}
          </h3>
          <p className="text-sm text-neutral-400 leading-relaxed mb-6 group-hover:text-neutral-300 transition-colors">
            {tool.description}
          </p>
        </div>

        <div className="mt-auto relative z-10 flex items-center text-sm font-medium text-white/50 group-hover:text-white transition-colors">
          Open Tool
          <ArrowRight size={16} className="ml-2 transform group-hover:translate-x-1 transition-transform" />
        </div>
      </motion.div>
    </Link>
  );
}

const colorMap: Record<string, string> = {
  "text-blue-500": "rgba(30, 58, 138, 0.35)",   // Deep Midnight Blue
  "text-purple-500": "rgba(88, 28, 135, 0.35)",  // Deep Royal Purple
  "text-amber-500": "rgba(120, 53, 15, 0.35)",   // Burned Amber
  "text-yellow-500": "rgba(133, 77, 14, 0.35)",  // Gold Umber
  "text-blue-400": "rgba(30, 64, 175, 0.35)",    // Navy Blue
  "text-cyan-500": "rgba(21, 94, 117, 0.35)",    // Deep Teal
  "text-green-500": "rgba(20, 83, 45, 0.35)",    // Forest Green
  "text-orange-500": "rgba(124, 45, 18, 0.35)",  // Deep Rust
  "text-emerald-500": "rgba(6, 78, 59, 0.35)",   // Midnight Emerald
};

export default function ToolsDashboard() {
  return (
    <div className="flex-1 w-full bg-black min-h-screen text-white border-l border-neutral-800 overflow-hidden relative">
      {/* Background Gradients */}
      {/* Background Gradients removed */}

      <div className="p-8 md:p-12 max-w-7xl mx-auto h-full overflow-y-auto">
        <header className="mb-12 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-white">
              Document <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">Workspace</span>
            </h1>
            <p className="text-neutral-400 text-lg max-w-2xl">
              Every tool you need to merge, split, compress, and convert documents in one place. Experience lightning-fast processing with uncompromising quality and absolute privacy.
            </p>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 w-full">
          {tools.map((tool, index) => (
            <ToolCard key={tool.id} tool={tool} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

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

const categories = [
  {
    name: "Edit",
    description: "Modify your PDF structure and layout",
    items: [
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
        name: "Edit Pages",
        description: "Delete, shuffle, and extract specific pages from your PDF",
        icon: Scissors,
        color: "from-purple-500/20 to-fuchsia-500/20",
        iconColor: "text-purple-500",
      },
    ]
  },
  {
    name: "Convert",
    description: "Transform documents between different formats",
    items: [
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
        description: "Easily convert your PDF back into editable formats",
        icon: FileBox,
        color: "from-cyan-500/20 to-blue-400/20",
        iconColor: "text-cyan-500",
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
      }
    ]
  },
  {
    name: "Optimize",
    description: "Enhance and process your document files",
    items: [
      {
        id: "compress-pdf",
        name: "Compress PDF",
        description: "Reduce file size while optimizing quality",
        icon: FileDown,
        color: "from-emerald-500/20 to-green-500/20",
        iconColor: "text-emerald-500",
      },
      {
        id: "pdf-to-image",
        name: "Extract Images",
        description: "Extract images or convert PDF pages to JPG",
        icon: FileImage,
        color: "from-yellow-500/20 to-amber-600/20",
        iconColor: "text-yellow-500",
      },
    ]
  }
];

function ToolCard({ tool, index }: { tool: any, index: number }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
        onMouseMove={handleMouseMove}
        className={`group relative p-6 bg-neutral-900 border border-neutral-800 rounded-3xl transition-all cursor-pointer overflow-hidden h-full flex flex-col hover:border-neutral-700`}
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none blur-[60px]"
          style={{
            background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, ${colorMap[tool.iconColor]}, rgba(0,0,0,0) 70%)`,
          }}
        />

        <div className="relative z-10">
          <div className={`w-12 h-12 rounded-2xl bg-neutral-950 flex items-center justify-center mb-6 border border-neutral-800 ${tool.iconColor}`}>
            <tool.icon size={22} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors duration-300">
            {tool.name}
          </h3>
          <p className="text-xs text-neutral-500 leading-relaxed group-hover:text-neutral-400 transition-colors">
            {tool.description}
          </p>
        </div>

        <div className="mt-8 relative z-10 flex items-center text-[10px] uppercase font-black tracking-widest text-neutral-600 group-hover:text-white transition-colors">
          Get Started
          <ArrowRight size={14} className="ml-2 transform group-hover:translate-x-1 transition-transform" />
        </div>
      </motion.div>
    </Link>
  );
}

const colorMap: Record<string, string> = {
  "text-blue-500": "rgba(59, 130, 246, 0.4)",
  "text-purple-500": "rgba(168, 85, 247, 0.4)",
  "text-amber-500": "rgba(245, 158, 11, 0.4)",
  "text-yellow-500": "rgba(234, 179, 8, 0.4)",
  "text-blue-400": "rgba(96, 165, 250, 0.4)",
  "text-cyan-500": "rgba(6, 182, 212, 0.4)",
  "text-green-500": "rgba(34, 197, 94, 0.4)",
  "text-orange-500": "rgba(249, 115, 22, 0.4)",
  "text-emerald-500": "rgba(16, 185, 129, 0.4)",
};

export default function ToolsDashboard() {
  return (
    <div className="flex-1 w-full bg-[#050505] min-h-screen text-white border-l border-neutral-900 overflow-y-auto no-scrollbar relative">
      <div className="p-8 md:p-16 max-w-7xl mx-auto h-full">
        <header className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-white">
              Document <span className="text-neutral-500">Workspace</span>
            </h1>
            <p className="text-neutral-500 text-base max-w-2xl font-medium">
              Professional tools to Edit, Convert, and Optimize your documents.
            </p>
          </motion.div>
        </header>

        <div className="space-y-24">
          {categories.map((category, catIndex) => (
            <section key={category.name} className="relative">
              <div className="mb-10">
                <h2 className="text-2xl font-black text-white mb-2 tracking-tight">{category.name}</h2>
                <p className="text-sm text-neutral-600 font-medium">{category.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 w-full">
                {category.items.map((tool, index) => (
                  <ToolCard key={tool.id} tool={tool} index={index + (catIndex * 3)} />
                ))}
              </div>
            </section>
          ))}
        </div>

      </div>
    </div>
  );
}
